import { afterAll, describe, expect, it } from "vitest";

import { GET as getConversations } from "@/app/api/admin/conversations/route";
import { GET as getMessages } from "@/app/api/admin/conversations/[personId]/messages/route";
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
});
