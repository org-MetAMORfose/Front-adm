// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ActionComposer } from "@/components/flow/ActionComposer";
import { FlowConfigPanel } from "@/components/flow/FlowConfigPanel";
import type { FlowActionDefinition, FlowGraph } from "@/types/chatbotFlow";

const definition: FlowActionDefinition = {
  key: "sheets_store_answer",
  label: "Guardar resposta",
  description: "Guarda a resposta em uma coluna.",
  config_type: "sheets_store_answer",
  default_is_required: false,
  parameters: [
    { key: "tab", label: "Nome da aba", type: "string", required: true },
    { key: "column", label: "Coluna", type: "string", required: true, pattern: "^[A-Z]{1,3}$" }
  ]
};

function graph(): FlowGraph {
  return {
    nodes: [
      { id: 1, key: "inicio", type: "START", title: "Início", description: null, message: "Escolha", position: 0, position_x: 0, position_y: 0 },
      { id: 2, key: "fim", type: "END", title: "Fim", description: null, message: "Fim", position: 1, position_x: 300, position_y: 0 }
    ],
    transitions: [
      { id: 10, node_id: 1, input_type: "TEXT", expected_value: "a", button_label: "A", next_node_id: 2, position: 0 },
      { id: 11, node_id: 1, input_type: "TEXT", expected_value: "b", button_label: "B", next_node_id: 2, position: 1 }
    ],
    transition_actions: [],
    input_error_messages: [],
    action_dependencies: []
  };
}

describe("flow action composer", () => {
  it("aplica uma nova action somente às transições selecionadas", () => {
    const current = graph();
    const onCommit = vi.fn();
    render(
      <ActionComposer
        graph={current}
        transitions={current.transitions}
        definitions={[definition]}
        editable
        onCommit={onCommit}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar action" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "B" }));
    fireEvent.change(screen.getByLabelText("Nome da aba"), { target: { value: "Cadastro" } });
    fireEvent.change(screen.getByLabelText("Coluna"), { target: { value: "g" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    const next = onCommit.mock.calls[0][0] as FlowGraph;
    expect(next.transition_actions).toEqual([
      expect.objectContaining({
        transition_id: 10,
        action_key: "sheets_store_answer",
        config: {
          config_type: "sheets_store_answer",
          tab: "Cadastro",
          column: "G"
        },
        is_required: false
      })
    ]);
  });

  it("impede salvar uma aba inexistente e oferece as abas reais", () => {
    const current = graph();
    current.transition_actions = [
      {
        id: 20,
        transition_id: 10,
        action_key: "sheets_store_answer",
        config: {
          config_type: "sheets_store_answer",
          tab: "Página 2",
          column: "G"
        },
        is_required: false
      }
    ];
    const onCommit = vi.fn();
    render(
      <ActionComposer
        graph={current}
        transitions={[current.transitions[0]]}
        definitions={[definition]}
        sheetTabs={[
          { title: "Página1", gid: 0 },
          { title: "Página2", gid: 2125424635 }
        ]}
        sheetTabsReady
        editable
        onCommit={onCommit}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar action" }));

    const tab = screen.getByLabelText("Nome da aba") as HTMLSelectElement;
    expect(tab.value).toBe("Página 2");
    expect(screen.getByText(/A aba “Página 2” não existe/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(tab, { target: { value: "Página2" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    const next = onCommit.mock.calls[0][0] as FlowGraph;
    expect(next.transition_actions[0].config?.tab).toBe("Página2");
  });

  it("permite apagar somente um botão do grupo", () => {
    const current = graph();
    const onDeleteTransition = vi.fn();
    render(
      <FlowConfigPanel
        graph={current}
        selection={{ kind: "transition", id: 10 }}
        editable
        errors={[]}
        actionDefinitions={[definition]}
        onCommit={vi.fn()}
        onSelect={vi.fn()}
        onInsertNode={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteTransition={onDeleteTransition}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apagar botão B" }));
    expect(onDeleteTransition).toHaveBeenCalledWith(11);
  });

  it("mostra adições sem action antes dos grupos existentes", () => {
    const current = graph();
    render(
      <FlowConfigPanel
        graph={current}
        selection={{ kind: "node", id: 1 }}
        editable
        errors={[]}
        actionDefinitions={[definition]}
        onCommit={vi.fn()}
        onSelect={vi.fn()}
        onInsertNode={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteTransition={vi.fn()}
      />
    );

    const addButton = screen.getByRole("button", { name: "Adicionar botão sem action" });
    const addType = screen.getByRole("button", { name: "Adicionar tipo sem action" });
    const group = screen.getByText("2 botões").closest("button");

    expect(addButton.compareDocumentPosition(addType) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(group).not.toBeNull();
    expect(addType.compareDocumentPosition(group!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });
});
