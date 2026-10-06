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

  it("ignores a spreadsheet header and its initial datetime column", () => {
    const patients = parsePatientPaste(
      [
        "datetime\tname_paciente\tQual seu email?\tphone_paciente\tQual área Profissional de saúde você precisa?\tColuna 6",
        "30/09/2026 15:44:46\tCynthia Lorena\tcynthia@example.com\t5513997344432\tNutrição\t"
      ].join("\n")
    );

    expect(patients).toEqual([
      expect.objectContaining({
        name: "Cynthia Lorena",
        phone_number: "5513997344432",
        area: "Nutrição",
        birth_date: "",
        errors: []
      })
    ]);
  });

  it("accepts compact rows with an optional birth date", () => {
    const patients = parsePatientPaste(
      [
        "Maria Lionete\t\t5585987654321\tPsicoterapia\t",
        "Beré\t\t5598987654321\tPsicoterapia\t01/01/2000"
      ].join("\n")
    );

    expect(patients[0]).toMatchObject({
      name: "Maria Lionete",
      area: "Psicoterapia",
      birth_date: "",
      errors: []
    });
    expect(patients[1]).toMatchObject({
      name: "Beré",
      area: "Psicoterapia",
      birth_date: "2000-01-01",
      errors: []
    });
  });

  it("accepts imported mobile numbers with eight digits", () => {
    const [patient] = parsePatientPaste(
      "Maria Lionete\t\t558582150845\tPsicoterapia"
    );

    expect(patient).toMatchObject({
      phone_number: "558582150845",
      errors: []
    });
  });

  it("marks areas without active cycles", () => {
    const patients = validateImportedAreas(
      parsePatientPaste("Ana\t5511999999999\tPsicoterapia\t15/01/1990"),
      ["Nutrição"]
    );

    expect(patients[0].errors).toContain("Área sem ciclo ativo");
  });

  it("distinguishes an unknown professional area from one without an active cycle", () => {
    const [unknownArea] = validateImportedAreas(
      parsePatientPaste("Ana\t5511999999999\tFonoaudiologia"),
      ["Nutrição"],
      ["Nutrição", "Psicoterapia"]
    );
    const [inactiveArea] = validateImportedAreas(
      parsePatientPaste("Bia\t5511988888888\tPsicoterapia"),
      ["Nutrição"],
      ["Nutrição", "Psicoterapia"]
    );

    expect(unknownArea.errors).toContain("Nenhum profissional cadastrado nessa área");
    expect(inactiveArea.errors).toContain("Área sem ciclo ativo");
  });
});
