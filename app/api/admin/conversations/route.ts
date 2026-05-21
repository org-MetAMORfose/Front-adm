import { NextResponse } from "next/server";

import { getConversations } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await getConversations();

    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch conversations."
      },
      { status: 500 }
    );
  }
}
