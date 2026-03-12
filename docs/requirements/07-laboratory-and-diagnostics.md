# Module 7: Laboratory & Diagnostics

**Phase:** 3
**Priority:** High
**Dependencies:** Authentication (Module 1), Patient Registration (Module 2), Staff Management (Module 5)

---

## 1. Overview

The Laboratory & Diagnostics module (LIS — Lab Information System) manages the full lab workflow: from doctor-initiated test orders, through sample collection and processing, to result entry and reporting. It provides lab technicians with tools to manage their workload, and gives doctors real-time access to patient lab results with abnormal and critical value flagging.

---

## 2. User Stories

### US-7.1: Manage Lab Test Catalogue
**As a** lab technician or admin,
**I want to** maintain a catalogue of available lab tests with their details,
**So that** doctors can order from a standardized list and results have proper reference ranges.

**Acceptance Criteria:**
- Add a new lab test with: name, code (unique), category, sample type, reference range, unit, price, turnaround time
- Update test details (price, reference range, turnaround time)
- Deactivate tests no longer offered (`isActive: false`)
- Search tests by name, code, or category
- Categories include: hematology, biochemistry, microbiology, immunology, urinalysis, etc.

### US-7.2: Create Lab Order
**As a** doctor,
**I want to** create a lab order for a patient specifying which tests to perform,
**So that** the lab receives a formal request to collect and process samples.

**Acceptance Criteria:**
- Select a patient (from patient search)
- Add one or more tests from the catalogue
- Set priority (routine, urgent, stat)
- Optionally add clinical notes for the lab
- Order code is auto-generated (e.g., `LAB-000001`)
- Order is created with status `ordered`
- Each test within the order has its own status tracking

### US-7.3: View Pending Lab Orders
**As a** lab technician,
**I want to** see all pending lab orders that need sample collection or processing,
**So that** I can manage my workload efficiently.

**Acceptance Criteria:**
- List of all orders with status `ordered` or `sample_collected` or `processing`
- Sorted by priority (stat > urgent > routine) then by order date
- Shows: order code, patient name, tests ordered, priority, ordered by, date
- Filterable by status, priority, date range

### US-7.4: Mark Sample Collected
**As a** lab technician,
**I want to** mark that a sample has been collected for a lab order,
**So that** the system tracks the specimen through the lab workflow.

**Acceptance Criteria:**
- Change order status from `ordered` to `sample_collected`
- Collection timestamp is recorded
- Individual test items within the order also update to `sample_collected`

### US-7.5: Enter Lab Results
**As a** lab technician,
**I want to** enter the results for each test in a lab order,
**So that** the results are available to the ordering doctor and patient record.

**Acceptance Criteria:**
- For each test item in the order, enter: result value, unit
- System auto-flags if the result is outside the reference range (`isAbnormal: true`)
- Lab tech can manually flag a result as critical (`isCritical: true`)
- Remarks can be added per result
- The entering lab tech is recorded
- Individual test item status changes to `completed` when result is entered
- When all test items have results, the order status changes to `completed`

### US-7.6: Critical Value Alert
**As a** doctor,
**I want to** be alerted when a lab result for my patient has a critical value,
**So that** I can take immediate clinical action.

**Acceptance Criteria:**
- When a result is marked as critical, an in-system notification is created for the ordering doctor
- The notification includes: patient name, test name, result value, and reference range
- Critical results are visually highlighted in red on all views

### US-7.7: View Lab Results for Patient
**As a** doctor or nurse,
**I want to** view all lab results for a patient in chronological order,
**So that** I can assess trends and make informed clinical decisions.

**Acceptance Criteria:**
- From the patient profile, view all lab orders and results
- Results are grouped by order and displayed chronologically
- Each result shows: test name, value, unit, reference range, abnormal flag, date
- Trending view for repeated tests (e.g., glucose over time) is a nice-to-have

### US-7.8: Cancel Lab Order
**As a** doctor,
**I want to** cancel a lab order if it is no longer needed,
**So that** the lab does not process unnecessary tests.

**Acceptance Criteria:**
- Only orders in `ordered` status can be cancelled (before sample collection)
- A cancellation reason must be provided
- Order status changes to `cancelled`
- Individual test items also marked as `cancelled`

### US-7.9: Generate Lab Report PDF
**As a** lab technician or doctor,
**I want to** generate a printable PDF lab report for a completed order,
**So that** the patient or referring doctor receives an official lab document.

**Acceptance Criteria:**
- PDF includes: hospital header, patient details, order details, test results with reference ranges, abnormal flags, lab tech signature, date
- Downloadable and printable
- Only available for completed orders

---

## 3. Business Requirements

### BR-7.1: Lab Order Code Generation
- Sequential format: `LAB-XXXXXX`
- Codes SHALL be unique and immutable

### BR-7.2: Lab Order Status Flow
```
ordered → sample_collected → processing → completed
   ↓
cancelled
```

- Each test item within an order follows the same flow independently
- The order-level status reflects the aggregate of its items

### BR-7.3: Reference Ranges
- Each lab test SHALL have configurable reference ranges
- Reference ranges may vary by age and gender (stored as text/JSON, parsed for flagging)
- Results outside the reference range SHALL be automatically flagged as abnormal

### BR-7.4: Critical Value Rules
- Certain results SHALL be flagged as critical based on predefined thresholds
- Critical values SHALL trigger an immediate in-system alert to the ordering doctor
- Critical value thresholds SHALL be configurable per test

### BR-7.5: Result Immutability
- Once a lab result is entered and confirmed, it SHALL NOT be modified
- Corrections SHALL be made by adding an amendment with the original result preserved
- All result entries SHALL record the entering technician and timestamp

### BR-7.6: Access Control
| Role | Create Order | View Results | Enter Results | Manage Catalogue | Cancel Order |
|------|-------------|-------------|--------------|-----------------|-------------|
| Doctor | Yes | Own patients | No | No | Yes (own orders) |
| Lab Tech | No | All | Yes | Yes | No |
| Nurse | No | Department patients | No | No | No |
| Admin | No | All | No | Yes | No |
| Director | No | All (reports) | No | No | No |

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| POST | `/api/v1/lab-tests` | Add test to catalogue | lab_tech, admin |
| GET | `/api/v1/lab-tests` | List available tests | all authenticated |
| GET | `/api/v1/lab-tests/:id` | Get test details | all authenticated |
| PUT | `/api/v1/lab-tests/:id` | Update test info | lab_tech, admin |
| POST | `/api/v1/lab-orders` | Create lab order | doctor |
| GET | `/api/v1/lab-orders` | List lab orders (filtered) | all authenticated |
| GET | `/api/v1/lab-orders/:id` | Get order with items and results | all authenticated |
| PATCH | `/api/v1/lab-orders/:id/status` | Update order status | lab_tech |
| PATCH | `/api/v1/lab-orders/:id/cancel` | Cancel lab order | doctor |
| POST | `/api/v1/lab-orders/:id/items/:itemId/result` | Enter result for test item | lab_tech |
| GET | `/api/v1/patients/:patientId/lab-results` | Patient lab result history | doctor, nurse, lab_tech |

### 4.2 Data Models

**LabTest (Catalogue):**
- `id`: UUID
- `name`: String (e.g., "Complete Blood Count")
- `code`: Unique string (e.g., "CBC")
- `category`: String (e.g., "Hematology")
- `sampleType`: String (e.g., "Blood", "Urine")
- `referenceRange`: Text (e.g., "4.5-11.0" or JSON for age/gender variants)
- `unit`: String (e.g., "10^3/uL")
- `price`: Decimal(10,2)
- `turnaroundHrs`: Int (default 24)
- `isActive`: Boolean

**LabOrder:**
- `id`: UUID
- `orderCode`: Auto-generated, unique
- `patientId`: FK → patients
- `orderedById`: FK → users (doctor)
- `status`: LabOrderStatus enum
- `priority`: String (routine, urgent, stat)
- `notes`: Text, optional

**LabOrderItem:**
- `id`: UUID
- `orderId`: FK → lab_orders
- `testId`: FK → lab_tests
- `status`: LabOrderStatus enum (per-item tracking)

**LabResult:**
- `id`: UUID
- `orderItemId`: FK → lab_order_items (one-to-one)
- `value`: Text
- `unit`: String, optional
- `isAbnormal`: Boolean (default false)
- `isCritical`: Boolean (default false)
- `remarks`: Text, optional
- `enteredById`: FK → users (lab tech)
- `enteredAt`: DateTime

### 4.3 Validation Schemas

```typescript
const createLabOrderSchema = z.object({
  patientId: z.string().uuid(),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  notes: z.string().max(2000).optional(),
  testIds: z.array(z.string().uuid()).min(1),
});

const enterResultSchema = z.object({
  value: z.string().min(1),
  unit: z.string().max(50).optional(),
  isAbnormal: z.boolean().default(false),
  isCritical: z.boolean().default(false),
  remarks: z.string().max(1000).optional(),
});

const createLabTestSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  category: z.string().min(1).max(100),
  sampleType: z.string().min(1).max(50),
  referenceRange: z.string().optional(),
  unit: z.string().max(50).optional(),
  price: z.number().positive(),
  turnaroundHrs: z.number().int().positive().default(24),
});
```

---

## 5. Additional Information

### UI Pages
- `/lab` — Lab dashboard (pending orders, critical alerts, workload summary)
- `/lab/tests` — Test catalogue management
- `/lab/tests/new` — Add new test
- `/lab/orders` — Lab order list with filters (status, priority, date)
- `/lab/orders/:id` — Order detail with result entry forms
- `/lab/orders/new` — Create lab order (doctor view)

### Lab Order Workflow Summary
| Step | Actor | System Action |
|------|-------|--------------|
| 1 | Doctor | Creates lab order with selected tests |
| 2 | Receptionist | Collects payment (if applicable) |
| 3 | Lab Tech | Marks sample as collected |
| 4 | Lab Tech | Processes sample, enters results |
| 5 | System | Auto-flags abnormal values; alerts if critical |
| 6 | Doctor | Reviews results in patient record |

### Edge Cases
- **Partial results**: Some tests in an order may complete before others; each item tracks status independently
- **Re-testing**: If a result is suspect, a new order must be created (original result is preserved)
- **Equipment integration**: Future phase — direct import of results from lab analyzers via HL7 v2 interface
- **Sample rejection**: Lab tech should be able to mark a sample as rejected (e.g., hemolyzed, insufficient volume) requiring a new collection

### Cross-Module Dependencies
- **Patient Registration** (Module 2): Lab orders linked to patients
- **Appointments** (Module 3): Lab orders often initiated during OPD consultations
- **Billing** (Module 4): Completed lab orders generate charges
- **Inpatient** (Module 8): Lab orders for admitted patients
