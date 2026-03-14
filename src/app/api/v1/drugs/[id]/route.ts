import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { updateDrugSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/drugs/:id — Get drug detail with batches
export const GET = withAuth(
  async (
    _request: NextRequest,
    _payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const drug = await prisma.drug.findUnique({
        where: { id },
        include: {
          batches: {
            orderBy: { expiryDate: "asc" },
          },
        },
      });

      if (!drug) {
        return notFoundResponse("Drug");
      }

      return successResponse(drug);
    } catch (error) {
      console.error("Get drug error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
);

// PUT /api/v1/drugs/:id — Update drug info
export const PUT = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateDrugSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const existing = await prisma.drug.findUnique({ where: { id } });
      if (!existing) {
        return notFoundResponse("Drug");
      }

      const drug = await prisma.drug.update({
        where: { id },
        data: parsed.data,
      });

      await createAuditLog({
        userId: payload.userId,
        action: "UPDATE",
        entity: "Drug",
        entityId: drug.id,
        oldData: existing,
        newData: drug,
      });

      return successResponse(drug);
    } catch (error) {
      console.error("Update drug error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist", "admin"],
);
