import { NextResponse } from "next/server";

import { getMessagesByPersonId } from "@/lib/queries";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    personId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { personId } = await context.params;
  const parsedPersonId = Number(personId);

  if (!Number.isInteger(parsedPersonId) || parsedPersonId <= 0) {
    return NextResponse.json({ error: "Invalid personId." }, { status: 400 });
  }

  try {
    const messages = await getMessagesByPersonId(parsedPersonId);

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch messages."
      },
      { status: 500 }
    );
  }
}
