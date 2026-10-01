"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeMouseHandler
} from "@xyflow/react";
import { AlertTriangle, CheckCircle2, GitBranch, LayoutTemplate, Plus, Redo2, Save, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { ConditionalEdge, type ConditionalCanvasEdge } from "@/components/flow/ConditionalEdge";
import { FlowConfigPanel } from "@/components/flow/FlowConfigPanel";
import { FlowNodeCard, type FlowCanvasNode } from "@/components/flow/FlowNodeCard";
import { NormalEdge, type NormalCanvasEdge } from "@/components/flow/NormalEdge";
import { FlowValidationPanel } from "@/components/flow/FlowValidationPanel";
import { useFlowEditorState } from "@/components/flow/useFlowEditorState";
import {
  FlowApiError,
  discardFlowRevision,
  getFlowRevision,
  publishFlowRevision,
  validateFlowRevision
} from "@/lib/chatbotFlowClient";
import {
  buttonLabelValidationErrors,
  cloneGraph,
  conditionalActionConfig,
  deleteNodeWithConnections,
  errorsForElement,
  insertNodeInTransition,
  nextDraftEntityId,
  protectedFlowEntities,
  sameTransitionGroup,
  transitionActionSignature
} from "@/lib/chatbotFlowDomain";
import { layoutFlowGraph, needsInitialLayout } from "@/lib/chatbotFlowLayout";
import type {
  FlowGraph,
  FlowSelection,
  FlowTransition,
  FlowValidationResult
} from "@/types/chatbotFlow";

const nodeTypes = { flowNode: FlowNodeCard };
const edgeTypes = { normal: NormalEdge, conditional: ConditionalEdge };

export function FlowEditor({ revisionId }: { revisionId: number }) {
  const query = useQuery({
    queryKey: ["chatbot-flow", "revision", revisionId],
    queryFn: () => getFlowRevision(revisionId),
    retry: false
  });

  if (query.isLoading) {
    return <main className="flex h-screen flex-col bg-mist"><AdminHeader title="Fluxo do chatbot" description="Carregando revisão..." /><div className="m-6 rounded-xl border border-black/10 bg-white p-10 text-center text-sm text-ink/55">Carregando nós, transições e actions...</div></main>;
  }
  if (query.error || !query.data) {
    return <main className="flex h-screen flex-col bg-mist"><AdminHeader title="Fluxo do chatbot" description="Não foi possível abrir a revisão." /><div className="m-6 rounded-xl border border-coral/25 bg-coral/10 p-5"><p className="font-semibold text-coral">Erro ao carregar</p><p className="mt-1 text-sm text-ink/60">{query.error instanceof Error ? query.error.message : "Revisão não encontrada."}</p><button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg bg-coral px-3 py-2 text-sm font-semibold text-white">Tentar novamente</button></div></main>;
  }
  const { revision, ...graph } = query.data;
  return <ReactFlowProvider><LoadedFlowEditor key={`${revision.id}-${revision.status}`} revisionId={revisionId} revision={revision} initialGraph={graph} refetch={query.refetch} /></ReactFlowProvider>;
}

function LoadedFlowEditor({
  revisionId,
  revision,
  initialGraph,
  refetch
}: {
  revisionId: number;
  revision: Awaited<ReturnType<typeof getFlowRevision>>["revision"];
  initialGraph: FlowGraph;
  refetch: () => Promise<unknown>;
}) {
  const editable = revision.status === "DRAFT" && !revision.is_stale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const flow = useReactFlow<FlowCanvasNode, NormalCanvasEdge | ConditionalCanvasEdge>();
  const editor = useFlowEditorState({ initialGraph, revisionId, editable });
  const [selection, setSelection] = useState<FlowSelection>(null);
  const [validation, setValidation] = useState<FlowValidationResult | null>(null);
  const [validationStale, setValidationStale] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"layout" | "validate" | "publish" | "discard" | null>(null);
  const [retryPublish, setRetryPublish] = useState(false);
  const initialLayoutDone = useRef(false);
  const canvasRef = useRef<HTMLElement | null>(null);
  const dragStartGraphRef = useRef<FlowGraph | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const protections = useMemo(() => protectedFlowEntities(editor.graph), [editor.graph]);
  const localErrors = useMemo(() => buttonLabelValidationErrors(editor.graph), [editor.graph]);
  const displayedErrors = useMemo(() => {
    const combined = [...(validation?.errors ?? []), ...localErrors];
    return combined.filter((error, index) => combined.findIndex((candidate) =>
      candidate.code === error.code &&
      candidate.node_id === error.node_id &&
      candidate.transition_id === error.transition_id &&
      candidate.action_id === error.action_id
    ) === index);
  }, [localErrors, validation]);
  const displayedValidation = useMemo<FlowValidationResult | null>(() => {
    if (!validation && localErrors.length === 0) return null;
    return { valid: Boolean(validation?.valid) && localErrors.length === 0, errors: displayedErrors };
  }, [displayedErrors, localErrors.length, validation]);

  const commit = useCallback((next: FlowGraph, label: string, mergeKey?: string) => {
    if (validation) setValidationStale(true);
    editor.commit(next, label, mergeKey);
  }, [editor, validation]);

  const moveDragGhost = useCallback((canvasNode: FlowCanvasNode) => {
    const ghost = dragGhostRef.current;
    if (!ghost) return;
    const position = flow.flowToScreenPosition(canvasNode.position);
    ghost.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) scale(${flow.getZoom()})`;
  }, [flow]);

  const runLayout = useCallback(async (automatic = false) => {
    if (!automatic && editable && !window.confirm("Reorganizar todos os nós e salvar as novas coordenadas?")) return;
    setBusy("layout");
    try {
      const next = await layoutFlowGraph(editor.graphRef.current);
      if (editable) commit(next, "Organizar fluxo");
      else editor.replaceGraph(next, false);
      window.setTimeout(() => void flow.fitView({ padding: 0.12, duration: 500 }), 50);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível organizar o fluxo.");
    } finally {
      setBusy(null);
    }
  }, [commit, editable, editor, flow]);

  useEffect(() => {
    if (initialLayoutDone.current) return;
    initialLayoutDone.current = true;
    if (needsInitialLayout(initialGraph)) void runLayout(true);
  }, [initialGraph, runLayout]);

  const nodes = useMemo<FlowCanvasNode[]>(() => {
    const actionCounts = new Map<number, number>();
    const transitionById = new Map(editor.graph.transitions.map((item) => [item.id, item]));
    for (const action of editor.graph.transition_actions) {
      const transition = transitionById.get(action.transition_id);
      if (transition) actionCounts.set(transition.node_id, (actionCounts.get(transition.node_id) ?? 0) + 1);
    }
    return editor.graph.nodes.map((node) => ({
      id: `node-${node.id}`,
      type: "flowNode",
      position: { x: node.position_x, y: node.position_y },
      selected: selection?.kind === "node" && selection.id === node.id,
      data: {
        node,
        protected: protections.requiredNodes.has(node.id) || protections.dependencyNodes.has(node.id),
        errorCount: errorsForElement(displayedErrors, "node", node.id, node.key).length,
        actionCount: actionCounts.get(node.id) ?? 0
      }
    }));
  }, [displayedErrors, editor.graph, protections, selection]);

  const edges = useMemo<Array<NormalCanvasEdge | ConditionalCanvasEdge>>(() => {
    const result: Array<NormalCanvasEdge | ConditionalCanvasEdge> = [];
    const visualGroups = new Map<string, FlowTransition[]>();

    for (const transition of editor.graph.transitions) {
      const key = transition.button_label !== null
        ? `${transition.node_id}:${transition.next_node_id}:${transitionActionSignature(editor.graph, transition.id)}`
        : `transition:${transition.id}`;
      visualGroups.set(key, [...(visualGroups.get(key) ?? []), transition]);
    }

    for (const transitions of visualGroups.values()) {
      const orderedTransitions = [...transitions].sort((left, right) => left.position - right.position || left.id - right.id);
      const representative = orderedTransitions[0];
      const errorCount = orderedTransitions.reduce((count, transition) => count + errorsForElement(displayedErrors, "transition", transition.id).filter((error) => error.action_id == null).length, 0);
      const selected = selection?.kind === "transition" && orderedTransitions.some((transition) => sameTransitionGroup(editor.graph, transition.id, selection.id));
      result.push({
        id: `transition-${representative.id}`,
        type: "normal",
        source: `node-${representative.node_id}`,
        target: `node-${representative.next_node_id}`,
        selected,
        markerEnd: { type: MarkerType.ArrowClosed, color: errorCount ? "#d96f54" : selected ? "#d58b16" : "#6f8f7a" },
        data: {
          labels: orderedTransitions.map((transition) => transition.button_label || transition.expected_value || transition.input_type),
          errorCount,
          transitionIds: orderedTransitions.map((transition) => transition.id)
        },
        interactionWidth: 28
      });
    }

    const nodeByKey = new Map(editor.graph.nodes.map((node) => [node.key, node]));
    const transitionById = new Map(editor.graph.transitions.map((item) => [item.id, item]));
    for (const action of editor.graph.transition_actions) {
      const config = conditionalActionConfig(action);
      const transition = transitionById.get(action.transition_id);
      const target = config ? nodeByKey.get(config.target_node_key) : undefined;
      if (!config || !transition || !target) continue;
      const errorCount = errorsForElement(displayedErrors, "action", action.id).length;
      result.push({
        id: `action-${action.id}`,
        type: "conditional",
        source: `node-${transition.node_id}`,
        target: `node-${target.id}`,
        selected: selection?.kind === "action" && selection.id === action.id,
        markerEnd: { type: MarkerType.ArrowClosed, color: errorCount ? "#d96f54" : "#4776a6" },
        data: { label: `${config.source.field} ${config.operator} ${String(config.value)}`, errorCount },
        interactionWidth: 28
      });
    }
    return result;
  }, [displayedErrors, editor.graph, selection]);

  const selectEdge = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (edge.id.startsWith("transition-")) setSelection({ kind: "transition", id: Number(edge.id.replace("transition-", "")) });
    if (edge.id.startsWith("action-")) setSelection({ kind: "action", id: Number(edge.id.replace("action-", "")) });
  }, []);

  const selectNode: NodeMouseHandler<FlowCanvasNode> = useCallback((_event, node) => {
    setSelection({ kind: "node", id: node.data.node.id });
  }, []);

  const createNode = useCallback(() => {
    if (!editable) return;
    const graph = editor.graphRef.current;
    const id = nextDraftEntityId(graph);
    const bounds = canvasRef.current?.getBoundingClientRect();
    const center = flow.screenToFlowPosition({
      x: (bounds?.left ?? 0) + (bounds?.width ?? window.innerWidth) / 2,
      y: (bounds?.top ?? 0) + (bounds?.height ?? window.innerHeight) / 2
    });
    const next = {
      ...graph,
      nodes: [...graph.nodes, {
        id,
        key: `novo_no_${Math.abs(id)}`,
        type: "MESSAGE" as const,
        title: "Novo nó",
        description: null,
        message: "Nova mensagem",
        position: Math.max(0, ...graph.nodes.map((item) => item.position)) + 1,
        position_x: Math.round(center.x - 125),
        position_y: Math.round(center.y - 62)
      }]
    };
    commit(next, "Criar nó");
    setSelection({ kind: "node", id });
    void flow.setCenter(center.x, center.y, { zoom: flow.getZoom(), duration: 250 });
  }, [commit, editable, editor.graphRef, flow]);

  const connectNodes = useCallback((connection: Connection) => {
    if (!editable || !connection.source || !connection.target) return;
    const graph = editor.graphRef.current;
    const sourceId = Number(connection.source.replace("node-", ""));
    const targetId = Number(connection.target.replace("node-", ""));
    const source = graph.nodes.find((item) => item.id === sourceId);
    if (!source || source.type === "END") {
      setNotice("Um nó END não pode possuir transições.");
      return;
    }
    const id = nextDraftEntityId(graph);
    const transition: FlowTransition = {
      id,
      node_id: sourceId,
      input_type: "TEXT",
      expected_value: null,
      button_label: null,
      next_node_id: targetId,
      position: Math.max(-1, ...graph.transitions.filter((item) => item.node_id === sourceId).map((item) => item.position)) + 1
    };
    commit({ ...graph, transitions: [...graph.transitions, transition] }, "Criar transição");
    setSelection({ kind: "transition", id });
  }, [commit, editable, editor.graphRef]);

  const insertNode = useCallback((transitionId: number) => {
    const inserted = insertNodeInTransition(editor.graphRef.current, transitionId);
    commit(inserted.graph, "Inserir nó na transição");
    setSelection({ kind: "node", id: inserted.nodeId });
  }, [commit, editor.graphRef]);

  const deleteNode = useCallback((nodeId: number) => {
    try {
      const next = deleteNodeWithConnections(editor.graphRef.current, nodeId);
      commit(next, "Apagar nó");
      setSelection(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Este nó não pode ser apagado.");
    }
  }, [commit, editor.graphRef]);

  const deleteTransition = useCallback((transitionId: number) => {
    const graph = editor.graphRef.current;
    if (graph.transition_actions.some((item) => item.transition_id === transitionId)) {
      setNotice("Esta transição possui actions somente leitura e não pode ser apagada.");
      return;
    }
    commit({ ...graph, transitions: graph.transitions.filter((item) => item.id !== transitionId) }, "Apagar transição");
    setSelection(null);
  }, [commit, editor.graphRef]);

  const validate = useCallback(async () => {
    setBusy("validate");
    setNotice(null);
    try {
      const clientErrors = buttonLabelValidationErrors(editor.graphRef.current);
      if (clientErrors.length > 0) {
        const result: FlowValidationResult = { valid: false, errors: clientErrors };
        setValidation(result);
        setValidationStale(false);
        return result;
      }
      await editor.flush();
      const result = await validateFlowRevision(revisionId);
      setValidation(result);
      setValidationStale(false);
      return result;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível validar o fluxo.");
      return null;
    } finally {
      setBusy(null);
    }
  }, [editor, revisionId]);

  const publish = useCallback(async () => {
    const result = await validate();
    if (!result?.valid) return;
    if (!window.confirm("Publicar este fluxo? A revisão atual será substituída.")) return;
    setBusy("publish");
    setRetryPublish(false);
    try {
      await publishFlowRevision(revisionId);
      await queryClient.invalidateQueries({ queryKey: ["chatbot-flow"] });
      await refetch();
      window.location.reload();
    } catch (error) {
      if (error instanceof FlowApiError && error.detail.code === "FLOW_CACHE_PUBLISH_FAILED" && error.detail.retryable) setRetryPublish(true);
      if (error instanceof FlowApiError && error.detail.errors) {
        setValidation({ valid: false, errors: error.detail.errors });
        setValidationStale(false);
      }
      setNotice(error instanceof Error ? error.message : "Não foi possível publicar.");
    } finally {
      setBusy(null);
    }
  }, [queryClient, refetch, revisionId, validate]);

  const retryCachePublish = useCallback(async () => {
    setBusy("publish");
    try {
      await publishFlowRevision(revisionId);
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "A atualização do cache falhou novamente.");
    } finally {
      setBusy(null);
    }
  }, [revisionId]);

  const discard = useCallback(async () => {
    if (!window.confirm("Descartar este draft e todas as suas alterações?")) return;
    setBusy("discard");
    try {
      await discardFlowRevision(revisionId);
      await queryClient.invalidateQueries({ queryKey: ["chatbot-flow"] });
      router.push("/fluxo");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível descartar o draft.");
    } finally {
      setBusy(null);
    }
  }, [queryClient, revisionId, router]);

  const selectValidationError = useCallback((index: number) => {
    const error = displayedErrors[index];
    if (!error) return;
    if (error.action_id != null) setSelection({ kind: "action", id: error.action_id });
    else if (error.transition_id != null) setSelection({ kind: "transition", id: error.transition_id });
    else if (error.node_id != null) setSelection({ kind: "node", id: error.node_id });
    let node = error.node_id != null ? editor.graph.nodes.find((item) => item.id === error.node_id) : editor.graph.nodes.find((item) => item.key === error.node_key);
    if (!node && error.transition_id != null) {
      const transition = editor.graph.transitions.find((item) => item.id === error.transition_id);
      node = editor.graph.nodes.find((item) => item.id === transition?.node_id);
    }
    if (!node && error.action_id != null) {
      const action = editor.graph.transition_actions.find((item) => item.id === error.action_id);
      const transition = editor.graph.transitions.find((item) => item.id === action?.transition_id);
      node = editor.graph.nodes.find((item) => item.id === transition?.node_id);
    }
    if (node) void flow.setCenter(node.position_x + 125, node.position_y + 62, { zoom: 1, duration: 450 });
  }, [displayedErrors, editor.graph, flow]);

  const saveLabel = editor.saveStatus === "saving" ? "Salvando..." : editor.saveStatus === "pending" ? `${editor.pendingCount} pendente${editor.pendingCount === 1 ? "" : "s"}` : editor.saveStatus === "error" ? "Erro ao salvar" : editor.saveStatus === "conflict" ? "Conflito" : editor.lastSavedAt ? `Salvo ${editor.lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Salvo";

  const actions = <><span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${editor.saveStatus === "error" || editor.saveStatus === "conflict" ? "border-coral/30 bg-coral/10 text-coral" : "border-black/10 bg-white text-ink/60"}`}><Save className="h-3.5 w-3.5" />{saveLabel}</span>{editable ? <><button type="button" onClick={editor.undo} disabled={!editor.canUndo} className="rounded-lg border border-black/10 bg-white p-2 text-ink/60 hover:text-sage disabled:opacity-35" aria-label="Desfazer"><Undo2 className="h-4 w-4" /></button><button type="button" onClick={editor.redo} disabled={!editor.canRedo} className="rounded-lg border border-black/10 bg-white p-2 text-ink/60 hover:text-sage disabled:opacity-35" aria-label="Refazer"><Redo2 className="h-4 w-4" /></button><button type="button" onClick={() => void validate()} disabled={busy !== null} className="rounded-lg border border-sage/25 bg-white px-3 py-2 text-sm font-semibold text-sage hover:bg-sage/5">Validar</button><button type="button" onClick={() => void publish()} disabled={busy !== null || editor.saveStatus === "conflict"} className="rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white hover:bg-sage/90 disabled:opacity-50">Publicar</button></> : <span className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">Somente leitura · v{revision.version}</span>}</>;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-mist text-ink">
      <AdminHeader title="Fluxo do chatbot" description={`Revisão ${revision.id}${revision.version ? ` · versão ${revision.version}` : " · draft"}`} actions={actions} />
      {notice || editor.saveError ? <div className="flex shrink-0 items-center justify-between border-b border-coral/20 bg-coral/10 px-5 py-2 text-sm text-coral"><span>{notice || editor.saveError}</span><div className="flex items-center gap-2">{editor.saveStatus === "error" ? <button type="button" onClick={() => void editor.flush()} className="font-semibold underline">Tentar salvar</button> : null}{retryPublish ? <button type="button" onClick={() => void retryCachePublish()} className="font-semibold underline">Repetir publicação do cache</button> : null}<button type="button" onClick={() => setNotice(null)} className="font-semibold">Fechar</button></div></div> : null}
      <div className="flex min-h-0 flex-1">
        <FlowConfigPanel graph={editor.graph} selection={selection} editable={editable} errors={displayedErrors} onCommit={commit} onSelect={setSelection} onInsertNode={insertNode} onDeleteNode={deleteNode} onDeleteTransition={deleteTransition} />
        <section ref={canvasRef} className="relative min-w-0 flex-1">
          <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-white/95 p-2 shadow-subtle backdrop-blur">
            {editable ? <button type="button" onClick={createNode} className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Novo nó</button> : null}
            <button type="button" onClick={() => void runLayout(false)} disabled={busy === "layout"} className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-ink/65 hover:bg-mist"><LayoutTemplate className="h-4 w-4" />{busy === "layout" ? "Organizando..." : "Organizar"}</button>
            <button type="button" onClick={() => setSelection({ kind: "input-errors" })} className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-ink/65 hover:bg-mist"><AlertTriangle className="h-4 w-4" />Mensagens de erro</button>
            {displayedValidation?.valid && !validationStale ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Válido</span> : null}
            {editable ? <button type="button" onClick={() => void discard()} disabled={busy !== null} className="px-2 py-2 text-xs font-semibold text-coral hover:underline">Descartar draft</button> : null}
          </div>
          <ReactFlow<FlowCanvasNode, NormalCanvasEdge | ConditionalCanvasEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={editable}
            nodesConnectable={editable}
            elementsSelectable
            minZoom={0.08}
            maxZoom={2}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            onNodeClick={selectNode}
            onEdgeClick={selectEdge}
            onPaneClick={() => setSelection(null)}
            onConnect={connectNodes}
            onNodeDragStart={(_event, canvasNode) => {
              if (!editable) return;
              dragStartGraphRef.current = cloneGraph(editor.graphRef.current);
              const ghost = dragGhostRef.current;
              if (ghost) {
                const title = ghost.querySelector<HTMLElement>("[data-drag-title]");
                const key = ghost.querySelector<HTMLElement>("[data-drag-key]");
                const message = ghost.querySelector<HTMLElement>("[data-drag-message]");
                if (title) title.textContent = canvasNode.data.node.title;
                if (key) key.textContent = canvasNode.data.node.key;
                if (message) message.textContent = canvasNode.data.node.message || "Sem mensagem";
                ghost.style.display = "block";
                moveDragGhost(canvasNode);
              }
            }}
            onNodeDrag={(_event, canvasNode) => {
              if (!editable) return;
              moveDragGhost(canvasNode);
            }}
            onNodeDragStop={(_event, canvasNode) => {
              if (!editable) return;
              if (dragGhostRef.current) dragGhostRef.current.style.display = "none";
              if (validation) setValidationStale(true);
              const nodeId = canvasNode.data.node.id;
              const before = dragStartGraphRef.current ?? cloneGraph(editor.graphRef.current);
              const graph = editor.graphRef.current;
              const next = {
                ...graph,
                nodes: graph.nodes.map((node) => node.id === nodeId ? {
                  ...node,
                  position_x: Math.round(canvasNode.position.x),
                  position_y: Math.round(canvasNode.position.y)
                } : node)
              };
              dragStartGraphRef.current = null;
              editor.commitFrom(before, next, "Mover nó");
            }}
          >
            <Background color="#cad3cc" gap={24} size={1} />
            <Controls position="bottom-left" />
            <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => {
              const data = node.data as FlowCanvasNode["data"] | undefined;
              if (data?.node.type === "START") return "#6f8f7a";
              if (data?.node.type === "END") return "#17211b";
              return "#dfe6e1";
            }} />
          </ReactFlow>
          <div
            ref={dragGhostRef}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-[100] hidden w-[250px] rounded-xl border-2 border-dashed border-amber-500 bg-amber-50/80 p-3 text-ink opacity-80 shadow-xl backdrop-blur-[1px] will-change-transform"
            style={{ transformOrigin: "top left" }}
          >
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800">PRÉVIA</span>
            <p data-drag-title className="mt-1 truncate text-sm font-semibold" />
            <p data-drag-key className="truncate text-[11px] text-ink/45" />
            <p data-drag-message className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink/65" />
          </div>
          <div className="pointer-events-none absolute bottom-4 left-16 z-10 flex items-center gap-3 rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-[11px] text-ink/55"><span className="inline-flex items-center gap-1"><span className="h-0.5 w-6 bg-sage" />Transição normal</span><span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rotate-45 bg-[#4776a6]" />Action condicional</span><span className="inline-flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" />Arraste entre conectores para criar</span></div>
          <FlowValidationPanel result={displayedValidation} stale={validationStale} onClose={() => setValidation(null)} onSelectError={selectValidationError} />
        </section>
      </div>
    </main>
  );
}
