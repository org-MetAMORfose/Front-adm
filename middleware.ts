import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/adminSession";
import { APP_BASE_PATH } from "@/lib/basePath";

/*
 * Login screen in front of the whole panel once ADMIN_USER and ADMIN_PASSWORD are set: pages without a session go to
 * /login, API routes answer 401. Until then the panel behaves as before, except the immediate care screens and routes:
 * they show who asked for psychological care and release professionals, so they stay closed without a password.
 */

const IMMEDIATE_PATHS = [/^\/imediato(\/|$)/, /^\/api\/admin\/immediate(\/|$)/, /^\/api\/admin\/professionals\/[^/]+\/immediate-/];
const PUBLIC_PATHS = new Set(["/api/health", "/api/auth/login", "/api/auth/logout"]);
const LOGIN_PATH = "/login";

function withoutBasePath(pathname: string): string {
  if (pathname === APP_BASE_PATH) return "/";
  return pathname.startsWith(`${APP_BASE_PATH}/`) ? pathname.slice(APP_BASE_PATH.length) : pathname;
}

/**
 * The login screen is served in place of the page (a rewrite, not a redirect): behind nginx the host Next sees may be
 * the container's, so an absolute redirect could send the browser to the wrong address.
 */
function showLogin(request: NextRequest, next: string): NextResponse {
  const query = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
  return NextResponse.rewrite(new URL(`${APP_BASE_PATH}${LOGIN_PATH}${query}`, request.url));
}

export async function middleware(request: NextRequest) {
  const path = withoutBasePath(request.nextUrl.pathname);
  if (PUBLIC_PATHS.has(path)) return NextResponse.next();

  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) {
    if (IMMEDIATE_PATHS.some((pattern) => pattern.test(path))) {
      return new NextResponse("Defina ADMIN_USER e ADMIN_PASSWORD no painel para usar o acolhimento imediato.", { status: 503 });
    }
    return NextResponse.next();
  }

  // The login page itself decides what to do with someone already signed in (it sends them to the panel).
  if (path === LOGIN_PATH) return NextResponse.next();
  if (await verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value, user, password)) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Sessão expirada. Entre de novo no painel." }, { status: 401 });
  }
  return showLogin(request, `${path}${request.nextUrl.search}`);
}

export const config = {
  // With basePath, "/" is the only pattern that covers the bare "/admin" home page.
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"]
};
