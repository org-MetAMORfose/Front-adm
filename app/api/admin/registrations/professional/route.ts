import { NextResponse } from "next/server";

import { registerProfessionalThroughChatbot } from "@/lib/chatbotRegistration";
import { isValidPastDateOnly, PROFESSIONAL_BACKGROUND_MAX_LENGTH } from "@/lib/matchingDomain";
import {
  hasPsychotherapyArea,
  PSYCHOTHERAPY_APPROACHES,
  PSYCHOTHERAPY_SPECIALTIES,
  uniqueAdditionalAreas
} from "@/lib/matchingProfile";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";
import type { ProfessionalRegistrationPayload } from "@/types/matching";

function text(body: Record<string, unknown>, field: string) {
  return typeof body[field] === "string" ? body[field].trim() : "";
}

function stringList(body: Record<string, unknown>, field: string): string[] {
  const value = body[field];
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string =>
    typeof item === "string" && item.trim().length > 0
  ).map((item) => item.trim()))];
}

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProfessionalRegistration(
  value: unknown
): ValidationResult<ProfessionalRegistrationPayload> {
  if (!isRecord(value)) {
    return { ok: false, error: "O corpo deve ser um objeto JSON válido." };
  }

  const name = text(value, "name");
  const rawPhone = text(value, "phone_number");
  const birthDate = text(value, "birth_date");
  const area = text(value, "area");
  const email = text(value, "email");
  const background = text(value, "background");
  const videoPlatform = text(value, "video_platform");
  const gender = text(value, "gender");
  const minorityGroup = text(value, "minority_group");
  const areas = uniqueAdditionalAreas(area, stringList(value, "areas"));
  const psychotherapy = hasPsychotherapyArea([area, ...areas]);
  const approaches = psychotherapy ? stringList(value, "approaches") : [];
  const psychotherapySpecialties = psychotherapy
    ? stringList(value, "psychotherapy_specialties")
    : [];
  const race = text(value, "race") || null;
  const rawLgbtqiapnPlus = value.lgbtqiapn_plus;
  const lgbtqiapnPlus = typeof rawLgbtqiapnPlus === "boolean"
    ? rawLgbtqiapnPlus
    : null;

  if (name.length < 2) return { ok: false, error: "Informe o nome completo do profissional." };
  if (!isValidBrazilianMobile(rawPhone)) {
    return { ok: false, error: "Informe um celular brasileiro válido." };
  }
  if (birthDate && !isValidPastDateOnly(birthDate)) {
    return { ok: false, error: "Informe uma data de nascimento válida." };
  }
  if (!area) return { ok: false, error: "Informe a área de atuação." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (background.length > PROFESSIONAL_BACKGROUND_MAX_LENGTH) {
    return { ok: false, error: `O background deve ter no máximo ${PROFESSIONAL_BACKGROUND_MAX_LENGTH} caracteres.` };
  }
  if (approaches.some((approach) => !PSYCHOTHERAPY_APPROACHES.includes(
    approach as (typeof PSYCHOTHERAPY_APPROACHES)[number]
  ))) return { ok: false, error: "Informe somente abordagens válidas." };
  if (psychotherapySpecialties.some((specialty) => !PSYCHOTHERAPY_SPECIALTIES.includes(
    specialty as (typeof PSYCHOTHERAPY_SPECIALTIES)[number]
  ))) return { ok: false, error: "Informe somente especialidades válidas." };
  if (rawLgbtqiapnPlus !== undefined && rawLgbtqiapnPlus !== null
    && rawLgbtqiapnPlus !== "" && typeof rawLgbtqiapnPlus !== "boolean") {
    return { ok: false, error: "Informe uma identificação LGBTQIAPN+ válida." };
  }

  return {
    ok: true,
    value: {
      name,
      phone_number: normalizeBrazilianPhone(rawPhone),
      birth_date: birthDate || null,
      area,
      email,
      background: background || null,
      video_platform: videoPlatform || null,
      gender: gender || null,
      minority_group: minorityGroup || null,
      areas,
      approaches,
      psychotherapy_specialties: psychotherapySpecialties,
      race,
      lgbtqiapn_plus: lgbtqiapnPlus
    }
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalid("O corpo da requisição deve ser um JSON válido.");
  }

  const parsed = parseProfessionalRegistration(body);
  if (!parsed.ok) return invalid(parsed.error);
  const payload = parsed.value;

  try {
    const external = await registerProfessionalThroughChatbot(payload);

    if (!external.ok) {
      return NextResponse.json(
        {
          error: "O chatbot recusou o cadastro do profissional.",
          chatbot_status: external.status
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, chatbot: external.body });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível cadastrar o profissional."
      },
      { status: 503 }
    );
  }
}
