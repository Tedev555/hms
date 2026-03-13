import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getAuthPayload, withAuth } from "@/middleware/auth";
import { generateAccessToken, type JwtPayload } from "@/lib/auth";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPayload: JwtPayload = {
  userId: "user-123",
  username: "dr.smith",
  role: "doctor" as JwtPayload["role"],
  departmentId: "dept-456",
};

function createRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  return new NextRequest("http://localhost:30000/api/test", { headers });
}

describe("middleware/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user is active
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isActive: true,
    } as never);
  });

  describe("getAuthPayload", () => {
    it("should return payload for a valid Bearer token", () => {
      const token = generateAccessToken(mockPayload);
      const request = createRequest(`Bearer ${token}`);

      const result = getAuthPayload(request);
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user-123");
      expect(result!.username).toBe("dr.smith");
      expect(result!.role).toBe("doctor");
      expect(result!.departmentId).toBe("dept-456");
    });

    it("should return null when no authorization header", () => {
      const request = createRequest();
      expect(getAuthPayload(request)).toBeNull();
    });

    it("should return null when header does not start with Bearer", () => {
      const request = createRequest("Basic abc123");
      expect(getAuthPayload(request)).toBeNull();
    });

    it("should return null for an invalid token", () => {
      const request = createRequest("Bearer invalid-token");
      expect(getAuthPayload(request)).toBeNull();
    });
  });

  describe("withAuth", () => {
    it("should call handler with payload when token is valid and user is active", async () => {
      const token = generateAccessToken(mockPayload);
      const request = createRequest(`Bearer ${token}`);

      const handler = vi.fn().mockResolvedValue(new Response("OK"));
      const protectedRoute = withAuth(handler);

      await protectedRoute(request);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][1].userId).toBe("user-123");
    });

    it("should return 401 when no token provided", async () => {
      const request = createRequest();
      const handler = vi.fn();
      const protectedRoute = withAuth(handler);

      const response = await protectedRoute(request);
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid token", async () => {
      const request = createRequest("Bearer bad-token");
      const handler = vi.fn();
      const protectedRoute = withAuth(handler);

      const response = await protectedRoute(request);
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should return 401 when user is inactive", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        isActive: false,
      } as never);

      const token = generateAccessToken(mockPayload);
      const request = createRequest(`Bearer ${token}`);

      const handler = vi.fn();
      const protectedRoute = withAuth(handler);

      const response = await protectedRoute(request);
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not found in database", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const token = generateAccessToken(mockPayload);
      const request = createRequest(`Bearer ${token}`);

      const handler = vi.fn();
      const protectedRoute = withAuth(handler);

      const response = await protectedRoute(request);
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should return 403 when role is not in allowedRoles", async () => {
      const token = generateAccessToken(mockPayload); // role: doctor
      const request = createRequest(`Bearer ${token}`);

      const handler = vi.fn();
      const protectedRoute = withAuth(handler, ["admin" as JwtPayload["role"]]);

      const response = await protectedRoute(request);
      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should allow access when role is in allowedRoles", async () => {
      const token = generateAccessToken(mockPayload); // role: doctor
      const request = createRequest(`Bearer ${token}`);

      const handler = vi.fn().mockResolvedValue(new Response("OK"));
      const protectedRoute = withAuth(handler, [
        "doctor" as JwtPayload["role"],
        "admin" as JwtPayload["role"],
      ]);

      await protectedRoute(request);
      expect(handler).toHaveBeenCalledOnce();
    });

    it("should allow access when no roles are specified", async () => {
      const token = generateAccessToken(mockPayload);
      const request = createRequest(`Bearer ${token}`);

      const handler = vi.fn().mockResolvedValue(new Response("OK"));
      const protectedRoute = withAuth(handler);

      await protectedRoute(request);
      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
