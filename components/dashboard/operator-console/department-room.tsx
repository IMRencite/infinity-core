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
import { deriveRoomPresence, type RoomPresenceState } from "@/lib/infinity/operator-console/room-presence";
import { buildRoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";
import { RoomPresenceTrack } from "./infinity-room/room-presence-track";
import { RoomCurrentActivity } from "./room-current-activity";
import { SystemsArchitectBlueprint } from "./systems-architect-blueprint";
import type { SystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { useOptionalHqInspection } from "./hq-inspection-provider";
import { EMPTY_INSPECTION_CONTEXT } from "@/lib/infinity/operator-console/inspection-model";
import {
  filterArtifactsForInspection,
  isRoomCompatibleWithInspection,
  LEGACY_RESEARCH_LINEAGE_NOTICE,
  shouldShowLegacyResearchLineageNotice,
} from "@/lib/infinity/operator-console/inspection-filter";

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
  livePresence?: RoomPresenceState | null;
  liveStatus?: string | null;
  liveSummary?: string | null;
  nowInspectingTask?: string | null;
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
  livePresence = null,
  liveStatus = null,
  liveSummary = null,
  nowInspectingTask = null,
}: Props) {
  const rawState: DepartmentUiState = snapshot?.state ?? "NOT_STARTED";
  const failureSemantics = snapshot?.failureSemantics;
  const state = departmentVisualState(rawState, failureSemantics);
  const inspection = useOptionalHqInspection();
  const rawWorkArtifacts = snapshot?.workArtifacts ?? [];
  const workArtifacts = filterArtifactsForInspection(
    rawWorkArtifacts,
    inspection?.context ?? EMPTY_INSPECTION_CONTEXT,
    departmentId,
  );
  const showLegacyResearchNotice = shouldShowLegacyResearchLineageNotice(
    rawWorkArtifacts,
    inspection?.context ?? EMPTY_INSPECTION_CONTEXT,
    departmentId,
  );
  const artifacts = snapshot?.artifacts ?? [];
  const primaryArtifact = artifacts[0];
  const roomCompatible = inspection ? isRoomCompatibleWithInspection(departmentId, inspection.context) : true;
  const derivedPresence = deriveRoomPresence(workerNodes, state, isTerminal, {
    outputCount: workArtifacts.length,
    currentWorkCount: snapshot?.currentTask ? 1 : 0,
  });
  const reconciledLive =
    livePresence === "EMPTY" && workArtifacts.length > 0 ? "PRESENT_IDLE" : livePresence;
  const presence = reconciledLive ? { ...derivedPresence, state: reconciledLive } : derivedPresence;
  const workflowNodes = presence.state === "ACTIVE_WORK" ? presence.activeNodes : [];
  const activity = buildRoomActivityExplanation({
    departmentId,
    department: snapshot ?? null,
    workerNodes,
    currentActivity,
    closedLoopRoute,
    ventureName,
    commandRoomStatus: liveStatus,
    commandRoomSummary: liveSummary,
    nowInspectingTask,
  });
  const chipPresence =
    (reconciledLive ?? activity.presence) === "EMPTY" && workArtifacts.length > 0
      ? "PRESENT_IDLE"
      : (reconciledLive ?? activity.presence);
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
      ariaLabel={`${displayName}. ${supportingLabel} ${activity.sentence} ${chipPresence}`}
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
            presence={chipPresence}
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
      <div data-hq-now-work="true">
        <p className="px-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Now / current work</p>
        <RoomCurrentActivity explanation={activity} className="mt-1.5" />
        {presence.activeNodes.length > 0 ? (
          <ul className="mt-1 space-y-0.5 px-1" data-hq-now-workers>
            {presence.activeNodes.map((node) => (
              <li key={node.nodeId} className="text-[10px] text-zinc-300">
                <span className="font-semibold uppercase tracking-wide text-sky-200">{node.displayRole}</span>
                {node.displayTask ? <span className="text-zinc-400"> — {node.displayTask}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {systemsView ? <SystemsArchitectBlueprint view={systemsView} compact /> : null}

      <div className="relative mt-2" data-hq-output-history="true">
        <p className="px-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Output history</p>
        {!roomCompatible ? (
          <p className="hq-room-incompatible px-1 py-1 text-[11px] leading-snug text-zinc-400" data-hq-room-incompatible="true">
            This room requires a promoted venture.
          </p>
        ) : systemsView ? null : (
          <>
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
            {showLegacyResearchNotice ? (
              <p
                className="mt-1 px-1 text-[10px] leading-snug text-zinc-500"
                data-hq-legacy-research-lineage="true"
              >
                {LEGACY_RESEARCH_LINEAGE_NOTICE}
              </p>
            ) : null}
          </>
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
      </div>
      <RoomPresenceTrack presence={presence} showEmptyLabel={presence.state === "EMPTY"} />
    </InfinityRoomShell>
  );
}
