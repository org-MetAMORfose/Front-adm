"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import {
  addActionsToTransitions,
  deleteActionAcrossTransitions,
  updateActionAcrossTransitions
} from "@/lib/chatbotFlowDomain";
import type {
  FlowActionDefinition,
  FlowGraph,
  FlowSelection,
  FlowSheetTab,
  FlowTransition,
  FlowTransitionAction
} from "@/types/chatbotFlow";

type Props = {
  graph: FlowGraph;
  transitions: FlowTransition[];
  definitions: FlowActionDefinition[];
  sheetTabs?: FlowSheetTab[];
  sheetTabsReady?: boolean;
  sheetTabsLoading?: boolean;
  sheetTabsLoadError?: string | null;
  loading?: boolean;
  loadError?: string | null;
  editable: boolean;
  onCommit: (graph: FlowGraph, label: string, mergeKey?: string) => void;
  onSelect: (selection: FlowSelection) => void;
};

type EditorState =
  | { mode: "add" }
  | { mode: "edit"; action: FlowTransitionAction }
  | null;

const fieldClass = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/15";

function transitionLabel(transition: FlowTransition) {
  return transition.button_label || transition.input_type;
}

function configSummary(action: FlowTransitionAction, definition: FlowActionDefinition) {
  return definition.parameters
    .map((parameter) => {
      const value = action.config?.[parameter.key];
      return value == null || value === "" ? null : `${parameter.label}: ${String(value)}`;
    })
    .filter(Boolean)
    .join(" · ");
}

function ActionForm({
  graph,
  transitions,
  definitions,
  sheetTabs,
  sheetTabsReady,
  sheetTabsLoading,
  sheetTabsLoadError,
  state,
  onCancel,
  onCommit
}: {
  graph: FlowGraph;
  transitions: FlowTransition[];
  definitions: FlowActionDefinition[];
  sheetTabs: FlowSheetTab[];
  sheetTabsReady: boolean;
  sheetTabsLoading: boolean;
  sheetTabsLoadError: string | null;
  state: Exclude<EditorState, null>;
  onCancel: () => void;
  onCommit: (graph: FlowGraph, label: string) => void;
}) {
  const initialDefinition = state.mode === "edit"
    ? definitions.find((definition) => definition.key === state.action.action_key)
    : definitions[0];
  const [definitionKey, setDefinitionKey] = useState(initialDefinition?.key ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (state.mode !== "edit") return {};
    return Object.fromEntries(
      Object.entries(state.action.config ?? {})
        .filter(([key]) => key !== "config_type")
        .map(([key, value]) => [key, String(value)])
    );
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set(transitions.map((transition) => transition.id)));
  const [error, setError] = useState<string | null>(null);
  const definition = definitions.find((item) => item.key === definitionKey);
  const tabTitles = useMemo(
    () => new Set(sheetTabs.map((tab) => tab.title)),
    [sheetTabs]
  );
  const tabSuggestions = useMemo(
    () => [...new Set([
      ...sheetTabs.map((tab) => tab.title),
      ...graph.transition_actions.flatMap((action) => {
      const tab = action.config?.tab;
      return typeof tab === "string" && tab.trim() ? [tab] : [];
      })
    ])].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [graph.transition_actions, sheetTabs]
  );

  if (!definition) {
    return <p className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-xs text-coral">A definição desta action não está disponível no catálogo.</p>;
  }

  const setParameter = (key: string, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: key === "column" ? value.toUpperCase() : value
    }));
  };
  const configuredTab = values.tab?.trim() ?? "";
  const invalidTab = sheetTabsReady && !!configuredTab && !tabTitles.has(configuredTab);
  const invalidParameter = definition.parameters.find((parameter) => {
    const value = values[parameter.key]?.trim() ?? "";
    if (parameter.required && !value) return true;
    if (parameter.key === "tab" && invalidTab) return true;
    return parameter.pattern && value ? !new RegExp(parameter.pattern).test(value) : false;
  });
  const canSubmit = selectedIds.size > 0 && !invalidParameter;

  const input = () => ({
    action_key: definition.key,
    config: {
      config_type: definition.config_type,
      ...Object.fromEntries(definition.parameters.map((parameter) => [parameter.key, values[parameter.key]?.trim() ?? ""]))
    },
    is_required: definition.default_is_required
  });

  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    try {
      const next = state.mode === "add"
        ? addActionsToTransitions(graph, [...selectedIds], input())
        : updateActionAcrossTransitions(graph, state.action.id, [...selectedIds], input());
      onCommit(next, state.mode === "add" ? "Adicionar action" : "Editar action");
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a action.");
    }
  };

  const remove = () => {
    if (state.mode !== "edit" || !selectedIds.size) return;
    if (!window.confirm(`Remover esta action de ${selectedIds.size} transição(ões)?`)) return;
    setError(null);
    try {
      onCommit(
        deleteActionAcrossTransitions(graph, state.action.id, [...selectedIds]),
        "Remover action"
      );
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível remover a action.");
    }
  };

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{state.mode === "add" ? "Nova action" : "Editar action"}</p>
          <p className="mt-1 text-[11px] text-ink/50">A seleção abaixo também permite separar parte deste grupo.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded p-1 text-ink/45 hover:bg-black/5" aria-label="Cancelar"><X className="h-4 w-4" /></button>
      </div>

      <label className="mt-3 block text-xs font-semibold text-ink/65">
        Action
        <select
          value={definitionKey}
          disabled={state.mode === "edit"}
          onChange={(event) => { setDefinitionKey(event.target.value); setValues({}); }}
          className={fieldClass}
        >
          {definitions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </label>
      <p className="mt-1 text-[11px] leading-relaxed text-ink/50">{definition.description}</p>

      <fieldset className="mt-3">
        <legend className="text-xs font-semibold text-ink/65">Aplicar em</legend>
        <div className="mt-1 space-y-1 rounded-lg border border-black/10 bg-white p-2">
          {transitions.map((transition) => (
            <label key={transition.id} className="flex items-center gap-2 text-xs text-ink/70">
              <input
                type="checkbox"
                checked={selectedIds.has(transition.id)}
                onChange={(event) => setSelectedIds((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(transition.id);
                  else next.delete(transition.id);
                  return next;
                })}
              />
              <span className="truncate">{transitionLabel(transition)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 space-y-3">
        {definition.parameters.map((parameter) => {
          const value = values[parameter.key] ?? "";
          const missingSelectedTab = parameter.key === "tab" && !!value.trim() && !tabTitles.has(value.trim());
          return (
            <label key={parameter.key} className="block text-xs font-semibold text-ink/65">
              {parameter.label}
              {parameter.key === "tab" && sheetTabsReady ? (
                <select
                  value={value}
                  onChange={(event) => setParameter(parameter.key, event.target.value)}
                  required={parameter.required}
                  className={fieldClass}
                >
                  <option value="">Selecione uma aba</option>
                  {missingSelectedTab ? <option value={value}>{value} (não encontrada)</option> : null}
                  {sheetTabs.map((tab) => <option key={tab.gid} value={tab.title}>{tab.title}</option>)}
                </select>
              ) : (
                <input
                  value={value}
                  onChange={(event) => setParameter(parameter.key, event.target.value)}
                  required={parameter.required}
                  pattern={parameter.pattern}
                  maxLength={parameter.key === "tab" ? 100 : undefined}
                  list={parameter.key === "tab" ? "flow-action-tabs" : undefined}
                  placeholder={parameter.key === "column" ? "Ex.: G" : undefined}
                  className={fieldClass}
                />
              )}
            </label>
          );
        })}
        <datalist id="flow-action-tabs">{tabSuggestions.map((tab) => <option key={tab} value={tab} />)}</datalist>
      </div>

      {invalidTab ? (
        <p className="mt-2 text-xs text-coral">A aba “{configuredTab}” não existe na planilha. Selecione uma das abas disponíveis.</p>
      ) : null}
      {invalidParameter?.pattern && (values[invalidParameter.key] ?? "").trim() ? (
        <p className="mt-2 text-xs text-coral">{invalidParameter.label} possui formato inválido.</p>
      ) : null}
      {sheetTabsLoading && definition.parameters.some((parameter) => parameter.key === "tab") ? (
        <p className="mt-2 text-xs text-ink/45">Consultando as abas da planilha…</p>
      ) : null}
      {sheetTabsLoadError && definition.parameters.some((parameter) => parameter.key === "tab") ? (
        <p className="mt-2 rounded-lg bg-coral/10 px-3 py-2 text-xs text-coral">Não foi possível consultar as abas: {sheetTabsLoadError}</p>
      ) : null}
      {error ? <p className="mt-2 rounded-lg bg-coral/10 px-3 py-2 text-xs text-coral">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        {state.mode === "edit" ? <button type="button" onClick={remove} disabled={!selectedIds.size} className="inline-flex items-center gap-1 rounded-lg border border-coral/30 px-3 py-2 text-xs font-semibold text-coral hover:bg-coral/10 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Remover</button> : null}
        <button type="button" onClick={submit} disabled={!canSubmit} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-sage px-3 py-2 text-xs font-semibold text-white hover:bg-sage/90 disabled:opacity-40">{state.mode === "add" ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{state.mode === "add" ? "Adicionar" : "Salvar"}</button>
      </div>
    </section>
  );
}

export function ActionComposer({
  graph,
  transitions,
  definitions,
  sheetTabs = [],
  sheetTabsReady = false,
  sheetTabsLoading = false,
  sheetTabsLoadError = null,
  loading = false,
  loadError = null,
  editable,
  onCommit,
  onSelect
}: Props) {
  const [editor, setEditor] = useState<EditorState>(null);
  const representative = transitions[0];
  if (!representative) return null;
  const actions = graph.transition_actions.filter((action) => action.transition_id === representative.id);
  const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]));

  return (
    <section className="space-y-2 rounded-xl border border-black/10 bg-white p-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Actions</p>
        <p className="mt-1 text-[11px] text-ink/45">Executadas na ordem exibida. Actions iguais mantêm as transições agrupadas.</p>
      </div>

      {actions.map((action) => {
        const definition = definitionsByKey.get(action.action_key);
        return (
          <div key={action.id} className="rounded-lg border border-black/10 bg-mist/40 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => onSelect({ kind: "action", id: action.id })} className="min-w-0 text-left">
                <span className="block truncate text-xs font-semibold">{definition?.label ?? action.action_key}</span>
                <span className="mt-0.5 block break-words text-[11px] text-ink/50">{definition ? configSummary(action, definition) || "Sem parâmetros" : "Action interna · somente leitura"}</span>
              </button>
              {editable && definition ? <button type="button" onClick={() => setEditor({ mode: "edit", action })} className="rounded p-1.5 text-sage hover:bg-sage/10" aria-label="Editar action"><Pencil className="h-3.5 w-3.5" /></button> : null}
            </div>
          </div>
        );
      })}
      {!actions.length ? <p className="text-xs text-ink/45">Nenhuma action configurada.</p> : null}

      {editor ? (
        <ActionForm
          graph={graph}
          transitions={transitions}
          definitions={definitions}
          sheetTabs={sheetTabs}
          sheetTabsReady={sheetTabsReady}
          sheetTabsLoading={sheetTabsLoading}
          sheetTabsLoadError={sheetTabsLoadError}
          state={editor}
          onCancel={() => setEditor(null)}
          onCommit={onCommit}
        />
      ) : editable ? (
        <button type="button" disabled={loading || !!loadError || !definitions.length} onClick={() => setEditor({ mode: "add" })} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-400 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45">
          <Plus className="h-3.5 w-3.5" />{loading ? "Carregando actions..." : "Adicionar action"}
        </button>
      ) : null}
      {loadError ? <p className="rounded-lg bg-coral/10 px-3 py-2 text-xs text-coral">{loadError}</p> : null}
    </section>
  );
}
