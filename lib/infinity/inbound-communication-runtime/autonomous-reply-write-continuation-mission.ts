import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID,
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_SOURCE,
  AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID,
  AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID,
  AUTONOMOUS_REPLY_WRITE_VENTURE,
} from "./constants";
import { executeAutonomousReplyWriteVerification } from "./autonomous-reply-write-verification";

export const AUTONOMOUS_REPLY_WRITE_CONTINUATION_STEPS = [
  "ORCHESTRATE_AUTONOMOUS_REPLY_WRITE",
  "CONTROLLED_TARGET_GATE",
  "PREPARE_VERIFICATION_CONVERSATION",
  "SETUP_OR_REUSE_THREAD",
  "INGEST_CONTROLLED_INBOUND",
  "CLASSIFY_TRACKED_INBOUND",
  "GROUNDED_REPLY_SEND",
  "CAPABILITY_READBACK",
] as const;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function executeAutonomousReplyWriteVerificationContinuationMission(input: {
  fetchImpl?: typeof fetch;
  now?: Date;
  phaseMs?: number;
} = {}) {
  const phaseMs = input.phaseMs ?? 0;
  const emit = {
    organizationId: LIVE_ORG,
    ventureId: AUTONOMOUS_REPLY_WRITE_VENTURE,
    candidateId: null,
    experimentId: null,
    missionId: AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID,
    missionType: AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
    source: AUTONOMOUS_REPLY_WRITE_CONTINUATION_SOURCE,
    technicalDetail: "simulation:FALSE;creProspects:0;setupEmails:0;maxReplies:1;continuation:TRUE",
    executionClass: "VENTURE_EXECUTION" as const,
  };
  const mid: Array<{ phase: string; rooms: Record<string, string>; active: number }> = [];
  const instrumented = await runInstrumentedMission({
    emit,
    knownSteps: [...AUTONOMOUS_REPLY_WRITE_CONTINUATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_AUTONOMOUS_REPLY_WRITE",
    onSnapshot: (view, phase) => {
      mid.push({
        phase,
        rooms: Object.fromEntries(Object.entries(view.rooms).map(([room, slice]) => [room, slice.status])),
        active: view.counts.activeMissions,
      });
    },
    run: async (handle) => {
      const verification = await handle.step({
        stepType: "CONTROLLED_TARGET_GATE",
        engine: "market_validation",
        summary: "Confirming the founder-controlled verification mailbox and rejecting CRE prospects.",
        run: async () => {
          const result = await executeAutonomousReplyWriteVerification({
            fetchImpl: input.fetchImpl,
            now: input.now,
            allowSetup: false,
            requiredConversationId: AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID,
            requiredThreadId: AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID,
          });
          if (phaseMs > 0) await wait(phaseMs);
          return result;
        },
      });
      await handle.step({
        stepType: "PREPARE_VERIFICATION_CONVERSATION",
        engine: "performance_intelligence",
        summary: "Reusing the existing controlled verification conversation without creating another thread.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return { conversationId: verification.conversationId, thread: verification.providerThreadId };
        },
      });
      await handle.step({
        stepType: "SETUP_OR_REUSE_THREAD",
        engine: "quality_control",
        summary: "Blocking a second setup email and binding to the locked provider thread.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return { reused: verification.existingThreadReused, setup: verification.setupEmailSent };
        },
      });
      await handle.step({
        stepType: "INGEST_CONTROLLED_INBOUND",
        engine: "performance_intelligence",
        summary: "Reading only the locked controlled verification thread for a real inbound reply.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return { inbound: verification.inboundPresent, waiting: verification.waiting };
        },
      });
      if (verification.inboundPresent === "YES") {
        await handle.step({
          stepType: "CLASSIFY_TRACKED_INBOUND",
          engine: "organic_growth",
          summary: "Classifying the controlled inbound reply and evaluating AutonomousCommunicationPolicy.",
          run: async () => {
            if (phaseMs > 0) await wait(phaseMs);
            return { intent: verification.intent, outcome: verification.policyOutcome };
          },
        });
        await handle.step({
          stepType: "GROUNDED_REPLY_SEND",
          engine: "organic_growth",
          summary: "Sending at most one grounded in-thread autonomous reply through the communication provider.",
          run: async () => {
            if (phaseMs > 0) await wait(phaseMs);
            return { accepted: verification.providerAccepted, sameThread: verification.sameThread };
          },
        });
      }
      await handle.step({
        stepType: "CAPABILITY_READBACK",
        engine: "market_validation",
        summary: "Reading communication.email.reply.send without changing CRE evidence.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return { after: verification.replySendAfter, send: verification.sendCapability };
        },
      });
      return verification;
    },
  });
  const roomsAt = (phase: string) => mid.find((item) => item.phase === phase);
  const target = roomsAt("CONTROLLED_TARGET_GATE:STARTED");
  const ingest = roomsAt("INGEST_CONTROLLED_INBOUND:STARTED");
  const classify = roomsAt("CLASSIFY_TRACKED_INBOUND:STARTED");
  const send = roomsAt("GROUNDED_REPLY_SEND:STARTED");
  const readback = roomsAt("CAPABILITY_READBACK:STARTED");
  const depotActive = mid.some((item) => item.rooms.launch_operations === "ACTIVE_WORK");
  const classified = instrumented.result.inboundPresent === "YES";
  return {
    mission: AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
    missionId: AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID,
    verification: instrumented.result,
    hq: {
      command: target?.rooms.executive_office === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      validationStation:
        target?.rooms.quality_control === "ACTIVE_WORK" || readback?.rooms.quality_control === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const),
      signalIntelligence: ingest?.rooms.intelligence_center === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      growthNexus: classified
        ? classify?.rooms.growth_department === "ACTIVE_WORK" || send?.rooms.growth_department === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const)
        : mid.every((item) => item.rooms.growth_department !== "ACTIVE_WORK")
          ? ("PASS" as const)
          : ("FAIL" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      completion: instrumented.view.counts.activeMissions === 0 ? ("PASS" as const) : ("FAIL" as const),
      latestCompleted:
        instrumented.view.latestCompleted?.missionType === AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION
          ? ("PASS" as const)
          : ("FAIL" as const),
    },
    view: instrumented.view,
  };
}
