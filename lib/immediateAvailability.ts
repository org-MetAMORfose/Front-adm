import "server-only";

export type ChatbotResult = { ok: boolean; status: number; body: unknown };

function chatbotBaseUrl() {
  const baseUrl = process.env.CHATBOT_FLOW_API_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("CHATBOT_FLOW_API_URL ainda não foi configurada.");
  return baseUrl;
}

export async function setImmediateAvailability(professionalId: number, available: boolean): Promise<ChatbotResult> {
  const baseUrl = chatbotBaseUrl();
  const apiKey = process.env.CHATBOT_API_KEY;
  if (!apiKey) throw new Error("CHATBOT_API_KEY ainda não foi configurada.");

  const response = await fetch(`${baseUrl}/immediate/professionals/${professionalId}/availability`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "X-Chatbot-Api-Key": apiKey },
    body: JSON.stringify({ available }),
    cache: "no-store"
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  return { ok: response.ok, status: response.status, body };
}
