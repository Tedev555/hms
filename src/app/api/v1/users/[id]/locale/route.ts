import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { SUPPORTED_LOCALES } from "@/lib/locale";
import type { JwtPayload } from "@/lib/auth";

// PATCH /api/v1/users/:id/locale — update user's language preference
export const PATCH = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // Users can update their own locale, admins/directors can update anyone's
    const isSelf = payload.userId === id;
    const isAdmin = ["admin", "director"].includes(payload.role);

    if (!isSelf && !isAdmin) {
      return errorResponse("You can only update your own language preference", 403);
    }

    const body = await request.json();
    const { locale } = body;

    if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
      return errorResponse(
        `Invalid locale. Supported locales: ${SUPPORTED_LOCALES.join(", ")}`,
        400,
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return notFoundResponse("User");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { locale },
      select: { id: true, locale: true },
    });

    return successResponse(updated);
  },
);
