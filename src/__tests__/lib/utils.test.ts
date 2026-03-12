import { describe, it, expect } from "vitest";
import { cn, generateCode, parsePagination } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("base", false && "hidden", "visible")).toBe("base visible");
    });

    it("should merge tailwind classes correctly", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });
  });

  describe("generateCode", () => {
    it("should generate a zero-padded code with prefix", () => {
      expect(generateCode("PAT", 1)).toBe("PAT-000001");
    });

    it("should pad correctly for larger numbers", () => {
      expect(generateCode("PAT", 123)).toBe("PAT-000123");
    });

    it("should handle 6-digit numbers", () => {
      expect(generateCode("PAT", 999999)).toBe("PAT-999999");
    });

    it("should work with different prefixes", () => {
      expect(generateCode("INV", 42)).toBe("INV-000042");
      expect(generateCode("APT", 7)).toBe("APT-000007");
    });
  });

  describe("parsePagination", () => {
    it("should return defaults when no params given", () => {
      const params = new URLSearchParams();
      const result = parsePagination(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });

    it("should parse page and limit from params", () => {
      const params = new URLSearchParams({ page: "3", limit: "10" });
      const result = parsePagination(params);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(20); // (3-1) * 10
    });

    it("should clamp page to minimum of 1", () => {
      const params = new URLSearchParams({ page: "-5" });
      const result = parsePagination(params);

      expect(result.page).toBe(1);
    });

    it("should clamp limit to maximum of 100", () => {
      const params = new URLSearchParams({ limit: "500" });
      const result = parsePagination(params);

      expect(result.limit).toBe(100);
    });

    it("should clamp limit to minimum of 1", () => {
      const params = new URLSearchParams({ limit: "0" });
      const result = parsePagination(params);

      expect(result.limit).toBe(1);
    });

    it("should calculate skip correctly", () => {
      const params = new URLSearchParams({ page: "5", limit: "25" });
      const result = parsePagination(params);

      expect(result.skip).toBe(100); // (5-1) * 25
    });
  });
});
