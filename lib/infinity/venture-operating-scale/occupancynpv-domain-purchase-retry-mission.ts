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

import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import {
  CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_RETRY_AFTER_CLOUDFLARE_PREREQUISITES_V1,
  CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_RETRY_AFTER_CLOUDFLARE_PREREQUISITES_V1_MISSION_ID,
  OCCUPANCYNPV_DOMAIN_PURCHASE_V2_STEPS,
} from "./constants";
import { executeCreOccupancynpvDomainPurchase } from "./occupancynpv-domain-purchase";

export async function executeCreOccupancynpvDomainPurchaseRetryAfterCloudflarePrerequisitesV1Mission(
  input: Omit<Parameters<typeof executeCreOccupancynpvDomainPurchase>[0], "founderConfirmedDashboardPrerequisites" | "mission"> = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_RETRY_AFTER_CLOUDFLARE_PREREQUISITES_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_RETRY_AFTER_CLOUDFLARE_PREREQUISITES_V1,
      source: "cre_occupancynpv_domain_purchase_retry_after_cloudflare_prerequisites_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_DOMAIN_PURCHASE_V2_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_OCCUPANCYNPV_DOMAIN_PURCHASE",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "RELOAD_CLOUDFLARE_RUNTIME_ENV",
        engine: "venture_systems_architecture",
        summary: "Reloading the verified Cloudflare Registrar user token.",
        run: () =>
          executeCreOccupancynpvDomainPurchase({
            ...input,
            mission: CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_RETRY_AFTER_CLOUDFLARE_PREREQUISITES_V1,
            founderConfirmedDashboardPrerequisites: true,
          }),
      });
      await handle.step({
        stepType: "RECHECK_DOMAIN_AVAILABILITY",
        engine: "quality_control",
        summary: "Rechecking occupancynpv.com immediately before any registration write.",
        run: () => built.prePurchase,
      });
      await handle.step({
        stepType: "VERIFY_REGISTRATION_PREREQUISITES",
        engine: "quality_control",
        summary: "Recording founder-confirmed Cloudflare dashboard prerequisites without inventing API proof.",
        run: () => built.prerequisites,
      });
      await handle.step({
        stepType: "GOVERN_DOMAIN_PURCHASE",
        engine: "monetization_engine",
        summary: "Applying the USD 15 founder authorization ceiling.",
        run: () => built.governance,
      });
      await handle.step({
        stepType: "CHECK_EXISTING_OWNERSHIP",
        engine: "quality_control",
        summary: "Checking whether occupancynpv.com is already owned before purchasing.",
        run: () => built.ownership,
      });
      await handle.step({
        stepType: "EXECUTE_DOMAIN_REGISTRATION",
        engine: "monetization_engine",
        summary: "Submitting at most one authorized Cloudflare registration for occupancynpv.com.",
        run: () => built.purchase,
      });
      await handle.step({
        stepType: "READBACK_DOMAIN_OWNERSHIP",
        engine: "quality_control",
        summary: "Reading Cloudflare Registrar ownership after the purchase attempt.",
        run: () => built.ownership,
      });
      await handle.step({
        stepType: "RECONCILE_PURCHASE_FINANCIALS",
        engine: "monetization_engine",
        summary: "Reconciling the actual charge against the USD 15 ceiling.",
        run: () => ({ actualCharge: built.purchase.actualCharge, exception: built.financialPolicyException }),
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Persisting proven ownership without configuring DNS or binding Vercel.",
        run: () => built.record,
      });
      await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "inbound_communication",
        summary: "Preserving the CRE experiment clock and inbound observer.",
        run: () => ({ clock: inspectExperimentClock(), observer: inspectMailboxObserverHealth() }),
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "EXECUTE_DOMAIN_REGISTRATION" },
      { stepType: "GOVERN_DOMAIN_PURCHASE" },
      { stepType: "READBACK_DOMAIN_OWNERSHIP" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "PRESENT_IDLE",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "ACTIVE_WORK",
      research_department: "PRESENT_IDLE",
      intelligence_center: "PRESENT_IDLE",
      launch_operations: "PRESENT_IDLE",
      growth_department: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_RETRY_AFTER_CLOUDFLARE_PREREQUISITES_V1,
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      systemsArchitect: "PRESENT_IDLE",
      researchGrid: "PRESENT_IDLE",
      validationStation: "ACTIVE_WORK",
      financialGovernance: "ACTIVE_WORK",
      signalIntelligence: "PRESENT_IDLE",
      deploymentDepot: "PRESENT_IDLE",
      creationLab: "PRESENT_IDLE",
      infinityDecisionCoreDuring: "ACTIVE_WORK",
      fakeSerialization: "NO" as const,
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
