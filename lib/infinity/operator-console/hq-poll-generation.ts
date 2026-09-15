import type { ActiveWorkerProjection, CommandActivityView } from "@/lib/infinity/mission-activity/types";
import { asDepartmentId } from "@/lib/infinity/mission-activity/rooms";
import { isLiveExecutionStatus } from "@/lib/infinity/mission-activity/status";
import { workerVisualEligible } from "@/lib/infinity/mission-activity/worker-roles";
import { activateWorkersForActiveRooms } from "@/lib/infinity/mission-activity/worker-motion";
import type { DepartmentId, DepartmentUiState, OperatorVentureSnapshot, OperatorWorkerNode } from "./types";

export type HqPollFreshness = {
  generatedAt: string;
  lastActivityAt: string | null;
  activeCount: number;
  currentMission: string | null;
  currentWorkId?: string | null;
  ventureAssemblyId: string;
};

function latestTimestamp(...values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms < bestMs) continue;
    best = value;
    bestMs = ms;
  }
  return best;
}

export function hqPollFreshnessFromSnapshot(snapshot: OperatorVentureSnapshot): HqPollFreshness {
  const live = snapshot.currentExecution ?? snapshot.commandActivity?.nowInspecting ?? null;
  return {
    generatedAt: snapshot.generatedAt,
    lastActivityAt: live?.lastActivityAt
      ?? snapshot.currentActivity.latestActivityAt
      ?? latestTimestamp(
        snapshot.commandActivity?.latestCompleted?.completedAt,
        snapshot.latestCompletedExecution?.completedAt,
      ),
    activeCount: snapshot.commandActivity?.counts.activeMissions ?? (snapshot.currentActivity.active ? 1 : 0),
    currentMission: live?.currentMission ?? snapshot.commandActivity?.nowInspecting.currentMission ?? null,
    currentWorkId: live?.currentWorkId ?? snapshot.commandActivity?.nowInspecting.currentWorkId ?? snapshot.commandActivity?.systemView.artifactId ?? null,
    ventureAssemblyId: snapshot.venture.ventureAssemblyId,
  };
}

export function parseHqPollPayload(
  payload: OperatorVentureSnapshot | { snapshot: OperatorVentureSnapshot; followVentureAssemblyId?: string | null },
): OperatorVentureSnapshot {
  if (payload && typeof payload === "object" && "snapshot" in payload && payload.snapshot && typeof payload.snapshot === "object") {
    return payload.snapshot;
  }
  return payload as OperatorVentureSnapshot;
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/**
 * Accept a poll payload when it is at least as fresh as the last applied state.
 * Fallback polls are single-flight; overlapping generations are skipped, not queued.
 */
export function acceptHqPollSnapshot(
  applied: HqPollFreshness | null,
  incoming: HqPollFreshness,
): boolean {
  if (!applied) return true;
  const incomingActivity = timestampMs(incoming.lastActivityAt);
  const appliedActivity = timestampMs(applied.lastActivityAt);
  if ((incoming.currentWorkId ?? incoming.currentMission) !== (applied.currentWorkId ?? applied.currentMission)) {
    if (incoming.activeCount === 0 && applied.activeCount > 0) {
      return incomingActivity > appliedActivity;
    }
    if (incomingActivity >= appliedActivity) return true;
    return false;
  }
  if (incoming.activeCount > 0 && applied.activeCount === 0) return true;
  if (incoming.activeCount === 0 && applied.activeCount > 0) {
    return incomingActivity > appliedActivity;
  }
  if (incoming.ventureAssemblyId !== applied.ventureAssemblyId) return true;
  if (incomingActivity !== appliedActivity) return incomingActivity >= appliedActivity;
  return timestampMs(incoming.generatedAt) >= timestampMs(applied.generatedAt);
}

/** Kept for older tests. Overlapping in-flight polls must use acceptHqPollSnapshot instead. */
export function acceptHqPollGeneration(latestGeneration: number, incomingGeneration: number): boolean {
  return incomingGeneration === latestGeneration;
}

export function shouldFollowFavc1AssemblyNavigation(input: {
  followFavc1Cycle: boolean;
  liveActiveCount: number;
  followVentureAssemblyId?: string | null;
  currentVentureId: string;
}): boolean {
  if (!input.followFavc1Cycle) return false;
  if (input.liveActiveCount > 0) return false;
  if (!input.followVentureAssemblyId) return false;
  return input.followVentureAssemblyId !== input.currentVentureId;
}

export function shouldApplyInitialHqSnapshot(
  current: HqPollFreshness | { generatedAt: string; ventureAssemblyId: string; activeCount?: number; lastActivityAt?: string | null },
  incoming: HqPollFreshness | { generatedAt: string; ventureAssemblyId: string; activeCount?: number; lastActivityAt?: string | null },
): boolean {
  const currentActive = "activeCount" in current ? (current.activeCount ?? 0) : 0;
  const incomingActive = "activeCount" in incoming ? (incoming.activeCount ?? 0) : 0;
  const incomingActivity = timestampMs("lastActivityAt" in incoming ? incoming.lastActivityAt ?? null : null);
  const currentActivity = timestampMs("lastActivityAt" in current ? current.lastActivityAt ?? null : null);
  if (currentActive > 0 && incomingActive === 0) {
    return incomingActivity > currentActivity;
  }
  if (incoming.ventureAssemblyId !== current.ventureAssemblyId) return true;
  if (incomingActive > 0 && currentActive === 0) return true;
  const incomingAt = timestampMs(incoming.generatedAt);
  const currentAt = timestampMs(current.generatedAt);
  if (!Number.isFinite(incomingAt) || incomingAt === Number.NEGATIVE_INFINITY) return true;
  if (!Number.isFinite(currentAt) || currentAt === Number.NEGATIVE_INFINITY) return true;
  return incomingAt > currentAt;
}

function workerNodeFromLiveWorker(worker: ActiveWorkerProjection): OperatorWorkerNode {
  const active = workerVisualEligible(worker.status);
  const blocked = worker.status === "READY_BLOCKED" || worker.status === "FAILED";
  const waiting = worker.status === "WAITING_EXTERNAL" || worker.status === "WAITING_INTERNAL";
  const status: DepartmentUiState = active
    ? "RUNNING"
    : blocked
      ? worker.status === "FAILED"
        ? "FAILED"
        : "BLOCKED"
      : waiting
        ? "WAITING"
        : "COMPLETE";
  return {
    nodeId: worker.workerExecutionId,
    departmentId: asDepartmentId(worker.room),
    role: worker.role,
    displayRole: worker.role,
    status,
    task: worker.task,
    displayTask: worker.task,
    provider: null,
    model: null,
    isActive: active,
    isDormant: !active,
    motionActive: active,
  };
}

export function liveRoomStatusFromSnapshot(
  snapshot: OperatorVentureSnapshot,
): Record<string, { status?: string; summary?: string | null }> {
  const out: Record<string, { status?: string; summary?: string | null }> = {};
  if (snapshot.commandActivity) {
    for (const [room, slice] of Object.entries(snapshot.commandActivity.rooms)) {
      out[room] = { status: slice.status, summary: slice.summary };
    }
    return out;
  }
  for (const row of snapshot.roomPresence ?? []) {
    out[row.room] = { status: row.status, summary: null };
  }
  return out;
}

export function applyHqCanonicalLiveState(
  snapshot: OperatorVentureSnapshot,
  live: {
    commandActivity: CommandActivityView;
    generatedAt: string;
    financialTruth?: OperatorVentureSnapshot["financialTruth"];
    coding?: OperatorVentureSnapshot["coding"];
    capabilities?: OperatorVentureSnapshot["capabilities"];
    ventureOperatingScale?: OperatorVentureSnapshot["ventureOperatingScale"];
    capabilityArtifacts?: OperatorVentureSnapshot["roomArtifacts"];
    canonicalLive?: OperatorVentureSnapshot["canonicalLive"];
    autonomousOperating?: OperatorVentureSnapshot["autonomousOperating"];
  },
): OperatorVentureSnapshot {
  const roomArtifacts = live.capabilityArtifacts
    ? {
        ...snapshot.roomArtifacts,
        ...Object.fromEntries(
          Object.entries(live.capabilityArtifacts).map(([room, artifacts]) => {
            const existing = (snapshot.roomArtifacts?.[room as keyof typeof snapshot.roomArtifacts] ?? []).filter(
              (item) => item.sourceRecordType !== "provider_readiness",
            );
            return [room, [...existing, ...(artifacts ?? [])]];
          }),
        ),
      }
    : snapshot.roomArtifacts;
  return applyHqLiveExecutionOverlay({
    ...snapshot,
    generatedAt: live.generatedAt,
    commandActivity: live.commandActivity,
    currentExecution: live.commandActivity.nowInspecting,
    latestCompletedExecution: live.commandActivity.latestCompleted,
    financialTruth: live.financialTruth ?? snapshot.financialTruth,
    coding: live.coding ?? snapshot.coding,
    capabilities: live.capabilities ?? snapshot.capabilities,
    ventureOperatingScale: live.ventureOperatingScale ?? snapshot.ventureOperatingScale,
    canonicalLive: live.canonicalLive ?? snapshot.canonicalLive,
    autonomousOperating: live.autonomousOperating ?? snapshot.autonomousOperating,
    roomArtifacts,
  });
}

export function applyHqLiveExecutionOverlay(snapshot: OperatorVentureSnapshot): OperatorVentureSnapshot {
  const commandActivity = snapshot.commandActivity;
  const currentExecution = commandActivity?.nowInspecting ?? snapshot.currentExecution ?? null;
  const fromActivity = commandActivity?.latestCompleted ?? null;
  const fromSnapshot = snapshot.latestCompletedExecution ?? null;
  const latestCompletedExecution =
    fromActivity && fromSnapshot
      ? Date.parse(fromActivity.completedAt ?? "") >= Date.parse(fromSnapshot.completedAt ?? "")
        ? fromActivity
        : fromSnapshot
      : fromActivity ?? fromSnapshot;
  const roomPresence =
    snapshot.roomPresence ??
    (commandActivity
      ? Object.entries(commandActivity.rooms).map(([room, slice]) => ({
          room: room as DepartmentId,
          status: slice.status,
        }))
      : undefined);
  const liveActiveRooms = commandActivity
    ? (Object.entries(commandActivity.rooms)
        .filter(([, slice]) => slice.status === "ACTIVE_WORK")
        .map(([room]) => room) as OperatorVentureSnapshot["currentDepartments"])
    : [];
  const inspectingStatus = currentExecution?.status ?? commandActivity?.nowInspecting?.status ?? null;
  const live =
    (commandActivity?.counts.activeMissions ?? 0) > 0 || isLiveExecutionStatus(inspectingStatus);
  const liveWorkers = commandActivity?.activeWorkers ?? snapshot.activeWorkers ?? [];
  const missionNodes = liveWorkers.map(workerNodeFromLiveWorker);
  const existingNodes = (snapshot.workerNodes ?? []).filter(
    (node) => !missionNodes.some((mission) => mission.nodeId === node.nodeId),
  );
  return {
    ...snapshot,
    currentExecution: currentExecution ?? snapshot.currentExecution,
    latestCompletedExecution: latestCompletedExecution ?? snapshot.latestCompletedExecution,
    roomPresence: roomPresence ?? snapshot.roomPresence,
    activeWorkers: liveWorkers.length > 0 ? liveWorkers : snapshot.activeWorkers,
    workerNodes: activateWorkersForActiveRooms(
      missionNodes.length > 0 ? [...missionNodes, ...existingNodes] : snapshot.workerNodes ?? [],
      commandActivity?.rooms,
      currentExecution?.currentTask ?? currentExecution?.currentStep ?? null,
    ),
    currentDepartments: liveActiveRooms,
    departments: snapshot.departments.map((dept) => {
      const slice = commandActivity?.rooms[dept.id];
      if (!slice) return dept;
      if (slice.status === "EMPTY") {
        return { ...dept, isActive: false, state: dept.state === "RUNNING" ? "COMPLETE" : dept.state };
      }
      return {
        ...dept,
        isActive: slice.status === "ACTIVE_WORK",
        state:
          slice.status === "ACTIVE_WORK"
            ? "RUNNING"
            : slice.status === "READY_BLOCKED" || slice.status === "FAILED"
              ? "BLOCKED"
              : slice.status === "WAITING_EXTERNAL" || slice.status === "WAITING_INTERNAL"
                ? "WAITING"
                : dept.state === "RUNNING"
                  ? "COMPLETE"
                  : dept.state,
        currentTask: isLiveExecutionStatus(slice.status) ? slice.summary ?? dept.currentTask : dept.currentTask,
      };
    }),
    currentActivity: {
      ...snapshot.currentActivity,
      active: commandActivity ? (commandActivity.counts.activeMissions ?? 0) > 0 : snapshot.currentActivity.active,
      displayTask: live
        ? currentExecution?.currentTask ?? currentExecution?.currentStep ?? snapshot.currentActivity.displayTask
        : snapshot.currentActivity.displayTask,
      task: live
        ? currentExecution?.currentTask ?? currentExecution?.currentStep ?? snapshot.currentActivity.task
        : snapshot.currentActivity.task,
      latestActivityAt: live
        ? currentExecution?.lastActivityAt ?? snapshot.currentActivity.latestActivityAt
        : snapshot.currentActivity.latestActivityAt,
      latestActivitySummary: live
        ? currentExecution?.lastActivity ?? snapshot.currentActivity.latestActivitySummary
        : snapshot.currentActivity.latestActivitySummary,
      status: live ? currentExecution?.status ?? snapshot.currentActivity.status : snapshot.currentActivity.status,
    },
  };
}
