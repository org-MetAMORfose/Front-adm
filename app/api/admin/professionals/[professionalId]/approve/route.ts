import { NextResponse } from "next/server";

import { approveProfessional } from "@/lib/messageSender";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    professionalId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { professionalId } = await context.params;
  const parsedProfessionalId = Number(professionalId);

  if (!Number.isInteger(parsedProfessionalId) || parsedProfessionalId <= 0) {
    return NextResponse.json(
      { error: "Invalid professionalId." },
      { status: 400 }
    );
  }

  try {
    const result = await approveProfessional(parsedProfessionalId);

    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to approve professional."
      },
      { status: 500 }
    );
  }
}
