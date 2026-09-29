import { NextResponse } from "next/server";

import { getProfessionalDetail } from "@/lib/matchingQueries";

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
