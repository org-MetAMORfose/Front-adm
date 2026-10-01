"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

import type { FlowValidationResult } from "@/types/chatbotFlow";

export function FlowValidationPanel({
  result,
  stale = false,
  onClose,
  onSelectError
}: {
  result: FlowValidationResult | null;
  stale?: boolean;
  onClose: () => void;
  onSelectError: (index: number) => void;
}) {
  if (!result) return null;
  return (
    <section className="absolute bottom-4 right-4 z-20 max-h-[42%] w-[390px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
      <div className={`flex items-center justify-between border-b px-4 py-3 ${result.valid ? "border-emerald-200 bg-emerald-50" : "border-coral/25 bg-coral/10"}`}>
        <div className="flex items-center gap-2">
          {result.valid ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <AlertCircle className="h-5 w-5 text-coral" />}
          <div><p className="text-sm font-semibold">{result.valid ? "Fluxo válido" : `${result.errors.length} problema${result.errors.length === 1 ? "" : "s"}`}</p><p className="text-xs text-ink/50">{stale ? "Resultado anterior · valide novamente" : "Validação local e do servidor"}</p></div>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-ink/45 hover:bg-black/5"><X className="h-4 w-4" /></button>
      </div>
      {!result.valid ? <div className="max-h-[300px] overflow-y-auto p-2">{result.errors.map((error, index) => <button key={`${error.code}-${index}`} type="button" onClick={() => onSelectError(index)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-mist"><span className="block text-xs font-bold text-coral">{error.code}</span><span className="mt-0.5 block text-sm text-ink/70">{error.message}</span><span className="mt-1 block text-[11px] text-ink/40">{error.node_key || (error.node_id ? `Nó ${error.node_id}` : error.transition_id ? `Transição ${error.transition_id}` : "Fluxo")}</span></button>)}</div> : <p className="p-4 text-sm text-ink/60">Todos os nós alcançam um END e as dependências estão consistentes.</p>}
    </section>
  );
}
