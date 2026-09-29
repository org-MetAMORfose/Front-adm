import { matching_cycle_type } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return invalid("O corpo da requisição deve ser um JSON válido.");
  }

  const professionalId = Number(body.professional_id);
  const promisedPatients = Number(body.promised_patients);
  const type = body.type;
  const startsAt = new Date(String(body.starts_at ?? ""));
  const deadlineAt = new Date(String(body.deadline_at ?? ""));

  if (!Number.isInteger(professionalId) || professionalId <= 0) {
    return invalid("Selecione um profissional cadastrado.");
  }

  if (!Object.values(matching_cycle_type).includes(type as matching_cycle_type)) {
    return invalid("Selecione um tipo de ciclo válido.");
  }

  if (!Number.isInteger(promisedPatients) || promisedPatients <= 0) {
    return invalid("A quantidade deve ser um número inteiro positivo.");
  }

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(deadlineAt.getTime())) {
    return invalid("Informe datas válidas para início e prazo.");
  }

  if (deadlineAt <= startsAt) {
    return invalid("O prazo final deve ser posterior ao início.");
  }

  try {
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true }
    });

    if (!professional) {
      return invalid("O profissional selecionado não existe mais.");
    }

    const cycle = await prisma.matching_cycle.create({
      data: {
        professional_id: professionalId,
        type: type as matching_cycle_type,
        promised_patients: promisedPatients,
        starts_at: startsAt,
        deadline_at: deadlineAt,
        created_at: new Date()
      }
    });

    return NextResponse.json(
      {
        cycle: {
          ...cycle,
          starts_at: cycle.starts_at.toISOString(),
          deadline_at: cycle.deadline_at.toISOString(),
          cancelled_at: cycle.cancelled_at?.toISOString() ?? null,
          created_at: cycle.created_at.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o ciclo."
      },
      { status: 500 }
    );
  }
}
