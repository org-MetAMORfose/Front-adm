import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { registerPatientsThroughChatbot } from "@/lib/chatbotRegistration";
import { isValidPastDateOnly, normalizeSearch } from "@/lib/matchingDomain";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";
import type { PatientRegistrationPayload } from "@/types/matching";

function text(body: Record<string, unknown>, field: string): string {
  return typeof body[field] === "string" ? body[field].trim() : "";
}

function validatePatient(body: Record<string, unknown>, row: number) {
  const name = text(body, "name");
  const rawPhone = text(body, "phone_number");
  const birthDate = text(body, "birth_date");
  const area = text(body, "area");
  const errors: string[] = [];

  if (name.length < 2) errors.push("nome inválido");
  if (!isValidBrazilianMobile(rawPhone)) errors.push("celular inválido");
  if (birthDate && !isValidPastDateOnly(birthDate)) errors.push("nascimento inválido");
  if (!area) errors.push("área ausente");

  return {
    row,
    errors,
    payload: {
      name,
      phone_number: isValidBrazilianMobile(rawPhone)
        ? normalizeBrazilianPhone(rawPhone)
        : rawPhone,
      ...(birthDate ? { birth_date: birthDate } : {}),
      area
    } satisfies PatientRegistrationPayload
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "O corpo da requisição deve ser um JSON válido." },
      { status: 400 }
    );
  }

  const records = typeof body === "object" && body !== null && "patients" in body
    ? (body as { patients?: unknown }).patients
    : [body];
  if (!Array.isArray(records) || records.length === 0 || records.length > 200) {
    return NextResponse.json(
      { error: "Envie entre 1 e 200 pacientes por lote." },
      { status: 400 }
    );
  }

  const validated = records.map((record, index) =>
    validatePatient(
      typeof record === "object" && record !== null
        ? record as Record<string, unknown>
        : {},
      index + 1
    )
  );
  const invalidRows = validated.filter((patient) => patient.errors.length > 0);
  if (invalidRows.length > 0) {
    return NextResponse.json(
      { error: "Existem pacientes com dados inválidos.", rows: invalidRows },
      { status: 400 }
    );
  }

  const phones = validated.map((patient) => patient.payload.phone_number);
  if (new Set(phones).size !== phones.length) {
    return NextResponse.json(
      { error: "O lote possui celulares repetidos." },
      { status: 400 }
    );
  }

  const now = new Date();
  const availableProfessionals = await prisma.professional.findMany({
    where: { area: { in: validated.map((patient) => patient.payload.area) } },
    select: {
      area: true,
      matching_cycle: {
        where: {
          cancelled_at: null,
          starts_at: { lte: now },
          deadline_at: { gte: now }
        },
        select: {
          promised_patients: true,
          _count: { select: { matching_slot: true } }
        }
      }
    }
  });
  const activeAreaKeys = new Set(
    availableProfessionals
      .filter((professional) => professional.matching_cycle.some(
        (cycle) => cycle._count.matching_slot < cycle.promised_patients
      ))
      .map((professional) => normalizeSearch(professional.area))
  );
  const unavailableAreas = [...new Set(
    validated
      .map((patient) => patient.payload.area)
      .filter((area) => !activeAreaKeys.has(normalizeSearch(area)))
  )];
  if (unavailableAreas.length > 0) {
    return NextResponse.json(
      { error: `Áreas sem ciclo ativo: ${unavailableAreas.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const payloads = validated.map((patient) => patient.payload);
    const chatbot = await registerPatientsThroughChatbot(payloads);
    if (!chatbot.ok) {
      return NextResponse.json(
        { error: "O chatbot recusou o cadastro de pacientes.", chatbot_status: chatbot.status },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, count: payloads.length, chatbot: chatbot.body });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível cadastrar os pacientes."
      },
      { status: 503 }
    );
  }
}
