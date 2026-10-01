import { cloneGraph, conditionalActionConfig } from "@/lib/chatbotFlowDomain";
import type { FlowGraph } from "@/types/chatbotFlow";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 124;
type ElkModule = typeof import("elkjs/lib/elk.bundled.js");
type ElkInstance = InstanceType<ElkModule["default"]>;
let elkPromise: Promise<ElkInstance> | null = null;

function getElk() {
  if (!elkPromise) {
    elkPromise = import("elkjs/lib/elk.bundled.js").then(({ default: ELK }) => new ELK());
  }
  return elkPromise;
}

export function needsInitialLayout(graph: FlowGraph) {
  if (graph.nodes.length === 0) return false;
  const overlapped = graph.nodes.filter(
    (node) => Math.abs(node.position_x) < 2 && Math.abs(node.position_y) < 2
  ).length;
  return overlapped / graph.nodes.length >= 0.6;
}

export async function layoutFlowGraph(graph: FlowGraph): Promise<FlowGraph> {
  const elk = await getElk();
  const nodeByKey = new Map(graph.nodes.map((node) => [node.key, node]));
  const transitionById = new Map(graph.transitions.map((item) => [item.id, item]));
  const edges = graph.transitions.map((transition) => ({
    id: `transition-${transition.id}`,
    sources: [`node-${transition.node_id}`],
    targets: [`node-${transition.next_node_id}`]
  }));

  for (const action of graph.transition_actions) {
    const config = conditionalActionConfig(action);
    const transition = transitionById.get(action.transition_id);
    const target = config ? nodeByKey.get(config.target_node_key) : undefined;
    if (config && transition && target) {
      edges.push({
        id: `action-${action.id}`,
        sources: [`node-${transition.node_id}`],
        targets: [`node-${target.id}`]
      });
    }
  }

  const result = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.spacing.nodeNodeBetweenLayers": "110",
      "elk.spacing.nodeNode": "55",
      "elk.spacing.componentComponent": "100",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP"
    },
    children: graph.nodes.map((node) => ({
      id: `node-${node.id}`,
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    })),
    edges
  });

  const positions = new Map(
    (result.children ?? []).map((node) => [
      Number(node.id.replace("node-", "")),
      { x: Math.round(node.x ?? 0), y: Math.round(node.y ?? 0) }
    ])
  );
  const next = cloneGraph(graph);
  next.nodes = next.nodes.map((node) => {
    const position = positions.get(node.id);
    return position ? { ...node, position_x: position.x, position_y: position.y } : node;
  });
  return next;
}
