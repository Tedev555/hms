import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { dispensePrescriptionItemSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// PATCH /api/v1/prescriptions/:id/items/:itemId/dispense — Dispense a prescription item (FIFO)
export const PATCH = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string; itemId: string }> },
  ) => {
    try {
      const { id, itemId } = await params;
      const body = await request.json();
      const parsed = dispensePrescriptionItemSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      // Find the prescription item
      const item = await prisma.prescriptionItem.findFirst({
        where: { id: itemId, prescriptionId: id },
        include: { drug: { select: { id: true, genericName: true, currentStock: true } } },
      });

      if (!item) {
        return notFoundResponse("Prescription item");
      }

      if (item.isDispensed) {
        return errorResponse("Item has already been dispensed", 400);
      }

      // Check if sufficient stock exists
      if (item.drug.currentStock < item.quantity) {
        return errorResponse(
          `Insufficient stock for ${item.drug.genericName}. Available: ${item.drug.currentStock}, Required: ${item.quantity}`,
          400,
        );
      }

      // FIFO dispensing — decrement from oldest non-expired batches first
      const updatedItem = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const batches = await tx.drugBatch.findMany({
          where: {
            drugId: item.drugId,
            quantity: { gt: 0 },
            expiryDate: { gt: now }, // Skip expired batches
          },
          orderBy: { expiryDate: "asc" }, // FIFO — oldest expiry first
        });

        let remaining = item.quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;

          const deduct = Math.min(batch.quantity, remaining);
          await tx.drugBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: deduct } },
          });
          remaining -= deduct;
        }

        if (remaining > 0) {
          throw new Error("Insufficient non-expired stock");
        }

        // Decrement drug-level stock
        await tx.drug.update({
          where: { id: item.drugId },
          data: { currentStock: { decrement: item.quantity } },
        });

        // Mark item as dispensed
        return tx.prescriptionItem.update({
          where: { id: itemId },
          data: { isDispensed: true },
          include: {
            drug: { select: { id: true, genericName: true, brandName: true } },
          },
        });
      });

      await createAuditLog({
        userId: payload.userId,
        action: "DISPENSE",
        entity: "PrescriptionItem",
        entityId: itemId,
        oldData: { isDispensed: false, quantity: item.quantity },
        newData: { isDispensed: true, drugId: item.drugId },
      });

      return successResponse(updatedItem);
    } catch (error) {
      if (error instanceof Error && error.message === "Insufficient non-expired stock") {
        return errorResponse("Insufficient non-expired stock to complete dispensing", 400);
      }
      console.error("Dispense item error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist"],
);
