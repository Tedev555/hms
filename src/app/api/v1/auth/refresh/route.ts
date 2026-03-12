import { NextRequest } from "next/server";
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";
import { serialize } from "cookie";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return unauthorizedResponse("No refresh token provided");
    }

    const payload = verifyRefreshToken(refreshToken);

    // Verify user is still active and get fresh data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true, departmentId: true, role: true, username: true },
    });

    if (!user || !user.isActive) {
      return unauthorizedResponse("Account is no longer active");
    }

    const newPayload = {
      userId: payload.userId,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    const response = successResponse({ accessToken: newAccessToken });

    response.headers.set(
      "Set-Cookie",
      serialize("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 7 * 24 * 60 * 60,
      }),
    );

    response.headers.append(
      "Set-Cookie",
      serialize("access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      }),
    );

    return response;
  } catch {
    return unauthorizedResponse("Invalid or expired refresh token");
  }
}
