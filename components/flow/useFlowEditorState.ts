"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FlowApiError, saveFlowChanges } from "@/lib/chatbotFlowClient";
import {
  buildFlowChanges,
  cloneGraph,
  knownEntityKeys,
  recordSavedCreates
} from "@/lib/chatbotFlowDomain";
import type { FlowGraph, FlowSaveStatus } from "@/types/chatbotFlow";

type HistoryEntry = {
  before: FlowGraph;
  after: FlowGraph;
  label: string;
  mergeKey?: string;
  at: number;
};

export function useFlowEditorState({
  initialGraph,
  revisionId,
  editable
}: {
  initialGraph: FlowGraph;
  revisionId: number;
  editable: boolean;
}) {
  const [graph, setGraphState] = useState(() => cloneGraph(initialGraph));
  const graphRef = useRef(graph);
  const baselineRef = useRef(cloneGraph(initialGraph));
  const knownRef = useRef(knownEntityKeys(initialGraph));
  const undoRef = useRef<HistoryEntry[]>([]);
  const redoRef = useRef<HistoryEntry[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<FlowSaveStatus>(editable ? "idle" : "saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSaveRef = useRef<Promise<void> | null>(null);

  const pendingCount = editable
    ? buildFlowChanges(baselineRef.current, graph, knownRef.current).length
    : 0;

  const setGraph = useCallback((next: FlowGraph, schedule = true) => {
    graphRef.current = next;
    setGraphState(next);
    if (!editable || !schedule) return;
    setSaveError(null);
    setSaveStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushRef.current().catch(() => undefined);
    }, 750);
  }, [editable]);

  const commitFrom = useCallback(
    (before: FlowGraph, next: FlowGraph, label: string, mergeKey?: string) => {
      if (before === next || JSON.stringify(before) === JSON.stringify(next)) return;
      const now = Date.now();
      const last = undoRef.current.at(-1);
      if (mergeKey && last?.mergeKey === mergeKey && now - last.at < 1000) {
        last.after = next;
        last.at = now;
      } else {
        undoRef.current.push({ before, after: next, label, mergeKey, at: now });
        if (undoRef.current.length > 100) undoRef.current.shift();
      }
      redoRef.current = [];
      setHistoryVersion((value) => value + 1);
      setGraph(next);
    },
    [setGraph]
  );

  const commit = useCallback((next: FlowGraph, label: string, mergeKey?: string) => {
    commitFrom(graphRef.current, next, label, mergeKey);
  }, [commitFrom]);

  const flush = useCallback(async (): Promise<void> => {
    if (!editable) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (activeSaveRef.current) {
      await activeSaveRef.current;
      if (buildFlowChanges(baselineRef.current, graphRef.current, knownRef.current).length) {
        return flushRef.current();
      }
      return;
    }
    const changes = buildFlowChanges(baselineRef.current, graphRef.current, knownRef.current);
    if (changes.length === 0) {
      setSaveStatus("saved");
      return;
    }
    const sentSnapshot = cloneGraph(graphRef.current);
    setSaveStatus("saving");
    setSaveError(null);
    const task = (async () => {
      try {
        await saveFlowChanges(revisionId, changes);
        recordSavedCreates(knownRef.current, changes);
        baselineRef.current = sentSnapshot;
        setLastSavedAt(new Date());
        const remaining = buildFlowChanges(
          baselineRef.current,
          graphRef.current,
          knownRef.current
        );
        setSaveStatus(remaining.length ? "pending" : "saved");
      } catch (error) {
        const conflict = error instanceof FlowApiError && error.status === 409;
        setSaveStatus(conflict ? "conflict" : "error");
        setSaveError(error instanceof Error ? error.message : "Não foi possível salvar.");
        throw error;
      }
    })();
    activeSaveRef.current = task;
    try {
      await task;
    } finally {
      activeSaveRef.current = null;
    }
  }, [editable, revisionId]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const undo = useCallback(() => {
    const entry = undoRef.current.pop();
    if (!entry) return;
    redoRef.current.push(entry);
    setHistoryVersion((value) => value + 1);
    setGraph(entry.before);
  }, [setGraph]);

  const redo = useCallback(() => {
    const entry = redoRef.current.pop();
    if (!entry) return;
    undoRef.current.push(entry);
    setHistoryVersion((value) => value + 1);
    setGraph(entry.after);
  }, [setGraph]);

  useEffect(() => {
    if (!editable) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasPending = buildFlowChanges(
        baselineRef.current,
        graphRef.current,
        knownRef.current
      ).length > 0;
      if (hasPending) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [editable]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return {
    graph,
    graphRef,
    commit,
    commitFrom,
    replaceGraph: setGraph,
    flush,
    undo,
    redo,
    canUndo: historyVersion >= 0 && undoRef.current.length > 0,
    canRedo: historyVersion >= 0 && redoRef.current.length > 0,
    saveStatus,
    saveError,
    lastSavedAt,
    pendingCount
  };
}
