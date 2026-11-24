import { NextResponse } from "next/server";

import { getImmediateRequests } from "@/lib/immediateQueries";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (raw !== null) {
    if (!/^\d+$/.test(raw)) {
      return NextResponse.json({ error: "O limite deve ser um número inteiro." }, { status: 400 });
    }
    limit = Number(raw);
    if (limit < 1 || limit > MAX_LIMIT) {
      return NextResponse.json({ error: `O limite deve ficar entre 1 e ${MAX_LIMIT}.` }, { status: 400 });
    }
  }

  try {
    return NextResponse.json({ requests: await getImmediateRequests(limit) });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os atendimentos imediatos." }, { status: 500 });
  }
}
