import { NextResponse } from "next/server";

import { registerProfessionalThroughChatbot } from "@/lib/chatbotRegistration";
import { isValidPastDateOnly, PROFESSIONAL_BACKGROUND_MAX_LENGTH } from "@/lib/matchingDomain";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";
import type { ProfessionalRegistrationPayload } from "@/types/matching";

function text(body: Record<string, unknown>, field: string) {
  return typeof body[field] === "string" ? body[field].trim() : "";
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

  return {
    ok: true,
    value: {
      name,
      phone_number: normalizeBrazilianPhone(rawPhone),
      ...(birthDate ? { birth_date: birthDate } : {}),
      area,
      email,
      ...(background ? { background } : {}),
      ...(videoPlatform ? { video_platform: videoPlatform } : {}),
      ...(gender ? { gender } : {}),
      ...(minorityGroup ? { minority_group: minorityGroup } : {})
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
