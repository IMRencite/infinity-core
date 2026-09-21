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
  CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
  CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1_MISSION_ID,
  OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1_STEPS,
} from "./constants";
import { executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitecture } from "./occupancynpv-fulfillment-architecture";

export async function executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitectureV1Mission(
  input: Parameters<typeof executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitecture>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
      source: "cre_occupancynpv_venture_specific_commercial_fulfillment_architecture_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_OCCUPANCYNPV_FULFILLMENT_ARCHITECTURE",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "LOCK_GLOBAL_FULFILLMENT_PRINCIPLES",
        engine: "strategy_finance",
        summary: "Persisting payment-is-not-fulfillment and venture-specific contract invariants.",
        run: () => executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitecture(input),
      });
      await handle.step({
        stepType: "DISCOVER_OCCUPANCYNPV_PRODUCT_TRUTH",
        engine: "quality_control",
        summary: "Inspecting OccupancyNPV executable product capabilities without inferring from marketing.",
        run: () => built.productTruth,
      });
      await handle.step({
        stepType: "DEFINE_VENTURE_FULFILLMENT_CONTRACTS",
        engine: "strategy_finance",
        summary: "Persisting Professional and Per-Deal contracts from product truth.",
        run: () => built.contracts,
      });
      await handle.step({
        stepType: "IMPLEMENT_ENTITLEMENT_LIFECYCLE",
        engine: "systems_architect",
        summary: "Implementing provider-neutral entitlement, consumption, recovery, and orphan detection.",
        run: () => built.lockedInvariants,
      });
      await handle.step({
        stepType: "UPGRADE_SERVER_SIDE_FULFILLMENT_GATE",
        engine: "quality_control",
        summary: "Making checkout consult FulfillmentReadinessGate instead of a manual safety boolean.",
        run: () => built.gates,
      });
      await handle.step({
        stepType: "EVALUATE_READINESS_GATES",
        engine: "strategy_finance",
        summary: "Re-evaluating fulfillment, offer consistency, and payment readiness without activating payments.",
        run: () => built.gates.paymentReport,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "quality_control",
        summary: "Persisting evidence-supported blockers without clearing payment activation or public launch.",
        run: () => built.commercialization,
      });
      await handle.step({
        stepType: "PRESERVE_PUBLIC_LAUNCH_FIREWALL",
        engine: "quality_control",
        summary: "Keeping PUBLICLY_LAUNCHED = NO.",
        run: () => ({ publicLaunch: built.commercialization.publiclyLaunched }),
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
      { stepType: "DISCOVER_OCCUPANCYNPV_PRODUCT_TRUTH" },
      { stepType: "DEFINE_VENTURE_FULFILLMENT_CONTRACTS" },
      { stepType: "UPGRADE_SERVER_SIDE_FULFILLMENT_GATE" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "ACTIVE_WORK",
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
  const built = instrumented.result as ReturnType<
    typeof executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitecture
  >;
  return {
    ...built,
    hqMission: {
      mission: CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
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
