# HMS — What to Implement Next

**Date:** March 13, 2026 | **Reference:** `docs/roadmap-progress.md`

---

## Current State at a Glance

| Layer          | Status   | Details                                    |
| -------------- | -------- | ------------------------------------------ |
| Database       | Complete | Prisma schema with all models and enums    |
| API Endpoints  | Complete | 29 endpoints across 4 modules             |
| Validation     | Complete | All Zod schemas + 46 billing tests         |
| Auth Backend   | Complete | Login, logout, refresh, RBAC middleware     |
| Auth Frontend  | Partial  | Login page works; no auth context/RBAC UI  |
| Module UI      | Missing  | 0 of 12 module pages built                 |
| E2E Tests      | Partial  | Auth covered; module workflows missing     |

---

## Recommended Implementation Order

### Step 1: Auth Context & Frontend RBAC (Phase 1)

**Priority:** CRITICAL — blocks all UI work
**Effort:** Small (5 files)
**Milestone:** Secure Usable Foundation (prerequisite)

#### What to build:

1. **`src/contexts/auth-context.tsx`** — AuthProvider with `useAuth()` hook
   - Store `AuthUser | null` from login response
   - Session restoration via `POST /api/v1/auth/refresh` on mount
   - Expose `user`, `role`, `isAuthenticated`, `login()`, `logout()`

2. **Modify `src/app/(dashboard)/layout.tsx`** — Wrap with `<AuthProvider>`

3. **Modify `src/components/layout/sidebar-nav.tsx`** — Filter nav items by role
   - Use `useAuth()` to get current role
   - Apply role-to-routes mapping from roadmap

4. **Modify `src/app/(auth)/login/page.tsx`** — Role-based redirect after login

5. **`src/app/api/v1/users/[id]/unlock/route.ts`** — Admin unlock endpoint

#### Why first:
Every UI page needs to know the current user's role. Without auth context, pages can't conditionally render actions, hide unauthorized navigation, or manage sessions.

---

### Step 2: Patient UI Pages (Phase 2)

**Priority:** HIGH — first user-facing module
**Effort:** Medium (4 pages + 1 RBAC fix)
**Milestone:** Secure Usable Foundation (completes Milestone A)

#### What to build:

1. **`/patients`** — List page
   - DataTable with columns: code, name, gender, phone, DOB
   - Search input calling `/api/v1/patients/search`
   - "Register Patient" button
   - Pagination

2. **`/patients/new`** — Registration form
   - react-hook-form + zodResolver with `createPatientSchema`
   - All required fields + optional (email, nationalId, address, bloodGroup, allergies)
   - Submit to `POST /api/v1/patients`, redirect on success

3. **`/patients/[id]`** — Detail page with tabs
   - Demographics, Medical History, Documents, Emergency Contacts
   - Allergies displayed prominently with Badge components
   - "Edit Patient" button

4. **`/patients/[id]/edit`** — Edit form
   - Pre-filled from existing data
   - Patient code and creation date as read-only header
   - Submit to `PUT /api/v1/patients/:id`

5. **RBAC fix:** Remove `director` from patient create allowed roles

#### Why second:
- Patient management is the most fundamental hospital operation
- Establishes UI patterns (DataTable, Form, Tabs) reused by all subsequent pages
- Receptionists need this to start working

---

### Step 3: Appointment UI Pages (Phase 3)

**Priority:** HIGH — enables outpatient workflow
**Effort:** Medium-Large (4 pages + 3 audit log modifications)
**Milestone:** Operational Outpatient Flow (Milestone B)

#### What to build:

1. **`/appointments`** — List page with filters
   - DataTable with date picker, doctor select, status select, department filters
   - Columns: code, patient, doctor, date/time, type, status

2. **`/appointments/new`** — Multi-step booking form
   - Step 1: Patient search/select
   - Step 2: Department -> Doctor selection
   - Step 3: Date -> Available slot selection
   - Step 4: Type, chief complaint, notes

3. **`/appointments/[id]`** — Detail page with status actions
   - Conditional action buttons based on current status + user role
   - Cancel dialog with required reason
   - "Generate Invoice" on completed appointments

4. **`/appointments/queue`** — Queue dashboard
   - Grouped by doctor with Card components
   - Current patient highlighted, emergency flagged
   - 30-second auto-refresh polling

5. **Audit logging** — Add `createAuditLog` to 3 appointment route files

#### Why third:
- Completes the patient-to-appointment flow
- Queue dashboard is essential for daily hospital operations
- Links to billing via "Generate Invoice" on completed appointments

---

### Step 4: Billing UI Pages (Phase 6)

**Priority:** HIGH — enables revenue collection
**Effort:** Medium (4 pages + optional billing.ts extraction)
**Milestone:** Cash Collection Ready (Milestone C)

#### What to build:

1. **`/billing`** — Invoice list page
   - DataTable with status, date range, patient search filters
   - Color-coded status badges

2. **`/billing/new`** — Create invoice form
   - Optional `?appointmentId=` auto-fill
   - Patient search/select
   - Dynamic line items (add/remove rows)
   - Live calculation preview (subtotal, tax, total)

3. **`/billing/[id]`** — Invoice detail page
   - Line items table, totals section, payment history
   - Conditional actions by status (edit items, issue, record payment, cancel)

4. **`/billing/[id]/payment`** — Record payment form
   - Outstanding balance display
   - Amount (max = balance), payment method, reference

5. **Optional:** Extract `src/lib/billing.ts` for client-side calculation reuse

#### Why fourth:
- Requires patient and appointment UI to be useful (invoice creation from appointment)
- Completes the end-to-end OPD workflow

---

### Step 5: E2E Tests (Phase 7)

**Priority:** MEDIUM — quality assurance
**Effort:** Medium (3 test files + validation test updates)
**Milestone:** Test Coverage (Milestone D)

#### What to build:

1. **`e2e/patients.spec.ts`** — Patient list, register, view, edit, search
2. **`e2e/appointments.spec.ts`** — Book, check-in, complete, queue view
3. **`e2e/billing.spec.ts`** — Create invoice, add items, issue, pay
4. **Update `src/__tests__/lib/validations.test.ts`** — Add billing schema edge cases

#### Why last:
- E2E tests require the UI to exist
- Can be written incrementally after each UI phase

---

## Quick Reference: File Counts

| Step | New Files | Modified Files | Total |
| ---- | --------- | -------------- | ----- |
| 1    | 2         | 3              | 5     |
| 2    | 4         | 1              | 5     |
| 3    | 4         | 3              | 7     |
| 4    | 4         | 0-1            | 4-5   |
| 5    | 3         | 1              | 4     |
| **Total** | **17** | **8-9**   | **25-26** |

---

## What NOT to Implement Now

These items are explicitly deferred per the roadmap and should not be attempted:

| Item                        | Reason                                      |
| --------------------------- | ------------------------------------------- |
| IPD billing (US-4.7)        | Requires Module 8 (Ward Management)         |
| Insurance claims (US-4.8)   | Complex workflow; not needed for v1         |
| Credit notes (US-4.9)       | Needs stable billing v1 first              |
| PDF invoices (US-4.10)      | Manual receipt sufficient initially         |
| MinIO file uploads          | Infrastructure not ready                   |
| Patient photo upload        | Depends on file upload pipeline            |
| Real-time queue (WebSocket) | Polling is sufficient for v1               |
| Doctor availability calendar| Enhancement; not blocking core flow        |
| Modules 5-9                 | Future phases after Modules 1-4 are stable |

---

## Decision: What to Start With

**Recommendation: Start with Step 1 (Auth Context & Frontend RBAC).**

It is the smallest step (5 files), blocks everything else, and delivers immediate security value (users only see what their role allows). Once complete, Steps 2-4 can even be partially parallelized since they consume independent APIs.

After Step 1, the highest-impact next step is **Step 2 (Patient UI)** because:
- It is the most fundamental hospital operation
- It establishes the UI component patterns for all subsequent pages
- It unblocks receptionists immediately
