import { describe, expect, it } from "vitest";

import {
  getCycleStatus,
  getPendingPatients,
  isActiveCycle,
  isValidPastDateOnly,
  normalizeSearch
} from "@/lib/matchingDomain";
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

  it("rejects incomplete and landline numbers", () => {
    expect(isValidBrazilianMobile("(11) 9999-9999")).toBe(false);
    expect(isValidBrazilianMobile("(11) 39999-9999")).toBe(false);
    expect(isValidBrazilianMobile("(11) 99999-9999")).toBe(true);
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
});
