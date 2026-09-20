import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  GMAIL_INBOUND_READ_MISSION,
  GMAIL_INBOUND_READ_MISSION_ID,
  GMAIL_INBOUND_READ_SOURCE,
  LOCKED_EXPERIMENT,
  LOCKED_ORG,
  LOCKED_VENTURE,
} from "./constants";
import { executeGmailInboundReadVerification } from "./inbound-read-verification";

export const GMAIL_INBOUND_READ_VERIFICATION_MISSION = GMAIL_INBOUND_READ_MISSION;
export const GMAIL_INBOUND_READ_VERIFICATION_MISSION_ID = GMAIL_INBOUND_READ_MISSION_ID;

export const GMAIL_INBOUND_READ_STEPS = [
  "ORCHESTRATE_GMAIL_INBOUND_READ",
  "OAUTH_REFRESH_AND_IDENTITY",
  "SCOPE_GRANT_INSPECTION",
  "PRESERVE_SEND_CAPABILITY",
  "TRACKED_THREAD_READ",
  "NARROW_SEARCH",
  "HISTORY_CHECKPOINT",
  "REPLY_INGEST_DRY",
  "EVIDENCE_CONTRACT_AUDIT",
] as const;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function executeGmailInboundReadVerificationMission(input: {
  fetchImpl?: typeof fetch;
  now?: Date;
  phaseMs?: number;
} = {}) {
  const phaseMs = input.phaseMs ?? 0;
  const emit = {
    organizationId: LOCKED_ORG,
    ventureId: LOCKED_VENTURE,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_EXPERIMENT,
    missionId: GMAIL_INBOUND_READ_MISSION_ID,
    missionType: GMAIL_INBOUND_READ_MISSION,
    source: GMAIL_INBOUND_READ_SOURCE,
    technicalDetail: "simulation:FALSE;providerWrites:0;liveReply:FALSE",
    executionClass: "VENTURE_EXECUTION" as const,
  };
  const mid: Array<{ phase: string; rooms: Record<string, string>; active: number }> = [];
  const instrumented = await runInstrumentedMission({
    emit,
    knownSteps: [...GMAIL_INBOUND_READ_STEPS],
    orchestrationStepType: "ORCHESTRATE_GMAIL_INBOUND_READ",
    onSnapshot: (view, phase) => {
      mid.push({
        phase,
        rooms: Object.fromEntries(Object.entries(view.rooms).map(([room, slice]) => [room, slice.status])),
        active: view.counts.activeMissions,
      });
    },
    run: async (handle) => {
      const verification = await handle.step({
        stepType: "OAUTH_REFRESH_AND_IDENTITY",
        engine: "market_validation",
        summary: "Refreshing the Gmail grant and confirming authenticated sender identity, then reading tracked threads.",
        run: async () => {
          const result = await executeGmailInboundReadVerification({
            fetchImpl: input.fetchImpl,
            now: input.now,
          });
          if (phaseMs > 0) await wait(phaseMs);
          return result;
        },
      });
      await handle.step({
        stepType: "SCOPE_GRANT_INSPECTION",
        engine: "market_validation",
        summary: "Inspecting the actual OAuth token grant for userinfo.email, gmail.send, and gmail.readonly.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return "gmailReadonly" in verification ? verification.gmailReadonly : "FAIL";
        },
      });
      await handle.step({
        stepType: "PRESERVE_SEND_CAPABILITY",
        engine: "market_validation",
        summary: "Reaffirming communication.email.send remains LIVE_WRITE_VERIFIED. No write verification email.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return "sendAfter" in verification ? verification.sendAfter : "UNVERIFIED";
        },
      });
      await handle.step({
        stepType: "TRACKED_THREAD_READ",
        engine: "performance_intelligence",
        summary: "Reading only the Caleb and Michael tracked Gmail threads.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return !verification.stopped && verification.caleb && verification.michael
            ? { caleb: verification.caleb.threadReadable, michael: verification.michael.threadReadable }
            : { caleb: "FAIL", michael: "FAIL" };
        },
      });
      await handle.step({
        stepType: "NARROW_SEARCH",
        engine: "performance_intelligence",
        summary: "Running a narrow search bound to the two tracked threads.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return "search" in verification ? verification.search : { pass: "FAIL", unrelatedPersisted: 0 };
        },
      });
      await handle.step({
        stepType: "HISTORY_CHECKPOINT",
        engine: "performance_intelligence",
        summary: "Establishing a Gmail history checkpoint without ingesting unrelated mailbox history.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return "watch" in verification ? verification.watch : { mode: "GMAIL_HISTORY", checkpoint: "FAIL" };
        },
      });
      await handle.step({
        stepType: "REPLY_INGEST_DRY",
        engine: "market_validation",
        summary: "Dry-evaluating any real tracked inbound messages. Live reply send remains disabled.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return "policy" in verification ? verification.policy : { evaluated: 0 };
        },
      });
      if (!verification.stopped && verification.classification && verification.classification.discovered > 0) {
        await handle.step({
          stepType: "CLASSIFY_TRACKED_INBOUND",
          engine: "organic_growth",
          summary: "Classifying real tracked inbound messages and applying experiment evidence contracts.",
          run: async () => {
            if (phaseMs > 0) await wait(phaseMs);
            return verification.classification;
          },
        });
      }
      await handle.step({
        stepType: "EVIDENCE_CONTRACT_AUDIT",
        engine: "market_validation",
        summary: "Mailbox inspection does not create market evidence.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return "evidence" in verification ? verification.evidence : {};
        },
      });
      return verification;
    },
  });
  const roomsAt = (phase: string) => mid.find((item) => item.phase === phase);
  const identity = roomsAt("OAUTH_REFRESH_AND_IDENTITY:STARTED");
  const threads = roomsAt("TRACKED_THREAD_READ:STARTED");
  const history = roomsAt("HISTORY_CHECKPOINT:STARTED");
  const evidence = roomsAt("EVIDENCE_CONTRACT_AUDIT:STARTED");
  const classify = roomsAt("CLASSIFY_TRACKED_INBOUND:STARTED");
  const depotActive = mid.some((item) => item.rooms.launch_operations === "ACTIVE_WORK");
  const classified =
    instrumented.result && !instrumented.result.stopped && instrumented.result.classification
      ? instrumented.result.classification.discovered > 0
      : false;
  return {
    mission: GMAIL_INBOUND_READ_MISSION,
    missionId: GMAIL_INBOUND_READ_MISSION_ID,
    verification: instrumented.result,
    hq: {
      command: identity?.rooms.executive_office === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      validationStation:
        identity?.rooms.quality_control === "ACTIVE_WORK" && evidence?.rooms.quality_control === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const),
      signalIntelligence:
        history?.rooms.intelligence_center === "ACTIVE_WORK" || threads?.rooms.intelligence_center === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const),
      growthNexus: classified
        ? classify?.rooms.growth_department === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const)
        : mid.every((item) => item.rooms.growth_department !== "ACTIVE_WORK")
          ? ("PASS" as const)
          : ("FAIL" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      completion: instrumented.view.counts.activeMissions === 0 ? ("PASS" as const) : ("FAIL" as const),
      latestCompleted:
        instrumented.view.latestCompleted?.missionType === GMAIL_INBOUND_READ_MISSION ? ("PASS" as const) : ("FAIL" as const),
    },
    view: instrumented.view,
  };
}
