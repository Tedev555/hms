import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.warn("Seeding database...");

  // Create departments
  const departments = await Promise.all(
    [
      { name: "General Medicine", code: "GEN" },
      { name: "Cardiology", code: "CARD" },
      { name: "Orthopedics", code: "ORTH" },
      { name: "Pediatrics", code: "PED" },
      { name: "Neurology", code: "NEUR" },
      { name: "Emergency", code: "ER" },
      { name: "Radiology", code: "RAD" },
      { name: "Laboratory", code: "LAB" },
      { name: "Pharmacy", code: "PHAR" },
    ].map((dept) =>
      prisma.department.upsert({
        where: { code: dept.code },
        update: {},
        create: dept,
      }),
    ),
  );

  console.warn(`Created ${departments.length} departments`);

  // Create default admin user
  const passwordHash = await bcrypt.hash("Admin@12345", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@hms.local",
      passwordHash,
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.director,
      isActive: true,
    },
  });

  console.warn(`Created admin user: ${admin.username}`);

  // Create sample lab tests
  const labTests = await Promise.all(
    [
      {
        name: "Complete Blood Count",
        code: "CBC",
        category: "Hematology",
        sampleType: "Blood",
        referenceRange: "WBC: 4.5-11.0, RBC: 4.5-5.5, Hgb: 13.5-17.5",
        unit: "Various",
        price: 150.0,
        turnaroundHrs: 4,
      },
      {
        name: "Blood Glucose Fasting",
        code: "BGF",
        category: "Biochemistry",
        sampleType: "Blood",
        referenceRange: "70-100 mg/dL",
        unit: "mg/dL",
        price: 80.0,
        turnaroundHrs: 2,
      },
      {
        name: "Liver Function Test",
        code: "LFT",
        category: "Biochemistry",
        sampleType: "Blood",
        referenceRange: "ALT: 7-56, AST: 10-40, ALP: 44-147",
        unit: "U/L",
        price: 250.0,
        turnaroundHrs: 6,
      },
      {
        name: "Urinalysis",
        code: "UA",
        category: "Clinical Pathology",
        sampleType: "Urine",
        referenceRange: "pH: 4.5-8.0, Specific Gravity: 1.005-1.030",
        unit: "Various",
        price: 100.0,
        turnaroundHrs: 2,
      },
    ].map((test) =>
      prisma.labTest.upsert({
        where: { code: test.code },
        update: {},
        create: test,
      }),
    ),
  );

  console.warn(`Created ${labTests.length} lab tests`);

  console.warn("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
