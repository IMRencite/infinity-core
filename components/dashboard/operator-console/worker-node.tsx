"use client";

import type { DepartmentUiState, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

type Props = {
  node: OperatorWorkerNode;
  compact?: boolean;
  prominent?: boolean;
};

function nodeClasses(status: DepartmentUiState, isActive: boolean, isDormant: boolean, prominent: boolean): string {
  if (isDormant) {
    return "border-zinc-700/40 bg-zinc-900/40 opacity-40";
  }
  const glow = prominent && isActive
    ? "shadow-[0_0_28px_rgba(56,189,248,0.45),0_0_12px_rgba(56,189,248,0.25)]"
    : isActive
      ? "shadow-[0_0_16px_rgba(56,189,248,0.3)]"
      : "";
  switch (status) {
    case "RUNNING":
      return isActive
        ? `border-sky-400/60 bg-sky-500/20 ${glow}`
        : "border-sky-500/30 bg-sky-950/30";
    case "COMPLETE":
      return "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_8px_rgba(52,211,153,0.15)]";
    case "WAITING":
      return "border-zinc-600/40 bg-zinc-800/30";
    case "BLOCKED":
      return "border-amber-500/40 bg-amber-500/10";
    case "FAILED":
      return "border-red-500/40 bg-red-500/10";
    default:
      return "border-zinc-700/40 bg-zinc-900/30 opacity-60";
  }
}

function sizeClasses(compact: boolean, prominent: boolean): string {
  if (prominent) return "h-12 w-12";
  if (compact) return "h-7 w-7";
  return "h-9 w-9";
}

function coreSizeClasses(compact: boolean, prominent: boolean): string {
  if (prominent) return "h-4 w-4";
  if (compact) return "h-2 w-2";
  return "h-2.5 w-2.5";
}

export function WorkerNode({ node, compact = false, prominent = false }: Props) {
  const isProminent = prominent || (node.motionActive && node.isActive);
  const showPulse = node.isActive && node.status === "RUNNING";

  return (
    <div
      className={`relative flex flex-col items-center ${compact && !isProminent ? "gap-0.5" : "gap-1"}`}
      title={[node.displayRole, node.displayTask, node.provider, node.model].filter(Boolean).join(" · ")}
    >
      <div className="relative">
        {showPulse ? (
          <>
            <span
              className={`absolute inset-0 rounded-full bg-sky-400/25 ${isProminent ? "hq-orb-pulse" : "animate-ping"}`}
              style={isProminent ? undefined : { animationDuration: "2.5s" }}
              aria-hidden
            />
            {isProminent ? (
              <span className="absolute -inset-2 rounded-full bg-sky-400/10 blur-md" aria-hidden />
            ) : null}
          </>
        ) : null}
        <div
          className={`
            relative flex items-center justify-center rounded-full border
            ${sizeClasses(compact, isProminent)}
            ${nodeClasses(node.status, node.isActive, node.isDormant, isProminent)}
          `}
        >
          <span
            className={`rounded-full ${coreSizeClasses(compact, isProminent)} ${
              node.isActive && node.status === "RUNNING"
                ? "bg-sky-200 shadow-[0_0_8px_rgba(186,230,253,0.8)]"
                : node.status === "FAILED" || node.status === "BLOCKED"
                  ? "bg-amber-400/80"
                  : node.status === "COMPLETE"
                    ? "bg-emerald-400/80"
                    : "bg-zinc-500"
            }`}
            aria-hidden
          />
        </div>
        {(node.status === "FAILED" || node.status === "BLOCKED") && !node.isDormant ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-zinc-900 bg-amber-400"
            aria-hidden
          />
        ) : null}
      </div>
      {!compact || isProminent ? (
        <span className="max-w-[80px] truncate text-center text-[8px] font-medium uppercase tracking-wide text-zinc-400">
          {node.displayRole}
        </span>
      ) : null}
    </div>
  );
}

export function WorkerNodeCluster({ nodes, compact = false }: { nodes: OperatorWorkerNode[]; compact?: boolean }) {
  if (nodes.length === 0) return null;

  return (
    <div className={`flex items-end justify-center ${compact ? "gap-2" : "gap-3"}`} aria-label="Active work sessions">
      {nodes.map((node) => (
        <WorkerNode key={node.nodeId} node={node} compact={compact} prominent={node.motionActive} />
      ))}
    </div>
  );
}
