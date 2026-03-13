# HMS Implementation Roadmap — Modules 1–4

**Version:** 1.0 | **Date:** March 2026 | **Status:** Approved

---

## Table of Contents

1. [Scope & Decisions](#1-scope--decisions)
2. [Existing Infrastructure](#2-existing-infrastructure)
3. [Phase 1: Auth & Frontend RBAC Fixes](#3-phase-1-auth--frontend-rbac-fixes)
4. [Phase 2: Patient UI Pages](#4-phase-2-patient-ui-pages)
5. [Phase 3: Appointment UI Pages](#5-phase-3-appointment-ui-pages)
6. [Phase 4: Billing Validation & Calculation Service](#6-phase-4-billing-validation--calculation-service)
7. [Phase 5: Billing API Routes](#7-phase-5-billing-api-routes)
8. [Phase 6: Billing UI Pages](#8-phase-6-billing-ui-pages)
9. [Phase 7: Testing](#9-phase-7-testing)
10. [File Summary](#10-file-summary)
11. [Execution Order](#11-execution-order)
12. [Milestones](#12-milestones)
13. [Deferred Items](#13-deferred-items)

---

## 1. Scope & Decisions

This roadmap covers the implementation work required to bring Modules 1–4 to a functional state. The following decisions have been made:

| Decision               | Choice                             | Rationale                                 |
| ---------------------- | ---------------------------------- | ----------------------------------------- |
| Billing scope          | OPD invoices only (v1)             | Ship faster; defer IPD/insurance/refunds  |
| Invoice creation       | Manual from completed appointment  | Safer; avoids accidental invoice creation |
| Tax handling           | Fixed default tax rate via env var | Simple; per-item tax deferred             |
| Build approach         | APIs first, then UI                | Testable backend before frontend          |
| Data fetching (client) | Raw `fetch` + `useEffect`          | No `@tanstack/react-query` installed      |
| Form pattern           | `react-hook-form` + `zodResolver`  | Installed but unused; adopt going forward |
| Data table pattern     | Existing `DataTable` component     | TanStack Table wrapper already built      |

---

## 2. Existing Infrastructure

The following components are installed and ready for use but have **no page-level consumers yet**:

| Component                                 | Location                           | Status                      |
| ----------------------------------------- | ---------------------------------- | --------------------------- |
| `DataTable` (TanStack)                    | `src/components/ui/data-table.tsx` | Installed, unused           |
| `Form` (react-hook-form)                  | `src/components/ui/form.tsx`       | Installed, unused           |
| `Dialog` / `AlertDialog`                  | `src/components/ui/dialog.tsx`     | Installed, unused           |
| `Tabs`                                    | `src/components/ui/tabs.tsx`       | Installed, unused           |
| `Select`                                  | `src/components/ui/select.tsx`     | Installed, unused           |
| `Badge`                                   | `src/components/ui/badge.tsx`      | Installed, unused           |
| `Skeleton`                                | `src/components/ui/skeleton.tsx`   | Installed, unused           |
| `Toaster` (sonner)                        | `src/components/ui/sonner.tsx`     | Mounted in dashboard layout |
| `date-fns`                                | `package.json`                     | Installed                   |
| `react-day-picker`                        | `package.json`                     | Installed                   |
| `react-hook-form` + `@hookform/resolvers` | `package.json`                     | Installed                   |
| `@tanstack/react-table`                   | `package.json`                     | Installed                   |

Shared types are defined in `src/types/index.ts` (`AuthUser`, `LoginResponse`, `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`).

---

## 3. Phase 1: Auth & Frontend RBAC Fixes

**Goal:** Close security and UX gaps that block safe rollout of any UI pages.

### 3.1 Client-side Auth Context

**New file:** `src/contexts/auth-context.tsx`

- Create `AuthProvider` component wrapping `React.createContext`
- Store current user state (`AuthUser | null`) from login response
- Expose `useAuth()` hook for any component to access `user`, `role`, `isAuthenticated`
- On mount (dashboard layout), attempt session restoration via `POST /api/v1/auth/refresh`
- On 401 from refresh, redirect to `/login`
- Provide `login(data)` and `logout()` helper methods

**Modify:** `src/app/(dashboard)/layout.tsx`

- Wrap children with `<AuthProvider>`

### 3.2 Role-Aware Sidebar Navigation

**Modify:** `src/components/layout/sidebar-nav.tsx`

- Convert to client component (`"use client"`)
- Import and use `useAuth()` to get current user role
- Define role-to-routes visibility mapping:

```
receptionist: Dashboard, Patients, Appointments, Billing
admin:        Dashboard, Patients, Appointments, Billing, Staff, Reports
doctor:       Dashboard, Patients, Appointments, Laboratory
nurse:        Dashboard, Patients, Appointments, Ward Management
director:     Dashboard, Patients, Appointments, Billing, Staff, Reports
lab_tech:     Dashboard, Laboratory
pharmacist:   Dashboard, Pharmacy
paramedic:    Dashboard, Patients, Appointments, Ward Management
```

- Filter `navItems` based on mapping before rendering

### 3.3 Role-Based Post-Login Redirect

**Modify:** `src/app/(auth)/login/page.tsx`

- After successful login, read `user.role` from response
- Redirect to role-appropriate landing:

| Role         | Landing Page    |
| ------------ | --------------- |
| receptionist | `/patients`     |
| admin        | `/`             |
| doctor       | `/appointments` |
| nurse        | `/appointments` |
| director     | `/`             |
| lab_tech     | `/laboratory`   |
| pharmacist   | `/pharmacy`     |
| paramedic    | `/appointments` |

### 3.4 Admin Unlock Endpoint

**New file:** `src/app/api/v1/users/[id]/unlock/route.ts`

- `PATCH` — restricted to `admin`, `director`
- Resets `failedLoginAttempts` to `0` and `lockedUntil` to `null`
- Creates audit log entry
- Returns updated user summary

### 3.5 Files Changed

| Action | File                                        |
| ------ | ------------------------------------------- |
| New    | `src/contexts/auth-context.tsx`             |
| New    | `src/app/api/v1/users/[id]/unlock/route.ts` |
| Modify | `src/components/layout/sidebar-nav.tsx`     |
| Modify | `src/app/(auth)/login/page.tsx`             |
| Modify | `src/app/(dashboard)/layout.tsx`            |

---

## 4. Phase 2: Patient UI Pages

**Goal:** Build the patient-facing UI so receptionists and clinical staff can manage patient records.

### 4.1 Patient List Page

**New file:** `src/app/(dashboard)/patients/page.tsx`

- Client component (`"use client"`)
- Use existing `DataTable` component from `src/components/ui/data-table.tsx`
- Define columns: patient code, full name, gender, phone, DOB, actions (View)
- Fetch from `GET /api/v1/patients` with pagination
- Add search input that calls `GET /api/v1/patients/search?q=...`
- "Register Patient" button linking to `/patients/new`
- Click row navigates to `/patients/[id]`

### 4.2 Patient Registration Form

**New file:** `src/app/(dashboard)/patients/new/page.tsx`

- Client component using `react-hook-form` + `zodResolver` with `createPatientSchema`
- Use shadcn `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- Fields: firstName, lastName, dateOfBirth (date picker), gender (select), phone, email, nationalId, address, bloodGroup, allergies (tag-style input)
- Submit to `POST /api/v1/patients`
- On success: redirect to `/patients/[id]`, show success toast via `sonner`
- On validation error: display field-level errors

### 4.3 Patient Detail Page

**New file:** `src/app/(dashboard)/patients/[id]/page.tsx`

- Client component with `Tabs` component (Demographics, Medical History, Documents, Emergency Contacts)
- Fetch from `GET /api/v1/patients/:id`
- **Demographics tab:** display all patient fields, allergies as `Badge` components prominently
- **Medical History tab:** fetch from `GET /api/v1/patients/:id/history`, list chronologically
- **Documents tab:** fetch from `GET /api/v1/patients/:id/documents`, list with metadata
- **Emergency Contacts tab:** list contacts, add/edit/delete via dialog
- "Edit Patient" button linking to `/patients/[id]/edit`
- Show patient code and creation date as read-only header info

### 4.4 Patient Edit Page

**New file:** `src/app/(dashboard)/patients/[id]/edit/page.tsx`

- Same form layout as registration, pre-filled with existing data
- Use `updatePatientSchema` for validation
- Submit to `PUT /api/v1/patients/:id`
- Patient code and creation date displayed as read-only (not in form inputs)
- On success: redirect to `/patients/[id]`, show toast

### 4.5 Fix Patient Create RBAC

**Modify:** `src/app/api/v1/patients/route.ts`

- Line 96: change `["receptionist", "admin", "director"]` to `["receptionist", "admin"]`
- Aligns with BR-2.7 access control matrix

### 4.6 Files Changed

| Action | File                                              |
| ------ | ------------------------------------------------- |
| New    | `src/app/(dashboard)/patients/page.tsx`           |
| New    | `src/app/(dashboard)/patients/new/page.tsx`       |
| New    | `src/app/(dashboard)/patients/[id]/page.tsx`      |
| New    | `src/app/(dashboard)/patients/[id]/edit/page.tsx` |
| Modify | `src/app/api/v1/patients/route.ts` (RBAC fix)     |

---

## 5. Phase 3: Appointment UI Pages

**Goal:** Build appointment management UI and add missing audit logging.

### 5.1 Appointment List Page

**New file:** `src/app/(dashboard)/appointments/page.tsx`

- Client component with `DataTable`
- Columns: appointment code, patient name, doctor name, date/time, type, status, actions
- Filters: date picker, doctor select, status select, department select
- Fetch from `GET /api/v1/appointments` with query params
- "Book Appointment" button linking to `/appointments/new`
- Click row navigates to `/appointments/[id]`

### 5.2 Appointment Booking Page

**New file:** `src/app/(dashboard)/appointments/new/page.tsx`

- Client component with multi-step form using `react-hook-form`:
  1. **Patient selection:** search input calling patient search API, select from results
  2. **Doctor selection:** select department, then select doctor from that department
  3. **Slot selection:** select date, fetch available slots via `GET /api/v1/appointments/slots`, pick slot
  4. **Details:** select appointment type, enter chief complaint, notes
- Submit to `POST /api/v1/appointments`
- On success: redirect to `/appointments/[id]`, show toast

### 5.3 Appointment Detail Page

**New file:** `src/app/(dashboard)/appointments/[id]/page.tsx`

- Fetch from `GET /api/v1/appointments/:id`
- Display: appointment info, patient summary (with allergies via `Badge`), doctor info, status
- Action buttons rendered conditionally based on current status + user role:
  - `scheduled` -> Confirm, Cancel, Mark No-Show
  - `confirmed` -> Check In, Cancel, Mark No-Show
  - `checked_in` -> Start Consultation, Cancel
  - `in_progress` -> Complete
  - `completed` -> "Generate Invoice" button (links to `/billing/new?appointmentId=...`)
- Status changes call `PATCH /api/v1/appointments/:id/status`
- Cancel action shows dialog requiring cancel reason
- Show appointment notes and allow adding notes

### 5.4 Queue Dashboard Page

**New file:** `src/app/(dashboard)/appointments/queue/page.tsx`

- Fetch from `GET /api/v1/appointments/queue`
- Display grouped by doctor using `Card` components
- Each doctor card shows:
  - Current patient (in_progress) highlighted
  - Waiting list with estimated wait times
  - Emergency appointments with `Badge variant="destructive"`
- Auto-refresh via `setInterval` polling (30-second interval)
- Filter by department dropdown

### 5.5 Add Appointment Audit Logging

**Modify:** `src/app/api/v1/appointments/route.ts` (POST handler)

- Add `createAuditLog` call after appointment creation

**Modify:** `src/app/api/v1/appointments/[id]/route.ts` (PUT handler)

- Add `createAuditLog` call with old and new data

**Modify:** `src/app/api/v1/appointments/[id]/status/route.ts` (PATCH handler)

- Add `createAuditLog` call recording status transition

### 5.6 Files Changed

| Action | File                                                           |
| ------ | -------------------------------------------------------------- |
| New    | `src/app/(dashboard)/appointments/page.tsx`                    |
| New    | `src/app/(dashboard)/appointments/new/page.tsx`                |
| New    | `src/app/(dashboard)/appointments/[id]/page.tsx`               |
| New    | `src/app/(dashboard)/appointments/queue/page.tsx`              |
| Modify | `src/app/api/v1/appointments/route.ts` (audit log)             |
| Modify | `src/app/api/v1/appointments/[id]/route.ts` (audit log)        |
| Modify | `src/app/api/v1/appointments/[id]/status/route.ts` (audit log) |

---

## 6. Phase 4: Billing Validation & Calculation Service

**Goal:** Build the core billing logic before any API routes.

### 6.1 Billing Validation Schemas

**Modify:** `src/lib/validations.ts` (append)

Add the following schemas:

```typescript
// Create invoice
const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  dueDate: z.string().date(),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(300),
        quantity: z.number().int().min(1),
        unitPrice: z.number().positive(),
      }),
    )
    .min(1),
});

// Update draft invoice
const updateInvoiceSchema = z.object({
  dueDate: z.string().date().optional(),
  notes: z.string().max(1000).optional(),
  discountAmount: z.number().min(0).optional(),
});

// Add invoice item
const createInvoiceItemSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
});

// Update invoice item
const updateInvoiceItemSchema = z.object({
  description: z.string().min(1).max(300).optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().positive().optional(),
});

// Record payment
const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "insurance", "mixed"]),
  reference: z.string().max(100).optional(),
});

// Update invoice status
const updateInvoiceStatusSchema = z.object({
  status: z.enum(["issued", "cancelled"]),
});
```

### 6.2 Billing Calculation Service

**New file:** `src/lib/billing.ts`

Functions to implement:

| Function                                                                  | Purpose                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `calculateItemTotal(quantity, unitPrice)`                                 | Returns `quantity * unitPrice`, rounded to 2 decimal places   |
| `calculateSubtotal(items)`                                                | Sums all item totals                                          |
| `calculateTaxAmount(subtotal, discountAmount)`                            | Applies `DEFAULT_TAX_RATE` to `(subtotal - discountAmount)`   |
| `calculateInvoiceTotals(items, discountAmount)`                           | Returns `{ subtotal, taxAmount, totalAmount }`                |
| `calculateBalance(totalAmount, paidAmount)`                               | Returns `totalAmount - paidAmount`                            |
| `canRecordPayment(totalAmount, paidAmount, newPaymentAmount)`             | Returns `boolean` — prevents overpayment                      |
| `determineInvoiceStatus(totalAmount, paidAmount, currentStatus, dueDate)` | Returns computed status (`paid`, `partially_paid`, `overdue`) |
| `generateInvoiceNumber(sequence)`                                         | Returns `INV-XXXXXX` using `generateCode`                     |

Configuration:

- Tax rate read from `process.env.DEFAULT_TAX_RATE` (defaults to `"0"`)
- All monetary calculations use standard rounding to 2 decimal places
- `Number` type with `Math.round(value * 100) / 100` for precision

### 6.3 Billing Calculation Tests

**New file:** `src/__tests__/lib/billing.test.ts`

Test coverage:

- `calculateItemTotal` — basic multiplication, rounding
- `calculateSubtotal` — sum of multiple items
- `calculateTaxAmount` — with and without discount, with zero tax rate
- `calculateInvoiceTotals` — end-to-end total calculation
- `calculateBalance` — positive balance, zero balance
- `canRecordPayment` — within limit, exact match, overpayment rejected
- `determineInvoiceStatus` — paid, partially_paid, overdue scenarios
- `generateInvoiceNumber` — correct format

### 6.4 Files Changed

| Action | File                                              |
| ------ | ------------------------------------------------- |
| New    | `src/lib/billing.ts`                              |
| New    | `src/__tests__/lib/billing.test.ts`               |
| Modify | `src/lib/validations.ts` (append billing schemas) |

---

## 7. Phase 5: Billing API Routes

**Goal:** Implement all OPD billing endpoints.

### 7.1 Invoice CRUD

**New file:** `src/app/api/v1/invoices/route.ts`

- `POST /api/v1/invoices` — create invoice (receptionist, admin)
  - Validate with `createInvoiceSchema`
  - Verify patient exists
  - If `appointmentId` provided: verify appointment exists, is `completed`, and has no existing invoice
  - Generate invoice number (sequential)
  - Calculate totals server-side via `calculateInvoiceTotals`
  - Create invoice + items in a Prisma transaction
  - Create audit log
  - Return invoice with items
- `GET /api/v1/invoices` — list invoices (receptionist, admin, director)
  - Filters: `status`, `patientId`, `dateFrom`, `dateTo`
  - Pagination via `parsePagination`
  - Include patient name, appointment code

### 7.2 Invoice Detail & Update

**New file:** `src/app/api/v1/invoices/[id]/route.ts`

- `GET /api/v1/invoices/:id` — invoice detail (all authenticated)
  - Include: items, payments, patient, appointment
- `PUT /api/v1/invoices/:id` — update draft invoice (receptionist, admin)
  - Only allowed when status is `draft`
  - Can update: `dueDate`, `notes`, `discountAmount`
  - Recalculate totals if discount changed
  - Create audit log

### 7.3 Invoice Status Changes

**New file:** `src/app/api/v1/invoices/[id]/status/route.ts`

- `PATCH /api/v1/invoices/:id/status` — change status (receptionist, admin)
  - `draft -> issued`: validate invoice has items, set `issueDate` to today
  - `draft -> cancelled`: allowed
  - `issued -> cancelled`: admin only
  - Create audit log

### 7.4 Invoice Item Management

**New file:** `src/app/api/v1/invoices/[id]/items/route.ts`

- `POST /api/v1/invoices/:id/items` — add item (receptionist, admin)
  - Only allowed when status is `draft`
  - Calculate item total
  - Recalculate invoice totals
  - Create audit log

**New file:** `src/app/api/v1/invoices/[id]/items/[itemId]/route.ts`

- `PUT /api/v1/invoices/:id/items/:itemId` — update item (receptionist, admin)
  - Only allowed when status is `draft`
  - Recalculate item total and invoice totals
- `DELETE /api/v1/invoices/:id/items/:itemId` — remove item (receptionist, admin)
  - Only allowed when status is `draft`
  - Recalculate invoice totals
  - Prevent removing last item (invoice must have at least one)

### 7.5 Payment Recording

**New file:** `src/app/api/v1/invoices/[id]/payments/route.ts`

- `POST /api/v1/invoices/:id/payments` — record payment (receptionist, admin)
  - Only allowed when status is `issued` or `partially_paid`
  - Validate: `canRecordPayment` — prevent overpayment
  - Create payment record
  - Update invoice `paidAmount`
  - Update invoice status via `determineInvoiceStatus`
  - Create audit log
- `GET /api/v1/invoices/:id/payments` — list payments (receptionist, admin, director)
  - Return all payments for the invoice, ordered by `paidAt`

### 7.6 Patient Invoices

**New file:** `src/app/api/v1/patients/[id]/invoices/route.ts`

- `GET /api/v1/patients/:patientId/invoices` — list invoices for patient (all authenticated)
  - Pagination
  - Include: invoice number, status, total, paid, balance, date

### 7.7 Files Changed

| Action | File                                                   |
| ------ | ------------------------------------------------------ |
| New    | `src/app/api/v1/invoices/route.ts`                     |
| New    | `src/app/api/v1/invoices/[id]/route.ts`                |
| New    | `src/app/api/v1/invoices/[id]/status/route.ts`         |
| New    | `src/app/api/v1/invoices/[id]/items/route.ts`          |
| New    | `src/app/api/v1/invoices/[id]/items/[itemId]/route.ts` |
| New    | `src/app/api/v1/invoices/[id]/payments/route.ts`       |
| New    | `src/app/api/v1/patients/[id]/invoices/route.ts`       |

---

## 8. Phase 6: Billing UI Pages

**Goal:** Build the billing pages for the OPD cashier workflow.

### 8.1 Invoice List Page

**New file:** `src/app/(dashboard)/billing/page.tsx`

- Client component with `DataTable`
- Columns: invoice number, patient name, issue date, total amount, paid amount, balance, status, actions
- Filters: status dropdown, date range (date picker), patient search
- "Create Invoice" button linking to `/billing/new`
- Status rendered with color-coded `Badge` components
- Click row navigates to `/billing/[id]`

### 8.2 Create Invoice Page

**New file:** `src/app/(dashboard)/billing/new/page.tsx`

- Client component with `react-hook-form`
- If `?appointmentId=` query param present:
  - Auto-fetch appointment + patient details via `GET /api/v1/appointments/:id`
  - Pre-fill patient info (read-only)
  - Add consultation fee as default line item
- Otherwise:
  - Patient search/select (reuse patient search API)
- Dynamic line items section:
  - Add row button
  - Each row: description input, quantity input, unit price input, computed total (read-only)
  - Remove row button (minimum 1 item)
- Due date picker (default: today)
- Notes textarea
- Live client-side calculation of subtotal, tax, total (matches server logic)
- Submit creates draft invoice via `POST /api/v1/invoices`
- On success: redirect to `/billing/[id]`, show toast

### 8.3 Invoice Detail Page

**New file:** `src/app/(dashboard)/billing/[id]/page.tsx`

- Fetch from `GET /api/v1/invoices/:id`
- **Header section:** invoice number, status badge, patient info, appointment link (if any)
- **Line items table:** description, quantity, unit price, total — with edit/delete when `draft`
- **Totals section:** subtotal, discount, tax, total, paid, balance
- **Payment history:** list of payments with method, amount, reference, date
- **Actions by status:**
  - `draft`: Edit Items (inline or dialog), Apply Discount, Issue Invoice, Cancel
  - `issued`: Record Payment button (links to `/billing/[id]/payment`), Cancel (admin only)
  - `partially_paid`: Record Payment button
  - `paid`: View only
  - `cancelled`: View only
- Issue and cancel actions use `AlertDialog` for confirmation
- Status changes call `PATCH /api/v1/invoices/:id/status`

### 8.4 Record Payment Page

**New file:** `src/app/(dashboard)/billing/[id]/payment/page.tsx`

- Fetch invoice summary from `GET /api/v1/invoices/:id`
- Display: invoice number, patient name, total, paid, outstanding balance
- Form fields:
  - Amount (number input, max = outstanding balance)
  - Payment method (select: cash, card, bank_transfer, insurance)
  - Reference (text input, shown when method is not cash)
- Submit to `POST /api/v1/invoices/:id/payments`
- On success: redirect to `/billing/[id]`, show success toast

### 8.5 Files Changed

| Action | File                                                |
| ------ | --------------------------------------------------- |
| New    | `src/app/(dashboard)/billing/page.tsx`              |
| New    | `src/app/(dashboard)/billing/new/page.tsx`          |
| New    | `src/app/(dashboard)/billing/[id]/page.tsx`         |
| New    | `src/app/(dashboard)/billing/[id]/payment/page.tsx` |

---

## 9. Phase 7: Testing

### 9.1 Unit Tests

**Modify:** `src/__tests__/lib/validations.test.ts`

- Add test cases for all billing schemas:
  - `createInvoiceSchema` — valid data, missing items, invalid patientId
  - `recordPaymentSchema` — valid, invalid method, negative amount
  - `updateInvoiceStatusSchema` — valid statuses, invalid statuses

**Already covered in Phase 4:** `src/__tests__/lib/billing.test.ts`

### 9.2 E2E Tests

**New file:** `e2e/billing.spec.ts`

Test the full OPD cashier workflow:

1. Login as admin/receptionist
2. Navigate to a completed appointment
3. Click "Generate Invoice"
4. Add line items on invoice creation page
5. Submit to create draft invoice
6. Issue the invoice
7. Record a payment
8. Verify status updates to `paid` or `partially_paid`

**New file:** `e2e/patients.spec.ts`

Test patient management:

1. Navigate to patient list
2. Register a new patient
3. View patient detail page
4. Edit patient information
5. Search for patient

**New file:** `e2e/appointments.spec.ts`

Test appointment workflow:

1. Book an appointment
2. View appointment detail
3. Check in patient
4. Complete appointment
5. View queue dashboard

### 9.3 Files Changed

| Action | File                                    |
| ------ | --------------------------------------- |
| Modify | `src/__tests__/lib/validations.test.ts` |
| New    | `e2e/billing.spec.ts`                   |
| New    | `e2e/patients.spec.ts`                  |
| New    | `e2e/appointments.spec.ts`              |

---

## 10. File Summary

| Phase                   | New Files | Modified Files | Total  |
| ----------------------- | --------- | -------------- | ------ |
| Phase 1: Auth fixes     | 2         | 3              | 5      |
| Phase 2: Patient UI     | 4         | 1              | 5      |
| Phase 3: Appointment UI | 4         | 3              | 7      |
| Phase 4: Billing logic  | 2         | 1              | 3      |
| Phase 5: Billing APIs   | 7         | 0              | 7      |
| Phase 6: Billing UI     | 4         | 0              | 4      |
| Phase 7: Testing        | 3         | 1              | 4      |
| **Total**               | **26**    | **9**          | **35** |

### New Files Inventory

```
# Phase 1
src/contexts/auth-context.tsx
src/app/api/v1/users/[id]/unlock/route.ts

# Phase 2
src/app/(dashboard)/patients/page.tsx
src/app/(dashboard)/patients/new/page.tsx
src/app/(dashboard)/patients/[id]/page.tsx
src/app/(dashboard)/patients/[id]/edit/page.tsx

# Phase 3
src/app/(dashboard)/appointments/page.tsx
src/app/(dashboard)/appointments/new/page.tsx
src/app/(dashboard)/appointments/[id]/page.tsx
src/app/(dashboard)/appointments/queue/page.tsx

# Phase 4
src/lib/billing.ts
src/__tests__/lib/billing.test.ts

# Phase 5
src/app/api/v1/invoices/route.ts
src/app/api/v1/invoices/[id]/route.ts
src/app/api/v1/invoices/[id]/status/route.ts
src/app/api/v1/invoices/[id]/items/route.ts
src/app/api/v1/invoices/[id]/items/[itemId]/route.ts
src/app/api/v1/invoices/[id]/payments/route.ts
src/app/api/v1/patients/[id]/invoices/route.ts

# Phase 6
src/app/(dashboard)/billing/page.tsx
src/app/(dashboard)/billing/new/page.tsx
src/app/(dashboard)/billing/[id]/page.tsx
src/app/(dashboard)/billing/[id]/payment/page.tsx

# Phase 7
e2e/billing.spec.ts
e2e/patients.spec.ts
e2e/appointments.spec.ts
```

### Modified Files Inventory

```
# Phase 1
src/components/layout/sidebar-nav.tsx        # Role-aware filtering
src/app/(auth)/login/page.tsx                # Role-based redirect
src/app/(dashboard)/layout.tsx               # AuthProvider wrapper

# Phase 2
src/app/api/v1/patients/route.ts             # RBAC fix (remove director)

# Phase 3
src/app/api/v1/appointments/route.ts         # Add audit logging
src/app/api/v1/appointments/[id]/route.ts    # Add audit logging
src/app/api/v1/appointments/[id]/status/route.ts  # Add audit logging

# Phase 4
src/lib/validations.ts                       # Billing schemas

# Phase 7
src/__tests__/lib/validations.test.ts        # Billing schema tests
```

---

## 11. Execution Order

```
Phase 1  ->  Phase 2  ->  Phase 3  ->  Phase 4  ->  Phase 5  ->  Phase 6  ->  Phase 7
Auth/RBAC    Patient UI   Appt UI     Billing      Billing      Billing      Tests
                                       Logic        APIs         UI
```

### Dependencies

- Phase 2 depends on Phase 1 (auth context needed for role-aware pages)
- Phase 3 depends on Phase 1 (same reason)
- Phase 4 has no dependency on Phases 2–3 (pure logic)
- Phase 5 depends on Phase 4 (uses calculation service and schemas)
- Phase 6 depends on Phase 5 (consumes billing APIs)
- Phase 7 can run incrementally after each phase

### Parallelization Opportunities

- Phase 4 (billing logic) can start in parallel with Phase 2 or 3
- Phase 7 E2E tests for patients/appointments can be written after Phase 2/3

---

## 12. Milestones

### Milestone A: Secure Usable Foundation

**Phases:** 1 + 2

**Deliverable:** Role-aware auth, patient list/register/detail/edit pages

**Acceptance criteria:**

- Users see only their role-appropriate navigation
- Receptionists can register and search patients
- Patient records are viewable with demographics, history, contacts
- Patient create RBAC matches spec

### Milestone B: Operational Outpatient Flow

**Phases:** 3

**Deliverable:** Full appointment booking and management UI

**Acceptance criteria:**

- Receptionists can book appointments with slot selection
- Doctors can view and progress their appointments
- Queue dashboard shows waiting patients per doctor
- Appointment status transitions work end-to-end
- All appointment changes are audit logged

### Milestone C: Cash Collection Ready

**Phases:** 4 + 5 + 6

**Deliverable:** OPD billing with manual invoice creation and payment recording

**Acceptance criteria:**

- From a completed appointment, receptionist can create a draft invoice
- Line items can be added/edited/removed on draft
- Invoice can be issued (finalized)
- Payments can be recorded against issued invoices
- Invoice status reflects payment state (paid, partially_paid)
- Overpayment is prevented
- Tax calculated at fixed default rate
- Billing list page shows all invoices with filters

### Milestone D: Test Coverage

**Phase:** 7

**Deliverable:** Unit and E2E test suites for billing, patients, appointments

**Acceptance criteria:**

- Billing calculation logic has full unit test coverage
- Billing validation schemas tested
- E2E tests cover the full OPD cashier workflow
- E2E tests cover patient registration and appointment booking flows

---

## 13. Deferred Items

The following items are explicitly out of scope for this roadmap and will be addressed in future iterations:

| Item                                        | Reason                                                   | Future Phase   |
| ------------------------------------------- | -------------------------------------------------------- | -------------- |
| IPD billing (US-4.7)                        | Requires Module 8 (Ward Management)                      | After Module 8 |
| Insurance claims (US-4.8)                   | Complex workflow; not needed for v1 cash flow            | Phase 2+       |
| Credit notes / refunds (US-4.9)             | Requires billing v1 to be stable first                   | Phase 2+       |
| PDF invoice / receipt (US-4.10)             | Nice-to-have; manual receipt sufficient initially        | Phase 2+       |
| Outstanding balances report (US-4.6)        | List view covers basic needs; export deferred            | Phase 2+       |
| Mixed payment method                        | Adds complexity; single method per payment record for v1 | Phase 2+       |
| MinIO file upload pipeline                  | Requires infrastructure setup; metadata-only for now     | Phase 2+       |
| Patient photo upload                        | Depends on file upload pipeline                          | Phase 2+       |
| Patient soft-delete / archive               | Policy decision needed; no immediate operational need    | Phase 2+       |
| Doctor availability calendar                | Enhancement to scheduling; not blocking core flow        | Phase 2+       |
| Real-time queue updates (WebSocket/SSE)     | Polling is sufficient for v1                             | Phase 2+       |
| Login rate limiting                         | Account lockout covers the critical case                 | Phase 2+       |
| Refresh token server-side invalidation      | Current JWT rotation is acceptable for v1                | Phase 2+       |
| Automatic invoice on appointment completion | Manual creation chosen for safety                        | Future review  |
