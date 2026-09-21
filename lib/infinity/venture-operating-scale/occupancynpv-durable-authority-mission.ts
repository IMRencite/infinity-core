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
  CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
  CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1_MISSION_ID,
  OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1_STEPS,
} from "./constants";
import { executeCreOccupancynpvDurableCommercialProviderMutationAuthority } from "./occupancynpv-durable-authority";

export async function executeCreOccupancynpvDurableCommercialProviderMutationAuthorityV1Mission(
  input: Parameters<typeof executeCreOccupancynpvDurableCommercialProviderMutationAuthority>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
      source: "cre_occupancynpv_durable_commercial_provider_mutation_authority_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "DEFINE_MUTATION_TAXONOMY",
        engine: "strategy_finance",
        summary: "Defining provider-neutral commercial mutation classes and decision outcomes.",
        run: () => executeCreOccupancynpvDurableCommercialProviderMutationAuthority(input),
      });
      await handle.step({
        stepType: "EVALUATE_DEFAULT_AUTONOMY_MATRIX",
        engine: "strategy_finance",
        summary: "Evaluating routine bounded mutation autonomy without blanket write authority.",
        run: () => built.sampleDecisions,
      });
      await handle.step({
        stepType: "INSTANTIATE_OCCUPANCYNPV_MUTATION_POLICY",
        engine: "strategy_finance",
        summary: "Persisting OccupancyNPV AUTONOMOUS_WITHIN_POLICY for demonstrated routine mutations only.",
        run: () => built.state,
      });
      await handle.step({
        stepType: "DEFINE_PAYMENT_ACTIVATION_POLICY",
        engine: "strategy_finance",
        summary: "Keeping first OccupancyNPV payment activation FOUNDER_APPROVAL_REQUIRED.",
        run: () => built.paymentActivation,
      });
      await handle.step({
        stepType: "PRESERVE_PAYMENT_AND_LAUNCH_BLOCKERS",
        engine: "quality_control",
        summary: "Leaving PAYMENT_ACTIVATION and PUBLIC_LAUNCH uncleared.",
        run: () => built.commercialization,
      });
      await handle.step({
        stepType: "PROJECT_HQ_AUTHORITY_VISIBILITY",
        engine: "intelligence_center",
        summary: "Projecting read-only authority state. HQ does not decide.",
        run: () => built.hq,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Recording durable policy without activating payments or public launch.",
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
      { stepType: "DEFINE_MUTATION_TAXONOMY" },
      { stepType: "DEFINE_PAYMENT_ACTIVATION_POLICY" },
      { stepType: "PROJECT_HQ_AUTHORITY_VISIBILITY" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "PRESENT_IDLE",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "ACTIVE_WORK",
      research_department: "PRESENT_IDLE",
      intelligence_center: "ACTIVE_WORK",
      launch_operations: "PRESENT_IDLE",
      growth_department: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
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
