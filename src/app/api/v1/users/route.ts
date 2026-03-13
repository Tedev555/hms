import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { hashPassword } from "@/lib/auth";
import { successResponse, paginatedResponse, errorResponse } from "@/lib/api-response";
import { createUserSchema } from "@/lib/validations";
import { parsePagination } from "@/lib/utils";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/users — List users (admin/director only)
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            department: { select: { name: true } },
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        prisma.user.count(),
      ]);

      return paginatedResponse(users, total, page, limit);
    } catch (error) {
      console.error("List users error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["admin", "director"],
);

// POST /api/v1/users — Create new user (admin/director only)
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const body = await request.json();
      const parsed = createUserSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const { password, ...userData } = parsed.data;
      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash,
          createdById: payload.userId,
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return successResponse(user, 201);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return errorResponse("Username or email already exists", 409);
      }
      console.error("Create user error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["admin", "director"],
);
