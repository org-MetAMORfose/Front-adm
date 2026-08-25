import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "ok", database: "connected" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", database: "unavailable" },
      {
        status: 503,
        headers: { "cache-control": "no-store" }
      }
    );
  }
}
