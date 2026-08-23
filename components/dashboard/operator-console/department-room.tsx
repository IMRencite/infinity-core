"use client";

import type {
  DepartmentId,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorWorkerNode,
  DepartmentUiState,
  OperatorVentureSnapshot,
} from "@/lib/infinity/operator-console/types";
import { departmentStateLabel, departmentVisualState } from "@/lib/infinity/operator-console/status-derivation";
import { RoomWorkflowStage } from "./room-workflow-stage";
import { RoomArtifactSurface } from "./artifacts/room-artifact-surface";
import { InfinityRoomShell } from "./infinity-room/infinity-room-shell";
import { RoomStatusChip } from "./infinity-room/room-status-chip";
import { RoomOutputStrip } from "./infinity-room/room-output-strip";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import { buildRoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";
import { RoomPresenceTrack } from "./infinity-room/room-presence-track";
import { RoomCurrentActivity } from "./room-current-activity";
import { SystemsArchitectBlueprint } from "./systems-architect-blueprint";
import type { SystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { useOptionalHqInspection } from "./hq-inspection-provider";
import {
  EMPTY_INSPECTION_CONTEXT,
  filterArtifactsForInspection,
  isRoomCompatibleWithInspection,
} from "@/lib/infinity/operator-console/inspection-context";

type Props = {
  departmentId: DepartmentId;
  displayName: string;
  supportingLabel: string;
  snapshot?: OperatorDepartmentSnapshot;
  workerNodes: OperatorWorkerNode[];
  currentActivity?: OperatorCurrentActivity | null;
  closedLoopRoute?: OperatorVentureSnapshot["closedLoopRoute"] | null;
  ventureName?: string | null;
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
  currentActivity = null,
  closedLoopRoute = null,
  ventureName = null,
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
  const inspection = useOptionalHqInspection();
  const workArtifacts = filterArtifactsForInspection(
    snapshot?.workArtifacts ?? [],
    inspection?.context ?? EMPTY_INSPECTION_CONTEXT,
    departmentId,
  );
  const artifacts = snapshot?.artifacts ?? [];
  const primaryArtifact = artifacts[0];
  const roomCompatible = inspection ? isRoomCompatibleWithInspection(departmentId, inspection.context) : true;
  const presence = deriveRoomPresence(workerNodes, state, isTerminal);
  const workflowNodes = presence.state === "ACTIVE_WORK" ? presence.activeNodes : [];
  const activity = buildRoomActivityExplanation({
    departmentId,
    department: snapshot ?? null,
    workerNodes,
    currentActivity,
    closedLoopRoute,
    ventureName,
  });
  const systemsView =
    departmentId === "systems_architect"
      ? (inspection?.systemsArchitectView ??
        ((snapshot?.detail.systemsArchitectView as SystemsArchitectHqView | undefined) ?? null))
      : null;

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
      ariaLabel={`${displayName}. ${supportingLabel} ${activity.sentence} ${activity.presence}`}
      onActivate={onSelect}
      header={
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-2">
            <p className={`hq-room-title ${isActive ? "hq-room-title-active" : ""}`}>{displayName}</p>
            <p className="hq-room-job mt-1">{supportingLabel}</p>
          </div>
          <RoomStatusChip
            state={state}
            failureSemantics={failureSemantics}
            isActive={isActive}
            presence={activity.presence}
          />
        </div>
      }
      footer={
        <RoomOutputStrip
          value={
            systemsView
              ? systemsView.hasArchitectureContext
                ? `${systemsView.requiredCount} required systems · ${systemsView.deferredCount} deferred`
                : "No venture selected"
              : (primaryArtifact?.label ?? null)
          }
          muted={state === "NOT_STARTED" || state === "BLOCKED"}
        />
      }
    >
      <RoomCurrentActivity explanation={activity} className="mt-1.5" />

      {systemsView ? <SystemsArchitectBlueprint view={systemsView} compact /> : null}

      <div className="relative mt-2">
        {!roomCompatible ? (
          <p className="hq-room-incompatible px-1 py-1 text-[11px] leading-snug text-zinc-400" data-hq-room-incompatible="true">
            This room requires a promoted venture.
          </p>
        ) : systemsView ? null : workArtifacts.length > 0 ? (
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
