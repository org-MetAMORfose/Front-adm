"use client";

import { Plus, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import { addInputTypeToFlow, groupedInputTransitions } from "@/lib/chatbotFlowDomain";
import { FLOW_INPUT_TYPES, type FlowGraph, type FlowInputType, type FlowSelection } from "@/types/chatbotFlow";

type Props = {
  graph: FlowGraph;
  sourceNodeId: number;
  templateTransitionId?: number | null;
  destinationNodeId?: number | null;
  editable: boolean;
  onCommit: (graph: FlowGraph, label: string, mergeKey?: string) => void;
  onSelect: (selection: FlowSelection) => void;
};

const fieldClass = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/15";

export function TypeComposer({
  graph,
  sourceNodeId,
  templateTransitionId = null,
  destinationNodeId = null,
  editable,
  onCommit,
  onSelect
}: Props) {
  const usedTypes = useMemo(() => new Set(
    templateTransitionId == null
      ? []
      : groupedInputTransitions(graph, templateTransitionId).map((transition) => transition.input_type)
  ), [graph, templateTransitionId]);
  const availableTypes = useMemo(
    () => FLOW_INPUT_TYPES.filter((type) => type !== "AUTO" && !usedTypes.has(type)),
    [usedTypes]
  );
  const [open, setOpen] = useState(false);
  const [inputType, setInputType] = useState<FlowInputType>(availableTypes[0] ?? "TEXT");
  const [destination, setDestination] = useState(destinationNodeId == null ? "" : String(destinationNodeId));
  const [error, setError] = useState<string | null>(null);
  const destinations = useMemo(
    () => [...graph.nodes].sort((left, right) => left.title.localeCompare(right.title, "pt-BR") || left.key.localeCompare(right.key)),
    [graph.nodes]
  );
  const copiedActions = templateTransitionId == null
    ? []
    : graph.transition_actions.filter((action) => action.transition_id === templateTransitionId);
  const fixedDestination = destinationNodeId == null
    ? null
    : graph.nodes.find((node) => node.id === destinationNodeId);

  if (!editable) return null;
  if (!availableTypes.length) return <p className="text-xs text-ink/45">Todos os tipos disponíveis já fazem parte deste grupo.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#4776a6]/40 px-3 py-2 text-xs font-semibold text-[#365c82] hover:bg-[#4776a6]/5">
        <Plus className="h-3.5 w-3.5" />
        {templateTransitionId == null ? "Adicionar tipo sem action" : "Adicionar tipo neste grupo"}
      </button>
    );
  }

  const submit = () => {
    setError(null);
    const targetId = destinationNodeId ?? Number(destination);
    try {
      const result = addInputTypeToFlow(graph, {
        sourceNodeId,
        templateTransitionId,
        inputType,
        destinationNodeId: targetId
      });
      onCommit(result.graph, "Adicionar tipo de entrada");
      onSelect({ kind: "transition", id: result.transitionId });
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível adicionar o tipo.");
    }
  };

  return (
    <section className="rounded-xl border border-[#4776a6]/25 bg-[#4776a6]/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-xs font-bold text-[#365c82]">NOVO TIPO</p><p className="text-[11px] text-ink/45">{copiedActions.length ? `Copiará ${copiedActions.length} action${copiedActions.length === 1 ? "" : "s"}.` : "Sem action."}</p></div>
        <button type="button" onClick={() => { setOpen(false); setError(null); }} className="rounded p-1 text-ink/45 hover:bg-black/5" aria-label="Cancelar"><X className="h-4 w-4" /></button>
      </div>
      <label className="mt-3 block text-xs font-semibold text-ink/65">Tipo de entrada<select value={inputType} onChange={(event) => setInputType(event.target.value as FlowInputType)} className={fieldClass}>{availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      {fixedDestination ? <div className="mt-3 rounded-lg bg-white p-2 text-xs text-ink/60"><span className="font-semibold">Destino:</span> {fixedDestination.title}</div> : (
        <label className="mt-3 block text-xs font-semibold text-ink/65">Vai para<select value={destination} onChange={(event) => setDestination(event.target.value)} className={fieldClass}><option value="" disabled>Selecione o destino</option>{destinations.map((node) => <option key={node.id} value={node.id}>{node.title} · {node.key}</option>)}</select></label>
      )}
      {error ? <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-xs text-coral">{error}</p> : null}
      <button type="button" onClick={submit} disabled={destinationNodeId == null && !destination} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#4776a6] px-3 py-2 text-sm font-semibold text-white hover:bg-[#365c82] disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" />Adicionar tipo</button>
    </section>
  );
}
