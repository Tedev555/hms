import { describe, it, expect } from "vitest";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/api-response";

describe("api-response", () => {
  describe("successResponse", () => {
    it("should return 200 with data by default", async () => {
      const res = successResponse({ id: 1, name: "Test" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual({ id: 1, name: "Test" });
    });

    it("should return custom status code", async () => {
      const res = successResponse({ id: 1 }, 201);
      expect(res.status).toBe(201);
    });
  });

  describe("paginatedResponse", () => {
    it("should return data with pagination meta", async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const res = paginatedResponse(items, 50, 1, 20);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(items);
      expect(body.meta).toEqual({
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      });
    });

    it("should calculate totalPages correctly", async () => {
      const res = paginatedResponse([], 10, 1, 3);
      const body = await res.json();
      expect(body.meta.totalPages).toBe(4); // ceil(10/3)
    });

    it("should handle zero total", async () => {
      const res = paginatedResponse([], 0, 1, 20);
      const body = await res.json();
      expect(body.meta.totalPages).toBe(0);
    });
  });

  describe("errorResponse", () => {
    it("should return error with status 400 by default", async () => {
      const res = errorResponse("Something went wrong");

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.statusCode).toBe(400);
      expect(body.message).toBe("Something went wrong");
    });

    it("should include field errors when provided", async () => {
      const fieldErrors = { email: ["Invalid email format"] };
      const res = errorResponse("Validation failed", 400, fieldErrors);

      const body = await res.json();
      expect(body.errors).toEqual(fieldErrors);
    });

    it("should not include errors key when not provided", async () => {
      const res = errorResponse("Bad request");
      const body = await res.json();
      expect(body.errors).toBeUndefined();
    });
  });

  describe("notFoundResponse", () => {
    it("should return 404 with default message", async () => {
      const res = notFoundResponse();

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toBe("Resource not found");
    });

    it("should use custom resource name", async () => {
      const res = notFoundResponse("Patient");
      const body = await res.json();
      expect(body.message).toBe("Patient not found");
    });
  });

  describe("unauthorizedResponse", () => {
    it("should return 401 with default message", async () => {
      const res = unauthorizedResponse();

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("should use custom message", async () => {
      const res = unauthorizedResponse("Token expired");
      const body = await res.json();
      expect(body.message).toBe("Token expired");
    });
  });

  describe("forbiddenResponse", () => {
    it("should return 403 with default message", async () => {
      const res = forbiddenResponse();

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBe("Forbidden");
    });
  });
});
