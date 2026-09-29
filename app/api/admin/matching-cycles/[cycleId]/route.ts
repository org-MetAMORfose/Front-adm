import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { cycleId } = await context.params;
  const id = Number(cycleId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Identificador de ciclo inválido." },
      { status: 400 }
    );
  }

  try {
    const cycle = await prisma.matching_cycle.findUnique({
      where: { id },
      select: { id: true, cancelled_at: true }
    });

    if (!cycle) {
      return NextResponse.json(
        { error: "Ciclo não encontrado." },
        { status: 404 }
      );
    }

    if (cycle.cancelled_at) {
      return NextResponse.json({
        cycle: {
          id: cycle.id,
          cancelled_at: cycle.cancelled_at.toISOString()
        }
      });
    }

    const cancelled = await prisma.matching_cycle.update({
      where: { id },
      data: { cancelled_at: new Date() },
      select: { id: true, cancelled_at: true }
    });

    return NextResponse.json({
      cycle: {
        id: cancelled.id,
        cancelled_at: cancelled.cancelled_at?.toISOString() ?? null
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível cancelar o ciclo." },
      { status: 500 }
    );
  }
}
