import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type JwtPayload,
} from "@/lib/auth";

const mockPayload: JwtPayload = {
  userId: "user-123",
  username: "dr.smith",
  role: "doctor" as JwtPayload["role"],
};

describe("auth", () => {
  describe("hashPassword", () => {
    it("should return a hashed string different from the original", async () => {
      const password = "SecureP@ss1";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for the same password (salted)", async () => {
      const password = "SecureP@ss1";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should return true for a matching password and hash", async () => {
      const password = "SecureP@ss1";
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it("should return false for a non-matching password", async () => {
      const hash = await hashPassword("SecureP@ss1");

      const result = await verifyPassword("WrongPassword1!", hash);
      expect(result).toBe(false);
    });
  });

  describe("generateAccessToken / verifyAccessToken", () => {
    it("should generate a valid JWT that can be verified", () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it("should throw on invalid token", () => {
      expect(() => verifyAccessToken("invalid-token")).toThrow();
    });

    it("should throw when verifying with wrong secret (refresh token verified as access)", () => {
      const refreshToken = generateRefreshToken(mockPayload);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe("generateRefreshToken / verifyRefreshToken", () => {
    it("should generate a valid refresh token that can be verified", () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeTruthy();

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it("should throw when verifying access token as refresh token", () => {
      const accessToken = generateAccessToken(mockPayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});
