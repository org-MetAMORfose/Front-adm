import { describe, expect, it } from "vitest";

import {
  buildFlowChanges,
  buttonLabelValidationErrors,
  deleteNodeWithConnections,
  groupedButtonTransitions,
  insertNodeInTransition,
  knownEntityKeys,
  limitButtonLabel,
  normalizeButtonExpectedValue,
  protectedFlowEntities
} from "@/lib/chatbotFlowDomain";
import { layoutFlowGraph, needsInitialLayout } from "@/lib/chatbotFlowLayout";
import type { FlowGraph } from "@/types/chatbotFlow";

function graph(): FlowGraph {
  return {
    nodes: [
      { id: 1, key: "inicio", type: "START", title: "Início", description: null, message: "Olá", position: 0, position_x: 0, position_y: 0 },
      { id: 2, key: "fim", type: "END", title: "Fim", description: null, message: "Tchau", position: 1, position_x: 0, position_y: 0 }
    ],
    transitions: [
      { id: 10, node_id: 1, input_type: "TEXT", expected_value: null, button_label: null, next_node_id: 2, position: 0 }
    ],
    transition_actions: [],
    input_error_messages: [
      { id: 1, input_type: "TEXT", message: "Entrada inválida" }
    ],
    action_dependencies: []
  };
}

describe("chatbot flow domain", () => {
  it("gera somente os campos modificados em um UPDATE", () => {
    const baseline = graph();
    const current = graph();
    current.nodes[0].message = "Nova mensagem";

    expect(buildFlowChanges(baseline, current, knownEntityKeys(baseline))).toEqual([
      {
        entity_type: "NODE",
        operation: "UPDATE",
        entity_id: 1,
        new_value: { message: "Nova mensagem" }
      }
    ]);
  });

  it("cria IDs temporários e ordena nó antes de transição", () => {
    const baseline = graph();
    const inserted = insertNodeInTransition(baseline, 10).graph;
    const changes = buildFlowChanges(baseline, inserted, knownEntityKeys(baseline));

    expect(changes[0]).toMatchObject({ entity_type: "NODE", operation: "CREATE", draft_entity_id: -1 });
    expect(changes[1]).toMatchObject({ entity_type: "TRANSITION", operation: "CREATE", draft_entity_id: -2 });
    expect(changes[2]).toEqual({
      entity_type: "TRANSITION",
      operation: "UPDATE",
      entity_id: 10,
      new_value: { next_node_id: -1 }
    });
  });

  it("insere um nó preservando a transição original e continua com AUTO", () => {
    const inserted = insertNodeInTransition(graph(), 10);
    const original = inserted.graph.transitions.find((item) => item.id === 10);
    const continuation = inserted.graph.transitions.find((item) => item.node_id === inserted.nodeId);

    expect(original?.next_node_id).toBe(inserted.nodeId);
    expect(continuation).toMatchObject({ input_type: "AUTO", next_node_id: 2 });
  });

  it("impede apagar nó com action obrigatória", () => {
    const current = graph();
    current.transition_actions.push({ id: 20, transition_id: 10, action_key: "required", config: null, is_required: true });

    expect(protectedFlowEntities(current).requiredNodes.has(1)).toBe(true);
    expect(() => deleteNodeWithConnections(current, 1)).toThrow("action obrigatória");
  });

  it("gera mudança compensatória ao restaurar entidade já conhecida", () => {
    const original = graph();
    const deleted = graph();
    deleted.nodes = deleted.nodes.filter((item) => item.id !== 2);
    deleted.transitions = [];
    const known = knownEntityKeys(original);
    const changes = buildFlowChanges(deleted, original, known);

    expect(changes.some((item) => item.entity_type === "NODE" && item.operation === "UPDATE" && item.entity_id === 2)).toBe(true);
  });

  it("organiza grafo com ciclo sem perder a aresta de retorno", async () => {
    const current = graph();
    current.nodes.push({ id: 3, key: "loop", type: "MESSAGE", title: "Loop", description: null, message: "Novamente", position: 2, position_x: 0, position_y: 0 });
    current.transitions[0].next_node_id = 3;
    current.transitions.push(
      { id: 11, node_id: 3, input_type: "TEXT", expected_value: "fim", button_label: null, next_node_id: 2, position: 0 },
      { id: 12, node_id: 3, input_type: "TEXT", expected_value: "voltar", button_label: null, next_node_id: 1, position: 1 }
    );

    expect(needsInitialLayout(current)).toBe(true);
    const layouted = await layoutFlowGraph(current);
    expect(layouted.transitions).toHaveLength(3);
    expect(new Set(layouted.nodes.map((item) => `${item.position_x}:${item.position_y}`)).size).toBe(3);
  });
});

describe("button transition groups", () => {
  it("groups buttons with the same ordered action config across destinations", () => {
    const current = graph();
    current.nodes.push({ id: 3, key: "outro", type: "END", title: "Outro", description: null, message: "Outro", position: 2, position_x: 0, position_y: 0 });
    current.transitions = [
      { id: 10, node_id: 1, input_type: "TEXT", expected_value: "primeiro", button_label: "Primeiro", next_node_id: 2, position: 0 },
      { id: 11, node_id: 1, input_type: "TEXT", expected_value: "segundo", button_label: "Segundo", next_node_id: 3, position: 1 }
    ];
    current.transition_actions = [
      { id: 20, transition_id: 10, action_key: "action_x", config: { mode: "same" }, is_required: false },
      { id: 21, transition_id: 11, action_key: "action_x", config: { mode: "same" }, is_required: false }
    ];

    expect(groupedButtonTransitions(current, 10).map((item) => item.id)).toEqual([10, 11]);
  });

  it("does not group buttons whose action config differs", () => {
    const current = graph();
    current.transitions = [
      { id: 10, node_id: 1, input_type: "TEXT", expected_value: "primeiro", button_label: "Primeiro", next_node_id: 2, position: 0 },
      { id: 11, node_id: 1, input_type: "TEXT", expected_value: "segundo", button_label: "Segundo", next_node_id: 2, position: 1 }
    ];
    current.transition_actions = [
      { id: 20, transition_id: 10, action_key: "action_x", config: { mode: "a" }, is_required: false },
      { id: 21, transition_id: 11, action_key: "action_x", config: { mode: "b" }, is_required: false }
    ];

    expect(groupedButtonTransitions(current, 10).map((item) => item.id)).toEqual([10]);
  });

  it("limits button labels to 20 characters and normalizes the expected value", () => {
    expect(limitButtonLabel("12345678901234567890extra")).toBe("12345678901234567890");
    expect(normalizeButtonExpectedValue("Dúvidas Agora")).toBe("duvidas agora");

    const current = graph();
    current.transitions[0].button_label = "123456789012345678901";
    expect(buttonLabelValidationErrors(current)).toMatchObject([
      { code: "BUTTON_LABEL_TOO_LONG", transition_id: 10, details: { max_length: 20, actual_length: 21 } }
    ]);
  });
});
