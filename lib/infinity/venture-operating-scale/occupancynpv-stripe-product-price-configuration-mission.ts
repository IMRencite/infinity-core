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
  CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1,
  CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1_MISSION_ID,
  OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1_STEPS,
} from "./constants";
import { executeCreOccupancynpvStripeProductPriceConfiguration } from "./occupancynpv-stripe-product-price-configuration";

export async function executeCreOccupancynpvStripeProductPriceConfigurationV1Mission(
  input: Parameters<typeof executeCreOccupancynpvStripeProductPriceConfiguration>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1,
      source: "cre_occupancynpv_stripe_product_price_configuration_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "REVERIFY_STRIPE_ACCOUNT_IDENTITY",
        engine: "quality_control",
        summary: "Reverifying Stripe account acct_18h5CjLdvXKx7R7G before any write.",
        run: () => executeCreOccupancynpvStripeProductPriceConfiguration(input),
      });
      await handle.step({
        stepType: "RECONCILE_EXISTING_STRIPE_OBJECTS",
        engine: "monetization_engine",
        summary: "Searching live Stripe for existing OccupancyNPV Professional and Per-Deal objects.",
        run: () => ({ professional: built.professional, perDeal: built.perDeal, duplicate: built.duplicateProtection }),
      });
      await handle.step({
        stepType: "EVALUATE_WRITE_GOVERNANCE",
        engine: "strategy_finance",
        summary: "Evaluating founder write authorization and 2+2 object limits.",
        run: () => built.authorization,
      });
      await handle.step({
        stepType: "CREATE_CANONICAL_STRIPE_PRODUCTS",
        engine: "monetization_engine",
        summary: "Creating missing OccupancyNPV products only, with provider readback.",
        run: () => ({ professional: built.professional.productId, perDeal: built.perDeal.productId, created: built.writes.productsCreated }),
      });
      await handle.step({
        stepType: "CREATE_CANONICAL_STRIPE_PRICES",
        engine: "monetization_engine",
        summary: "Creating missing OccupancyNPV prices only, with provider readback.",
        run: () => ({ professional: built.professional.priceId, perDeal: built.perDeal.priceId, created: built.writes.pricesCreated }),
      });
      await handle.step({
        stepType: "READBACK_CANONICAL_STRIPE_OBJECTS",
        engine: "quality_control",
        summary: "Reading back canonical products and prices and checking duplicates.",
        run: () => built.duplicateProtection,
      });
      await handle.step({
        stepType: "PERSIST_PAYMENT_BINDINGS",
        engine: "quality_control",
        summary: "Persisting Stripe provider, product, and price bindings without secrets.",
        run: () => built.bindings,
      });
      await handle.step({
        stepType: "EVALUATE_PAYMENT_READINESS",
        engine: "quality_control",
        summary: "Re-evaluating PaymentReadinessGate without activating payments.",
        run: () => built.paymentReadiness,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Persisting configured payment objects without public launch.",
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
      { stepType: "REVERIFY_STRIPE_ACCOUNT_IDENTITY" },
      { stepType: "CREATE_CANONICAL_STRIPE_PRODUCTS" },
      { stepType: "EVALUATE_PAYMENT_READINESS" },
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
      mission: CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1,
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
