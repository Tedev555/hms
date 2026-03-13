# HMS — What to Implement Next

**Date:** March 13, 2026 | **Reference:** `docs/roadmap-progress.md`

---

## Current State at a Glance

| Layer          | Status   | Details                                    |
| -------------- | -------- | ------------------------------------------ |
| Database       | Complete | Prisma schema with all models and enums    |
| API Endpoints  | Complete | 30 endpoints across 4 modules (incl. unlock) |
| Validation     | Complete | All Zod schemas + 46 billing tests         |
| Auth Backend   | Complete | Login, logout, refresh, RBAC middleware, unlock |
| Auth Frontend  | Complete | Auth context, role sidebar, auto-refresh   |
| Module UI      | Complete | 12 of 12 module pages built                |
| Dashboard      | Complete | Real-time stats (patients, appointments, invoices) |
| E2E Tests      | Complete | Auth + patients + appointments + billing   |

---

## Recommended Implementation Order

### Modules 1–4: COMPLETE

All Steps 1–4 from the previous roadmap have been implemented:

- **Step 1 (Auth Context & RBAC):** Auth context, role sidebar, role-based login redirect, admin unlock endpoint, auto-refresh tokens — all done
- **Step 2 (Patient UI):** List, register, detail, edit pages — all done
- **Step 3 (Appointment UI):** List, booking, detail, queue pages + audit logging — all done
- **Step 4 (Billing UI):** List, create, detail, payment pages — all done
- **Step 5 (E2E Tests):** Patient, appointment, billing E2E test suites — all done
- **Dashboard:** Real-time stats from APIs — done

---

### What's Next: Modules 5–9

With Modules 1–4 fully implemented, the project is ready to begin the next phases:

### Step 1: Module 5 — Staff/User Management (Phase 2)

**Priority:** HIGH
**Requirements:** `docs/requirements/05-staff-user-management.md`

- User list page with role/department filters
- Create/edit user forms
- Role assignment and department management
- User profile page

### Step 2: Module 6 — Pharmacy & Inventory (Phase 3)

**Priority:** MEDIUM
**Requirements:** `docs/requirements/06-pharmacy-and-inventory.md`

- Drug catalog management
- Stock/batch tracking
- Prescription dispensing workflow
- Low stock alerts

### Step 3: Module 7 — Laboratory & Diagnostics (Phase 3)

**Priority:** MEDIUM
**Requirements:** `docs/requirements/07-laboratory-and-diagnostics.md`

- Lab test catalog
- Lab order creation and tracking
- Result entry and reporting

### Step 4: Module 8 — Inpatient & Ward Management (Phase 4)

**Priority:** MEDIUM
**Requirements:** `docs/requirements/08-inpatient-and-ward-management.md`

- Ward/room/bed management
- Admission and discharge workflows
- Vital signs tracking
- Nursing notes

### Step 5: Module 9 — Reports & Analytics (Phase 5)

**Priority:** LOW
**Requirements:** `docs/requirements/09-reports-and-analytics.md`

- Financial reports
- Patient statistics dashboards
- Operational analytics

---

## Items Still Deferred

| Item                        | Reason                                      |
| --------------------------- | ------------------------------------------- |
| IPD billing (US-4.7)        | Requires Module 8 (Ward Management)         |
| Insurance claims (US-4.8)   | Complex workflow; not needed for v1         |
| Credit notes (US-4.9)       | Needs stable billing v1 first              |
| PDF invoices (US-4.10)      | Manual receipt sufficient initially         |
| MinIO file uploads          | Infrastructure not ready                   |
| Patient photo upload        | Depends on file upload pipeline            |
| Real-time queue (WebSocket) | Polling is sufficient for v1               |
| `src/lib/billing.ts`        | Extraction optional; logic works inline    |

---

## Recommendation

**Start with Module 5 (Staff/User Management).** It builds on existing auth patterns, the API route for user listing already exists, and it's the highest priority Phase 2 module. The UI patterns established in Modules 1–4 (DataTable, Form, Tabs) can be directly reused.
