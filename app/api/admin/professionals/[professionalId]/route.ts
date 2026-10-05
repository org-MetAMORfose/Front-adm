import { NextResponse } from "next/server";

import { updateProfessionalThroughChatbot } from "@/lib/chatbotRegistration";
import { getProfessionalDetail } from "@/lib/matchingQueries";
import type { ProfessionalUpdatePayload } from "@/types/matching";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ professionalId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { professionalId } = await context.params;
  const id = Number(professionalId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Identificador de profissional inválido." },
      { status: 400 }
    );
  }

  try {
    const professional = await getProfessionalDetail(id);

    if (!professional) {
      return NextResponse.json(
        { error: "Profissional não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ professional });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o profissional."
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { professionalId } = await context.params;
  const id = Number(professionalId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Identificador de profissional inválido." }, { status: 400 });
  }

  let body: ProfessionalUpdatePayload;
  try {
    body = await request.json() as ProfessionalUpdatePayload;
  } catch {
    return NextResponse.json({ error: "O corpo da requisição deve ser um JSON válido." }, { status: 400 });
  }

  try {
    const external = await updateProfessionalThroughChatbot(id, body);
    if (!external.ok) {
      const detail = external.body && typeof external.body === "object" && "detail" in external.body
        ? String(external.body.detail)
        : "O chatbot recusou a atualização do profissional.";
      return NextResponse.json({ error: detail }, { status: external.status });
    }
    return NextResponse.json({ ok: true, chatbot: external.body });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível atualizar o profissional." },
      { status: 503 }
    );
  }
}
