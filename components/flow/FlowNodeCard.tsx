"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertCircle, LockKeyhole } from "lucide-react";

import type { FlowNode } from "@/types/chatbotFlow";

export type FlowNodeData = {
  node: FlowNode;
  protected: boolean;
  errorCount: number;
  actionCount: number;
};

export type FlowCanvasNode = Node<FlowNodeData, "flowNode">;

const typeStyles = {
  START: "border-sage bg-emerald-50",
  MESSAGE: "border-black/15 bg-white",
  END: "border-ink/70 bg-ink text-white"
};

export function FlowNodeCard({ data, selected }: NodeProps<FlowCanvasNode>) {
  const hasError = data.errorCount > 0;
  return (
    <div
      className={`w-[250px] rounded-xl border-2 p-3 shadow-subtle transition ${
        hasError
          ? `border-coral bg-red-50 text-ink ${selected ? "ring-4 ring-amber-300/70" : ""}`
          : selected
            ? "border-amber-500 bg-amber-50 ring-4 ring-amber-300/40"
            : typeStyles[data.node.type]
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-sage" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${data.node.type === "END" && !hasError ? "bg-white/15" : "bg-black/5"}`}>
              {data.node.type}
            </span>
            {data.protected ? <LockKeyhole className="h-3.5 w-3.5 text-coral" aria-label="Nó protegido" /> : null}
            {hasError ? <AlertCircle className="h-4 w-4 text-coral" aria-label={`${data.errorCount} erros`} /> : null}
          </div>
          <p className="mt-1 truncate text-sm font-semibold">{data.node.title}</p>
          <p className={`truncate text-[11px] ${data.node.type === "END" && !hasError ? "text-white/60" : "text-ink/45"}`}>
            {data.node.key}
          </p>
        </div>
        {data.actionCount > 0 ? (
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${data.node.type === "END" && !hasError ? "bg-white/15" : "bg-sage/10 text-sage"}`}>
            {data.actionCount} action{data.actionCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <p className={`mt-2 line-clamp-2 text-xs leading-relaxed ${data.node.type === "END" && !hasError ? "text-white/75" : "text-ink/65"}`}>
        {data.node.message || "Sem mensagem"}
      </p>
      {data.node.type !== "END" ? (
        <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-sage" />
      ) : null}
    </div>
  );
}
