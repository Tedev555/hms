import { describe, it, expect } from "vitest";
import {
  createDrugSchema,
  updateDrugSchema,
  createBatchSchema,
  createPrescriptionSchema,
  dispensePrescriptionItemSchema,
} from "@/lib/validations";

describe("createDrugSchema", () => {
  const validDrug = {
    genericName: "Paracetamol",
    formulation: "tablet",
    unit: "tablet",
    unitPrice: 0.5,
  };

  it("should accept valid minimal drug data", () => {
    const result = createDrugSchema.safeParse(validDrug);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reorderLevel).toBe(10); // default
      expect(result.data.isControlled).toBe(false); // default
      expect(result.data.requiresPrescription).toBe(true); // default
    }
  });

  it("should accept valid full drug data", () => {
    const result = createDrugSchema.safeParse({
      ...validDrug,
      brandName: "Tylenol",
      category: "Analgesics",
      strength: "500mg",
      reorderLevel: 20,
      isControlled: true,
      requiresPrescription: false,
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing genericName", () => {
    const result = createDrugSchema.safeParse({ ...validDrug, genericName: "" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid formulation", () => {
    const result = createDrugSchema.safeParse({ ...validDrug, formulation: "pill" });
    expect(result.success).toBe(false);
  });

  it("should reject negative unitPrice", () => {
    const result = createDrugSchema.safeParse({ ...validDrug, unitPrice: -1 });
    expect(result.success).toBe(false);
  });

  it("should reject zero unitPrice", () => {
    const result = createDrugSchema.safeParse({ ...validDrug, unitPrice: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject missing unit", () => {
    const result = createDrugSchema.safeParse({ ...validDrug, unit: "" });
    expect(result.success).toBe(false);
  });

  it("should reject negative reorderLevel", () => {
    const result = createDrugSchema.safeParse({ ...validDrug, reorderLevel: -5 });
    expect(result.success).toBe(false);
  });

  it("should accept all valid formulations", () => {
    const formulations = ["tablet", "capsule", "syrup", "injection", "cream", "inhaler", "drops", "other"];
    for (const formulation of formulations) {
      const result = createDrugSchema.safeParse({ ...validDrug, formulation });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateDrugSchema", () => {
  it("should accept partial update", () => {
    const result = updateDrugSchema.safeParse({ unitPrice: 1.5 });
    expect(result.success).toBe(true);
  });

  it("should accept empty object", () => {
    const result = updateDrugSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject invalid formulation", () => {
    const result = updateDrugSchema.safeParse({ formulation: "pill" });
    expect(result.success).toBe(false);
  });

  it("should reject negative unitPrice", () => {
    const result = updateDrugSchema.safeParse({ unitPrice: -1 });
    expect(result.success).toBe(false);
  });

  it("should accept nullable brandName", () => {
    const result = updateDrugSchema.safeParse({ brandName: null });
    expect(result.success).toBe(true);
  });
});

describe("createBatchSchema", () => {
  const validBatch = {
    batchNo: "BTH-001",
    quantity: 100,
    expiryDate: "2027-12-31",
    costPrice: 0.5,
  };

  it("should accept valid batch data", () => {
    const result = createBatchSchema.safeParse(validBatch);
    expect(result.success).toBe(true);
  });

  it("should accept batch with supplier", () => {
    const result = createBatchSchema.safeParse({ ...validBatch, supplier: "PharmaCorp" });
    expect(result.success).toBe(true);
  });

  it("should reject missing batchNo", () => {
    const result = createBatchSchema.safeParse({ ...validBatch, batchNo: "" });
    expect(result.success).toBe(false);
  });

  it("should reject zero quantity", () => {
    const result = createBatchSchema.safeParse({ ...validBatch, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject negative quantity", () => {
    const result = createBatchSchema.safeParse({ ...validBatch, quantity: -10 });
    expect(result.success).toBe(false);
  });

  it("should reject invalid date format", () => {
    const result = createBatchSchema.safeParse({ ...validBatch, expiryDate: "31-12-2027" });
    expect(result.success).toBe(false);
  });

  it("should reject zero costPrice", () => {
    const result = createBatchSchema.safeParse({ ...validBatch, costPrice: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject negative costPrice", () => {
    const result = createBatchSchema.safeParse({ ...validBatch, costPrice: -5 });
    expect(result.success).toBe(false);
  });
});

describe("createPrescriptionSchema", () => {
  const validPrescription = {
    patientId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
    items: [
      {
        drugId: "d1e2f3a4-b5c6-4890-a234-567890abcdef",
        dosage: "500mg",
        frequency: "Twice daily",
        duration: "7 days",
        quantity: 14,
      },
    ],
  };

  it("should accept valid prescription", () => {
    const result = createPrescriptionSchema.safeParse(validPrescription);
    expect(result.success).toBe(true);
  });

  it("should accept prescription with diagnosis and notes", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      diagnosis: "Upper respiratory infection",
      notes: "Complete full course",
    });
    expect(result.success).toBe(true);
  });

  it("should accept prescription with multiple items", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      items: [
        ...validPrescription.items,
        {
          drugId: "e2f3a4b5-c6d7-4901-a345-678901abcdef",
          dosage: "250mg",
          frequency: "Once daily",
          duration: "14 days",
          quantity: 14,
          instructions: "Take with food",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid patientId", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      patientId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty items array", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject item with missing dosage", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      items: [{ ...validPrescription.items[0], dosage: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject item with zero quantity", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      items: [{ ...validPrescription.items[0], quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject item with negative quantity", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      items: [{ ...validPrescription.items[0], quantity: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject item with invalid drugId", () => {
    const result = createPrescriptionSchema.safeParse({
      ...validPrescription,
      items: [{ ...validPrescription.items[0], drugId: "not-uuid" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("dispensePrescriptionItemSchema", () => {
  it("should accept confirm: true", () => {
    const result = dispensePrescriptionItemSchema.safeParse({ confirm: true });
    expect(result.success).toBe(true);
  });

  it("should reject confirm: false", () => {
    const result = dispensePrescriptionItemSchema.safeParse({ confirm: false });
    expect(result.success).toBe(false);
  });

  it("should reject missing confirm", () => {
    const result = dispensePrescriptionItemSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
