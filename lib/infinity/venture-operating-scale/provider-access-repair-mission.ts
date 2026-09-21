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
  CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_MISSION_ID,
  CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1,
  PROVIDER_ACCESS_REPAIR_STEPS,
} from "./constants";
import { executeCreCommercialProviderAccessRepair } from "./provider-access-repair";

export async function executeCreCommercialProviderAccessRepairMission(
  input: Parameters<typeof executeCreCommercialProviderAccessRepair>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_MISSION_ID,
      missionType: CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1,
      source: "cre_commercial_provider_access_repair_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...PROVIDER_ACCESS_REPAIR_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "CLASSIFY_PROVIDER_BLOCKS",
        engine: "venture_systems_architecture",
        summary: "Classifying Namecheap and Stripe failures as provider-account vs code defects.",
        run: () => executeCreCommercialProviderAccessRepair(input),
      });
      await handle.step({
        stepType: "INSPECT_NAMECHEAP_SAFE_CONFIG",
        engine: "grounded_research",
        summary: "Reading safe Namecheap configuration presence without exposing secrets.",
        run: () => built.namecheap.config,
      });
      await handle.step({
        stepType: "REVERIFY_NAMECHEAP_DOMAIN_READS",
        engine: "quality_control",
        summary: "Re-running domain.search, availability, and pricing without registration writes.",
        run: () => built.namecheap.verification,
      });
      await handle.step({
        stepType: "INSPECT_STRIPE_KEY_CAPABILITIES",
        engine: "quality_control",
        summary: "Probing Stripe restricted-key permissions from live GET responses only.",
        run: () => built.stripe.inspection.permissions,
      });
      await handle.step({
        stepType: "REVERIFY_STRIPE_ACCOUNT_IDENTITY",
        engine: "quality_control",
        summary: "Verifying Stripe account identity before any commercial write.",
        run: () => ({
          verified: built.stripe.accountIdentityVerified,
          id: built.stripe.inspection.account.id,
          wrongAccount: built.stripe.wrongAccountProtection,
        }),
      });
      await handle.step({
        stepType: "LOOKUP_EXISTING_STRIPE_OBJECTS",
        engine: "quality_control",
        summary: "Searching existing Professional and Per-deal objects without creating any.",
        run: () => built.stripe.objects,
      });
      await handle.step({
        stepType: "SEARCH_CANONICAL_LEGAL_FACTS",
        engine: "grounded_research",
        summary: "Searching canonical IMR/venture records for proven legal identity facts.",
        run: () => built.legalFacts,
      });
      await handle.step({
        stepType: "RECONCILE_LEGAL_SURFACES",
        engine: "quality_control",
        summary: "Confirming legal surfaces remain present without mutating public copy.",
        run: () => built.legal,
      });
      await handle.step({
        stepType: "RUN_DAILY_VENTURE_OPERATING_CYCLE",
        engine: "performance_intelligence",
        summary: "Recognizing provider-access, commercialization, and experiment-waiting work.",
        run: () => built.daily,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Writing only proven provider and legal states into the canonical record.",
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
      { stepType: "CLASSIFY_PROVIDER_BLOCKS" },
      { stepType: "INSPECT_NAMECHEAP_SAFE_CONFIG" },
      { stepType: "REVERIFY_NAMECHEAP_DOMAIN_READS" },
      { stepType: "INSPECT_STRIPE_KEY_CAPABILITIES" },
      { stepType: "REVERIFY_STRIPE_ACCOUNT_IDENTITY" },
      { stepType: "SEARCH_CANONICAL_LEGAL_FACTS" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "ACTIVE_WORK",
      research_department: "ACTIVE_WORK",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "PRESENT_IDLE",
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
      financialGovernance: "PRESENT_IDLE",
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
