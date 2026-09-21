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
  CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2,
  CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2_MISSION_ID,
  OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2_STEPS,
} from "./constants";
import { executeCreOccupancynpvSslFinalizationCheck } from "./occupancynpv-ssl-finalization-check";

export async function executeCreOccupancynpvSslFinalizationCheckV2Mission(
  input: Parameters<typeof executeCreOccupancynpvSslFinalizationCheck>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2,
      source: "cre_occupancynpv_ssl_finalization_check_v2",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_OCCUPANCYNPV_SSL_FINALIZATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "CONFIRM_READONLY_DNS",
        engine: "quality_control",
        summary: "Confirming apex and www CNAMEs without rewriting them.",
        run: () => executeCreOccupancynpvSslFinalizationCheck(input),
      });
      await handle.step({
        stepType: "QUERY_VERCEL_DOMAIN_STATUS",
        engine: "launch_operations",
        summary: "Reading live Vercel apex and www status.",
        run: () => built.vercel,
      });
      await handle.step({
        stepType: "VERIFY_SSL_AND_HTTPS",
        engine: "quality_control",
        summary: "Checking provider-managed SSL and HTTPS without certificate purchase.",
        run: () => built.ssl,
      });
      await handle.step({
        stepType: "VALIDATE_PRODUCTION_HOST_AND_ROUTES",
        engine: "quality_control",
        summary: "Validating production host, routes, and footer only if HTTPS is live.",
        run: () => ({ host: built.productionHost, routes: built.routes, footer: built.footer }),
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "quality_control",
        summary: "Persisting SSL and binding only after proven HTTPS readiness.",
        run: () => built.record,
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [{ stepType: "VERIFY_SSL_AND_HTTPS" }],
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
      mission: CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2,
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
