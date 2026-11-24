import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { middleware } from "@/middleware";

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(path: string, authorization?: string) {
  return new NextRequest(`http://localhost${path}`, { headers: authorization ? { authorization } : {} });
}

function basic(user: string, password: string) {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}

function passes(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

describe("panel login", () => {
  it("without a password keeps the old panel open but closes the immediate care screens", () => {
    vi.stubEnv("ADMIN_USER", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(passes(middleware(request("/admin/profissionais")))).toBe(true);
    for (const path of ["/admin/imediato", "/admin/api/admin/immediate", "/admin/api/admin/professionals/3/immediate-approval"]) {
      expect(middleware(request(path)).status).toBe(503);
    }
  });

  it("with a password asks for login on every page and API route", () => {
    vi.stubEnv("ADMIN_USER", "equipe");
    vi.stubEnv("ADMIN_PASSWORD", "senha-forte");
    for (const path of ["/admin", "/admin/profissionais", "/admin/chatbot-flow", "/admin/api/admin/immediate"]) {
      const response = middleware(request(path));
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain("Basic");
    }
    expect(middleware(request("/admin/imediato", basic("equipe", "errada"))).status).toBe(401);
    expect(middleware(request("/admin/imediato", basic("outro", "senha-forte"))).status).toBe(401);
    expect(middleware(request("/admin/imediato", "Basic !!!"))).toMatchObject({ status: 401 });
    expect(passes(middleware(request("/admin/imediato", basic("equipe", "senha-forte"))))).toBe(true);
  });

  it("accepts passwords with accents and colons", () => {
    vi.stubEnv("ADMIN_USER", "equipe");
    vi.stubEnv("ADMIN_PASSWORD", "ação:2026");
    expect(passes(middleware(request("/admin/imediato", basic("equipe", "ação:2026"))))).toBe(true);
  });

  it("keeps the container health check public", () => {
    vi.stubEnv("ADMIN_USER", "equipe");
    vi.stubEnv("ADMIN_PASSWORD", "senha-forte");
    expect(passes(middleware(request("/admin/api/health")))).toBe(true);
  });
});
