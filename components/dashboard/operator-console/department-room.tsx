"use client";

import type {
  DepartmentId,
  OperatorDepartmentSnapshot,
  OperatorWorkerNode,
  DepartmentUiState,
  FailureSemantics,
} from "@/lib/infinity/operator-console/types";
import {
  departmentStateClasses,
  departmentStateLabel,
  departmentVisualState,
} from "@/lib/infinity/operator-console/status-derivation";
import { RoomWorkflowStage } from "./room-workflow-stage";

type Props = {
  departmentId: DepartmentId;
  displayName: string;
  supportingLabel: string;
  snapshot?: OperatorDepartmentSnapshot;
  workerNodes: OperatorWorkerNode[];
  isSelected: boolean;
  isActive: boolean;
  isNextMissionTarget: boolean;
  isOnActivePath: boolean;
  closedLoopTarget: boolean;
  onSelect: () => void;
  partition?: "top" | "right" | "bottom" | "left" | "none";
  wide?: boolean;
};

function failureBadge(failureSemantics?: FailureSemantics): string | null {
  if (failureSemantics === "HISTORICAL_FAILURE") return "Previous issue";
  if (failureSemantics === "CURRENT_BLOCKING_FAILURE") return "Needs attention";
  return null;
}

export function DepartmentRoom({
  departmentId,
  displayName,
  supportingLabel,
  snapshot,
  workerNodes,
  isSelected,
  isActive,
  isNextMissionTarget,
  isOnActivePath,
  closedLoopTarget,
  onSelect,
  partition = "none",
  wide = false,
}: Props) {
  const rawState: DepartmentUiState = snapshot?.state ?? "NOT_STARTED";
  const failureSemantics = snapshot?.failureSemantics;
  const state = departmentVisualState(rawState, failureSemantics);
  const headline = snapshot?.displayHeadline ?? supportingLabel;
  const artifacts = snapshot?.artifacts ?? [];
  const visibleNodes = workerNodes.slice(0, 3);
  const primaryArtifact = artifacts[0];
  const badge = failureBadge(failureSemantics);

  const partitionClasses = {
    top: "border-t border-zinc-500/38",
    right: "border-r border-zinc-500/38",
    bottom: "border-b border-zinc-500/38",
    left: "border-l border-zinc-500/38",
    none: "",
  }[partition];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${displayName}, ${departmentStateLabel(state)}`}
      aria-pressed={isSelected}
      className={`
        group relative h-full w-full overflow-hidden text-left transition-all duration-300
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60
        ${partitionClasses}
        ${departmentStateClasses(state, failureSemantics)}
        ${isSelected ? "ring-1 ring-inset ring-sky-400/35" : ""}
        ${isActive ? "hq-room-active opacity-100" : "opacity-72"}
        ${isOnActivePath && !isActive ? "bg-zinc-900/25 opacity-80" : ""}
        ${isNextMissionTarget || closedLoopTarget ? "outline outline-1 outline-violet-400/35 -outline-offset-1" : ""}
        ${wide ? "min-h-[132px]" : "min-h-[120px]"}
        hover:bg-zinc-900/30
      `}
    >
      {isActive ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_100%,rgba(56,189,248,0.16),transparent)]" aria-hidden />
      ) : null}
      <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-500/38 to-transparent" aria-hidden />

      <div className="relative px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold tracking-wide text-zinc-100">{displayName}</p>
          </div>
          {badge ? (
            <span className={`shrink-0 text-[7px] uppercase tracking-wider ${
              failureSemantics === "CURRENT_BLOCKING_FAILURE" ? "text-red-400/80" : "text-amber-500/70"
            }`}>
              {badge}
            </span>
          ) : isActive ? (
            <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]" aria-hidden />
          ) : (
            <span className="shrink-0 text-[8px] uppercase text-zinc-600">{departmentStateLabel(state)}</span>
          )}
        </div>

        <p className={`mt-1 line-clamp-2 text-[10px] leading-snug ${
          isActive ? "text-sky-100/90" : failureSemantics === "HISTORICAL_FAILURE" ? "text-amber-200/60" : "text-zinc-500"
        }`}>
          {headline}
        </p>

        <div className="relative mt-2">
          <RoomWorkflowStage
            departmentId={departmentId}
            nodes={visibleNodes}
            outputLabel={null}
            isActive={isActive}
            showZoneLabels={isActive}
          />
        </div>

        {primaryArtifact ? (
          <p className="mt-1.5 truncate text-[9px] text-zinc-600">
            <span className="text-zinc-700">Output · </span>
            {primaryArtifact.label}
          </p>
        ) : null}
      </div>
    </button>
  );
}
