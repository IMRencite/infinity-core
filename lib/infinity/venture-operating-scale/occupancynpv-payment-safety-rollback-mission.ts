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
  CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1,
  CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1_MISSION_ID,
  OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1_STEPS,
} from "./constants";
import { executeCreOccupancynpvPaymentSafetyRollback } from "./occupancynpv-payment-safety-rollback";

export async function executeCreOccupancynpvPaymentSafetyRollbackV1Mission(
  input: Parameters<typeof executeCreOccupancynpvPaymentSafetyRollback>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1,
      source: "cre_occupancynpv_payment_safety_rollback_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "AUDIT_POST_ACTIVATION_TRANSACTIONS",
        engine: "quality_control",
        summary: "Reading Stripe objects created after OccupancyNPV payment activation without mutating them.",
        run: () => executeCreOccupancynpvPaymentSafetyRollback(input),
      });
      await handle.step({
        stepType: "DISABLE_CUSTOMER_PAYMENT_INITIATION",
        engine: "strategy_finance",
        summary: "Blocking checkout session creation until fulfillment is ready.",
        run: () => built.rollback,
      });
      await handle.step({
        stepType: "PRESERVE_PAYMENT_INFRASTRUCTURE",
        engine: "quality_control",
        summary: "Confirming Stripe products, prices, webhook, and analytics remain intact.",
        run: () => built.infrastructure,
      });
      await handle.step({
        stepType: "ADD_FULFILLMENT_READINESS_DEPENDENCY",
        engine: "strategy_finance",
        summary: "Making FulfillmentReadinessGate a hard PaymentReadinessGate dependency.",
        run: () => built.fulfillment,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "quality_control",
        summary: "Persisting safety rollback without clearing PUBLIC_LAUNCH history or payment configuration.",
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
      { stepType: "AUDIT_POST_ACTIVATION_TRANSACTIONS" },
      { stepType: "DISABLE_CUSTOMER_PAYMENT_INITIATION" },
      { stepType: "ADD_FULFILLMENT_READINESS_DEPENDENCY" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "PRESENT_IDLE",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "ACTIVE_WORK",
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
      mission: CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1,
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
