import { describe, expect, it } from "vitest";
import { classifySalesReply, evaluateOutboundMessageQuality, resolveOutboundSequence } from "@/lib/infinity/autonomous-sales-execution/engines";
import { OCCUPANCYNPV_MESSAGE_VARIANTS } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { authorizeOutboundSend } from "../authorize";
import { loadProductionOutboundControl, emptyOutboundUsage } from "../control";
import { emptyProviderReadiness } from "../provider";
import {
  evaluateGmailProductionGrantGate,
  evaluateInboundReplyClassificationGate,
  evaluateInboundReplyIdempotencyGate,
  evaluateInboundReplyIngestionGate,
  evaluateNaturalResponsePacingGate,
  evaluateOutboundConversationContinuityGate,
  evaluateOutboundThreadContinuityGate,
  evaluateProductionOptOutSuppressionGate,
  evaluateProductionOutboundClosedLoopGate,
  resolveCanonicalPipelineState,
} from "../closed-loop";
import { resolveGmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { ingestCanaryReplyRecord, nextActionForClassification, observeOccupancynpvCanaryInbound, resetCanaryInboundObservation } from "../canary-inbound";
import {
  createOutboundMessageExperiment,
  evaluateOutboundMessageValueQuality,
  evaluateOutboundReplyLikelihoodGate,
  learnOutboundMessageSignals,
  observeOutboundMessageOutcome,
  PERSONA_VALUE_MAP,
} from "../message-value";
import type { OutboundSendRequest } from "../types";

function request(overrides: Partial<OutboundSendRequest> = {}): OutboundSendRequest {
  return {
    prospect_id: "canary:founder-controlled:v1",
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    campaign_id: "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation",
    channel: "email",
    now: "2026-09-17T15:00:00.000Z",
    isolated_runtime: true,
    suppressed: false,
    unsubscribed: false,
    communication_eligible: true,
    contact_valid: true,
    timezone: "America/New_York",
    timezone_basis: "founder_declared",
    prior_touches: 1,
    follow_up: true,
    in_thread_reply: true,
    provider: { ...emptyProviderReadiness("gmail"), bound: true, credentials_present: true, healthy: true, sending_identity_verified: true, reply_path_configured: true, bounce_path_configured: true, unsubscribe_path_configured: true, reasons: [] },
    idempotency_key: "reply-1",
    ...overrides,
  };
}

describe("OccupancyNPV closed-loop inbound", () => {
  it("classifies the real interested information request", () => {
    resetCanaryInboundObservation();
    const text = "Thanks — this sounds interesting. Can you tell me a little more about how OccupancyNPV works and who it’s best for?";
    expect(classifySalesReply(text)).toBe("POSITIVE_INTEREST");
    expect(nextActionForClassification("POSITIVE_INTEREST").action).toBe("RESPOND_TO_INTERESTED_REPLY");
    const ingested = ingestCanaryReplyRecord({
      provider_message_id: "msg_safe_1",
      thread_id: "thread_safe_1",
      text,
      received_at: "2026-09-17T14:00:00.000Z",
      now: "2026-09-17T14:05:00.000Z",
      worker_running: true,
      worker_last_run: "2026-09-17T14:05:00.000Z",
    });
    expect(evaluateInboundReplyIngestionGate({
      replyFound: true,
      ingested: ingested.ingested,
      conversationEvent: ingested.conversation_event,
      canonicalMessage: ingested.canonical_message,
    }).result).toBe("PASS");
    expect(evaluateInboundReplyClassificationGate({ executed: true, classification: ingested.classification }).result).toBe("PASS");
    expect(evaluateOutboundConversationContinuityGate({
      threadMatch: ingested.thread_match,
      prospectMatch: ingested.prospect_match,
      campaignMatch: ingested.campaign_match,
      ventureMatch: ingested.venture_match,
    }).result).toBe("PASS");
    const again = ingestCanaryReplyRecord({
      provider_message_id: "msg_safe_1",
      thread_id: "thread_safe_1",
      text,
      received_at: "2026-09-17T14:00:00.000Z",
      now: "2026-09-17T14:06:00.000Z",
    });
    expect(again.duplicate).toBe(true);
    expect(evaluateInboundReplyIdempotencyGate({
      firstKey: ingested.idempotency_key ?? "",
      secondKey: again.idempotency_key ?? "",
      secondCreated: !again.duplicate,
    }).result).toBe("PASS");
  });

  it("does not treat pacing without a worker as waiting", () => {
    expect(evaluateNaturalResponsePacingGate({
      inboundAt: "2026-09-17T12:00:00.000Z",
      eligibleAt: "2026-09-17T12:10:00.000Z",
      workerLastRun: null,
      workerEnabled: false,
      now: "2026-09-17T13:00:00.000Z",
    }).result).toBe("FAIL");
    expect(resolveCanonicalPipelineState({
      replyFound: true,
      ingested: true,
      matched: true,
      classified: true,
      nextAction: true,
      blocked: false,
      eligibleAt: "2026-09-17T12:10:00.000Z",
      workerRanAfterEligible: false,
      queued: false,
      sendAttempted: false,
      sendAccepted: false,
      delivered: false,
      now: "2026-09-17T13:00:00.000Z",
    })).toBe("PACING_EXPIRED_WORKER_NOT_RUN");
  });

  it("requires a production runtime grant to include gmail.readonly", () => {
    expect(evaluateGmailProductionGrantGate({
      productionContext: false,
      tokenExchange: true,
      sendScope: true,
      readonlyScope: true,
      userinfoScope: true,
      identity: true,
    }).result).toBe("NOT_PROVEN");
    expect(evaluateGmailProductionGrantGate({
      productionContext: true,
      tokenExchange: true,
      sendScope: true,
      readonlyScope: false,
      userinfoScope: true,
      identity: true,
    }).result).toBe("FAIL");
    expect(evaluateGmailProductionGrantGate({
      productionContext: true,
      tokenExchange: true,
      sendScope: true,
      readonlyScope: true,
      userinfoScope: true,
      identity: true,
    }).result).toBe("PASS");
  });

  it("keeps closed-loop and STOP gates honest", () => {
    expect(evaluateProductionOutboundClosedLoopGate({
      providerSend: true,
      inboxDelivery: true,
      inboundReply: true,
      detected: false,
      ingested: false,
      matched: false,
      classified: false,
      nextAction: false,
      paced: false,
      workerExecuted: false,
      queued: false,
      providerAcceptedResponse: false,
      sameThread: false,
      responseDelivered: false,
      salesUpdated: false,
      performanceUpdated: false,
      dailyReportProven: false,
      optOutTested: false,
      optOutClassified: false,
      suppressionProven: false,
      futureSendBlocked: false,
      followUpsCancelled: false,
      idempotencyProven: false,
      optOutIdempotencyProven: false,
      restartContinuity: false,
    }).result).toBe("NOT_PROVEN");
    expect(evaluateProductionOptOutSuppressionGate({
      classifiedOptOut: false,
      suppressionPersisted: false,
      followUpBlocked: false,
    }).result).toBe("NOT_PROVEN");
    expect(evaluateOutboundThreadContinuityGate({ originalThreadId: "a", replyThreadId: "a" }).result).toBe("PASS");
  });

  it("allows an in-thread interested reply without treating it as a new prospect send", () => {
    const control = loadProductionOutboundControl({
      OUTBOUND_MODE: "canary",
      GLOBAL_OUTBOUND_KILL_SWITCH: "false",
      VENTURE_OUTBOUND_ENABLED: "true",
      OUTBOUND_EMAIL_ENABLED: "true",
    });
    const blocked = authorizeOutboundSend({
      request: request({ in_thread_reply: false, follow_up: false }),
      control,
      usage: { ...emptyOutboundUsage("2026-09-17T15:00:00.000Z"), by_prospect: { "canary:founder-controlled:v1": 1 } },
    });
    expect(blocked.reasons).toContain("PROSPECT_CAP");
    const allowed = authorizeOutboundSend({
      request: request(),
      control,
      usage: { ...emptyOutboundUsage("2026-09-17T15:00:00.000Z"), by_prospect: { "canary:founder-controlled:v1": 1 } },
    });
    expect(allowed.reasons).not.toContain("PROSPECT_CAP");
  });

  it("does not mark ingestion when the live grant lacks gmail.readonly", async () => {
    resetCanaryInboundObservation();
    const prior = {
      GMAIL_OAUTH_CLIENT_ID: process.env.GMAIL_OAUTH_CLIENT_ID,
      GMAIL_OAUTH_CLIENT_SECRET: process.env.GMAIL_OAUTH_CLIENT_SECRET,
      GMAIL_OAUTH_REFRESH_TOKEN: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    };
    process.env.GMAIL_OAUTH_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GMAIL_OAUTH_CLIENT_SECRET = "test-client-secret";
    process.env.GMAIL_OAUTH_REFRESH_TOKEN = "test-refresh-token-not-secret-pattern";
    const sendOnly = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email";
    const fetchImpl = (async (raw: RequestInfo | URL) => {
      const url = String(raw);
      if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
        return new Response(JSON.stringify({ access_token: "access-token-test", scope: sendOnly }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("tokeninfo")) {
        return new Response(JSON.stringify({ scope: sendOnly }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: { message: "insufficient_scope" } }), { status: 403 });
    }) as typeof fetch;
    try {
      const gmailContext = resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
      const observed = await observeOccupancynpvCanaryInbound({ fetchImpl, worker_running: true, gmailContext });
      expect(observed.inbound_connection).toBe("FAIL");
      expect(observed.last_error).toBe("GRANT:GMAIL_READONLY_SCOPE_MISSING");
      expect(observed.reply_found).toBe(false);
      expect(observed.ingested).toBe(false);
      expect(observed.pipeline_state).toBe("NOT_DETECTED");
      expect(observed.pacing_state).toBe("BLOCKED");
    } finally {
      process.env.GMAIL_OAUTH_CLIENT_ID = prior.GMAIL_OAUTH_CLIENT_ID;
      process.env.GMAIL_OAUTH_CLIENT_SECRET = prior.GMAIL_OAUTH_CLIENT_SECRET;
      process.env.GMAIL_OAUTH_REFRESH_TOKEN = prior.GMAIL_OAUTH_REFRESH_TOKEN;
    }
  });
});

describe("pain-first outbound value", () => {
  it("upgrades OccupancyNPV first-touch copy and quality gates", () => {
    const first = OCCUPANCYNPV_MESSAGE_VARIANTS[0]!;
    expect(first.subject).toMatch(/spreadsheet/i);
    expect(first.body.startsWith("Hi")).toBe(true);
    expect(first.body).not.toMatch(/^I’m Infinity|^I'm Infinity/);
    const quality = evaluateOutboundMessageValueQuality({ subject: first.subject, body: first.body, persona: "TENANT_REP" });
    expect(quality.result).toBe("PASS");
    expect(quality.pain_clarity).not.toBe("WEAK");
    expect(quality.cta_friction).toBe("LOW");
    expect(evaluateOutboundReplyLikelihoodGate({ subject: first.subject, body: first.body }).result).not.toBe("WEAK");
    expect(evaluateOutboundMessageQuality({
      message: `${resolveOutboundSequence()[0]!.body}`,
      venture: "OccupancyNPV",
      recipient_context: "tenant representation occupancy",
    }).pass).toBe(true);
    expect(evaluateOutboundMessageValueQuality({
      subject: "We built OccupancyNPV",
      body: "I’m Infinity. We built OccupancyNPV. Book a 30-minute demo.",
    }).result).toBe("FAIL");
  });

  it("tracks one observation without overfitting", () => {
    const experiment = createOutboundMessageExperiment({
      subject: OCCUPANCYNPV_MESSAGE_VARIANTS[0]!.subject,
      body: OCCUPANCYNPV_MESSAGE_VARIANTS[0]!.body,
      persona: "TENANT_REP",
    });
    const observed = observeOutboundMessageOutcome(experiment, "qualified_reply");
    const learned = learnOutboundMessageSignals([observed]);
    expect(learned.overfit).toBe(true);
    expect(PERSONA_VALUE_MAP.BROKER.cta).toMatch(/example/i);
  });
});
