# Module 2: Patient Registration & Records

**Phase:** 1 — Core Infrastructure
**Priority:** Critical
**Dependencies:** Authentication & Authorization (Module 1)

---

## 1. Overview

The Patient Registration & Records module manages the complete lifecycle of patient data — from initial registration at the front desk through ongoing medical history management. It is the central data hub that all clinical and billing modules depend on for patient identity and demographics.

---

## 2. User Stories

### US-2.1: Register New Patient
**As a** receptionist,
**I want to** register a new patient by entering their personal and demographic details,
**So that** the patient has a record in the system and can be scheduled for appointments or admitted.

**Acceptance Criteria:**
- A registration form captures: first name, last name, date of birth, gender, phone, email (optional), address, national ID (optional), blood group (optional), allergies (optional)
- On successful submission, a unique patient code is generated (e.g., `PAT-000001`)
- The patient record is created and the user is shown the patient details page
- The creating user is recorded as `createdBy`
- Required field validation is enforced (first name, last name, DOB, gender, phone)

### US-2.2: Search for a Patient
**As a** receptionist or doctor,
**I want to** search for existing patients by name, phone, patient code, or national ID,
**So that** I can quickly find the patient's record without re-registering them.

**Acceptance Criteria:**
- Search supports: patient code (exact), name (partial match), phone (exact/partial), national ID (exact)
- Results are returned in a paginated list showing patient code, full name, phone, and gender
- Clicking a result navigates to the patient details page
- Search is case-insensitive for names

### US-2.3: View Patient Details
**As a** doctor or nurse,
**I want to** view a patient's full profile including demographics, medical history, and documents,
**So that** I have the clinical context needed for care decisions.

**Acceptance Criteria:**
- The patient detail page displays all demographic information
- Emergency contacts are listed
- Medical history (conditions, diagnoses) is shown in chronological order
- Uploaded documents (ID cards, insurance cards) are viewable/downloadable
- Allergies are prominently displayed (clinical safety)

### US-2.4: Update Patient Information
**As a** receptionist or admin,
**I want to** update a patient's contact details, address, or insurance information,
**So that** the records stay current and accurate.

**Acceptance Criteria:**
- All editable fields can be updated via an edit form
- Changes are saved and the audit log records who changed what and when
- The `updatedAt` timestamp is refreshed
- Patient code and creation date are read-only

### US-2.5: Add Emergency Contact
**As a** receptionist,
**I want to** add one or more emergency contacts for a patient,
**So that** the hospital can reach someone in case of a medical emergency.

**Acceptance Criteria:**
- Each emergency contact has: name, relationship, phone number
- Multiple contacts can be added per patient
- Contacts can be updated or removed

### US-2.6: Record Medical History
**As a** doctor,
**I want to** add medical history entries (chronic conditions, past surgeries, family history) to a patient's record,
**So that** this information is available for future clinical decisions.

**Acceptance Criteria:**
- Each entry has: condition name, description (optional), date diagnosed (optional), active/inactive status
- History entries are listed chronologically
- Entries can be marked as inactive (resolved) but are never deleted
- Only doctors can add/modify medical history entries

### US-2.7: Upload Patient Documents
**As a** receptionist,
**I want to** upload documents (ID card, insurance card, referral letters) to a patient's record,
**So that** copies of important documents are stored digitally.

**Acceptance Criteria:**
- Supported file types: PDF, JPG, PNG
- Each document has a title and file type label
- Documents are stored in MinIO (S3-compatible storage)
- Documents can be viewed and downloaded from the patient profile
- Maximum file size: 10MB per document

### US-2.8: Patient Photo Upload
**As a** receptionist,
**I want to** upload a patient's photo during registration,
**So that** staff can visually identify the patient.

**Acceptance Criteria:**
- A photo can be uploaded during registration or added later
- Accepted formats: JPG, PNG
- The photo is displayed on the patient profile and in search results
- Maximum file size: 5MB

---

## 3. Business Requirements

### BR-2.1: Patient Code Generation
- The system SHALL generate a unique, sequential patient code with the format `PAT-XXXXXX` (e.g., `PAT-000001`)
- Patient codes SHALL be immutable once assigned
- The sequence SHALL never be reused, even if a patient record is deactivated

### BR-2.2: Required Patient Data
The following fields SHALL be required for patient registration:
- First name
- Last name
- Date of birth
- Gender
- Phone number

### BR-2.3: National ID Uniqueness
- If a national ID is provided, it SHALL be unique across all patient records
- The system SHALL warn when a duplicate national ID is detected during registration

### BR-2.4: Allergy Data
- Allergies SHALL be stored as a JSON array of strings
- Allergies SHALL be prominently visible on any screen where clinical decisions are made (appointments, prescriptions, admissions)

### BR-2.5: Data Retention
- Patient records SHALL be retained for a minimum of 7 years per healthcare regulation
- Records SHALL never be hard-deleted; use soft-delete or archive mechanisms if deactivation is needed

### BR-2.6: Audit Trail
- All create, update, and delete operations on patient data SHALL be recorded in the audit log
- The audit log SHALL capture: user, action, entity, entity ID, old data, new data, timestamp

### BR-2.7: Access Control
| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Receptionist | Yes | Yes | Yes | No |
| Admin | Yes | Yes | Yes | No |
| Doctor | No | Yes (own patients) | Medical history only | No |
| Nurse | No | Yes | No | No |
| Director | No | Yes | No | No |

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| POST | `/api/v1/patients` | Register new patient | receptionist, admin |
| GET | `/api/v1/patients` | List patients (paginated) | all authenticated |
| GET | `/api/v1/patients/search` | Search patients | all authenticated |
| GET | `/api/v1/patients/:id` | Get patient details | all authenticated |
| PUT | `/api/v1/patients/:id` | Update patient record | receptionist, admin |
| GET | `/api/v1/patients/:id/history` | Get medical history | doctor, nurse, admin |
| POST | `/api/v1/patients/:id/history` | Add medical history entry | doctor |
| PUT | `/api/v1/patients/:id/history/:historyId` | Update history entry | doctor |
| POST | `/api/v1/patients/:id/documents` | Upload document | receptionist, admin |
| GET | `/api/v1/patients/:id/documents` | List patient documents | all authenticated |
| POST | `/api/v1/patients/:id/emergency-contacts` | Add emergency contact | receptionist, admin |
| PUT | `/api/v1/patients/:id/emergency-contacts/:contactId` | Update emergency contact | receptionist, admin |
| DELETE | `/api/v1/patients/:id/emergency-contacts/:contactId` | Remove emergency contact | receptionist, admin |

### 4.2 Data Models

**Patient** (see `prisma/schema.prisma` — Patient model)

Key fields:
- `id`: UUID, primary key
- `patientCode`: Auto-generated, unique, format `PAT-XXXXXX`
- `firstName`, `lastName`: Required strings
- `dateOfBirth`: Date, required
- `gender`: Enum (male, female, other)
- `nationalId`: Optional, unique
- `phone`: Required
- `allergies`: JSONB array, default `[]`
- `photoUrl`: Optional, URL to MinIO
- `createdById`: FK to users table

**EmergencyContact**: name, relationship, phone — cascading delete with patient

**MedicalHistory**: condition, description, diagnosedAt, isActive — cascading delete with patient

**PatientDocument**: title, fileUrl, fileType, uploadedAt — cascading delete with patient

### 4.3 Validation Schemas

```typescript
const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().date(), // ISO date
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(150).optional(),
  nationalId: z.string().max(50).optional(),
  address: z.string().optional(),
  bloodGroup: z.string().max(5).optional(),
  allergies: z.array(z.string()).optional(),
});

const searchPatientSchema = z.object({
  q: z.string().min(1), // search query
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

### 4.4 Search Implementation
- Patient search should query across: `patientCode`, `firstName`, `lastName`, `phone`, `nationalId`
- Use PostgreSQL `ILIKE` for case-insensitive partial matching on names
- Use exact match for `patientCode` and `nationalId`
- Results sorted by relevance (exact code match first, then name matches)

---

## 5. Additional Information

### UI Pages
- `/patients` — Patient list with search bar and register button
- `/patients/new` — Registration form
- `/patients/:id` — Patient detail page with tabs (Demographics, Medical History, Documents, Emergency Contacts)
- `/patients/:id/edit` — Edit patient form

### Edge Cases
- Duplicate detection: Warn if a patient with the same name + date of birth already exists (soft duplicate check, not a hard block)
- Date of birth validation: Must be in the past, patient cannot be older than 150 years
- Phone number: Accept various formats but store in a normalized format

### Cross-Module Dependencies
- **Appointments** module reads patient data for scheduling
- **Billing** module links invoices to patients
- **Pharmacy** module links prescriptions to patients
- **Lab** module links lab orders to patients
- **Inpatient** module links admissions to patients
