import {
  PrismaClient,
  UserRole,
  Gender,
  AppointmentType,
  AppointmentStatus,
  InvoiceStatus,
  PaymentMethod,
  DrugFormulation,
  LabOrderStatus,
  BedStatus,
  AdmissionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}

/** Returns a Date shifted by `days` from today (negative = past, positive = future). */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Returns a date-only (midnight UTC) shifted by `days` from today. */
function dateOnly(days: number): Date {
  const d = daysFromNow(days);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Returns a datetime at a specific hour today + offset days. */
function dateAtHour(days: number, hour: number, minute = 0): Date {
  const d = daysFromNow(days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.warn("Seeding database...\n");

  // ========================================================================
  // 1. DEPARTMENTS
  // ========================================================================

  const departmentData = [
    { name: "General Medicine", code: "GEN" },
    { name: "Cardiology", code: "CARD" },
    { name: "Orthopedics", code: "ORTH" },
    { name: "Pediatrics", code: "PED" },
    { name: "Neurology", code: "NEUR" },
    { name: "Emergency", code: "ER" },
    { name: "Radiology", code: "RAD" },
    { name: "Laboratory", code: "LAB" },
    { name: "Pharmacy", code: "PHAR" },
  ];

  const departments = await Promise.all(
    departmentData.map((dept) =>
      prisma.department.upsert({
        where: { code: dept.code },
        update: {},
        create: dept,
      }),
    ),
  );

  const deptByCode = Object.fromEntries(departments.map((d) => [d.code, d]));
  console.warn(`  Departments: ${departments.length}`);

  // ========================================================================
  // 2. USERS (staff)
  // ========================================================================

  const passwords = {
    admin: await bcrypt.hash("Admin@12345", 12),
    doctor: await bcrypt.hash("Doctor@12345", 12),
    nurse: await bcrypt.hash("Nurse@12345!", 12),
    receptionist: await bcrypt.hash("Recept@12345", 12),
    labTech: await bcrypt.hash("LabTech@12345", 12),
    pharmacist: await bcrypt.hash("Pharma@12345", 12),
    paramedic: await bcrypt.hash("Paramed@12345", 12),
  };

  const userData = [
    {
      username: "admin",
      email: "admin@hms.local",
      passwordHash: passwords.admin,
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.director,
      departmentId: null,
      phone: "+1-555-000-0001",
    },
    {
      username: "dr.james",
      email: "james.wilson@hms.local",
      passwordHash: passwords.doctor,
      firstName: "James",
      lastName: "Wilson",
      role: UserRole.doctor,
      departmentId: deptByCode["GEN"].id,
      phone: "+1-555-100-0001",
    },
    {
      username: "dr.patel",
      email: "anita.patel@hms.local",
      passwordHash: passwords.doctor,
      firstName: "Anita",
      lastName: "Patel",
      role: UserRole.doctor,
      departmentId: deptByCode["CARD"].id,
      phone: "+1-555-100-0002",
    },
    {
      username: "dr.nguyen",
      email: "linh.nguyen@hms.local",
      passwordHash: passwords.doctor,
      firstName: "Linh",
      lastName: "Nguyen",
      role: UserRole.doctor,
      departmentId: deptByCode["PED"].id,
      phone: "+1-555-100-0003",
    },
    {
      username: "nurse.mary",
      email: "mary.thompson@hms.local",
      passwordHash: passwords.nurse,
      firstName: "Mary",
      lastName: "Thompson",
      role: UserRole.nurse,
      departmentId: deptByCode["GEN"].id,
      phone: "+1-555-200-0001",
    },
    {
      username: "nurse.chen",
      email: "wei.chen@hms.local",
      passwordHash: passwords.nurse,
      firstName: "Wei",
      lastName: "Chen",
      role: UserRole.nurse,
      departmentId: deptByCode["ER"].id,
      phone: "+1-555-200-0002",
    },
    {
      username: "rec.jones",
      email: "sarah.jones@hms.local",
      passwordHash: passwords.receptionist,
      firstName: "Sarah",
      lastName: "Jones",
      role: UserRole.receptionist,
      departmentId: null,
      phone: "+1-555-300-0001",
    },
    {
      username: "lab.wilson",
      email: "robert.wilson@hms.local",
      passwordHash: passwords.labTech,
      firstName: "Robert",
      lastName: "Wilson",
      role: UserRole.lab_tech,
      departmentId: deptByCode["LAB"].id,
      phone: "+1-555-400-0001",
    },
    {
      username: "pharm.ali",
      email: "fatima.ali@hms.local",
      passwordHash: passwords.pharmacist,
      firstName: "Fatima",
      lastName: "Ali",
      role: UserRole.pharmacist,
      departmentId: deptByCode["PHAR"].id,
      phone: "+1-555-500-0001",
    },
    {
      username: "para.smith",
      email: "daniel.smith@hms.local",
      passwordHash: passwords.paramedic,
      firstName: "Daniel",
      lastName: "Smith",
      role: UserRole.paramedic,
      departmentId: deptByCode["ER"].id,
      phone: "+1-555-600-0001",
    },
  ];

  const users = await Promise.all(
    userData.map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: {},
        create: u,
      }),
    ),
  );

  const userByUsername = Object.fromEntries(users.map((u) => [u.username, u]));
  console.warn(`  Users: ${users.length}`);

  // ========================================================================
  // 3. PATIENTS
  // ========================================================================

  const patientData = [
    {
      patientCode: generateCode("PAT", 1),
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: new Date("1985-03-15"),
      gender: Gender.male,
      nationalId: "NAT-100001",
      phone: "+1-555-800-0001",
      email: "john.doe@email.com",
      address: "123 Main Street, Springfield, IL 62701",
      bloodGroup: "O+",
      allergies: ["Penicillin"],
    },
    {
      patientCode: generateCode("PAT", 2),
      firstName: "Maria",
      lastName: "Garcia",
      dateOfBirth: new Date("1992-07-22"),
      gender: Gender.female,
      nationalId: "NAT-100002",
      phone: "+1-555-800-0002",
      email: "maria.garcia@email.com",
      address: "456 Oak Avenue, Chicago, IL 60601",
      bloodGroup: "A+",
      allergies: [],
    },
    {
      patientCode: generateCode("PAT", 3),
      firstName: "David",
      lastName: "Kim",
      dateOfBirth: new Date("1978-11-30"),
      gender: Gender.male,
      nationalId: "NAT-100003",
      phone: "+1-555-800-0003",
      email: "david.kim@email.com",
      address: "789 Pine Road, Austin, TX 73301",
      bloodGroup: "B+",
      allergies: ["Sulfa drugs", "Aspirin"],
    },
    {
      patientCode: generateCode("PAT", 4),
      firstName: "Emily",
      lastName: "Brown",
      dateOfBirth: new Date("2001-01-10"),
      gender: Gender.female,
      nationalId: "NAT-100004",
      phone: "+1-555-800-0004",
      email: null,
      address: "321 Elm Street, Denver, CO 80201",
      bloodGroup: "AB+",
      allergies: [],
    },
    {
      patientCode: generateCode("PAT", 5),
      firstName: "Michael",
      lastName: "Johnson",
      dateOfBirth: new Date("1960-05-20"),
      gender: Gender.male,
      nationalId: "NAT-100005",
      phone: "+1-555-800-0005",
      email: "m.johnson@email.com",
      address: "654 Maple Drive, Seattle, WA 98101",
      bloodGroup: "O-",
      allergies: ["Latex"],
    },
    {
      patientCode: generateCode("PAT", 6),
      firstName: "Sophia",
      lastName: "Martinez",
      dateOfBirth: new Date("1995-09-12"),
      gender: Gender.female,
      nationalId: "NAT-100006",
      phone: "+1-555-800-0006",
      email: "sophia.m@email.com",
      address: null,
      bloodGroup: "A-",
      allergies: [],
    },
    {
      patientCode: generateCode("PAT", 7),
      firstName: "Robert",
      lastName: "Taylor",
      dateOfBirth: new Date("1970-12-05"),
      gender: Gender.male,
      nationalId: null,
      phone: "+1-555-800-0007",
      email: null,
      address: "987 Cedar Lane, Portland, OR 97201",
      bloodGroup: "B-",
      allergies: ["Ibuprofen"],
    },
    {
      patientCode: generateCode("PAT", 8),
      firstName: "Aisha",
      lastName: "Mohammed",
      dateOfBirth: new Date("1988-04-18"),
      gender: Gender.female,
      nationalId: "NAT-100008",
      phone: "+1-555-800-0008",
      email: "aisha.m@email.com",
      address: "147 Birch Court, Miami, FL 33101",
      bloodGroup: "O+",
      allergies: [],
    },
    {
      patientCode: generateCode("PAT", 9),
      firstName: "William",
      lastName: "Anderson",
      dateOfBirth: new Date("1955-08-25"),
      gender: Gender.male,
      nationalId: "NAT-100009",
      phone: "+1-555-800-0009",
      email: "w.anderson@email.com",
      address: "258 Walnut Street, Boston, MA 02101",
      bloodGroup: "AB-",
      allergies: ["Codeine", "Morphine"],
    },
    {
      patientCode: generateCode("PAT", 10),
      firstName: "Olivia",
      lastName: "Lee",
      dateOfBirth: new Date("2010-02-14"),
      gender: Gender.female,
      nationalId: null,
      phone: "+1-555-800-0010",
      email: null,
      address: "369 Spruce Avenue, San Francisco, CA 94101",
      bloodGroup: "A+",
      allergies: [],
    },
    {
      patientCode: generateCode("PAT", 11),
      firstName: "James",
      lastName: "Walker",
      dateOfBirth: new Date("1982-06-30"),
      gender: Gender.male,
      nationalId: "NAT-100011",
      phone: "+1-555-800-0011",
      email: "j.walker@email.com",
      address: null,
      bloodGroup: null,
      allergies: [],
    },
    {
      patientCode: generateCode("PAT", 12),
      firstName: "Grace",
      lastName: "Okafor",
      dateOfBirth: new Date("1998-10-08"),
      gender: Gender.female,
      nationalId: "NAT-100012",
      phone: "+1-555-800-0012",
      email: "grace.o@email.com",
      address: "741 Ash Boulevard, Atlanta, GA 30301",
      bloodGroup: "O+",
      allergies: ["Shellfish"],
    },
    {
      patientCode: generateCode("PAT", 13),
      firstName: "Daniel",
      lastName: "Wright",
      dateOfBirth: new Date("1975-01-22"),
      gender: Gender.male,
      nationalId: "NAT-100013",
      phone: "+1-555-800-0013",
      email: null,
      address: "852 Poplar Way, Nashville, TN 37201",
      bloodGroup: "B+",
      allergies: [],
    },
    {
      patientCode: generateCode("PAT", 14),
      firstName: "Priya",
      lastName: "Sharma",
      dateOfBirth: new Date("1990-07-04"),
      gender: Gender.female,
      nationalId: "NAT-100014",
      phone: "+1-555-800-0014",
      email: "priya.s@email.com",
      address: "963 Willow Lane, Phoenix, AZ 85001",
      bloodGroup: "A+",
      allergies: ["Peanuts"],
    },
    {
      patientCode: generateCode("PAT", 15),
      firstName: "Thomas",
      lastName: "Clark",
      dateOfBirth: new Date("1965-11-17"),
      gender: Gender.male,
      nationalId: "NAT-100015",
      phone: "+1-555-800-0015",
      email: "t.clark@email.com",
      address: "159 Hickory Drive, Dallas, TX 75201",
      bloodGroup: "O-",
      allergies: ["Erythromycin"],
    },
  ];

  const patients = await Promise.all(
    patientData.map((p) =>
      prisma.patient.upsert({
        where: { patientCode: p.patientCode },
        update: {},
        create: {
          ...p,
          createdById: userByUsername["rec.jones"].id,
        },
      }),
    ),
  );

  const patByCode = Object.fromEntries(patients.map((p) => [p.patientCode, p]));
  console.warn(`  Patients: ${patients.length}`);

  // ========================================================================
  // 4. EMERGENCY CONTACTS
  // ========================================================================

  const existingContacts = await prisma.emergencyContact.count();
  if (existingContacts === 0) {
    await prisma.emergencyContact.createMany({
      data: [
        {
          patientId: patByCode["PAT-000001"].id,
          name: "Jane Doe",
          relationship: "Spouse",
          phone: "+1-555-900-0001",
        },
        {
          patientId: patByCode["PAT-000001"].id,
          name: "Richard Doe",
          relationship: "Brother",
          phone: "+1-555-900-0002",
        },
        {
          patientId: patByCode["PAT-000002"].id,
          name: "Carlos Garcia",
          relationship: "Father",
          phone: "+1-555-900-0003",
        },
        {
          patientId: patByCode["PAT-000003"].id,
          name: "Susan Kim",
          relationship: "Spouse",
          phone: "+1-555-900-0004",
        },
        {
          patientId: patByCode["PAT-000005"].id,
          name: "Linda Johnson",
          relationship: "Spouse",
          phone: "+1-555-900-0005",
        },
        {
          patientId: patByCode["PAT-000005"].id,
          name: "Karen Johnson",
          relationship: "Daughter",
          phone: "+1-555-900-0006",
        },
        {
          patientId: patByCode["PAT-000008"].id,
          name: "Hassan Mohammed",
          relationship: "Husband",
          phone: "+1-555-900-0007",
        },
        {
          patientId: patByCode["PAT-000009"].id,
          name: "Patricia Anderson",
          relationship: "Spouse",
          phone: "+1-555-900-0008",
        },
        {
          patientId: patByCode["PAT-000010"].id,
          name: "Jennifer Lee",
          relationship: "Mother",
          phone: "+1-555-900-0009",
        },
        {
          patientId: patByCode["PAT-000014"].id,
          name: "Raj Sharma",
          relationship: "Husband",
          phone: "+1-555-900-0010",
        },
      ],
    });
    console.warn("  Emergency contacts: 10");
  } else {
    console.warn("  Emergency contacts: already seeded, skipping");
  }

  // ========================================================================
  // 5. MEDICAL HISTORY
  // ========================================================================

  const existingHistory = await prisma.medicalHistory.count();
  if (existingHistory === 0) {
    await prisma.medicalHistory.createMany({
      data: [
        {
          patientId: patByCode["PAT-000001"].id,
          condition: "Type 2 Diabetes Mellitus",
          description: "Managed with oral hypoglycemics. HbA1c last measured at 7.2%.",
          diagnosedAt: new Date("2018-06-15"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000001"].id,
          condition: "Hypertension",
          description: "Stage 1 hypertension. Currently on ACE inhibitor.",
          diagnosedAt: new Date("2019-02-10"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000003"].id,
          condition: "Asthma",
          description: "Mild persistent asthma. Uses albuterol inhaler as needed.",
          diagnosedAt: new Date("1995-04-20"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000005"].id,
          condition: "Coronary Artery Disease",
          description: "History of MI in 2020. Underwent PCI with stent placement.",
          diagnosedAt: new Date("2020-08-05"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000005"].id,
          condition: "Hyperlipidemia",
          description: "Elevated LDL cholesterol. On statin therapy.",
          diagnosedAt: new Date("2015-11-20"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000005"].id,
          condition: "Appendectomy",
          description: "Laparoscopic appendectomy performed without complications.",
          diagnosedAt: new Date("2005-03-10"),
          isActive: false,
        },
        {
          patientId: patByCode["PAT-000007"].id,
          condition: "Chronic Lower Back Pain",
          description: "Degenerative disc disease at L4-L5. Managed with physical therapy.",
          diagnosedAt: new Date("2017-09-12"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000009"].id,
          condition: "Atrial Fibrillation",
          description: "Paroxysmal AFib. On anticoagulation therapy.",
          diagnosedAt: new Date("2021-01-15"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000009"].id,
          condition: "Osteoarthritis",
          description: "Bilateral knee osteoarthritis. Moderate severity.",
          diagnosedAt: new Date("2019-07-30"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000012"].id,
          condition: "Iron Deficiency Anemia",
          description: "Diagnosed during routine blood work. On iron supplementation.",
          diagnosedAt: new Date("2023-03-18"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000014"].id,
          condition: "Migraine with Aura",
          description: "Recurrent migraines 2-3 times per month. On sumatriptan PRN.",
          diagnosedAt: new Date("2016-05-22"),
          isActive: true,
        },
        {
          patientId: patByCode["PAT-000015"].id,
          condition: "COPD",
          description: "Former smoker. Moderate COPD (GOLD stage II). On tiotropium.",
          diagnosedAt: new Date("2020-12-01"),
          isActive: true,
        },
      ],
    });
    console.warn("  Medical history: 12");
  } else {
    console.warn("  Medical history: already seeded, skipping");
  }

  // ========================================================================
  // 6. APPOINTMENTS
  // ========================================================================

  const appointmentData = [
    // --- Completed (past) ---
    {
      appointmentCode: generateCode("APT", 1),
      patientId: patByCode["PAT-000001"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(-14, 9, 0),
      duration: 20,
      type: AppointmentType.opd,
      status: AppointmentStatus.completed,
      chiefComplaint: "Routine diabetes check-up. Feeling fatigued.",
      notes: "Blood sugar levels slightly elevated. Adjusted medication dosage.",
    },
    {
      appointmentCode: generateCode("APT", 2),
      patientId: patByCode["PAT-000005"].id,
      doctorId: userByUsername["dr.patel"].id,
      departmentId: deptByCode["CARD"].id,
      scheduledAt: dateAtHour(-12, 10, 30),
      duration: 30,
      type: AppointmentType.follow_up,
      status: AppointmentStatus.completed,
      chiefComplaint: "Post-cardiac event follow-up. Chest tightness.",
      notes: "ECG normal sinus rhythm. Continue current medications. Follow up in 3 months.",
    },
    {
      appointmentCode: generateCode("APT", 3),
      patientId: patByCode["PAT-000003"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(-10, 11, 0),
      duration: 15,
      type: AppointmentType.opd,
      status: AppointmentStatus.completed,
      chiefComplaint: "Persistent cough and mild wheezing for 5 days.",
      notes: "Asthma exacerbation. Prescribed short course of oral steroids.",
    },
    {
      appointmentCode: generateCode("APT", 4),
      patientId: patByCode["PAT-000010"].id,
      doctorId: userByUsername["dr.nguyen"].id,
      departmentId: deptByCode["PED"].id,
      scheduledAt: dateAtHour(-8, 14, 0),
      duration: 20,
      type: AppointmentType.opd,
      status: AppointmentStatus.completed,
      chiefComplaint: "Annual wellness check for 14-year-old.",
      notes: "Growth and development on track. Vaccinations up to date.",
    },
    {
      appointmentCode: generateCode("APT", 5),
      patientId: patByCode["PAT-000002"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(-7, 9, 30),
      duration: 15,
      type: AppointmentType.teleconsult,
      status: AppointmentStatus.completed,
      chiefComplaint: "Follow-up on lab results. Feeling well.",
      notes: "Lab results within normal limits. No changes to treatment plan.",
    },
    // --- Cancelled / No-show ---
    {
      appointmentCode: generateCode("APT", 6),
      patientId: patByCode["PAT-000006"].id,
      doctorId: userByUsername["dr.patel"].id,
      departmentId: deptByCode["CARD"].id,
      scheduledAt: dateAtHour(-5, 10, 0),
      duration: 20,
      type: AppointmentType.opd,
      status: AppointmentStatus.cancelled,
      chiefComplaint: "Heart palpitations and dizziness.",
      cancelReason: "Patient requested reschedule due to travel conflict.",
    },
    {
      appointmentCode: generateCode("APT", 7),
      patientId: patByCode["PAT-000007"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(-3, 15, 0),
      duration: 15,
      type: AppointmentType.follow_up,
      status: AppointmentStatus.no_show,
      chiefComplaint: "Follow-up for chronic back pain management.",
    },
    // --- In progress / checked in (today) ---
    {
      appointmentCode: generateCode("APT", 8),
      patientId: patByCode["PAT-000009"].id,
      doctorId: userByUsername["dr.patel"].id,
      departmentId: deptByCode["CARD"].id,
      scheduledAt: dateAtHour(0, 9, 0),
      duration: 30,
      type: AppointmentType.follow_up,
      status: AppointmentStatus.checked_in,
      chiefComplaint: "AFib follow-up. Reviewing anticoagulation therapy.",
    },
    {
      appointmentCode: generateCode("APT", 9),
      patientId: patByCode["PAT-000012"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(0, 10, 0),
      duration: 15,
      type: AppointmentType.opd,
      status: AppointmentStatus.in_progress,
      chiefComplaint: "Follow-up for anemia. Reviewing iron levels.",
    },
    // --- Emergency (today) ---
    {
      appointmentCode: generateCode("APT", 10),
      patientId: patByCode["PAT-000013"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["ER"].id,
      scheduledAt: dateAtHour(0, 7, 15),
      duration: 45,
      type: AppointmentType.emergency,
      status: AppointmentStatus.completed,
      chiefComplaint: "Severe abdominal pain, onset 4 hours ago.",
      notes: "CT scan ordered. Possible appendicitis. Referred to surgery.",
    },
    // --- Confirmed (upcoming) ---
    {
      appointmentCode: generateCode("APT", 11),
      patientId: patByCode["PAT-000001"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(1, 9, 0),
      duration: 20,
      type: AppointmentType.follow_up,
      status: AppointmentStatus.confirmed,
      chiefComplaint: "Diabetes follow-up. Review adjusted medication.",
    },
    {
      appointmentCode: generateCode("APT", 12),
      patientId: patByCode["PAT-000006"].id,
      doctorId: userByUsername["dr.patel"].id,
      departmentId: deptByCode["CARD"].id,
      scheduledAt: dateAtHour(1, 11, 0),
      duration: 20,
      type: AppointmentType.opd,
      status: AppointmentStatus.confirmed,
      chiefComplaint: "Rescheduled: Heart palpitations and dizziness.",
    },
    {
      appointmentCode: generateCode("APT", 13),
      patientId: patByCode["PAT-000014"].id,
      doctorId: userByUsername["dr.nguyen"].id,
      departmentId: deptByCode["NEUR"].id,
      scheduledAt: dateAtHour(2, 10, 0),
      duration: 30,
      type: AppointmentType.opd,
      status: AppointmentStatus.confirmed,
      chiefComplaint: "Increased migraine frequency. Current medication not effective.",
    },
    // --- Scheduled (future) ---
    {
      appointmentCode: generateCode("APT", 14),
      patientId: patByCode["PAT-000004"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(3, 14, 0),
      duration: 15,
      type: AppointmentType.opd,
      status: AppointmentStatus.scheduled,
      chiefComplaint: "Recurrent headaches and fatigue for 2 weeks.",
    },
    {
      appointmentCode: generateCode("APT", 15),
      patientId: patByCode["PAT-000008"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(3, 15, 30),
      duration: 15,
      type: AppointmentType.opd,
      status: AppointmentStatus.scheduled,
      chiefComplaint: "Persistent sore throat for 10 days.",
    },
    {
      appointmentCode: generateCode("APT", 16),
      patientId: patByCode["PAT-000015"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(5, 9, 0),
      duration: 20,
      type: AppointmentType.follow_up,
      status: AppointmentStatus.scheduled,
      chiefComplaint: "COPD follow-up. Shortness of breath worsening.",
    },
    {
      appointmentCode: generateCode("APT", 17),
      patientId: patByCode["PAT-000011"].id,
      doctorId: userByUsername["dr.patel"].id,
      departmentId: deptByCode["CARD"].id,
      scheduledAt: dateAtHour(5, 11, 0),
      duration: 30,
      type: AppointmentType.opd,
      status: AppointmentStatus.scheduled,
      chiefComplaint: "Chest pain during exercise. Family history of heart disease.",
    },
    {
      appointmentCode: generateCode("APT", 18),
      patientId: patByCode["PAT-000002"].id,
      doctorId: userByUsername["dr.nguyen"].id,
      departmentId: deptByCode["PED"].id,
      scheduledAt: dateAtHour(7, 10, 0),
      duration: 15,
      type: AppointmentType.teleconsult,
      status: AppointmentStatus.scheduled,
      chiefComplaint: "Skin rash on arms for 3 days. Seeking dermatology opinion.",
    },
    {
      appointmentCode: generateCode("APT", 19),
      patientId: patByCode["PAT-000009"].id,
      doctorId: userByUsername["dr.patel"].id,
      departmentId: deptByCode["CARD"].id,
      scheduledAt: dateAtHour(14, 10, 0),
      duration: 30,
      type: AppointmentType.follow_up,
      status: AppointmentStatus.scheduled,
      chiefComplaint: "3-month cardiac check-up. Review echo results.",
    },
    {
      appointmentCode: generateCode("APT", 20),
      patientId: patByCode["PAT-000003"].id,
      doctorId: userByUsername["dr.james"].id,
      departmentId: deptByCode["GEN"].id,
      scheduledAt: dateAtHour(10, 11, 0),
      duration: 15,
      type: AppointmentType.follow_up,
      status: AppointmentStatus.scheduled,
      chiefComplaint: "Asthma follow-up after steroid course.",
    },
  ];

  const appointments = await Promise.all(
    appointmentData.map((a) =>
      prisma.appointment.upsert({
        where: { appointmentCode: a.appointmentCode },
        update: {},
        create: a,
      }),
    ),
  );

  const aptByCode = Object.fromEntries(appointments.map((a) => [a.appointmentCode, a]));
  console.warn(`  Appointments: ${appointments.length}`);

  // ========================================================================
  // 7. DRUGS
  // ========================================================================

  // Drug model has no unique constraint we can upsert on (genericName is indexed but not unique).
  // We use a guard check on the first drug's genericName.
  const existingDrugs = await prisma.drug.count();
  let drugs: Awaited<ReturnType<typeof prisma.drug.findMany>> = [];

  if (existingDrugs === 0) {
    const drugData = [
      {
        genericName: "Paracetamol",
        brandName: "Tylenol",
        category: "Analgesic",
        formulation: DrugFormulation.tablet,
        strength: "500mg",
        unit: "tablet",
        reorderLevel: 50,
        currentStock: 500,
        unitPrice: 0.5,
        isControlled: false,
        requiresPrescription: false,
      },
      {
        genericName: "Amoxicillin",
        brandName: "Amoxil",
        category: "Antibiotic",
        formulation: DrugFormulation.capsule,
        strength: "500mg",
        unit: "capsule",
        reorderLevel: 30,
        currentStock: 200,
        unitPrice: 1.2,
        isControlled: false,
        requiresPrescription: true,
      },
      {
        genericName: "Metformin",
        brandName: "Glucophage",
        category: "Antidiabetic",
        formulation: DrugFormulation.tablet,
        strength: "850mg",
        unit: "tablet",
        reorderLevel: 40,
        currentStock: 350,
        unitPrice: 0.8,
        isControlled: false,
        requiresPrescription: true,
      },
      {
        genericName: "Lisinopril",
        brandName: "Zestril",
        category: "Antihypertensive",
        formulation: DrugFormulation.tablet,
        strength: "10mg",
        unit: "tablet",
        reorderLevel: 30,
        currentStock: 280,
        unitPrice: 1.0,
        isControlled: false,
        requiresPrescription: true,
      },
      {
        genericName: "Atorvastatin",
        brandName: "Lipitor",
        category: "Statin",
        formulation: DrugFormulation.tablet,
        strength: "20mg",
        unit: "tablet",
        reorderLevel: 25,
        currentStock: 180,
        unitPrice: 1.5,
        isControlled: false,
        requiresPrescription: true,
      },
      {
        genericName: "Salbutamol",
        brandName: "Ventolin",
        category: "Bronchodilator",
        formulation: DrugFormulation.inhaler,
        strength: "100mcg",
        unit: "puff",
        reorderLevel: 15,
        currentStock: 60,
        unitPrice: 8.0,
        isControlled: false,
        requiresPrescription: true,
      },
      {
        genericName: "Omeprazole",
        brandName: "Prilosec",
        category: "Proton Pump Inhibitor",
        formulation: DrugFormulation.capsule,
        strength: "20mg",
        unit: "capsule",
        reorderLevel: 30,
        currentStock: 150,
        unitPrice: 0.9,
        isControlled: false,
        requiresPrescription: true,
      },
      {
        genericName: "Prednisolone",
        brandName: "Deltasone",
        category: "Corticosteroid",
        formulation: DrugFormulation.syrup,
        strength: "5mg/5ml",
        unit: "ml",
        reorderLevel: 20,
        currentStock: 80,
        unitPrice: 0.15,
        isControlled: false,
        requiresPrescription: true,
      },
      {
        genericName: "Morphine Sulfate",
        brandName: "MS Contin",
        category: "Opioid Analgesic",
        formulation: DrugFormulation.injection,
        strength: "10mg/ml",
        unit: "ml",
        reorderLevel: 10,
        currentStock: 30,
        unitPrice: 12.0,
        isControlled: true,
        requiresPrescription: true,
      },
      {
        genericName: "Hydrocortisone",
        brandName: "Cortaid",
        category: "Corticosteroid",
        formulation: DrugFormulation.cream,
        strength: "1%",
        unit: "tube",
        reorderLevel: 15,
        currentStock: 45,
        unitPrice: 5.0,
        isControlled: false,
        requiresPrescription: false,
      },
    ];

    drugs = await Promise.all(drugData.map((d) => prisma.drug.create({ data: d })));
    console.warn(`  Drugs: ${drugs.length}`);
  } else {
    drugs = await prisma.drug.findMany({ orderBy: { createdAt: "asc" } });
    console.warn("  Drugs: already seeded, skipping");
  }

  const drugByName = Object.fromEntries(drugs.map((d) => [d.genericName, d]));

  // ========================================================================
  // 8. DRUG BATCHES
  // ========================================================================

  const existingBatches = await prisma.drugBatch.count();
  if (existingBatches === 0 && drugs.length > 0) {
    await prisma.drugBatch.createMany({
      data: [
        {
          drugId: drugByName["Paracetamol"].id,
          batchNo: "PCM-2025-001",
          quantity: 300,
          expiryDate: dateOnly(365),
          costPrice: 0.25,
          supplier: "PharmaCorp Ltd",
        },
        {
          drugId: drugByName["Paracetamol"].id,
          batchNo: "PCM-2025-002",
          quantity: 200,
          expiryDate: dateOnly(180),
          costPrice: 0.28,
          supplier: "MediSupply Co",
        },
        {
          drugId: drugByName["Amoxicillin"].id,
          batchNo: "AMX-2025-001",
          quantity: 200,
          expiryDate: dateOnly(270),
          costPrice: 0.6,
          supplier: "PharmaCorp Ltd",
        },
        {
          drugId: drugByName["Metformin"].id,
          batchNo: "MET-2025-001",
          quantity: 350,
          expiryDate: dateOnly(400),
          costPrice: 0.4,
          supplier: "GenericMeds Inc",
        },
        {
          drugId: drugByName["Lisinopril"].id,
          batchNo: "LIS-2025-001",
          quantity: 280,
          expiryDate: dateOnly(300),
          costPrice: 0.5,
          supplier: "GenericMeds Inc",
        },
        {
          drugId: drugByName["Atorvastatin"].id,
          batchNo: "ATV-2025-001",
          quantity: 180,
          expiryDate: dateOnly(350),
          costPrice: 0.75,
          supplier: "PharmaCorp Ltd",
        },
        {
          drugId: drugByName["Salbutamol"].id,
          batchNo: "SAL-2025-001",
          quantity: 60,
          expiryDate: dateOnly(240),
          costPrice: 4.0,
          supplier: "RespiCare Ltd",
        },
        {
          drugId: drugByName["Omeprazole"].id,
          batchNo: "OMP-2025-001",
          quantity: 150,
          expiryDate: dateOnly(330),
          costPrice: 0.45,
          supplier: "GenericMeds Inc",
        },
        {
          drugId: drugByName["Prednisolone"].id,
          batchNo: "PNS-2025-001",
          quantity: 80,
          expiryDate: dateOnly(200),
          costPrice: 0.08,
          supplier: "MediSupply Co",
        },
        {
          drugId: drugByName["Morphine Sulfate"].id,
          batchNo: "MOR-2025-001",
          quantity: 30,
          expiryDate: dateOnly(180),
          costPrice: 6.0,
          supplier: "ControlledPharma Inc",
        },
        {
          drugId: drugByName["Hydrocortisone"].id,
          batchNo: "HYD-2025-001",
          quantity: 45,
          expiryDate: dateOnly(500),
          costPrice: 2.5,
          supplier: "DermaSupply Co",
        },
        // Near-expiry batch for testing alerts
        {
          drugId: drugByName["Amoxicillin"].id,
          batchNo: "AMX-2024-003",
          quantity: 15,
          expiryDate: dateOnly(20),
          costPrice: 0.55,
          supplier: "PharmaCorp Ltd",
        },
      ],
    });
    console.warn("  Drug batches: 12");
  } else {
    console.warn("  Drug batches: already seeded, skipping");
  }

  // ========================================================================
  // 9. LAB TESTS
  // ========================================================================

  const baseLabTests = [
    {
      name: "Complete Blood Count",
      code: "CBC",
      category: "Hematology",
      sampleType: "Blood",
      referenceRange: "Hb: 12-16 g/dL, WBC: 4-11 x10^9/L, Platelets: 150-450 x10^9/L",
      unit: null,
      price: 150.0,
      turnaroundHrs: 2,
    },
    {
      name: "Blood Glucose Fasting",
      code: "BGF",
      category: "Biochemistry",
      sampleType: "Blood",
      referenceRange: "70-99 mg/dL",
      unit: "mg/dL",
      price: 80.0,
      turnaroundHrs: 1,
    },
    {
      name: "Liver Function Test",
      code: "LFT",
      category: "Biochemistry",
      sampleType: "Blood",
      referenceRange: "ALT: 7-56 U/L, AST: 10-40 U/L, Bilirubin: 0.1-1.2 mg/dL",
      unit: null,
      price: 250.0,
      turnaroundHrs: 4,
    },
    {
      name: "Urinalysis",
      code: "UA",
      category: "Urine",
      sampleType: "Urine",
      referenceRange: "Color: yellow, Protein: negative, Glucose: negative",
      unit: null,
      price: 60.0,
      turnaroundHrs: 1,
    },
  ];

  const additionalLabTests = [
    {
      name: "Lipid Panel",
      code: "LIP",
      category: "Biochemistry",
      sampleType: "Blood",
      referenceRange: "Total Cholesterol: <200, LDL: <100, HDL: >40, Triglycerides: <150 mg/dL",
      unit: "mg/dL",
      price: 200.0,
      turnaroundHrs: 4,
    },
    {
      name: "HbA1c",
      code: "HBA",
      category: "Biochemistry",
      sampleType: "Blood",
      referenceRange: "Normal: <5.7%, Prediabetes: 5.7-6.4%, Diabetes: >=6.5%",
      unit: "%",
      price: 180.0,
      turnaroundHrs: 6,
    },
    {
      name: "Thyroid Stimulating Hormone",
      code: "TSH",
      category: "Endocrinology",
      sampleType: "Blood",
      referenceRange: "0.4-4.0 mIU/L",
      unit: "mIU/L",
      price: 220.0,
      turnaroundHrs: 8,
    },
    {
      name: "Chest X-Ray",
      code: "CXR",
      category: "Radiology",
      sampleType: "Imaging",
      referenceRange: null,
      unit: null,
      price: 350.0,
      turnaroundHrs: 2,
    },
    {
      name: "Serum Creatinine",
      code: "SCR",
      category: "Biochemistry",
      sampleType: "Blood",
      referenceRange: "Male: 0.7-1.3, Female: 0.6-1.1 mg/dL",
      unit: "mg/dL",
      price: 90.0,
      turnaroundHrs: 3,
    },
    {
      name: "Prothrombin Time / INR",
      code: "PTI",
      category: "Hematology",
      sampleType: "Blood",
      referenceRange: "PT: 11-13.5s, INR: 0.8-1.1 (therapeutic: 2.0-3.0)",
      unit: "seconds",
      price: 120.0,
      turnaroundHrs: 2,
    },
  ];

  const allLabTests = await Promise.all(
    [...baseLabTests, ...additionalLabTests].map((t) =>
      prisma.labTest.upsert({
        where: { code: t.code },
        update: {},
        create: t,
      }),
    ),
  );

  const labTestByCode = Object.fromEntries(allLabTests.map((t) => [t.code, t]));
  console.warn(`  Lab tests: ${allLabTests.length}`);

  // ========================================================================
  // 10. LAB ORDERS & ITEMS
  // ========================================================================

  const existingLabOrders = await prisma.labOrder.count();
  let labOrders: Awaited<ReturnType<typeof prisma.labOrder.findMany>> = [];

  if (existingLabOrders === 0) {
    // Order 1: Completed CBC + BGF for patient 1 (diabetic)
    const labOrder1 = await prisma.labOrder.create({
      data: {
        orderCode: generateCode("LAB", 1),
        patientId: patByCode["PAT-000001"].id,
        orderedById: userByUsername["dr.james"].id,
        status: LabOrderStatus.completed,
        priority: "routine",
        notes: "Annual diabetes monitoring labs.",
        items: {
          create: [
            { testId: labTestByCode["CBC"].id, status: LabOrderStatus.completed },
            { testId: labTestByCode["BGF"].id, status: LabOrderStatus.completed },
            { testId: labTestByCode["HBA"].id, status: LabOrderStatus.completed },
          ],
        },
      },
      include: { items: true },
    });

    // Order 2: Completed lipid panel + LFT for patient 5 (CAD)
    const labOrder2 = await prisma.labOrder.create({
      data: {
        orderCode: generateCode("LAB", 2),
        patientId: patByCode["PAT-000005"].id,
        orderedById: userByUsername["dr.patel"].id,
        status: LabOrderStatus.completed,
        priority: "routine",
        notes: "Cardiac risk assessment.",
        items: {
          create: [
            { testId: labTestByCode["LIP"].id, status: LabOrderStatus.completed },
            { testId: labTestByCode["LFT"].id, status: LabOrderStatus.completed },
          ],
        },
      },
      include: { items: true },
    });

    // Order 3: Processing for patient 12 (anemia)
    const labOrder3 = await prisma.labOrder.create({
      data: {
        orderCode: generateCode("LAB", 3),
        patientId: patByCode["PAT-000012"].id,
        orderedById: userByUsername["dr.james"].id,
        status: LabOrderStatus.processing,
        priority: "routine",
        notes: "Follow-up CBC for iron deficiency anemia.",
        items: {
          create: [{ testId: labTestByCode["CBC"].id, status: LabOrderStatus.processing }],
        },
      },
      include: { items: true },
    });

    // Order 4: Ordered (new) for patient 9 (AFib — needs INR)
    const labOrder4 = await prisma.labOrder.create({
      data: {
        orderCode: generateCode("LAB", 4),
        patientId: patByCode["PAT-000009"].id,
        orderedById: userByUsername["dr.patel"].id,
        status: LabOrderStatus.ordered,
        priority: "urgent",
        notes: "INR monitoring for anticoagulation therapy.",
        items: {
          create: [
            { testId: labTestByCode["PTI"].id, status: LabOrderStatus.ordered },
            { testId: labTestByCode["SCR"].id, status: LabOrderStatus.ordered },
          ],
        },
      },
      include: { items: true },
    });

    // Order 5: Sample collected for patient 15 (COPD)
    const labOrder5 = await prisma.labOrder.create({
      data: {
        orderCode: generateCode("LAB", 5),
        patientId: patByCode["PAT-000015"].id,
        orderedById: userByUsername["dr.james"].id,
        status: LabOrderStatus.sample_collected,
        priority: "routine",
        items: {
          create: [
            { testId: labTestByCode["CBC"].id, status: LabOrderStatus.sample_collected },
            { testId: labTestByCode["CXR"].id, status: LabOrderStatus.ordered },
          ],
        },
      },
      include: { items: true },
    });

    // Order 6: Cancelled for patient 6
    const labOrder6 = await prisma.labOrder.create({
      data: {
        orderCode: generateCode("LAB", 6),
        patientId: patByCode["PAT-000006"].id,
        orderedById: userByUsername["dr.patel"].id,
        status: LabOrderStatus.cancelled,
        priority: "routine",
        notes: "Cancelled — patient appointment was cancelled.",
        items: {
          create: [{ testId: labTestByCode["TSH"].id, status: LabOrderStatus.cancelled }],
        },
      },
      include: { items: true },
    });

    labOrders = [labOrder1, labOrder2, labOrder3, labOrder4, labOrder5, labOrder6];
    console.warn(`  Lab orders: ${labOrders.length}`);

    // ====================================================================
    // 11. LAB RESULTS (for completed orders)
    // ====================================================================

    const labTechId = userByUsername["lab.wilson"].id;

    await prisma.labResult.createMany({
      data: [
        // Order 1 results (patient 1 — diabetic)
        {
          orderItemId: labOrder1.items[0].id, // CBC
          value: "WBC: 6.8, RBC: 4.9, Hgb: 14.2, Plt: 245",
          unit: "Various",
          isAbnormal: false,
          isCritical: false,
          remarks: "All values within normal limits.",
          enteredById: labTechId,
        },
        {
          orderItemId: labOrder1.items[1].id, // BGF
          value: "118",
          unit: "mg/dL",
          isAbnormal: true,
          isCritical: false,
          remarks: "Slightly elevated fasting glucose. Consistent with diabetes.",
          enteredById: labTechId,
        },
        {
          orderItemId: labOrder1.items[2].id, // HbA1c
          value: "7.2",
          unit: "%",
          isAbnormal: true,
          isCritical: false,
          remarks: "Above target of 7.0%. Consider medication adjustment.",
          enteredById: labTechId,
        },
        // Order 2 results (patient 5 — CAD)
        {
          orderItemId: labOrder2.items[0].id, // Lipid Panel
          value: "Total: 195, LDL: 110, HDL: 42, TG: 165",
          unit: "mg/dL",
          isAbnormal: true,
          isCritical: false,
          remarks: "LDL above target for CAD patient. Triglycerides elevated.",
          enteredById: labTechId,
        },
        {
          orderItemId: labOrder2.items[1].id, // LFT
          value: "ALT: 32, AST: 28, ALP: 78, Bilirubin: 0.9",
          unit: "U/L",
          isAbnormal: false,
          isCritical: false,
          remarks: "Liver function normal. Statin therapy can continue safely.",
          enteredById: labTechId,
        },
      ],
    });
    console.warn("  Lab results: 5");
  } else {
    labOrders = await prisma.labOrder.findMany({
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });
    console.warn("  Lab orders: already seeded, skipping");
  }

  // ========================================================================
  // 12. PRESCRIPTIONS
  // ========================================================================

  const existingPrescriptions = await prisma.prescription.count();
  if (existingPrescriptions === 0 && drugs.length > 0) {
    // Prescription 1: Patient 1 (diabetes + hypertension)
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000001"].id,
        doctorId: userByUsername["dr.james"].id,
        diagnosis: "Type 2 Diabetes Mellitus, Hypertension Stage 1",
        notes: "Continue current regimen. Review in 3 months.",
        items: {
          create: [
            {
              drugId: drugByName["Metformin"].id,
              dosage: "850mg",
              frequency: "Twice daily",
              duration: "90 days",
              quantity: 180,
              instructions: "Take with meals to reduce GI side effects.",
              isDispensed: true,
            },
            {
              drugId: drugByName["Lisinopril"].id,
              dosage: "10mg",
              frequency: "Once daily",
              duration: "90 days",
              quantity: 90,
              instructions: "Take in the morning. Monitor blood pressure weekly.",
              isDispensed: true,
            },
          ],
        },
      },
    });

    // Prescription 2: Patient 3 (asthma exacerbation)
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000003"].id,
        doctorId: userByUsername["dr.james"].id,
        diagnosis: "Acute asthma exacerbation",
        notes: "Short course steroids. Follow up if symptoms persist.",
        items: {
          create: [
            {
              drugId: drugByName["Prednisolone"].id,
              dosage: "30mg",
              frequency: "Once daily",
              duration: "5 days",
              quantity: 150,
              instructions: "Take in the morning with food. Do not stop abruptly.",
              isDispensed: true,
            },
            {
              drugId: drugByName["Salbutamol"].id,
              dosage: "2 puffs",
              frequency: "Every 4-6 hours as needed",
              duration: "30 days",
              quantity: 1,
              instructions: "Shake well before use. Rinse mouth after use.",
              isDispensed: true,
            },
          ],
        },
      },
    });

    // Prescription 3: Patient 5 (CAD)
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000005"].id,
        doctorId: userByUsername["dr.patel"].id,
        diagnosis: "Coronary Artery Disease, Hyperlipidemia",
        items: {
          create: [
            {
              drugId: drugByName["Atorvastatin"].id,
              dosage: "20mg",
              frequency: "Once daily at bedtime",
              duration: "90 days",
              quantity: 90,
              instructions: "Take at bedtime for optimal cholesterol reduction.",
              isDispensed: true,
            },
          ],
        },
      },
    });

    // Prescription 4: Patient 9 (AFib)
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000009"].id,
        doctorId: userByUsername["dr.patel"].id,
        diagnosis: "Paroxysmal Atrial Fibrillation, Osteoarthritis",
        notes: "Avoid NSAIDs due to anticoagulation.",
        items: {
          create: [
            {
              drugId: drugByName["Paracetamol"].id,
              dosage: "500mg",
              frequency: "Every 6 hours as needed",
              duration: "30 days",
              quantity: 120,
              instructions: "Do not exceed 4g per day. Use for joint pain.",
              isDispensed: true,
            },
          ],
        },
      },
    });

    // Prescription 5: Patient 14 (migraine) — not yet dispensed
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000014"].id,
        doctorId: userByUsername["dr.nguyen"].id,
        diagnosis: "Migraine with Aura",
        items: {
          create: [
            {
              drugId: drugByName["Paracetamol"].id,
              dosage: "1000mg",
              frequency: "At onset of migraine",
              duration: "30 days",
              quantity: 30,
              instructions: "Take at first sign of migraine. May repeat after 4 hours.",
              isDispensed: false,
            },
            {
              drugId: drugByName["Omeprazole"].id,
              dosage: "20mg",
              frequency: "Once daily before breakfast",
              duration: "14 days",
              quantity: 14,
              instructions: "Gastroprotection during acute migraine treatment.",
              isDispensed: false,
            },
          ],
        },
      },
    });

    // Prescription 6: Patient 15 (COPD)
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000015"].id,
        doctorId: userByUsername["dr.james"].id,
        diagnosis: "COPD, moderate (GOLD Stage II)",
        items: {
          create: [
            {
              drugId: drugByName["Salbutamol"].id,
              dosage: "2 puffs",
              frequency: "Every 4-6 hours as needed",
              duration: "90 days",
              quantity: 3,
              instructions: "Rescue inhaler. Seek help if using more than 4 times/day.",
              isDispensed: true,
            },
          ],
        },
      },
    });

    // Prescription 7: Patient 7 (back pain)
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000007"].id,
        doctorId: userByUsername["dr.james"].id,
        diagnosis: "Chronic lower back pain — degenerative disc disease L4-L5",
        notes: "Continue physical therapy. Review pain management in 4 weeks.",
        items: {
          create: [
            {
              drugId: drugByName["Paracetamol"].id,
              dosage: "1000mg",
              frequency: "Three times daily",
              duration: "30 days",
              quantity: 90,
              instructions: "Take with food. Do not exceed 3g per day.",
              isDispensed: false,
            },
            {
              drugId: drugByName["Omeprazole"].id,
              dosage: "20mg",
              frequency: "Once daily",
              duration: "30 days",
              quantity: 30,
              instructions: "Gastroprotection. Take 30 minutes before breakfast.",
              isDispensed: false,
            },
          ],
        },
      },
    });

    // Prescription 8: Patient 2 (general wellness)
    await prisma.prescription.create({
      data: {
        patientId: patByCode["PAT-000002"].id,
        doctorId: userByUsername["dr.james"].id,
        diagnosis: "Upper respiratory tract infection",
        items: {
          create: [
            {
              drugId: drugByName["Amoxicillin"].id,
              dosage: "500mg",
              frequency: "Three times daily",
              duration: "7 days",
              quantity: 21,
              instructions: "Complete the full course even if symptoms improve.",
              isDispensed: true,
            },
            {
              drugId: drugByName["Paracetamol"].id,
              dosage: "500mg",
              frequency: "Every 6 hours as needed",
              duration: "5 days",
              quantity: 20,
              instructions: "For fever and pain relief.",
              isDispensed: true,
            },
          ],
        },
      },
    });

    console.warn("  Prescriptions: 8 (with 13 items)");
  } else {
    console.warn("  Prescriptions: already seeded, skipping");
  }

  // ========================================================================
  // 13. WARDS, ROOMS & BEDS
  // ========================================================================

  const existingWards = await prisma.ward.count();
  let wards: Awaited<ReturnType<typeof prisma.ward.findMany>> = [];

  if (existingWards === 0) {
    // General Ward
    const generalWard = await prisma.ward.create({
      data: {
        name: "General Ward",
        departmentId: deptByCode["GEN"].id,
        floor: 2,
        totalBeds: 8,
        rooms: {
          create: [
            {
              number: "201",
              type: "Semi-Private",
              beds: {
                create: [
                  { number: "A", status: BedStatus.occupied },
                  { number: "B", status: BedStatus.available },
                ],
              },
            },
            {
              number: "202",
              type: "Semi-Private",
              beds: {
                create: [
                  { number: "A", status: BedStatus.available },
                  { number: "B", status: BedStatus.occupied },
                ],
              },
            },
            {
              number: "203",
              type: "General",
              beds: {
                create: [
                  { number: "A", status: BedStatus.available },
                  { number: "B", status: BedStatus.available },
                  { number: "C", status: BedStatus.maintenance },
                  { number: "D", status: BedStatus.available },
                ],
              },
            },
          ],
        },
      },
    });

    // ICU
    const icuWard = await prisma.ward.create({
      data: {
        name: "Intensive Care Unit",
        departmentId: deptByCode["ER"].id,
        floor: 3,
        totalBeds: 4,
        rooms: {
          create: [
            {
              number: "301",
              type: "ICU Single",
              beds: {
                create: [{ number: "A", status: BedStatus.occupied }],
              },
            },
            {
              number: "302",
              type: "ICU Single",
              beds: {
                create: [{ number: "A", status: BedStatus.available }],
              },
            },
            {
              number: "303",
              type: "ICU Double",
              beds: {
                create: [
                  { number: "A", status: BedStatus.available },
                  { number: "B", status: BedStatus.reserved },
                ],
              },
            },
          ],
        },
      },
    });

    // Pediatric Ward
    const pedWard = await prisma.ward.create({
      data: {
        name: "Pediatric Ward",
        departmentId: deptByCode["PED"].id,
        floor: 4,
        totalBeds: 4,
        rooms: {
          create: [
            {
              number: "401",
              type: "Pediatric Single",
              beds: {
                create: [{ number: "A", status: BedStatus.available }],
              },
            },
            {
              number: "402",
              type: "Pediatric Double",
              beds: {
                create: [
                  { number: "A", status: BedStatus.available },
                  { number: "B", status: BedStatus.available },
                ],
              },
            },
          ],
        },
      },
    });

    wards = [generalWard, icuWard, pedWard];
    console.warn(`  Wards: ${wards.length} (with rooms and beds)`);
  } else {
    wards = await prisma.ward.findMany();
    console.warn("  Wards: already seeded, skipping");
  }

  // Fetch all beds for admission reference
  const allBeds = await prisma.bed.findMany({
    include: { room: { include: { ward: true } } },
    orderBy: [{ room: { ward: { name: "asc" } } }, { room: { number: "asc" } }, { number: "asc" }],
  });

  const occupiedBeds = allBeds.filter((b) => b.status === BedStatus.occupied);

  // ========================================================================
  // 14. ADMISSIONS
  // ========================================================================

  const existingAdmissions = await prisma.admission.count();
  let admissions: Awaited<ReturnType<typeof prisma.admission.findMany>> = [];

  if (existingAdmissions === 0 && occupiedBeds.length >= 2) {
    // Admission 1: Patient 5 (cardiac) — currently admitted in General Ward 201-A
    const admission1 = await prisma.admission.create({
      data: {
        admissionCode: generateCode("ADM", 1),
        patientId: patByCode["PAT-000005"].id,
        bedId: occupiedBeds[0].id,
        attendingDoctorId: userByUsername["dr.patel"].id,
        admittedAt: daysFromNow(-3),
        primaryDiagnosis: "Unstable angina. Admitted for observation and cardiac monitoring.",
        status: AdmissionStatus.admitted,
      },
    });

    // Admission 2: Patient 13 (abdominal pain) — currently in General Ward 202-B
    const admission2 = await prisma.admission.create({
      data: {
        admissionCode: generateCode("ADM", 2),
        patientId: patByCode["PAT-000013"].id,
        bedId: occupiedBeds[1].id,
        attendingDoctorId: userByUsername["dr.james"].id,
        admittedAt: daysFromNow(-1),
        primaryDiagnosis: "Acute appendicitis. Post-appendectomy recovery.",
        status: AdmissionStatus.admitted,
      },
    });

    // Admission 3: Patient 9 — ICU, currently admitted
    const icuOccupiedBed = allBeds.find(
      (b) => b.status === BedStatus.occupied && b.room.ward.name === "Intensive Care Unit",
    );
    let admission3;
    if (icuOccupiedBed) {
      admission3 = await prisma.admission.create({
        data: {
          admissionCode: generateCode("ADM", 3),
          patientId: patByCode["PAT-000009"].id,
          bedId: icuOccupiedBed.id,
          attendingDoctorId: userByUsername["dr.patel"].id,
          admittedAt: daysFromNow(-5),
          primaryDiagnosis:
            "Atrial fibrillation with rapid ventricular response. Hemodynamically unstable.",
          status: AdmissionStatus.admitted,
        },
      });
    }

    // Admission 4: Patient 7 — discharged (use an available bed since they left)
    const availableBed = allBeds.find((b) => b.status === BedStatus.available);
    let admission4;
    if (availableBed) {
      admission4 = await prisma.admission.create({
        data: {
          admissionCode: generateCode("ADM", 4),
          patientId: patByCode["PAT-000007"].id,
          bedId: availableBed.id,
          attendingDoctorId: userByUsername["dr.james"].id,
          admittedAt: daysFromNow(-10),
          dischargedAt: daysFromNow(-7),
          primaryDiagnosis: "Severe lumbar radiculopathy. Conservative management.",
          status: AdmissionStatus.discharged,
          dischargeSummary:
            "Patient responded well to IV analgesics and physical therapy. " +
            "Discharged with oral pain management plan. Follow-up in 2 weeks.",
        },
      });
    }

    admissions = [admission1, admission2, admission3, admission4].filter(
      (a): a is NonNullable<typeof a> => a != null,
    );
    console.warn(`  Admissions: ${admissions.length}`);

    // ====================================================================
    // 15. VITAL SIGNS
    // ====================================================================

    const vitalSignsData = [
      // Admission 1 vitals (patient 5 — cardiac, 3 days of readings)
      {
        admissionId: admission1.id,
        temperature: 36.8,
        systolicBP: 148,
        diastolicBP: 92,
        pulse: 88,
        spO2: 96.0,
        respRate: 18,
        notes: "Admission vitals. Elevated BP noted.",
        recordedAt: daysFromNow(-3),
      },
      {
        admissionId: admission1.id,
        temperature: 36.6,
        systolicBP: 138,
        diastolicBP: 85,
        pulse: 82,
        spO2: 97.0,
        respRate: 16,
        recordedAt: daysFromNow(-2),
      },
      {
        admissionId: admission1.id,
        temperature: 36.7,
        systolicBP: 132,
        diastolicBP: 80,
        pulse: 78,
        spO2: 98.0,
        respRate: 16,
        notes: "BP trending down with medication adjustment.",
        recordedAt: daysFromNow(-1),
      },
      {
        admissionId: admission1.id,
        temperature: 36.5,
        systolicBP: 128,
        diastolicBP: 78,
        pulse: 76,
        spO2: 98.0,
        respRate: 15,
        recordedAt: daysFromNow(0),
      },
      // Admission 2 vitals (patient 13 — post-op)
      {
        admissionId: admission2.id,
        temperature: 37.8,
        systolicBP: 125,
        diastolicBP: 80,
        pulse: 92,
        spO2: 97.0,
        respRate: 18,
        notes: "Post-operative vitals. Low-grade fever expected.",
        recordedAt: daysFromNow(-1),
      },
      {
        admissionId: admission2.id,
        temperature: 37.2,
        systolicBP: 120,
        diastolicBP: 76,
        pulse: 84,
        spO2: 98.0,
        respRate: 16,
        notes: "Fever resolving. Patient tolerating oral fluids.",
        recordedAt: daysFromNow(0),
      },
    ];

    // Add ICU patient vitals if admission3 exists
    if (admission3) {
      vitalSignsData.push(
        {
          admissionId: admission3.id,
          temperature: 37.1,
          systolicBP: 92,
          diastolicBP: 58,
          pulse: 142,
          spO2: 93.0,
          respRate: 24,
          notes: "Admission to ICU. Tachycardic, hypotensive. IV amiodarone started.",
          recordedAt: daysFromNow(-5),
        },
        {
          admissionId: admission3.id,
          temperature: 36.9,
          systolicBP: 108,
          diastolicBP: 68,
          pulse: 98,
          spO2: 96.0,
          respRate: 20,
          notes: "Rate control improving. Patient more hemodynamically stable.",
          recordedAt: daysFromNow(-3),
        },
        {
          admissionId: admission3.id,
          temperature: 36.7,
          systolicBP: 118,
          diastolicBP: 72,
          pulse: 82,
          spO2: 97.0,
          respRate: 18,
          notes: "Converted to normal sinus rhythm. Consider step-down to ward.",
          recordedAt: daysFromNow(-1),
        },
      );
    }

    // Add discharged patient vitals if admission4 exists
    if (admission4) {
      vitalSignsData.push({
        admissionId: admission4.id,
        temperature: 36.6,
        systolicBP: 130,
        diastolicBP: 82,
        pulse: 74,
        spO2: 98.0,
        respRate: 16,
        notes: "Discharge day vitals. Stable for discharge.",
        recordedAt: daysFromNow(-7),
      });
    }

    await prisma.vitalSign.createMany({ data: vitalSignsData });
    console.warn(`  Vital signs: ${vitalSignsData.length}`);

    // ====================================================================
    // 16. NURSING NOTES
    // ====================================================================

    const nurseIds = [userByUsername["nurse.mary"].id, userByUsername["nurse.chen"].id];

    const nursingNotesData = [
      {
        admissionId: admission1.id,
        userId: nurseIds[0],
        note: "Patient resting comfortably. Chest pain has not recurred since admission. Continuous cardiac monitoring in place. IV access patent in left forearm.",
        createdAt: daysFromNow(-3),
      },
      {
        admissionId: admission1.id,
        userId: nurseIds[0],
        note: "Morning assessment: Patient slept well. No complaints of chest pain or shortness of breath. Ambulated to bathroom without assistance. Tolerating cardiac diet.",
        createdAt: daysFromNow(-2),
      },
      {
        admissionId: admission1.id,
        userId: nurseIds[0],
        note: "BP improved with medication adjustment. Patient asking about discharge timeline. Educated on medication compliance and lifestyle modifications.",
        createdAt: daysFromNow(-1),
      },
      {
        admissionId: admission2.id,
        userId: nurseIds[0],
        note: "Post-operative check: Surgical wound clean and dry. Patient reports pain at 4/10. Analgesics administered per protocol. Encouraged deep breathing exercises.",
        createdAt: daysFromNow(-1),
      },
      {
        admissionId: admission2.id,
        userId: nurseIds[0],
        note: "Patient progressing well. Started on clear liquids, tolerating well. Pain decreased to 2/10. Drain output minimal. Early mobilization initiated.",
        createdAt: daysFromNow(0),
      },
    ];

    if (admission3) {
      nursingNotesData.push({
        admissionId: admission3.id,
        userId: nurseIds[1],
        note: "ICU admission: Continuous cardiac monitoring. Amiodarone drip running. Patient alert but anxious. Family updated on condition. Fall precautions in place.",
        createdAt: daysFromNow(-5),
      });
      nursingNotesData.push({
        admissionId: admission3.id,
        userId: nurseIds[1],
        note: "Significant improvement. Heart rhythm stabilized. Patient able to sit up in bed. Intake/output balanced. Discussing potential transfer to step-down unit with medical team.",
        createdAt: daysFromNow(-2),
      });
    }

    await prisma.nursingNote.createMany({ data: nursingNotesData });
    console.warn(`  Nursing notes: ${nursingNotesData.length}`);
  } else {
    admissions = await prisma.admission.findMany({ orderBy: { createdAt: "asc" } });
    console.warn("  Admissions: already seeded, skipping");
  }

  // ========================================================================
  // 17. INVOICES, ITEMS & PAYMENTS
  // ========================================================================

  const existingInvoices = await prisma.invoice.count();
  if (existingInvoices === 0) {
    const today = dateOnly(0);
    const dueDateDefault = dateOnly(30);

    // Invoice 1: Paid — appointment 1 (patient 1, OPD visit)
    await prisma.invoice.create({
      data: {
        invoiceNumber: generateCode("INV", 1),
        patientId: patByCode["PAT-000001"].id,
        appointmentId: aptByCode["APT-000001"].id,
        issueDate: dateOnly(-14),
        dueDate: dateOnly(-14 + 30),
        subtotal: 300.0,
        discountAmount: 0,
        taxAmount: 30.0,
        totalAmount: 330.0,
        paidAmount: 330.0,
        status: InvoiceStatus.paid,
        paymentMethod: PaymentMethod.card,
        notes: "OPD consultation + lab tests",
        items: {
          create: [
            {
              description: "OPD Consultation — General Medicine",
              quantity: 1,
              unitPrice: 150.0,
              totalPrice: 150.0,
            },
            {
              description: "Complete Blood Count (CBC)",
              quantity: 1,
              unitPrice: 150.0,
              totalPrice: 150.0,
            },
          ],
        },
        payments: {
          create: [
            {
              amount: 330.0,
              paymentMethod: PaymentMethod.card,
              reference: "TXN-2025-000001",
              paidAt: daysFromNow(-14),
            },
          ],
        },
      },
    });

    // Invoice 2: Paid — appointment 2 (patient 5, cardiology follow-up)
    await prisma.invoice.create({
      data: {
        invoiceNumber: generateCode("INV", 2),
        patientId: patByCode["PAT-000005"].id,
        appointmentId: aptByCode["APT-000002"].id,
        issueDate: dateOnly(-12),
        dueDate: dateOnly(-12 + 30),
        subtotal: 650.0,
        discountAmount: 50.0,
        taxAmount: 60.0,
        totalAmount: 660.0,
        paidAmount: 660.0,
        status: InvoiceStatus.paid,
        paymentMethod: PaymentMethod.insurance,
        notes: "Cardiology consultation + diagnostics",
        items: {
          create: [
            {
              description: "Cardiology Consultation",
              quantity: 1,
              unitPrice: 250.0,
              totalPrice: 250.0,
            },
            {
              description: "ECG (Electrocardiogram)",
              quantity: 1,
              unitPrice: 200.0,
              totalPrice: 200.0,
            },
            {
              description: "Lipid Panel",
              quantity: 1,
              unitPrice: 200.0,
              totalPrice: 200.0,
            },
          ],
        },
        payments: {
          create: [
            {
              amount: 660.0,
              paymentMethod: PaymentMethod.insurance,
              reference: "INS-CLM-2025-0042",
              paidAt: daysFromNow(-10),
            },
          ],
        },
      },
    });

    // Invoice 3: Paid — appointment 3 (patient 3)
    await prisma.invoice.create({
      data: {
        invoiceNumber: generateCode("INV", 3),
        patientId: patByCode["PAT-000003"].id,
        appointmentId: aptByCode["APT-000003"].id,
        issueDate: dateOnly(-10),
        dueDate: dateOnly(-10 + 30),
        subtotal: 150.0,
        discountAmount: 0,
        taxAmount: 15.0,
        totalAmount: 165.0,
        paidAmount: 165.0,
        status: InvoiceStatus.paid,
        paymentMethod: PaymentMethod.cash,
        items: {
          create: [
            {
              description: "OPD Consultation — General Medicine",
              quantity: 1,
              unitPrice: 150.0,
              totalPrice: 150.0,
            },
          ],
        },
        payments: {
          create: [
            {
              amount: 165.0,
              paymentMethod: PaymentMethod.cash,
              reference: "CASH-REC-000003",
              paidAt: daysFromNow(-10),
            },
          ],
        },
      },
    });

    // Invoice 4: Partially paid — admission 1 (patient 5, cardiac admission)
    const admissionForInv =
      admissions.find((a) => a?.admissionCode === generateCode("ADM", 1)) ?? null;
    if (admissionForInv) {
      await prisma.invoice.create({
        data: {
          invoiceNumber: generateCode("INV", 4),
          patientId: patByCode["PAT-000005"].id,
          admissionId: admissionForInv.id,
          issueDate: dateOnly(-3),
          dueDate: dateOnly(27),
          subtotal: 5500.0,
          discountAmount: 0,
          taxAmount: 550.0,
          totalAmount: 6050.0,
          paidAmount: 2000.0,
          status: InvoiceStatus.partially_paid,
          notes: "Inpatient charges — ongoing admission",
          items: {
            create: [
              {
                description: "Ward Bed Charge (per day)",
                quantity: 3,
                unitPrice: 800.0,
                totalPrice: 2400.0,
              },
              {
                description: "Cardiac Monitoring (per day)",
                quantity: 3,
                unitPrice: 500.0,
                totalPrice: 1500.0,
              },
              {
                description: "Attending Physician (Cardiology)",
                quantity: 1,
                unitPrice: 1000.0,
                totalPrice: 1000.0,
              },
              {
                description: "Medications and IV Fluids",
                quantity: 1,
                unitPrice: 600.0,
                totalPrice: 600.0,
              },
            ],
          },
          payments: {
            create: [
              {
                amount: 2000.0,
                paymentMethod: PaymentMethod.bank_transfer,
                reference: "BT-2025-000012",
                paidAt: daysFromNow(-2),
              },
            ],
          },
        },
      });
    }

    // Invoice 5: Issued — appointment 4 (patient 10, pediatric)
    await prisma.invoice.create({
      data: {
        invoiceNumber: generateCode("INV", 5),
        patientId: patByCode["PAT-000010"].id,
        appointmentId: aptByCode["APT-000004"].id,
        issueDate: dateOnly(-8),
        dueDate: dateOnly(-8 + 30),
        subtotal: 200.0,
        discountAmount: 0,
        taxAmount: 20.0,
        totalAmount: 220.0,
        paidAmount: 0,
        status: InvoiceStatus.issued,
        items: {
          create: [
            {
              description: "Pediatric Wellness Exam",
              quantity: 1,
              unitPrice: 200.0,
              totalPrice: 200.0,
            },
          ],
        },
      },
    });

    // Invoice 6: Draft — for upcoming appointment
    await prisma.invoice.create({
      data: {
        invoiceNumber: generateCode("INV", 6),
        patientId: patByCode["PAT-000014"].id,
        issueDate: today,
        dueDate: dueDateDefault,
        subtotal: 350.0,
        discountAmount: 0,
        taxAmount: 35.0,
        totalAmount: 385.0,
        paidAmount: 0,
        status: InvoiceStatus.draft,
        notes: "Draft — pending neurology consultation",
        items: {
          create: [
            {
              description: "Neurology Consultation",
              quantity: 1,
              unitPrice: 300.0,
              totalPrice: 300.0,
            },
            {
              description: "Prescription Processing Fee",
              quantity: 1,
              unitPrice: 50.0,
              totalPrice: 50.0,
            },
          ],
        },
      },
    });

    // Invoice 7: Overdue — appointment 5 (patient 2, teleconsult)
    await prisma.invoice.create({
      data: {
        invoiceNumber: generateCode("INV", 7),
        patientId: patByCode["PAT-000002"].id,
        appointmentId: aptByCode["APT-000005"].id,
        issueDate: dateOnly(-37),
        dueDate: dateOnly(-7),
        subtotal: 100.0,
        discountAmount: 0,
        taxAmount: 10.0,
        totalAmount: 110.0,
        paidAmount: 0,
        status: InvoiceStatus.overdue,
        notes: "Teleconsultation fee — overdue",
        items: {
          create: [
            {
              description: "Teleconsultation — General Medicine",
              quantity: 1,
              unitPrice: 100.0,
              totalPrice: 100.0,
            },
          ],
        },
      },
    });

    // Invoice 8: Cancelled
    await prisma.invoice.create({
      data: {
        invoiceNumber: generateCode("INV", 8),
        patientId: patByCode["PAT-000006"].id,
        issueDate: dateOnly(-5),
        dueDate: dateOnly(-5 + 30),
        subtotal: 250.0,
        discountAmount: 0,
        taxAmount: 25.0,
        totalAmount: 275.0,
        paidAmount: 0,
        status: InvoiceStatus.cancelled,
        notes: "Cancelled — corresponding appointment was cancelled.",
        items: {
          create: [
            {
              description: "Cardiology Consultation",
              quantity: 1,
              unitPrice: 250.0,
              totalPrice: 250.0,
            },
          ],
        },
      },
    });

    console.warn("  Invoices: 8 (with items and payments)");
  } else {
    console.warn("  Invoices: already seeded, skipping");
  }

  // ========================================================================
  // 18. PATIENT DOCUMENTS
  // ========================================================================

  const existingDocs = await prisma.patientDocument.count();
  if (existingDocs === 0) {
    await prisma.patientDocument.createMany({
      data: [
        {
          patientId: patByCode["PAT-000001"].id,
          title: "Diabetes Management Plan",
          fileUrl: "/uploads/patients/PAT-000001/diabetes-plan.pdf",
          fileType: "application/pdf",
        },
        {
          patientId: patByCode["PAT-000005"].id,
          title: "Cardiac Catheterization Report",
          fileUrl: "/uploads/patients/PAT-000005/cath-report-2020.pdf",
          fileType: "application/pdf",
        },
        {
          patientId: patByCode["PAT-000005"].id,
          title: "Echocardiogram Results",
          fileUrl: "/uploads/patients/PAT-000005/echo-2024.pdf",
          fileType: "application/pdf",
        },
        {
          patientId: patByCode["PAT-000009"].id,
          title: "Holter Monitor Report",
          fileUrl: "/uploads/patients/PAT-000009/holter-report.pdf",
          fileType: "application/pdf",
        },
      ],
    });
    console.warn("  Patient documents: 4");
  } else {
    console.warn("  Patient documents: already seeded, skipping");
  }

  // ========================================================================
  // 19. AUDIT LOGS
  // ========================================================================

  const existingLogs = await prisma.auditLog.count();
  if (existingLogs === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          userId: userByUsername["admin"].id,
          action: "CREATE",
          entity: "User",
          entityId: userByUsername["dr.james"].id,
          newData: { username: "dr.james", role: "doctor", department: "General Medicine" },
          ipAddress: "192.168.1.100",
          createdAt: daysFromNow(-30),
        },
        {
          userId: userByUsername["admin"].id,
          action: "CREATE",
          entity: "User",
          entityId: userByUsername["dr.patel"].id,
          newData: { username: "dr.patel", role: "doctor", department: "Cardiology" },
          ipAddress: "192.168.1.100",
          createdAt: daysFromNow(-30),
        },
        {
          userId: userByUsername["rec.jones"].id,
          action: "CREATE",
          entity: "Patient",
          entityId: patByCode["PAT-000001"].id,
          newData: { patientCode: "PAT-000001", name: "John Doe" },
          ipAddress: "192.168.1.105",
          createdAt: daysFromNow(-25),
        },
        {
          userId: userByUsername["dr.james"].id,
          action: "CREATE",
          entity: "Appointment",
          entityId: aptByCode["APT-000001"].id,
          newData: {
            appointmentCode: "APT-000001",
            type: "opd",
            patient: "PAT-000001",
          },
          ipAddress: "192.168.1.101",
          createdAt: daysFromNow(-15),
        },
        {
          userId: userByUsername["dr.james"].id,
          action: "UPDATE",
          entity: "Appointment",
          entityId: aptByCode["APT-000001"].id,
          oldData: { status: "scheduled" },
          newData: { status: "completed" },
          ipAddress: "192.168.1.101",
          createdAt: daysFromNow(-14),
        },
      ],
    });
    console.warn("  Audit logs: 5");
  } else {
    console.warn("  Audit logs: already seeded, skipping");
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.warn("\nSeeding complete.");
  console.warn("---");
  console.warn("Default logins:");
  console.warn("  admin      / Admin@12345   (director)");
  console.warn("  dr.james   / Doctor@12345  (doctor - General Medicine)");
  console.warn("  dr.patel   / Doctor@12345  (doctor - Cardiology)");
  console.warn("  dr.nguyen  / Doctor@12345  (doctor - Pediatrics)");
  console.warn("  nurse.mary / Nurse@12345!  (nurse - General Medicine)");
  console.warn("  nurse.chen / Nurse@12345!  (nurse - Emergency)");
  console.warn("  rec.jones  / Recept@12345  (receptionist)");
  console.warn("  lab.wilson / LabTech@12345 (lab_tech - Laboratory)");
  console.warn("  pharm.ali  / Pharma@12345  (pharmacist - Pharmacy)");
  console.warn("  para.smith / Paramed@12345 (paramedic - Emergency)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
