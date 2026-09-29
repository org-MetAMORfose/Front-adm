import { NextResponse } from "next/server";

import { sendMatchingFollowup } from "@/lib/matchingFollowup";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Informe os telefones do paciente e do profissional." }, { status: 400 });
  }

  const candidate = body as Record<string, unknown>;
  const patientPhone = typeof candidate.patient_phone === "string"
    ? candidate.patient_phone
    : "";
  const professionalPhone = typeof candidate.professional_phone === "string"
    ? candidate.professional_phone
    : "";

  if (!isValidBrazilianMobile(patientPhone)) {
    return NextResponse.json({ error: "O celular do paciente é inválido." }, { status: 400 });
  }
  if (!isValidBrazilianMobile(professionalPhone)) {
    return NextResponse.json({ error: "O celular do profissional é inválido." }, { status: 400 });
  }

  try {
    const result = await sendMatchingFollowup({
      patient_phone: normalizeBrazilianPhone(patientPhone),
      professional_phone: normalizeBrazilianPhone(professionalPhone)
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "O serviço de WhatsApp recusou o envio.", upstream_status: result.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Não foi possível enviar a mensagem de reposição."
      },
      { status: 503 }
    );
  }
}
