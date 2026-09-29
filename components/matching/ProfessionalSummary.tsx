import Link from "next/link";
import { ArrowRight, CalendarClock, RotateCcw } from "lucide-react";

import { formatDate } from "@/lib/matchingDomain";
import { displayBrazilianPhone } from "@/lib/phone";
import type { ProfessionalDistributionItem } from "@/types/matching";
import { ProfessionalStatusBadge } from "@/components/matching/StatusBadge";

type Props = {
  professional: ProfessionalDistributionItem;
};

export function ProfessionalSummary({ professional }: Props) {
  return (
    <aside className="rounded-xl border border-black/10 bg-white p-5 shadow-subtle">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/40">Resumo do profissional</span>

      <div className="mt-5">
        <h2 className="text-xl font-semibold text-ink">{professional.name}</h2>
        <p className="mt-1 text-sm text-ink/55">{professional.area} · {displayBrazilianPhone(professional.phone_number)}</p>
        <div className="mt-3"><ProfessionalStatusBadge active={professional.is_active} overdue={professional.has_overdue} /></div>
      </div>

      <dl className="mt-6 divide-y divide-black/5 rounded-lg border border-black/10">
        <div className="flex items-center justify-between px-3 py-3">
          <dt className="text-sm text-ink/55">Entregues / meta</dt>
          <dd className="font-semibold text-ink">{professional.delivered_patients} / {professional.promised_patients}</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-3">
          <dt className="text-sm text-ink/55">A entregar</dt>
          <dd className="font-semibold text-ink">{professional.pending_patients}</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-3">
          <dt className="flex items-center gap-2 text-sm text-ink/55"><CalendarClock className="h-4 w-4" aria-hidden />Prazo</dt>
          <dd className="font-semibold text-ink">{formatDate(professional.next_deadline)}</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-3">
          <dt className="flex items-center gap-2 text-sm text-ink/55"><RotateCcw className="h-4 w-4" aria-hidden />Reposições</dt>
          <dd className="font-semibold text-ink">{professional.pending_replacements}</dd>
        </div>
      </dl>

      <Link href={`/profissionais/${professional.id}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90">
        Ver detalhes
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </aside>
  );
}
