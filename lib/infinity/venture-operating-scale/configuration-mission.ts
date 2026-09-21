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
  CONFIGURATION_STEPS,
  CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_MISSION_ID,
  CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1,
} from "./constants";
import { executeCreDomainProviderAndStripeConfiguration } from "./configuration-execution";

export async function executeCreDomainProviderAndStripeConfigurationMission(
  input: Parameters<typeof executeCreDomainProviderAndStripeConfiguration>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_MISSION_ID,
      missionType: CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1,
      source: "cre_domain_provider_and_stripe_configuration_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CONFIGURATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "EVALUATE_MISSION_CONCURRENCY",
        engine: "mission_runtime",
        summary: "Evaluating concurrency for domain verification, Stripe configuration, and legal reconciliation.",
        run: () => executeCreDomainProviderAndStripeConfiguration(input),
      });
      await handle.step({
        stepType: "VERIFY_DOMAIN_PROVIDERS",
        engine: "quality_control",
        summary: "Verifying Namecheap availability and pricing without registration writes.",
        run: () => built.domain,
      });
      await handle.step({
        stepType: "RESEARCH_VENTURE_NAMING",
        engine: "grounded_research",
        summary: "Re-ranking the CRE domain shortlist from live provider evidence.",
        run: () => built.domain.preferred,
      });
      await handle.step({
        stepType: "GOVERN_DOMAIN_ECONOMICS",
        engine: "monetization_engine",
        summary: "Evaluating Treasury and EAG without inventing a spend ceiling.",
        run: () => ({ readiness: built.domain.purchaseReadiness, eag: built.domain.eag }),
      });
      await handle.step({
        stepType: "VERIFY_STRIPE_ACCOUNT_IDENTITY",
        engine: "quality_control",
        summary: "Verifying live Stripe account identity before any commercial writes.",
        run: () => ({ id: built.stripe.stripeAccountId, verified: built.stripe.accountIdentityVerified }),
      });
      await handle.step({
        stepType: "RECONCILE_STRIPE_OBJECTS",
        engine: "quality_control",
        summary: "Reusing equivalent Stripe products and prices when present.",
        run: () => ({ found: built.stripe.equivalentProductsFound, avoided: built.stripe.duplicatesAvoided }),
      });
      await handle.step({
        stepType: "CONFIGURE_STRIPE_PRODUCTS",
        engine: "venture_systems_architecture",
        summary: "Creating at most two canonical products and prices after write gates.",
        run: () => ({ createdProducts: built.stripe.productsCreated, createdPrices: built.stripe.pricesCreated }),
      });
      await handle.step({
        stepType: "RECONCILE_LEGAL_SURFACES",
        engine: "quality_control",
        summary: "Reconciling accepted-artifact legal surfaces without rebuilding.",
        run: () => built.legal,
      });
      await handle.step({
        stepType: "RUN_DAILY_VENTURE_OPERATING_CYCLE",
        engine: "performance_intelligence",
        summary: "Identifying exact next commercialization actions.",
        run: () => built.daily,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Writing provider and legal evidence into the canonical record.",
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
      { stepType: "VERIFY_DOMAIN_PROVIDERS" },
      { stepType: "RESEARCH_VENTURE_NAMING" },
      { stepType: "GOVERN_DOMAIN_ECONOMICS" },
      { stepType: "VERIFY_STRIPE_ACCOUNT_IDENTITY" },
      { stepType: "CONFIGURE_STRIPE_PRODUCTS" },
      { stepType: "RECONCILE_LEGAL_SURFACES" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "ACTIVE_WORK",
      research_department: "ACTIVE_WORK",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "ACTIVE_WORK",
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
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      systemsArchitect: "ACTIVE_WORK",
      researchGrid: "ACTIVE_WORK",
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
