"use client";

import type {
  DepartmentId,
  OperatorDepartmentSnapshot,
  OperatorWorkerNode,
  DepartmentUiState,
  FailureSemantics,
} from "@/lib/infinity/operator-console/types";
import { departmentStateLabel, departmentVisualState } from "@/lib/infinity/operator-console/status-derivation";
import { RoomWorkflowStage } from "./room-workflow-stage";
import { RoomArtifactSurface } from "./artifacts/room-artifact-surface";
import { InfinityRoomShell } from "./infinity-room/infinity-room-shell";
import { RoomStatusChip } from "./infinity-room/room-status-chip";
import { RoomOutputStrip } from "./infinity-room/room-output-strip";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import { RoomPresenceTrack } from "./infinity-room/room-presence-track";

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
  closedLoopTarget?: boolean;
  isTerminal?: boolean;
  onSelect: () => void;
  partition?: "top" | "right" | "bottom" | "left" | "none";
  wide?: boolean;
  span?: "standard" | "full";
};

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
  closedLoopTarget = false,
  isTerminal = false,
  onSelect,
  partition = "none",
  wide = false,
  span = "standard",
}: Props) {
  const rawState: DepartmentUiState = snapshot?.state ?? "NOT_STARTED";
  const failureSemantics = snapshot?.failureSemantics;
  const state = departmentVisualState(rawState, failureSemantics);
  const headline = snapshot?.displayHeadline ?? supportingLabel;
  const workArtifacts = snapshot?.workArtifacts ?? [];
  const artifacts = snapshot?.artifacts ?? [];
  const primaryArtifact = artifacts[0];
  const presence = deriveRoomPresence(workerNodes, state, isTerminal);
  const workflowNodes = presence.state === "ACTIVE_WORK" ? presence.activeNodes : [];

  return (
    <InfinityRoomShell
      state={state}
      failureSemantics={failureSemantics}
      isSelected={isSelected}
      isActive={isActive}
      isOnActivePath={isOnActivePath}
      isNextMissionTarget={isNextMissionTarget}
      closedLoopTarget={closedLoopTarget}
      partition={partition}
      size={wide || span === "full" ? "wide" : "standard"}
      span={span}
      ariaLabel={`${displayName}, ${departmentStateLabel(state)}`}
      onActivate={onSelect}
      header={
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`hq-room-title ${isActive ? "hq-room-title-active" : ""} line-clamp-1`}>{displayName}</p>
          </div>
          <RoomStatusChip state={state} failureSemantics={failureSemantics} isActive={isActive} />
        </div>
      }
      footer={
        <RoomOutputStrip
          value={primaryArtifact?.label ?? null}
          muted={state === "NOT_STARTED" || state === "BLOCKED"}
        />
      }
    >
      <p
        className={`hq-room-task mt-1.5 line-clamp-2 ${
          isActive
            ? "font-medium text-sky-50"
            : failureSemantics === "HISTORICAL_FAILURE"
              ? "text-amber-200/70"
              : "text-[var(--hq-text-secondary)]"
        }`}
      >
        {headline}
      </p>

      <div className="relative mt-2">
        {workArtifacts.length > 0 ? (
          <RoomArtifactSurface
            artifacts={workArtifacts}
            expectedCount={snapshot?.recordCount ?? null}
            roomName={displayName}
            isActive={isActive}
            isTerminal={isTerminal}
            compact
          />
        ) : (
          <p className="hq-room-empty-outputs px-1 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            No outputs yet
          </p>
        )}
        {presence.state === "ACTIVE_WORK" ? (
          <RoomWorkflowStage
            departmentId={departmentId}
            nodes={workflowNodes}
            outputLabel={null}
            isActive={isActive}
            showZoneLabels={isActive}
          />
        ) : null}
        <RoomPresenceTrack presence={presence} showEmptyLabel />
      </div>
    </InfinityRoomShell>
  );
}
