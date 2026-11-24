import "server-only";

export type ChatbotResult = { ok: boolean; status: number; body: unknown };

function chatbotBaseUrl() {
  const baseUrl = process.env.CHATBOT_FLOW_API_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("CHATBOT_FLOW_API_URL ainda não foi configurada.");
  return baseUrl;
}

async function patchProfessional(professionalId: number, path: "availability" | "approval", body: object): Promise<ChatbotResult> {
  const baseUrl = chatbotBaseUrl();
  const apiKey = process.env.CHATBOT_API_KEY;
  if (!apiKey) throw new Error("CHATBOT_API_KEY ainda não foi configurada.");

  const response = await fetch(`${baseUrl}/immediate/professionals/${professionalId}/${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "X-Chatbot-Api-Key": apiKey },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

export function setImmediateAvailability(professionalId: number, available: boolean): Promise<ChatbotResult> {
  return patchProfessional(professionalId, "availability", { available });
}

/** The team releases a psychologist for immediate care after checking the CRP; withdrawing also switches availability off. */
export function setImmediateApproval(professionalId: number, approved: boolean): Promise<ChatbotResult> {
  return patchProfessional(professionalId, "approval", { approved });
}
