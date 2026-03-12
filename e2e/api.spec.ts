import { test, expect } from "@playwright/test";
import { ADMIN_USER } from "./fixtures/test-data";

test.describe("API — Auth", () => {
  test("POST /api/v1/auth/login returns tokens on valid credentials", async ({ request }) => {
    const response = await request.post("/api/v1/auth/login", {
      data: {
        username: ADMIN_USER.username,
        password: ADMIN_USER.password,
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user).toMatchObject({
      username: ADMIN_USER.username,
      role: "director",
    });

    // Verify cookies are set
    const cookies = response.headers()["set-cookie"];
    expect(cookies).toContain("access_token");
    expect(cookies).toContain("refresh_token");
  });

  test("POST /api/v1/auth/login returns 401 on invalid credentials", async ({ request }) => {
    const response = await request.post("/api/v1/auth/login", {
      data: { username: "wrong", password: "wrong" },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/v1/auth/login returns 400 on missing fields", async ({ request }) => {
    const response = await request.post("/api/v1/auth/login", {
      data: {},
    });

    expect(response.status()).toBe(400);
  });
});

test.describe("API — Patients", () => {
  test("GET /api/v1/patients returns paginated list", async ({ request }) => {
    const response = await request.get("/api/v1/patients");

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.pagination).toHaveProperty("page");
    expect(body.pagination).toHaveProperty("limit");
    expect(body.pagination).toHaveProperty("total");
  });

  test("GET /api/v1/patients supports pagination params", async ({ request }) => {
    const response = await request.get("/api/v1/patients?page=1&limit=5");

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
  });
});

test.describe("API — Appointments", () => {
  test("GET /api/v1/appointments returns paginated list", async ({ request }) => {
    const response = await request.get("/api/v1/appointments");

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });

  test("GET /api/v1/appointments supports status filter", async ({ request }) => {
    const response = await request.get("/api/v1/appointments?status=scheduled");

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
