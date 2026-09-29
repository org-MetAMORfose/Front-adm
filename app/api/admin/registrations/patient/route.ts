import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { invokeMatchingLambda } from "@/lib/matchingLambda";
import { isValidPastDateOnly, normalizeSearch } from "@/lib/matchingDomain";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";

type PatientPayload = {
  name: string;
  phone_number: string;
  birth_date: string;
  area: string;
  psychotherapy_approach?: string;
  professional_profile: string;
  price_range?: string;
};

function text(body: Record<string, unknown>, field: string): string {
  return typeof body[field] === "string" ? body[field].trim() : "";
}

function validatePatient(body: Record<string, unknown>, row: number) {
  const name = text(body, "name");
  const rawPhone = text(body, "phone_number");
  const birthDate = text(body, "birth_date");
  const area = text(body, "area");
  const approach = text(body, "psychotherapy_approach");
  const profile = text(body, "professional_profile") || "Sem preferência";
  const priceRange = text(body, "price_range");
  const errors: string[] = [];

  if (name.length < 2) errors.push("nome inválido");
  if (!isValidBrazilianMobile(rawPhone)) errors.push("celular inválido");
  if (!isValidPastDateOnly(birthDate)) errors.push("nascimento inválido");
  if (!area) errors.push("área ausente");

  return {
    row,
    errors,
    payload: {
      name,
      phone_number: isValidBrazilianMobile(rawPhone)
        ? normalizeBrazilianPhone(rawPhone)
        : rawPhone,
      birth_date: birthDate,
      area,
      ...(approach ? { psychotherapy_approach: approach } : {}),
      professional_profile: profile,
      ...(priceRange ? { price_range: priceRange } : {})
    } satisfies PatientPayload
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
  const availableAreas = await prisma.professional.findMany({
    where: {
      area: { in: validated.map((patient) => patient.payload.area) },
      matching_cycle: {
        some: {
          cancelled_at: null,
          starts_at: { lte: now },
          deadline_at: { gte: now }
        }
      }
    },
    select: { area: true },
    distinct: ["area"]
  });
  const activeAreaKeys = new Set(
    availableAreas.map((professional) => normalizeSearch(professional.area))
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
    const lambda = await invokeMatchingLambda(
      payloads.length === 1 ? payloads[0] : payloads
    );
    return NextResponse.json({ ok: true, count: payloads.length, lambda });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar os pacientes para o matching."
      },
      { status: 503 }
    );
  }
}
