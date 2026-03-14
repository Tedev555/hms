import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { paginatedResponse, errorResponse } from "@/lib/api-response";
import { parsePagination } from "@/lib/utils";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/drugs/low-stock — List drugs at or below reorder level
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

      // Use raw query for column-to-column comparison
      const [drugs, countResult] = await Promise.all([
        prisma.$queryRaw<
          Array<{
            id: string;
            genericName: string;
            brandName: string | null;
            category: string | null;
            formulation: string;
            strength: string | null;
            unit: string;
            reorderLevel: number;
            currentStock: number;
            unitPrice: unknown;
            isControlled: boolean;
          }>
        >`
          SELECT id, "genericName", "brandName", category, formulation, strength, unit,
                 "reorderLevel", "currentStock", "unitPrice", "isControlled"
          FROM drugs
          WHERE "isActive" = true AND "currentStock" <= "reorderLevel"
          ORDER BY ("reorderLevel" - "currentStock") DESC, "genericName" ASC
          LIMIT ${limit} OFFSET ${skip}
        `,
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint as count FROM drugs
          WHERE "isActive" = true AND "currentStock" <= "reorderLevel"
        `,
      ]);

      const total = Number(countResult[0].count);
      return paginatedResponse(drugs, total, page, limit);
    } catch (error) {
      console.error("Low stock drugs error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist", "admin"],
);
