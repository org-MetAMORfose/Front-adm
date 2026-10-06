import { describe, expect, it } from "vitest";

import {
  compareProfessionalsByPriority,
  getCycleStatus,
  getPendingPatients,
  isActiveCycle,
  isActiveCycleWithPending,
  isValidPastDateOnly,
  normalizeSearch
} from "@/lib/matchingDomain";
import type { ProfessionalDistributionItem } from "@/types/matching";
import {
  displayBrazilianPhone,
  formatBrazilianPhone,
  isValidBrazilianMobile,
  normalizeBrazilianPhone
} from "@/lib/phone";

describe("Brazilian phone helpers", () => {
  it("formats and normalizes a mobile number", () => {
    expect(formatBrazilianPhone("11999999999")).toBe("(11) 99999-9999");
    expect(displayBrazilianPhone("5511999999999")).toBe(
      "+55 (11) 99999-9999"
    );
    expect(normalizeBrazilianPhone("+55 (11) 99999-9999")).toBe(
      "5511999999999"
    );
  });

  it("handles missing phone data without breaking the page", () => {
    expect(formatBrazilianPhone(undefined)).toBe("");
    expect(displayBrazilianPhone(null)).toBe("+55");
    expect(isValidBrazilianMobile(undefined)).toBe(false);
  });

  it("accepts mobile numbers with eight or nine digits and rejects landlines", () => {
    expect(isValidBrazilianMobile("(11) 9999-9999")).toBe(true);
    expect(isValidBrazilianMobile("(85) 8215-0845")).toBe(true);
    expect(isValidBrazilianMobile("(11) 39999-9999")).toBe(false);
    expect(isValidBrazilianMobile("(11) 99999-9999")).toBe(true);
    expect(displayBrazilianPhone("551199999999")).toBe("+55 (11) 9999-9999");
  });
});

describe("matching domain", () => {
  const now = new Date("2026-09-28T15:00:00.000Z");

  it("defines active cycles by their uncancelled current interval", () => {
    expect(
      isActiveCycle(
        {
          starts_at: new Date("2026-09-01T00:00:00.000Z"),
          deadline_at: new Date("2026-10-01T00:00:00.000Z"),
          cancelled_at: null
        },
        now
      )
    ).toBe(true);
  });

  it("never exposes a negative balance", () => {
    expect(getPendingPatients(4, 1)).toBe(3);
    expect(getPendingPatients(4, 5)).toBe(0);
  });

  it("prioritizes completion before the time status", () => {
    expect(
      getCycleStatus(
        {
          starts_at: new Date("2026-08-01T00:00:00.000Z"),
          deadline_at: new Date("2026-09-01T00:00:00.000Z"),
          cancelled_at: null
        },
        4,
        4,
        now
      )
    ).toBe("COMPLETED");
  });

  it("normalizes accents and casing for safe search", () => {
    expect(normalizeSearch("  ÁRTHUR ")).toBe("arthur");
  });

  it("rejects impossible and future birth dates", () => {
    expect(isValidPastDateOnly("1990-01-15", now)).toBe(true);
    expect(isValidPastDateOnly("2025-02-30", now)).toBe(false);
    expect(isValidPastDateOnly("2027-01-01", now)).toBe(false);
  });

  it("only marks a current cycle active while it still owes patients", () => {
    const cycle = {
      starts_at: new Date("2026-09-01T00:00:00.000Z"),
      deadline_at: new Date("2026-10-01T00:00:00.000Z"),
      cancelled_at: null
    };

    expect(isActiveCycleWithPending(cycle, 2, 1, now)).toBe(true);
    expect(isActiveCycleWithPending(cycle, 2, 2, now)).toBe(false);
  });

  it("orders professionals by activity, deadline, deliveries and completion", () => {
    const professional = (
      overrides: Partial<ProfessionalDistributionItem>
    ): ProfessionalDistributionItem => ({
      id: 1,
      person_id: 1,
      name: "Profissional",
      phone_number: "5511999999999",
      area: "Psicoterapia",
      professional_register: "PENDING-1",
      is_active: false,
      has_regular_cycle: false,
      has_replacement_cycle: false,
      promised_patients: 0,
      delivered_patients: 0,
      pending_patients: 0,
      pending_replacements: 0,
      next_deadline: null,
      last_completed_at: null,
      has_overdue: false,
      ...overrides
    });

    const professionals = [
      professional({
        id: 1,
        name: "Inativo antigo",
        last_completed_at: "2026-07-01T00:00:00.000Z"
      }),
      professional({
        id: 2,
        name: "Ativo com mais entregas",
        is_active: true,
        next_deadline: "2026-10-05T00:00:00.000Z",
        delivered_patients: 3
      }),
      professional({
        id: 3,
        name: "Ativo com prazo curto",
        is_active: true,
        next_deadline: "2026-10-03T00:00:00.000Z",
        delivered_patients: 8
      }),
      professional({
        id: 4,
        name: "Ativo com menos entregas",
        is_active: true,
        next_deadline: "2026-10-05T00:00:00.000Z",
        delivered_patients: 1
      }),
      professional({
        id: 5,
        name: "Inativo recente",
        last_completed_at: "2026-09-20T00:00:00.000Z"
      })
    ];

    expect(
      professionals.sort(compareProfessionalsByPriority).map(({ id }) => id)
    ).toEqual([3, 4, 2, 5, 1]);
  });
});
