import "server-only";

import type {
  PatientRegistrationPayload,
  ProfessionalRegistrationPayload,
  ProfessionalUpdatePayload
} from "@/types/matching";

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function chatbotBaseUrl() {
  const baseUrl = process.env.CHATBOT_FLOW_API_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("CHATBOT_FLOW_API_URL ainda não foi configurada.");
  return baseUrl;
}

function professionalRegistrationUrl() {
  return process.env.CHATBOT_CREATE_PROFESSIONAL_URL?.replace(/\/$/, "")
    || `${chatbotBaseUrl()}/professionals`;
}

function professionalBody(payload: ProfessionalRegistrationPayload | ProfessionalUpdatePayload) {
  return {
    name: payload.name,
    phone: payload.phone_number,
    email: payload.email,
    area: payload.area,
    birth_date: payload.birth_date || null,
    background: payload.background || null,
    video_platform: payload.video_platform || null,
    gender: payload.gender || null,
    minority_group: payload.minority_group || null
  };
}

async function request(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  return {
    ok: response.ok,
    status: response.status,
    body: await readResponseBody(response)
  };
}

export function registerProfessionalThroughChatbot(payload: ProfessionalRegistrationPayload) {
  return request(professionalRegistrationUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(professionalBody(payload))
  });
}

export function updateProfessionalThroughChatbot(
  professionalId: number,
  payload: ProfessionalUpdatePayload
) {
  const apiKey = process.env.CHATBOT_API_KEY;
  if (!apiKey) throw new Error("CHATBOT_API_KEY ainda não foi configurada.");
  return request(`${chatbotBaseUrl()}/professionals/${professionalId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "X-Chatbot-Api-Key": apiKey
    },
    body: JSON.stringify(professionalBody(payload))
  });
}

export function registerPatientsThroughChatbot(payloads: PatientRegistrationPayload[]) {
  const body = payloads.map((payload) => ({
    name: payload.name,
    phone: payload.phone_number,
    area: payload.area,
    birth_date: payload.birth_date || null
  }));
  return request(`${chatbotBaseUrl()}/patients`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body.length === 1 ? body[0] : body)
  });
}
