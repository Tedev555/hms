// Set test environment variables before any modules load
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret-key-for-testing";
process.env.NODE_ENV = "test";

import "@testing-library/jest-dom/vitest";
