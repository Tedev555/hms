# Module 3: Appointments & Scheduling

**Phase:** 1 — Core Infrastructure
**Priority:** Critical
**Dependencies:** Authentication (Module 1), Patient Registration (Module 2)

---

## 1. Overview

The Appointments & Scheduling module handles OPD appointment booking, doctor availability management, and patient queue management for the outpatient department. It enables receptionists to book, reschedule, and cancel appointments, while giving doctors visibility into their daily schedules.

---

## 2. User Stories

### US-3.1: Book a New Appointment
**As a** receptionist,
**I want to** book an appointment for a patient with a specific doctor at an available time slot,
**So that** the patient has a confirmed visit scheduled.

**Acceptance Criteria:**
- Select a registered patient (search by name/code)
- Select a department and doctor
- View available time slots for the selected doctor on the chosen date
- Select a slot and specify appointment type (OPD, follow-up, emergency, teleconsult)
- Optionally enter chief complaint and notes
- On submission, the system generates a unique appointment code (e.g., `APT-000001`)
- The appointment is created with status `scheduled`
- The selected time slot becomes unavailable for other bookings

### US-3.2: View Doctor's Daily Schedule
**As a** doctor,
**I want to** see my appointment schedule for the day,
**So that** I know which patients to expect and can prepare accordingly.

**Acceptance Criteria:**
- The doctor dashboard shows today's appointments by default
- Each appointment shows: time, patient name, appointment type, chief complaint, status
- Appointments are sorted by scheduled time
- The doctor can navigate to view other dates
- Status indicators distinguish between scheduled, checked-in, in-progress, completed, no-show

### US-3.3: Check In a Patient
**As a** receptionist,
**I want to** mark a patient as checked in when they arrive,
**So that** the doctor knows the patient is waiting.

**Acceptance Criteria:**
- From the appointment list, the receptionist can change status from `scheduled` or `confirmed` to `checked_in`
- The check-in time is recorded
- The doctor's queue updates in real-time (or on refresh)

### US-3.4: Start and Complete Consultation
**As a** doctor,
**I want to** mark an appointment as in-progress when I begin and completed when I finish,
**So that** the system tracks the consultation flow accurately.

**Acceptance Criteria:**
- Doctor can change status: `checked_in` → `in_progress` → `completed`
- Notes can be added at any stage
- The completion triggers downstream workflows (billing, prescriptions, lab orders become active)

### US-3.5: Reschedule an Appointment
**As a** receptionist,
**I want to** reschedule an existing appointment to a new date/time,
**So that** the patient can be accommodated when their original time no longer works.

**Acceptance Criteria:**
- Only appointments in `scheduled` or `confirmed` status can be rescheduled
- The original slot is released
- A new slot is booked for the new date/time
- The reason for rescheduling is optionally captured in notes

### US-3.6: Cancel an Appointment
**As a** receptionist,
**I want to** cancel an appointment when the patient requests it,
**So that** the slot is freed up for other patients.

**Acceptance Criteria:**
- Only appointments not yet in `in_progress` or `completed` status can be cancelled
- A cancel reason must be provided
- The status changes to `cancelled`
- The time slot is released for new bookings

### US-3.7: Mark No-Show
**As a** receptionist,
**I want to** mark a patient as a no-show if they don't arrive,
**So that** we have accurate attendance records.

**Acceptance Criteria:**
- An appointment in `scheduled` or `confirmed` status can be marked as `no_show`
- The time slot is freed for walk-in patients
- No-show is recorded for reporting purposes

### US-3.8: View Queue Dashboard
**As a** receptionist,
**I want to** see the real-time queue of patients waiting for each doctor,
**So that** I can manage wait times and inform patients.

**Acceptance Criteria:**
- Dashboard shows all checked-in patients grouped by doctor
- Sorted by check-in time (first come, first served)
- Estimated wait time shown based on average consultation duration
- Urgent/emergency appointments are highlighted

### US-3.9: View Appointment History
**As a** doctor or receptionist,
**I want to** view a patient's past appointments,
**So that** I can see their visit history and continuity of care.

**Acceptance Criteria:**
- From the patient profile, all past appointments are listed
- Each entry shows: date, doctor, type, status, chief complaint
- Clicking an appointment shows full details

---

## 3. Business Requirements

### BR-3.1: Appointment Code Generation
- The system SHALL generate a unique, sequential appointment code with format `APT-XXXXXX`
- Codes SHALL be immutable and never reused

### BR-3.2: Appointment Types
The system SHALL support the following appointment types:
| Type | Key | Description |
|------|-----|-------------|
| OPD | `opd` | Standard outpatient consultation |
| Follow-up | `follow_up` | Returning patient visit for existing condition |
| Emergency | `emergency` | Urgent unscheduled visit |
| Teleconsultation | `teleconsult` | Remote virtual consultation |

### BR-3.3: Appointment Status Flow
The system SHALL enforce the following status transitions:

```
scheduled → confirmed → checked_in → in_progress → completed
    ↓           ↓          ↓
 cancelled   cancelled   cancelled
    ↓           ↓
  no_show     no_show
```

- Only valid transitions SHALL be allowed
- Completed and cancelled appointments SHALL be immutable

### BR-3.4: Conflict Prevention
- The system SHALL NOT allow double-booking of the same doctor at the same time
- When a slot is selected, it must be validated as available at the time of creation (not just display time)
- Default appointment duration is 15 minutes; configurable per doctor or appointment type

### BR-3.5: Access Control
| Role | Book | View Own Schedule | View All Schedules | Check-in | Cancel |
|------|------|-------------------|--------------------|---------|---------|
| Receptionist | Yes | No | Yes | Yes | Yes |
| Admin | Yes | No | Yes | Yes | Yes |
| Doctor | No | Yes | Department only | No | No |
| Nurse | No | Yes | Department only | Yes | No |
| Director | No | No | Yes (read-only) | No | No |

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| POST | `/api/v1/appointments` | Create new appointment | receptionist, admin |
| GET | `/api/v1/appointments` | List appointments (filtered) | all authenticated |
| GET | `/api/v1/appointments/:id` | Get appointment details | all authenticated |
| PUT | `/api/v1/appointments/:id` | Update appointment | receptionist, admin |
| PATCH | `/api/v1/appointments/:id/status` | Change appointment status | receptionist, admin, doctor, nurse |
| GET | `/api/v1/appointments/slots` | Get available slots for a doctor/date | receptionist, admin |
| GET | `/api/v1/appointments/queue` | Get current queue by doctor | receptionist, admin, doctor, nurse |

### 4.2 Data Model

**Appointment** (see `prisma/schema.prisma`):
- `id`: UUID
- `appointmentCode`: Auto-generated, unique
- `patientId`: FK → patients
- `doctorId`: FK → users (where role = doctor)
- `departmentId`: FK → departments (optional)
- `scheduledAt`: DateTime
- `duration`: Int (minutes, default 15)
- `type`: AppointmentType enum
- `status`: AppointmentStatus enum (default: scheduled)
- `chiefComplaint`: Text, optional
- `notes`: Text, optional
- `cancelReason`: Text, optional

**Indexes:**
- `(doctorId, scheduledAt)` — efficient schedule lookup
- `(patientId)` — patient appointment history
- `(status)` — queue filtering
- `(scheduledAt)` — date range queries

### 4.3 Validation Schemas

```typescript
const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(5).max(120).default(15),
  type: z.enum(["opd", "follow_up", "emergency", "teleconsult"]),
  chiefComplaint: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]),
  cancelReason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});
```

### 4.4 Slot Availability Query

```
GET /api/v1/appointments/slots?doctorId=xxx&date=2026-03-15
```

**Response:**
```json
{
  "data": {
    "doctorId": "uuid",
    "date": "2026-03-15",
    "slots": [
      { "start": "08:00", "end": "08:15", "available": true },
      { "start": "08:15", "end": "08:30", "available": false },
      ...
    ]
  }
}
```

### 4.5 Filtering Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `doctorId` | UUID | Filter by doctor |
| `patientId` | UUID | Filter by patient |
| `departmentId` | UUID | Filter by department |
| `status` | AppointmentStatus | Filter by status |
| `date` | ISO date | Filter by specific date |
| `dateFrom` | ISO date | Filter from date (inclusive) |
| `dateTo` | ISO date | Filter to date (inclusive) |
| `type` | AppointmentType | Filter by type |
| `page` | number | Page number (default 1) |
| `limit` | number | Items per page (default 20) |

---

## 5. Additional Information

### UI Pages
- `/appointments` — Appointment list with filters (date, doctor, status)
- `/appointments/new` — Booking form with patient search, doctor selection, slot picker
- `/appointments/:id` — Appointment detail view
- `/appointments/queue` — Real-time queue dashboard grouped by doctor

### Edge Cases
- **Race condition on slot booking**: Use database-level constraints or optimistic locking to prevent two receptionists from booking the same slot simultaneously
- **Emergency appointments**: Should bypass normal slot availability checks and be allowed at any time
- **Past date bookings**: The system should not allow booking appointments in the past (except emergency backdating by admin)
- **Doctor unavailability**: If a doctor is marked as unavailable (sick leave, etc.), their slots should not appear as available

### Cross-Module Dependencies
- **Patient Registration** (Module 2): Must look up and link to existing patient records
- **Billing** (Module 4): Completed appointments may trigger invoice generation
- **Inpatient** (Module 8): Emergency appointments may lead to admission
