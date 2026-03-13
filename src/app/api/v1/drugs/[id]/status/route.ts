import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";
import { z } from "zod";

const updateDrugStatusSchema = z.object({
  isActive: z.boolean(),
});

// PATCH /api/v1/drugs/:id/status — Activate/deactivate drug
export const PATCH = withAuth(
  async (request: NextRequest, payload: JwtPayload, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateDrugStatusSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const existing = await prisma.drug.findUnique({ where: { id } });
      if (!existing) {
        return notFoundResponse("Drug");
      }

      const drug = await prisma.drug.update({
        where: { id },
        data: { isActive: parsed.data.isActive },
      });

      await createAuditLog({
        userId: payload.userId,
        action: parsed.data.isActive ? "ACTIVATE" : "DEACTIVATE",
        entity: "Drug",
        entityId: drug.id,
        oldData: { isActive: existing.isActive },
        newData: { isActive: drug.isActive },
      });

      return successResponse(drug);
    } catch (error) {
      console.error("Update drug status error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist", "admin"],
);
