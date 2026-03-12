# Module 6: Pharmacy & Inventory

**Phase:** 3
**Priority:** High
**Dependencies:** Authentication (Module 1), Patient Registration (Module 2), Staff Management (Module 5)

---

## 1. Overview

The Pharmacy & Inventory module manages the hospital's drug catalogue, prescription-linked dispensing, stock levels, batch tracking with expiry management, and inventory reporting. It ensures that medications are dispensed safely and efficiently, with real-time visibility into stock levels and automated alerts for low stock and expiring drugs.

---

## 2. User Stories

### US-6.1: Manage Drug Catalogue
**As a** pharmacist,
**I want to** add and manage drugs in the catalogue with their details (generic name, brand, formulation, strength, pricing),
**So that** the pharmacy has an accurate and up-to-date list of available medications.

**Acceptance Criteria:**
- Add a new drug with: generic name, brand name, category, formulation, strength, unit, unit price, reorder level
- Mark a drug as controlled substance or requiring prescription
- Update drug details (price, reorder level, etc.)
- Deactivate drugs no longer stocked (soft delete, `isActive: false`)
- Search drugs by generic name, brand name, or category

### US-6.2: Receive Drug Stock (Batch Entry)
**As a** pharmacist,
**I want to** record incoming drug stock as a new batch with quantity, expiry date, and supplier info,
**So that** inventory is accurately tracked and batches can be traced.

**Acceptance Criteria:**
- Select a drug from the catalogue
- Enter: batch number, quantity received, expiry date, cost price, supplier name
- The drug's `currentStock` is incremented by the batch quantity
- Batch is linked to the drug and can be viewed in batch history
- Received date is automatically recorded

### US-6.3: View Drug Stock Levels
**As a** pharmacist,
**I want to** see current stock levels for all drugs,
**So that** I can identify what needs to be reordered.

**Acceptance Criteria:**
- List view of all active drugs with current stock and reorder level
- Drugs with `currentStock <= reorderLevel` are highlighted as low stock
- Filterable by category, stock status (low, normal, out of stock)
- Sortable by name, stock level, category

### US-6.4: Dispense Medication from Prescription
**As a** pharmacist,
**I want to** view a patient's prescription and dispense the medications listed,
**So that** the patient receives the correct drugs as prescribed by the doctor.

**Acceptance Criteria:**
- View pending prescriptions (items not yet dispensed)
- For each prescription item: verify drug availability, confirm quantity
- Mark items as dispensed individually or as a batch
- Stock is decremented using FIFO (oldest batch/nearest expiry first)
- If stock is insufficient, show alert and allow partial dispensing
- Dispensing is recorded with timestamp

### US-6.5: Create Prescription
**As a** doctor,
**I want to** create a prescription for a patient specifying drugs, dosage, frequency, and duration,
**So that** the pharmacy can dispense the correct medications.

**Acceptance Criteria:**
- Select patient and optionally link to an appointment
- Add prescription items: select drug, specify dosage, frequency, duration, quantity, special instructions
- Prescription is saved and visible to pharmacy staff
- Multiple drugs can be added to one prescription
- Diagnosis and general notes can be recorded

### US-6.6: View Low Stock Alerts
**As a** pharmacist or admin,
**I want to** see a dashboard of drugs that are at or below their reorder level,
**So that** I can initiate purchase orders before stock runs out.

**Acceptance Criteria:**
- Dashboard card or report showing count of low-stock drugs
- Detailed list of low-stock drugs with: drug name, current stock, reorder level, deficit
- Click-through to drug detail for reorder action

### US-6.7: View Expiring Drug Batches
**As a** pharmacist,
**I want to** see drugs that are expiring within a configurable timeframe (e.g., 90 days),
**So that** I can prioritize dispensing of near-expiry stock or remove expired items.

**Acceptance Criteria:**
- List of batches expiring within the specified period
- Shows: drug name, batch number, quantity remaining, expiry date
- Batches already expired are flagged differently from those approaching expiry
- Configurable expiry warning window (default: 90 days)

### US-6.8: View Prescription History for Patient
**As a** doctor or pharmacist,
**I want to** see a patient's prescription history,
**So that** I can review past medications and avoid duplicates or interactions.

**Acceptance Criteria:**
- From the patient profile, see all prescriptions chronologically
- Each prescription shows: date, prescribing doctor, diagnosis, list of drugs
- Each drug item shows: dosage, frequency, duration, dispensed status

### US-6.9: Drug-Drug Interaction Warning
**As a** doctor,
**I want to** be warned if I prescribe drugs that have known interactions,
**So that** I can avoid potentially harmful combinations.

**Acceptance Criteria:**
- When adding a drug to a prescription, check against patient's current active prescriptions
- Display a warning if a known interaction exists (basic rule engine)
- The warning is informational — the doctor can proceed if clinically justified
- Interaction data stored as a configurable rule set

---

## 3. Business Requirements

### BR-6.1: Drug Catalogue
- Each drug SHALL have a unique combination of generic name + brand name + strength
- Drug formulation SHALL be one of: tablet, capsule, syrup, injection, cream, inhaler, drops, other
- Drugs SHALL NOT be hard-deleted; use `isActive: false` for discontinued items

### BR-6.2: Batch Tracking
- Every stock entry SHALL be recorded as a batch with a unique batch number per drug
- Each batch SHALL have an expiry date
- Stock levels SHALL be tracked at both the drug level (`currentStock`) and batch level (`quantity`)

### BR-6.3: FIFO Dispensing
- When dispensing, the system SHALL use FIFO order — oldest batch (nearest expiry) is consumed first
- If a batch has insufficient quantity, the remainder SHALL be fulfilled from the next batch

### BR-6.4: Stock Alerts
- The system SHALL generate low stock alerts when `currentStock <= reorderLevel`
- The system SHALL flag batches expiring within 90 days (configurable)
- Expired batches SHALL be excluded from dispensable stock

### BR-6.5: Controlled Substance Tracking
- Drugs marked as `isControlled: true` SHALL have stricter tracking
- Each dispensing of a controlled substance SHALL be logged with additional detail
- Only authorized pharmacists SHALL dispense controlled substances

### BR-6.6: Prescription Requirement
- Drugs marked as `requiresPrescription: true` SHALL only be dispensed against a valid prescription
- Over-the-counter drugs (`requiresPrescription: false`) can be dispensed without a prescription

### BR-6.7: Access Control
| Role | Manage Catalogue | Receive Stock | Dispense | View Stock | Create Prescription |
|------|-----------------|--------------|---------|-----------|-------------------|
| Pharmacist | Yes | Yes | Yes | Yes | No |
| Doctor | No | No | No | View only | Yes |
| Nurse | No | No | No | View only | No |
| Admin | Yes | Yes | No | Yes | No |
| Director | No | No | No | Yes (reports) | No |

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| POST | `/api/v1/drugs` | Add new drug to catalogue | pharmacist, admin |
| GET | `/api/v1/drugs` | List drugs (paginated, filtered) | all authenticated |
| GET | `/api/v1/drugs/:id` | Get drug details with batches | all authenticated |
| PUT | `/api/v1/drugs/:id` | Update drug info | pharmacist, admin |
| PATCH | `/api/v1/drugs/:id/status` | Activate/deactivate drug | pharmacist, admin |
| POST | `/api/v1/drugs/:id/batches` | Record new batch (stock receipt) | pharmacist, admin |
| GET | `/api/v1/drugs/:id/batches` | List batches for a drug | pharmacist, admin |
| GET | `/api/v1/drugs/low-stock` | List drugs at or below reorder level | pharmacist, admin |
| GET | `/api/v1/drugs/expiring` | List batches expiring soon | pharmacist, admin |
| POST | `/api/v1/prescriptions` | Create a prescription | doctor |
| GET | `/api/v1/prescriptions` | List prescriptions (filtered) | doctor, pharmacist, nurse |
| GET | `/api/v1/prescriptions/:id` | Get prescription details | doctor, pharmacist, nurse |
| PATCH | `/api/v1/prescriptions/:id/items/:itemId/dispense` | Mark item as dispensed | pharmacist |
| GET | `/api/v1/patients/:patientId/prescriptions` | Patient prescription history | doctor, pharmacist, nurse |

### 4.2 Data Models

**Drug:**
- `id`: UUID
- `genericName`, `brandName`: String
- `category`: String
- `formulation`: DrugFormulation enum
- `strength`, `unit`: String
- `reorderLevel`: Int (default 10)
- `currentStock`: Int (default 0)
- `unitPrice`: Decimal(10,2)
- `isControlled`: Boolean (default false)
- `requiresPrescription`: Boolean (default true)
- `isActive`: Boolean (default true)

**DrugBatch:**
- `id`: UUID
- `drugId`: FK → drugs
- `batchNo`: String
- `quantity`: Int
- `expiryDate`: Date
- `costPrice`: Decimal(10,2)
- `supplier`: String, optional
- `receivedAt`: DateTime

**Prescription:**
- `id`: UUID
- `patientId`: FK → patients
- `doctorId`: FK → users
- `diagnosis`: Text, optional
- `notes`: Text, optional
- `createdAt`: DateTime

**PrescriptionItem:**
- `id`: UUID
- `prescriptionId`: FK → prescriptions
- `drugId`: FK → drugs
- `dosage`: String (e.g., "500mg")
- `frequency`: String (e.g., "3 times daily")
- `duration`: String (e.g., "7 days")
- `quantity`: Int
- `instructions`: Text, optional
- `isDispensed`: Boolean (default false)

### 4.3 Validation Schemas

```typescript
const createDrugSchema = z.object({
  genericName: z.string().min(1).max(200),
  brandName: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  formulation: z.enum(["tablet", "capsule", "syrup", "injection", "cream", "inhaler", "drops", "other"]),
  strength: z.string().max(50).optional(),
  unit: z.string().min(1).max(20),
  reorderLevel: z.number().int().min(0).default(10),
  unitPrice: z.number().positive(),
  isControlled: z.boolean().default(false),
  requiresPrescription: z.boolean().default(true),
});

const createBatchSchema = z.object({
  batchNo: z.string().min(1).max(50),
  quantity: z.number().int().positive(),
  expiryDate: z.string().date(),
  costPrice: z.number().positive(),
  supplier: z.string().max(200).optional(),
});

const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  diagnosis: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(z.object({
    drugId: z.string().uuid(),
    dosage: z.string().min(1).max(100),
    frequency: z.string().min(1).max(100),
    duration: z.string().min(1).max(50),
    quantity: z.number().int().positive(),
    instructions: z.string().max(500).optional(),
  })).min(1),
});
```

---

## 5. Additional Information

### UI Pages
- `/pharmacy` — Pharmacy dashboard (pending prescriptions, low stock alerts, expiry alerts)
- `/pharmacy/drugs` — Drug catalogue list with search and filters
- `/pharmacy/drugs/new` — Add new drug form
- `/pharmacy/drugs/:id` — Drug detail with batch history
- `/pharmacy/drugs/:id/batches/new` — Record stock receipt
- `/pharmacy/prescriptions` — Pending and recent prescriptions
- `/pharmacy/prescriptions/:id` — Prescription detail with dispense actions
- `/pharmacy/reports/low-stock` — Low stock report
- `/pharmacy/reports/expiring` — Expiry alert report

### Edge Cases
- **Dispensing more than stock**: Block with error; allow partial dispensing with pharmacist acknowledgment
- **Expired batch dispensing**: System must skip expired batches during FIFO dispensing
- **Negative stock**: Should never occur; all dispensing must validate stock beforehand
- **Batch quantity correction**: Allow pharmacists to adjust batch quantity for physical count discrepancies (audit logged)
- **Concurrent dispensing**: Two pharmacists dispensing from the same batch simultaneously — use optimistic locking or database transactions

### Cross-Module Dependencies
- **Patient Registration** (Module 2): Prescriptions linked to patients
- **Appointments** (Module 3): Prescriptions may be linked to OPD visits
- **Billing** (Module 4): Dispensed medications generate pharmacy charges on invoices
- **Inpatient** (Module 8): Inpatient prescriptions and medication administration records
