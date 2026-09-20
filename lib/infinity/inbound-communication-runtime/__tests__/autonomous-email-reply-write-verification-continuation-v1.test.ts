import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID,
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_RUNTIME,
  AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID,
  AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID,
  codingAgentMayReadProviderSecrets,
  evidenceContracts,
  executeAutonomousReplyWriteVerification,
  executeAutonomousReplyWriteVerificationContinuationMission,
  inspectInboundCapabilityStates,
  markInboundReadOnlyVerified,
  persistConversation,
  resetInboundCommunicationRuntime,
  routineEmailRequiresFounderApproval,
} from "..";
import { writeAutonomousReplyWriteArtifact } from "../autonomous-reply-write-persist";
import { generateAutonomousReplyWriteVerificationBody, autonomousReplyWriteVerificationGroundingPass } from "../verification-reply";
import { classifyReplyIntent, classifyInboundEventClass } from "../intent-classifier";
import { inferConversationStage } from "../conversation-stage";
import { evaluateAutonomousCommunicationPolicy } from "../autonomous-policy";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";

const MAILBOX = "htunity@gmail.com";
const THREAD = AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID;
const CONVERSATION = AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID;
const SETUP_ID = "1a0636e462c3093e";
const INBOUND_ID = "msg_inbound_continuation_1";
const REPLY_ID = "msg_reply_continuation_1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function encodeBody(text: string): string {
  return Buffer.from(text).toString("base64url");
}

function seedLockedThread(): void {
  persistConversation({
    id: CONVERSATION,
    organizationId: LIVE_ORG,
    ventureId: "verification:autonomous_reply_write_v1",
    experimentId: null,
    cohortId: null,
    prospectId: null,
    customerId: null,
    channel: "email",
    provider: "gmail.com_v1",
    providerThreadId: THREAD,
    subject: "Infinity OS Autonomous Reply Verification",
    conversationType: "AUTONOMOUS_REPLY_WRITE_VERIFICATION",
    ownershipState: "INFINITY_MANAGED",
    conversationState: "AWAITING_INBOUND",
    strategyProfile: "CONSULTATIVE_DISCOVERY",
    currentConversationStage: "OPEN_CONTEXT+CURRENT_PROCESS",
    lastInboundAt: null,
    lastOutboundAt: new Date().toISOString(),
    sourceAttemptId: null,
    sourceProviderMessageId: SETUP_ID,
  });
  writeAutonomousReplyWriteArtifact({
    conversationId: CONVERSATION,
    providerThreadId: THREAD,
    setupProviderMessageId: SETUP_ID,
    setupEmailsSent: 1,
    inboundProviderMessageId: null,
    replyProviderMessageId: null,
    replyProviderThreadId: null,
    replyIdempotencyKey: null,
    attemptId: null,
    autonomousRepliesAttempted: 0,
    replySendState: "ARCHITECTURE_BUILT_WRITE_UNVERIFIED",
    verifiedAt: null,
  });
}

function createContinuationFetch(input: { inbound?: boolean; writes?: string[]; failReply?: boolean } = {}) {
  return async (raw: RequestInfo | URL, init?: RequestInit) => {
    const url = String(raw);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("gmail.googleapis.com/gmail/v1/users/me/messages/send")) {
      input.writes?.push(`${method} ${url}`);
      if (input.failReply) return json({ error: { message: "provider rejected" } }, 500);
      const body = JSON.parse(String(init?.body ?? "{}")) as { threadId?: string };
      return json({ id: REPLY_ID, threadId: body.threadId ?? THREAD });
    }
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return json({
        access_token: "access-token-test",
        scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
      });
    }
    if (url.includes("oauth2.googleapis.com/tokeninfo") || url.includes("oauth2/v2/userinfo")) {
      return json({ email: "infinitemediaresources@gmail.com", verified_email: true, scope: "https://www.googleapis.com/auth/gmail.send" });
    }
    if (url.includes(`/threads/${THREAD}`)) {
      const messages = [
        {
          id: SETUP_ID,
          threadId: THREAD,
          snippet: "controlled setup",
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: "Infinity <infinitemediaresources@gmail.com>" },
              { name: "To", value: MAILBOX },
              { name: "Subject", value: "Infinity OS Autonomous Reply Verification" },
            ],
            body: { data: encodeBody("controlled setup") },
          },
        },
      ];
      if (input.inbound) {
        messages.push({
          id: INBOUND_ID,
          threadId: THREAD,
          snippet: "Can you send me more information?",
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: MAILBOX },
              { name: "To", value: "infinitemediaresources@gmail.com" },
              { name: "Subject", value: "Re: Infinity OS Autonomous Reply Verification" },
              { name: "In-Reply-To", value: SETUP_ID },
            ],
            body: { data: encodeBody("Can you send me more information?") },
          },
        });
      }
      return json({ id: THREAD, messages });
    }
    return json({ error: { message: "unexpected" } }, 404);
  };
}

describe("AUTONOMOUS EMAIL REPLY WRITE VERIFICATION CONTINUATION V1", () => {
  beforeEach(() => {
    resetInboundCommunicationRuntime();
    resetCommunicationProviderRuntime();
    resetMissionActivityStore();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    markInboundReadOnlyVerified();
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-not-secret-pattern");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", MAILBOX);
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers the continuation Mission Runtime and does not require founder approval", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes[AUTONOMOUS_REPLY_WRITE_CONTINUATION_RUNTIME].usesMissionWrapper).toBe(true);
    expect(registry.contracts[AUTONOMOUS_REPLY_WRITE_CONTINUATION_RUNTIME].missionType).toBe(
      AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
    );
    expect(routineEmailRequiresFounderApproval()).toBe(false);
  });

  it("requires the existing controlled thread and blocks a second setup email", async () => {
    seedLockedThread();
    const writes: string[] = [];
    const result = await executeAutonomousReplyWriteVerification({
      fetchImpl: createContinuationFetch({ inbound: false, writes }),
      allowSetup: false,
      requiredConversationId: CONVERSATION,
      requiredThreadId: THREAD,
    });
    expect(result.conversationId).toBe(CONVERSATION);
    expect(result.providerThreadId).toBe(THREAD);
    expect(result.threadReadable).toBe("PASS");
    expect(result.setupEmailSent).toBe("NO");
    expect(result.inboundPresent).toBe("NO");
    expect(result.nextBlocker).toBe("CONTROLLED_INBOUND_REPLY_NOT_FOUND");
    expect(result.autonomousRepliesAttempted).toBe(0);
    expect(writes).toHaveLength(0);
  });

  it("blocks setup when continuation has no thread binding", async () => {
    const writes: string[] = [];
    const result = await executeAutonomousReplyWriteVerification({
      fetchImpl: createContinuationFetch({ inbound: true, writes }),
      allowSetup: false,
    });
    expect(result.setupEmailSent).toBe("NO");
    expect(result.policyReason).toBe("SECOND_SETUP_EMAIL_BLOCKED");
    expect(writes).toHaveLength(0);
  });

  it("classifies the real inbound, AUTO_EXECUTES once, and stays in the same thread", async () => {
    seedLockedThread();
    const writes: string[] = [];
    const classified = classifyReplyIntent({
      text: "Can you send me more information?",
      sourceMessageId: INBOUND_ID,
    });
    expect(classifyInboundEventClass("Can you send me more information?")).toBe("HUMAN_REPLY");
    expect(classified.intent).toBe("REQUEST_MORE_INFORMATION");
    expect(classified.confidence).toBe("HIGH");
    expect(classified.uncertainty).toBe(false);
    expect(
      evaluateAutonomousCommunicationPolicy({
        classification: classified,
        identityCertain: true,
        trackedThread: true,
      }).outcome,
    ).toBe("AUTO_EXECUTE");
    expect(
      inferConversationStage({
        current: "OPEN_CONTEXT+CURRENT_PROCESS",
        inboundText: "Can you send me more information?",
        intent: "REQUEST_MORE_INFORMATION",
      }),
    ).toBe("RELEVANCE");
    const result = await executeAutonomousReplyWriteVerification({
      fetchImpl: createContinuationFetch({ inbound: true, writes }),
      allowSetup: false,
      requiredConversationId: CONVERSATION,
      requiredThreadId: THREAD,
    });
    expect(result.inboundPresent).toBe("YES");
    expect(result.humanReply).toBe("YES");
    expect(result.classification).toBe("HUMAN_REPLY");
    expect(result.intent).toBe("REQUEST_MORE_INFORMATION");
    expect(result.confidence).toBe("HIGH");
    expect(result.uncertainty).toBe(false);
    expect(result.policyOutcome).toBe("AUTO_EXECUTE");
    expect(result.routineFounderApprovalRequired).toBe(false);
    expect(result.stageBefore).toBe("OPEN_CONTEXT+CURRENT_PROCESS");
    expect(result.stageAfter).toBe("RELEVANCE");
    expect(result.groundedStageAdvancement).toBe("PASS");
    expect(result.providerAccepted).toBe("YES");
    expect(result.delivered).toBe("UNKNOWN");
    expect(result.sameThread).toBe("PASS");
    expect(result.replyProviderThreadId).toBe(THREAD);
    expect(result.autonomousRepliesAttempted).toBe(1);
    expect(result.inboundDuplicated).toBe("NO");
    expect(result.countedAsAcquisition).toBe(false);
    expect(result.countedAsExperimentEvidence).toBe(false);
    expect(result.replySendAfter).toBe("LIVE_WRITE_VERIFIED");
    expect(result.sendCapability).toBe("LIVE_WRITE_VERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.read"]).toBe("READ_ONLY_VERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.thread.read"]).toBe("READ_ONLY_VERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.search"]).toBe("READ_ONLY_VERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.mailbox_watch"]).toBe("READ_ONLY_VERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.reply_ingest"]).toBe("READ_ONLY_VERIFIED");
    expect(writes.filter((row) => row.includes("messages/send"))).toHaveLength(1);
    const again = await executeAutonomousReplyWriteVerification({
      fetchImpl: createContinuationFetch({ inbound: true, writes }),
      allowSetup: false,
      requiredConversationId: CONVERSATION,
      requiredThreadId: THREAD,
    });
    expect(again.autonomousRepliesAttempted).toBe(1);
    expect(again.duplicateProviderReplies).toBe(0);
    expect(writes.filter((row) => row.includes("messages/send"))).toHaveLength(1);
  });

  it("does not retry a failed provider reply and does not transition the capability", async () => {
    seedLockedThread();
    const writes: string[] = [];
    const result = await executeAutonomousReplyWriteVerification({
      fetchImpl: createContinuationFetch({ inbound: true, writes, failReply: true }),
      allowSetup: false,
      requiredConversationId: CONVERSATION,
      requiredThreadId: THREAD,
    });
    expect(result.providerAccepted).toBe("NO");
    expect(result.replySendAfter).toBe("ARCHITECTURE_BUILT_WRITE_UNVERIFIED");
    expect(result.nextBlocker).toBe("AUTONOMOUS_REPLY_WRITE_VERIFICATION_FAILED");
    expect(writes).toHaveLength(1);
    const retry = await executeAutonomousReplyWriteVerification({
      fetchImpl: createContinuationFetch({ inbound: true, writes }),
      allowSetup: false,
      requiredConversationId: CONVERSATION,
      requiredThreadId: THREAD,
    });
    expect(retry.autonomousRepliesAttempted).toBeLessThanOrEqual(1);
    expect(writes.length).toBe(1);
  });

  it("keeps the grounded verification reply free of CRE claims", () => {
    const body = generateAutonomousReplyWriteVerificationBody();
    expect(autonomousReplyWriteVerificationGroundingPass(body)).toBe(true);
    expect(body).toContain("controlled Infinity OS communication test");
    expect(/\$290|lease-scenario|NPV/i.test(body)).toBe(false);
  });

  it("runs Mission Runtime, projects HQ, isolates CRE, and completes with ACTIVE 0", async () => {
    seedLockedThread();
    const clockBefore = inspectExperimentClock();
    const run = await executeAutonomousReplyWriteVerificationContinuationMission({
      fetchImpl: createContinuationFetch({ inbound: true }),
    });
    expect(run.mission).toBe(AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION);
    expect(run.missionId).toBe(AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID);
    expect(run.verification.conversationId).toBe(CONVERSATION);
    expect(run.verification.providerThreadId).toBe(THREAD);
    expect(run.verification.setupEmailSent).toBe("NO");
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.signalIntelligence).toBe("PASS");
    expect(run.hq.growthNexus).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.hq.latestCompleted).toBe("PASS");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(codingAgentMayReadProviderSecrets()).toBe(false);
    expect(JSON.stringify(run)).not.toMatch(/ya29\.|GOCSPX-|1\/\/|access-token-test|Bearer /);
    expect(evidenceContracts().replyIsNotStrongIntent).toBe(true);
    expect(run.verification.evidence.replyIsNotStrongIntent).toBe(true);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectExperimentClock().deadline).toBe(clockBefore.deadline);
    expect(inspectExperimentClock().restarted).toBe(false);
  });
});
