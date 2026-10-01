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
  curveOffset?: number;
  kind?: "input" | "button" | "transition";
};

export type NormalCanvasEdge = Edge<NormalEdgeData, "normal">;

export function NormalEdge(props: EdgeProps<NormalCanvasEdge>) {
  const curveOffset = props.data?.curveOffset ?? 0;
  const [defaultPath, defaultLabelX, defaultLabelY] = getBezierPath(props);
  const dx = props.targetX - props.sourceX;
  const dy = props.targetY - props.sourceY;
  const distance = Math.hypot(dx, dy) || 1;
  const controlX = (props.sourceX + props.targetX) / 2 - (dy / distance) * curveOffset;
  const controlY = (props.sourceY + props.targetY) / 2 + (dx / distance) * curveOffset;
  const path = curveOffset === 0 ? defaultPath : `M ${props.sourceX},${props.sourceY} Q ${controlX},${controlY} ${props.targetX},${props.targetY}`;
  const labelX = curveOffset === 0 ? defaultLabelX : props.sourceX * 0.25 + controlX * 0.5 + props.targetX * 0.25;
  const labelY = curveOffset === 0 ? defaultLabelY : props.sourceY * 0.25 + controlY * 0.5 + props.targetY * 0.25;
  const baseColor = props.data?.kind === "input" ? "#58718d" : "#6f8f7a";
  const color = props.data?.errorCount ? "#d96f54" : props.selected ? "#d58b16" : baseColor;
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
                : props.data?.kind === "input"
                  ? "border-[#58718d]/30 bg-slate-50/95 text-[#40566d]"
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
