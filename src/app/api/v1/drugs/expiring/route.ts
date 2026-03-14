import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { paginatedResponse, errorResponse } from "@/lib/api-response";
import { parsePagination } from "@/lib/utils";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/drugs/expiring — List batches expiring within a configurable window
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
      const daysParam = request.nextUrl.searchParams.get("days");
      const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 90;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);

      const where = {
        expiryDate: { lte: cutoffDate },
        quantity: { gt: 0 },
      };

      const [batches, total] = await Promise.all([
        prisma.drugBatch.findMany({
          where,
          skip,
          take: limit,
          orderBy: { expiryDate: "asc" },
          include: {
            drug: {
              select: {
                id: true,
                genericName: true,
                brandName: true,
                unit: true,
              },
            },
          },
        }),
        prisma.drugBatch.count({ where }),
      ]);

      // Tag each batch as expired or expiring
      const now = new Date();
      const tagged = batches.map((batch) => ({
        ...batch,
        isExpired: batch.expiryDate < now,
      }));

      return paginatedResponse(tagged, total, page, limit);
    } catch (error) {
      console.error("Expiring drugs error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist", "admin"],
);
