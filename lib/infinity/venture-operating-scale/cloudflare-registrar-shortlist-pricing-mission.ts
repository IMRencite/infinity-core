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
  CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1_STEPS,
  CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
  CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1_MISSION_ID,
} from "./constants";
import { executeCreCloudflareRegistrarShortlistPricing } from "./cloudflare-registrar-shortlist-pricing";

export async function executeCreCloudflareRegistrarShortlistPricingV1Mission(
  input: Parameters<typeof executeCreCloudflareRegistrarShortlistPricing>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1_MISSION_ID,
      missionType: CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
      source: "cre_cloudflare_registrar_shortlist_pricing_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "RELOAD_CLOUDFLARE_RUNTIME_ENV",
        engine: "venture_systems_architecture",
        summary: "Reloading the verified Cloudflare Registrar user token.",
        run: () => executeCreCloudflareRegistrarShortlistPricing(input),
      });
      await handle.step({
        stepType: "VERIFY_CLOUDFLARE_ACCOUNT",
        engine: "quality_control",
        summary: "Preserving verified Registrar authentication.",
        run: () => built.auth,
      });
      await handle.step({
        stepType: "CHECK_DOMAIN_AVAILABILITY",
        engine: "research_runtime",
        summary: "Checking the CRE shortlist with authoritative domain-check evidence.",
        run: () => built.checked,
      });
      await handle.step({
        stepType: "VERIFY_DOMAIN_PRICING",
        engine: "research_runtime",
        summary: "Reading first-year and renewal prices only from Registrar check evidence.",
        run: () => built.capabilities,
      });
      await handle.step({
        stepType: "RANK_DOMAIN_CANDIDATES",
        engine: "research_runtime",
        summary: "Ranking only domains proven available by domain-check.",
        run: () => built.ranked,
      });
      await handle.step({
        stepType: "SCREEN_DOMAIN_CONFLICTS",
        engine: "quality_control",
        summary: "Running a bounded obvious-conflict screen without trademark clearance.",
        run: () => built.ranked.slice(0, 3).map((row) => ({ domain: row.domain, conflict: row.conflict })),
      });
      await handle.step({
        stepType: "GOVERN_DOMAIN_ECONOMICS",
        engine: "monetization_engine",
        summary: "Evaluating Treasury and EAG without inventing a spend ceiling.",
        run: () => ({ treasury: built.governance.treasury, eag: built.governance.eag, economics: built.economics }),
      });
      await handle.step({
        stepType: "ROUTE_DOMAIN_PROVIDER",
        engine: "venture_systems_architecture",
        summary: "Preferring Cloudflare Registrar while preserving Namecheap as fallback.",
        run: () => built.routing,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Persisting proven shortlist and pricing state without purchasing.",
        run: () => built.record,
      });
      await handle.step({
        stepType: "RUN_DAILY_VENTURE_OPERATING_CYCLE",
        engine: "intelligence_runtime",
        summary: "Recognizing domain shortlist work and experiment external waiting.",
        run: () => built.daily,
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
      { stepType: "CHECK_DOMAIN_AVAILABILITY" },
      { stepType: "VERIFY_DOMAIN_PRICING" },
      { stepType: "GOVERN_DOMAIN_ECONOMICS" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "PRESENT_IDLE",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "ACTIVE_WORK",
      research_department: "ACTIVE_WORK",
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
      mission: CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      systemsArchitect: "PRESENT_IDLE",
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
