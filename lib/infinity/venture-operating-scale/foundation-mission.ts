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
  FOUNDATION_STEPS,
  VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_MISSION_ID,
  VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1,
} from "./constants";
import { executeVentureScaleAndCommercializationFoundation } from "./foundation";

function duringRoom(
  snapshots: Array<{ view: CommandActivityView }>,
  room: "executive_office" | "growth_department" | "research_department" | "quality_control" | "launch_operations" | "product_lab" | "intelligence_center" | "strategy_finance",
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

export async function executeVentureScaleAndCommercializationFoundationMission() {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_MISSION_ID,
      missionType: VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1,
      source: "venture_scale_and_commercialization_foundation_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...FOUNDATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_VENTURE_OPERATING_SCALE",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Creating the canonical VentureOperationalRecord without provider mutations.",
        run: () => executeVentureScaleAndCommercializationFoundation(),
      });
      await handle.step({
        stepType: "BACKFILL_CRE_OPERATING_RECORD",
        engine: "market_validation",
        summary: "Backfilling the CRE validation venture from proven state only.",
        run: () => built.record,
      });
      await handle.step({
        stepType: "BUILD_DAILY_OPERATING_CYCLE",
        engine: "performance_intelligence",
        summary: "Installing DailyVentureOperatingCycle as an orchestrator, not a second decision engine.",
        run: () => built.daily,
      });
      await handle.step({
        stepType: "BUILD_PORTFOLIO_OPERATING_CYCLE",
        engine: "performance_intelligence",
        summary: "Installing PortfolioOperatingCycle reporting across active ventures.",
        run: () => built.portfolio,
      });
      await handle.step({
        stepType: "BUILD_DOMAIN_PAYMENT_FOUNDATION",
        engine: "organic_growth",
        summary: "Installing provider-neutral domain and payment contracts without executing them.",
        run: () => ({ domain: built.domainPlan, payment: built.paymentGate }),
      });
      await handle.step({
        stepType: "EVALUATE_COMMERCIALIZATION_READINESS",
        engine: "market_validation",
        summary: "Evaluating CRE commercialization readiness without launching or activating payments.",
        run: () => built.readiness,
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
  const commandDuring = duringRoom(instrumented.snapshots, "executive_office");
  const coreDuring = duringCore(instrumented.snapshots);
  const projection = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD" },
      { stepType: "BUILD_DAILY_OPERATING_CYCLE" },
      { stepType: "BUILD_DOMAIN_PAYMENT_FOUNDATION" },
      { stepType: "EVALUATE_COMMERCIALIZATION_READINESS" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      growth_department: "ACTIVE_WORK",
      intelligence_center: "ACTIVE_WORK",
      quality_control: "ACTIVE_WORK",
      research_department: "PRESENT_IDLE",
      launch_operations: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      projection: projection.overall,
      command: commandDuring,
      growthNexus: duringRoom(instrumented.snapshots, "growth_department"),
      signalIntelligence: duringRoom(instrumented.snapshots, "intelligence_center"),
      validationStation: duringRoom(instrumented.snapshots, "quality_control"),
      researchGrid: duringRoom(instrumented.snapshots, "research_department"),
      deploymentDepot: duringRoom(instrumented.snapshots, "launch_operations"),
      creationLab: duringRoom(instrumented.snapshots, "product_lab"),
      infinityDecisionCoreDuring: coreDuring,
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
