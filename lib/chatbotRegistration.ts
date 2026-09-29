import "server-only";

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function registrationUrl() {
  const url = process.env.CHATBOT_CREATE_PROFESSIONAL_URL;
  if (!url) throw new Error("CHATBOT_CREATE_PROFESSIONAL_URL ainda não foi configurada.");
  return url;
}

async function registerThroughChatbot(payload: Record<string, unknown>) {
  const response = await fetch(registrationUrl(), {
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

export function registerProfessionalThroughChatbot(payload: Record<string, unknown>) {
  return registerThroughChatbot(payload);
}
