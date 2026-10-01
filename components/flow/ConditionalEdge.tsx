"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps
} from "@xyflow/react";

export type ConditionalEdgeData = {
  label: string;
  errorCount: number;
};

export type ConditionalCanvasEdge = Edge<ConditionalEdgeData, "conditional">;

export function ConditionalEdge(props: EdgeProps<ConditionalCanvasEdge>) {
  const [path, labelX, labelY] = getBezierPath(props);
  const color = props.data?.errorCount ? "#d96f54" : props.selected ? "#7c3aed" : "#4776a6";
  const selectedStyle = props.selected
    ? "border-violet-400 bg-violet-50 text-violet-800"
    : "border-[#4776a6]/25 bg-white/95 text-[#365c82]";
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={{
          stroke: color,
          strokeWidth: props.selected ? 4 : 2,
          strokeDasharray: "7 5",
          filter: props.selected ? "drop-shadow(0 0 4px rgba(124, 58, 237, 0.5))" : undefined
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute flex items-center gap-2"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          <span className="h-4 w-4 rotate-45 border-2 border-white shadow-sm" style={{ background: color }} />
          <span className={`max-w-40 rounded-md border px-2 py-1 text-[10px] font-semibold shadow-sm ${selectedStyle}`}>
            {props.data?.label}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
