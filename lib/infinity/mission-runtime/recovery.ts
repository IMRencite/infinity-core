import {
  MISSION_RUNTIME_VERSION_V1,
  MISSION_RUNTIME_VERSION_V2,
  type MissionRuntimeStage,
} from "./constants";
import { stageIndexForVersion } from "./transition-graph";
import type { MissionRuntimeInstance, StageInspectionSnapshot } from "./types";

export type LegacyRecoveryPlan = {
  targetStage: MissionRuntimeStage;
  reason: string;
};

export function computeEarliestUnmetStageV2(
  inspection: StageInspectionSnapshot,
): MissionRuntimeStage {
  if (
    !inspection.latestValidationRunCompleted ||
    !inspection.latestValidationApprovedForPlanning
  ) {
    return "validation";
  }

  if (!inspection.hasCompletedGovernedReasoningSession) {
    return "reasoning";
  }

  if (
    !inspection.hasExecutiveContext ||
    inspection.hasExecutiveRejectOrDefer ||
    !inspection.hasExecutiveApproveOrQueue
  ) {
    return "executive";
  }

  if (!inspection.hasPlannerEligiblePlan) {
    return "planning";
  }

  if (!inspection.allocationProposalRecorded) {
    return "allocation";
  }

  return "scheduling";
}

export function planLegacyRuntimeRecovery(
  instance: MissionRuntimeInstance,
  inspection: StageInspectionSnapshot,
): LegacyRecoveryPlan | null {
  if (instance.runtimeVersion !== MISSION_RUNTIME_VERSION_V1) {
    return null;
  }

  const earliest = computeEarliestUnmetStageV2(inspection);
  const currentIdx = stageIndexForVersion(instance.currentStage, MISSION_RUNTIME_VERSION_V2);
  const earliestIdx = stageIndexForVersion(earliest, MISSION_RUNTIME_VERSION_V2);

  if (instance.currentStage === "allocation") {
    return {
      targetStage: "validation",
      reason:
        "Legacy mission_runtime_v1 bypass corrected: allocation cannot precede validation, reasoning, executive, and planning.",
    };
  }

  if (currentIdx > earliestIdx) {
    return {
      targetStage: earliest,
      reason: `Legacy mission_runtime_v1 recovery: rewound to earliest unmet governed stage (${earliest}).`,
    };
  }

  return null;
}

export function lifecycleVersionLabel(runtimeVersion: string): string {
  if (runtimeVersion === MISSION_RUNTIME_VERSION_V1) {
    return "v1 (legacy development order)";
  }
  if (runtimeVersion === MISSION_RUNTIME_VERSION_V2) {
    return "v2 (canonical governed lifecycle)";
  }
  return runtimeVersion;
}

export function upgradedRuntimeVersionAfterRecovery(): string {
  return MISSION_RUNTIME_VERSION_V2;
}
