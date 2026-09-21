function deriveInfinityDecisionCoreState(input: {
  commandRoomStatus?: string | null;
  nowInspectingStatus?: string | null;
}): "ACTIVE_WORK" | "READY_BLOCKED" | "PRESENT_IDLE" | "FAILED" {
  const status = input.commandRoomStatus ?? input.nowInspectingStatus ?? "";
  if (status === "FAILED") return "FAILED";
  if (status === "ACTIVE_WORK") return "ACTIVE_WORK";
  if (status === "READY_BLOCKED" || status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL") {
    return "READY_BLOCKED";
  }
  return "PRESENT_IDLE";
}

import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import {
  CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1,
  CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1_MISSION_ID,
  OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1_STEPS,
} from "./constants";
import { executeCreOccupancynpvVercelDeploymentBindingRepair } from "./occupancynpv-vercel-binding-repair";

export async function executeCreOccupancynpvVercelDeploymentBindingRepairV1Mission(
  input: Parameters<typeof executeCreOccupancynpvVercelDeploymentBindingRepair>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1,
      source: "cre_occupancynpv_vercel_deployment_binding_repair_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_OCCUPANCYNPV_VERCEL_BINDING_REPAIR",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "VERIFY_CURRENT_VERCEL_DEPLOYMENT_STATE",
        engine: "launch_operations",
        summary: "Reading the live Vercel project and historical accepted deployment.",
        run: () => executeCreOccupancynpvVercelDeploymentBindingRepair(input),
      });
      await handle.step({
        stepType: "VERIFY_DOMAIN_ASSIGNMENT",
        engine: "launch_operations",
        summary: "Inspecting occupancynpv.com and www assignment without rewriting DNS.",
        run: () => built.domain,
      });
      await handle.step({
        stepType: "IDENTIFY_ROOT_CAUSE",
        engine: "quality_control",
        summary: "Classifying the DEPLOYMENT_NOT_FOUND binding defect.",
        run: () => built.rootCause,
      });
      await handle.step({
        stepType: "PRESERVE_ACCEPTED_ARTIFACT",
        engine: "quality_control",
        summary: "Confirming an equivalent live deployment for the accepted artifact.",
        run: () => built.equivalent,
      });
      await handle.step({
        stepType: "REPAIR_DOMAIN_DEPLOYMENT_BINDING",
        engine: "launch_operations",
        summary: "Rebinding occupancynpv.com to the accepted READY deployment.",
        run: () => built.repair,
      });
      await handle.step({
        stepType: "VALIDATE_HTTPS_HOST_AND_ROUTES",
        engine: "quality_control",
        summary: "Validating HTTPS, www redirect, host, and the 93-route inventory.",
        run: () => ({ https: built.https, host: built.productionHost, routes: built.routes }),
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "quality_control",
        summary: "Persisting binding only after proven HTTPS readiness, without public launch.",
        run: () => built.record,
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "IDENTIFY_ROOT_CAUSE" },
      { stepType: "REPAIR_DOMAIN_DEPLOYMENT_BINDING" },
      { stepType: "VALIDATE_HTTPS_HOST_AND_ROUTES" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "PRESENT_IDLE",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "PRESENT_IDLE",
      research_department: "PRESENT_IDLE",
      intelligence_center: "PRESENT_IDLE",
      launch_operations: "ACTIVE_WORK",
      growth_department: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1,
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      after: {
        active: after.counts.activeMissions,
        infinityDecisionCore: deriveInfinityDecisionCoreState({
          commandRoomStatus:
            after.nowInspecting.status === "PRESENT_IDLE" ? "PRESENT_IDLE" : after.rooms.executive_office.status,
          nowInspectingStatus: after.nowInspecting.status,
        }),
        fakeContinuousActiveWork: after.counts.activeMissions > 0 || after.nowInspecting.status === "ACTIVE_WORK",
      },
    },
  };
}
