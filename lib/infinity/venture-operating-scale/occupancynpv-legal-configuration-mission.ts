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
  CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1,
  CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1_MISSION_ID,
  OCCUPANCYNPV_LEGAL_CONFIGURATION_V1_STEPS,
} from "./constants";
import { executeCreOccupancynpvLegalConfiguration } from "./occupancynpv-legal-configuration";

export async function executeCreOccupancynpvLegalConfigurationV1Mission(
  input: Parameters<typeof executeCreOccupancynpvLegalConfiguration>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1,
      source: "cre_occupancynpv_legal_configuration_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_LEGAL_CONFIGURATION_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "PERSIST_CANONICAL_LEGAL_FACTS",
        engine: "quality_control",
        summary: "Persisting founder-confirmed Infinite Media Resources LLC legal facts.",
        run: () => executeCreOccupancynpvLegalConfiguration(input),
      });
      await handle.step({
        stepType: "COMPOSE_LEGAL_SURFACE_SUCCESSOR",
        engine: "product_lab",
        summary: "Patching only Privacy Policy and Terms of Service on the accepted artifact lineage.",
        run: () => built.artifact,
      });
      await handle.step({
        stepType: "PUBLISH_LEGAL_SURFACES",
        engine: "launch_operations",
        summary: "Publishing the legal-only successor only if production still lacks the confirmed facts.",
        run: () => built.deployment,
      });
      await handle.step({
        stepType: "VALIDATE_LEGAL_SURFACES",
        engine: "quality_control",
        summary: "Validating production Privacy and Terms against founder-confirmed facts.",
        run: () => ({ privacy: built.privacy, terms: built.terms, footer: built.footer }),
      });
      await handle.step({
        stepType: "VALIDATE_PRODUCTION_HOST_AND_ROUTES",
        engine: "quality_control",
        summary: "Revalidating the known public OccupancyNPV route inventory.",
        run: () => built.routes,
      });
      await handle.step({
        stepType: "EVALUATE_LEGAL_CONFIGURATION_GATE",
        engine: "quality_control",
        summary: "Evaluating LegalConfigurationGate without weakening completeness rules.",
        run: () => built.legalConfiguration,
      });
      await handle.step({
        stepType: "EVALUATE_PAYMENT_READINESS",
        engine: "quality_control",
        summary: "Re-evaluating PaymentReadinessGate without writing Stripe objects.",
        run: () => built.paymentReadiness,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Persisting complete legal configuration without public launch.",
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
      { stepType: "PERSIST_CANONICAL_LEGAL_FACTS" },
      { stepType: "VALIDATE_LEGAL_SURFACES" },
      { stepType: "EVALUATE_PAYMENT_READINESS" },
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
      product_lab: "ACTIVE_WORK",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1,
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
