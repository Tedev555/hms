import { describe, it, expect } from "vitest";
import {
  loginSchema,
  passwordSchema,
  createUserSchema,
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
  createEmergencyContactSchema,
  updateEmergencyContactSchema,
  createMedicalHistorySchema,
  updateMedicalHistorySchema,
  createPatientDocumentSchema,
  createAppointmentSchema,
  paginationSchema,
} from "@/lib/validations";

describe("validations", () => {
  describe("paginationSchema", () => {
    it("should use defaults when no values provided", () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should coerce string values to numbers", () => {
      const result = paginationSchema.parse({ page: "3", limit: "50" });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("should reject limit above 100", () => {
      const result = paginationSchema.safeParse({ limit: 200 });
      expect(result.success).toBe(false);
    });

    it("should reject non-positive page", () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should validate correct login data", () => {
      const result = loginSchema.safeParse({
        username: "admin",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty username", () => {
      const result = loginSchema.safeParse({
        username: "",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        username: "admin",
        password: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("passwordSchema", () => {
    it("should accept a strong password", () => {
      const result = passwordSchema.safeParse("MyP@ssw0rd1");
      expect(result.success).toBe(true);
    });

    it("should reject password shorter than 10 characters", () => {
      const result = passwordSchema.safeParse("Ab1!");
      expect(result.success).toBe(false);
    });

    it("should reject password without lowercase", () => {
      const result = passwordSchema.safeParse("MYPASSW0RD!");
      expect(result.success).toBe(false);
    });

    it("should reject password without uppercase", () => {
      const result = passwordSchema.safeParse("mypassw0rd!");
      expect(result.success).toBe(false);
    });

    it("should reject password without number", () => {
      const result = passwordSchema.safeParse("MyPassword!");
      expect(result.success).toBe(false);
    });

    it("should reject password without special character", () => {
      const result = passwordSchema.safeParse("MyPassw0rd1");
      expect(result.success).toBe(false);
    });
  });

  describe("createUserSchema", () => {
    const validUser = {
      username: "jdoe",
      email: "jdoe@hospital.com",
      password: "SecureP@ss1",
      firstName: "John",
      lastName: "Doe",
      role: "doctor",
    };

    it("should validate a complete valid user", () => {
      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it("should accept optional departmentId as UUID", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        departmentId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid role", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        role: "janitor",
      });
      expect(result.success).toBe(false);
    });

    it("should reject username shorter than 3 chars", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        username: "ab",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createPatientSchema", () => {
    const validPatient = {
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1990-05-15",
      gender: "female",
      phone: "+254700123456",
    };

    it("should validate a complete valid patient", () => {
      const result = createPatientSchema.safeParse(validPatient);
      expect(result.success).toBe(true);
    });

    it("should accept optional fields", () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        email: "jane@example.com",
        bloodGroup: "O+",
        allergies: ["penicillin", "peanuts"],
        address: "123 Main St",
        nationalId: "12345678",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid gender", () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        gender: "unknown",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        dateOfBirth: "15/05/1990",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required phone", () => {
      const { phone: _phone, ...noPhone } = validPatient;
      const result = createPatientSchema.safeParse(noPhone);
      expect(result.success).toBe(false);
    });
  });

  describe("updatePatientSchema", () => {
    it("should accept partial updates", () => {
      const result = updatePatientSchema.safeParse({ firstName: "Updated" });
      expect(result.success).toBe(true);
    });

    it("should accept empty object (no changes)", () => {
      const result = updatePatientSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept nullable fields", () => {
      const result = updatePatientSchema.safeParse({
        email: null,
        nationalId: null,
        address: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = updatePatientSchema.safeParse({ email: "not-email" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid gender", () => {
      const result = updatePatientSchema.safeParse({ gender: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("searchPatientSchema", () => {
    it("should validate a valid search query", () => {
      const result = searchPatientSchema.safeParse({ q: "john" });
      expect(result.success).toBe(true);
    });

    it("should use defaults for page and limit", () => {
      const result = searchPatientSchema.parse({ q: "john" });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should reject empty query", () => {
      const result = searchPatientSchema.safeParse({ q: "" });
      expect(result.success).toBe(false);
    });

    it("should coerce page and limit from strings", () => {
      const result = searchPatientSchema.parse({ q: "test", page: "2", limit: "50" });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });
  });

  describe("createEmergencyContactSchema", () => {
    it("should validate a valid emergency contact", () => {
      const result = createEmergencyContactSchema.safeParse({
        name: "John Doe",
        relationship: "Brother",
        phone: "+254700000000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const result = createEmergencyContactSchema.safeParse({
        relationship: "Brother",
        phone: "+254700000000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty relationship", () => {
      const result = createEmergencyContactSchema.safeParse({
        name: "John",
        relationship: "",
        phone: "+254700000000",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateEmergencyContactSchema", () => {
    it("should accept partial updates", () => {
      const result = updateEmergencyContactSchema.safeParse({ name: "Updated" });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = updateEmergencyContactSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("createMedicalHistorySchema", () => {
    it("should validate a valid entry", () => {
      const result = createMedicalHistorySchema.safeParse({
        condition: "Diabetes Type 2",
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional fields", () => {
      const result = createMedicalHistorySchema.safeParse({
        condition: "Asthma",
        description: "Mild asthma since childhood",
        diagnosedAt: "2020-01-15",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing condition", () => {
      const result = createMedicalHistorySchema.safeParse({
        description: "some description",
      });
      expect(result.success).toBe(false);
    });

    it("should default isActive to true", () => {
      const result = createMedicalHistorySchema.parse({
        condition: "Test",
      });
      expect(result.isActive).toBe(true);
    });
  });

  describe("updateMedicalHistorySchema", () => {
    it("should accept partial updates", () => {
      const result = updateMedicalHistorySchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("should accept nullable fields", () => {
      const result = updateMedicalHistorySchema.safeParse({
        description: null,
        diagnosedAt: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createPatientDocumentSchema", () => {
    it("should validate a valid document", () => {
      const result = createPatientDocumentSchema.safeParse({
        title: "National ID Card",
        fileUrl: "https://minio.example.com/docs/id.pdf",
        fileType: "pdf",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing title", () => {
      const result = createPatientDocumentSchema.safeParse({
        fileUrl: "https://minio.example.com/docs/id.pdf",
        fileType: "pdf",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing fileUrl", () => {
      const result = createPatientDocumentSchema.safeParse({
        title: "Some doc",
        fileType: "pdf",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createAppointmentSchema", () => {
    const validAppointment = {
      patientId: "550e8400-e29b-41d4-a716-446655440000",
      doctorId: "550e8400-e29b-41d4-a716-446655440001",
      scheduledAt: "2025-06-15T10:30:00Z",
      type: "opd",
    };

    it("should validate a correct appointment", () => {
      const result = createAppointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it("should use default duration of 15", () => {
      const result = createAppointmentSchema.parse(validAppointment);
      expect(result.duration).toBe(15);
    });

    it("should accept all valid appointment types", () => {
      for (const type of ["opd", "follow_up", "emergency", "teleconsult"]) {
        const result = createAppointmentSchema.safeParse({
          ...validAppointment,
          type,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid appointment type", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        type: "walkin",
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-UUID patientId", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        patientId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});
