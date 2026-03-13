import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { updateOwnProfileSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/users/me — Get own profile (all authenticated users)
export const GET = withAuth(async (_request: NextRequest, payload: JwtPayload) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        department: { select: { id: true, name: true } },
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(user);
  } catch (error) {
    console.error("Get own profile error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// PUT /api/v1/users/me — Update own profile (limited fields)
export const PUT = withAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const body = await request.json();
    const parsed = updateOwnProfileSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Check email uniqueness if changing email
    if (data.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email: data.email, id: { not: payload.userId } },
      });
      if (emailExists) {
        return errorResponse("Email already in use", 409);
      }
    }

    const existing = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, firstName: true, lastName: true, phone: true },
    });

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phone: true,
        department: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: payload.userId,
      action: "UPDATE_OWN_PROFILE",
      entity: "User",
      entityId: payload.userId,
      oldData: existing,
      newData: data,
    });

    return successResponse(user);
  } catch (error) {
    console.error("Update own profile error:", error);
    return errorResponse("Internal server error", 500);
  }
});
