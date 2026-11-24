import { NextResponse, type NextRequest } from "next/server";

import { APP_BASE_PATH } from "@/lib/basePath";

/*
 * Login (HTTP Basic) in front of the whole panel once ADMIN_USER and ADMIN_PASSWORD are set.
 * Until then the panel behaves as before, except the immediate care screens and routes: they show
 * who asked for psychological care and release professionals, so they stay closed without a password.
 */

const IMMEDIATE_PATHS = [/^\/imediato(\/|$)/, /^\/api\/admin\/immediate(\/|$)/, /^\/api\/admin\/professionals\/[^/]+\/immediate-/];
const PUBLIC_PATHS = new Set(["/api/health"]);

function withoutBasePath(pathname: string): string {
  if (pathname === APP_BASE_PATH) return "/";
  return pathname.startsWith(`${APP_BASE_PATH}/`) ? pathname.slice(APP_BASE_PATH.length) : pathname;
}

function safeEqual(received: string, expected: string): boolean {
  const length = Math.max(received.length, expected.length);
  let difference = received.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (received.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function decodeBasic(header: string | null): { user: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const bytes = Uint8Array.from(atob(header.slice("Basic ".length).trim()), (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
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

  const credentials = decodeBasic(request.headers.get("authorization"));
  // Both comparisons always run, so the response time does not tell which half was wrong.
  const userMatches = safeEqual(credentials?.user ?? "", user);
  const passwordMatches = safeEqual(credentials?.password ?? "", password);
  if (credentials && userMatches && passwordMatches) return NextResponse.next();

  return new NextResponse("Login necessário.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Painel MetAMORfose", charset="UTF-8"' }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
