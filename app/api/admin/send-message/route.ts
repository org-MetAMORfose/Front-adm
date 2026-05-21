import { NextResponse } from "next/server";

import { sendTextMessage } from "@/lib/messageSender";
import type { SendMessagePayload } from "@/types";

export const dynamic = "force-dynamic";

function isValidPayload(body: unknown): body is SendMessagePayload {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Record<string, unknown>;

  return (
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
          "Payload must include phone_number and content as non-empty strings."
      },
      { status: 400 }
    );
  }

  try {
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
