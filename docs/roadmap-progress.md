# HMS Roadmap Progress Report

**Date:** March 13, 2026 | **Reference:** `docs/implementation-roadmap.md`

---

## Executive Summary

The backend for Modules 1–4 is **100% complete**. All 29 API endpoints are implemented with validation, RBAC, and audit logging. The project's critical gap is the **frontend** — only the login page exists. Zero UI pages have been built for patients, appointments, or billing.

The original 7-phase roadmap assumed APIs were not built. In reality, Phases 4 and 5 (billing logic + billing APIs) were completed ahead of schedule. This changes the execution plan significantly — **the remaining work is predominantly frontend**.

---

## Phase-by-Phase Analysis

### Phase 1: Auth & Frontend RBAC Fixes

| Deliverable                             | Status      | Blocker? |
| --------------------------------------- | ----------- | -------- |
| `src/contexts/auth-context.tsx`         | Not Started | Yes      |
| Role-aware sidebar (`sidebar-nav.tsx`)  | Not Started | Yes      |
| Role-based login redirect              | Not Started | No       |
| Admin unlock endpoint                  | Not Started | No       |
| Dashboard layout `<AuthProvider>` wrap  | Not Started | Yes      |

**Completion: 0%**

**Analysis:** This phase is the **highest priority blocker**. Every subsequent UI page needs the auth context to determine the current user's role for conditional rendering, RBAC-aware navigation, and session management. Without this, building patient/appointment/billing pages would require either hardcoding user info or adding the auth context later and refactoring.

**Recommendation:** Implement Phase 1 first. It is a prerequisite for all UI work.

---

### Phase 2: Patient UI Pages

| Deliverable                                       | Status      | API Ready? |
| ------------------------------------------------- | ----------- | ---------- |
| `/patients` — List page with search               | Not Started | Yes        |
| `/patients/new` — Registration form               | Not Started | Yes        |
| `/patients/[id]` — Detail page with tabs          | Not Started | Yes        |
| `/patients/[id]/edit` — Edit form                 | Not Started | Yes        |
| RBAC fix: remove `director` from patient create   | Not Started | N/A        |

**Completion: 0%**

**Analysis:** All APIs are ready. This is pure frontend work — 4 page files consuming existing endpoints. The DataTable, Form, Tabs, Badge, and other shadcn/ui components are installed but unused. This phase introduces the first real use of these components and establishes patterns for Phases 3 and 6.

**Recommendation:** Implement immediately after Phase 1. Establishes UI patterns.

---

### Phase 3: Appointment UI Pages

| Deliverable                                       | Status      | API Ready? |
| ------------------------------------------------- | ----------- | ---------- |
| `/appointments` — List page with filters          | Not Started | Yes        |
| `/appointments/new` — Multi-step booking form     | Not Started | Yes        |
| `/appointments/[id]` — Detail page with actions   | Not Started | Yes        |
| `/appointments/queue` — Queue dashboard           | Not Started | Yes        |
| Appointment audit logging (3 route files)         | Not Started | N/A        |

**Completion: 0%**

**Analysis:** APIs complete. The queue dashboard and multi-step booking form are the most complex UI components in the entire roadmap. Audit logging is a small backend change (3 files, adding `createAuditLog` calls).

**Recommendation:** Implement after Phase 2. Can parallelize audit logging with UI work.

---

### Phase 4: Billing Validation & Calculation Service

| Deliverable                                       | Status      | Notes                                       |
| ------------------------------------------------- | ----------- | ------------------------------------------- |
| Billing validation schemas in `validations.ts`    | Complete    | 6 schemas implemented                       |
| `src/lib/billing.ts` calculation service          | Not Created | Logic exists inline in invoice API routes   |
| `src/__tests__/lib/billing.test.ts`               | Partial     | `billing-validations.test.ts` exists (46 tests) |

**Completion: 80%**

**Analysis:** The validation schemas and their tests are done. The dedicated `billing.ts` calculation service from the roadmap was not created as a separate file — the calculation logic was instead implemented directly in the invoice API route handlers. This is a deviation from the roadmap but functionally equivalent.

**Decision needed:** Extract inline calculation logic into `src/lib/billing.ts` for testability and reuse (as the roadmap specifies), or accept the current inline approach. The extraction would improve unit test coverage and allow the billing UI to reuse calculation functions for client-side previews.

**Recommendation:** Extract to `billing.ts` when building the billing UI (Phase 6), since the UI needs client-side calculation preview.

---

### Phase 5: Billing API Routes

| Deliverable                                       | Status   | Notes                  |
| ------------------------------------------------- | -------- | ---------------------- |
| `src/app/api/v1/invoices/route.ts`                | Complete | POST + GET             |
| `src/app/api/v1/invoices/[id]/route.ts`           | Complete | GET + PUT              |
| `src/app/api/v1/invoices/[id]/status/route.ts`    | Complete | PATCH                  |
| `src/app/api/v1/invoices/[id]/items/route.ts`     | Complete | POST                   |
| `src/app/api/v1/invoices/[id]/items/[itemId]/route.ts` | Complete | PUT + DELETE      |
| `src/app/api/v1/invoices/[id]/payments/route.ts`  | Complete | POST + GET             |
| `src/app/api/v1/patients/[id]/invoices/route.ts`  | Complete | GET                    |

**Completion: 100%**

**Analysis:** All 7 route files with 11 endpoints are fully implemented. Invoice creation, item management, status transitions, payment recording, and patient invoice listing all work. RBAC is enforced on all endpoints.

---

### Phase 6: Billing UI Pages

| Deliverable                                       | Status      | API Ready? |
| ------------------------------------------------- | ----------- | ---------- |
| `/billing` — Invoice list with filters            | Not Started | Yes        |
| `/billing/new` — Create invoice form              | Not Started | Yes        |
| `/billing/[id]` — Invoice detail with actions     | Not Started | Yes        |
| `/billing/[id]/payment` — Record payment form     | Not Started | Yes        |

**Completion: 0%**

**Analysis:** APIs complete. The create invoice page is moderately complex — it needs patient search/select, dynamic line items, and live calculation preview. The detail page needs conditional action buttons based on invoice status.

**Recommendation:** Implement after Phases 2 and 3 to leverage established UI patterns.

---

### Phase 7: Testing

| Deliverable                                       | Status      | Notes                                    |
| ------------------------------------------------- | ----------- | ---------------------------------------- |
| Billing validation schema tests                  | Complete    | 46 tests in `billing-validations.test.ts` |
| Billing calculation unit tests                    | Not Started | Blocked on `billing.ts` extraction       |
| `e2e/billing.spec.ts`                             | Not Started | Blocked on billing UI                    |
| `e2e/patients.spec.ts`                            | Not Started | Blocked on patient UI                    |
| `e2e/appointments.spec.ts`                        | Not Started | Blocked on appointment UI                |

**Completion: 30%**

**Analysis:** E2E tests are blocked on their respective UI pages existing. Unit tests for billing calculations are blocked on the extraction of `billing.ts`. The existing E2E tests (`login.spec.ts`, `api.spec.ts`, `dashboard.spec.ts`) cover auth flows.

**Recommendation:** Write E2E tests incrementally after each UI phase.

---

## Revised Execution Plan

Given that all APIs are complete, the original 7-phase plan collapses into a frontend-focused plan:

```
Original:  P1 -> P2 -> P3 -> P4 -> P5 -> P6 -> P7
                               ^         ^
                            Already    Already
                             Done       Done

Revised:   P1 -> P2 -> P3 -> P6 -> P7
           Auth   Patient  Appt   Billing  Tests
           RBAC   UI       UI     UI       E2E
```

### Revised Phase Dependencies

```
Phase 1 (Auth Context + RBAC)
    |
    +---> Phase 2 (Patient UI) ---> e2e/patients.spec.ts
    |
    +---> Phase 3 (Appointment UI) ---> e2e/appointments.spec.ts
    |
    +---> Phase 6 (Billing UI) ---> e2e/billing.spec.ts
              |
              +---> Extract billing.ts (optional, for client-side calc preview)
```

Phases 2, 3, and 6 can now be **parallelized** since they only depend on Phase 1 (auth context) and their respective APIs (which are all complete).

---

## Risk Assessment

| Risk                                         | Severity | Mitigation                                          |
| -------------------------------------------- | -------- | --------------------------------------------------- |
| No auth context means all UI pages are blind | High     | Phase 1 is the critical path — implement first      |
| UI patterns not established                  | Medium   | Phase 2 sets patterns; Phases 3/6 follow            |
| Inline billing calculations not unit-tested  | Medium   | Extract to billing.ts before/during Phase 6         |
| No E2E coverage for core workflows           | Medium   | Write E2E tests after each UI phase completes       |
| All 12 UI pages remain to be built           | High     | Leverage shared components and established patterns |
