import { describe, expect, it } from "vitest";

import { findDuplicateImportedPhones, parsePatientPaste } from "@/lib/patientImport";

const completeRow = (changes: Record<number, string> = {}) => {
  const cells = ["19/10/2026 20:45:15", "Test", "", "5511974527717", "Psicoterapia", "", "", "", "", "",
    "Até R$150", "14/10/2000", "Negro", "Mulher", "Psicoterapia TCC",
    "Declaro que todas as informações que eu preenchi são verdadeiras", "", "LGBTQIAPN+, Burnout, Boderline, Bipolaridade", "", ""];
  for (const [index, value] of Object.entries(changes)) cells[Number(index)] = value;
  return cells;
};

describe("patient form spreadsheet", () => {
  it("infers the complete form without headers and ignores payment and consent", () => {
    const [patient] = parsePatientPaste(completeRow().join("\t"));
    expect(patient).toMatchObject({
      name: "Test", area: "Psicoterapia", birth_date: "2000-10-14", psychotherapy_approach: "TCC",
      preferred_race: "Negra", preferred_gender: "Mulher", errors: [],
      psychotherapy_specialties: ["LGBTQIAPN+", "Burnout", "Transtorno de Personalidade Borderline", "Transtorno Bipolar"]
    });
  });

  it("accepts the full pipe table, separators, blank rows and optional fields", () => {
    const patients = parsePatientPaste([
      "| Carimbo de data/hora | Qual seu nome? | Coluna 3 | Qual seu WhatsApp? Escreva como no exemplo 5511945454745 | Qual área Profissional de saúde você precisa? | Coluna 6 | Coluna 7 | Coluna 8 | Coluna 9 | Coluna 10 | Qual dessas faixas por sessão? | Qual seu nascimento e aniversário? | Autodeclaração - por qual profissional você quer ser atendido? | Gênero - por qual profissional você quer ser atendido? | Qual abordagem quer ser atendido? | Você é responsável por todas as informações? | Qual especialidade quer ser atendido? | Qual especialidade quer ser atendido? | Coluna 13 | Coluna 14 |",
      `| ${Array(20).fill("---").join(" | ")} |`,
      `| ${Array(20).fill("").join(" | ")} |`,
      `| ${completeRow({ 4: "Nutrição", 12: "", 13: "", 14: "", 17: "" }).join(" | ")} |`
    ].join("\n"));
    expect(patients).toHaveLength(1);
    expect(patients[0]).toMatchObject({ area: "Nutrição", psychotherapy_approach: "", psychotherapy_specialties: [],
      preferred_gender: null, preferred_race: null, errors: [] });
  });

  it("accepts psychotherapy with all optional fields and payment blank", () => {
    const [patient] = parsePatientPaste(completeRow({ 10: "", 11: "", 12: "", 13: "", 14: "", 16: "", 17: "" }).join("\t"));
    expect(patient).toMatchObject({ birth_date: "", psychotherapy_approach: "", psychotherapy_specialties: [],
      preferred_gender: null, preferred_race: null, errors: [] });
  });

  it("combines duplicate specialty columns and keeps arbitrary specialties", () => {
    const [patient] = parsePatientPaste(completeRow({ 16: "Luto, Autismo", 17: "autismo, Especialidade nova" }).join("\t"));
    expect(patient.psychotherapy_specialties).toEqual(["Luto", "Autismo", "Especialidade nova"]);
  });

  it("handles quoted multiline cells and escaped quotes without inventing patients", () => {
    const patients = parsePatientPaste([
      completeRow({ 1: '"Ana ""Bia"""', 17: '"LGBTQIAPN+,\nLuto"' }).join("\t"),
      completeRow({ 1: "Outro", 3: "5511988887777", 17: "Ansiedade" }).join("\t")
    ].join("\r\n"));
    expect(patients).toHaveLength(2);
    expect(patients[0].name).toBe('Ana "Bia"');
    expect(patients[0].psychotherapy_specialties).toEqual(["LGBTQIAPN+", "Luto"]);
    expect(patients[1].name).toBe("Outro");
  });

  it("uses optional headers with multiline titles and reordered columns", () => {
    const [patient] = parsePatientPaste([
      'Qual seu WhatsApp?\tQual seu nome?\tQual área?\t"Qual especialidade?\nTexto explicativo"\tQual abordagem?\tGênero\tAutodeclaração\tNascimento',
      '5511999999999\tAna\tPsicoterapia\tLuto\tSem preferência\tNão binário\tAsiático\t01/01/2000'
    ].join("\n"));
    expect(patient).toMatchObject({ name: "Ana", area: "Psicoterapia", psychotherapy_specialties: ["Luto"],
      preferred_gender: "Não binário", preferred_race: "Asiática", psychotherapy_approach: "", birth_date: "2000-01-01", errors: [] });
  });

  it("infers compact preferences while discarding payment and consent", () => {
    const [patient] = parsePatientPaste("Ana\t5511999999999\tPsicoterapia\tAté R$300\t01/01/2000\tBranco\tHomem\tPsicanálise\tDeclaro que as informações são verdadeiras\tLGBTQIAPN+, Luto");
    expect(patient).toMatchObject({ psychotherapy_approach: "Psicanálise", preferred_race: "Branca", preferred_gender: "Homem",
      psychotherapy_specialties: ["LGBTQIAPN+", "Luto"], errors: [] });
  });

  it("still infers preferences and birth dates when an old header has unnamed columns", () => {
    const [patient] = parsePatientPaste([
      "Nome\tTelefone\tÁrea\tColuna 4\tColuna 5\tColuna 6\tColuna 7",
      "Ana\t5511999999999\tPsicoterapia\t01/01/2000\tPsicoterapia TCC\tMulher\tLuto"
    ].join("\n"));
    expect(patient).toMatchObject({ birth_date: "2000-01-01", psychotherapy_approach: "TCC",
      preferred_gender: "Mulher", psychotherapy_specialties: ["Luto"], errors: [] });
  });

  it("does not mistake a patient with arbitrary area and specialty labels for a header", () => {
    const [patient] = parsePatientPaste("Nome Phone\t5511999999999\tÁrea nova\t01/01/2000");
    expect(patient).toMatchObject({ name: "Nome Phone", area: "Área nova", errors: [] });
  });

  it("reports invalid dates, unknown approaches and unclosed quoted cells", () => {
    const [patient] = parsePatientPaste(completeRow({ 11: "31/02/2000", 14: "Outra", 17: '"Luto' }).join("\t"));
    expect(patient.errors).toEqual(expect.arrayContaining(["Nascimento inválido", "Abordagem inválida", "Célula com aspas não fechadas"]));
  });

  it("keeps duplicate phone detection for complete rows", () => {
    const patients = parsePatientPaste([completeRow().join("\t"), completeRow({ 1: "Test2" }).join("\t")].join("\n"));
    expect(findDuplicateImportedPhones(patients)).toEqual(new Set(["5511974527717"]));
  });
});
