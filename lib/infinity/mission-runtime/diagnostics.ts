import type { MissionRuntimeInstance, StageInspectionSnapshot } from "./types";
import { evaluateStage } from "./stage-handlers";
import { expectedNextStageV2 } from "./transition-graph";
import { lifecycleVersionLabel } from "./recovery";

export type MissionRuntimeDiagnostics = {
  runtimeInstanceId: string;
  missionId: string;
  organizationId: string;
  status: string;
  currentStage: string;
  lifecycleVersion: string;
  lifecycleVersionLabel: string;
  expectedNextStage: string | null;
  unmetPrerequisite: string | null;
  recoveryStatus: string | null;
  stateVersion: number;
  lockedBy: string | null;
  leaseExpiresAt: string | null;
  wakeAt: string | null;
  blockingReason: string | null;
  lastWorkRequestKey: string | null;
  lastError: unknown;
  recoveryNotes: string[];
};

export function buildMissionRuntimeDiagnostics(
  instance: MissionRuntimeInstance,
  options?: { inspection?: StageInspectionSnapshot },
): MissionRuntimeDiagnostics {
  const inspection = options?.inspection;
  let unmetPrerequisite: string | null = instance.context.blockingReason;
  let expectedNextStage = expectedNextStageV2(instance.currentStage);

  if (inspection) {
    const evaluation = evaluateStage(instance, inspection);
    if (evaluation.outcome.kind === "advance") {
      expectedNextStage = evaluation.outcome.nextStage;
      unmetPrerequisite = null;
    } else if (
      evaluation.outcome.kind === "wait" ||
      evaluation.outcome.kind === "block"
    ) {
      unmetPrerequisite = evaluation.outcome.reason;
    }
  }

  const recoveryStatus =
    instance.context.recoveryNotes.length > 0
      ? instance.context.recoveryNotes[instance.context.recoveryNotes.length - 1] ?? null
      : null;

  return {
    runtimeInstanceId: instance.id,
    missionId: instance.missionId,
    organizationId: instance.organizationId,
    status: instance.status,
    currentStage: instance.currentStage,
    lifecycleVersion: instance.runtimeVersion,
    lifecycleVersionLabel: lifecycleVersionLabel(instance.runtimeVersion),
    expectedNextStage,
    unmetPrerequisite,
    recoveryStatus,
    stateVersion: instance.stateVersion,
    lockedBy: instance.lockedBy,
    leaseExpiresAt: instance.leaseExpiresAt,
    wakeAt: instance.wakeAt,
    blockingReason: instance.context.blockingReason,
    lastWorkRequestKey: instance.context.lastWorkRequestKey,
    lastError: instance.lastError,
    recoveryNotes: instance.context.recoveryNotes,
  };
}
