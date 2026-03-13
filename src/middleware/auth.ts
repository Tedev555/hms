import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import type { UserRole } from "@prisma/client";

/**
 * Extract and verify the JWT from the Authorization header.
 * Returns the payload or null if invalid.
 */
export function getAuthPayload(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.slice(7);
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Higher-order function to protect API routes.
 * Validates JWT, checks user is still active, and optionally restricts to specific roles.
 */
export function withAuth<T extends unknown[] = []>(
  handler: (request: NextRequest, payload: JwtPayload, ...args: T) => Promise<Response>,
  allowedRoles?: UserRole[],
) {
  return async (request: NextRequest, ...args: T) => {
    const payload = getAuthPayload(request);
    if (!payload) {
      return unauthorizedResponse("Invalid or expired token");
    }

    // Verify user is still active in the database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return unauthorizedResponse("Account is no longer active");
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return forbiddenResponse("You do not have permission to access this resource");
    }

    return handler(request, payload, ...args) as Promise<Response>;
  };
}
