import { chatmode, chatstate } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ personId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { personId } = await context.params;
  const parsedPersonId = Number(personId);

  if (!Number.isInteger(parsedPersonId) || parsedPersonId <= 0) {
    return NextResponse.json({ error: "Invalid personId." }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid state update." }, { status: 400 });
  }

  const candidate = body as Record<string, unknown>;
  const hasMode = Object.prototype.hasOwnProperty.call(candidate, "chat_mode");
  const hasState = Object.prototype.hasOwnProperty.call(candidate, "chat_state");

  if (hasMode === hasState) {
    return NextResponse.json(
      { error: "Send exactly one of chat_mode or chat_state." },
      { status: 400 }
    );
  }

  const data: { chat_mode?: chatmode; chat_state?: chatstate | null } = {};

  if (hasMode) {
    if (!Object.values(chatmode).includes(candidate.chat_mode as chatmode)) {
      return NextResponse.json({ error: "Invalid chat_mode." }, { status: 400 });
    }
    data.chat_mode = candidate.chat_mode as chatmode;
  } else {
    if (
      candidate.chat_state !== null &&
      !Object.values(chatstate).includes(candidate.chat_state as chatstate)
    ) {
      return NextResponse.json({ error: "Invalid chat_state." }, { status: 400 });
    }
    data.chat_state = candidate.chat_state as chatstate | null;
  }

  try {
    const person = await prisma.person.update({
      where: { id: parsedPersonId },
      data,
      select: { id: true, chat_mode: true, chat_state: true }
    });

    return NextResponse.json({ person });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to update chat state." }, { status: 500 });
  }
}
