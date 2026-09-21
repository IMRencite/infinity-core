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
import { inspectHistoricalWave1Preservation } from "./context-rich-consultative-outreach-optimization";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import {
  executeGovernedCreContextRichOutreachExecution,
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_MISSION_ID,
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1,
} from "./governed-cre-context-rich-outreach-execution";

function duringRoom(
  snapshots: Array<{ view: CommandActivityView }>,
  room: "executive_office" | "growth_department" | "research_department" | "quality_control" | "launch_operations",
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

export async function executeGovernedCreContextRichOutreachExecutionMission(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
  hydrateCapability?: boolean;
  sendAuthorized?: boolean;
  providerWrite?: boolean;
} = {}) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_MISSION_ID,
      missionType: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1,
      source: "governed_cre_context_rich_outreach_execution_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_GOVERNED_CONTEXT_RICH_OUTREACH",
      "RESEARCH_PERSONA_EVIDENCE",
      "CONTACT_REVERIFICATION",
      "OUTREACH_MESSAGE_STRATEGY",
      "MESSAGE_QUALITY_VALIDATION",
      "PROSPECT_ELIGIBILITY_VALIDATION",
      "PROVIDER_SEND",
      "RESULT_PERSISTENCE",
      "PRESERVE_EXPERIMENT_OBSERVER",
    ],
    orchestrationStepType: "ORCHESTRATE_GOVERNED_CONTEXT_RICH_OUTREACH",
    run: async (handle) => {
      await handle.step({
        stepType: "RESEARCH_PERSONA_EVIDENCE",
        engine: "market_validation",
        summary: "Reviewing first-party tenant-rep bios for the bounded challenger cohort.",
        run: () => ({ reviewed: true }),
      });
      await handle.step({
        stepType: "CONTACT_REVERIFICATION",
        engine: "market_validation",
        summary: "Confirming first-party host and explicit-email reverification gates before send.",
        run: () => inspectHistoricalWave1Preservation(),
      });
      await handle.step({
        stepType: "OUTREACH_MESSAGE_STRATEGY",
        engine: "market_validation",
        summary: "Assigning one distinct CONTEXT_RICH_CONSULTATIVE V1 variant per eligible recipient.",
        run: () => ["crc_v1_workflow_context", "crc_v1_lease_economics", "crc_v1_client_summary", "crc_v1_comparison_process"],
      });
      await handle.step({
        stepType: "MESSAGE_QUALITY_VALIDATION",
        engine: "market_validation",
        summary: "Confirming pre-send quality, no site link, and no meeting ask.",
        run: () => ({ max: 4, siteLink: "NO_LINK_FIRST_TOUCH" }),
      });
      await handle.step({
        stepType: "PROSPECT_ELIGIBILITY_VALIDATION",
        engine: "market_validation",
        summary: "Confirming fail-closed eligibility and historical resend protection.",
        run: () => inspectHistoricalWave1Preservation(),
      });
      const executed = await handle.step({
        stepType: "PROVIDER_SEND",
        engine: "market_validation",
        summary: "Bounded Gmail first-touch writes for the challenger cohort.",
        run: () =>
          executeGovernedCreContextRichOutreachExecution({
            now: input.now,
            fetchImpl: input.fetchImpl,
            hydrateCapability: input.hydrateCapability,
            sendAuthorized: input.sendAuthorized,
            providerWrite: input.providerWrite,
          }),
      });
      await handle.step({
        stepType: "RESULT_PERSISTENCE",
        engine: "market_validation",
        summary: "Persisting challenger attempts, conversations, and observer tracking.",
        run: () => ({ tracked: executed.tracked.length, nextState: executed.nextState }),
      });
      await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "inbound_communication",
        summary: "Confirming experiment clock and observer checkpoint were not reset.",
        run: () => ({
          clock: inspectExperimentClock(input.now),
          evidence: inspectRealMarketEvidence({ now: input.now }),
          observer: inspectMailboxObserverHealth(),
        }),
      });
      return executed;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const observer = inspectMailboxObserverHealth();
  const commandDuring = duringRoom(instrumented.snapshots, "executive_office");
  const coreDuring = duringCore(instrumented.snapshots);
  const projection = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "RESEARCH_PERSONA_EVIDENCE" },
      { stepType: "OUTREACH_MESSAGE_STRATEGY" },
      { stepType: "MESSAGE_QUALITY_VALIDATION" },
      { stepType: "PROVIDER_SEND" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      research_department: "ACTIVE_WORK",
      growth_department: "ACTIVE_WORK",
      quality_control: "ACTIVE_WORK",
      launch_operations: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hq: {
      projection: projection.overall,
      command: commandDuring,
      growthNexus: duringRoom(instrumented.snapshots, "growth_department"),
      researchGrid: duringRoom(instrumented.snapshots, "research_department"),
      validationStation: duringRoom(instrumented.snapshots, "quality_control"),
      deploymentDepot: duringRoom(instrumented.snapshots, "launch_operations"),
      infinityDecisionCoreDuring: coreDuring,
      commandCoreMismatch: commandDuring === "ACTIVE_WORK" && coreDuring !== "ACTIVE_WORK",
      after: {
        active: after.counts.activeMissions,
        currentExecution: after.nowInspecting.currentMission ?? "NONE",
        latestCompleted: after.latestCompleted?.missionType ?? null,
        infinityDecisionCore: deriveInfinityDecisionCoreState({
          commandRoomStatus: after.nowInspecting.status === "PRESENT_IDLE" ? "PRESENT_IDLE" : after.rooms.executive_office.status,
          nowInspectingStatus: after.nowInspecting.status,
        }),
        staleActiveWork: after.counts.activeMissions > 0,
        consumedAuthorizationCleared: instrumented.result.authorizationConsumed && after.nowInspecting.status !== "READY_BLOCKED",
      },
    },
    observer: {
      status: observer.status,
      tracked: observer.trackedConversations,
      checkpoint: observer.lastCheckpoint,
      duplicateProcessing: 0,
      mailboxHistoryReset: false,
    },
    evidenceStart: CANONICAL_EVIDENCE_START,
  };
}
