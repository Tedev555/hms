# Module 4: Billing & Payments

**Phase:** 2
**Priority:** High
**Dependencies:** Authentication (Module 1), Patient Registration (Module 2), Appointments (Module 3)

---

## 1. Overview

The Billing & Payments module automates invoice generation for all hospital services — OPD consultations, IPD stays, pharmacy dispensing, laboratory tests, and procedures. It supports multiple payment methods, partial payments, insurance claim processing, tax calculations, and financial reporting.

---

## 2. User Stories

### US-4.1: Generate Invoice from Appointment
**As a** receptionist,
**I want to** generate an invoice for a completed OPD appointment,
**So that** the patient can be billed for the consultation and any associated services.

**Acceptance Criteria:**
- From a completed appointment, a "Generate Invoice" action is available
- The invoice auto-populates with the consultation fee as a line item
- Additional line items (procedures, materials) can be added manually
- Invoice number is auto-generated (e.g., `INV-000001`)
- Invoice is created in `draft` status
- Subtotal, tax, discount, and total are calculated automatically

### US-4.2: Add Line Items to Invoice
**As a** receptionist or admin,
**I want to** add, edit, or remove line items on a draft invoice,
**So that** the bill accurately reflects all services rendered.

**Acceptance Criteria:**
- Each line item has: description, quantity, unit price, and total price
- Total price is auto-calculated as quantity x unit price
- Invoice subtotal updates in real time
- Line items can be added from service catalogue or entered manually
- Items can only be modified while invoice is in `draft` status

### US-4.3: Apply Discount
**As a** admin,
**I want to** apply a discount (flat amount or percentage) to an invoice,
**So that** eligible patients receive reduced billing.

**Acceptance Criteria:**
- Discount can be applied as a flat amount or percentage of subtotal
- Discount reason must be documented
- Only authorized roles (admin, director) can apply discounts
- Total amount recalculates after discount

### US-4.4: Issue Invoice
**As a** receptionist,
**I want to** finalize and issue a draft invoice to the patient,
**So that** the bill becomes an official financial record.

**Acceptance Criteria:**
- Status changes from `draft` to `issued`
- Issue date is recorded
- Due date is set (configurable, default: same day for OPD, discharge day for IPD)
- Once issued, line items cannot be modified (requires credit note for corrections)

### US-4.5: Record Payment
**As a** receptionist,
**I want to** record a payment against an issued invoice,
**So that** the patient's balance is updated.

**Acceptance Criteria:**
- Select payment method: cash, card, bank transfer, insurance, mixed
- Enter payment amount
- For mixed payments, record each method and amount separately
- If payment amount equals total, status becomes `paid`
- If payment amount is less than total, status becomes `partially_paid`
- Payment reference number recorded for non-cash methods
- Payment receipt can be generated

### US-4.6: View Outstanding Balances
**As a** admin,
**I want to** see a list of all unpaid or partially paid invoices,
**So that** I can follow up on outstanding payments.

**Acceptance Criteria:**
- List view with filters: status (issued, partially_paid, overdue), date range, patient
- Shows: invoice number, patient name, total amount, paid amount, balance, due date
- Overdue invoices (past due date and not fully paid) are highlighted
- Exportable to CSV

### US-4.7: Generate Invoice for IPD Stay
**As a** admin,
**I want** the system to compile all charges for an inpatient stay into a single invoice at discharge,
**So that** the patient receives one comprehensive bill.

**Acceptance Criteria:**
- At discharge, all charges (room, procedures, medications, lab tests, doctor visits) are compiled
- Each charge category is a separate line item
- Daily room charges are calculated based on admission/discharge dates and room rate
- Invoice links to the admission record

### US-4.8: Process Insurance Claim
**As a** admin,
**I want to** mark an invoice as insurance-covered and track the claim status,
**So that** the hospital can bill the insurance provider.

**Acceptance Criteria:**
- Insurance payment method selected during billing
- Co-payment amount calculated if applicable
- Patient pays co-payment; remainder marked as insurance claim
- Claim status tracked: submitted, approved, rejected, settled

### US-4.9: Issue Credit Note / Refund
**As a** admin,
**I want to** issue a credit note against an invoice for billing corrections or refunds,
**So that** financial records are accurate and patients can receive refunds.

**Acceptance Criteria:**
- Credit note references the original invoice
- Specifies the amount and reason for the credit
- Adjusts the effective balance on the original invoice
- Full or partial refund can be processed against a payment

### US-4.10: Print / Download Invoice
**As a** receptionist,
**I want to** print or download a PDF invoice/receipt,
**So that** the patient receives a physical or digital copy of their bill.

**Acceptance Criteria:**
- Invoice PDF includes: hospital header, invoice number, patient details, itemized charges, totals, payment status
- Receipt PDF shows payment details
- Both are downloadable and printable

---

## 3. Business Requirements

### BR-4.1: Invoice Number Generation
- Sequential format: `INV-XXXXXX`
- Numbers SHALL be unique and immutable
- Sequence SHALL never be reused

### BR-4.2: Invoice Status Flow
```
draft → issued → partially_paid → paid
                      ↓
                   overdue
draft → cancelled
issued → cancelled (with credit note)
```

### BR-4.3: Tax Calculation
- Tax (GST/VAT) SHALL be configurable per jurisdiction
- Tax rate SHALL be applied to the subtotal after discount
- Tax amount SHALL be displayed separately on the invoice
- Default tax rate: configurable system setting

### BR-4.4: Payment Methods
| Method | Key | Details |
|--------|-----|---------|
| Cash | `cash` | No reference required |
| Card | `card` | Transaction reference required |
| Bank Transfer | `bank_transfer` | Transfer reference required |
| Insurance | `insurance` | Claim ID and provider required |
| Mixed | `mixed` | Multiple payment records per invoice |

### BR-4.5: Financial Precision
- All monetary values SHALL use `DECIMAL(12,2)` (2 decimal places)
- Calculations SHALL be performed on the server to avoid floating-point errors
- Rounding: standard half-up rounding to 2 decimal places

### BR-4.6: Access Control
| Role | Create Invoice | Record Payment | Apply Discount | View Reports | Cancel |
|------|---------------|---------------|----------------|-------------|--------|
| Receptionist | Yes | Yes | No | Own transactions | No |
| Admin | Yes | Yes | Yes | All | Yes |
| Director | No | No | Yes | All | No |
| Doctor | No | No | No | Own patient invoices | No |

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| POST | `/api/v1/invoices` | Create new invoice | receptionist, admin |
| GET | `/api/v1/invoices` | List invoices (filtered, paginated) | receptionist, admin, director |
| GET | `/api/v1/invoices/:id` | Get invoice details with items | all authenticated |
| PUT | `/api/v1/invoices/:id` | Update draft invoice | receptionist, admin |
| PATCH | `/api/v1/invoices/:id/status` | Change invoice status | receptionist, admin |
| POST | `/api/v1/invoices/:id/items` | Add line item to draft invoice | receptionist, admin |
| PUT | `/api/v1/invoices/:id/items/:itemId` | Update line item | receptionist, admin |
| DELETE | `/api/v1/invoices/:id/items/:itemId` | Remove line item | receptionist, admin |
| POST | `/api/v1/invoices/:id/payments` | Record payment | receptionist, admin |
| GET | `/api/v1/invoices/:id/payments` | List payments for invoice | receptionist, admin, director |
| GET | `/api/v1/patients/:patientId/invoices` | List invoices for patient | all authenticated |

### 4.2 Data Models

**Invoice:**
- `id`: UUID
- `invoiceNumber`: Auto-generated, unique (e.g., `INV-000001`)
- `patientId`: FK → patients
- `appointmentId`: FK → appointments (optional, for OPD)
- `admissionId`: FK → admissions (optional, for IPD)
- `issueDate`, `dueDate`: Date
- `subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `paidAmount`: Decimal(12,2)
- `status`: InvoiceStatus enum
- `paymentMethod`: PaymentMethod enum (optional)
- `notes`: Text, optional

**InvoiceItem:**
- `id`: UUID
- `invoiceId`: FK → invoices (cascade delete)
- `description`: String
- `quantity`: Int (default 1)
- `unitPrice`: Decimal(10,2)
- `totalPrice`: Decimal(12,2) — computed as quantity * unitPrice

**Payment:**
- `id`: UUID
- `invoiceId`: FK → invoices
- `amount`: Decimal(12,2)
- `paymentMethod`: PaymentMethod enum
- `reference`: String, optional
- `paidAt`: DateTime

### 4.3 Validation Schemas

```typescript
const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  admissionId: z.string().uuid().optional(),
  dueDate: z.string().date(),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(300),
    quantity: z.number().int().min(1),
    unitPrice: z.number().positive(),
  })).min(1),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "insurance", "mixed"]),
  reference: z.string().max(100).optional(),
});
```

---

## 5. Additional Information

### UI Pages
- `/billing` — Invoice list with filters (status, date, patient)
- `/billing/new` — Create invoice form (select patient, add items)
- `/billing/:id` — Invoice detail with items, payments, and actions
- `/billing/:id/payment` — Record payment form
- `/billing/outstanding` — Outstanding balance report

### Edge Cases
- **Overpayment**: System should not allow recording a payment that exceeds the outstanding balance
- **Zero-amount invoices**: Allowed for free consultations (e.g., follow-up included in original fee)
- **Currency**: Single currency per deployment (no multi-currency support initially)
- **Invoice modification after issue**: Only via credit note; direct edits are not allowed

### Cross-Module Dependencies
- **Appointments** (Module 3): Completed appointments trigger invoice creation
- **Pharmacy** (Module 6): Dispensed prescriptions generate pharmacy charges
- **Laboratory** (Module 7): Completed lab orders generate lab charges
- **Inpatient** (Module 8): Discharge triggers comprehensive IPD invoice
