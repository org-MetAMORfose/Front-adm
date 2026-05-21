import { afterAll, describe, expect, it } from "vitest";

import { closePool, query } from "@/lib/db";

const runDbTests = process.env.DATABASE_URL ? describe : describe.skip;

runDbTests("database integration", () => {
  afterAll(async () => {
    await closePool();
  });

  it("connects with SELECT 1", async () => {
    const result = await query<{ ok: number }>("SELECT 1 AS ok");

    expect(result.rows[0]?.ok).toBe(1);
  });

  it.each([
    "person",
    "message_history",
    "professional",
    "professional_status_history"
  ])("reads table %s without writing", async (tableName) => {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${tableName}`
    );

    expect(result.rows[0]?.count).toMatch(/^\d+$/);
  });
});
