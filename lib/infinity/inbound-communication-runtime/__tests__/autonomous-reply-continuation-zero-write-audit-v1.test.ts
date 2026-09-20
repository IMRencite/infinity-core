import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  persistPreparedAttempt,
  resetCommunicationProviderRuntime,
  restoreCommunicationAttempt,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { buildEmailEnvelope } from "@/lib/infinity/communication-provider/envelope";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { recordMissionActivityEvent } from "@/lib/infinity/mission-activity/store";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
  AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID,
  AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID,
  classifyAutonomousReplyWriteAudit,
  codingAgentMayReadProviderSecrets,
  executeAutonomousReplyContinuationZeroWriteAudit,
  isGmailWriteUrl,
  resetInboundCommunicationRuntime,
} from "..";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";

const MAILBOX = "htunity@gmail.com";
const THREAD = AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID;
const SETUP_ID = AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID;
const INBOUND_ID = "msg_inbound_audit_1";
const REPLY_ID = "msg_reply_audit_1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function encodeBody(text: string): string {
  return Buffer.from(text).toString("base64url");
}

function threadFetch(input: { inbound?: boolean; reply?: boolean; otherThread?: boolean } = {}) {
  return async (raw: RequestInfo | URL, init?: RequestInit) => {
    const url = String(raw);
    if (isGmailWriteUrl(url)) throw new Error("GMAIL_WRITE_BLOCKED");
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return json({ access_token: "access-token-test", scope: "https://www.googleapis.com/auth/gmail.readonly" });
    }
    if (url.includes("oauth2.googleapis.com/tokeninfo") || url.includes("oauth2/v2/userinfo")) {
      return json({ email: "infinitemediaresources@gmail.com", verified_email: true });
    }
    if (url.includes(`/threads/${THREAD}`)) {
      const messages: Array<{
        id: string;
        threadId: string;
        snippet: string;
        payload: {
          mimeType: string;
          headers: Array<{ name: string; value: string }>;
          body: { data: string };
        };
      }> = [
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
            body: { data: encodeBody("This is a controlled Infinity OS autonomous reply verification thread.") },
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
            ],
            body: { data: encodeBody("Can you send me more information?") },
          },
        });
      }
      if (input.reply) {
        messages.push({
          id: REPLY_ID,
          threadId: input.otherThread ? "other_thread" : THREAD,
          snippet: "Absolutely. This was a controlled Infinity OS communication test, and the autonomous reply path is working.",
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: "Infinity <infinitemediaresources@gmail.com>" },
              { name: "To", value: MAILBOX },
              { name: "Subject", value: "Re: Infinity OS Autonomous Reply Verification" },
            ],
            body: {
              data: encodeBody(
                "Absolutely. This was a controlled Infinity OS communication test, and the autonomous reply path is working.",
              ),
            },
          },
        });
      }
      return json({ id: THREAD, messages });
    }
    return json({ error: { message: "unexpected" } }, 404);
  };
}

describe("AUTONOMOUS REPLY CONTINUATION ZERO-WRITE AUDIT V1", () => {
  beforeEach(() => {
    resetInboundCommunicationRuntime();
    resetCommunicationProviderRuntime();
    resetMissionActivityStore();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", MAILBOX);
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-not-secret-pattern");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("confirms a reply from provider thread evidence and blocks resend", () => {
    const result = classifyAutonomousReplyWriteAudit({
      threadReadable: true,
      sameThread: true,
      autonomousReplyFoundOnProvider: true,
      founderInboundFound: true,
      providerAcceptedAttempt: true,
      attemptProviderMessageId: REPLY_ID,
      successfulIdempotencyRecord: true,
      replySendState: "LIVE_WRITE_VERIFIED",
    });
    expect(result.classification).toBe("REPLY_WRITE_CONFIRMED");
    expect(result.capabilityConsistent).toBe("PASS");
    expect(result.duplicateProtection).toBe("PASS");
    expect(result.safeFutureRetry).toBe("NO");
    expect(result.retryReason).toBe("CONFIRMED_REPLY_NEVER_SAFE_TO_RESEND");
  });

  it("classifies no-reply as safe to retry when inbound exists", () => {
    const result = classifyAutonomousReplyWriteAudit({
      threadReadable: true,
      sameThread: true,
      autonomousReplyFoundOnProvider: false,
      founderInboundFound: true,
      providerAcceptedAttempt: false,
      attemptProviderMessageId: null,
      successfulIdempotencyRecord: false,
      replySendState: "ARCHITECTURE_BUILT_WRITE_UNVERIFIED",
    });
    expect(result.classification).toBe("NO_REPLY_WRITE_OCCURRED");
    expect(result.safeFutureRetry).toBe("YES");
    expect(result.duplicateProtection).toBe("NOT_APPLICABLE");
  });

  it("marks capability promotion without provider proof as inconsistent", () => {
    const result = classifyAutonomousReplyWriteAudit({
      threadReadable: true,
      sameThread: true,
      autonomousReplyFoundOnProvider: false,
      founderInboundFound: true,
      providerAcceptedAttempt: false,
      attemptProviderMessageId: null,
      successfulIdempotencyRecord: false,
      replySendState: "LIVE_WRITE_VERIFIED",
    });
    expect(result.classification).toBe("AMBIGUOUS_REPLY_WRITE_STATE");
    expect(result.evidence).toBe("CAPABILITY_STATE_INCONSISTENCY");
    expect(result.capabilityConsistent).toBe("FAIL");
    expect(result.safeFutureRetry).toBe("NO");
  });

  it("treats accepted attempt without provider message as ambiguous", () => {
    const result = classifyAutonomousReplyWriteAudit({
      threadReadable: true,
      sameThread: true,
      autonomousReplyFoundOnProvider: false,
      founderInboundFound: true,
      providerAcceptedAttempt: true,
      attemptProviderMessageId: REPLY_ID,
      successfulIdempotencyRecord: true,
      replySendState: "ARCHITECTURE_BUILT_WRITE_UNVERIFIED",
    });
    expect(result.classification).toBe("AMBIGUOUS_REPLY_WRITE_STATE");
    expect(result.evidence).toBe("ATTEMPT_ACCEPTED_WITHOUT_PROVIDER_MESSAGE");
  });

  it("reads a no-reply provider thread without writing", async () => {
    const writes: string[] = [];
    const fetchImpl = async (raw: RequestInfo | URL, init?: RequestInit) => {
      const url = String(raw);
      if (url.includes("messages/send") || isGmailWriteUrl(url)) writes.push(url);
      return threadFetch({ inbound: true })(raw, init);
    };
    const result = await executeAutonomousReplyContinuationZeroWriteAudit({ fetchImpl });
    expect(result.founderInboundFound).toBe("YES");
    expect(result.autonomousReplyFound).toBe("NO");
    expect(result.externalActions.providerWrites).toBe(0);
    expect(writes).toHaveLength(0);
    expect(result.classification).toBe("NO_REPLY_WRITE_OCCURRED");
    expect(result.safeFutureRetry).toBe("YES");
  });

  it("confirms same-thread provider reply and accepted attempt lineage", async () => {
    const envelope = buildEmailEnvelope({
      organizationId: LIVE_ORG,
      toAddress: MAILBOX,
      subject: "Re: Infinity OS Autonomous Reply Verification",
      body: "Absolutely. This was a controlled Infinity OS communication test, and the autonomous reply path is working.",
      authorizationId: "authz_autonomous_reply_write_verification_v1",
      idempotencyKey: "rply_audit_test_1",
      providerThreadId: THREAD,
    });
    persistPreparedAttempt(envelope);
    restoreCommunicationAttempt({
      ...envelope,
      authorized: true,
      state: "PROVIDER_ACCEPTED",
      providerResult: {
        accepted: true,
        delivered: false,
        deliveryProven: false,
        attemptState: "PROVIDER_ACCEPTED",
        providerMessageId: REPLY_ID,
        providerThreadId: THREAD,
        providerTimestamp: new Date().toISOString(),
        failureCategory: null,
        failureMessage: null,
        cost: { classification: "UNKNOWN", amountUsd: null, treatedAsZero: false },
      },
    });
    const result = await executeAutonomousReplyContinuationZeroWriteAudit({
      fetchImpl: threadFetch({ inbound: true, reply: true }),
    });
    expect(result.autonomousReplyFound).toBe("YES");
    expect(result.sameThread).toBe("PASS");
    expect(result.providerAccepted).toBe("YES");
    expect(result.replyProviderMessageId).toBe(REPLY_ID);
    expect(result.classification).toBe("REPLY_WRITE_CONFIRMED");
    expect(result.safeFutureRetry).toBe("NO");
    expect(result.newUnrelatedVerificationThread).toBe("NO");
    expect(result.externalActions.emails).toBe(0);
  });

  it("reads Mission Runtime history without manufacturing completion", () => {
    recordMissionActivityEvent({
      schema: "MISSION_ACTIVITY_EVENT_V1",
      eventId: "evt_audit_hist_1",
      organizationId: LIVE_ORG,
      ventureId: "verification:autonomous_reply_write_v1",
      candidateId: null,
      experimentId: null,
      missionId: "msn_autonomous_email_reply_write_verification_continuation_v1",
      missionType: AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
      engine: "mission_runtime",
      room: "executive_office",
      stepId: null,
      stepType: "ORCHESTRATE_AUTONOMOUS_REPLY_WRITE",
      eventType: "MISSION_COMPLETED",
      status: "COMPLETED",
      summary: "historical continuation completion",
      technicalDetail: null,
      progress: null,
      startedAt: null,
      completedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: "audit_test",
      traceability: { missionId: "msn_autonomous_email_reply_write_verification_continuation_v1" },
      synthetic: false,
      executionClass: "VENTURE_EXECUTION",
      blocker: null,
      authorizationRequired: null,
      costState: null,
      failureCode: null,
    });
    const view = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(view.latestCompleted?.missionType).toBe(AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION);
    expect(view.counts.activeMissions).toBe(0);
  });

  it("keeps CRE isolation and the secret boundary", async () => {
    const clock = inspectExperimentClock();
    const result = await executeAutonomousReplyContinuationZeroWriteAudit({
      fetchImpl: threadFetch({ inbound: true }),
    });
    expect(result.cre.prospectEmails).toBe(0);
    expect(result.cre.experimentMutations).toBe(0);
    expect(result.cre.cooldownMutations).toBe(0);
    expect(result.cre.suppressionMutations).toBe(0);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clock.evidenceStart);
    expect(codingAgentMayReadProviderSecrets()).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/ya29\.|GOCSPX-|1\/\/|access-token-test|Bearer /);
    expect(result.conversationId).toBe(AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID);
  });
});
