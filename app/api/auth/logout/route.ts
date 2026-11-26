import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/adminSession";
import { APP_BASE_PATH } from "@/lib/basePath";

export const dynamic = "force-dynamic";

/** The "Sair" button posts a plain form here; a relative Location keeps the public host behind nginx. */
export async function POST() {
  const response = new NextResponse(null, { status: 303, headers: { Location: `${APP_BASE_PATH}/login` } });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: APP_BASE_PATH,
    maxAge: 0
  });
  return response;
}
