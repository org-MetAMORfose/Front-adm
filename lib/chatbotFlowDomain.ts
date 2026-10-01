import type {
  FlowChange,
  FlowEntityType,
  FlowGraph,
  FlowInputErrorMessage,
  FlowNode,
  FlowTransition,
  FlowTransitionAction,
  FlowValidationError
} from "@/types/chatbotFlow";

type Entity = FlowNode | FlowTransition | FlowTransitionAction | FlowInputErrorMessage;

const collectionByEntity: Record<FlowEntityType, keyof FlowGraph> = {
  NODE: "nodes",
  TRANSITION: "transitions",
  TRANSITION_ACTION: "transition_actions",
  INPUT_ERROR_MESSAGE: "input_error_messages"
};

export const BUTTON_LABEL_MAX_LENGTH = 20;

const fieldsByEntity: Record<FlowEntityType, readonly string[]> = {
  NODE: ["key", "type", "title", "description", "message", "position", "position_x", "position_y"],
  TRANSITION: ["node_id", "input_type", "expected_value", "button_label", "next_node_id", "position"],
  TRANSITION_ACTION: ["transition_id", "action_key", "config", "is_required"],
  INPUT_ERROR_MESSAGE: ["input_type", "message"]
};

export function cloneGraph(graph: FlowGraph): FlowGraph {
  return {
    nodes: graph.nodes.map((item) => ({ ...item })),
    transitions: graph.transitions.map((item) => ({ ...item })),
    transition_actions: graph.transition_actions.map((item) => ({
      ...item,
      config: item.config ? structuredClone(item.config) : null
    })),
    input_error_messages: graph.input_error_messages.map((item) => ({ ...item })),
    action_dependencies: graph.action_dependencies.map((item) => ({ ...item }))
  };
}

function entityKey(type: FlowEntityType, id: number) {
  return `${type}:${id}`;
}

export function knownEntityKeys(graph: FlowGraph): Set<string> {
  const keys = new Set<string>();
  (Object.keys(collectionByEntity) as FlowEntityType[]).forEach((type) => {
    const collection = graph[collectionByEntity[type]] as Entity[];
    collection.forEach((entity) => keys.add(entityKey(type, entity.id)));
  });
  return keys;
}

function valueFor(entity: Entity, type: FlowEntityType) {
  const value: Record<string, unknown> = {};
  for (const field of fieldsByEntity[type]) {
    value[field] = (entity as unknown as Record<string, unknown>)[field];
  }
  return value;
}

function changedValue(before: Entity, after: Entity, type: FlowEntityType) {
  const result: Record<string, unknown> = {};
  const left = before as unknown as Record<string, unknown>;
  const right = after as unknown as Record<string, unknown>;
  for (const field of fieldsByEntity[type]) {
    if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
      result[field] = right[field];
    }
  }
  return result;
}

function identity(id: number) {
  return id < 0 ? { draft_entity_id: id } : { entity_id: id };
}

const createOrder: FlowEntityType[] = ["NODE", "TRANSITION", "TRANSITION_ACTION", "INPUT_ERROR_MESSAGE"];
const deleteOrder = [...createOrder].reverse();

export function buildFlowChanges(
  baseline: FlowGraph,
  current: FlowGraph,
  known: ReadonlySet<string>
): FlowChange[] {
  const creates: FlowChange[] = [];
  const updates: FlowChange[] = [];
  const deletes: FlowChange[] = [];

  for (const type of createOrder) {
    const collectionName = collectionByEntity[type];
    const before = new Map((baseline[collectionName] as Entity[]).map((entity) => [entity.id, entity]));
    const after = new Map((current[collectionName] as Entity[]).map((entity) => [entity.id, entity]));

    for (const [id, entity] of after) {
      const previous = before.get(id);
      if (!previous) {
        if (known.has(entityKey(type, id))) {
          updates.push({
            entity_type: type,
            operation: "UPDATE",
            ...identity(id),
            new_value: valueFor(entity, type)
          });
        } else {
          if (id >= 0) throw new Error(`Nova entidade ${type} deve usar ID negativo.`);
          creates.push({
            entity_type: type,
            operation: "CREATE",
            draft_entity_id: id,
            new_value: valueFor(entity, type)
          });
        }
        continue;
      }
      const diff = changedValue(previous, entity, type);
      if (Object.keys(diff).length > 0) {
        updates.push({
          entity_type: type,
          operation: "UPDATE",
          ...identity(id),
          new_value: diff
        });
      }
    }

    for (const id of before.keys()) {
      if (!after.has(id)) {
        deletes.push({ entity_type: type, operation: "DELETE", ...identity(id) });
      }
    }
  }

  return [
    ...createOrder.flatMap((type) => creates.filter((item) => item.entity_type === type)),
    ...updates,
    ...deleteOrder.flatMap((type) => deletes.filter((item) => item.entity_type === type))
  ];
}

export function recordSavedCreates(known: Set<string>, changes: FlowChange[]) {
  for (const change of changes) {
    if (change.operation === "CREATE" && change.draft_entity_id !== undefined) {
      known.add(entityKey(change.entity_type, change.draft_entity_id));
    }
  }
}

export function nextDraftEntityId(graph: FlowGraph) {
  const ids = [
    ...graph.nodes,
    ...graph.transitions,
    ...graph.transition_actions,
    ...graph.input_error_messages
  ].map((item) => item.id);
  return Math.min(0, ...ids) - 1;
}

export function protectedFlowEntities(graph: FlowGraph) {
  const transitionById = new Map(graph.transitions.map((item) => [item.id, item]));
  const dependencyActions = new Set(
    graph.action_dependencies.flatMap((item) => [item.action_id, item.depends_on_id])
  );
  const requiredNodes = new Set<number>();
  const dependencyTransitions = new Set<number>();
  const dependencyNodes = new Set<number>();

  for (const action of graph.transition_actions) {
    const transition = transitionById.get(action.transition_id);
    if (!transition) continue;
    if (action.is_required) requiredNodes.add(transition.node_id);
    if (dependencyActions.has(action.id)) {
      dependencyTransitions.add(transition.id);
      dependencyNodes.add(transition.node_id);
    }
  }
  return { requiredNodes, dependencyActions, dependencyTransitions, dependencyNodes };
}

export function insertNodeInTransition(
  graph: FlowGraph,
  transitionId: number
): { graph: FlowGraph; nodeId: number } {
  const transition = graph.transitions.find((item) => item.id === transitionId);
  if (!transition) throw new Error("Transição não encontrada.");
  const source = graph.nodes.find((item) => item.id === transition.node_id);
  const target = graph.nodes.find((item) => item.id === transition.next_node_id);
  if (!source || !target) throw new Error("Origem ou destino da transição não existe.");

  const nodeId = nextDraftEntityId(graph);
  const nextTransitionId = nodeId - 1;
  const logicalPosition = Math.max(0, ...graph.nodes.map((item) => item.position)) + 1;
  const node: FlowNode = {
    id: nodeId,
    key: `novo_no_${Math.abs(nodeId)}`,
    type: "MESSAGE",
    title: "Novo nó",
    description: null,
    message: "Nova mensagem",
    position: logicalPosition,
    position_x: Math.round((source.position_x + target.position_x) / 2),
    position_y: Math.round((source.position_y + target.position_y) / 2)
  };
  const continuation: FlowTransition = {
    id: nextTransitionId,
    node_id: nodeId,
    input_type: "AUTO",
    expected_value: null,
    button_label: null,
    next_node_id: target.id,
    position: 0
  };
  return {
    nodeId,
    graph: {
      ...graph,
      nodes: [...graph.nodes, node],
      transitions: [
        ...graph.transitions.map((item) => item.id === transitionId ? { ...item, next_node_id: nodeId } : item),
        continuation
      ]
    }
  };
}

export function deleteNodeWithConnections(graph: FlowGraph, nodeId: number): FlowGraph {
  const protections = protectedFlowEntities(graph);
  if (protections.requiredNodes.has(nodeId)) {
    throw new Error("Este nó possui uma action obrigatória e não pode ser apagado.");
  }
  if (protections.dependencyNodes.has(nodeId)) {
    throw new Error("Este nó contém uma action usada por uma dependência fixa.");
  }
  const transitionIds = new Set(
    graph.transitions
      .filter((item) => item.node_id === nodeId || item.next_node_id === nodeId)
      .map((item) => item.id)
  );
  const nestedActions = graph.transition_actions.filter((item) => transitionIds.has(item.transition_id));
  if (nestedActions.length > 0) {
    throw new Error("Este nó possui actions relacionadas, que são somente leitura nesta versão.");
  }
  return {
    ...graph,
    nodes: graph.nodes.filter((item) => item.id !== nodeId),
    transitions: graph.transitions.filter((item) => !transitionIds.has(item.id))
  };
}

export type ActionTransitionLike = {
  config_type: "action_transition";
  source: { type: "action_result"; field: string };
  operator: string;
  value: unknown;
  target_node_key: string;
};

export function conditionalActionConfig(action: FlowTransitionAction) {
  const config = action.config;
  if (
    config?.config_type === "action_transition" &&
    typeof config.target_node_key === "string" &&
    typeof config.operator === "string" &&
    typeof config.source === "object" &&
    config.source !== null
  ) {
    return config as ActionTransitionLike;
  }
  return null;
}

export function buttonLabelLength(value: string) {
  return Array.from(value).length;
}

export function limitButtonLabel(value: string) {
  return Array.from(value).slice(0, BUTTON_LABEL_MAX_LENGTH).join("");
}

export function normalizeButtonExpectedValue(value: string) {
  return value.trim().toLowerCase();
}


export type AddButtonOptions = {
  sourceNodeId: number;
  templateTransitionId?: number | null;
  label: string;
  destinationNodeId?: number | null;
  newNode?: {
    title: string;
    message: string;
  };
};

export function addButtonToFlow(
  graph: FlowGraph,
  options: AddButtonOptions
): { graph: FlowGraph; transitionId: number; nodeId?: number } {
  const source = graph.nodes.find((node) => node.id === options.sourceNodeId);
  if (!source) throw new Error("Nó de origem não encontrado.");
  if (source.type === "END") throw new Error("Um nó END não pode possuir botões.");

  const label = limitButtonLabel(options.label.trim());
  if (!label) throw new Error("Informe o nome do botão.");
  const expectedValue = normalizeButtonExpectedValue(label);
  const duplicate = graph.transitions.some(
    (transition) =>
      transition.node_id === source.id &&
      transition.button_label !== null &&
      normalizeButtonExpectedValue(transition.button_label) === expectedValue
  );
  if (duplicate) throw new Error("Já existe um botão com esse nome neste nó.");

  const template = options.templateTransitionId == null
    ? null
    : graph.transitions.find((transition) => transition.id === options.templateTransitionId);
  if (options.templateTransitionId != null && (!template || template.node_id !== source.id)) {
    throw new Error("O grupo de actions não pertence ao nó de origem.");
  }

  let draftId = nextDraftEntityId(graph);
  let createdNode: FlowNode | undefined;
  let destinationNodeId = options.destinationNodeId ?? null;
  if (options.newNode) {
    const title = options.newNode.title.trim() || "Novo nó";
    createdNode = {
      id: draftId,
      key: `novo_no_${Math.abs(draftId)}`,
      type: "MESSAGE",
      title,
      description: null,
      message: options.newNode.message.trim() || "Nova mensagem",
      position: Math.max(0, ...graph.nodes.map((node) => node.position)) + 1,
      position_x: source.position_x + 360,
      position_y: source.position_y + Math.max(0, graph.transitions.filter((transition) => transition.node_id === source.id).length - 1) * 70
    };
    destinationNodeId = draftId;
    draftId -= 1;
  }
  if (destinationNodeId == null || (!createdNode && !graph.nodes.some((node) => node.id === destinationNodeId))) {
    throw new Error("Selecione um nó de destino.");
  }

  const outgoing = graph.transitions.filter((transition) => transition.node_id === source.id);
  const genericTextPositions = outgoing
    .filter((transition) => transition.input_type === "TEXT" && transition.expected_value === null && transition.button_label === null)
    .map((transition) => transition.position);
  const position = genericTextPositions.length
    ? Math.min(...genericTextPositions)
    : Math.max(-1, ...outgoing.map((transition) => transition.position)) + 1;
  const transitionId = draftId;
  draftId -= 1;
  const transition: FlowTransition = {
    id: transitionId,
    node_id: source.id,
    input_type: "TEXT",
    expected_value: expectedValue,
    button_label: label,
    next_node_id: destinationNodeId,
    position
  };

  const templateActions = template
    ? graph.transition_actions.filter((action) => action.transition_id === template.id)
    : [];
  const copiedActions: FlowTransitionAction[] = templateActions.map((action) => ({
    id: draftId--,
    transition_id: transitionId,
    action_key: action.action_key,
    config: action.config === null ? null : structuredClone(action.config),
    is_required: action.is_required
  }));

  return {
    transitionId,
    nodeId: createdNode?.id,
    graph: {
      ...graph,
      nodes: createdNode ? [...graph.nodes, createdNode] : graph.nodes,
      transitions: [
        ...graph.transitions.map((item) => item.node_id === source.id && item.position >= position
          ? { ...item, position: item.position + 1 }
          : item),
        transition
      ],
      transition_actions: [...graph.transition_actions, ...copiedActions]
    }
  };
}

export type AddInputTypeOptions = {
  sourceNodeId: number;
  templateTransitionId?: number | null;
  inputType: FlowTransition["input_type"];
  destinationNodeId: number;
};

export function addInputTypeToFlow(
  graph: FlowGraph,
  options: AddInputTypeOptions
): { graph: FlowGraph; transitionId: number } {
  const source = graph.nodes.find((node) => node.id === options.sourceNodeId);
  if (!source) throw new Error("Nó de origem não encontrado.");
  if (source.type === "END") throw new Error("Um nó END não pode aceitar entradas.");
  if (options.inputType === "AUTO") throw new Error("AUTO não é uma tipagem de entrada adicionável.");
  if (!graph.nodes.some((node) => node.id === options.destinationNodeId)) throw new Error("Selecione um nó de destino.");

  const template = options.templateTransitionId == null
    ? null
    : graph.transitions.find((transition) => transition.id === options.templateTransitionId);
  if (options.templateTransitionId != null && (!template || template.node_id !== source.id)) {
    throw new Error("O grupo de actions não pertence ao nó de origem.");
  }
  const signature = template ? transitionActionSignature(graph, template.id) : "__sem_action__";
  const duplicate = graph.transitions.some(
    (transition) =>
      transition.node_id === source.id &&
      transition.next_node_id === options.destinationNodeId &&
      transition.input_type === options.inputType &&
      transition.button_label === null &&
      transition.expected_value === null &&
      transitionActionSignature(graph, transition.id) === signature
  );
  if (duplicate) throw new Error("Este tipo já existe no grupo selecionado.");

  const outgoing = graph.transitions.filter((transition) => transition.node_id === source.id);
  const automaticPositions = outgoing.filter((transition) => transition.input_type === "AUTO").map((transition) => transition.position);
  const position = automaticPositions.length
    ? Math.min(...automaticPositions)
    : Math.max(-1, ...outgoing.map((transition) => transition.position)) + 1;
  let draftId = nextDraftEntityId(graph);
  const transitionId = draftId--;
  const transition: FlowTransition = {
    id: transitionId,
    node_id: source.id,
    input_type: options.inputType,
    expected_value: null,
    button_label: null,
    next_node_id: options.destinationNodeId,
    position
  };
  const templateActions = template
    ? graph.transition_actions.filter((action) => action.transition_id === template.id)
    : [];
  const copiedActions: FlowTransitionAction[] = templateActions.map((action) => ({
    id: draftId--,
    transition_id: transitionId,
    action_key: action.action_key,
    config: action.config === null ? null : structuredClone(action.config),
    is_required: action.is_required
  }));

  return {
    transitionId,
    graph: {
      ...graph,
      transitions: [
        ...graph.transitions.map((item) => item.node_id === source.id && item.position >= position
          ? { ...item, position: item.position + 1 }
          : item),
        transition
      ],
      transition_actions: [...graph.transition_actions, ...copiedActions]
    }
  };
}
export function transitionActionSignature(graph: FlowGraph, transitionId: number) {
  const actions = graph.transition_actions.filter((action) => action.transition_id === transitionId);
  if (!actions.length) return "__sem_action__";
  return actions
    .map((action) => `${action.action_key}:${action.is_required ? "required" : "optional"}:${JSON.stringify(action.config === null ? null : action.config)}`)
    .join("|");
}

export function groupedButtonTransitions(graph: FlowGraph, transitionId: number) {
  const selected = graph.transitions.find((transition) => transition.id === transitionId);
  if (!selected || selected.button_label === null) return selected ? [selected] : [];
  const signature = transitionActionSignature(graph, selected.id);
  return graph.transitions
    .filter(
      (transition) =>
        transition.node_id === selected.node_id &&
        transition.button_label !== null &&
        transitionActionSignature(graph, transition.id) === signature
    )
    .sort((left, right) => left.position - right.position || left.id - right.id);
}


export function groupedInputTransitions(graph: FlowGraph, transitionId: number) {
  const selected = graph.transitions.find((transition) => transition.id === transitionId);
  const groupable = selected && selected.button_label === null && selected.expected_value === null && selected.input_type !== "AUTO";
  if (!selected || !groupable) return selected ? [selected] : [];
  const signature = transitionActionSignature(graph, selected.id);
  return graph.transitions
    .filter(
      (transition) =>
        transition.node_id === selected.node_id &&
        transition.next_node_id === selected.next_node_id &&
        transition.button_label === null &&
        transition.expected_value === null &&
        transition.input_type !== "AUTO" &&
        transitionActionSignature(graph, transition.id) === signature
    )
    .sort((left, right) => left.position - right.position || left.id - right.id);
}
export function sameTransitionGroup(graph: FlowGraph, leftId: number, rightId: number) {
  const selected = graph.transitions.find((transition) => transition.id === leftId);
  const group = selected?.button_label !== null
    ? groupedButtonTransitions(graph, leftId)
    : groupedInputTransitions(graph, leftId);
  return group.some((transition) => transition.id === rightId);
}

export function buttonLabelValidationErrors(graph: FlowGraph): FlowValidationError[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  return graph.transitions.flatMap((transition) => {
    if (!transition.button_label || buttonLabelLength(transition.button_label) <= BUTTON_LABEL_MAX_LENGTH) return [];
    const node = nodeById.get(transition.node_id);
    return [{
      code: "BUTTON_LABEL_TOO_LONG",
      message: `O botão \"${transition.button_label}\" deve ter no máximo ${BUTTON_LABEL_MAX_LENGTH} caracteres.`,
      node_id: node?.id ?? null,
      node_key: node?.key ?? null,
      transition_id: transition.id,
      action_id: null,
      details: { max_length: BUTTON_LABEL_MAX_LENGTH, actual_length: buttonLabelLength(transition.button_label) }
    }];
  });
}

export function errorsForElement(
  errors: FlowValidationError[],
  kind: "node" | "transition" | "action",
  id: number,
  nodeKey?: string
) {
  return errors.filter((error) => {
    if (kind === "node") return error.node_id === id || (!!nodeKey && error.node_key === nodeKey);
    if (kind === "transition") return error.transition_id === id;
    return error.action_id === id;
  });
}
