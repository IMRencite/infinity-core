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
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import {
  CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_MISSION_ID,
  CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
  executeCreContextRichChallengerOutcomeObservation,
} from "./cre-context-rich-challenger-outcome-observation";

export const CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_STEPS = [
  "ORCHESTRATE_CHALLENGER_OUTCOME_OBSERVATION",
  "TRACKED_THREAD_OBSERVATION",
  "INGEST_CHALLENGER_INBOUND",
  "CLASSIFY_AND_POLICY",
  "OUTCOME_EVALUATION",
  "PRESERVE_EXPERIMENT_OBSERVER",
] as const;

function duringRoom(
  snapshots: Array<{ view: CommandActivityView }>,
  room:
    | "executive_office"
    | "growth_department"
    | "research_department"
    | "quality_control"
    | "launch_operations"
    | "product_lab"
    | "intelligence_center",
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

export async function executeCreContextRichChallengerOutcomeObservationMission(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
} = {}) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_MISSION_ID,
      missionType: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
      source: "cre_context_rich_challenger_outcome_observation_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_CHALLENGER_OUTCOME_OBSERVATION",
    run: async (handle) => {
      const observed = await handle.step({
        stepType: "TRACKED_THREAD_OBSERVATION",
        engine: "performance_intelligence",
        summary: "Observing the four locked CRE conversations without mailbox replay.",
        run: () =>
          executeCreContextRichChallengerOutcomeObservation({
            now: input.now,
            fetchImpl: input.fetchImpl,
          }),
      });
      await handle.step({
        stepType: "INGEST_CHALLENGER_INBOUND",
        engine: "organic_growth",
        summary: "Ingesting only provider-observed inbound on the locked four conversations.",
        run: () => observed.inboundSince,
      });
      await handle.step({
        stepType: "CLASSIFY_AND_POLICY",
        engine: "market_validation",
        summary: "Classifying real inbound intent, validation signals, and autonomous policy.",
        run: () => ({
          details: observed.details.length,
          suppressionChanged: observed.suppressionChanged,
        }),
      });
      await handle.step({
        stepType: "OUTCOME_EVALUATION",
        engine: "performance_intelligence",
        summary: "Comparing baseline MINIMAL_DISCOVERY with CONTEXT_RICH_CONSULTATIVE V1.",
        run: () => observed.comparison,
      });
      await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "inbound_communication",
        summary: "Preserving the experiment clock and observer checkpoint lineage.",
        run: () => ({
          clock: inspectExperimentClock(input.now),
          evidence: inspectRealMarketEvidence({ now: input.now }),
          observer: inspectMailboxObserverHealth(),
        }),
      });
      return observed;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const observer = inspectMailboxObserverHealth();
  const commandDuring = duringRoom(instrumented.snapshots, "executive_office");
  const coreDuring = duringCore(instrumented.snapshots);
  const projection = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "TRACKED_THREAD_OBSERVATION" },
      { stepType: "INGEST_CHALLENGER_INBOUND" },
      { stepType: "CLASSIFY_AND_POLICY" },
      { stepType: "OUTCOME_EVALUATION" },
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
    hq: {
      mission: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
      projection: projection.overall,
      command: commandDuring,
      growthNexus: duringRoom(instrumented.snapshots, "growth_department"),
      signalIntelligence: duringRoom(instrumented.snapshots, "intelligence_center"),
      validationStation: duringRoom(instrumented.snapshots, "quality_control"),
      researchGrid: duringRoom(instrumented.snapshots, "research_department"),
      deploymentDepot: duringRoom(instrumented.snapshots, "launch_operations"),
      creationLab: duringRoom(instrumented.snapshots, "product_lab"),
      infinityDecisionCoreDuring: coreDuring,
      observerIdleState: observer.status,
      after: {
        active: after.counts.activeMissions,
        currentExecution: after.nowInspecting.currentMission ?? "NONE",
        latestCompleted: after.latestCompleted?.missionType ?? null,
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
