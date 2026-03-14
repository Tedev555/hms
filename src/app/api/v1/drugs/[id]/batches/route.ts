import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { createBatchSchema } from "@/lib/validations";
import { parsePagination } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/drugs/:id/batches — List batches for a drug
export const GET = withAuth(
  async (
    request: NextRequest,
    _payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

      const drug = await prisma.drug.findUnique({ where: { id }, select: { id: true } });
      if (!drug) {
        return notFoundResponse("Drug");
      }

      const [batches, total] = await Promise.all([
        prisma.drugBatch.findMany({
          where: { drugId: id },
          skip,
          take: limit,
          orderBy: { expiryDate: "asc" },
        }),
        prisma.drugBatch.count({ where: { drugId: id } }),
      ]);

      return paginatedResponse(batches, total, page, limit);
    } catch (error) {
      console.error("List batches error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist", "admin"],
);

// POST /api/v1/drugs/:id/batches — Record new batch (stock receipt)
export const POST = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = createBatchSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const drug = await prisma.drug.findUnique({ where: { id }, select: { id: true } });
      if (!drug) {
        return notFoundResponse("Drug");
      }

      // Create batch and increment drug stock in a transaction
      const batch = await prisma.$transaction(async (tx) => {
        const newBatch = await tx.drugBatch.create({
          data: {
            drugId: id,
            batchNo: parsed.data.batchNo,
            quantity: parsed.data.quantity,
            expiryDate: new Date(parsed.data.expiryDate),
            costPrice: parsed.data.costPrice,
            supplier: parsed.data.supplier,
          },
        });

        await tx.drug.update({
          where: { id },
          data: { currentStock: { increment: parsed.data.quantity } },
        });

        return newBatch;
      });

      await createAuditLog({
        userId: payload.userId,
        action: "CREATE",
        entity: "DrugBatch",
        entityId: batch.id,
        newData: batch,
      });

      return successResponse(batch, 201);
    } catch (error) {
      console.error("Create batch error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist", "admin"],
);
