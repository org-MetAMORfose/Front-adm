"use client";

import { ButtonComposer } from "@/components/flow/ButtonComposer";
import { TypeComposer } from "@/components/flow/TypeComposer";

import { ArrowRight, Braces, LockKeyhole, MessageSquareWarning, Plus, Trash2 } from "lucide-react";

import {
  BUTTON_LABEL_MAX_LENGTH,
  buttonLabelLength,
  conditionalActionConfig,
  groupedButtonTransitions,
  groupedInputTransitions,
  limitButtonLabel,
  normalizeButtonExpectedValue,
  protectedFlowEntities,
  transitionActionSignature
} from "@/lib/chatbotFlowDomain";
import type {
  FlowGraph,
  FlowInputType,
  FlowSelection,
  FlowValidationError
} from "@/types/chatbotFlow";
import { FLOW_INPUT_TYPES } from "@/types/chatbotFlow";

type Props = {
  graph: FlowGraph;
  selection: FlowSelection;
  editable: boolean;
  errors: FlowValidationError[];
  onCommit: (graph: FlowGraph, label: string, mergeKey?: string) => void;
  onSelect: (selection: FlowSelection) => void;
  onInsertNode: (transitionId: number) => void;
  onDeleteNode: (nodeId: number) => void;
  onDeleteTransition: (transitionId: number) => void;
};

const fieldClass = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/15 disabled:bg-mist disabled:text-ink/55";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-ink/65">{label}{children}</label>;
}

function ErrorList({ errors }: { errors: FlowValidationError[] }) {
  if (!errors.length) return null;
  return (
    <div className="rounded-lg border border-coral/30 bg-coral/10 p-3">
      <p className="text-xs font-bold text-coral">Problemas neste elemento</p>
      {errors.map((error, index) => <p key={`${error.code}-${index}`} className="mt-1 text-xs text-ink/70">{error.message}</p>)}
    </div>
  );
}

export function FlowConfigPanel({
  graph,
  selection,
  editable,
  errors,
  onCommit,
  onSelect,
  onInsertNode,
  onDeleteNode,
  onDeleteTransition
}: Props) {
  const protections = protectedFlowEntities(graph);

  if (!selection) {
    return (
      <aside className="flex h-full w-[370px] shrink-0 flex-col border-r border-black/10 bg-white">
        <div className="border-b border-black/10 p-4">
          <p className="font-semibold">Configuração</p>
          <p className="mt-1 text-sm text-ink/55">Selecione um nó, uma seta ou um losango.</p>
        </div>
        <div className="p-4">
          <button type="button" onClick={() => onSelect({ kind: "input-errors" })} className="flex w-full items-center gap-3 rounded-xl border border-black/10 p-3 text-left transition hover:border-sage/40 hover:bg-sage/5">
            <MessageSquareWarning className="h-5 w-5 text-sage" />
            <span><span className="block text-sm font-semibold">Mensagens de entrada inválida</span><span className="block text-xs text-ink/50">Uma mensagem para cada tipo de entrada.</span></span>
          </button>
        </div>
      </aside>
    );
  }

  if (selection.kind === "input-errors") {
    return (
      <aside className="flex h-full w-[370px] shrink-0 flex-col border-r border-black/10 bg-white">
        <div className="border-b border-black/10 p-4">
          <div className="flex items-center gap-2"><MessageSquareWarning className="h-5 w-5 text-sage" /><p className="font-semibold">Mensagens de erro</p></div>
          <p className="mt-1 text-xs text-ink/50">Usadas quando a entrada do usuário não corresponde ao tipo esperado.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {graph.input_error_messages.map((item) => (
            <Field key={item.id} label={item.input_type}>
              <textarea
                value={item.message}
                disabled={!editable}
                rows={3}
                onChange={(event) => onCommit({ ...graph, input_error_messages: graph.input_error_messages.map((current) => current.id === item.id ? { ...current, message: event.target.value } : current) }, "Editar mensagem de erro", `input-error-${item.id}`)}
                className={fieldClass}
              />
            </Field>
          ))}
        </div>
      </aside>
    );
  }

  if (selection.kind === "node") {
    const node = graph.nodes.find((item) => item.id === selection.id);
    if (!node) return null;
    const outgoing = graph.transitions.filter((item) => item.node_id === node.id);
    const buttonGroupsByAction = new Map<string, typeof outgoing>();
    for (const transition of outgoing.filter((item) => item.button_label !== null)) {
      const signature = transitionActionSignature(graph, transition.id);
      buttonGroupsByAction.set(signature, [...(buttonGroupsByAction.get(signature) ?? []), transition]);
    }
    const buttonGroups = [...buttonGroupsByAction.values()].map((items) =>
      [...items].sort((left, right) => left.position - right.position || left.id - right.id)
    );
    const hasNoActionButtonGroup = buttonGroups.some((group) =>
      transitionActionSignature(graph, group[0].id) === "__sem_action__"
    );
    const nonButtonTransitions = outgoing.filter((item) => item.button_label === null && item.expected_value === null);
    const inputGroupsByRoute = new Map<string, typeof nonButtonTransitions>();
    for (const transition of nonButtonTransitions) {
      const key = `${transition.next_node_id}:${transitionActionSignature(graph, transition.id)}`;
      inputGroupsByRoute.set(key, [...(inputGroupsByRoute.get(key) ?? []), transition]);
    }
    const inputGroups = [...inputGroupsByRoute.values()].map((items) =>
      [...items].sort((left, right) => left.position - right.position || left.id - right.id)
    ).sort((left, right) => left[0].position - right[0].position);
    const hasNoActionInputGroup = inputGroups.some((group) =>
      transitionActionSignature(graph, group[0].id) === "__sem_action__"
    );
    const nodeActions = graph.transition_actions.filter((action) => outgoing.some((transition) => transition.id === action.transition_id));
    const nodeErrors = errors.filter((error) => error.node_id === node.id || error.node_key === node.key);
    const locked = protections.requiredNodes.has(node.id) || protections.dependencyNodes.has(node.id);
    const update = (patch: Partial<typeof node>, label: string, key: string) => {
      onCommit({ ...graph, nodes: graph.nodes.map((item) => item.id === node.id ? { ...item, ...patch } : item) }, label, `node-${node.id}-${key}`);
    };
    return (
      <aside className="flex h-full w-[370px] shrink-0 flex-col border-r border-black/10 bg-white">
        <div className="border-b border-black/10 p-4">
          <div className="flex items-center justify-between gap-2"><div><p className="font-semibold">Nó</p><p className="text-xs text-ink/45">ID {node.id}</p></div>{locked ? <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-1 text-xs font-semibold text-coral"><LockKeyhole className="h-3 w-3" />Protegido</span> : null}</div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <ErrorList errors={nodeErrors} />
          <Field label="Título"><input value={node.title} disabled={!editable} onChange={(event) => update({ title: event.target.value }, "Editar título", "title")} className={fieldClass} /></Field>
          <Field label="Chave"><input value={node.key} disabled={!editable} onChange={(event) => update({ key: event.target.value }, "Editar chave", "key")} className={fieldClass} /></Field>
          <Field label="Tipo"><select value={node.type} disabled={!editable} onChange={(event) => update({ type: event.target.value as typeof node.type }, "Alterar tipo", "type")} className={fieldClass}><option value="START">START</option><option value="MESSAGE">MESSAGE</option><option value="END">END</option></select></Field>
          <Field label="Mensagem"><textarea value={node.message} disabled={!editable} rows={5} onChange={(event) => update({ message: event.target.value }, "Editar mensagem", "message")} className={fieldClass} /></Field>
          <Field label="Descrição"><textarea value={node.description ?? ""} disabled={!editable} rows={3} onChange={(event) => update({ description: event.target.value || null }, "Editar descrição", "description")} className={fieldClass} /></Field>

          <section>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Tipos aceitos</p>
              {inputGroups.some((group) => new Set(group.map((item) => item.input_type)).size > 1) ? <span className="rounded-full bg-[#4776a6]/10 px-2 py-1 text-[10px] font-semibold text-[#365c82]">Múltiplos tipos</span> : null}
            </div>
            <div className="mt-2 space-y-2">
              {inputGroups.map((group) => {
                const representative = group[0];
                const destination = graph.nodes.find((candidate) => candidate.id === representative.next_node_id);
                const inputTypes = [...new Set(group.map((item) => item.input_type))];
                return (
                  <div key={`inputs-${representative.id}`} className="overflow-hidden rounded-xl border border-[#4776a6]/20 bg-[#4776a6]/5">
                    <button type="button" onClick={() => onSelect({ kind: "transition", id: representative.id })} className="block w-full px-3 py-2.5 text-left hover:bg-[#4776a6]/5">
                      <span className="flex flex-wrap items-center gap-1.5">{inputTypes.map((type, index) => <span key={type} className="contents"><span className="rounded bg-white px-2 py-1 text-[10px] font-bold text-[#365c82]">{type}</span>{index < inputTypes.length - 1 ? <span className="text-[10px] font-semibold text-ink/40">ou</span> : null}</span>)}</span>
                      <span className="mt-2 flex items-center gap-1 text-xs text-ink/55"><ArrowRight className="h-3 w-3 shrink-0" /><span className="truncate">{destination?.title ?? "Destino ausente"}</span></span>
                      {inputTypes.length > 1 ? <span className="mt-1 block text-[10px] font-semibold text-[#365c82]">Aceita {inputTypes.length} tipos de entrada</span> : null}
                    </button>
                    <div className="border-t border-[#4776a6]/15 p-2">
                      <TypeComposer graph={graph} sourceNodeId={node.id} templateTransitionId={representative.id} destinationNodeId={representative.next_node_id} editable={editable} onCommit={onCommit} onSelect={onSelect} />
                    </div>
                  </div>
                );
              })}
              {node.type !== "END" && !hasNoActionInputGroup ? <TypeComposer graph={graph} sourceNodeId={node.id} editable={editable} onCommit={onCommit} onSelect={onSelect} /> : null}
              {!inputGroups.length ? <p className="text-xs text-ink/45">Nenhum tipo de entrada separado.</p> : null}
            </div>
          </section>

          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Botões</p>
            <div className="mt-2 space-y-2">
              {buttonGroups.map((group) => {
                const representative = group[0];
                const signature = transitionActionSignature(graph, representative.id);
                const groupActions = graph.transition_actions.filter((action) => action.transition_id === representative.id);
                return (
                  <div key={signature} className="overflow-hidden rounded-xl border border-sage/20 bg-sage/5">
                    <button type="button" onClick={() => onSelect({ kind: "transition", id: representative.id })} className="block w-full px-3 py-2.5 text-left hover:bg-sage/5">
                      <span className="flex items-center justify-between gap-2 text-xs font-bold text-sage">
                        <span>{group.length} botão{group.length === 1 ? "" : "ões"}</span>
                        <span className="max-w-[190px] truncate font-mono text-[10px] font-medium text-[#365c82]">{groupActions.length ? groupActions.map((action) => action.action_key).join(" + ") : "sem action"}</span>
                      </span>
                      <span className="mt-2 block space-y-1">
                        {group.map((item) => {
                          const destination = graph.nodes.find((candidate) => candidate.id === item.next_node_id);
                          return <span key={item.id} className="flex items-center gap-1 text-xs text-ink/60"><span className="min-w-0 flex-1 truncate">{item.button_label}</span><ArrowRight className="h-3 w-3 shrink-0" /><span className="max-w-[135px] truncate">{destination?.title ?? "Destino ausente"}</span></span>;
                        })}
                      </span>
                    </button>
                    <div className="border-t border-sage/15 p-2">
                      <div className="space-y-2"><TypeComposer graph={graph} sourceNodeId={node.id} templateTransitionId={representative.id} editable={editable} onCommit={onCommit} onSelect={onSelect} /><ButtonComposer graph={graph} sourceNodeId={node.id} templateTransitionId={representative.id} editable={editable} onCommit={onCommit} onSelect={onSelect} /></div>
                    </div>
                  </div>
                );
              })}
              {node.type !== "END" && !hasNoActionButtonGroup ? <ButtonComposer graph={graph} sourceNodeId={node.id} editable={editable} onCommit={onCommit} onSelect={onSelect} /> : null}
              {!buttonGroups.length && !editable ? <p className="text-xs text-ink/45">Nenhum botão.</p> : null}
            </div>
          </section>

          {!outgoing.length ? <p className="rounded-lg bg-mist p-3 text-xs text-ink/45">Este nó ainda não possui saídas.</p> : null}

          {nodeActions.length ? <section><p className="text-xs font-bold uppercase tracking-wide text-ink/45">Actions somente leitura</p><div className="mt-2 space-y-2">{nodeActions.map((action) => <button key={action.id} type="button" onClick={() => onSelect({ kind: "action", id: action.id })} className="flex w-full items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-left text-xs hover:border-[#4776a6]/40"><span className="truncate font-mono">{action.action_key}</span>{action.is_required ? <LockKeyhole className="h-3.5 w-3.5 text-coral" /> : <Braces className="h-3.5 w-3.5 text-[#4776a6]" />}</button>)}</div></section> : null}

          {editable ? <button type="button" disabled={locked || nodeActions.length > 0} onClick={() => onDeleteNode(node.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-coral/30 px-3 py-2 text-sm font-semibold text-coral transition hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" />Apagar nó</button> : null}
        </div>
      </aside>
    );
  }

  if (selection.kind === "transition") {
    const transition = graph.transitions.find((item) => item.id === selection.id);
    if (!transition) return null;
    const buttonGroup = groupedButtonTransitions(graph, transition.id);
    const inputGroup = groupedInputTransitions(graph, transition.id);
    const isButtonGroup = transition.button_label !== null;
    const isInputGroup = transition.button_label === null && transition.expected_value === null && transition.input_type !== "AUTO";
    const actions = graph.transition_actions.filter((item) => item.transition_id === transition.id);
    const activeGroup = isButtonGroup ? buttonGroup : isInputGroup ? inputGroup : [transition];
    const groupIds = new Set(activeGroup.map((item) => item.id));
    const transitionErrors = errors.filter(
      (error) => error.transition_id !== null && groupIds.has(error.transition_id) && error.action_id == null
    );
    const destinations = [...graph.nodes].sort(
      (left, right) => left.title.localeCompare(right.title, "pt-BR") || left.key.localeCompare(right.key)
    );
    const update = (
      transitionId: number,
      patch: Partial<typeof transition>,
      label: string,
      key: string
    ) => {
      onCommit(
        {
          ...graph,
          transitions: graph.transitions.map((item) =>
            item.id === transitionId ? { ...item, ...patch } : item
          )
        },
        label,
        `transition-${transitionId}-${key}`
      );
    };
    const updateButtonLabel = (transitionId: number, rawValue: string) => {
      const value = limitButtonLabel(rawValue);
      update(
        transitionId,
        {
          button_label: value || null,
          expected_value: value ? normalizeButtonExpectedValue(value) : null
        },
        "Renomear botão",
        "button_label"
      );
    };
    return (
      <aside className="flex h-full w-[370px] shrink-0 flex-col border-r border-black/10 bg-white">
        <div className="border-b border-black/10 p-4">
          <p className="font-semibold">{isButtonGroup ? "Grupo de botões" : isInputGroup ? "Tipos aceitos" : "Transição normal"}</p>
          <p className="text-xs text-ink/45">
            {isButtonGroup
              ? `${buttonGroup.length} botão${buttonGroup.length === 1 ? "" : "ões"} · mesma configuração de actions`
              : isInputGroup
                ? `${[...new Set(inputGroup.map((item) => item.input_type))].join(" ou ")} · mesmo destino e actions`
                : `Seta verde · ID ${transition.id}`}
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <ErrorList errors={transitionErrors} />
          {actions.length ? (
            <section className="rounded-xl border border-[#4776a6]/20 bg-[#4776a6]/5 p-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#365c82]">
                <LockKeyhole className="h-3.5 w-3.5" />Actions fixas do grupo
              </div>
              <div className="mt-2 space-y-1.5">
                {actions.map((action) => (
                  <button key={action.id} type="button" onClick={() => onSelect({ kind: "action", id: action.id })} className="flex w-full items-center justify-between rounded-lg border border-[#4776a6]/15 bg-white px-3 py-2 text-left text-xs hover:border-[#4776a6]/40">
                    <span className="truncate font-mono">{action.action_key}</span>
                    {action.is_required ? <LockKeyhole className="h-3.5 w-3.5 text-coral" /> : <Braces className="h-3.5 w-3.5 text-[#4776a6]" />}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {isButtonGroup ? (
            <section className="space-y-3">
              {buttonGroup.map((buttonTransition, index) => {
                const destination = graph.nodes.find((node) => node.id === buttonTransition.next_node_id);
                const length = buttonLabelLength(buttonTransition.button_label ?? "");
                return (
                  <div key={buttonTransition.id} className={`rounded-xl border p-3 ${buttonTransition.id === transition.id ? "border-amber-400 bg-amber-50/50" : "border-black/10"}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink/55">BOTÃO {index + 1}</span>
                      <span className="flex min-w-0 items-center gap-1 text-[11px] text-ink/45">
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">{destination?.title ?? "Destino ausente"}</span>
                      </span>
                    </div>
                    <Field label="Nome do botão">
                      <input
                        value={buttonTransition.button_label ?? ""}
                        disabled={!editable}
                        maxLength={BUTTON_LABEL_MAX_LENGTH}
                        onChange={(event) => updateButtonLabel(buttonTransition.id, event.target.value)}
                        className={fieldClass}
                      />
                    </Field>
                    <p className={`mt-1 text-right text-[10px] ${length >= BUTTON_LABEL_MAX_LENGTH ? "font-bold text-coral" : "text-ink/40"}`}>
                      {length}/{BUTTON_LABEL_MAX_LENGTH}
                    </p>
                    <Field label="Vai para">
                      <select
                        value={buttonTransition.next_node_id}
                        disabled={!editable}
                        onChange={(event) => update(buttonTransition.id, { next_node_id: Number(event.target.value) }, "Alterar destino do botão", "next_node_id")}
                        className={fieldClass}
                      >
                        {destinations.map((node) => <option key={node.id} value={node.id}>{node.title} · {node.key}</option>)}
                      </select>
                    </Field>
                    <Field label="Prioridade / ordem do botão">
                      <input type="number" min={0} value={buttonTransition.position} disabled={!editable} onChange={(event) => update(buttonTransition.id, { position: Number(event.target.value) }, "Alterar prioridade", "position")} className={fieldClass} />
                    </Field>
                  </div>
                );
              })}
              <p className="text-xs text-ink/45">O clique é reconhecido automaticamente a partir do nome do botão.</p>
              <TypeComposer graph={graph} sourceNodeId={transition.node_id} templateTransitionId={transition.id} editable={editable} onCommit={onCommit} onSelect={onSelect} />
              <ButtonComposer graph={graph} sourceNodeId={transition.node_id} templateTransitionId={transition.id} editable={editable} onCommit={onCommit} onSelect={onSelect} />
            </section>
          ) : isInputGroup ? (
            <section className="space-y-3">
              <div className="rounded-xl border border-[#4776a6]/25 bg-[#4776a6]/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#365c82]">Tipos aceitos</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {[...new Set(inputGroup.map((item) => item.input_type))].map((type, index, types) => (
                    <span key={type} className="contents">
                      <span className="rounded-lg border border-[#4776a6]/20 bg-white px-2.5 py-1.5 text-xs font-bold text-[#365c82]">{type}</span>
                      {index < types.length - 1 ? <span className="text-xs font-semibold text-ink/45">ou</span> : null}
                    </span>
                  ))}
                </div>
                {inputGroup.length > 1 ? <p className="mt-2 text-xs text-[#365c82]">Qualquer um desses formatos segue pela mesma seta.</p> : null}
              </div>

              {inputGroup.map((inputTransition, index) => (
                <div key={inputTransition.id} className="rounded-xl border border-black/10 p-3">
                  <Field label={`Tipo ${index + 1}`}><select value={inputTransition.input_type} disabled={!editable} onChange={(event) => update(inputTransition.id, { input_type: event.target.value as FlowInputType }, "Alterar tipo aceito", "input_type")} className={fieldClass}>{FLOW_INPUT_TYPES.filter((type) => type !== "AUTO").map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
                  <Field label="Prioridade"><input type="number" min={0} value={inputTransition.position} disabled={!editable} onChange={(event) => update(inputTransition.id, { position: Number(event.target.value) }, "Alterar prioridade", "position")} className={fieldClass} /></Field>
                </div>
              ))}

              <Field label="Nó de destino do grupo"><select value={transition.next_node_id} disabled={!editable} onChange={(event) => {
                const nextNodeId = Number(event.target.value);
                onCommit({ ...graph, transitions: graph.transitions.map((item) => groupIds.has(item.id) ? { ...item, next_node_id: nextNodeId } : item) }, "Alterar destino dos tipos", `input-group-${transition.id}-destination`);
              }} className={fieldClass}>{destinations.map((node) => <option key={node.id} value={node.id}>{node.title} · {node.key}</option>)}</select></Field>
              <TypeComposer graph={graph} sourceNodeId={transition.node_id} templateTransitionId={actions.length ? transition.id : null} destinationNodeId={transition.next_node_id} editable={editable} onCommit={onCommit} onSelect={onSelect} />
              <ButtonComposer graph={graph} sourceNodeId={transition.node_id} templateTransitionId={actions.length ? transition.id : null} editable={editable} onCommit={onCommit} onSelect={onSelect} />
            </section>
          ) : (
            <>
              <Field label="Tipo de entrada"><select value={transition.input_type} disabled={!editable} onChange={(event) => update(transition.id, { input_type: event.target.value as FlowInputType }, "Alterar entrada", "input_type")} className={fieldClass}>{FLOW_INPUT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
              <Field label="Nó de destino"><select value={transition.next_node_id} disabled={!editable} onChange={(event) => update(transition.id, { next_node_id: Number(event.target.value) }, "Alterar destino", "next_node_id")} className={fieldClass}>{destinations.map((node) => <option key={node.id} value={node.id}>{node.title} · {node.key}</option>)}</select></Field>
              <Field label="Prioridade da transição"><input type="number" min={0} value={transition.position} disabled={!editable} onChange={(event) => update(transition.id, { position: Number(event.target.value) }, "Alterar prioridade", "position")} className={fieldClass} /></Field>
              <TypeComposer graph={graph} sourceNodeId={transition.node_id} templateTransitionId={actions.length ? transition.id : null} destinationNodeId={transition.next_node_id} editable={editable} onCommit={onCommit} onSelect={onSelect} />
              {transition.input_type !== "AUTO" ? <ButtonComposer graph={graph} sourceNodeId={transition.node_id} templateTransitionId={actions.length ? transition.id : null} editable={editable} onCommit={onCommit} onSelect={onSelect} /> : null}
            </>
          )}
          {editable ? <div className="space-y-2"><button type="button" onClick={() => onInsertNode(transition.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white hover:bg-sage/90"><Plus className="h-4 w-4" />Inserir nó nesta transição</button><p className="text-xs text-ink/45">Mantém esta transição e suas actions no nó de origem; o novo nó continua automaticamente para o destino atual.</p><button type="button" disabled={actions.length > 0} onClick={() => onDeleteTransition(transition.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-coral/30 px-3 py-2 text-sm font-semibold text-coral hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" />Apagar transição</button></div> : null}
        </div>
      </aside>
    );
  }

  const action = graph.transition_actions.find((item) => item.id === selection.id);
  if (!action) return null;
  const config = conditionalActionConfig(action);
  const actionTransition = graph.transitions.find((item) => item.id === action.transition_id);
  const dependencies = graph.action_dependencies.filter((item) => item.action_id === action.id || item.depends_on_id === action.id);
  const actionErrors = errors.filter((error) => error.action_id === action.id);
  return (
    <aside className="flex h-full w-[370px] shrink-0 flex-col border-r border-black/10 bg-white">
      <div className="border-b border-black/10 p-4"><div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rotate-45 bg-[#4776a6]" /><p className="font-semibold">Transição de action</p></div><p className="mt-1 text-xs text-ink/45">Losango azul · somente leitura</p></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <ErrorList errors={actionErrors} />
        <div className="rounded-lg bg-mist p-3"><p className="text-xs font-semibold text-ink/45">ACTION KEY</p><p className="mt-1 break-all font-mono text-sm">{action.action_key}</p><p className="mt-2 text-xs">{action.is_required ? "Obrigatória" : "Opcional"}</p></div>
        {config ? <div className="space-y-3 rounded-xl border border-[#4776a6]/25 bg-[#4776a6]/5 p-3"><p className="text-xs font-bold uppercase tracking-wide text-[#365c82]">Condição de desvio</p><div><p className="text-xs text-ink/45">Campo do resultado</p><p className="font-mono text-sm">{config.source.field}</p></div><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-ink/45">Operador</p><p className="font-mono text-sm">{config.operator}</p></div><div><p className="text-xs text-ink/45">Valor</p><p className="break-all font-mono text-sm">{JSON.stringify(config.value)}</p></div></div><div><p className="text-xs text-ink/45">Destino</p><p className="break-all font-mono text-sm">{config.target_node_key}</p></div><p className="border-t border-[#4776a6]/15 pt-3 text-xs text-[#365c82]">Essa aresta não aceita “Inserir nó”. Ela será programável numa etapa futura.</p></div> : <div className="rounded-lg border border-black/10 p-3 text-xs text-ink/55">Esta action não declara uma transição condicional no config.</div>}
        {dependencies.length ? <div><p className="text-xs font-bold uppercase tracking-wide text-ink/45">Dependências fixas</p>{dependencies.map((dependency) => <p key={dependency.id} className="mt-2 rounded-lg border border-black/10 p-2 font-mono text-xs">{dependency.depends_on_id} → {dependency.action_id}</p>)}</div> : null}
        {actionTransition ? <div className="space-y-2"><TypeComposer graph={graph} sourceNodeId={actionTransition.node_id} templateTransitionId={actionTransition.id} editable={editable} onCommit={onCommit} onSelect={onSelect} /><ButtonComposer graph={graph} sourceNodeId={actionTransition.node_id} templateTransitionId={actionTransition.id} editable={editable} onCommit={onCommit} onSelect={onSelect} /></div> : null}
      </div>
    </aside>
  );
}
