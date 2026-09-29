import "server-only";

type FollowupPayload = {
  patient_phone: string;
  professional_phone: string;
};

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function sendMatchingFollowup(payload: FollowupPayload) {
  const url = process.env.MATCHING_FOLLOWUP_TEMPLATE_URL?.trim();
  if (!url) {
    throw new Error("MATCHING_FOLLOWUP_TEMPLATE_URL ainda não foi configurada.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readResponseBody(response)
  };
}
