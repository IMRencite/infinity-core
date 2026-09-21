"use client";

import type { OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { projectWorkerVisualState, type HqWorkerVisualState } from "@/lib/infinity/hq-live-activity";

type Props = {
  node: OperatorWorkerNode;
  compact?: boolean;
  prominent?: boolean;
  idle?: boolean;
  blocked?: boolean;
};

const VISUAL_BADGE: Record<HqWorkerVisualState, string> = {
  ACTIVE: "ACTIVE",
  WAITING: "WAITING",
  BLOCKED: "BLOCKED",
  AUTHORIZATION_REQUIRED: "AUTHORIZATION",
  IDLE: "IDLE",
};

function visualClasses(visual: HqWorkerVisualState, prominent: boolean): string {
  switch (visual) {
    case "ACTIVE":
      return prominent
        ? "hq-worker-orb--visual-active hq-worker-orb--active-work border-[#e879f9]/70 bg-[#e879f9]/20 shadow-[0_0_32px_rgba(232,121,249,0.5),0_0_14px_rgba(167,139,250,0.28)]"
        : "hq-worker-orb--visual-active hq-worker-orb--active-work border-[#e879f9]/60 bg-[#e879f9]/16 shadow-[0_0_20px_rgba(232,121,249,0.42)]";
    case "WAITING":
      return "hq-worker-orb--visual-waiting border-[#3dffb0]/55 bg-[#3dffb0]/10";
    case "BLOCKED":
      return "hq-worker-orb--visual-blocked hq-worker-orb--blocked border-amber-500/55 bg-amber-500/10";
    case "AUTHORIZATION_REQUIRED":
      return "hq-worker-orb--visual-authorization border-violet-400/60 bg-violet-500/15";
    case "IDLE":
      return "hq-worker-orb--visual-idle hq-worker-orb--idle border-[#7dd3fc]/40 bg-[#38bdf8]/10";
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

export function WorkerNode({ node, compact = false, prominent = false }: Props) {
  const visual = projectWorkerVisualState(node);
  const isActive = visual.visualState === "ACTIVE";
  const isBlocked = visual.visualState === "BLOCKED";
  const isAuth = visual.visualState === "AUTHORIZATION_REQUIRED";
  const isWaiting = visual.visualState === "WAITING";
  const isIdle = visual.visualState === "IDLE";
  const isProminent = isActive && prominent;
  const badge = VISUAL_BADGE[visual.visualState];

  return (
    <div
      className={`relative flex flex-col items-center ${compact && !isProminent ? "gap-0.5" : "gap-1"}`}
      title={[node.displayRole, node.displayTask, node.provider, node.model, visual.accessibleState].filter(Boolean).join(" · ")}
      aria-label={`${node.displayRole} · ${visual.accessibleState}`}
      data-hq-worker-visual-state={visual.visualState}
      data-hq-worker-glow={visual.glow ? "true" : "false"}
      data-state={visual.visualState}
    >
      <div className="relative">
        {visual.glow ? (
          <>
            <span
              className={`absolute inset-0 rounded-full bg-[#e879f9]/25 hq-worker-orb--motion ${isProminent ? "hq-orb-pulse" : ""}`}
              aria-hidden
            />
            {isProminent ? (
              <span className="absolute -inset-2 rounded-full bg-[#e879f9]/12 blur-md" aria-hidden />
            ) : null}
          </>
        ) : null}
        <div
          data-hq-worker-glow={visual.glow ? "true" : "false"}
          data-hq-worker-motion={visual.glow ? "true" : "false"}
          className={`
            relative flex items-center justify-center rounded-full border
            ${sizeClasses(compact, isProminent)}
            ${visual.glow ? "hq-worker-orb--active-work" : "hq-worker-orb--static"}
            ${visualClasses(visual.visualState, isProminent)}
          `}
        >
          <span
            className={`rounded-full ${coreSizeClasses(compact, isProminent)} ${
              visual.glow
                ? "bg-[#f5d0fe] shadow-[0_0_8px_rgba(232,121,249,0.85)]"
                : isBlocked
                  ? "bg-amber-400/80"
                  : isAuth
                    ? "bg-violet-300/80"
                    : isWaiting
                      ? "bg-[#3dffb0]/80"
                      : "bg-[#7dd3fc]"
            }`}
            aria-hidden
          />
        </div>
        {isBlocked || isAuth ? (
          <span
            className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-zinc-900 ${isAuth ? "bg-violet-300" : "bg-amber-400"}`}
            aria-hidden
          />
        ) : null}
      </div>
      <span
        className={`max-w-[96px] truncate text-center text-[8px] font-semibold uppercase tracking-wide ${
          isActive
            ? "text-[#f5d0fe]"
            : isAuth
              ? "text-violet-200/85"
              : isBlocked
                ? "text-amber-200/80"
                : isWaiting
                  ? "text-[#3dffb0]"
                  : "text-[#7dd3fc]"
        }`}
      >
        {badge}
      </span>
      <span className={`max-w-[96px] truncate text-center text-[9px] font-medium uppercase tracking-wide ${isIdle ? "text-[#7dd3fc]/80" : isBlocked ? "text-amber-200/80" : isAuth ? "text-violet-200/80" : isWaiting ? "text-[#3dffb0]/85" : "text-zinc-300"}`}>
        {node.displayRole}
      </span>
    </div>
  );
}

export function WorkerNodeCluster({ nodes, compact = false }: { nodes: OperatorWorkerNode[]; compact?: boolean }) {
  if (nodes.length === 0) return null;

  return (
    <div className={`flex items-end justify-center ${compact ? "gap-2" : "gap-3"}`} aria-label="Agents">
      {nodes.map((node) => (
        <WorkerNode key={node.nodeId} node={node} compact={compact} prominent={projectWorkerVisualState(node).glow} />
      ))}
    </div>
  );
}
