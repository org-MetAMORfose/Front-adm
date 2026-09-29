import { NextResponse } from "next/server";

import { registerProfessionalThroughChatbot } from "@/lib/chatbotRegistration";
import { isValidPastDateOnly, PROFESSIONAL_BACKGROUND_MAX_LENGTH } from "@/lib/matchingDomain";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";

function text(body: Record<string, unknown>, field: string) {
  return typeof body[field] === "string" ? body[field].trim() : "";
}

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

  const name = text(body, "name");
  const rawPhone = text(body, "phone_number");
  const birthDate = text(body, "birth_date");
  const cpf = text(body, "cpf").replace(/\D/g, "");
  const area = text(body, "area");
  const professionalRegister = text(body, "professional_register");
  const registerType = text(body, "register_type");
  const email = text(body, "email");
  const approach = text(body, "approach");
  const background = text(body, "background");
  const videoPlatform = text(body, "video_platform");
  const gender = text(body, "gender");
  const minorityGroup = text(body, "minority_group");

  if (name.length < 2) return invalid("Informe o nome completo do profissional.");
  if (!isValidBrazilianMobile(rawPhone)) {
    return invalid("Informe um celular brasileiro válido.");
  }
  if (birthDate && !isValidPastDateOnly(birthDate)) {
    return invalid("Informe uma data de nascimento válida.");
  }
  if (cpf && cpf.length !== 11) return invalid("O CPF deve conter 11 dígitos.");
  if (!area) return invalid("Informe a área de atuação.");
  if (!professionalRegister) return invalid("Informe o registro profissional.");
  if (!registerType) return invalid("Informe o tipo de registro.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return invalid("Informe um e-mail válido.");
  }
  if (background.length > PROFESSIONAL_BACKGROUND_MAX_LENGTH) {
    return invalid(`O background deve ter no máximo ${PROFESSIONAL_BACKGROUND_MAX_LENGTH} caracteres.`);
  }

  try {
    const external = await registerProfessionalThroughChatbot({
      name,
      phone_number: normalizeBrazilianPhone(rawPhone),
      ...(birthDate ? { birth_date: birthDate } : {}),
      ...(cpf ? { cpf } : {}),
      area,
      professional_register: professionalRegister,
      register_type: registerType,
      ...(approach ? { approach } : {}),
      ...(background ? { background } : {}),
      ...(videoPlatform ? { video_platform: videoPlatform } : {}),
      ...(email ? { email } : {}),
      ...(gender ? { gender } : {}),
      ...(minorityGroup ? { minority_group: minorityGroup } : {})
    });

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
