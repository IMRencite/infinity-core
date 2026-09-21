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
  CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1,
  CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1_MISSION_ID,
  OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1_STEPS,
} from "./constants";
import { executeCreOccupancynpvFirstPaymentActivation } from "./occupancynpv-first-payment-activation";

export async function executeCreOccupancynpvFirstPaymentActivationV1Mission(
  input: Parameters<typeof executeCreOccupancynpvFirstPaymentActivation>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1,
      source: "cre_occupancynpv_first_payment_activation_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "REVERIFY_STRIPE_ACCOUNT_IDENTITY",
        engine: "quality_control",
        summary: "Reverifying Stripe account acct_18h5CjLdvXKx7R7G before first payment activation.",
        run: () => executeCreOccupancynpvFirstPaymentActivation(input),
      });
      await handle.step({
        stepType: "REVERIFY_CANONICAL_PAYMENT_OBJECTS",
        engine: "strategy_finance",
        summary: "Reading back the two canonical OccupancyNPV Stripe products and prices.",
        run: () => built.offers,
      });
      await handle.step({
        stepType: "REVERIFY_CANONICAL_WEBHOOK",
        engine: "quality_control",
        summary: "Reading back webhook we_1UCssQLdvXKx7R7GcHonT3rh without mutating it.",
        run: () => built.webhook,
      });
      await handle.step({
        stepType: "REVERIFY_CHECKOUT_SAFETY",
        engine: "quality_control",
        summary: "Confirming canonical offer mapping and arbitrary price rejection.",
        run: () => built.checkoutSafety,
      });
      await handle.step({
        stepType: "EVALUATE_ACTIVATION_GATES",
        engine: "strategy_finance",
        summary: "Evaluating PaymentReadinessGate and founder-approved first activation authority.",
        run: () => built.gates,
      });
      await handle.step({
        stepType: "ACTIVATE_PAYMENT_PATH",
        engine: "strategy_finance",
        summary: "Activating the existing canonical OccupancyNPV checkout path without creating charges.",
        run: () => built.activation,
      });
      await handle.step({
        stepType: "VERIFY_PURCHASE_SURFACE",
        engine: "launch_operations",
        summary: "Verifying production purchase controls without creating a Checkout Session.",
        run: () => built.production,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "quality_control",
        summary: "Persisting payment activation without clearing PUBLIC_LAUNCH.",
        run: () => built.record,
      });
      await handle.step({
        stepType: "PRESERVE_PUBLIC_LAUNCH_FIREWALL",
        engine: "quality_control",
        summary: "Keeping PUBLICLY_LAUNCHED = NO.",
        run: () => ({ publicLaunch: built.record.publiclyLaunched, remaining: built.commercialization.remaining }),
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
      { stepType: "REVERIFY_STRIPE_ACCOUNT_IDENTITY" },
      { stepType: "EVALUATE_ACTIVATION_GATES" },
      { stepType: "VERIFY_PURCHASE_SURFACE" },
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
      mission: CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1,
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
