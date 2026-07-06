import { afterAll, describe, expect, it } from "vitest";

import { closeDatabase, prisma } from "@/lib/db";

const runDbTests = process.env.DATABASE_URL ? describe : describe.skip;

runDbTests("database integration", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("connects through Prisma", async () => {
    await expect(prisma.$connect()).resolves.toBeUndefined();
  });

  it("reads all domain tables without writing", async () => {
    const counts = await Promise.all([
      prisma.person.count(),
      prisma.message_history.count(),
      prisma.patient.count(),
      prisma.professional.count(),
      prisma.professional_patient.count(),
      prisma.professional_status_history.count()
    ]);

    expect(counts.every((count) => Number.isInteger(count))).toBe(true);
  });
});
