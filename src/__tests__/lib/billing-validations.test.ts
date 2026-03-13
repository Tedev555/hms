import { describe, it, expect } from "vitest";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  addInvoiceItemSchema,
  updateInvoiceItemSchema,
  recordPaymentSchema,
} from "@/lib/validations";

describe("billing validations", () => {
  describe("createInvoiceSchema", () => {
    const validInvoice = {
      patientId: "550e8400-e29b-41d4-a716-446655440000",
      dueDate: "2025-06-15",
      items: [{ description: "OPD Consultation", quantity: 1, unitPrice: 500 }],
    };

    it("should validate a correct invoice", () => {
      const result = createInvoiceSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
    });

    it("should accept optional appointmentId as UUID", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        appointmentId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional admissionId as UUID", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        admissionId: "550e8400-e29b-41d4-a716-446655440002",
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional notes", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        notes: "Follow-up consultation included",
      });
      expect(result.success).toBe(true);
    });

    it("should accept multiple line items", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [
          { description: "Consultation", quantity: 1, unitPrice: 500 },
          { description: "Blood Test", quantity: 2, unitPrice: 150 },
          { description: "X-Ray", quantity: 1, unitPrice: 800 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty items array", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-UUID patientId", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        patientId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format for dueDate", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        dueDate: "15/06/2025",
      });
      expect(result.success).toBe(false);
    });

    it("should reject item with zero quantity", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ description: "Test", quantity: 0, unitPrice: 100 }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject item with negative unit price", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ description: "Test", quantity: 1, unitPrice: -100 }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject item with empty description", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ description: "", quantity: 1, unitPrice: 100 }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = createInvoiceSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject notes exceeding 1000 characters", () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        notes: "x".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateInvoiceSchema", () => {
    it("should accept partial updates", () => {
      const result = updateInvoiceSchema.safeParse({ dueDate: "2025-07-01" });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = updateInvoiceSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept nullable notes", () => {
      const result = updateInvoiceSchema.safeParse({ notes: null });
      expect(result.success).toBe(true);
    });

    it("should accept discount amount", () => {
      const result = updateInvoiceSchema.safeParse({ discountAmount: 100 });
      expect(result.success).toBe(true);
    });

    it("should accept tax amount", () => {
      const result = updateInvoiceSchema.safeParse({ taxAmount: 50.25 });
      expect(result.success).toBe(true);
    });

    it("should reject negative discount amount", () => {
      const result = updateInvoiceSchema.safeParse({ discountAmount: -10 });
      expect(result.success).toBe(false);
    });

    it("should reject negative tax amount", () => {
      const result = updateInvoiceSchema.safeParse({ taxAmount: -5 });
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const result = updateInvoiceSchema.safeParse({ dueDate: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateInvoiceStatusSchema", () => {
    it("should accept valid status 'issued'", () => {
      const result = updateInvoiceStatusSchema.safeParse({ status: "issued" });
      expect(result.success).toBe(true);
    });

    it("should accept valid status 'cancelled'", () => {
      const result = updateInvoiceStatusSchema.safeParse({ status: "cancelled" });
      expect(result.success).toBe(true);
    });

    it("should accept valid status 'overdue'", () => {
      const result = updateInvoiceStatusSchema.safeParse({ status: "overdue" });
      expect(result.success).toBe(true);
    });

    it("should accept optional notes", () => {
      const result = updateInvoiceStatusSchema.safeParse({
        status: "issued",
        notes: "Issued after review",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const result = updateInvoiceStatusSchema.safeParse({ status: "draft" });
      expect(result.success).toBe(false);
    });

    it("should reject status 'paid' (auto-set by payment)", () => {
      const result = updateInvoiceStatusSchema.safeParse({ status: "paid" });
      expect(result.success).toBe(false);
    });

    it("should reject missing status", () => {
      const result = updateInvoiceStatusSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("addInvoiceItemSchema", () => {
    it("should validate a correct line item", () => {
      const result = addInvoiceItemSchema.safeParse({
        description: "Blood Test",
        quantity: 2,
        unitPrice: 150,
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing description", () => {
      const result = addInvoiceItemSchema.safeParse({
        quantity: 1,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject zero quantity", () => {
      const result = addInvoiceItemSchema.safeParse({
        description: "Test",
        quantity: 0,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative unit price", () => {
      const result = addInvoiceItemSchema.safeParse({
        description: "Test",
        quantity: 1,
        unitPrice: -50,
      });
      expect(result.success).toBe(false);
    });

    it("should reject description over 300 characters", () => {
      const result = addInvoiceItemSchema.safeParse({
        description: "x".repeat(301),
        quantity: 1,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateInvoiceItemSchema", () => {
    it("should accept partial updates", () => {
      const result = updateInvoiceItemSchema.safeParse({ quantity: 3 });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = updateInvoiceItemSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept updating unit price only", () => {
      const result = updateInvoiceItemSchema.safeParse({ unitPrice: 200 });
      expect(result.success).toBe(true);
    });

    it("should reject zero quantity", () => {
      const result = updateInvoiceItemSchema.safeParse({ quantity: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe("recordPaymentSchema", () => {
    it("should validate a cash payment", () => {
      const result = recordPaymentSchema.safeParse({
        amount: 500,
        paymentMethod: "cash",
      });
      expect(result.success).toBe(true);
    });

    it("should validate a card payment with reference", () => {
      const result = recordPaymentSchema.safeParse({
        amount: 1000,
        paymentMethod: "card",
        reference: "TXN-12345",
      });
      expect(result.success).toBe(true);
    });

    it("should accept all valid payment methods", () => {
      for (const method of ["cash", "card", "bank_transfer", "insurance", "mixed"]) {
        const result = recordPaymentSchema.safeParse({
          amount: 100,
          paymentMethod: method,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject zero amount", () => {
      const result = recordPaymentSchema.safeParse({
        amount: 0,
        paymentMethod: "cash",
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative amount", () => {
      const result = recordPaymentSchema.safeParse({
        amount: -100,
        paymentMethod: "cash",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid payment method", () => {
      const result = recordPaymentSchema.safeParse({
        amount: 100,
        paymentMethod: "bitcoin",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing amount", () => {
      const result = recordPaymentSchema.safeParse({
        paymentMethod: "cash",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing payment method", () => {
      const result = recordPaymentSchema.safeParse({
        amount: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject reference exceeding 100 characters", () => {
      const result = recordPaymentSchema.safeParse({
        amount: 100,
        paymentMethod: "card",
        reference: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});
