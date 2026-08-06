import type { MissionRuntimeInstance } from "@/lib/infinity/mission-runtime/types";
import type { StageInspectionSnapshot } from "@/lib/infinity/mission-runtime/types";
import { MISSION_RUNTIME_VERSION_V2 } from "@/lib/infinity/mission-runtime/constants";

export function missionUsesAutonomousPlanExecution(
  instance: MissionRuntimeInstance,
  inspection: StageInspectionSnapshot,
): boolean {
  if (instance.runtimeVersion !== MISSION_RUNTIME_VERSION_V2) {
    return false;
  }
  if (!inspection.hasPlannerEligiblePlan || !inspection.canonicalExecutiveSelectionDecisionId) {
    return false;
  }
  if (instance.status === "paused" || instance.status === "cancelled") {
    return false;
  }
  const meta =
    typeof instance.metadata === "object" &&
    instance.metadata !== null &&
    !Array.isArray(instance.metadata)
      ? (instance.metadata as Record<string, unknown>)
      : {};
  if (meta.disable_autonomous_plan_execution === true) {
    return false;
  }
  return true;
}
