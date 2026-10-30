import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ professionals: vi.fn(), register: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { professional: { findMany: mocks.professionals } } }));
vi.mock("@/lib/chatbotRegistration", () => ({ registerPatientsThroughChatbot: mocks.register }));

import { POST } from "@/app/api/admin/registrations/patient/route";

const base = { name: "Ana", phone_number: "5511999999999", area: "Psicoterapia" };
function request(body: unknown) {
  return new Request("http://localhost/api/admin/registrations/patient", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
}

describe("patient registration preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.professionals.mockResolvedValue([{
      matching_profile: { areas: ["Psicoterapia", "Área nova"] },
      matching_cycle: [{ promised_patients: 2, _count: { matching_slot: 0 } }]
    }]);
    mocks.register.mockResolvedValue({ ok: true, status: 201, body: {} });
  });

  it("normalizes form labels and accepts arbitrary specialties without forwarding identity", async () => {
    const response = await POST(request({ ...base, psychotherapy_approach: "Psicoterapia TCC",
      psychotherapy_specialties: ["LGBTQIAPN+", "Boderline", "Luto", "luto"],
      preferred_gender: "Não binária", preferred_race: "Negro", prefers_lgbtqiapn_plus: true }));
    expect(response.status).toBe(200);
    expect(mocks.register).toHaveBeenCalledWith([{
      ...base, birth_date: null, psychotherapy_approach: "TCC",
      psychotherapy_specialties: ["LGBTQIAPN+", "Boderline", "Luto"],
      preferred_gender: "Não binário", preferred_race: "Negra"
    }]);
  });

  it("accepts all optional fields empty", async () => {
    expect((await POST(request(base))).status).toBe(200);
    expect(mocks.register).toHaveBeenCalledWith([{ ...base, birth_date: null, psychotherapy_approach: null,
      psychotherapy_specialties: [], preferred_gender: null, preferred_race: null }]);
  });

  it("keeps arbitrary areas and ignores psychotherapy fields for other areas", async () => {
    expect((await POST(request({ ...base, area: "Área nova", psychotherapy_approach: "Psicoterapia TCC",
      psychotherapy_specialties: ["Luto"] }))).status).toBe(200);
    expect(mocks.register.mock.calls[0][0][0]).toMatchObject({ area: "Área nova", psychotherapy_approach: null,
      psychotherapy_specialties: [] });
  });

  it("still rejects unknown approaches", async () => {
    expect((await POST(request({ ...base, psychotherapy_approach: "Outra" }))).status).toBe(400);
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
