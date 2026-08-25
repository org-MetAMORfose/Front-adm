import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw
  }
}));

import { GET as getHealth } from "@/app/api/health/route";

describe("GET health", () => {
  beforeEach(() => {
    mocks.queryRaw.mockReset();
  });

  it("returns 200 when the database is connected", async () => {
    mocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const response = await getHealth();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      database: "connected"
    });
  });

  it("returns 503 without exposing the database error", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("password was rejected"));

    const response = await getHealth();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      database: "unavailable"
    });
  });
});
