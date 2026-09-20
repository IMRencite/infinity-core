import { describe, expect, it } from "vitest";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { evaluateConversationStateOwnershipGate } from "@/lib/infinity/always-closing-sales/doctrine";
import { evaluateConsultativeSalesLanguageGate, evaluateSalesOverExplanationGate, evaluateSalesQuestionQualityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateNaturalSalesConversationGate } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { evaluateOfferDrivenSalesAdvancementGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";
import { REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";
import {
  evaluateBusinessLoopHealthGate,
  evaluateCommunicationRuntimeAlwaysOnDuringIncident,
  evaluateInboundMessageIdempotencyGate,
  selectLatestActionableProspectInbound,
} from "../business-loop-health";
import {
  evaluateActionableInboundCompletionGate,
  evaluateEndToEndCommunicationHealthGate,
  evaluateInboundCompletionTruthGate,
  evaluateInboundWithoutJobGate,
  evaluateLatestActionableProspectMessageGate,
  evaluateLiveConversationReliabilityGate,
  evaluateReadyJobDrainGate,
  measureCommunicationResponseSlo,
  reconcileActionableInboundWork,
  type ReconcileScheduledJob,
} from "../communication-reconciliation";
import {
  classifyMessageRole,
  evaluateCommunicationRuntimeAlwaysOnGate,
  evaluateLiveMessageRoleDirectionGate,
  evaluateResponseContentQualityGate,
  isExampleRequest,
} from "../conversation-semantics";
import { composeCanaryReplyForInbound } from "../communication-runtime";
import { stripQuotedReply } from "../gmail-message-body";

const TARGET = "yes give me a real example";
const QUOTED = `${TARGET}\n\n\nOn Fri, Sep 18, 2026 at 10:45 PM <infinitemediaresources@gmail.com> wrote:\nOccupancyNPV is a comparison workspace for lease, occupancy, and property scenarios.`;
const THREAD = "1a0af74557b0eb36";
const INBOUND_ID = "1a0b78faca76d524";
const PRIOR_PROSPECT = "1a0b77dda0e77184";
const PRIOR_REPLY = "1a0b78e048ac03cf";

function blockedJob(overrides: Partial<ReconcileScheduledJob> = {}): ReconcileScheduledJob {
  return {
    job_id: `job:${THREAD}:${INBOUND_ID}`,
    conversation_id: "sales-conversation:occupancynpv:canary",
    inbound_message_id: INBOUND_ID,
    thread_id: THREAD,
    eligible_at: "2026-09-19T02:58:32.321Z",
    state: "BLOCKED",
    attempt_count: 1,
    idempotency_key: `communication-job-send:${THREAD}:${INBOUND_ID}`,
    provider: "GMAIL",
    created_at: "2026-09-19T02:50:32.321Z",
    started_at: "2026-09-19T03:00:32.104Z",
    sent_at: null,
    failure_reason: "CONTENT_QUALITY_BLOCKED",
    intent: "UNKNOWN",
    provider_message_id: null,
    ...overrides,
  };
}

const liveMessages = [
  {
    id: PRIOR_PROSPECT,
    threadId: THREAD,
    from: INFINITY_MANAGED_SENDER,
    to: INFINITY_MANAGED_SENDER,
    subject: "Re: OccupancyNPV",
    inReplyTo: null,
    date: "Fri, 18 Sep 2026 22:27:50 -0400",
    snippet: "Yes, can you show me what it would look like?",
    bodyText: "Yes, can you show me what it would look like?",
  },
  {
    id: PRIOR_REPLY,
    threadId: THREAD,
    from: INFINITY_MANAGED_SENDER,
    to: INFINITY_MANAGED_SENDER,
    subject: "Re: OccupancyNPV",
    inReplyTo: PRIOR_PROSPECT,
    date: "Fri, 18 Sep 2026 19:45:33 -0700",
    snippet: "OccupancyNPV is a comparison workspace",
    bodyText: "OccupancyNPV is a comparison workspace for lease, occupancy, and property scenarios.",
  },
  {
    id: INBOUND_ID,
    threadId: THREAD,
    from: INFINITY_MANAGED_SENDER,
    to: INFINITY_MANAGED_SENDER,
    subject: "Re: OccupancyNPV",
    inReplyTo: PRIOR_REPLY,
    date: "Fri, 18 Sep 2026 22:47:18 -0400",
    snippet: "OccupancyNPV is a comparison workspace for lease",
    bodyText: QUOTED,
  },
];

describe("communication reconciliation v1", () => {
  it("classifies the live example ask from visible unquoted body, not snippet", () => {
    const visible = stripQuotedReply(QUOTED);
    expect(visible).toBe(TARGET);
    expect(isExampleRequest(visible)).toBe(true);
    const role = classifyMessageRole({
      message_id: INBOUND_ID,
      from: INFINITY_MANAGED_SENDER,
      to: INFINITY_MANAGED_SENDER,
      body: QUOTED,
      snippet: "OccupancyNPV is a comparison workspace for lease",
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
    });
    expect(role).toEqual({ role: "PROSPECT", direction: "INBOUND" });
    expect(evaluateLiveMessageRoleDirectionGate({
      role: role.role,
      direction: role.direction,
      visible_body: visible,
      used_snippet_for_authorship: false,
    }).result).toBe("PASS");
    const selected = selectLatestActionableProspectInbound({
      messages: liveMessages,
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
    });
    expect(selected?.id).toBe(INBOUND_ID);
    expect(evaluateLatestActionableProspectMessageGate({
      visible_is_prospect: selected?.role === "PROSPECT",
      newer_than_last_answered: true,
      later_infinity_reply: false,
      terminal: false,
      opt_out: false,
      requires_action: true,
    }).result).toBe("PASS");
  });

  it("treats processed keys as discovery, not completion, and resumes BLOCKED jobs", () => {
    expect(evaluateInboundMessageIdempotencyGate({
      processed_key: `canary-reply:${INBOUND_ID}`,
      message_id: INBOUND_ID,
      thread_level_key_blocked_new_message: false,
    }).result).toBe("PASS");
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
    expect(evaluateInboundWithoutJobGate({
      actionable: true,
      terminal_response: false,
      durable_job: false,
    }).result).toBe("FAIL");
    const reconciled = reconcileActionableInboundWork({
      messages: liveMessages,
      jobs: [blockedJob()],
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
      suppression: null,
      now: "2026-09-19T09:05:00.000Z",
      thread_id: THREAD,
      conversation_id: "sales-conversation:occupancynpv:canary",
    });
    expect(reconciled.result.latest_actionable_prospect_message_id).toBe(INBOUND_ID);
    expect(reconciled.result.latest_answered_prospect_message_id).toBe(PRIOR_PROSPECT);
    expect(reconciled.result.recoveries).toEqual([{ inbound_id: INBOUND_ID, action: "RESUME_JOB" }]);
    expect(reconciled.jobs[0]?.state).toBe("READY");
    expect(reconciled.jobs[0]?.failure_reason).toBeNull();
    expect(reconciled.result.InboundWithoutJobGate.result).toBe("PASS");
    expect(reconciled.result.EndToEndCommunicationHealthGate.result).toBe("FAIL");
    expect(evaluateReadyJobDrainGate({ ready_jobs: 1, claimed_or_terminal: 0 }).result).toBe("FAIL");
    expect(evaluateBusinessLoopHealthGate({ scheduler_healthy: true, actionable_overdue: true }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeAlwaysOnDuringIncident({ stuck_actionable_inbound: true }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeAlwaysOnGate({ stuckActionableInbound: true }).result).toBe("FAIL");
    expect(evaluateEndToEndCommunicationHealthGate({ unresolved_actionable: 1 }).result).toBe("FAIL");
  });

  it("creates a missing job when an actionable inbound has no durable work", () => {
    const reconciled = reconcileActionableInboundWork({
      messages: liveMessages,
      jobs: [],
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
      suppression: null,
      now: "2026-09-19T09:05:00.000Z",
      thread_id: THREAD,
      conversation_id: "sales-conversation:occupancynpv:canary",
    });
    expect(reconciled.result.recoveries).toEqual([{ inbound_id: INBOUND_ID, action: "CREATE_JOB" }]);
    expect(reconciled.jobs[0]?.state).toBe("READY");
    expect(reconciled.result.InboundWithoutJobGate.result).toBe("PASS");
  });

  it("does not recreate work after a provider reply exists", () => {
    const reconciled = reconcileActionableInboundWork({
      messages: [
        ...liveMessages,
        {
          id: "1a0b999999999999",
          threadId: THREAD,
          from: INFINITY_MANAGED_SENDER,
          to: INFINITY_MANAGED_SENDER,
          subject: "Re: OccupancyNPV",
          inReplyTo: INBOUND_ID,
          date: "Sat, 19 Sep 2026 05:10:00 -0400",
          snippet: "Sure. Say Lease A costs $8,000",
          bodyText: "Sure. Say Lease A costs $8,000 a month and has almost no moving costs.",
        },
      ],
      jobs: [blockedJob({ state: "SENT", provider_message_id: "1a0b999999999999", sent_at: "2026-09-19T09:10:00.000Z" })],
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
      suppression: null,
      now: "2026-09-19T09:12:00.000Z",
      thread_id: THREAD,
      conversation_id: "sales-conversation:occupancynpv:canary",
    });
    expect(reconciled.result.recoveries).toEqual([]);
    expect(reconciled.result.unresolved).toEqual([]);
    expect(evaluateActionableInboundCompletionGate({
      requires_reply: true,
      provider_message_id: "1a0b999999999999",
      valid_suppression: false,
      explicit_non_response: false,
      terminal_block: false,
    }).result).toBe("PASS");
    expect(evaluateInboundCompletionTruthGate({
      discovered: true,
      provider_reply: true,
      valid_suppression: false,
    }).result).toBe("PASS");
    expect(evaluateCommunicationRuntimeAlwaysOnDuringIncident({
      stuck_actionable_inbound: false,
      reconciliation_live: true,
      e2e_pass: true,
    }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeAlwaysOnDuringIncident({
      stuck_actionable_inbound: false,
      reconciliation_live: true,
      e2e_pass: true,
      clean_turns: 3,
    }).result).toBe("PASS");
    expect(evaluateLiveConversationReliabilityGate({ consecutive_completed_turns: 0 }).result).toBe("NOT_PROVEN");
    expect(evaluateLiveConversationReliabilityGate({ consecutive_completed_turns: 3 }).result).toBe("PASS");
    const slo = measureCommunicationResponseSlo({
      received_at: "2026-09-19T02:47:18.000Z",
      observed_at: "2026-09-19T02:50:32.321Z",
      job_created_at: "2026-09-19T02:50:32.321Z",
      eligible_at: "2026-09-19T02:58:32.321Z",
      claimed_at: "2026-09-19T03:00:32.104Z",
      provider_sent_at: "2026-09-19T09:10:00.000Z",
    });
    expect(slo.inbound_detection_ms).toBeGreaterThan(0);
    expect(slo.total_response_ms).toBeGreaterThan(6 * 60 * 60 * 1000);
  });

  it("composes a simple two-lease example that passes live sales gates", () => {
    const composed = composeCanaryReplyForInbound(TARGET);
    expect(composed.decision.intent).toBe("REQUEST_EXAMPLE");
    expect(composed.body).toMatch(/lease a|\$8,000/i);
    expect(composed.body).toMatch(/free trial|occupancynpv\.com\/pricing/i);
    expect(composed.body).not.toMatch(/I'?m Infinity/i);
    const quality = evaluateResponseContentQualityGate({ inbound: TARGET, generated: composed.body, latest_question: TARGET });
    expect(quality.result).toBe("PASS");
    expect(evaluateNaturalSalesConversationGate({ inbound: TARGET, generated: composed.body, next_action: composed.next_action }).result).toBe("PASS");
    expect(evaluateConsultativeSalesLanguageGate({
      inbound: TARGET,
      generated: composed.body,
      stage: composed.decision.stage,
      next_action: composed.next_action,
      turn: 2,
    }).result).toBe("PASS");
    expect(evaluateSalesOverExplanationGate({ inbound: TARGET, generated: composed.body }).over_explanation).toBe(false);
    expect(evaluateSalesQuestionQualityGate({ inbound: TARGET, generated: composed.body, stage: composed.decision.stage }).result).toBe("PASS");
    expect(evaluateOfferDrivenSalesAdvancementGate({
      stage: composed.decision.stage,
      profile: loadVentureOfferProfile("occupancynpv"),
      generated: composed.body,
      next_action: composed.next_action,
      inbound: TARGET,
    }).result).toBe("PASS");
    expect(composeOccupancyNpvAlwaysClosingReply({ inbound: TARGET, turn: 2 }).body).toMatch(/\$40,000/);
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "COMMUNICATION_RUNTIME",
      incoming_state: "ENGAGED",
      current_state: "ENGAGED",
      incoming_next_action: "SHOW_REAL_EXAMPLE",
      current_next_action: "INVITE_TRIAL",
      incoming_intent: "REQUEST_EXAMPLE",
      current_intent: "REQUEST_EXAMPLE",
    }).result).toBe("PASS");
    expect(REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE.defect_class).toContain("REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED");
    expect(runDailyImprovementCycle({
      now: "2026-09-19T09:00:00.000Z",
      date: "2026-09-19",
      trigger: "VERCEL_CRON",
      constraints: {
        outbound_mode: "CANARY",
        organic_execute_publish: false,
        backlink_mode: "DISCOVERY_ONLY",
        mercury_status: "DEGRADED",
        affiliate_engine_active: false,
        communication_last_error: null,
        sales_stage: "ENGAGED",
        unresolved_actionable_inbound: 1,
      },
    }).run.benchmarks.find((row) => row.system === "Communication Runtime")?.benchmark_state).toBe("MATERIAL_GAP");
  });
});
