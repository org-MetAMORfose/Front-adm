import { describe, expect, it } from "vitest";

import {
  parsePatientPaste,
  validateImportedAreas
} from "@/lib/patientImport";

describe("patient spreadsheet import", () => {
  it("parses the exact pipe format with empty columns", () => {
    const [patient] = parsePatientPaste(
      "|   | arthur |   | 5511974527717 | Psicoterapia | 01/01/2000 |"
    );

    expect(patient).toMatchObject({
      name: "arthur",
      phone_number: "5511974527717",
      area: "Psicoterapia",
      psychotherapy_approach: "",
      birth_date: "2000-01-01",
      errors: []
    });
  });

  it("parses multiple tab-separated compact rows and an optional approach", () => {
    const patients = parsePatientPaste(
      [
        "Ana\t5511999999999\tPsicoterapia\tTCC\t15/01/1990",
        "Bia\t5511988888888\tNutrição\t20/02/1995"
      ].join("\n")
    );

    expect(patients).toHaveLength(2);
    expect(patients[0].psychotherapy_approach).toBe("TCC");
    expect(patients[1].birth_date).toBe("1995-02-20");
  });

  it("marks areas without active cycles", () => {
    const patients = validateImportedAreas(
      parsePatientPaste("Ana\t5511999999999\tPsicoterapia\t15/01/1990"),
      ["Nutrição"]
    );

    expect(patients[0].errors).toContain("Área sem ciclo ativo");
  });
});
