import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, paginatedResponse, errorResponse } from "@/lib/api-response";
import { createDrugSchema } from "@/lib/validations";
import { parsePagination } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

// GET /api/v1/drugs — List drugs with pagination, search, and filters
export const GET = withAuth(async (request: NextRequest, _payload: JwtPayload) => {
  try {
    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
    const search = request.nextUrl.searchParams.get("search");
    const category = request.nextUrl.searchParams.get("category");
    const stockStatus = request.nextUrl.searchParams.get("stockStatus"); // low, out, normal
    const isActive = request.nextUrl.searchParams.get("isActive");

    const where: Prisma.DrugWhereInput = {};

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    } else {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { genericName: { contains: search, mode: "insensitive" } },
        { brandName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (stockStatus === "low") {
      where.currentStock = { gt: 0, lte: prisma.drug.fields.reorderLevel as unknown as number };
      // Use raw filter for column comparison
      where.AND = [{ currentStock: { gt: 0 } }];
    } else if (stockStatus === "out") {
      where.currentStock = 0;
    }

    const [drugs, total] = await Promise.all([
      prisma.drug.findMany({
        where,
        skip,
        take: limit,
        orderBy: { genericName: "asc" },
        select: {
          id: true,
          genericName: true,
          brandName: true,
          category: true,
          formulation: true,
          strength: true,
          unit: true,
          reorderLevel: true,
          currentStock: true,
          unitPrice: true,
          isControlled: true,
          requiresPrescription: true,
          isActive: true,
        },
      }),
      prisma.drug.count({ where }),
    ]);

    return paginatedResponse(drugs, total, page, limit);
  } catch (error) {
    console.error("List drugs error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// POST /api/v1/drugs — Add new drug to catalogue
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const body = await request.json();
      const parsed = createDrugSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const drug = await prisma.drug.create({
        data: parsed.data,
      });

      await createAuditLog({
        userId: payload.userId,
        action: "CREATE",
        entity: "Drug",
        entityId: drug.id,
        newData: drug,
      });

      return successResponse(drug, 201);
    } catch (error) {
      console.error("Create drug error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["pharmacist", "admin"],
);
