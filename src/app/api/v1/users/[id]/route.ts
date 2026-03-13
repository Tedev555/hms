import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/api-response";
import { updateUserSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/users/:id — Get user details (admin, director, or self)
export const GET = withAuth(
  async (
    _request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      // Non-admin/director users can only view their own profile
      const isAdminOrDirector = ["admin", "director"].includes(payload.role);
      if (!isAdminOrDirector && payload.userId !== id) {
        return forbiddenResponse("You do not have permission to view this user");
      }

      const user = await prisma.user.findUnique({
        where: { id },
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
          failedLoginAttempts: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!user) {
        return notFoundResponse("User");
      }

      // Fetch recent audit logs for this user
      const recentActivity = await prisma.auditLog.findMany({
        where: { entityId: id, entity: "User" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          oldData: true,
          newData: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });

      return successResponse({ ...user, recentActivity });
    } catch (error) {
      console.error("Get user error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
);

// PUT /api/v1/users/:id — Update user profile (admin, director, or self with limited fields)
export const PUT = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      const isAdminOrDirector = ["admin", "director"].includes(payload.role);
      const isSelf = payload.userId === id;

      if (!isAdminOrDirector && !isSelf) {
        return forbiddenResponse("You do not have permission to update this user");
      }

      const body = await request.json();
      const parsed = updateUserSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const data = parsed.data;

      // Self-service users cannot change role, department, or active status
      if (isSelf && !isAdminOrDirector) {
        delete data.role;
        delete data.departmentId;
      }

      // Only directors can change roles
      if (data.role && payload.role !== "director") {
        return forbiddenResponse("Only directors can change user roles");
      }

      // Verify user exists
      const existing = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          departmentId: true,
          phone: true,
        },
      });

      if (!existing) {
        return notFoundResponse("User");
      }

      // Check email uniqueness if email is being changed
      if (data.email && data.email !== existing.email) {
        const emailExists = await prisma.user.findFirst({
          where: { email: data.email, id: { not: id } },
        });
        if (emailExists) {
          return errorResponse("Email already in use", 409);
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data,
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
          updatedAt: true,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "UPDATE_USER",
        entity: "User",
        entityId: id,
        oldData: existing,
        newData: data,
      });

      return successResponse(user);
    } catch (error) {
      console.error("Update user error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
);
