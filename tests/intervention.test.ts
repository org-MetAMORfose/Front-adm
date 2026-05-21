import { describe, expect, it } from "vitest";

import { needsHumanIntervention } from "@/lib/intervention";

describe("needsHumanIntervention", () => {
  it("detects common human handoff states", () => {
    expect(needsHumanIntervention("human_intervention")).toBe(true);
    expect(needsHumanIntervention("manual-review")).toBe(true);
    expect(needsHumanIntervention("waiting human")).toBe(true);
  });

  it("does not flag regular automated states", () => {
    expect(needsHumanIntervention("collecting_name")).toBe(false);
    expect(needsHumanIntervention("appointment_flow")).toBe(false);
  });
});
