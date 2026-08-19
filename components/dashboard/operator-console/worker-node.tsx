"use client";

import type { DepartmentUiState, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

type Props = {
  node: OperatorWorkerNode;
  compact?: boolean;
  prominent?: boolean;
  idle?: boolean;
  blocked?: boolean;
};

function nodeClasses(
  status: DepartmentUiState,
  isActive: boolean,
  isDormant: boolean,
  prominent: boolean,
  idle: boolean,
  blocked: boolean,
): string {
  if (blocked || status === "BLOCKED" || status === "FAILED") {
    return "hq-worker-orb--blocked border-amber-500/50 bg-amber-500/10";
  }
  if (idle) {
    return "hq-worker-orb--idle border-cyan-500/25 bg-cyan-950/20";
  }
  if (isDormant) {
    return "hq-worker-orb--idle border-zinc-700/40 bg-zinc-900/40";
  }
  const glow = prominent && isActive
    ? "shadow-[0_0_32px_rgba(34,211,238,0.5),0_0_14px_rgba(167,139,250,0.35)]"
    : isActive
      ? "shadow-[0_0_20px_rgba(34,211,238,0.38)]"
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
    default:
      return "border-zinc-700/40 bg-zinc-900/30 opacity-60";
  }
}

function sizeClasses(compact: boolean, prominent: boolean): string {
  if (prominent) return "h-14 w-14";
  if (compact) return "h-8 w-8";
  return "h-10 w-10";
}

function coreSizeClasses(compact: boolean, prominent: boolean): string {
  if (prominent) return "h-5 w-5";
  if (compact) return "h-2.5 w-2.5";
  return "h-3 w-3";
}

export function WorkerNode({ node, compact = false, prominent = false, idle = false, blocked = false }: Props) {
  const isIdle = idle || (!node.motionActive && !node.isActive && node.status !== "BLOCKED" && node.status !== "FAILED");
  const isBlocked = blocked || node.status === "BLOCKED" || node.status === "FAILED";
  const isProminent = !isIdle && !isBlocked && (prominent || (node.motionActive && node.isActive));
  const showPulse = !isIdle && !isBlocked && node.isActive && node.status === "RUNNING";

  return (
    <div
      className={`relative flex flex-col items-center ${compact && !isProminent ? "gap-0.5" : "gap-1"}`}
      title={[node.displayRole, node.displayTask, node.provider, node.model, isBlocked ? "BLOCKED" : isIdle ? "PRESENT_IDLE" : node.status].filter(Boolean).join(" · ")}
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
            ${nodeClasses(node.status, node.isActive, node.isDormant, isProminent, isIdle, isBlocked)}
          `}
        >
          <span
            className={`rounded-full ${coreSizeClasses(compact, isProminent)} ${
              showPulse
                ? "bg-sky-200 shadow-[0_0_8px_rgba(186,230,253,0.8)]"
                : isBlocked
                  ? "bg-amber-400/80"
                  : node.status === "COMPLETE" || isIdle
                    ? "bg-cyan-300/50"
                    : "bg-zinc-500"
            }`}
            aria-hidden
          />
        </div>
        {isBlocked ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-zinc-900 bg-amber-400"
            aria-hidden
          />
        ) : null}
      </div>
      {!compact || isProminent || isIdle || isBlocked ? (
        <span className={`max-w-[96px] truncate text-center text-[9px] font-medium uppercase tracking-wide ${isIdle ? "text-zinc-500" : isBlocked ? "text-amber-200/80" : "text-zinc-300"}`}>
          {isBlocked ? "Blocked" : isIdle ? node.displayRole : node.displayRole}
        </span>
      ) : null}
    </div>
  );
}

export function WorkerNodeCluster({ nodes, compact = false }: { nodes: OperatorWorkerNode[]; compact?: boolean }) {
  if (nodes.length === 0) return null;

  return (
    <div className={`flex items-end justify-center ${compact ? "gap-2" : "gap-3"}`} aria-label="Active agents">
      {nodes.map((node) => (
        <WorkerNode key={node.nodeId} node={node} compact={compact} prominent={node.motionActive} />
      ))}
    </div>
  );
}
