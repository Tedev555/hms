import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { updateUserStatusSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// PATCH /api/v1/users/:id/status — Activate/deactivate account (admin/director only)
export const PATCH = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      const body = await request.json();
      const parsed = updateUserStatusSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const { isActive } = parsed.data;

      // Prevent self-deactivation
      if (payload.userId === id && !isActive) {
        return errorResponse("You cannot deactivate your own account", 400);
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, isActive: true, role: true },
      });

      if (!user) {
        return notFoundResponse("User");
      }

      // Prevent deactivating the last active admin/director
      if (!isActive && ["admin", "director"].includes(user.role)) {
        const activeAdminCount = await prisma.user.count({
          where: {
            role: { in: ["admin", "director"] },
            isActive: true,
            id: { not: id },
          },
        });
        if (activeAdminCount === 0) {
          return errorResponse(
            "Cannot deactivate the last active administrator/director account",
            400,
          );
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: isActive ? "REACTIVATE_USER" : "DEACTIVATE_USER",
        entity: "User",
        entityId: id,
        oldData: { isActive: user.isActive },
        newData: { isActive },
      });

      return successResponse(updated);
    } catch (error) {
      console.error("Update user status error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["admin", "director"],
);
