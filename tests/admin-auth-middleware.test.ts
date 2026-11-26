import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { APP_BASE_PATH } from "@/lib/basePath";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "@/lib/adminSession";
import { config, middleware } from "@/middleware";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie: `${ADMIN_SESSION_COOKIE}=${cookie}` } : {} });
}

function passes(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

/** The login screen is served in place (a rewrite): no redirect, so the public host behind nginx never matters. */
function loginShownFor(response: Response) {
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (!rewrite) return null;
  const url = new URL(rewrite);
  return `${url.pathname}${url.search}`;
}

function withPassword() {
  vi.stubEnv("ADMIN_USER", "equipe");
  vi.stubEnv("ADMIN_PASSWORD", "senha-forte");
}

describe("panel login", () => {
  it("without a password keeps the old panel open but closes the immediate care screens", async () => {
    vi.stubEnv("ADMIN_USER", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(passes(await middleware(request("/admin/profissionais")))).toBe(true);
    for (const path of ["/admin/imediato", "/admin/api/admin/immediate", "/admin/api/admin/professionals/3/immediate-approval"]) {
      expect((await middleware(request(path))).status).toBe(503);
    }
  });

  it("shows the login screen on pages without a session, remembering where the person was going", async () => {
    withPassword();
    expect(loginShownFor(await middleware(request("/admin")))).toBe("/admin/login");
    expect(loginShownFor(await middleware(request("/admin/profissionais/12?aba=dados")))).toBe(
      `/admin/login?next=${encodeURIComponent("/profissionais/12?aba=dados")}`
    );
  });

  it("answers API routes without a session with 401 instead of a redirect", async () => {
    withPassword();
    const response = await middleware(request("/admin/api/admin/immediate"));
    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets a valid session through and refuses tampered, expired or old-password sessions", async () => {
    withPassword();
    const session = await createAdminSession("equipe", "senha-forte");
    expect(passes(await middleware(request("/admin/imediato", session)))).toBe(true);
    expect(passes(await middleware(request("/admin/api/admin/immediate", session)))).toBe(true);

    const login = `/admin/login?next=${encodeURIComponent("/imediato")}`;
    const [expires, signature] = session.split(".");
    expect(loginShownFor(await middleware(request("/admin/imediato", `${Number(expires) + 999}.${signature}`)))).toBe(login);
    expect(loginShownFor(await middleware(request("/admin/imediato", "lixo")))).toBe(login);

    const old = await createAdminSession("equipe", "senha-antiga");
    expect(loginShownFor(await middleware(request("/admin/imediato", old)))).toBe(login);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(loginShownFor(await middleware(request("/admin/imediato", session)))).toBe(login);
  });

  it("keeps the login screen, the login route and the container health check public", async () => {
    withPassword();
    for (const path of ["/admin/login", "/admin/api/auth/login", "/admin/api/auth/logout", "/admin/api/health"]) {
      expect(passes(await middleware(request(path))), path).toBe(true);
    }
  });

});

describe("panel login coverage", () => {
  it("runs on the panel home page too, so the login shows before the empty screen", () => {
    for (const url of ["/admin", "/admin/", "/admin/imediato", "/admin/api/admin/conversations"]) {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath: APP_BASE_PATH }, url }), url).toBe(true);
    }
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath: APP_BASE_PATH }, url: "/admin/_next/static/chunk.js" })).toBe(false);
  });
});
