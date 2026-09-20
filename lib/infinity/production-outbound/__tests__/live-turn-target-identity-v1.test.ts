import { describe, expect, it } from "vitest";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { evaluateConsultativeSalesLanguageGate, evaluateSalesOverExplanationGate, evaluateSalesQuestionQualityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateNaturalSalesConversationGate } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { evaluateOfferDrivenSalesAdvancementGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";
import { LIVE_TURN_REPORT_TARGET_MISMATCH_ESCAPE, REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";
import {
  classifyCanonicalSalesIntent,
  evaluateBlockedConversationRecoveryGate,
  evaluateBlockedConversationRecoveryPolicy,
  evaluateCanonicalSalesIntentGate,
  evaluateOutboundAuthorshipTruthGate,
} from "../canonical-sales-intent";
import {
  LIVE_RELIABILITY_TURN_A,
  evaluateActionableInboundCompletionGate,
  evaluateInboundCompletionTruthGate,
  evaluateLiveTurnTargetIdentityGate,
  evaluateReadyJobDrainGate,
  evaluateReconciliationSLAGate,
  reconcileActionableInboundWork,
  type ReconcileScheduledJob,
} from "../communication-reconciliation";
import { composeCanaryReplyForInbound } from "../communication-runtime";
import {
  classifyMessageRole,
  evaluateLiveMessageRoleDirectionGate,
  evaluateResponseContentQualityGate,
  looksLikeInfinityAuthored,
} from "../conversation-semantics";
import { classifySalesReply } from "@/lib/infinity/autonomous-sales-execution/engines";

const TURN_A = LIVE_RELIABILITY_TURN_A.body;
const PRIOR_COUPLE_LEASES = "Yes i currently have a couple leases im looking to compare";
const PRIOR_COUPLE_LEASES_ID = "1a0b8fe61045cbdb";
const PRIOR_REPLY_ID = "1a0b9fc9d7abd69b";
const THREAD = "1a0af74557b0eb36";

function turnAJob(overrides: Partial<ReconcileScheduledJob> = {}): ReconcileScheduledJob {
  return {
    job_id: `job:${THREAD}:${LIVE_RELIABILITY_TURN_A.message_id}`,
    conversation_id: "sales-conversation:occupancynpv:canary",
    inbound_message_id: LIVE_RELIABILITY_TURN_A.message_id,
    thread_id: THREAD,
    eligible_at: "2026-09-19T18:23:31.265Z",
    state: "BLOCKED",
    attempt_count: 0,
    idempotency_key: `communication-job-send:${THREAD}:${LIVE_RELIABILITY_TURN_A.message_id}`,
    provider: "GMAIL",
    created_at: "2026-09-19T18:15:31.265Z",
    started_at: null,
    sent_at: null,
    failure_reason: "ESCALATE_VISIBLE",
    intent: "QUESTION",
    provider_message_id: null,
    ...overrides,
  };
}

const messages = [
  {
    id: PRIOR_COUPLE_LEASES_ID,
    threadId: THREAD,
    from: INFINITY_MANAGED_SENDER,
    to: INFINITY_MANAGED_SENDER,
    subject: "Re: OccupancyNPV",
    inReplyTo: null,
    date: "Sat, 19 Sep 2026 05:27:49 -0400",
    snippet: PRIOR_COUPLE_LEASES,
    bodyText: PRIOR_COUPLE_LEASES,
  },
  {
    id: PRIOR_REPLY_ID,
    threadId: THREAD,
    from: INFINITY_MANAGED_SENDER,
    to: INFINITY_MANAGED_SENDER,
    subject: "Re: OccupancyNPV",
    inReplyTo: PRIOR_COUPLE_LEASES_ID,
    date: "Sat, 19 Sep 2026 07:05:35 -0700",
    snippet: "Perfect — that's exactly the kind of situation OccupancyNPV is built for.",
    bodyText: "Perfect — that's exactly the kind of situation OccupancyNPV is built for.\n\nIf you have a couple leases you're comparing, the easiest next step is to plug in the rent.",
  },
  {
    id: LIVE_RELIABILITY_TURN_A.message_id,
    threadId: THREAD,
    from: INFINITY_MANAGED_SENDER,
    to: INFINITY_MANAGED_SENDER,
    subject: "Re: OccupancyNPV",
    inReplyTo: PRIOR_REPLY_ID,
    date: LIVE_RELIABILITY_TURN_A.received_at,
    snippet: TURN_A,
    bodyText: TURN_A,
  },
];

describe("live turn target identity v1", () => {
  it("requires the exact Turn A body, id, and timestamp", () => {
    expect(evaluateLiveTurnTargetIdentityGate({
      reported_body: TURN_A,
      reported_message_id: LIVE_RELIABILITY_TURN_A.message_id,
      reported_received_at: LIVE_RELIABILITY_TURN_A.received_at,
    }).result).toBe("PASS");
    expect(evaluateLiveTurnTargetIdentityGate({
      reported_body: PRIOR_COUPLE_LEASES,
      reported_message_id: PRIOR_COUPLE_LEASES_ID,
      reported_received_at: "Sat, 19 Sep 2026 05:27:49 -0400",
    }).result).toBe("FAIL");
    expect(evaluateLiveTurnTargetIdentityGate({
      reported_body: TURN_A,
      reported_message_id: PRIOR_COUPLE_LEASES_ID,
      reported_received_at: LIVE_RELIABILITY_TURN_A.received_at,
    }).result).toBe("FAIL");
    expect(evaluateLiveTurnTargetIdentityGate({
      reported_body: TURN_A,
      reported_message_id: LIVE_RELIABILITY_TURN_A.message_id,
      reported_received_at: LIVE_RELIABILITY_TURN_A.received_at,
      provider_reply_id: PRIOR_REPLY_ID,
      provider_in_reply_to: PRIOR_COUPLE_LEASES_ID,
    }).result).toBe("FAIL");
  });

  it("classifies Turn A as REQUEST_INPUTS from the canonical path only", () => {
    const canonical = classifyCanonicalSalesIntent({
      visible_body: TURN_A,
      previous_intent: "ACTIVE_EVALUATION",
      previous_outbound: "Do you already have the rent and term for both leases?",
    });
    expect(canonical.intent).toBe("REQUEST_INPUTS");
    expect(canonical.stage).toBe("QUALIFIED");
    expect(canonical.next_action).toBe("REQUEST_NUMBERS");
    expect(evaluateCanonicalSalesIntentGate({
      paths: [canonical.intent, composeCanaryReplyForInbound(TURN_A).decision.intent],
    }).result).toBe("PASS");
    expect(classifySalesReply(TURN_A)).toBe("QUESTION");
    expect(["UNKNOWN", "NEW_LEAD", "FIRST_TOUCH", "SHOW_EXAMPLE"]).not.toContain(canonical.intent);
  });

  it("keeps role and authorship on the inbound, not lexical matching alone", () => {
    const role = classifyMessageRole({
      message_id: LIVE_RELIABILITY_TURN_A.message_id,
      from: INFINITY_MANAGED_SENDER,
      to: INFINITY_MANAGED_SENDER,
      body: TURN_A,
      snippet: "",
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
      known_infinity_ids: [PRIOR_REPLY_ID],
    });
    expect(role).toEqual({ role: "PROSPECT", direction: "INBOUND" });
    expect(evaluateLiveMessageRoleDirectionGate({
      role: role.role,
      direction: role.direction,
      visible_body: TURN_A,
      used_snippet_for_authorship: false,
    }).result).toBe("PASS");
    expect(evaluateOutboundAuthorshipTruthGate({
      message_id: LIVE_RELIABILITY_TURN_A.message_id,
      role: role.role,
      direction: role.direction,
      known_provider_outbound_ids: [PRIOR_REPLY_ID],
      looks_infinity_authored: looksLikeInfinityAuthored(TURN_A),
    }).result).toBe("PASS");
    expect(evaluateOutboundAuthorshipTruthGate({
      message_id: PRIOR_REPLY_ID,
      role: "PROSPECT",
      direction: "INBOUND",
      known_provider_outbound_ids: [PRIOR_REPLY_ID],
      looks_infinity_authored: true,
    }).result).toBe("FAIL");
  });

  it("composes a simple request-inputs reply that passes sales gates", () => {
    const composed = composeCanaryReplyForInbound(TURN_A, { previous_intent: "ACTIVE_EVALUATION" });
    expect(composed.decision.intent).toBe("REQUEST_INPUTS");
    expect(composed.decision.stage).toBe("QUALIFIED");
    expect(composed.body).toMatch(/rent|term|increase/i);
    expect(composed.body).toMatch(/3-day|free trial/i);
    expect(composed.body).toMatch(/occupancynpv\.com\/pricing/i);
    expect(composed.body).not.toMatch(/I'?m Infinity|verified path|dealworkspace/i);
    expect(evaluateResponseContentQualityGate({ inbound: TURN_A, generated: composed.body, latest_question: TURN_A }).result).toBe("PASS");
    expect(evaluateNaturalSalesConversationGate({ inbound: TURN_A, generated: composed.body, next_action: composed.next_action }).result).toBe("PASS");
    expect(evaluateConsultativeSalesLanguageGate({
      inbound: TURN_A,
      generated: composed.body,
      stage: composed.decision.stage,
      next_action: composed.next_action,
      turn: 4,
    }).result).toBe("PASS");
    expect(evaluateSalesOverExplanationGate({ inbound: TURN_A, generated: composed.body }).over_explanation).toBe(false);
    expect(evaluateSalesQuestionQualityGate({ inbound: TURN_A, generated: composed.body, stage: composed.decision.stage }).result).toBe("PASS");
    expect(evaluateOfferDrivenSalesAdvancementGate({
      stage: composed.decision.stage,
      profile: loadVentureOfferProfile("occupancynpv"),
      generated: composed.body,
      next_action: composed.next_action,
      inbound: TURN_A,
    }).result).toBe("PASS");
    expect(composeOccupancyNpvAlwaysClosingReply({ inbound: TURN_A, intent: "REQUEST_INPUTS", turn: 4 }).body).toMatch(/for each lease/i);
  });

  it("resumes a never-attempted ESCALATE_VISIBLE job as REQUEST_INPUTS READY", () => {
    expect(evaluateInboundCompletionTruthGate({
      discovered: true,
      provider_reply: false,
      valid_suppression: false,
    }).result).toBe("FAIL");
    expect(evaluateActionableInboundCompletionGate({
      requires_reply: true,
      provider_message_id: null,
      valid_suppression: false,
      explicit_non_response: false,
      terminal_block: false,
    }).result).toBe("FAIL");
    const waiting = reconcileActionableInboundWork({
      messages,
      jobs: [turnAJob({ state: "WAITING_PACING", failure_reason: null, intent: "QUESTION" })],
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
      suppression: null,
      now: "2026-09-20T04:10:00.000Z",
      thread_id: THREAD,
      conversation_id: "sales-conversation:occupancynpv:canary",
    });
    expect(waiting.jobs[0]?.state).toBe("WAITING_PACING");
    expect(waiting.jobs[0]?.failure_reason).toBeNull();
    expect(waiting.jobs[0]?.intent).toBe("REQUEST_INPUTS");
    const reconciled = reconcileActionableInboundWork({
      messages,
      jobs: [turnAJob()],
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
      suppression: null,
      now: "2026-09-20T04:10:00.000Z",
      thread_id: THREAD,
      conversation_id: "sales-conversation:occupancynpv:canary",
    });
    expect(reconciled.result.latest_actionable_prospect_message_id).toBe(LIVE_RELIABILITY_TURN_A.message_id);
    expect(reconciled.result.recoveries).toEqual([{ inbound_id: LIVE_RELIABILITY_TURN_A.message_id, action: "RESUME_JOB" }]);
    expect(reconciled.jobs[0]?.state).toBe("READY");
    expect(reconciled.jobs[0]?.intent).toBe("REQUEST_INPUTS");
    expect(reconciled.jobs[0]?.failure_reason).toBeNull();
    expect(evaluateBlockedConversationRecoveryPolicy({
      failure_reason: "ESCALATE_VISIBLE",
      recompose_attempts: 0,
      never_attempted: true,
      remapped_intent: true,
    }).action).toBe("RECOMPOSE");
    expect(evaluateBlockedConversationRecoveryGate({
      prior_intent: "QUESTION",
      remapped_intent: "REQUEST_INPUTS",
      prior_failure: "ESCALATE_VISIBLE",
      remapped_failure: null,
      changed_failed_condition: true,
    }).result).toBe("PASS");
    expect(evaluateBlockedConversationRecoveryGate({
      prior_intent: "QUESTION",
      remapped_intent: "QUESTION",
      prior_failure: "ESCALATE_VISIBLE",
      remapped_failure: "ESCALATE_VISIBLE",
      changed_failed_condition: false,
    }).result).toBe("FAIL");
    expect(evaluateReadyJobDrainGate({ ready_jobs: 1, claimed_or_terminal: 0 }).result).toBe("FAIL");
    expect(evaluateReconciliationSLAGate({
      work_required: true,
      resolved: false,
      received_at: LIVE_RELIABILITY_TURN_A.received_at_iso,
      now: "2026-09-20T04:10:00.000Z",
      changed_failed_condition: false,
    }).result).toBe("FAIL");
  });

  it("records the target-mismatch defect and daily improvement questions", () => {
    expect(LIVE_TURN_REPORT_TARGET_MISMATCH_ESCAPE.defect_class).toContain("LIVE_TURN_REPORT_TARGET_MISMATCH");
    expect(REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE.defect_class).toContain("REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED");
    const cycle = runDailyImprovementCycle({
      now: "2026-09-20T04:10:00.000Z",
      date: "2026-09-20",
      trigger: "VERCEL_CRON",
      constraints: {
        outbound_mode: "CANARY",
        organic_execute_publish: false,
        backlink_mode: "DISCOVERY_ONLY",
        mercury_status: "DEGRADED",
        affiliate_engine_active: false,
        communication_last_error: null,
        sales_stage: "QUALIFIED",
        unresolved_actionable_inbound: 1,
      },
    });
    expect(cycle.report.top_sales_learnings).toEqual(expect.arrayContaining([
      "Did the report inspect the intended live turn?",
      "Did every actionable inbound receive a provider-level disposition?",
      "Did reconciliation change failed state?",
      "Did any high-intent message exceed SLA?",
    ]));
    expect(cycle.run.observations.some((row) => row.observation_id === "obs:live-turn-report-target-mismatch")).toBe(true);
  });
});
