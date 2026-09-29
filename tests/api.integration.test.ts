import { afterAll, describe, expect, it } from "vitest";

import { GET as getConversations } from "@/app/api/admin/conversations/route";
import { GET as getDistribution } from "@/app/api/admin/distribution/route";
import { GET as getMessages } from "@/app/api/admin/conversations/[personId]/messages/route";
import { GET as getProfessional } from "@/app/api/admin/person/[personId]/professional/route";
import { GET as getProfessionalDetail } from "@/app/api/admin/professionals/[professionalId]/route";
import { closeDatabase } from "@/lib/db";
import { getAnyPersonId } from "@/lib/queries";

const runApiTests = process.env.DATABASE_URL ? describe : describe.skip;

runApiTests("admin API integration", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("GET /api/admin/conversations returns 200", async () => {
    const response = await getConversations();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toHaveProperty("conversations");
  });

  it("GET messages for an existing person returns 200", async (context) => {
    const personId = await getAnyPersonId();

    if (!personId) {
      context.skip();
    }

    const response = await getMessages(
      new Request(`http://localhost/api/admin/conversations/${personId}/messages`),
      {
        params: Promise.resolve({
          personId: String(personId)
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toHaveProperty("messages");
  });

  it("GET professional for an existing person returns 200", async (context) => {
    const personId = await getAnyPersonId();

    if (!personId) {
      context.skip();
    }

    const response = await getProfessional(
      new Request(`http://localhost/api/admin/person/${personId}/professional`),
      {
        params: Promise.resolve({
          personId: String(personId)
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toHaveProperty("professional");
  });

  it("GET /api/admin/distribution reads matching data", async () => {
    const response = await getDistribution();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("metrics");
    expect(body).toHaveProperty("professionals");
    expect(body).toHaveProperty("active_areas");
  });

  it("GET professional matching detail returns the selected professional", async (context) => {
    const distributionResponse = await getDistribution();
    const distribution = (await distributionResponse.json()) as {
      professionals: Array<{ id: number }>;
    };
    const professional = distribution.professionals[0];

    if (!professional) context.skip();

    const response = await getProfessionalDetail(
      new Request(
        `http://localhost/api/admin/professionals/${professional.id}`
      ),
      {
        params: Promise.resolve({
          professionalId: String(professional.id)
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toHaveProperty(
      "professional.id",
      professional.id
    );
  });
});
