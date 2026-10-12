import { describe, expect, it } from "vitest";

import {
  hasPsychotherapyArea,
  normalizeMatchingProfile,
  normalizePsychotherapySpecialties,
  uniqueAdditionalAreas,
  uniqueAreas
} from "@/lib/matchingProfile";

describe("matching profile", () => {
  it("reads the JSON profile and canonicalizes legacy specialty names", () => {
    expect(normalizeMatchingProfile({
      schema_version: 1,
      areas: ["Psicoterapia", "Psiquiatria"],
      psychotherapy: {
        approaches: ["TCC"],
        specialties: ["Bipolaridade", "Borderline"]
      },
      profile: { gender: "Mulher", race: "Negra", lgbtqiapn_plus: true }
    })).toEqual({
      schema_version: 1,
      areas: ["Psicoterapia", "Psiquiatria"],
      psychotherapy: {
        approaches: ["TCC"],
        specialties: [
          "Transtorno Bipolar",
          "Transtorno de Personalidade Borderline"
        ]
      },
      profile: { gender: "Mulher", race: "Negra", lgbtqiapn_plus: true }
    });
  });

  it("does not invent matching values from legacy columns", () => {
    expect(normalizeMatchingProfile({})).toMatchObject({
      areas: [],
      psychotherapy: { approaches: [], specialties: [] },
      profile: { gender: null, race: null, lgbtqiapn_plus: null }
    });
  });

  it("detects psychotherapy among multiple areas and removes the primary duplicate", () => {
    expect(hasPsychotherapyArea(["Nutrição", "psicoterapia"])).toBe(true);
    expect(uniqueAreas(["Clínico geral", "Psiquiatria", "clínico geral"])).toEqual([
      "Clínico geral",
      "Psiquiatria"
    ]);
    expect(uniqueAdditionalAreas("Psicoterapia", ["psicoterapia", "Psiquiatria"])).toEqual(["Psiquiatria"]);
    expect(normalizePsychotherapySpecialties(["Autismo", "Autismo"])).toEqual(["Autismo"]);
  });
});
