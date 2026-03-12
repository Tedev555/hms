# Module 5: Staff User Management

**Phase:** 2
**Priority:** High
**Dependencies:** Authentication & Authorization (Module 1)

---

## 1. Overview

The Staff User Management module handles the creation, modification, and deactivation of system user accounts for hospital staff. It manages user credentials, role assignments, department associations, and account lifecycle. This module is distinct from Authentication (Module 1) — Authentication handles login/session mechanics, while this module manages user accounts and access profiles.

---

## 2. User Stories

### US-5.1: Create Staff Account
**As a** hospital administrator,
**I want to** create a new user account for a staff member,
**So that** they can log in to the HMS and access features according to their role.

**Acceptance Criteria:**
- Fill in: username, email, first name, last name, role, department (optional), phone (optional)
- Set an initial password that meets the password policy
- Account is created with `isActive: true`
- The creating admin is recorded as `createdBy`
- Username and email must be unique across all accounts
- Password is hashed before storage (never stored in plain text)

### US-5.2: View Staff Directory
**As a** hospital administrator or director,
**I want to** see a list of all staff user accounts,
**So that** I can review and manage staff access.

**Acceptance Criteria:**
- Paginated list of all users showing: name, username, role, department, active status, last login
- Filterable by role, department, and active status
- Searchable by name or username
- Sortable by name, role, or last login date

### US-5.3: View Staff Profile
**As a** hospital administrator,
**I want to** view the full profile of a staff member,
**So that** I can review their account details and access history.

**Acceptance Criteria:**
- Shows all account details: name, username, email, role, department, phone, active status
- Shows account metadata: created date, created by, last login date
- Shows recent login activity (from audit log)

### US-5.4: Update Staff Information
**As a** hospital administrator,
**I want to** update a staff member's profile (name, email, phone, department),
**So that** their account reflects current information.

**Acceptance Criteria:**
- All profile fields except username and created date can be updated
- Email uniqueness is validated on update
- Changes are recorded in the audit log

### US-5.5: Change Staff Role
**As a** hospital director,
**I want to** change a staff member's role,
**So that** their system access matches their current responsibilities.

**Acceptance Criteria:**
- Role can be changed from the user profile
- Only directors can change roles
- The role change is effective immediately (next API call uses new role)
- Change is recorded in the audit log with old and new role values

### US-5.6: Deactivate Staff Account
**As a** hospital administrator,
**I want to** deactivate a staff member's account when they leave the hospital,
**So that** they can no longer access the system.

**Acceptance Criteria:**
- Account status changes to `isActive: false`
- The user can no longer log in (existing tokens are invalidated on next refresh)
- Account is NOT deleted — all historical data and audit trails remain intact
- Deactivation reason can be recorded in notes

### US-5.7: Reactivate Staff Account
**As a** hospital administrator,
**I want to** reactivate a previously deactivated account,
**So that** a returning staff member can regain access.

**Acceptance Criteria:**
- Account status changes to `isActive: true`
- The user can log in again with their existing credentials
- Reactivation is recorded in the audit log

### US-5.8: Reset Staff Password
**As a** hospital administrator,
**I want to** reset a staff member's password,
**So that** they can regain access if they forget their credentials.

**Acceptance Criteria:**
- Admin sets a new temporary password for the user
- The new password must meet the password policy
- The password is hashed before storage
- The user should be advised to change it on next login (informational, not enforced in Phase 2)

### US-5.9: View Own Profile
**As a** staff member,
**I want to** view and update my own profile (name, phone, email),
**So that** my contact information is current.

**Acceptance Criteria:**
- Any authenticated user can view their own profile
- Users can update their own: email, phone, first name, last name
- Users CANNOT change their own: username, role, department, active status
- Password change is separate from profile update

---

## 3. Business Requirements

### BR-5.1: Account Uniqueness
- Username SHALL be unique across all accounts (active and inactive)
- Email SHALL be unique across all accounts (active and inactive)

### BR-5.2: Password Security
- Passwords SHALL meet the policy: minimum 10 characters, mixed case, numbers, symbols
- Passwords SHALL be hashed using bcrypt with 12 salt rounds
- Plain-text passwords SHALL never be stored or logged

### BR-5.3: Soft Delete
- User accounts SHALL never be hard-deleted from the database
- Deactivation (`isActive: false`) SHALL be the only way to remove access
- All historical references (created by, doctor on appointments, etc.) SHALL remain valid

### BR-5.4: Role Assignment Rules
- Each user SHALL have exactly one role
- Role assignment SHALL be restricted to admin and director roles
- A user's role determines their access across all modules

### BR-5.5: Department Assignment
- Department assignment is optional but recommended for clinical roles (doctor, nurse, lab_tech)
- Department scoping may restrict which records a user can access (department-level isolation)

### BR-5.6: Audit Trail
- All account changes (creation, update, role change, status change, password reset) SHALL be logged
- Audit entries SHALL include: who made the change, what changed, old value, new value, timestamp

### BR-5.7: Access Control
| Role | Create Users | View All Users | Update Users | Change Roles | Deactivate |
|------|-------------|---------------|-------------|-------------|-----------|
| Admin | Yes | Yes | Yes | No | Yes |
| Director | Yes | Yes | Yes | Yes | Yes |
| Others | No | No (own profile only) | Own profile only | No | No |

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| POST | `/api/v1/users` | Create new staff account | admin, director |
| GET | `/api/v1/users` | List all users (paginated, filtered) | admin, director |
| GET | `/api/v1/users/:id` | Get user details | admin, director, self |
| PUT | `/api/v1/users/:id` | Update user profile | admin, director, self (limited) |
| PATCH | `/api/v1/users/:id/status` | Activate/deactivate account | admin, director |
| POST | `/api/v1/users/:id/reset-password` | Reset user password | admin, director |
| GET | `/api/v1/users/me` | Get own profile | all authenticated |
| PUT | `/api/v1/users/me` | Update own profile | all authenticated |

### 4.2 Data Model

**User** (see `prisma/schema.prisma`):
- `id`: UUID
- `username`: Unique, max 100 chars
- `email`: Unique, max 150 chars
- `passwordHash`: Hashed password
- `firstName`, `lastName`: Required, max 100 chars
- `role`: UserRole enum
- `departmentId`: FK → departments, optional
- `phone`: Optional, max 20 chars
- `isActive`: Boolean, default true
- `lastLoginAt`: DateTime, nullable
- `createdById`: FK → users (who created this account)
- `createdAt`, `updatedAt`: Timestamps

### 4.3 Validation Schemas

```typescript
const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().email().max(150),
  password: z.string().min(10).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{10,}$/,
    "Password must include uppercase, lowercase, number, and symbol"
  ),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["doctor", "nurse", "paramedic", "receptionist", "admin", "lab_tech", "pharmacist", "director"]),
  departmentId: z.string().uuid().optional(),
  phone: z.string().max(20).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().max(150).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum([...]).optional(),         // admin/director only
  departmentId: z.string().uuid().optional(),
  phone: z.string().max(20).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(10).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{10,}$/),
});
```

### 4.4 Filtering Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | UserRole | Filter by role |
| `departmentId` | UUID | Filter by department |
| `isActive` | boolean | Filter by active status |
| `search` | string | Search by name or username |
| `page` | number | Page number (default 1) |
| `limit` | number | Items per page (default 20) |

---

## 5. Additional Information

### UI Pages
- `/users` — Staff directory with filters and search
- `/users/new` — Create new staff account form
- `/users/:id` — Staff profile detail page
- `/users/:id/edit` — Edit staff profile form
- `/profile` — Own profile page (self-service)

### Edge Cases
- **Self-deactivation**: Admin should not be able to deactivate their own account
- **Last admin**: System should prevent deactivating the last active admin/director account
- **Username changes**: Usernames cannot be changed after creation (used for login and audit trails)
- **Department deletion**: If a department is deactivated, users in that department should still function but may have limited department-scoped features

### Cross-Module Dependencies
- **Authentication** (Module 1): Users created here authenticate via Module 1
- **Appointments** (Module 3): Doctors appear as appointment providers
- **Lab** (Module 7): Lab techs process lab orders
- **Pharmacy** (Module 6): Pharmacists manage dispensing
- **Inpatient** (Module 8): Nurses and doctors manage ward activities
