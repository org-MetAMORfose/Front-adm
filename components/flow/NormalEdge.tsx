"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps
} from "@xyflow/react";

export type NormalEdgeData = {
  labels: string[];
  errorCount: number;
  transitionIds: number[];
};

export type NormalCanvasEdge = Edge<NormalEdgeData, "normal">;

export function NormalEdge(props: EdgeProps<NormalCanvasEdge>) {
  const [path, labelX, labelY] = getBezierPath(props);
  const color = props.data?.errorCount ? "#d96f54" : props.selected ? "#d58b16" : "#6f8f7a";
  const labels = props.data?.labels ?? [];
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={{
          stroke: color,
          strokeWidth: props.selected ? 4 : 2,
          filter: props.selected ? "drop-shadow(0 0 4px rgba(213, 139, 22, 0.55))" : undefined
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`nodrag nopan pointer-events-none absolute min-w-24 max-w-52 rounded-lg border px-2 py-1.5 text-[10px] font-semibold shadow-sm ${
            props.selected
              ? "border-amber-400 bg-amber-50 text-amber-900"
              : props.data?.errorCount
                ? "border-coral/40 bg-red-50 text-coral"
                : "border-sage/25 bg-white/95 text-[#526b5a]"
          }`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {labels.map((label, index) => (
            <div key={`${label}-${index}`} className={index ? "mt-1 border-t border-current/10 pt-1" : ""}>
              {label}
            </div>
          ))}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
