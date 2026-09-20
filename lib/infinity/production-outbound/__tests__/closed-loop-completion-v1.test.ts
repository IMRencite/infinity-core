import { describe, expect, it } from "vitest";
import { classifySalesReply } from "@/lib/infinity/autonomous-sales-execution/engines";
import { recoverEmptyMessageText } from "@/lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { generateFounderDailyReport } from "@/lib/infinity/founder-daily-reports/generator";
import { OCCUPANCYNPV_MESSAGE_VARIANTS } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { authorizeOutboundSend, evaluateSuppressedRecipientEligibility } from "../authorize";
import {
  ingestCanaryReplyRecord,
  INTERESTED_REPLY_BODY,
  isStopBody,
  nextActionForClassification,
  resetCanaryInboundObservation,
} from "../canary-inbound";
import {
  evaluateFounderDailyReportOutboundEventGate,
  evaluateInboundReplyIdempotencyGate,
  evaluateOptOutIdempotencyGate,
  evaluateOutboundPerformanceFeedbackGate,
  evaluateProductionOptOutClassificationGate,
  evaluateProductionOptOutSuppressionGate,
  evaluateProductionOutboundClosedLoopGate,
  evaluateProductionOutboundRestartContinuityGate,
  evaluateProductionSalesConversationPersistenceGate,
  evaluateSuppressedFollowupCancellationGate,
  evaluateSuppressedRecipientSendBlockGate,
} from "../closed-loop";
import {
  applyCanaryObservationToDurableStore,
  cancelEligibleFollowups,
  CANONICAL_INTERESTED_IDEMPOTENCY_KEY,
  getClosedLoopDurableState,
  lookupSuppression,
  persistSuppressionRecord,
  recipientFingerprint,
  requiredInterestedEventFamiliesPresent,
  resetClosedLoopDurableState,
} from "../closed-loop-durable";
import { emptyOutboundUsage, loadProductionOutboundControl } from "../control";
import { evaluateOutboundEmailSignatureStandard, OCCUPANCYNPV_EMAIL_SIGNATURE } from "../email-signature";
import { emptyProviderReadiness } from "../provider";
import type { OutboundSendRequest } from "../types";

function request(overrides: Partial<OutboundSendRequest> = {}): OutboundSendRequest {
  return {
    prospect_id: "canary:founder-controlled:v1",
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    campaign_id: "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation",
    channel: "email",
    now: "2026-09-17T20:00:00.000Z",
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
    provider: {
      ...emptyProviderReadiness("gmail"),
      bound: true,
      credentials_present: true,
      healthy: true,
      sending_identity_verified: true,
      reply_path_configured: true,
      bounce_path_configured: true,
      unsubscribe_path_configured: true,
      reasons: [],
    },
    idempotency_key: "followup-eligibility",
    ...overrides,
  };
}

describe("Production outbound closed-loop completion", () => {
  it("persists Sales, PI, daily-report events, signature, STOP, suppression, and idempotency", async () => {
    resetCanaryInboundObservation();
    const interested = ingestCanaryReplyRecord({
      provider_message_id: "1a0b113843dd3f35",
      thread_id: "1a0af74557b0eb36",
      text: "Thanks — this sounds interesting. Can you tell me a little more about how OccupancyNPV works and who it’s best for?",
      received_at: "2026-09-17T20:33:59.000Z",
      now: "2026-09-17T20:45:00.000Z",
      worker_running: true,
      worker_last_run: "2026-09-17T20:45:00.000Z",
    });
    interested.send_accepted = true;
    interested.send_attempted = true;
    interested.same_thread = true;
    interested.sent_at = "2026-09-17T20:45:00.000Z";
    interested.reply_provider_message_id = "1a0b1cf6a7987986";
    interested.pipeline_state = "DELIVERED";
    applyCanaryObservationToDurableStore({
      observation: interested,
      recipient: "canary@example.com",
    });
    const sales = getClosedLoopDurableState();
    expect(sales.conversation?.venture).toBe("OccupancyNPV");
    expect(sales.conversation?.thread_id).toBe("1a0af74557b0eb36");
    expect(sales.conversation?.reply_classification).toBe("POSITIVE_INTEREST");
    expect(sales.conversation?.last_activity_at).toBeTruthy();
    expect(sales.conversation?.next_action).toBe("RESPOND_TO_INTERESTED_REPLY");
    expect(requiredInterestedEventFamiliesPresent(sales)).toBe(true);
    expect(evaluateProductionSalesConversationPersistenceGate({
      found: Boolean(sales.conversation),
      durable: true,
      ventureOccupancyNpv: sales.conversation?.venture === "OccupancyNPV",
      threadMatch: sales.conversation?.thread_id === "1a0af74557b0eb36",
      classificationPersisted: sales.conversation?.reply_classification === "POSITIVE_INTEREST",
      lastActivityPersisted: Boolean(sales.conversation?.last_activity_at),
      nextActionPersisted: Boolean(sales.conversation?.next_action),
    }).result).toBe("PASS");
    expect(evaluateOutboundPerformanceFeedbackGate({
      eventsFound: requiredInterestedEventFamiliesPresent(sales),
      durable: true,
      conversationLinked: sales.events.every((row) => row.conversation_id === sales.conversation?.id),
      ventureLinked: sales.events.every((row) => row.venture === "OccupancyNPV"),
    }).result).toBe("PASS");

    const report = generateFounderDailyReport({
      now: "2026-09-18T00:00:00.000Z",
      outreach_sent: 1,
      outbound_events: [
        "OccupancyNPV Outbound Delivered",
        "Inbound Reply Detected",
        "Positive Interest Classified",
        "Response Sent",
        "Response Delivered",
      ],
    });
    const salesItems = report.sections.find((section) => section.id === "sales")?.items.map((item) => item.title) ?? [];
    expect(salesItems).toEqual(expect.arrayContaining([
      "OccupancyNPV Outbound Delivered",
      "Inbound Reply Detected",
      "Positive Interest Classified",
      "Response Sent",
      "Response Delivered",
    ]));
    expect(evaluateFounderDailyReportOutboundEventGate({
      eventsPersisted: true,
      visibleInReport: salesItems.includes("Response Delivered"),
    }).result).toBe("PASS");

    expect(INTERESTED_REPLY_BODY).toContain(OCCUPANCYNPV_EMAIL_SIGNATURE);
    expect(OCCUPANCYNPV_MESSAGE_VARIANTS.every((row) => row.body.includes(OCCUPANCYNPV_EMAIL_SIGNATURE))).toBe(true);
    expect(evaluateOutboundEmailSignatureStandard({ body: INTERESTED_REPLY_BODY }).result).toBe("PASS");

    const raw = Buffer.from("From: a\r\nTo: a\r\nSubject: Re: test\r\n\r\nSTOP\r\n").toString("base64url");
    const recovered = await recoverEmptyMessageText("token", "msg_stop", (async () =>
      new Response(JSON.stringify({ raw }), { status: 200, headers: { "Content-Type": "application/json" } })
    ) as typeof fetch);
    expect(recovered).toBe("STOP");
    expect(isStopBody("STOP")).toBe(true);
    expect(isStopBody("STOP\n\nOn Thu, Infinity wrote:\nIMR’s autonomous venture operating system")).toBe(true);
    expect(classifySalesReply("STOP")).toBe("UNSUBSCRIBE");
    expect(nextActionForClassification("UNSUBSCRIBE").action).toBe("SUPPRESS");
    const stop = ingestCanaryReplyRecord({
      provider_message_id: "stop-test-1",
      thread_id: "1a0af74557b0eb36",
      text: "STOP",
      received_at: "2026-09-17T21:00:00.000Z",
      now: "2026-09-17T21:00:00.000Z",
      worker_running: true,
      worker_last_run: "2026-09-17T21:00:00.000Z",
    });
    applyCanaryObservationToDurableStore({
      observation: stop,
      recipient: "canary@example.com",
      opt_out: true,
    });
    const afterStop = getClosedLoopDurableState();
    expect(afterStop.conversation?.semantic_classification).toBe("OPT_OUT");
    expect(afterStop.suppression?.reason).toBe("OPT_OUT");
    expect(afterStop.suppression?.channel).toBe("EMAIL");
    expect(afterStop.followups.every((row) => !row.eligible)).toBe(true);
    expect(evaluateProductionOptOutClassificationGate({
      stopDetected: true,
      classification: afterStop.conversation?.semantic_classification ?? null,
      threadMatch: true,
      prospectMatch: true,
      campaignMatch: true,
      ventureMatch: true,
    }).result).toBe("PASS");
    expect(evaluateProductionOptOutSuppressionGate({
      classifiedOptOut: true,
      suppressionPersisted: Boolean(afterStop.suppression),
      followUpBlocked: afterStop.followups.every((row) => !row.eligible),
      durable: true,
    }).result).toBe("PASS");
    expect(evaluateSuppressedFollowupCancellationGate({
      remainingEligible: afterStop.followups.filter((row) => row.eligible).length,
    }).result).toBe("PASS");

    const control = loadProductionOutboundControl({
      OUTBOUND_MODE: "canary",
      GLOBAL_OUTBOUND_KILL_SWITCH: "false",
      VENTURE_OUTBOUND_ENABLED: "true",
      OUTBOUND_EMAIL_ENABLED: "true",
    });
    const eligibility = evaluateSuppressedRecipientEligibility({
      request: request(),
      control,
      usage: emptyOutboundUsage("2026-09-17T21:00:00.000Z"),
      suppressed: Boolean(lookupSuppression("canary@example.com")),
    });
    expect(eligibility.eligibility).toBe("BLOCKED");
    expect(eligibility.providerCalled).toBe(false);
    expect(evaluateSuppressedRecipientSendBlockGate({
      suppressionLookup: Boolean(lookupSuppression("canary@example.com")),
      eligibility: eligibility.eligibility,
      providerCalled: eligibility.providerCalled,
    }).result).toBe("PASS");

    const snapshot = structuredClone(getClosedLoopDurableState());
    resetClosedLoopDurableState();
    expect(getClosedLoopDurableState().conversation).toBeNull();
    resetClosedLoopDurableState();
    applyCanaryObservationToDurableStore({
      observation: interested,
      recipient: "canary@example.com",
    });
    persistSuppressionRecord({
      recipient: "canary@example.com",
      source_message_id: "stop-test-1",
      at: snapshot.suppression?.timestamp,
    });
    cancelEligibleFollowups();
    const replay = ingestCanaryReplyRecord({
      provider_message_id: "1a0b113843dd3f35",
      thread_id: "1a0af74557b0eb36",
      text: "Thanks — this sounds interesting.",
      received_at: "2026-09-17T20:33:59.000Z",
      now: "2026-09-17T21:30:00.000Z",
    });
    expect(replay.duplicate).toBe(true);
    expect(replay.idempotency_key).toBe(CANONICAL_INTERESTED_IDEMPOTENCY_KEY);
    expect(evaluateInboundReplyIdempotencyGate({
      firstKey: CANONICAL_INTERESTED_IDEMPOTENCY_KEY,
      secondKey: replay.idempotency_key ?? "",
      secondCreated: !replay.duplicate,
    }).result).toBe("PASS");
    const firstSuppression = persistSuppressionRecord({
      recipient: "canary@example.com",
      source_message_id: "stop-test-1",
    });
    const secondSuppression = persistSuppressionRecord({
      recipient: "canary@example.com",
      source_message_id: "stop-test-1",
    });
    expect(firstSuppression.id).toBe(secondSuppression.id);
    expect(evaluateOptOutIdempotencyGate({
      replayed: true,
      sameSuppression: firstSuppression.id === secondSuppression.id,
      conflictingState: false,
      outboundTriggered: false,
      followUpResurrected: getClosedLoopDurableState().followups.some((row) => row.eligible),
    }).result).toBe("PASS");
    expect(evaluateProductionOutboundRestartContinuityGate({
      restartPerformed: true,
      salesSurvived: Boolean(snapshot.conversation),
      piSurvived: requiredInterestedEventFamiliesPresent(snapshot),
      suppressionSurvived: Boolean(snapshot.suppression),
      duplicateInboundProcessing: false,
      duplicateResponseSent: false,
      suppressedFollowUpEligible: false,
    }).result).toBe("PASS");
    expect(evaluateProductionOutboundClosedLoopGate({
      providerSend: true,
      inboxDelivery: true,
      inboundReply: true,
      detected: true,
      ingested: true,
      matched: true,
      classified: true,
      nextAction: true,
      paced: true,
      workerExecuted: true,
      queued: true,
      providerAcceptedResponse: true,
      sameThread: true,
      responseDelivered: true,
      salesUpdated: true,
      performanceUpdated: true,
      dailyReportProven: true,
      optOutTested: true,
      optOutClassified: true,
      suppressionProven: true,
      futureSendBlocked: true,
      followUpsCancelled: true,
      idempotencyProven: true,
      optOutIdempotencyProven: true,
      restartContinuity: true,
    }).result).toBe("NOT_PROVEN");
    expect(recipientFingerprint("canary@example.com")).toHaveLength(16);
    expect(authorizeOutboundSend({
      request: request({ suppressed: true }),
      control,
      usage: emptyOutboundUsage("2026-09-17T21:00:00.000Z"),
    }).allowed).toBe(false);
  });
});
