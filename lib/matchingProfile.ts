import type { ProfessionalMatchingProfile } from "@/types/matching";

export const PSYCHOTHERAPY_AREA = "Psicoterapia";
export const PSYCHOTHERAPY_APPROACHES = ["TCC", "Psicanálise"] as const;
export const PROFESSIONAL_GENDERS = ["Mulher", "Homem", "Não binário"] as const;
export const PROFESSIONAL_RACES = ["Negra", "Branca", "Indígena", "Asiática", "Imigrante"] as const;
export const PSYCHOTHERAPY_SPECIALTIES = [
  "LGBTQIAPN+",
  "Burnout",
  "Orientação Profissional",
  "Casal",
  "Família",
  "Crianças",
  "Adolescentes",
  "Saúde 60+",
  "Imigrantes",
  "Autismo",
  "TDAH",
  "Transtorno Bipolar",
  "Transtorno de Personalidade Borderline",
  "Ansiedade",
  "Depressão",
  "Supervisão de Psicoterapia (Psi para psi)"
] as const;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(text).filter((item): item is string => item !== null))];
}

const SPECIALTY_ALIASES: Record<string, string> = {
  bipolaridade: "Transtorno Bipolar",
  borderline: "Transtorno de Personalidade Borderline",
  boderline: "Transtorno de Personalidade Borderline"
};

export function normalizePsychotherapySpecialties(value: unknown): string[] {
  const lookup = new Map(PSYCHOTHERAPY_SPECIALTIES.map((specialty) => [key(specialty), specialty]));
  const normalized = strings(value).map((specialty) =>
    SPECIALTY_ALIASES[key(specialty)] ?? lookup.get(key(specialty)) ?? specialty.replace(/\s+/g, " ")
  );
  return normalized.filter((specialty, index) =>
    normalized.findIndex((candidate) => key(candidate) === key(specialty)) === index
  );
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function key(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

export function normalizePsychotherapyApproach(value: string): string | null {
  return ({ tcc: "TCC", "psicoterapia tcc": "TCC", psicanalise: "Psicanálise" } as Record<string, string>)[key(value)] ?? null;
}

export function normalizeProfessionalGender(value: string): string | null {
  if (["", "sem preferencia", "prefiro nao informar"].includes(key(value))) return null;
  return ({ feminino: "Mulher", mulher: "Mulher", masculino: "Homem", homem: "Homem",
    "nao binario": "Não binário", "nao binaria": "Não binário", "nao-binario": "Não binário"
  } as Record<string, string>)[key(value)] ?? value.trim();
}

export function normalizeProfessionalDeclaration(value: string): string | null {
  if (["", "sem preferencia", "prefiro nao informar"].includes(key(value))) return null;
  return ({ negro: "Negra", negra: "Negra", branco: "Branca", branca: "Branca", indigena: "Indígena",
    asiatico: "Asiática", asiatica: "Asiática", imigrante: "Imigrante"
  } as Record<string, string>)[key(value)] ?? value.trim();
}

export function isPsychotherapyArea(value: string) {
  return key(value) === key(PSYCHOTHERAPY_AREA);
}

export function hasPsychotherapyArea(areas: string[]) {
  return areas.some(isPsychotherapyArea);
}

export function uniqueAreas(areas: string[]) {
  const seen = new Set<string>();
  return areas.map((area) => area.trim()).filter((area) => {
    const areaKey = key(area);
    if (!area || seen.has(areaKey)) return false;
    seen.add(areaKey);
    return true;
  });
}

export function normalizeMatchingProfile(
  value: unknown
): ProfessionalMatchingProfile {
  const source = record(value);
  const psychotherapy = record(source.psychotherapy);
  const profile = record(source.profile);
  const areas = strings(source.areas);
  return {
    schema_version:
      typeof source.schema_version === "number" ? source.schema_version : 1,
    areas,
    psychotherapy: {
      approaches: strings(psychotherapy.approaches),
      specialties: normalizePsychotherapySpecialties(psychotherapy.specialties)
    },
    profile: {
      gender: normalizeProfessionalGender(text(profile.gender) ?? ""),
      race: normalizeProfessionalDeclaration(text(profile.race) ?? ""),
      lgbtqiapn_plus: booleanOrNull(profile.lgbtqiapn_plus)
    }
  };
}

export function uniqueAdditionalAreas(primaryArea: string, areas: string[]) {
  const primaryKey = key(primaryArea);
  return uniqueAreas(areas).filter((area) => key(area) !== primaryKey);
}

export function formatBooleanPreference(value: boolean | null) {
  if (value === null) return "Não informado";
  return value ? "Sim" : "Não";
}
