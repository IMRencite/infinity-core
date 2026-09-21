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
import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";
import {
  PARALLEL_COMMERCIALIZATION_STEPS,
  PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_MISSION_ID,
  PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1,
} from "./constants";
import { executeParallelCreCommercializationExecution } from "./parallel-execution";

function duringRoom(
  snapshots: Array<{ view: CommandActivityView }>,
  room: "executive_office" | "growth_department" | "research_department" | "quality_control" | "launch_operations" | "product_lab" | "intelligence_center" | "strategy_finance" | "systems_architect",
): string {
  return snapshots.some((item) => item.view.rooms[room]?.status === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE";
}

function duringCore(snapshots: Array<{ view: CommandActivityView }>): string {
  const active = snapshots.find((item) => item.view.rooms.executive_office.status === "ACTIVE_WORK");
  if (!active) return "PRESENT_IDLE";
  return deriveInfinityDecisionCoreState({
    commandRoomStatus: active.view.rooms.executive_office.status,
    nowInspectingStatus: active.view.nowInspecting.status,
  });
}

export async function executeParallelCreCommercializationExecutionMission(
  input: Parameters<typeof executeParallelCreCommercializationExecution>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_MISSION_ID,
      missionType: PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1,
      source: "parallel_cre_commercialization_execution_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...PARALLEL_COMMERCIALIZATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_PARALLEL_CRE_COMMERCIALIZATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "EVALUATE_MISSION_CONCURRENCY",
        engine: "mission_runtime",
        summary: "Evaluating MissionConcurrencyGate for observer, domain, and Stripe verification.",
        run: () => executeParallelCreCommercializationExecution(input),
      });
      await handle.step({
        stepType: "RESEARCH_VENTURE_NAMING",
        engine: "grounded_research",
        summary: "Evaluating CRE venture naming and domain candidate set.",
        run: () => built.domain.naming,
      });
      await handle.step({
        stepType: "VERIFY_DOMAIN_PROVIDERS",
        engine: "quality_control",
        summary: "Verifying registrar availability without registration writes.",
        run: () => built.domain.providers,
      });
      await handle.step({
        stepType: "GOVERN_DOMAIN_ECONOMICS",
        engine: "monetization_engine",
        summary: "Running Treasury and Economic Action Governance without inventing a spend ceiling.",
        run: () => built.domain.decision,
      });
      await handle.step({
        stepType: "VERIFY_STRIPE_CONNECTION",
        engine: "quality_control",
        summary: "Verifying Stripe read capabilities without payment writes.",
        run: () => ({ connected: built.stripe.connected, capabilities: built.stripe.capabilities }),
      });
      await handle.step({
        stepType: "BUILD_PAYMENT_CONFIGURATION_PLAN",
        engine: "venture_systems_architecture",
        summary: "Building CREPaymentConfigurationPlan without creating Stripe objects.",
        run: () => built.stripe.plan,
      });
      await handle.step({
        stepType: "EVALUATE_PAYMENT_READINESS",
        engine: "quality_control",
        summary: "Separating payment configuration readiness from activation readiness.",
        run: () => built.stripe.paymentGate,
      });
      await handle.step({
        stepType: "RUN_DAILY_VENTURE_OPERATING_CYCLE",
        engine: "performance_intelligence",
        summary: "Recognizing external experiment waiting and commercialization blockers.",
        run: () => built.daily,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Reconciling selected domain and Stripe verification into the canonical record.",
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
  const concurrentProjection = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "RESEARCH_VENTURE_NAMING" },
      { stepType: "VERIFY_DOMAIN_PROVIDERS" },
      { stepType: "GOVERN_DOMAIN_ECONOMICS" },
      { stepType: "VERIFY_STRIPE_CONNECTION" },
      { stepType: "BUILD_PAYMENT_CONFIGURATION_PLAN" },
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
      projection: concurrentProjection.overall,
      command: "ACTIVE_WORK",
      systemsArchitect: "ACTIVE_WORK",
      researchGrid: "ACTIVE_WORK",
      validationStation: "ACTIVE_WORK",
      financialGovernanceRoom: "ACTIVE_WORK",
      signalIntelligence: "PRESENT_IDLE",
      growthNexus: "PRESENT_IDLE",
      deploymentDepot: "PRESENT_IDLE",
      infinityDecisionCoreDuring: "ACTIVE_WORK",
      fakeSerialization: "NO" as const,
      during: {
        command: duringRoom(instrumented.snapshots, "executive_office"),
        researchGrid: duringRoom(instrumented.snapshots, "research_department"),
        validationStation: duringRoom(instrumented.snapshots, "quality_control"),
        financialGovernanceRoom: duringRoom(instrumented.snapshots, "strategy_finance"),
        systemsArchitect: duringRoom(instrumented.snapshots, "systems_architect"),
        signalIntelligence: duringRoom(instrumented.snapshots, "intelligence_center"),
        infinityDecisionCore: duringCore(instrumented.snapshots),
      },
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
