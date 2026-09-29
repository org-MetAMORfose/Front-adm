import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import type { CreateCyclePayload, MatchingCycleType } from "@/types/matching";

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCycleType(value: unknown): value is MatchingCycleType {
  return value === "REGULAR" || value === "REPLACEMENT";
}

function parseCreateCyclePayload(
  value: unknown
): ValidationResult<CreateCyclePayload> {
  if (!isRecord(value)) {
    return { ok: false, error: "O corpo deve ser um objeto JSON válido." };
  }

  const professionalId = value.professional_id;
  const promisedPatients = value.promised_patients;
  const type = value.type;
  const startsAtValue = value.starts_at;
  const deadlineAtValue = value.deadline_at;

  if (typeof professionalId !== "number" || !Number.isInteger(professionalId) || professionalId <= 0) {
    return { ok: false, error: "Selecione um profissional cadastrado." };
  }
  if (!isCycleType(type)) {
    return { ok: false, error: "Selecione um tipo de ciclo válido." };
  }
  if (typeof promisedPatients !== "number" || !Number.isInteger(promisedPatients) || promisedPatients <= 0) {
    return { ok: false, error: "A quantidade deve ser um número inteiro positivo." };
  }
  if (typeof startsAtValue !== "string" || typeof deadlineAtValue !== "string") {
    return { ok: false, error: "Informe datas válidas para início e prazo." };
  }

  const startsAt = new Date(startsAtValue);
  const deadlineAt = new Date(deadlineAtValue);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(deadlineAt.getTime())) {
    return { ok: false, error: "Informe datas válidas para início e prazo." };
  }
  if (deadlineAt <= startsAt) {
    return { ok: false, error: "O prazo final deve ser posterior ao início." };
  }

  return { ok: true, value: { professional_id: professionalId, type, promised_patients: promisedPatients, starts_at: startsAt.toISOString(), deadline_at: deadlineAt.toISOString() } };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalid("O corpo da requisição deve ser um JSON válido.");
  }

  const parsed = parseCreateCyclePayload(body);
  if (!parsed.ok) return invalid(parsed.error);
  const payload = parsed.value;
  const startsAt = new Date(payload.starts_at);
  const deadlineAt = new Date(payload.deadline_at);

  try {
    const professional = await prisma.professional.findUnique({
      where: { id: payload.professional_id },
      select: { id: true }
    });

    if (!professional) {
      return invalid("O profissional selecionado não existe mais.");
    }

    const cycle = await prisma.matching_cycle.create({
      data: {
        professional_id: payload.professional_id,
        type: payload.type,
        promised_patients: payload.promised_patients,
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
