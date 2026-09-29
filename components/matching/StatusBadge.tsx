import type { CycleStatus } from "@/types/matching";

const cycleLabels: Record<CycleStatus, string> = {
  ACTIVE: "Ativo",
  SCHEDULED: "Agendado",
  COMPLETED: "Concluído",
  OVERDUE: "Atrasado",
  CANCELLED: "Cancelado"
};

const cycleStyles: Record<CycleStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-700",
  COMPLETED: "border-sage/25 bg-sage/10 text-sage",
  OVERDUE: "border-coral/25 bg-coral/10 text-coral",
  CANCELLED: "border-black/10 bg-mist text-ink/55"
};

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cycleStyles[status]}`}>
      {cycleLabels[status]}
    </span>
  );
}

export function ProfessionalStatusBadge({ active, overdue }: { active: boolean; overdue: boolean }) {
  if (overdue) {
    return <span className="inline-flex rounded-full border border-coral/25 bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">Com atraso</span>;
  }

  return active ? (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Ativo</span>
  ) : (
    <span className="inline-flex rounded-full border border-black/10 bg-mist px-2.5 py-1 text-xs font-semibold text-ink/55">Sem ciclo ativo</span>
  );
}
