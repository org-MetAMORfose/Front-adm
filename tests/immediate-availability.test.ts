import { afterEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/admin/professionals/[professionalId]/immediate-availability/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function patch(professionalId: string, body: unknown) {
  return PATCH(
    new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body)
    }),
    { params: Promise.resolve({ professionalId }) }
  );
}

function stubChatbot(status: number, body: unknown) {
  vi.stubEnv("CHATBOT_FLOW_API_URL", "http://chatbot:8000/");
  vi.stubEnv("CHATBOT_API_KEY", "chave");
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("PATCH immediate availability", () => {
  it("rejects an invalid professional id", async () => {
    const response = await patch("abc", { available: true });
    expect(response.status).toBe(400);
  });

  it("rejects a body without a boolean", async () => {
    const fetchMock = stubChatbot(200, {});
    expect((await patch("3", { available: "sim" })).status).toBe(400);
    expect((await patch("3", "{nope")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the flag to the chatbot with the API key", async () => {
    const fetchMock = stubChatbot(200, { professional_id: 3, available_for_immediate: true });
    const response = await patch("3", { available: true });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ professional_id: 3, available_for_immediate: true });
    expect(fetchMock).toHaveBeenCalledWith("http://chatbot:8000/immediate/professionals/3/availability", {
      method: "PATCH",
      headers: { "content-type": "application/json", "X-Chatbot-Api-Key": "chave" },
      body: JSON.stringify({ available: true }),
      cache: "no-store"
    });
  });

  it("passes the chatbot's error status through", async () => {
    stubChatbot(404, { detail: "Profissional não encontrado." });
    const response = await patch("99", { available: false });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Profissional não encontrado." });
  });

  it("fails clearly when the chatbot is not configured", async () => {
    vi.stubEnv("CHATBOT_FLOW_API_URL", "");
    vi.stubEnv("CHATBOT_API_KEY", "");
    const response = await patch("3", { available: true });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "CHATBOT_FLOW_API_URL ainda não foi configurada." });
  });
});
