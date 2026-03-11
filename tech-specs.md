# Hospital Management System

## Technical Specification Document

**Version:** 1.0 | **Date:** March 2026 | **Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Stakeholders & User Roles](#2-stakeholders--user-roles)
3. [System Architecture](#3-system-architecture)
4. [Functional Module Specifications](#4-functional-module-specifications)
5. [Security & Access Control](#5-security--access-control)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Integration & Interoperability](#7-integration--interoperability)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Appendix](#9-appendix)

---

## 1. Introduction

### 1.1 Purpose

This document defines the technical specification for a Hospital Management System (HMS). It serves as the authoritative reference for architecture, module design, data models, security, and implementation guidelines for development teams, system architects, and stakeholders.

### 1.2 Scope

The HMS is a comprehensive, web-based platform covering all core operational domains of a hospital. The system is designed for multi-role access by Doctors, Nurses/Paramedics, Receptionists/Admin staff, and Hospital Management/Directors.

### 1.3 System Overview

The HMS integrates eight core functional modules:

- Patient Registration & Records
- Appointments & Scheduling
- Billing & Payments
- Pharmacy & Inventory
- Doctor & Staff Management
- Laboratory & Diagnostics
- Inpatient / Ward Management
- Reports & Analytics

### 1.4 Document Conventions

| Term | Definition | Example |
|------|------------|---------|
| HMS | Hospital Management System | This system |
| EMR | Electronic Medical Record | Patient health data |
| OPD | Outpatient Department | Walk-in consultations |
| IPD | Inpatient Department | Admitted patients |
| LIS | Lab Information System | Lab module |
| API | Application Programming Interface | REST/GraphQL endpoints |
| RBAC | Role-Based Access Control | Permission system |
| HL7 FHIR | Healthcare interoperability standard | Data exchange format |

---

## 2. Stakeholders & User Roles

The system supports four primary user roles, each with distinct access levels and responsibilities.

| Role | Responsibilities | Access Level |
|------|-----------------|--------------|
| Doctor | Diagnose patients, write prescriptions, review lab results, manage OPD/IPD records | Clinical records, prescriptions, lab orders |
| Nurse / Paramedic | Update vitals, execute care plans, manage ward tasks, administer medication | Nursing notes, vital charts, ward boards |
| Receptionist / Admin | Register patients, book appointments, process billing, manage front desk | Patient registration, scheduling, billing |
| Hospital Management / Director | View reports, manage staff, oversee operations, configure system policies | Full read access + admin configuration |

---

## 3. System Architecture

### 3.1 Architectural Style

The HMS follows a Modular Monolith architecture with clear domain separation, designed for future migration to microservices. The system is built on Next.js, which serves both the frontend UI (via React Server Components and the App Router) and the backend API (via Next.js API Routes / Route Handlers), eliminating the need for a separate API server.

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript (Next.js App Router) | SSR/SSG support, built-in routing, full-stack in one framework |
| UI Framework | Tailwind CSS + shadcn/ui | Rapid styling, accessible components |
| Backend API | Next.js 14+ (App Router + Route Handlers) | Unified full-stack framework, Route Handlers replace separate API server |
| ORM | Prisma | Type-safe queries, migration management |
| Database (Primary) | PostgreSQL | ACID compliance, JSONB support for flexible fields |
| Cache | Redis | Session management, rate limiting, pub/sub |
| Auth | JWT + Refresh Tokens | Stateless auth with secure token rotation |
| File Storage | MinIO (S3-compatible) | Document and image storage |
| Containerization | Docker + Docker Compose | Environment consistency, easy deployment |
| Reverse Proxy | Nginx | SSL termination, load balancing, routing |
| CI/CD | GitHub Actions | Automated testing and deployment pipelines |

### 3.3 Deployment Architecture

The system is deployed as Docker containers on a Linux server (Ubuntu 22.04 LTS recommended). Each service is isolated in its own container and communicates over an internal Docker network.

**Container Layout:**

- `nginx` — Reverse proxy & SSL termination (port 443/80)
- `hms-app` — Next.js application (SSR + API Routes) (port 5000)
- `hms-db` — PostgreSQL primary database (port 5433)
- `hms-redis` — Redis cache & pub/sub (port 6379)
- `hms-minio` — Object storage for files/images (port 9000)

### 3.4 API Design

All API endpoints follow RESTful conventions. The base URL pattern is: `/api/v1/{module}/{resource}`

| Convention | Detail | Example |
|-----------|--------|---------|
| Versioning | URL-based versioning | `/api/v1/patients` |
| Authentication | Bearer JWT in Authorization header | `Authorization: Bearer <token>` |
| Pagination | `?page=1&limit=20` | `GET /api/v1/appointments?page=2` |
| Filtering | Query params per field | `?status=active&doctorId=123` |
| Error format | Standardized JSON error body | `{"statusCode":404,"message":"Not found"}` |
| Date format | ISO 8601 | `2026-03-10T08:30:00Z` |

---

## 4. Functional Module Specifications

### 4.1 Patient Registration & Records

The patient module manages the complete lifecycle of patient data from initial registration through ongoing medical history.

#### 4.1.1 Key Features

- Unique Patient ID generation (auto-incremented with prefix e.g. PAT-000001)
- Demographic data capture: name, DOB, gender, nationality, contact, address
- Emergency contact and next-of-kin information
- Insurance / payer information linkage
- Patient photo upload and document attachments (ID card, insurance card)
- Medical history: allergies, chronic conditions, past surgeries, family history
- Full audit trail of record modifications
- Patient search by ID, name, phone, or national ID

#### 4.1.2 Data Model — Patient

| Field | Type / Constraint |
|-------|------------------|
| id | UUID, Primary Key |
| patientCode | VARCHAR(20), Unique, Auto-generated |
| firstName | VARCHAR(100), NOT NULL |
| lastName | VARCHAR(100), NOT NULL |
| dateOfBirth | DATE, NOT NULL |
| gender | ENUM(male, female, other) |
| nationalId | VARCHAR(50), Unique, Nullable |
| phone | VARCHAR(20), NOT NULL |
| email | VARCHAR(150), Nullable |
| address | TEXT |
| bloodGroup | VARCHAR(5) |
| allergies | JSONB (array of strings) |
| insuranceId | FK → insurance_plans |
| createdBy | FK → users |
| createdAt / updatedAt | TIMESTAMP WITH TIME ZONE |

#### 4.1.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/patients` | Register new patient |
| GET | `/api/v1/patients/:id` | Get patient details |
| PUT | `/api/v1/patients/:id` | Update patient record |
| GET | `/api/v1/patients/search` | Search patients |
| GET | `/api/v1/patients/:id/history` | Get full medical history |
| POST | `/api/v1/patients/:id/documents` | Upload patient document |

---

### 4.2 Appointments & Scheduling

The scheduling module handles OPD appointment booking, doctor availability management, and patient queue management.

#### 4.2.1 Key Features

- Doctor availability calendar with configurable working hours and breaks
- Online and walk-in appointment booking
- Appointment types: OPD, Follow-up, Emergency, Teleconsultation
- Real-time slot availability with conflict prevention
- Queue management dashboard for reception staff
- Appointment rescheduling and cancellation with reason tracking
- Waiting time estimation

#### 4.2.2 Data Model — Appointment

| Field | Type / Constraint |
|-------|------------------|
| id | UUID, Primary Key |
| appointmentCode | VARCHAR(20), Auto-generated |
| patientId | FK → patients |
| doctorId | FK → doctors |
| departmentId | FK → departments |
| scheduledAt | TIMESTAMP WITH TIME ZONE |
| duration | INTEGER (minutes, default 15) |
| type | ENUM(opd, follow_up, emergency, teleconsult) |
| status | ENUM(scheduled, confirmed, checked_in, completed, cancelled, no_show) |
| chiefComplaint | TEXT, Nullable |
| notes | TEXT, Nullable |
| cancelReason | TEXT, Nullable |

---

### 4.3 Billing & Payments

The billing module automates invoice generation for OPD consultations, IPD stays, pharmacy, lab, and other hospital services.

#### 4.3.1 Key Features

- Automatic invoice generation from service consumption
- Multi-item invoice with itemized breakdown (consultation, procedures, medicines, lab)
- Insurance claim processing and co-payment calculation
- Multiple payment methods: cash, card, bank transfer, insurance
- Partial payments, advances, and outstanding balance tracking
- GST/VAT tax calculation (configurable per jurisdiction)
- Receipt printing and PDF generation
- Credit notes and refund management
- Daily/monthly revenue summary reports

#### 4.3.2 Data Model — Invoice

| Field | Type / Constraint |
|-------|------------------|
| id | UUID, Primary Key |
| invoiceNumber | VARCHAR(30), Unique |
| patientId | FK → patients |
| visitId | FK → visits (OPD/IPD) |
| issueDate | DATE |
| dueDate | DATE |
| subtotal | DECIMAL(12,2) |
| discountAmount | DECIMAL(12,2), default 0 |
| taxAmount | DECIMAL(12,2), default 0 |
| totalAmount | DECIMAL(12,2) |
| paidAmount | DECIMAL(12,2), default 0 |
| status | ENUM(draft, issued, partially_paid, paid, overdue, cancelled) |
| paymentMethod | ENUM(cash, card, bank_transfer, insurance, mixed) |
| insuranceClaimId | FK → insurance_claims, Nullable |

---

### 4.4 Pharmacy & Inventory

The pharmacy module manages drug dispensing linked to doctor prescriptions, stock management, and expiry tracking.

#### 4.4.1 Key Features

- Drug catalogue with generic name, brand names, category, and formulation
- Prescription-linked dispensing workflow
- Real-time stock levels with low-stock alerts
- Batch and lot tracking with expiry date management
- FIFO dispensing to minimize wastage from expiry
- Supplier management and purchase order generation
- Drug-drug interaction warnings (basic rule engine)
- Controlled substance tracking and reporting
- Inventory valuation reports

#### 4.4.2 Data Model — Drug

| Field | Type / Constraint |
|-------|------------------|
| id | UUID, Primary Key |
| genericName | VARCHAR(200), NOT NULL |
| brandName | VARCHAR(200) |
| category | VARCHAR(100) |
| formulation | ENUM(tablet, capsule, syrup, injection, cream, inhaler, drops, other) |
| strength | VARCHAR(50) e.g. 500mg |
| unit | VARCHAR(20) e.g. tablet, ml |
| reorderLevel | INTEGER |
| currentStock | INTEGER |
| unitPrice | DECIMAL(10,2) |
| isControlled | BOOLEAN, default false |
| requiresPrescription | BOOLEAN, default true |

---

### 4.5 Staff User Management

This module handles system user accounts for all staff. Its sole purpose is to create and manage user credentials, assign roles, and control what each staff member can access and do within the system.

#### 4.5.1 Key Features

- Create, update, and deactivate staff user accounts
- Assign system roles (Doctor, Nurse, Receptionist, Admin, Lab Tech, Pharmacist, Director)
- Set and reset passwords; enforce password policy on account creation
- Enable or disable account access without deleting the record
- View login activity and active sessions per user
- Department assignment to scope access where relevant

#### 4.5.2 Data Model — User

| Field | Type / Constraint |
|-------|------------------|
| id | UUID, Primary Key |
| username | VARCHAR(100), Unique, NOT NULL |
| passwordHash | VARCHAR(255), NOT NULL |
| firstName / lastName | VARCHAR(100), NOT NULL |
| role | ENUM(doctor, nurse, paramedic, receptionist, admin, lab_tech, pharmacist, director) |
| departmentId | FK → departments, Nullable |
| isActive | BOOLEAN, default true |
| lastLoginAt | TIMESTAMP WITH TIME ZONE, Nullable |
| createdBy | FK → users (admin who created the account) |
| createdAt / updatedAt | TIMESTAMP WITH TIME ZONE |

#### 4.5.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/users` | Create new staff user account |
| GET | `/api/v1/users` | List all users (Admin only) |
| GET | `/api/v1/users/:id` | Get user details |
| PUT | `/api/v1/users/:id` | Update user info or role |
| PATCH | `/api/v1/users/:id/status` | Activate or deactivate account |
| POST | `/api/v1/users/:id/reset-password` | Reset user password |

---

### 4.6 Laboratory & Diagnostics

The LIS module handles lab test orders from doctors, sample collection, processing, and result reporting back to clinical staff.

#### 4.6.1 Key Features

- Lab test catalogue with reference ranges per age/gender
- Doctor-initiated test orders linked to patient visits
- Sample collection tracking with barcode/QR code support
- Result entry by lab technicians with normal/abnormal flagging
- Critical value flagging with in-system alert to ordering doctor
- PDF lab report generation
- Result history timeline per patient
- Equipment integration hooks for automated analyzers

#### 4.6.2 Lab Order Workflow

| Step | Actor | Action |
|------|-------|--------|
| 1 | Doctor | Creates lab order for patient visit |
| 2 | Receptionist | Collects payment (if applicable) and prints sample label |
| 3 | Lab Tech | Receives sample, marks as received in system |
| 4 | Lab Tech | Processes sample, enters results |
| 5 | System | Flags abnormal values, sends alert if critical |
| 6 | Doctor | Reviews results in patient record |
| 7 | System | Makes report available for patient portal (if enabled) |

---

### 4.7 Inpatient & Ward Management

The IPD module manages the full lifecycle of admitted patients from admission through discharge.

#### 4.7.1 Key Features

- Bed inventory management with ward, room, and bed hierarchy
- Patient admission with attending doctor and primary diagnosis
- Real-time bed availability dashboard
- Care plan and nursing task assignments
- Vital signs charting (temperature, BP, pulse, SpO2, etc.)
- Daily ward rounds and progress note documentation
- Medication administration record (MAR)
- Transfer between wards/rooms
- Discharge summary generation
- Death and LAMA (Leave Against Medical Advice) recording

#### 4.7.2 Bed Status States

| Status | Description |
|--------|-------------|
| Available | Bed is clean and ready for new admission |
| Occupied | Patient is currently admitted to this bed |
| Reserved | Bed is held for a scheduled admission |
| Maintenance | Bed is out of service (cleaning, repair) |
| Discharged | Patient discharged, awaiting housekeeping clearance |

---

### 4.8 Reports & Analytics

The analytics module provides management dashboards and exportable reports for operational, clinical, and financial decision-making.

#### 4.8.1 Standard Reports

| Category | Report Name | Primary Users |
|----------|-------------|---------------|
| Clinical | OPD Daily Summary | Directors, Admin |
| Clinical | IPD Census Report | Directors, Nurses |
| Clinical | Diagnosis Frequency Report | Doctors, Directors |
| Financial | Daily Revenue Summary | Directors, Admin |
| Financial | Outstanding Payments Report | Admin, Reception |
| Financial | Insurance Claims Status | Admin |
| Inventory | Pharmacy Stock Report | Pharmacist, Admin |
| Inventory | Drug Expiry Alert Report | Pharmacist |
| HR | Staff Attendance Summary | Directors, Admin |
| HR | Doctor Workload Report | Directors |
| Lab | Test Volume Report | Lab Tech, Directors |
| Lab | Turnaround Time Report | Lab Tech, Directors |

#### 4.8.2 Dashboard KPIs

- Total patients today (OPD / IPD / Emergency)
- Bed occupancy rate (%) by ward
- Revenue today vs target
- Average wait time (OPD)
- Lab test turnaround time (average hours)
- Pharmacy low-stock alerts count
- Pending lab results count

---

## 5. Security & Access Control

### 5.1 Authentication

- JWT-based authentication with 15-minute access tokens
- Refresh token rotation stored in HttpOnly cookies
- Multi-factor authentication (TOTP) for admin and director roles
- Account lockout after 5 consecutive failed login attempts
- Password policy: minimum 10 characters, mixed case, numbers, symbols

### 5.2 Authorization — RBAC Matrix

| Module | Doctor | Nurse / Admin / Reception / Director |
|--------|--------|--------------------------------------|
| Patient Records | Read/Write (own patients) | Varies by role — see detail spec |
| Appointments | Read/Manage own schedule | Full access (Reception/Admin) |
| Billing | Read only | Full access (Admin/Reception) |
| Pharmacy | Create prescriptions | Dispensing (Pharmacist), View (Nurse) |
| Staff Management | Read own profile | Full access (Directors/HR Admin) |
| Lab Orders | Create, read results | Process (Lab Tech), Read (Nurse) |
| Ward Management | Clinical notes, orders | Full nursing access |
| Reports | Clinical reports only | Full access (Directors/Admin) |

### 5.3 Data Security

- All data encrypted in transit via TLS 1.3
- Sensitive fields (national ID, insurance numbers) encrypted at rest using AES-256
- Complete audit log for all data access and modifications (who, what, when)
- Database backups: automated daily full backup, hourly incremental
- HIPAA-aligned data handling practices (or local healthcare data regulations)
- PII data masking in non-production environments

---

## 6. Non-Functional Requirements

| Category | Requirement | Target Metric |
|----------|-------------|---------------|
| Storage | Document retention | 7 years minimum |
| Localization | Language support | English + local language |
| Browser support | Modern browsers | Chrome, Firefox, Edge, Safari |
| Mobile | Responsive design | Tablet and mobile optimized |

---

## 7. Integration & Interoperability

### 7.1 Internal Integrations

All HMS modules communicate internally within the Next.js application. Events between modules (e.g., appointment completed → billing triggered) are handled via an internal service layer or Redis pub/sub for async flows.

### 7.2 External Integrations

| Integration | Purpose |
|-------------|---------|
| Payment Gateway | Card and online payment processing |
| Insurance API | Eligibility checks, claim submission |
| HL7 FHIR | Data exchange with external labs, referral hospitals |
| Lab Analyzer (HL7 v2) | Direct result import from diagnostic equipment |
| Government Health Reporting | Mandatory disease notification APIs |

---

## 8. Implementation Roadmap

| Phase | Modules / Deliverables | Estimated Duration |
|-------|----------------------|--------------------|
| Phase 1 | Core Infrastructure, Auth, Patient Registration, Appointments | 8 weeks |
| Phase 2 | Billing & Payments, Doctor & Staff Management | 6 weeks |
| Phase 3 | Pharmacy & Inventory, Lab & Diagnostics | 6 weeks |
| Phase 4 | Inpatient / Ward Management | 6 weeks |
| Phase 5 | Reports & Analytics, Dashboard | 4 weeks |
| Phase 6 | QA, Security Audit, UAT, Go-Live Preparation | 4 weeks |

> **Total estimated development timeline:** 34 weeks (approximately 8–9 months for a full team of 5–6 developers).

---

## 9. Appendix

### 9.1 Glossary

| Term | Definition |
|------|-----------|
| OPD | Outpatient Department — patients not admitted overnight |
| IPD | Inpatient Department — patients formally admitted to a ward |
| LAMA | Leave Against Medical Advice — patient self-discharge |
| MAR | Medication Administration Record |
| FIFO | First In, First Out — stock dispensing order |
| TOTP | Time-based One-Time Password (Google Authenticator style) |
| HIPAA | Health Insurance Portability and Accountability Act |
| HL7 FHIR | Fast Healthcare Interoperability Resources standard |
| EMR | Electronic Medical Record |
| EHR | Electronic Health Record (broader than EMR) |

### 9.2 Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 2026 | Initial draft — all 8 modules specified |
