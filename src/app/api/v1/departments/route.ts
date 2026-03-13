import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/departments — List active departments (all authenticated users)
export const GET = withAuth(async (_request: NextRequest, _payload: JwtPayload) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    return successResponse(departments);
  } catch (error) {
    console.error("List departments error:", error);
    return errorResponse("Internal server error", 500);
  }
});
