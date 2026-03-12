import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing the module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

describe("createAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an audit log entry with all fields", async () => {
    const mockCreate = vi.mocked(prisma.auditLog.create);
    mockCreate.mockResolvedValue({} as never);

    await createAuditLog({
      userId: "user-123",
      action: "CREATE",
      entity: "Patient",
      entityId: "patient-456",
      oldData: { firstName: "John" },
      newData: { firstName: "Jane" },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        action: "CREATE",
        entity: "Patient",
        entityId: "patient-456",
        oldData: { firstName: "John" },
        newData: { firstName: "Jane" },
      },
    });
  });

  it("should create an audit log without optional fields", async () => {
    const mockCreate = vi.mocked(prisma.auditLog.create);
    mockCreate.mockResolvedValue({} as never);

    await createAuditLog({
      userId: "user-123",
      action: "DELETE",
      entity: "EmergencyContact",
      entityId: "ec-789",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        action: "DELETE",
        entity: "EmergencyContact",
        entityId: "ec-789",
        oldData: undefined,
        newData: undefined,
      },
    });
  });

  it("should not throw if prisma create fails", async () => {
    const mockCreate = vi.mocked(prisma.auditLog.create);
    mockCreate.mockRejectedValue(new Error("DB error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createAuditLog({
        userId: "user-123",
        action: "CREATE",
        entity: "Patient",
        entityId: "patient-456",
      }),
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith("Audit log error:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
