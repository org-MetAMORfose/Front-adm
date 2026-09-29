import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/admin/messages/matching-followup/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("matching follow-up template", () => {
  it("rejects an invalid patient phone", async () => {
    const response = await POST(new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patient_phone: "123",
        professional_phone: "5511988888888"
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "O celular do paciente é inválido."
    });
  });

  it("normalizes both phones and forwards the template request", async () => {
    vi.stubEnv(
      "MATCHING_FOLLOWUP_TEMPLATE_URL",
      "http://localhost:8000/whatsapp/templates/acompanhamento_emparelhamento"
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patient_phone: "+55 (11) 99999-9999",
        professional_phone: "5511988888888"
      })
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/whatsapp/templates/acompanhamento_emparelhamento",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          patient_phone: "5511999999999",
          professional_phone: "5511988888888"
        })
      })
    );
  });
});
