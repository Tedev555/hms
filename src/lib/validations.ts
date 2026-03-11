import { z } from "zod";

// Reusable pagination query schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Login
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Password policy: min 10 chars, mixed case, numbers, symbols
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Must contain a special character");

// Create user
export const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum([
    "doctor",
    "nurse",
    "paramedic",
    "receptionist",
    "admin",
    "lab_tech",
    "pharmacist",
    "director",
  ]),
  departmentId: z.string().uuid().optional(),
  phone: z.string().optional(),
});

// Create patient
export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().date(),
  gender: z.enum(["male", "female", "other"]),
  nationalId: z.string().max(50).optional(),
  phone: z.string().min(1).max(20),
  email: z.string().email().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().max(5).optional(),
  allergies: z.array(z.string()).optional(),
});

// Create appointment
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().positive().default(15),
  type: z.enum(["opd", "follow_up", "emergency", "teleconsult"]),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
});
