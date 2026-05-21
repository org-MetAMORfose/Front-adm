import { NextResponse } from "next/server";

import { getProfessionalByPersonId } from "@/lib/queries";

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
    const professional = await getProfessionalByPersonId(parsedPersonId);

    return NextResponse.json({ professional });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch professional."
      },
      { status: 500 }
    );
  }
}
