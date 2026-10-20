import { isValidPastDateOnly, normalizeSearch } from "@/lib/matchingDomain";
import {
  isPsychotherapyArea,
  normalizeProfessionalDeclaration,
  normalizeProfessionalGender,
  normalizePsychotherapyApproach,
  normalizePsychotherapySpecialties,
  PROFESSIONAL_GENDERS,
  PROFESSIONAL_RACES
} from "@/lib/matchingProfile";
import { isValidBrazilianMobile, normalizeBrazilianPhone } from "@/lib/phone";

export type ImportedPatient = {
  row: number;
  name: string;
  phone_number: string;
  area: string;
  psychotherapy_approach: string;
  psychotherapy_specialties: string[];
  preferred_gender: string | null;
  preferred_race: string | null;
  birth_date: string;
  errors: string[];
};

type PasteRow = { cells: string[]; row: number; incomplete: boolean };
type Columns = {
  name?: number;
  phone?: number;
  area?: number;
  birth?: number;
  approach?: number;
  gender?: number;
  race?: number;
  specialties: number[];
};

// Sheets quotes cells containing tabs or newlines and doubles embedded quotes.
function readRows(value: string): PasteRow[] {
  const delimiter = value.includes("\t") ? "\t" : "|";
  const rows: PasteRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let startLine = 1;

  function finishRow(incomplete = false) {
    cells.push(cell.trim());
    if (delimiter === "|" && cells.length > 1) {
      if (cells[0] === "") cells.shift();
      if (cells.at(-1) === "") cells.pop();
    }
    rows.push({ cells, row: startLine, incomplete });
    cells = [];
    cell = "";
  }

  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') { cell += '"'; index++; }
      else if (quoted || !cell.trim()) quoted = !quoted;
      else cell += character;
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && value[index + 1] === "\n") index++;
      if (quoted) cell += "\n";
      else finishRow();
      line++;
      if (!quoted) startLine = line;
    } else cell += character;
  }
  if (cell || cells.length || quoted) finishRow(quoted);
  return rows;
}

function isSeparatorRow(cells: string[]) {
  const populated = cells.filter(Boolean);
  return populated.length > 0 && populated.every((cell) => /^:?-{1,}:?$/.test(cell));
}

function headerColumns(cells: string[]): Columns | null {
  if (cells.some(looksLikePhone)) return null;
  const columns: Columns = { specialties: [] };
  cells.forEach((cell, index) => {
    const label = normalizeSearch(cell).replace(/\s+/g, " ");
    if (/nome|name/.test(label)) columns.name = index;
    if (/whatsapp|telefone|celular|phone/.test(label)) columns.phone = index;
    if (/area/.test(label)) columns.area = index;
    if (/nascimento|birth/.test(label)) columns.birth = index;
    if (/abordagem|approach/.test(label)) columns.approach = index;
    if (/genero|gender/.test(label)) columns.gender = index;
    if (/autodeclaracao|raca|race/.test(label)) columns.race = index;
    if (/especialidade|specialt/.test(label)) columns.specialties.push(index);
  });
  return columns.name !== undefined && columns.phone !== undefined && columns.area !== undefined
    ? columns : null;
}

function looksLikePhone(value: string) {
  if (!/^[+\d().\s-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function looksLikeDate(value: string) {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function looksLikeDateTime(value: string) {
  return /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?$/.test(value)
    || /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(value);
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPayment(value: string) {
  return /r\s*\$/.test(normalizeSearch(value)) || /^(ate|de)\s*\d/.test(normalizeSearch(value));
}

function isConsent(value: string) {
  return /declaro|informacoes.*verdade|responsavel.*informacoes/.test(normalizeSearch(value));
}

export function normalizeImportedBirthDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseRow({ cells, row, incomplete }: PasteRow, header: Columns | null): ImportedPatient {
  const phoneIndex = header?.phone ?? cells.findIndex(looksLikePhone);
  const cellAt = (index: number | undefined) => index === undefined || index < 0 ? "" : cells[index] ?? "";
  const areaIndex = header?.area ?? phoneIndex + 1;
  const name = header?.name !== undefined ? cellAt(header.name) : phoneIndex > 0
    ? cells.slice(0, phoneIndex).findLast((cell) => cell.length > 0
      && !looksLikeDateTime(cell) && !looksLikeDate(cell) && !looksLikeEmail(cell)) ?? "" : "";
  const phone = cellAt(phoneIndex);
  const area = phoneIndex >= 0 ? cellAt(areaIndex) : "";
  const birthIndex = cells.findLastIndex((cell, index) => index > phoneIndex && looksLikeDate(cell));
  // Relative positions also support a shortened timestamp/name prefix.
  const fullLayout = phoneIndex >= 0 && (
    isPayment(cellAt(phoneIndex + 7)) || birthIndex === phoneIndex + 8
    || (cells.length >= phoneIndex + 13 && cells.slice(phoneIndex + 2, phoneIndex + 7).every((cell) => !cell))
  );
  const positionalColumns: Columns | null = fullLayout ? {
    birth: phoneIndex + 8, race: phoneIndex + 9, gender: phoneIndex + 10,
    approach: phoneIndex + 11, specialties: [phoneIndex + 13, phoneIndex + 14]
  } : null;
  const columns = header ? {
    ...positionalColumns, ...header,
    specialties: header.specialties.length ? header.specialties : positionalColumns?.specialties ?? []
  } : positionalColumns;
  const rawBirth = cellAt(columns?.birth ?? birthIndex);
  const birthDate = normalizeImportedBirthDate(rawBirth);
  let rawApproach = cellAt(columns?.approach);
  let preferredGender = normalizeProfessionalGender(cellAt(columns?.gender));
  let preferredRace = normalizeProfessionalDeclaration(cellAt(columns?.race));
  let focuses = columns?.specialties.flatMap((index) => cellAt(index).split(/[,\n]/)) ?? [];

  if (!fullLayout) {
    // Infer compact pastes by content; payment and consent never become preferences.
    cells.forEach((cell, index) => {
      if (index <= phoneIndex || index === areaIndex || index === birthIndex || !cell
        || index === header?.name || index === columns?.birth || index === columns?.gender
        || index === columns?.race || index === columns?.approach || columns?.specialties.includes(index)
        || isPayment(cell) || isConsent(cell) || looksLikeEmail(cell)
        || normalizeSearch(cell) === "sem preferencia") return;
      const approach = normalizePsychotherapyApproach(cell);
      const gender = normalizeProfessionalGender(cell);
      const race = normalizeProfessionalDeclaration(cell);
      if (approach) rawApproach = approach;
      else if (PROFESSIONAL_GENDERS.some((value) => value === gender)) preferredGender = gender;
      else if (PROFESSIONAL_RACES.some((value) => value === race)) preferredRace = race;
      else focuses.push(...cell.split(/[,\n]/));
    });
  }

  const psychotherapy = isPsychotherapyArea(area);
  if (!psychotherapy) { rawApproach = ""; focuses = []; }
  const approach = normalizePsychotherapyApproach(rawApproach);
  const errors: string[] = [];
  if (name.length < 2) errors.push("Nome ausente");
  if (!isValidBrazilianMobile(phone)) errors.push("Celular inválido");
  if (!area) errors.push("Área ausente");
  if (rawBirth && (!birthDate || !isValidPastDateOnly(birthDate))) errors.push("Nascimento inválido");
  if (rawApproach && normalizeSearch(rawApproach).replace(/\s+/g, " ") !== "sem preferencia" && !approach) errors.push("Abordagem inválida");
  if (incomplete) errors.push("Célula com aspas não fechadas");

  return {
    row, name, phone_number: isValidBrazilianMobile(phone) ? normalizeBrazilianPhone(phone) : phone,
    area, psychotherapy_approach: approach ?? "", birth_date: birthDate,
    psychotherapy_specialties: normalizePsychotherapySpecialties(focuses),
    preferred_gender: preferredGender, preferred_race: preferredRace, errors
  };
}

export function parsePatientPaste(value: string) {
  let header: Columns | null = null;
  const patients: ImportedPatient[] = [];
  for (const row of readRows(value)) {
    if (!row.cells.some(Boolean) || isSeparatorRow(row.cells)) continue;
    const columns = headerColumns(row.cells);
    if (columns) { header = columns; continue; }
    patients.push(parseRow(row, header));
  }
  return patients;
}

export function validateImportedAreas(
  patients: ImportedPatient[],
  activeAreas: string[],
  knownAreas?: string[]
) {
  return patients.map((patient) => {
    const matchingArea = activeAreas.find(
      (area) => normalizeSearch(area) === normalizeSearch(patient.area)
    );
    const knownArea = knownAreas?.find(
      (area) => normalizeSearch(area) === normalizeSearch(patient.area)
    );
    const errors = patient.errors.filter(
      (error) => error !== "Área sem ciclo ativo" && error !== "Nenhum profissional cadastrado nessa área"
    );

    if (patient.area && knownAreas && !knownArea) {
      errors.push("Nenhum profissional cadastrado nessa área");
    } else if (patient.area && !matchingArea) {
      errors.push("Área sem ciclo ativo");
    }
    return { ...patient, area: matchingArea ?? knownArea ?? patient.area, errors };
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
