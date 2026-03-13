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

// Update patient
export const updatePatientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  nationalId: z.string().max(50).optional().nullable(),
  phone: z.string().min(1).max(20).optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  bloodGroup: z.string().max(5).optional().nullable(),
  allergies: z.array(z.string()).optional(),
});

// Search patient
export const searchPatientSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Emergency contact
export const createEmergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: z.string().min(1).max(50),
  phone: z.string().min(1).max(20),
});

export const updateEmergencyContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  relationship: z.string().min(1).max(50).optional(),
  phone: z.string().min(1).max(20).optional(),
});

// Medical history
export const createMedicalHistorySchema = z.object({
  condition: z.string().min(1).max(300),
  description: z.string().optional(),
  diagnosedAt: z.string().date().optional(),
  isActive: z.boolean().default(true),
});

export const updateMedicalHistorySchema = z.object({
  condition: z.string().min(1).max(300).optional(),
  description: z.string().optional().nullable(),
  diagnosedAt: z.string().date().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Patient document
export const createPatientDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  fileUrl: z.string().min(1),
  fileType: z.string().min(1).max(50),
});

// Create appointment
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(5).max(120).default(15),
  type: z.enum(["opd", "follow_up", "emergency", "teleconsult"]),
  chiefComplaint: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

// Update appointment (reschedule)
export const updateAppointmentSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().min(5).max(120).optional(),
  departmentId: z.string().uuid().optional(),
  chiefComplaint: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

// Update appointment status
export const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]),
  cancelReason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

// Invoice line item schema (reusable)
const invoiceItemSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
});

// Create invoice
export const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  admissionId: z.string().uuid().optional(),
  dueDate: z.string().date(),
  notes: z.string().max(1000).optional(),
  items: z.array(invoiceItemSchema).min(1),
});

// Update draft invoice
export const updateInvoiceSchema = z.object({
  dueDate: z.string().date().optional(),
  notes: z.string().max(1000).optional().nullable(),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
});

// Update invoice status
export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["issued", "cancelled", "overdue"]),
  notes: z.string().max(1000).optional(),
});

// Add line item to invoice
export const addInvoiceItemSchema = invoiceItemSchema;

// Update line item
export const updateInvoiceItemSchema = z.object({
  description: z.string().min(1).max(300).optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().positive().optional(),
});

// Record payment
export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "insurance", "mixed"]),
  reference: z.string().max(100).optional(),
});
