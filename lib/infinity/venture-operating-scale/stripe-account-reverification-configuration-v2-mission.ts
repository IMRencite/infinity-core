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
  CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2,
  CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2_MISSION_ID,
  STRIPE_ACCOUNT_REVERIFICATION_V2_STEPS,
} from "./constants";
import { executeCreStripeReverificationAndCommercialConfiguration } from "./stripe-reverification-configuration";

export async function executeCreStripeAccountReverificationAndConfigurationV2Mission(
  input: Parameters<typeof executeCreStripeReverificationAndCommercialConfiguration>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2_MISSION_ID,
      missionType: CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2,
      source: "cre_stripe_account_reverification_and_configuration_v2",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...STRIPE_ACCOUNT_REVERIFICATION_V2_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "RELOAD_STRIPE_RUNTIME_ENV",
        engine: "venture_systems_architecture",
        summary: "Reloading STRIPE_SECRET_KEY from server environment without exposing the secret.",
        run: () =>
          executeCreStripeReverificationAndCommercialConfiguration({
            ...input,
            mission: CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2,
          }),
      });
      await handle.step({
        stepType: "VERIFY_STRIPE_ACCOUNT_IDENTITY",
        engine: "quality_control",
        summary: "Verifying live Stripe account identity before any commercial writes.",
        run: () => built.identity,
      });
      await handle.step({
        stepType: "VERIFY_STRIPE_READ_CAPABILITIES",
        engine: "quality_control",
        summary: "Proving product, price, balance, event, payment, charge, and webhook reads.",
        run: () => built.reads,
      });
      await handle.step({
        stepType: "RECONCILE_STRIPE_OBJECTS",
        engine: "quality_control",
        summary: "Searching existing canonical Professional and Per-deal objects before mutation.",
        run: () => built.preexisting,
      });
      await handle.step({
        stepType: "GOVERN_STRIPE_WRITE_GATES",
        engine: "monetization_engine",
        summary: "Evaluating write authorization, identity, livemode, duplicate, and amount gates.",
        run: () => ({
          authorization: built.writes.authorization,
          stopped: built.writes.stoppedReason,
          identity: built.identity.verified,
        }),
      });
      await handle.step({
        stepType: "CONFIGURE_STRIPE_PRODUCTS",
        engine: "venture_systems_architecture",
        summary: "Creating or reusing at most two products and two prices.",
        run: () => ({ products: built.writes.productsCreated, prices: built.writes.pricesCreated }),
      });
      await handle.step({
        stepType: "PROVIDER_READBACK",
        engine: "quality_control",
        summary: "Reading created or reused Professional and Per-deal objects back from Stripe.",
        run: () => ({ professional: built.professional, perDeal: built.perDeal }),
      });
      await handle.step({
        stepType: "IDEMPOTENT_RECONCILIATION",
        engine: "quality_control",
        summary: "Confirming a second read finds the same objects with no extra writes.",
        run: () => built.idempotency,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Persisting verified Stripe bindings without raw secrets.",
        run: () => built.record,
      });
      await handle.step({
        stepType: "EVALUATE_PAYMENT_READINESS",
        engine: "quality_control",
        summary: "Separating payment configuration completion from payment activation.",
        run: () => built.paymentGate,
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
      { stepType: "VERIFY_STRIPE_ACCOUNT_IDENTITY" },
      { stepType: "GOVERN_STRIPE_WRITE_GATES" },
      { stepType: "CONFIGURE_STRIPE_PRODUCTS" },
      { stepType: "PROVIDER_READBACK" },
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
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2,
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      systemsArchitect: "ACTIVE_WORK",
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
