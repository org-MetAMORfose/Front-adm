export type FlowNodeType = "START" | "MESSAGE" | "END";
export type FlowInputType =
  | "TEXT"
  | "EMAIL"
  | "DATE"
  | "NUMBER"
  | "IMAGE"
  | "DOCUMENT"
  | "VIDEO"
  | "AUTO";
export type FlowRevisionStatus = "DRAFT" | "PUBLISHED" | "DISCARDED";
export type FlowEntityType =
  | "NODE"
  | "TRANSITION"
  | "TRANSITION_ACTION"
  | "INPUT_ERROR_MESSAGE";
export type FlowChangeOperation = "CREATE" | "UPDATE" | "DELETE";

export type FlowRevision = {
  id: number;
  base_revision_id: number | null;
  status: FlowRevisionStatus;
  version: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  is_stale?: boolean;
};

export type FlowNode = {
  id: number;
  key: string;
  type: FlowNodeType;
  title: string;
  description: string | null;
  message: string;
  position: number;
  position_x: number;
  position_y: number;
};

export type FlowTransition = {
  id: number;
  node_id: number;
  input_type: FlowInputType;
  expected_value: string | null;
  button_label: string | null;
  next_node_id: number;
  position: number;
};

export type FlowTransitionAction = {
  id: number;
  transition_id: number;
  action_key: string;
  config: Record<string, unknown> | null;
  is_required: boolean;
};

export type FlowActionDependency = {
  id: number;
  action_id: number;
  depends_on_id: number;
};

export type FlowInputErrorMessage = {
  id: number;
  input_type: FlowInputType;
  message: string;
};

export type FlowGraph = {
  nodes: FlowNode[];
  transitions: FlowTransition[];
  transition_actions: FlowTransitionAction[];
  input_error_messages: FlowInputErrorMessage[];
  action_dependencies: FlowActionDependency[];
};

export type FlowGraphResponse = FlowGraph & { revision: FlowRevision };
export type FlowRevisionList = {
  published: FlowRevision | null;
  drafts: FlowRevision[];
};

export type FlowValidationError = {
  code: string;
  message: string;
  node_id: number | null;
  node_key: string | null;
  transition_id: number | null;
  action_id: number | null;
  details: Record<string, unknown>;
};

export type FlowValidationResult = {
  valid: boolean;
  errors: FlowValidationError[];
};

export type FlowChange = {
  entity_type: FlowEntityType;
  operation: FlowChangeOperation;
  entity_id?: number;
  draft_entity_id?: number;
  new_value?: Record<string, unknown>;
};

export type FlowSelection =
  | { kind: "node"; id: number }
  | { kind: "transition"; id: number }
  | { kind: "action"; id: number }
  | { kind: "input-errors" }
  | null;

export type FlowSaveStatus =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

export type FlowApiErrorDetail = {
  code?: string;
  message?: string;
  errors?: FlowValidationError[];
  revision_id?: number;
  version?: number;
  retryable?: boolean;
};

export const FLOW_INPUT_TYPES: FlowInputType[] = [
  "TEXT",
  "EMAIL",
  "DATE",
  "NUMBER",
  "IMAGE",
  "DOCUMENT",
  "VIDEO",
  "AUTO"
];
