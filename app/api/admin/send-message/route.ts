import { NextResponse } from "next/server";

import { sendTextMessage } from "@/lib/messageSender";
import { prisma } from "@/lib/db";
import type { SendMessagePayload } from "@/types";

export const dynamic = "force-dynamic";

function isValidPayload(
  body: unknown
): body is SendMessagePayload & { person_id: number } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Record<string, unknown>;

  return (
    typeof candidate.person_id === "number" &&
    Number.isInteger(candidate.person_id) &&
    candidate.person_id > 0 &&
    typeof candidate.phone_number === "string" &&
    candidate.phone_number.trim().length > 0 &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      {
        error:
          "Payload must include person_id, phone_number and content."
      },
      { status: 400 }
    );
  }

  try {
    const person = await prisma.person.findUnique({
      where: { id: body.person_id },
      select: { phone_number: true, chat_mode: true }
    });

    if (!person || person.phone_number !== body.phone_number.trim()) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (person.chat_mode !== "MANUAL") {
      return NextResponse.json(
        { error: "A conversa precisa estar no modo Manual para enviar mensagens." },
        { status: 409 }
      );
    }

    const result = await sendTextMessage({
      phone_number: body.phone_number.trim(),
      content: body.content.trim()
    });

    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send message."
      },
      { status: 500 }
    );
  }
}
