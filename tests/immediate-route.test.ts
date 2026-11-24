import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getImmediateRequests: vi.fn()
}));

vi.mock("@/lib/immediateQueries", () => ({
  getImmediateRequests: mocks.getImmediateRequests
}));

import { GET } from "@/app/api/admin/immediate/route";

function get(query = "") {
  return GET(new Request(`http://localhost/api/admin/immediate${query}`));
}

describe("GET /api/admin/immediate", () => {
  beforeEach(() => {
    mocks.getImmediateRequests.mockReset();
  });

  it("rejects an invalid limit", async () => {
    for (const query of ["?limit=0", "?limit=abc", "?limit=5000", "?limit=-1"]) {
      const response = await get(query);
      expect(response.status).toBe(400);
    }
    expect(mocks.getImmediateRequests).not.toHaveBeenCalled();
  });

  it("returns the requests with the default limit", async () => {
    mocks.getImmediateRequests.mockResolvedValue([{ id: 1 }]);
    const response = await get();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ requests: [{ id: 1 }] });
    expect(mocks.getImmediateRequests).toHaveBeenCalledWith(100);
  });

  it("passes a valid limit through", async () => {
    mocks.getImmediateRequests.mockResolvedValue([]);
    const response = await get("?limit=25");
    expect(response.status).toBe(200);
    expect(mocks.getImmediateRequests).toHaveBeenCalledWith(25);
  });

  it("returns 500 without exposing internals when the query fails", async () => {
    mocks.getImmediateRequests.mockRejectedValue(new Error("connection refused"));
    const response = await get();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Não foi possível carregar os atendimentos imediatos." });
  });
});
