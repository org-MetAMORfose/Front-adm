import { isValidPastDateOnly, normalizeSearch } from "@/lib/matchingDomain";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";

export type ImportedPatient = {
  row: number;
  name: string;
  phone_number: string;
  area: string;
  psychotherapy_approach: string;
  birth_date: string;
  errors: string[];
};

function splitRow(line: string) {
  if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());

  if (line.includes("|")) {
    const cells = line.split("|");
    if (cells[0]?.trim() === "") cells.shift();
    if (cells.at(-1)?.trim() === "") cells.pop();
    return cells.map((cell) => cell.trim());
  }

  return [line.trim()];
}

function isSeparatorRow(cells: string[]) {
  const populated = cells.filter(Boolean);
  return populated.length > 0 && populated.every((cell) => /^:?-{1,}:?$/.test(cell));
}

function isHeaderRow(cells: string[]) {
  const value = normalizeSearch(cells.join(" "));
  return value.includes("nome") && (value.includes("telefone") || value.includes("celular"));
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function looksLikeDate(value: string) {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeImportedBirthDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return "";

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseRow(cells: string[], row: number): ImportedPatient {
  const phoneIndex = cells.findIndex(looksLikePhone);
  const birthIndex = cells.findLastIndex(looksLikeDate);
  const name = phoneIndex > 0
    ? cells.slice(0, phoneIndex).find((cell) => cell.length > 0) ?? ""
    : "";
  const phone = phoneIndex >= 0 ? cells[phoneIndex] : "";
  const between = phoneIndex >= 0 && birthIndex > phoneIndex
    ? cells.slice(phoneIndex + 1, birthIndex).filter(Boolean)
    : [];
  const area = between[0] ?? "";
  const approach = between.slice(1).join(" ");
  const birthDate = birthIndex >= 0
    ? normalizeImportedBirthDate(cells[birthIndex])
    : "";
  const errors: string[] = [];

  if (name.length < 2) errors.push("Nome ausente");
  if (!isValidBrazilianMobile(phone)) errors.push("Celular inválido");
  if (!area) errors.push("Área ausente");
  if (!birthDate || !isValidPastDateOnly(birthDate)) errors.push("Nascimento inválido");

  return {
    row,
    name,
    phone_number: isValidBrazilianMobile(phone) ? normalizeBrazilianPhone(phone) : phone,
    area,
    psychotherapy_approach: approach,
    birth_date: birthDate,
    errors
  };
}

export function parsePatientPaste(value: string) {
  return value
    .split(/\r?\n/)
    .map((line, index) => ({ cells: splitRow(line), row: index + 1 }))
    .filter(({ cells }) => cells.some(Boolean))
    .filter(({ cells }) => !isSeparatorRow(cells) && !isHeaderRow(cells))
    .map(({ cells, row }) => parseRow(cells, row));
}

export function validateImportedAreas(
  patients: ImportedPatient[],
  activeAreas: string[]
) {
  return patients.map((patient) => {
    const matchingArea = activeAreas.find(
      (area) => normalizeSearch(area) === normalizeSearch(patient.area)
    );
    const errors = patient.errors.filter((error) => error !== "Área sem ciclo ativo");

    if (patient.area && !matchingArea) errors.push("Área sem ciclo ativo");
    return { ...patient, area: matchingArea ?? patient.area, errors };
  });
}

export function findDuplicateImportedPhones(patients: ImportedPatient[]) {
  const counts = new Map<string, number>();
  for (const patient of patients) {
    if (isValidBrazilianMobile(patient.phone_number)) {
      counts.set(patient.phone_number, (counts.get(patient.phone_number) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([phone]) => phone));
}
