import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// POST /api/v1/users/:id/unlock — Admin unlocks a locked account
export const POST = withAuth(
  async (
    _request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, failedLoginAttempts: true, lockedUntil: true },
      });

      if (!user) {
        return notFoundResponse("User");
      }

      await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "UNLOCK_ACCOUNT",
        entity: "User",
        entityId: id,
        oldData: {
          failedLoginAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil,
        },
        newData: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      return successResponse({ message: "Account unlocked successfully" });
    } catch (error) {
      console.error("Unlock account error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["admin"],
);
