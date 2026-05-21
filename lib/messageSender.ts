import "server-only";

import type { SendMessagePayload } from "@/types";

type ExternalResponse = {
  ok: boolean;
  status: number;
  body: unknown;
};

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function sendTextMessage(
  payload: SendMessagePayload
): Promise<ExternalResponse> {
  const sendMessageUrl = process.env.SEND_MESSAGE_URL;

  if (!sendMessageUrl) {
    throw new Error("SEND_MESSAGE_URL is not configured.");
  }

  const response = await fetch(sendMessageUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readResponseBody(response)
  };
}

export async function approveProfessional(professionalId: number) {
  const approveUrl = process.env.APPROVE_PROFESSIONAL_URL;

  if (!approveUrl) {
    throw new Error("APPROVE_PROFESSIONAL_URL ainda não foi definido.");
  }

  const url = approveUrl.includes("{professionalId}")
    ? approveUrl.replace("{professionalId}", String(professionalId))
    : approveUrl;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      professional_id: professionalId
    })
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readResponseBody(response)
  };
}

export async function sendImageMessage() {
  // TODO: Integrar com o endpoint real de envio de imagem quando estiver definido.
  throw new Error("Envio de imagem ainda nao foi implementado.");
}
