import type { MissionRuntimeInstance } from "./types";

export type MissionRuntimeDiagnostics = {
  runtimeInstanceId: string;
  missionId: string;
  organizationId: string;
  status: string;
  currentStage: string;
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
): MissionRuntimeDiagnostics {
  return {
    runtimeInstanceId: instance.id,
    missionId: instance.missionId,
    organizationId: instance.organizationId,
    status: instance.status,
    currentStage: instance.currentStage,
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
