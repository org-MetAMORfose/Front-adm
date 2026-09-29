"use client";

import { Trash2 } from "lucide-react";

import { formatDate } from "@/lib/matchingDomain";
import type { MatchingCycleView } from "@/types/matching";
import { CycleStatusBadge } from "@/components/matching/StatusBadge";

type Props = {
  cycles: MatchingCycleView[];
  onCancel?: (cycle: MatchingCycleView) => void;
  cancellingId?: number | null;
};

export function CycleTable({ cycles, onCancel, cancellingId }: Props) {
  if (cycles.length === 0) {
    return <div className="rounded-xl border border-dashed border-black/15 bg-white px-6 py-12 text-center text-sm text-ink/55">Nenhum ciclo neste recorte.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-subtle">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mist/80 text-xs uppercase tracking-wide text-ink/45">
            <tr>
              <th className="px-4 py-3 font-semibold">Ciclo</th>
              <th className="px-4 py-3 font-semibold">Período</th>
              <th className="px-4 py-3 font-semibold">Entregas</th>
              <th className="px-4 py-3 font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
              {onCancel ? <th className="px-4 py-3 font-semibold">Ações</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {cycles.map((cycle) => {
              const progress = Math.min((cycle.delivered_patients / cycle.promised_patients) * 100, 100);
              return (
                <tr key={cycle.id} className={`${cycle.type === "REPLACEMENT" ? "bg-amber-50/80" : ""} ${cycle.status === "CANCELLED" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{cycle.type === "REPLACEMENT" ? "Reposição" : "Regular"}</div>
                    <div className="text-xs text-ink/45">#{cycle.id}</div>
                  </td>
                  <td className="px-4 py-3 text-ink/65">{formatDate(cycle.starts_at)} — {formatDate(cycle.deadline_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{cycle.delivered_patients} / {cycle.promised_patients}</div>
                    <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-sage" style={{ width: `${progress}%` }} /></div>
                  </td>
                  <td className="px-4 py-3 text-base font-semibold text-ink">{cycle.pending_patients}</td>
                  <td className="px-4 py-3"><CycleStatusBadge status={cycle.status} /></td>
                  {onCancel ? (
                    <td className="px-4 py-3">
                      {cycle.status !== "CANCELLED" ? <button type="button" onClick={() => onCancel(cycle)} disabled={cancellingId === cycle.id} className="inline-flex items-center gap-1.5 rounded-lg border border-coral/25 px-2.5 py-2 text-xs font-semibold text-coral transition hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        {cancellingId === cycle.id ? "Excluindo..." : "Excluir"}
                      </button> : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
