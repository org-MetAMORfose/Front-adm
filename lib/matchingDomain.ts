import type { CycleStatus } from "@/types/matching";

export const PROFESSIONAL_BACKGROUND_MAX_LENGTH = 1000;

type CycleDates = {
  starts_at: Date;
  deadline_at: Date;
  cancelled_at: Date | null;
};

export function isActiveCycle(cycle: CycleDates, now = new Date()) {
  return (
    cycle.cancelled_at === null &&
    cycle.starts_at <= now &&
    cycle.deadline_at >= now
  );
}

export function getPendingPatients(promised: number, delivered: number) {
  return Math.max(promised - delivered, 0);
}

export function getCycleStatus(
  cycle: CycleDates,
  promised: number,
  delivered: number,
  now = new Date()
): CycleStatus {
  if (cycle.cancelled_at) return "CANCELLED";
  if (getPendingPatients(promised, delivered) === 0) return "COMPLETED";
  if (cycle.deadline_at < now) return "OVERDUE";
  if (cycle.starts_at > now) return "SCHEDULED";
  return "ACTIVE";
}

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function isValidPastDateOnly(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value <= now.toISOString().slice(0, 10)
  );
}

export function formatDate(value: string | null, withTime = false) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit" }
      : {})
  }).format(new Date(value));
}
