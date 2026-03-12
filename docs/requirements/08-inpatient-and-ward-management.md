# Module 8: Inpatient & Ward Management

**Phase:** 4
**Priority:** High
**Dependencies:** Authentication (Module 1), Patient Registration (Module 2), Staff Management (Module 5), Billing (Module 4)

---

## 1. Overview

The Inpatient & Ward Management module manages the full lifecycle of admitted patients — from admission through discharge. It encompasses bed inventory management, admission/discharge workflows, vital signs charting, nursing documentation, and real-time bed availability tracking. This module is critical for hospitals with inpatient services and integrates closely with billing, pharmacy, and laboratory modules.

---

## 2. User Stories

### US-8.1: Manage Ward and Bed Inventory
**As a** hospital admin,
**I want to** set up and manage wards, rooms, and beds,
**So that** the system has an accurate representation of the hospital's physical bed capacity.

**Acceptance Criteria:**
- Create wards with: name, department, floor number, total bed count
- Create rooms within wards with: room number, room type (general, semi-private, private, ICU)
- Create beds within rooms with: bed number, initial status (available)
- Update ward, room, and bed details
- Deactivate wards or beds (e.g., for renovation)
- View hierarchical structure: ward → rooms → beds

### US-8.2: View Bed Availability Dashboard
**As a** receptionist or nurse,
**I want to** see a real-time dashboard of bed availability across all wards,
**So that** I can quickly find an available bed for a new admission.

**Acceptance Criteria:**
- Visual dashboard showing all wards with bed counts by status
- Color-coded bed status: available (green), occupied (red), reserved (yellow), maintenance (gray)
- Drill-down from ward → room → individual bed
- Shows occupancy rate per ward as a percentage
- Filter by ward, floor, room type

### US-8.3: Admit a Patient
**As a** receptionist or doctor,
**I want to** admit a patient by assigning them to an available bed with an attending doctor,
**So that** the patient is formally registered as an inpatient.

**Acceptance Criteria:**
- Select a registered patient
- Select an available bed (from the availability dashboard)
- Assign an attending doctor
- Enter primary diagnosis (optional at admission, can be added later)
- Admission code is auto-generated (e.g., `ADM-000001`)
- Admission is created with status `admitted`
- The selected bed status changes to `occupied`
- Admission timestamp is recorded

### US-8.4: Record Vital Signs
**As a** nurse,
**I want to** record a patient's vital signs at regular intervals,
**So that** the clinical team has an up-to-date picture of the patient's condition.

**Acceptance Criteria:**
- Select an admitted patient (from ward board or patient search)
- Enter vitals: temperature, systolic BP, diastolic BP, pulse, SpO2, respiratory rate
- Add optional notes with the reading
- Timestamp is automatically recorded
- Vitals are displayed as a chronological chart/table
- Abnormal values are highlighted (based on configurable normal ranges)

### US-8.5: Add Nursing Notes
**As a** nurse,
**I want to** document nursing observations and care activities for an admitted patient,
**So that** there is a continuous record of care for handoff and clinical decision-making.

**Acceptance Criteria:**
- Add a text note linked to the patient's admission
- The authoring nurse is automatically recorded
- Notes are displayed chronologically and cannot be edited after creation (append-only)
- Notes are visible to doctors, nurses, and admin

### US-8.6: Transfer Patient Between Beds/Wards
**As a** nurse or admin,
**I want to** transfer a patient to a different bed or ward,
**So that** the patient can be moved as their clinical needs change (e.g., ICU to general ward).

**Acceptance Criteria:**
- Select the patient's current admission
- Select a new available bed (different room/ward)
- The old bed status changes to `discharged` (pending housekeeping) then to `available`
- The new bed status changes to `occupied`
- The admission record is updated with the new bed
- Admission status changes to `transferred` temporarily, then back to `admitted`
- Transfer is logged in the audit trail

### US-8.7: Discharge a Patient
**As a** doctor,
**I want to** discharge a patient and generate a discharge summary,
**So that** the patient's inpatient stay is formally concluded with proper documentation.

**Acceptance Criteria:**
- Enter discharge summary (clinical notes, diagnosis, treatment given, follow-up instructions)
- Admission status changes to `discharged`
- Discharge timestamp is recorded
- The bed status changes to `discharged` (awaiting housekeeping clearance)
- Pending billing is triggered — all IPD charges compiled into a final invoice
- Discharge does not delete any data; all vitals, notes, and records remain

### US-8.8: Record LAMA (Leave Against Medical Advice)
**As a** doctor or nurse,
**I want to** record when a patient leaves against medical advice,
**So that** the hospital has a legal and clinical record of the event.

**Acceptance Criteria:**
- Admission status changes to `lama`
- LAMA documentation includes: reason, patient's statement (if provided), witnessing staff
- Discharge summary can be partially completed
- Bed is freed for new admissions

### US-8.9: Record Patient Death
**As a** doctor,
**I want to** record a patient death,
**So that** the hospital has an accurate record for legal, clinical, and statistical purposes.

**Acceptance Criteria:**
- Admission status changes to `deceased`
- Death timestamp, cause of death, and certifying doctor are recorded
- Bed status changes to `maintenance` (requires terminal cleaning)
- Death is recorded in the audit log

### US-8.10: View Ward Board
**As a** nurse,
**I want to** see a ward board showing all patients currently admitted in my ward,
**So that** I have a quick overview of my patients and their status.

**Acceptance Criteria:**
- List of all occupied beds in the ward with: bed number, patient name, attending doctor, admission date, primary diagnosis
- Quick links to vitals chart, nursing notes, and patient profile
- Shows most recent vital signs summary per patient
- Filterable by room or attending doctor

---

## 3. Business Requirements

### BR-8.1: Admission Code Generation
- Sequential format: `ADM-XXXXXX`
- Codes SHALL be unique and immutable

### BR-8.2: Bed Status States
| Status | Key | Description |
|--------|-----|-------------|
| Available | `available` | Clean, ready for new admission |
| Occupied | `occupied` | Patient currently admitted |
| Reserved | `reserved` | Held for scheduled admission |
| Maintenance | `maintenance` | Out of service (cleaning, repair) |
| Discharged | `discharged` | Patient left, awaiting housekeeping clearance |

### BR-8.3: Admission Status Flow
```
admitted → discharged
admitted → transferred → admitted (new bed)
admitted → deceased
admitted → lama
```

### BR-8.4: Bed-Admission Integrity
- A bed marked as `occupied` SHALL have exactly one active admission linked to it
- When a patient is discharged, the bed SHALL transition to `discharged` status
- Housekeeping or admin SHALL mark the bed as `available` after cleaning

### BR-8.5: Vital Signs Recording
- Vital signs SHALL be recorded with the following optional fields:
  - Temperature (Celsius, decimal 1 place)
  - Systolic/Diastolic BP (integers, mmHg)
  - Pulse (integer, bpm)
  - SpO2 (decimal 1 place, percentage)
  - Respiratory rate (integer, breaths/min)
- At least one vital sign field must be provided per recording
- Vitals SHALL be append-only (no edits or deletions)

### BR-8.6: Nursing Notes
- Notes SHALL be append-only — once created, they cannot be edited or deleted
- Each note SHALL record the author and timestamp
- Notes SHALL be visible to all clinical staff (doctors, nurses) for the admission

### BR-8.7: Access Control
| Role | Manage Beds | Admit/Discharge | Record Vitals | Nursing Notes | View Ward |
|------|------------|----------------|--------------|--------------|----------|
| Admin | Yes | Yes | No | No | Yes |
| Doctor | No | Discharge only | No | View only | Yes |
| Nurse | No | No | Yes | Yes | Yes |
| Receptionist | No | Admit only | No | No | Yes |
| Director | No | No | No | No | Yes (reports) |

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| POST | `/api/v1/wards` | Create ward | admin |
| GET | `/api/v1/wards` | List wards | all authenticated |
| GET | `/api/v1/wards/:id` | Get ward with rooms and beds | all authenticated |
| PUT | `/api/v1/wards/:id` | Update ward | admin |
| POST | `/api/v1/wards/:id/rooms` | Create room | admin |
| POST | `/api/v1/rooms/:id/beds` | Create bed | admin |
| PATCH | `/api/v1/beds/:id/status` | Update bed status | admin, nurse |
| GET | `/api/v1/beds/availability` | Get bed availability dashboard | all authenticated |
| POST | `/api/v1/admissions` | Admit patient | receptionist, admin, doctor |
| GET | `/api/v1/admissions` | List admissions (filtered) | all authenticated |
| GET | `/api/v1/admissions/:id` | Get admission details | all authenticated |
| PATCH | `/api/v1/admissions/:id/discharge` | Discharge patient | doctor |
| PATCH | `/api/v1/admissions/:id/transfer` | Transfer patient to new bed | nurse, admin |
| POST | `/api/v1/admissions/:id/vitals` | Record vital signs | nurse |
| GET | `/api/v1/admissions/:id/vitals` | Get vital sign history | doctor, nurse |
| POST | `/api/v1/admissions/:id/notes` | Add nursing note | nurse |
| GET | `/api/v1/admissions/:id/notes` | Get nursing notes | doctor, nurse, admin |

### 4.2 Data Models

**Ward:**
- `id`: UUID
- `name`: Unique string
- `departmentId`: FK → departments (optional)
- `floor`: Int
- `totalBeds`: Int
- `isActive`: Boolean

**Room:**
- `id`: UUID
- `wardId`: FK → wards
- `number`: String (unique within ward)
- `type`: String (general, semi-private, private, ICU)

**Bed:**
- `id`: UUID
- `roomId`: FK → rooms
- `number`: String (unique within room)
- `status`: BedStatus enum (default: available)

**Admission:**
- `id`: UUID
- `admissionCode`: Auto-generated, unique
- `patientId`: FK → patients
- `bedId`: FK → beds
- `attendingDoctorId`: FK → users
- `admittedAt`: DateTime
- `dischargedAt`: DateTime, nullable
- `primaryDiagnosis`: Text, nullable
- `status`: AdmissionStatus enum
- `dischargeSummary`: Text, nullable

**VitalSign:**
- `id`: UUID
- `admissionId`: FK → admissions
- `temperature`: Decimal(4,1), nullable
- `systolicBP`, `diastolicBP`: Int, nullable
- `pulse`: Int, nullable
- `spO2`: Decimal(4,1), nullable
- `respRate`: Int, nullable
- `notes`: Text, nullable
- `recordedAt`: DateTime

**NursingNote:**
- `id`: UUID
- `admissionId`: FK → admissions
- `userId`: FK → users (nurse)
- `note`: Text
- `createdAt`: DateTime

### 4.3 Validation Schemas

```typescript
const createAdmissionSchema = z.object({
  patientId: z.string().uuid(),
  bedId: z.string().uuid(),
  attendingDoctorId: z.string().uuid(),
  primaryDiagnosis: z.string().max(2000).optional(),
});

const recordVitalSignSchema = z.object({
  temperature: z.number().min(30).max(45).optional(),
  systolicBP: z.number().int().min(50).max(300).optional(),
  diastolicBP: z.number().int().min(20).max(200).optional(),
  pulse: z.number().int().min(20).max(300).optional(),
  spO2: z.number().min(50).max(100).optional(),
  respRate: z.number().int().min(5).max(60).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined && v !== null),
  "At least one vital sign measurement is required"
);

const dischargeSchema = z.object({
  dischargeSummary: z.string().min(1).max(5000),
});

const transferSchema = z.object({
  newBedId: z.string().uuid(),
});

const createNursingNoteSchema = z.object({
  note: z.string().min(1).max(5000),
});
```

---

## 5. Additional Information

### UI Pages
- `/wards` — Ward management and bed availability dashboard
- `/wards/:id` — Ward detail with rooms and beds grid
- `/admissions` — Admission list with filters (status, ward, doctor, date)
- `/admissions/new` — New admission form (patient search, bed selector, doctor selector)
- `/admissions/:id` — Admission detail page with tabs (Summary, Vitals, Nursing Notes, Orders)
- `/admissions/:id/vitals` — Vital signs chart/table
- `/admissions/:id/discharge` — Discharge form with summary
- `/ward-board` — Nurse ward board view

### Edge Cases
- **Double admission**: A patient cannot be admitted twice simultaneously — the system must check for active admissions before creating a new one
- **Bed conflict**: If two users try to admit patients to the same bed simultaneously, use database constraints to prevent conflicts
- **Emergency admission**: Should allow admission without a prior appointment
- **Long-stay patients**: No maximum admission duration; system should support indefinite stays
- **Bed turnover time**: Between discharge and available status, a maintenance/cleaning period may be enforced

### Cross-Module Dependencies
- **Patient Registration** (Module 2): Admitted patients must have existing patient records
- **Billing** (Module 4): Discharge triggers IPD invoice generation with all accumulated charges
- **Pharmacy** (Module 6): Inpatient medication orders and administration records
- **Laboratory** (Module 7): Lab orders for admitted patients linked to their admission
- **Appointments** (Module 3): Emergency appointments may lead to admission
