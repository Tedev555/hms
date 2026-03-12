# HMS Module Requirements Index

This directory contains detailed requirement specifications for each module of the Hospital Management System (HMS). Each document is designed to serve as a standalone reference for implementing its respective module.

**Source Document:** [Technical Specification](../tech-specs.md)

---

## Module Requirements

| # | Module | File | Phase |
|---|--------|------|-------|
| 1 | [Authentication & Authorization](./01-authentication-and-authorization.md) | `01-authentication-and-authorization.md` | Phase 1 |
| 2 | [Patient Registration & Records](./02-patient-registration-and-records.md) | `02-patient-registration-and-records.md` | Phase 1 |
| 3 | [Appointments & Scheduling](./03-appointments-and-scheduling.md) | `03-appointments-and-scheduling.md` | Phase 1 |
| 4 | [Billing & Payments](./04-billing-and-payments.md) | `04-billing-and-payments.md` | Phase 2 |
| 5 | [Staff User Management](./05-staff-user-management.md) | `05-staff-user-management.md` | Phase 2 |
| 6 | [Pharmacy & Inventory](./06-pharmacy-and-inventory.md) | `06-pharmacy-and-inventory.md` | Phase 3 |
| 7 | [Laboratory & Diagnostics](./07-laboratory-and-diagnostics.md) | `07-laboratory-and-diagnostics.md` | Phase 3 |
| 8 | [Inpatient & Ward Management](./08-inpatient-and-ward-management.md) | `08-inpatient-and-ward-management.md` | Phase 4 |
| 9 | [Reports & Analytics](./09-reports-and-analytics.md) | `09-reports-and-analytics.md` | Phase 5 |

---

## Document Structure

Each requirement document follows a consistent structure:

1. **Overview** — Module purpose and scope
2. **User Stories** — Who needs what and why
3. **Business Requirements** — Detailed functional requirements
4. **Technical Specifications** — API endpoints, data models, validation rules
5. **Additional Information** — Dependencies, edge cases, notes

## How to Use

- Implement modules in phase order (Phase 1 first, then Phase 2, etc.)
- Within a phase, modules can be developed in parallel
- Each document is self-contained but references cross-module dependencies where relevant
- Use user stories for acceptance criteria during development and QA
