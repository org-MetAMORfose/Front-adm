import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, createAdminSession, safeEqual } from "@/lib/adminSession";
import { APP_BASE_PATH } from "@/lib/basePath";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WRONG = "Usuário ou senha incorretos.";

export async function POST(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) {
    return NextResponse.json({ error: "O login do painel ainda não foi configurado (ADMIN_USER e ADMIN_PASSWORD)." }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const givenUser = typeof fields.user === "string" ? fields.user.trim() : "";
  const givenPassword = typeof fields.password === "string" ? fields.password : "";
  // Both comparisons always run, so the response time does not tell which half was wrong.
  const userMatches = safeEqual(givenUser, user);
  const passwordMatches = safeEqual(givenPassword, password);
  if (!userMatches || !passwordMatches) {
    return NextResponse.json({ error: WRONG }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSession(user, password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: APP_BASE_PATH,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  });
  return response;
}
