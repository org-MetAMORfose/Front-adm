// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/chatbotFlowClient", () => ({
  FlowApiError: class FlowApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
  saveFlowChanges: vi.fn()
}));

import { useFlowEditorState } from "@/components/flow/useFlowEditorState";
import { saveFlowChanges } from "@/lib/chatbotFlowClient";
import type { FlowGraph } from "@/types/chatbotFlow";

const saveMock = vi.mocked(saveFlowChanges);

function graph(): FlowGraph {
  return {
    nodes: [
      { id: 1, key: "inicio", type: "START", title: "Início", description: null, message: "Olá", position: 0, position_x: 10, position_y: 10 }
    ],
    transitions: [],
    transition_actions: [],
    input_error_messages: [],
    action_dependencies: []
  };
}

describe("flow autosave", () => {
  beforeEach(() => {
    saveMock.mockReset();
    vi.useRealTimers();
  });

  it("faz debounce e envia somente o último valor do campo", async () => {
    vi.useFakeTimers();
    saveMock.mockResolvedValue({ revision_id: 2, change_count: 1 });
    const { result } = renderHook(() => useFlowEditorState({ initialGraph: graph(), revisionId: 2, editable: true }));

    act(() => {
      const first = graph();
      first.nodes[0].message = "O";
      result.current.commit(first, "Editar mensagem", "message");
      const second = graph();
      second.nodes[0].message = "Olá de novo";
      result.current.commit(second, "Editar mensagem", "message");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(749);
    });
    expect(saveMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][1][0]).toMatchObject({
      operation: "UPDATE",
      new_value: { message: "Olá de novo" }
    });
  });

  it("serializa requisições e envia alterações feitas durante o primeiro save", async () => {
    let resolveFirst: ((value: { revision_id: number; change_count: number }) => void) | undefined;
    saveMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValue({ revision_id: 2, change_count: 1 });
    const { result } = renderHook(() => useFlowEditorState({ initialGraph: graph(), revisionId: 2, editable: true }));

    const first = graph();
    first.nodes[0].title = "Primeiro";
    act(() => result.current.commit(first, "Editar título"));
    let firstFlush!: Promise<void>;
    await act(async () => {
      firstFlush = result.current.flush();
      await Promise.resolve();
    });
    expect(saveMock).toHaveBeenCalledTimes(1);

    const second = graph();
    second.nodes[0].title = "Segundo";
    act(() => result.current.commit(second, "Editar título"));
    let secondFlush!: Promise<void>;
    act(() => {
      secondFlush = result.current.flush();
    });
    expect(saveMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst?.({ revision_id: 2, change_count: 1 });
      await Promise.all([firstFlush, secondFlush]);
    });
    expect(saveMock).toHaveBeenCalledTimes(2);
    expect(saveMock.mock.calls[1][1][0]).toMatchObject({ new_value: { title: "Segundo" } });
  });

  it("faz flush imediato sem esperar o debounce", async () => {
    saveMock.mockResolvedValue({ revision_id: 2, change_count: 1 });
    const { result } = renderHook(() => useFlowEditorState({ initialGraph: graph(), revisionId: 2, editable: true }));
    const moved = graph();
    moved.nodes[0].position_x = 420;
    moved.nodes[0].position_y = 180;

    act(() => result.current.commit(moved, "Mover nó"));
    await act(async () => result.current.flush());

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][1][0]).toMatchObject({
      new_value: { position_x: 420, position_y: 180 }
    });
  });
});
