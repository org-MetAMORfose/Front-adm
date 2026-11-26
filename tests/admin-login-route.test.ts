import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { ADMIN_SESSION_COOKIE, safeNextPath, verifyAdminSession } from "@/lib/adminSession";

afterEach(() => {
  vi.unstubAllEnvs();
});

function loginRequest(body: unknown) {
  return new NextRequest("http://localhost/admin/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function sessionFrom(response: Response) {
  const header = response.headers.get("set-cookie") ?? "";
  const match = header.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]*)`));
  return { header, value: match?.[1] ?? "" };
}

describe("login route", () => {
  it("opens a session for the right user and password", async () => {
    vi.stubEnv("ADMIN_USER", "equipe");
    vi.stubEnv("ADMIN_PASSWORD", "ação:2026");
    const response = await login(loginRequest({ user: "equipe", password: "ação:2026" }));
    expect(response.status).toBe(200);
    const cookie = sessionFrom(response);
    expect(cookie.header).toContain("HttpOnly");
    expect(cookie.header).toContain("Path=/admin");
    expect(cookie.header.toLowerCase()).toContain("samesite=lax");
    expect(await verifyAdminSession(cookie.value, "equipe", "ação:2026")).toBe(true);
  });

  it("refuses a wrong user or password without opening a session", async () => {
    vi.stubEnv("ADMIN_USER", "equipe");
    vi.stubEnv("ADMIN_PASSWORD", "senha-forte");
    for (const body of [{ user: "equipe", password: "errada" }, { user: "outro", password: "senha-forte" }, { user: "equipe" }, "lixo"]) {
      const response = await login(loginRequest(body));
      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect((await response.json()).error).toBe("Usuário ou senha incorretos.");
    }
  });

  it("says the login is not configured when the panel has no password", async () => {
    vi.stubEnv("ADMIN_USER", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    const response = await login(loginRequest({ user: "", password: "" }));
    expect(response.status).toBe(503);
  });
});

describe("logout route", () => {
  it("clears the session and goes back to the login screen", async () => {
    const response = await logout();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/login");
    const cookie = sessionFrom(response);
    expect(cookie.value).toBe("");
    expect(cookie.header).toContain("Max-Age=0");
  });
});

describe("where to go after login", () => {
  it("only follows paths inside the panel", () => {
    expect(safeNextPath("/imediato")).toBe("/imediato");
    expect(safeNextPath("/profissionais/12?aba=dados")).toBe("/profissionais/12?aba=dados");
    for (const unsafe of [null, "", "imediato", "//evil.com", "/\\evil.com", "https://evil.com", "/login"]) {
      expect(safeNextPath(unsafe), String(unsafe)).toBe("/");
    }
  });
});
