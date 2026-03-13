import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { hashPassword } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { resetPasswordSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// POST /api/v1/users/:id/reset-password — Reset user password (admin/director only)
export const POST = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      const body = await request.json();
      const parsed = resetPasswordSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true },
      });

      if (!user) {
        return notFoundResponse("User");
      }

      const passwordHash = await hashPassword(parsed.data.newPassword);

      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "RESET_PASSWORD",
        entity: "User",
        entityId: id,
      });

      return successResponse({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["admin", "director"],
);
