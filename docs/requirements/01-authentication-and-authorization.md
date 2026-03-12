# Module 1: Authentication & Authorization

**Phase:** 1 — Core Infrastructure
**Priority:** Critical
**Dependencies:** None (foundational module)

---

## 1. Overview

The Authentication & Authorization module provides the security foundation for the entire HMS. It manages user login, token-based session management, role-based access control (RBAC), and ensures only authorized users can access protected resources. Every other module depends on this module being in place.

---

## 2. User Stories

### US-1.1: Staff Login
**As a** hospital staff member (doctor, nurse, receptionist, admin, etc.),
**I want to** log in to the HMS using my username and password,
**So that** I can access the system features assigned to my role.

**Acceptance Criteria:**
- User can enter username and password on a login page
- System validates credentials against stored hashed password
- On success, user receives a JWT access token (15-minute expiry) and a refresh token (7-day expiry stored as HttpOnly cookie)
- User is redirected to the dashboard appropriate for their role
- On failure, a generic error message is shown (no indication of whether username or password was wrong)
- After 5 consecutive failed attempts, the account is locked

### US-1.2: Session Persistence
**As a** logged-in user,
**I want** my session to stay active while I am working,
**So that** I don't have to re-enter my credentials frequently during a shift.

**Acceptance Criteria:**
- The access token is automatically refreshed using the refresh token before it expires
- The refresh token is rotated on each refresh (old token is invalidated)
- If the refresh token is expired or invalid, the user is redirected to the login page
- The refresh flow is seamless and does not interrupt the user's workflow

### US-1.3: Logout
**As a** logged-in user,
**I want to** log out of the system,
**So that** my session is terminated and no one else can use my access on this device.

**Acceptance Criteria:**
- Clicking logout clears the access token from memory and the refresh token cookie
- The user is redirected to the login page
- Subsequent requests with the old tokens are rejected

### US-1.4: Role-Based Access
**As a** hospital administrator,
**I want** each staff member to only see and do what their role permits,
**So that** patient data is protected and operational integrity is maintained.

**Acceptance Criteria:**
- Each API route can specify which roles are allowed to access it
- Unauthorized role access returns a 403 Forbidden response
- The frontend navigation and UI elements are conditionally rendered based on the user's role
- The RBAC matrix from the tech specs is enforced on both frontend and backend

### US-1.5: Account Lockout
**As a** system administrator,
**I want** accounts to be locked after multiple failed login attempts,
**So that** brute-force attacks are mitigated.

**Acceptance Criteria:**
- After 5 consecutive failed login attempts, the account is temporarily locked
- The lockout duration is configurable (default: 15 minutes)
- Successful login resets the failed attempt counter
- Admins can manually unlock accounts

---

## 3. Business Requirements

### BR-1.1: Authentication Method
- The system SHALL use JWT-based authentication
- Access tokens SHALL expire after 15 minutes
- Refresh tokens SHALL expire after 7 days
- Refresh tokens SHALL be stored in HttpOnly, Secure, SameSite cookies
- Passwords SHALL be hashed using bcrypt with 12 salt rounds

### BR-1.2: Password Policy
- Passwords SHALL be a minimum of 10 characters
- Passwords SHALL contain at least one uppercase letter, one lowercase letter, one number, and one symbol
- The system SHALL enforce the password policy on account creation and password reset

### BR-1.3: Role Definitions
The system SHALL support the following roles:
| Role | System Key |
|------|-----------|
| Doctor | `doctor` |
| Nurse | `nurse` |
| Paramedic | `paramedic` |
| Receptionist | `receptionist` |
| Admin | `admin` |
| Lab Technician | `lab_tech` |
| Pharmacist | `pharmacist` |
| Director | `director` |

### BR-1.4: RBAC Enforcement
- Authorization SHALL be enforced at the API layer (backend), not solely on the frontend
- Each protected API endpoint SHALL declare its allowed roles
- A request from a user whose role is not in the allowed list SHALL receive a 403 response

### BR-1.5: Audit Trail
- All login attempts (successful and failed) SHALL be logged
- Logs SHALL include: userId (if known), timestamp, IP address, and success/failure status

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/login` | Authenticate user, return tokens | No |
| POST | `/api/v1/auth/refresh` | Refresh access token using refresh cookie | No (cookie-based) |
| POST | `/api/v1/auth/logout` | Invalidate session | Yes |

### 4.2 Login Request/Response

**Request:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "data": {
    "accessToken": "jwt-string",
    "user": {
      "id": "uuid",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "UserRole",
      "departmentId": "uuid | null"
    }
  }
}
```
- Refresh token set as HttpOnly cookie in Set-Cookie header

**Error Response (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### 4.3 Middleware

- **Edge Middleware** (`src/middleware.ts`): Intercepts page requests and redirects unauthenticated users to `/login`
- **API Middleware** (`src/middleware/auth.ts`): `withAuth(handler, allowedRoles?)` higher-order function that validates the JWT and optionally checks role

### 4.4 Token Payload (JWT)

```typescript
type JwtPayload = {
  userId: string;
  username: string;
  role: UserRole;
  departmentId: string | null;
};
```

### 4.5 Validation Schema

```typescript
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
```

---

## 5. Additional Information

### Edge Cases
- If a user's account is deactivated (`isActive: false`) after they received a valid token, the next API call should reject with 401
- Concurrent sessions from multiple devices should be supported
- Token refresh should handle race conditions (multiple tabs refreshing simultaneously)

### Security Notes
- Never return specific error details about which field (username vs password) is incorrect
- Rate limit the login endpoint to prevent brute-force attacks
- Consider implementing MFA (TOTP) for admin and director roles in a future iteration

### Dependencies
- This module must be implemented first, as all other modules rely on authentication and authorization
