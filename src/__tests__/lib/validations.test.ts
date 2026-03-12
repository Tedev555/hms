import { describe, it, expect } from "vitest";
import {
  loginSchema,
  passwordSchema,
  createUserSchema,
  createPatientSchema,
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
      const { phone, ...noPhone } = validPatient;
      const result = createPatientSchema.safeParse(noPhone);
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
