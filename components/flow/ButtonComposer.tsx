"use client";

import { Plus, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import {
  BUTTON_LABEL_MAX_LENGTH,
  addButtonToFlow,
  buttonLabelLength,
  limitButtonLabel
} from "@/lib/chatbotFlowDomain";
import type { FlowGraph, FlowSelection } from "@/types/chatbotFlow";

type Props = {
  graph: FlowGraph;
  sourceNodeId: number;
  templateTransitionId?: number | null;
  editable: boolean;
  onCommit: (graph: FlowGraph, label: string, mergeKey?: string) => void;
  onSelect: (selection: FlowSelection) => void;
};

const fieldClass = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/15";

export function ButtonComposer({
  graph,
  sourceNodeId,
  templateTransitionId = null,
  editable,
  onCommit,
  onSelect
}: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [destination, setDestination] = useState("");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeMessage, setNewNodeMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const destinations = useMemo(
    () => [...graph.nodes].sort((left, right) => left.title.localeCompare(right.title, "pt-BR") || left.key.localeCompare(right.key)),
    [graph.nodes]
  );
  const copiedActions = templateTransitionId == null
    ? []
    : graph.transition_actions.filter((action) => action.transition_id === templateTransitionId);
  const createsNode = destination === "__new__";

  if (!editable) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-sage/40 px-3 py-2 text-xs font-semibold text-sage hover:bg-sage/5">
        <Plus className="h-3.5 w-3.5" />
        {templateTransitionId == null ? "Adicionar botão sem action" : "Adicionar botão neste grupo"}
      </button>
    );
  }

  const submit = () => {
    setError(null);
    try {
      const result = addButtonToFlow(graph, {
        sourceNodeId,
        templateTransitionId,
        label,
        destinationNodeId: createsNode ? null : Number(destination),
        newNode: createsNode ? {
          title: newNodeTitle.trim() || label.trim() || "Novo nó",
          message: newNodeMessage
        } : undefined
      });
      onCommit(result.graph, result.nodeId ? "Criar nó ligado por botão" : "Adicionar botão");
      onSelect(result.nodeId != null
        ? { kind: "node", id: result.nodeId }
        : { kind: "transition", id: result.transitionId });
      setOpen(false);
      setLabel("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível adicionar o botão.");
    }
  };

  return (
    <section className="rounded-xl border border-sage/25 bg-sage/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-sage">NOVO BOTÃO</p>
          <p className="text-[11px] text-ink/45">
            {copiedActions.length ? `Copiará ${copiedActions.length} action${copiedActions.length === 1 ? "" : "s"}.` : "Sem action."}
          </p>
        </div>
        <button type="button" onClick={() => { setOpen(false); setError(null); }} className="rounded p-1 text-ink/45 hover:bg-black/5" aria-label="Cancelar"><X className="h-4 w-4" /></button>
      </div>

      <label className="mt-3 block text-xs font-semibold text-ink/65">
        Nome do botão
        <input autoFocus value={label} maxLength={BUTTON_LABEL_MAX_LENGTH} onChange={(event) => setLabel(limitButtonLabel(event.target.value))} className={fieldClass} />
      </label>
      <p className="mt-1 text-right text-[10px] text-ink/40">{buttonLabelLength(label)}/{BUTTON_LABEL_MAX_LENGTH}</p>

      <label className="mt-3 block text-xs font-semibold text-ink/65">
        Vai para
        <select value={destination} onChange={(event) => setDestination(event.target.value)} className={fieldClass}>
          <option value="" disabled>Selecione o destino</option>
          {destinations.map((node) => <option key={node.id} value={node.id}>{node.title} · {node.key}</option>)}
          <option value="__new__">＋ Criar novo nó</option>
        </select>
      </label>

      {createsNode ? (
        <div className="mt-3 space-y-3 rounded-lg border border-black/10 bg-white p-3">
          <label className="block text-xs font-semibold text-ink/65">
            Título do novo nó
            <input value={newNodeTitle} onChange={(event) => setNewNodeTitle(event.target.value)} placeholder={label || "Novo nó"} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold text-ink/65">
            Mensagem inicial
            <textarea value={newNodeMessage} onChange={(event) => setNewNodeMessage(event.target.value)} rows={3} placeholder="Nova mensagem" className={fieldClass} />
          </label>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-xs text-coral">{error}</p> : null}
      <button type="button" onClick={submit} disabled={!label.trim() || (!createsNode && !destination)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-40">
        <Plus className="h-4 w-4" />{createsNode ? "Criar nó e adicionar botão" : "Adicionar botão"}
      </button>
    </section>
  );
}
