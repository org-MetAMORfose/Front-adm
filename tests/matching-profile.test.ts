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
    }, { area: "Psicoterapia" })).toEqual({
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

  it("falls back to legacy columns for old records", () => {
    expect(normalizeMatchingProfile({}, {
      area: "Psicoterapia",
      approach: "Psicanálise",
      gender: "Mulher",
      minorityGroup: "Pessoa negra LGBTQIAPN+"
    })).toMatchObject({
      areas: ["Psicoterapia"],
      psychotherapy: { approaches: ["Psicanálise"], specialties: [] },
      profile: { gender: "Mulher", race: "Negra", lgbtqiapn_plus: true }
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
