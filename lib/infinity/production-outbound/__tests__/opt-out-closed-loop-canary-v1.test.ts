import { describe, expect, it } from "vitest";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import {
  CONSULTATIVE_SALES_COMPOSER_VERSION,
  CONSULTATIVE_SALES_LIVE_GATES,
  evaluateConsultativeSalesLanguageGate,
  evaluateLiveConsultativeSalesComposerParityGate,
  evaluateSalesOverExplanationGate,
  evaluateSalesQuestionQualityGate,
} from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateNaturalSalesConversationGate } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { evaluateConversationStateOwnershipGate, evaluateSalesAdvancementQualityGate } from "@/lib/infinity/always-closing-sales/doctrine";
import { evaluateVentureOfferTruthGate, OCCUPANCYNPV_VERIFIED_OFFER_PROFILE } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";
import { ingestOptOutConsentObservation } from "../performance";
import {
  applyCanaryObservationToDurableStore,
  cancelEligibleFollowups,
  lookupSuppression,
  persistSuppressionRecord,
  resetClosedLoopDurableState,
} from "../closed-loop-durable";
import {
  ingestCanaryReplyRecord,
  nextActionForClassification,
  resetCanaryInboundObservation,
} from "../canary-inbound";
import { evaluateProductionOutboundClosedLoopGate } from "../closed-loop";
import {
  evaluateCanonicalOutboundEligibility,
  evaluateOptOutSendBehaviorGate,
  evaluatePostRestartSuppressionGate,
  evaluateProspectAuthoredOptOutGate,
  evaluateSalesConsentPrecedenceGate,
  evaluateSuppressionAuthorityGate,
} from "../opt-out-closed-loop";
import { cancelUnsentJobsForSuppression, replaceCommunicationSchedulerState, resetCommunicationSchedulerState } from "../communication-runtime";
import { evaluateHQPublicIsolationGate } from "@/lib/infinity/hq-production-deployment/isolation";

const T1 = "Thanks — this sounds interesting. Can you tell me a little more about how OccupancyNPV works and who it’s best for?";
const T2 = "That makes sense. Can you show me a quick example of how a lease-vs-alternative comparison would work?";
const T3 = "That example helps. How would this work if I wanted to compare renewing my current lease against moving to a new location?";
const T4 = "That makes sense. If I wanted to actually try this with my current lease numbers, what would I need to enter?";
const T5 = "what do you mean by verified path to try?";

describe("real opt-out closed-loop canary fixtures", () => {
  it("keeps consultative composer parity and sales fixtures without live send", () => {
    expect(evaluateLiveConsultativeSalesComposerParityGate({
      live_version: CONSULTATIVE_SALES_COMPOSER_VERSION,
      gates_present: [...CONSULTATIVE_SALES_LIVE_GATES],
    }).result).toBe("PASS");
    const rows = [
      { inbound: "Hello — what's OccupancyNPV?", turn: 1 },
      { inbound: T1, turn: 1 },
      { inbound: T2, turn: 2 },
      { inbound: T3, turn: 3 },
      { inbound: T4, turn: 4 },
      { inbound: T5, turn: 5 },
      { inbound: "What does this cost?", turn: 2 },
      { inbound: "Can we start a trial?", turn: 3 },
      { inbound: "Maybe later this quarter.", turn: 2 },
      { inbound: "I want to buy this and start now.", turn: 4 },
      { inbound: "We already have another tool for this.", turn: 2 },
      { inbound: "Still thinking about it — I'll circle back.", turn: 3 },
    ];
    for (const row of rows) {
      const composed = composeOccupancyNpvAlwaysClosingReply({ inbound: row.inbound, turn: row.turn });
      expect(evaluateConsultativeSalesLanguageGate({
        inbound: row.inbound,
        generated: composed.body,
        stage: composed.decision.stage,
        next_action: composed.next_action,
        turn: row.turn,
      }).result, row.inbound).toBe("PASS");
      expect(evaluateNaturalSalesConversationGate({ inbound: row.inbound, generated: composed.body, next_action: composed.next_action }).result).toBe("PASS");
      expect(evaluateSalesOverExplanationGate({ inbound: row.inbound, generated: composed.body }).result).toBe("PASS");
      expect(evaluateSalesQuestionQualityGate({ inbound: row.inbound, generated: composed.body, stage: composed.decision.stage }).result).toBe("PASS");
      expect(evaluateSalesAdvancementQualityGate({ inbound: row.inbound, generated: composed.body, next_action: composed.next_action }).result).toBe("PASS");
    }
    expect(evaluateVentureOfferTruthGate({
      profile: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE,
      claimed: composeOccupancyNpvAlwaysClosingReply({ inbound: T4, turn: 4 }).body,
    }).result).toBe("PASS");
  });

  it("lets prospect-authored STOP outrank high-intent sales", () => {
    resetCanaryInboundObservation();
    resetClosedLoopDurableState();
    resetCommunicationSchedulerState();
    persistSuppressionRecord({
      recipient: "canary@example.com",
      source_message_id: "stop-prospect-1",
      source_role: "PROSPECT",
      thread_id: "1a0af74557b0eb36",
    });
    const observed = ingestCanaryReplyRecord({
      provider_message_id: "stop-prospect-1",
      thread_id: "1a0af74557b0eb36",
      text: "STOP",
      received_at: "2026-09-18T11:00:00.000Z",
      now: "2026-09-18T11:00:00.000Z",
    });
    expect(observed.classification).toMatch(/UNSUBSCRIBE|OPT_OUT/);
    expect(nextActionForClassification(observed.classification ?? "").action).toBe("SUPPRESS");
    applyCanaryObservationToDurableStore({ observation: observed, recipient: "canary@example.com", opt_out: true });
    expect(lookupSuppression("canary@example.com")?.status).toBe("ACTIVE");
    expect(lookupSuppression("canary@example.com")?.source_role).toBe("PROSPECT");
    expect(lookupSuppression("canary@example.com")?.valid).toBe(true);
    expect(evaluateProspectAuthoredOptOutGate({
      body: "STOP",
      role: "PROSPECT",
      direction: "INBOUND",
      thread_id: "1a0af74557b0eb36",
      message_id: "stop-prospect-1",
      from: "canary@example.com",
      to: "infinity@imros.io",
      prospect_identity: "canary@example.com",
      infinity_identity: "infinity@imros.io",
    }).result).toBe("PASS");
    expect(evaluateProspectAuthoredOptOutGate({
      body: "STOP",
      role: "INFINITY",
      direction: "OUTBOUND",
      thread_id: "1a0af74557b0eb36",
      message_id: "1a0b254b39f5c645",
      from: "infinity@imros.io",
      to: "canary@example.com",
      prospect_identity: "canary@example.com",
      infinity_identity: "infinity@imros.io",
    }).result).toBe("FAIL");
    expect(evaluateSalesConsentPrecedenceGate({
      prior_high_intent: true,
      offer_available: true,
      active_conversation: true,
      classified_opt_out: true,
      sales_reply_generated: false,
      offer_advancement_used: false,
      next_action: "SUPPRESS",
    }).result).toBe("PASS");
    expect(evaluateSalesConsentPrecedenceGate({
      prior_high_intent: true,
      offer_available: true,
      active_conversation: true,
      classified_opt_out: true,
      sales_reply_generated: true,
      offer_advancement_used: true,
      next_action: "INVITE_TRIAL",
    }).result).toBe("FAIL");
    expect(evaluateOptOutSendBehaviorGate({
      sales_reply_generated: false,
      reply_job_created: false,
      job_state: null,
      provider_called: false,
      provider_message_id: null,
      stop_echoed: false,
    }).result).toBe("PASS");
    expect(evaluateSuppressionAuthorityGate({
      consulted_before_provider: true,
      provider_called: false,
      suppressed: true,
      paths: ["SALES", "FOLLOW_UP", "REACTIVATION", "SCHEDULED_REPLY", "CAMPAIGN", "COLD"],
    }).result).toBe("PASS");
    for (const path of ["SALES", "FOLLOW_UP", "REACTIVATION", "SCHEDULED_REPLY"] as const) {
      expect(evaluateCanonicalOutboundEligibility({ path, suppressed: true })).toEqual({
        eligible: false,
        reason: "SUPPRESSED",
        path,
      });
    }
  });

  it("cancels pending jobs and keeps future sends blocked after restart", () => {
    resetCommunicationSchedulerState();
    replaceCommunicationSchedulerState({
      version: 1,
      last_tick_at: "2026-09-18T11:00:00.000Z",
      last_success_at: "2026-09-18T11:00:00.000Z",
      last_failure_at: null,
      last_gmail_check_at: "2026-09-18T11:00:00.000Z",
      last_error: null,
      messages_detected: 1,
      detections_24h: [],
      jobs_created: 1,
      jobs_sent: 0,
      scheduler_instance: "communication-tick:test",
      lease: null,
      jobs: [{
        job_id: "job:1a0af74557b0eb36:pending-1",
        conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
        inbound_message_id: "pending-1",
        thread_id: "1a0af74557b0eb36",
        eligible_at: "2026-09-18T11:08:00.000Z",
        state: "WAITING_PACING",
        attempt_count: 0,
        idempotency_key: "communication-job-send:1a0af74557b0eb36:pending-1",
        provider: "GMAIL",
        created_at: "2026-09-18T11:00:00.000Z",
        started_at: null,
        sent_at: null,
        failure_reason: null,
      }],
      last_trigger_source: "VERCEL_CRON",
      cursor_triggered: false,
      last_inbound_message_id: "pending-1",
      last_detected_at: "2026-09-18T11:00:00.000Z",
    });
    expect(cancelUnsentJobsForSuppression("1a0af74557b0eb36").cancelled).toBe(1);
    persistSuppressionRecord({
      recipient: "canary@example.com",
      source_message_id: "stop-prospect-1",
      source_role: "PROSPECT",
    });
    cancelEligibleFollowups();
    expect(evaluatePostRestartSuppressionGate({
      restart_performed: true,
      suppression_active: Boolean(lookupSuppression("canary@example.com")),
      conversation_suppressed: true,
      pending_eligible: false,
      sales_eligible: false,
      follow_up_eligible: false,
      reactivation_eligible: false,
      scheduled_reply_eligible: false,
      provider_would_call: false,
    }).result).toBe("PASS");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "SALES_DOCTRINE",
      incoming_state: "ENGAGED",
      current_state: "OPT_OUT",
      incoming_next_action: "SHOW_EXAMPLE",
      current_next_action: "SUPPRESS",
    }).result).toBe("FAIL");
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
      semantic: {
        inboundBodyParsed: true,
        directionCorrect: true,
        intentCorrect: true,
        priorContextLoaded: true,
        responseNonEmpty: true,
        responseAnswersLatest: true,
        generatedBodyPreserved: true,
        deliveredBodyVerified: true,
        stopNotEchoed: true,
        multiTurnProven: true,
      },
    }).result).toBe("NOT_PROVEN");
    expect(() => ingestOptOutConsentObservation({
      conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
      at: "2026-09-18T11:00:00.000Z",
      prospect_authored: true,
      provider_called: false,
    })).not.toThrow();
    expect(runDailyImprovementCycle({
      now: "2026-09-18T06:00:00.000Z",
      date: "2026-09-18",
      trigger: "VERCEL_CRON",
    }).report.top_sales_learnings).toEqual(expect.arrayContaining([
      "Did consent correctly override sales?",
      "Can a future send still occur after STOP?",
    ]));
    expect(evaluateHQPublicIsolationGate({
      publicOrigin: "https://imros.io",
      publicServesOperations: true,
      publicServesHq: false,
      body: "<main data-public-operations-room>public</main>",
    }).result).toBe("PASS");
    expect(evaluateHQPublicIsolationGate({
      publicOrigin: "https://imros.io",
      publicServesOperations: true,
      publicServesHq: false,
      body: "suppression:email STOP 1a0af74557b0eb36",
    }).result).toBe("FAIL");
  });
});
