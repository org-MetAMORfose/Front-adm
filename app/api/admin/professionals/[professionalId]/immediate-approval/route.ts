import { NextResponse } from "next/server";

import { setImmediateApproval } from "@/lib/immediateAvailability";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ professionalId: string }>;
};

function errorFrom(body: unknown) {
  if (body && typeof body === "object") {
    const record = body as { detail?: unknown; error?: unknown };
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.error === "string") return record.error;
  }
  return "Não foi possível atualizar a liberação.";
}

export async function PATCH(request: Request, context: RouteContext) {
  const { professionalId } = await context.params;
  const id = Number(professionalId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Identificador de profissional inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "O corpo da requisição deve ser um JSON válido." }, { status: 400 });
  }
  const approved = body && typeof body === "object" ? (body as { approved?: unknown }).approved : undefined;
  if (typeof approved !== "boolean") {
    return NextResponse.json({ error: "Informe approved como true ou false." }, { status: 400 });
  }

  try {
    const result = await setImmediateApproval(id, approved);
    if (!result.ok) {
      return NextResponse.json({ error: errorFrom(result.body) }, { status: result.status });
    }
    return NextResponse.json(result.body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível atualizar a liberação." },
      { status: 500 }
    );
  }
}
