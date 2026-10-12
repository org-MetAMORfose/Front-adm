import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { registerPatientsThroughChatbot } from "@/lib/chatbotRegistration";
import { isValidPastDateOnly, normalizeSearch } from "@/lib/matchingDomain";
import {
  isPsychotherapyArea,
  normalizeMatchingProfile,
  PSYCHOTHERAPY_APPROACHES,
  PSYCHOTHERAPY_SPECIALTIES
} from "@/lib/matchingProfile";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";
import type { PatientRegistrationPayload } from "@/types/matching";

function text(body: Record<string, unknown>, field: string): string {
  return typeof body[field] === "string" ? body[field].trim() : "";
}

function stringList(body: Record<string, unknown>, field: string): string[] {
  const value = body[field];
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string =>
    typeof item === "string" && item.trim().length > 0
  ).map((item) => item.trim()))];
}

function validatePatient(body: Record<string, unknown>, row: number) {
  const name = text(body, "name");
  const rawPhone = text(body, "phone_number");
  const birthDate = text(body, "birth_date");
  const area = text(body, "area");
  const psychotherapy = isPsychotherapyArea(area);
  const psychotherapyApproach = psychotherapy
    ? text(body, "psychotherapy_approach") || null
    : null;
  const psychotherapySpecialties = psychotherapy
    ? stringList(body, "psychotherapy_specialties")
    : [];
  const preferredGender = text(body, "preferred_gender") || null;
  const preferredRace = text(body, "preferred_race") || null;
  const rawLgbtPreference = body.prefers_lgbtqiapn_plus;
  const prefersLgbtqiapnPlus = typeof rawLgbtPreference === "boolean"
    ? rawLgbtPreference
    : null;
  const errors: string[] = [];

  if (name.length < 2) errors.push("nome inválido");
  if (!isValidBrazilianMobile(rawPhone)) errors.push("celular inválido");
  if (birthDate && !isValidPastDateOnly(birthDate)) errors.push("nascimento inválido");
  if (!area) errors.push("área ausente");
  if (psychotherapyApproach && !PSYCHOTHERAPY_APPROACHES.includes(
    psychotherapyApproach as (typeof PSYCHOTHERAPY_APPROACHES)[number]
  )) errors.push("abordagem de psicoterapia inválida");
  if (psychotherapySpecialties.some((specialty) => !PSYCHOTHERAPY_SPECIALTIES.includes(
    specialty as (typeof PSYCHOTHERAPY_SPECIALTIES)[number]
  ))) errors.push("especialidade de psicoterapia inválida");
  if (rawLgbtPreference !== undefined && rawLgbtPreference !== null
    && rawLgbtPreference !== "" && typeof rawLgbtPreference !== "boolean") {
    errors.push("preferência LGBTQIAPN+ inválida");
  }

  return {
    row,
    errors,
    payload: {
      name,
      phone_number: isValidBrazilianMobile(rawPhone)
        ? normalizeBrazilianPhone(rawPhone)
        : rawPhone,
      birth_date: birthDate || null,
      area,
      psychotherapy_approach: psychotherapyApproach,
      psychotherapy_specialties: psychotherapySpecialties,
      preferred_gender: preferredGender,
      preferred_race: preferredRace,
      prefers_lgbtqiapn_plus: prefersLgbtqiapnPlus
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
    select: {
      matching_profile: true,
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
      .flatMap((professional) => normalizeMatchingProfile(
        professional.matching_profile
      ).areas.map(normalizeSearch))
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
