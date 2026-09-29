"use client";

import { formatDate } from "@/lib/matchingDomain";
import type { ProfessionalDistributionItem } from "@/types/matching";
import { ProfessionalStatusBadge } from "@/components/matching/StatusBadge";

type Props = {
  professionals: ProfessionalDistributionItem[];
  selectedId: number | null;
  onSelect: (professional: ProfessionalDistributionItem) => void;
};

export function ProfessionalTable({ professionals, selectedId, onSelect }: Props) {
  if (professionals.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-black/15 bg-white px-6 py-8 text-center">
        <p className="font-medium text-ink">Nenhum profissional encontrado</p>
        <p className="mt-1 text-sm text-ink/50">Ajuste a busca ou limpe os filtros.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-subtle">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-black/10 bg-mist/80 text-xs uppercase tracking-wide text-ink/45">
            <tr>
              <th className="px-4 py-3 font-semibold">Profissional</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 font-semibold">Entregues / meta</th>
              <th className="px-4 py-3 font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Próximo prazo</th>
              <th className="px-4 py-3 font-semibold">Reposições</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {professionals.map((professional) => {
              const progress = professional.promised_patients
                ? Math.min(
                    (professional.delivered_patients /
                      professional.promised_patients) *
                      100,
                    100
                  )
                : 0;
              const selected = selectedId === professional.id;

              return (
                <tr
                  key={professional.id}
                  tabIndex={0}
                  onClick={() => onSelect(professional)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(professional);
                    }
                  }}
                  className={`cursor-pointer outline-none transition hover:bg-sage/10 focus:bg-sage/10 ${selected ? "bg-sage/20 shadow-[inset_4px_0_0_#6f8f7a]" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{professional.name}</div>
                    <div className="mt-0.5 text-xs text-ink/50">{professional.area}</div>
                  </td>
                  <td className="px-4 py-3">
                    <ProfessionalStatusBadge active={professional.is_active} overdue={professional.has_overdue} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{professional.delivered_patients} / {professional.promised_patients}</div>
                    <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-black/5">
                      <div className="h-full rounded-full bg-sage" style={{ width: `${progress}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-base font-semibold text-ink">{professional.pending_patients}</td>
                  <td className={`px-4 py-3 ${professional.has_overdue ? "font-semibold text-coral" : "text-ink/70"}`}>
                    {formatDate(professional.next_deadline)}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{professional.pending_replacements}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t border-black/10 px-4 py-2 text-xs text-ink/45">{professionals.length} profissional(is) no resultado</div>
    </div>
  );
}
