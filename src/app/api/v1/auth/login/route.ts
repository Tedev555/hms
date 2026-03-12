import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { loginSchema } from "@/lib/validations";
import { serialize } from "cookie";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const { username, password } = parsed.data;
    const ipAddress = getClientIp(request);

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        isActive: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // User not found — log attempt and return generic error
    if (!user) {
      await prisma.auditLog.create({
        data: {
          action: "LOGIN_FAILED",
          entity: "auth",
          ipAddress,
          newData: { username, reason: "user_not_found" },
        },
      });
      return unauthorizedResponse("Invalid credentials");
    }

    // Account deactivated
    if (!user.isActive) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_FAILED",
          entity: "auth",
          ipAddress,
          newData: { username, reason: "account_inactive" },
        },
      });
      return unauthorizedResponse("Invalid credentials");
    }

    // Account locked — check if lockout has expired
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_FAILED",
          entity: "auth",
          ipAddress,
          newData: { username, reason: "account_locked" },
        },
      });
      return errorResponse("Account is temporarily locked. Please try again later.", 423);
    }

    // If lockout expired, reset the counter before checking password
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
            : null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_FAILED",
          entity: "auth",
          ipAddress,
          newData: {
            username,
            reason: "invalid_password",
            failedAttempts: newFailedAttempts,
            accountLocked: shouldLock,
          },
        },
      });

      if (shouldLock) {
        return errorResponse("Account is temporarily locked. Please try again later.", 423);
      }

      return unauthorizedResponse("Invalid credentials");
    }

    // Successful login — reset failed attempts and update last login
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_SUCCESS",
        entity: "auth",
        ipAddress,
        newData: { username },
      },
    });

    const response = successResponse({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
      },
    });

    // Set refresh token as HttpOnly cookie
    response.headers.set(
      "Set-Cookie",
      serialize("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      }),
    );

    // Set access token cookie for middleware page protection
    response.headers.append(
      "Set-Cookie",
      serialize("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60, // 15 minutes
      }),
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
