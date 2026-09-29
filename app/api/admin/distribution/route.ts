import { NextResponse } from "next/server";

import { getDistributionData } from "@/lib/matchingQueries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getDistributionData());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a distribuição."
      },
      { status: 500 }
    );
  }
}
