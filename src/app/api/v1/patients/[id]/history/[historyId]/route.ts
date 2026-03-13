import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { updateMedicalHistorySchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// PUT /api/v1/patients/:id/history/:historyId — Update medical history entry
export const PUT = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: { id: string; historyId: string } },
  ) => {
    try {
      const { id, historyId } = await params;
      const existing = await prisma.medicalHistory.findFirst({
        where: { id: historyId, patientId: id },
      });
      if (!existing) {
        return notFoundResponse("Medical history entry");
      }

      const body = await request.json();
      const parsed = updateMedicalHistorySchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const entry = await prisma.medicalHistory.update({
        where: { id: historyId },
        data: {
          condition: parsed.data.condition,
          description: parsed.data.description,
          isActive: parsed.data.isActive,
          diagnosedAt:
            parsed.data.diagnosedAt === undefined
              ? undefined
              : parsed.data.diagnosedAt === null
                ? null
                : new Date(parsed.data.diagnosedAt),
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "UPDATE",
        entity: "MedicalHistory",
        entityId: historyId,
        oldData: existing,
        newData: entry,
      });

      return successResponse(entry);
    } catch (error) {
      console.error("Update medical history error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["doctor"],
);
