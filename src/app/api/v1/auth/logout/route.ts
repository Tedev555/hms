import { NextRequest } from "next/server";
import { getAuthPayload } from "@/middleware/auth";
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { serialize } from "cookie";

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthPayload(request);
    if (!payload) {
      return unauthorizedResponse("Invalid or expired token");
    }

    // Log the logout action
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "LOGOUT",
        entity: "auth",
        ipAddress,
        newData: { username: payload.username },
      },
    });

    const response = successResponse({ message: "Logged out successfully" });

    // Clear refresh token cookie
    response.headers.set(
      "Set-Cookie",
      serialize("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 0,
      }),
    );

    // Clear access token cookie
    response.headers.append(
      "Set-Cookie",
      serialize("access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }),
    );

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse("Internal server error", 500);
  }
}
