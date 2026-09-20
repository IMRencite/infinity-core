import { describe, expect, it } from "vitest";
import { classifyMessageRole, evaluateCommunicationRuntimeAlwaysOnGate, evaluateLiveMessageRoleDirectionGate, evaluateResponseContentQualityGate } from "../conversation-semantics";
import { stripQuotedReply } from "../gmail-message-body";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { evaluateConsultativeSalesLanguageGate, evaluateSalesOverExplanationGate, evaluateSalesQuestionQualityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateNaturalSalesConversationGate } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { evaluateConversationStateOwnershipGate } from "@/lib/infinity/always-closing-sales/doctrine";
import {
  evaluateActionableInboundSLAGate,
  evaluateBusinessLoopHealthGate,
  evaluateEligibleJobClaimGate,
  evaluateGmailLatestMessageSelectionGate,
  evaluateInboundMessageIdempotencyGate,
  evaluateStuckActionableInboundGate,
  selectLatestActionableProspectInbound,
} from "../business-loop-health";
import { isValidProspectSuppression, lookupSuppression, persistSuppressionRecord, resetClosedLoopDurableState } from "../closed-loop-durable";
import { ACTIONABLE_INBOUND_STRANDED_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";

const TWO_LEASES = "give me an example of how it would work with 2 different leases";
const QUOTED = `${TWO_LEASES}\n\n\nOn Fri, Sep 18, 2026 at 6:40 AM <infinitemediaresources@gmail.com> wrote:\nOccupancyNPV is a comparison workspace for lease, occupancy, and property scenarios.`;

describe("missed live prospect reply incident", () => {
  it("classifies the two-lease ask as prospect inbound from visible body, not snippet", () => {
    const visible = stripQuotedReply(QUOTED);
    expect(visible).toMatch(/2 different leases/i);
    expect(visible).not.toMatch(/comparison workspace/i);
    const role = classifyMessageRole({
      message_id: "1a0b41fe029e3ceb",
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
      messages: [
        {
          id: "1a0b40e53a28b284",
          threadId: "1a0af74557b0eb36",
          from: INFINITY_MANAGED_SENDER,
          to: INFINITY_MANAGED_SENDER,
          subject: "Re: example",
          inReplyTo: null,
          date: "Fri, 18 Sep 2026 06:27:09 -0400",
          snippet: "",
          bodyText: "yes give me an example so I can see how well it would work for me",
        },
        {
          id: "1a0b41a8843df276",
          threadId: "1a0af74557b0eb36",
          from: INFINITY_MANAGED_SENDER,
          to: INFINITY_MANAGED_SENDER,
          subject: "Re: example",
          inReplyTo: null,
          date: "Fri, 18 Sep 2026 03:40:32 -0700",
          snippet: "",
          bodyText: "OccupancyNPV is a comparison workspace for lease, occupancy, and property scenarios.",
        },
        {
          id: "1a0b41fe029e3ceb",
          threadId: "1a0af74557b0eb36",
          from: INFINITY_MANAGED_SENDER,
          to: INFINITY_MANAGED_SENDER,
          subject: "Re: example",
          inReplyTo: null,
          date: "Fri, 18 Sep 2026 06:46:20 -0400",
          snippet: "OccupancyNPV is a comparison workspace for lease",
          bodyText: QUOTED,
        },
      ],
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
    });
    expect(selected?.id).toBe("1a0b41fe029e3ceb");
    expect(evaluateGmailLatestMessageSelectionGate({
      selected_id: selected?.id ?? null,
      actual_newest_prospect_id: "1a0b41fe029e3ceb",
    }).result).toBe("PASS");
  });

  it("does not let false Infinity STOP or thread keys hide overdue work", () => {
    resetClosedLoopDurableState();
    persistSuppressionRecord({
      recipient: "canary@example.com",
      source_message_id: "1a0b254b39f5c645",
      source_role: "SYSTEM",
    });
    expect(isValidProspectSuppression({
      id: "x",
      recipient_fingerprint: "abc",
      venture: "OccupancyNPV",
      venture_id: "v",
      channel: "EMAIL",
      reason: "OPT_OUT",
      source_message_id: "1a0b254b39f5c645",
      timestamp: "2026-09-18T04:00:30.003Z",
      status: "ACTIVE",
      source_role: undefined,
    })).toBe(false);
    expect(lookupSuppression("canary@example.com")).toBeNull();
    expect(evaluateInboundMessageIdempotencyGate({
      processed_key: "canary-reply-send:1a0af74557b0eb36:1a0b41fe029e3ceb",
      message_id: "1a0b41fe029e3ceb",
      thread_level_key_blocked_new_message: false,
    }).result).toBe("PASS");
    expect(evaluateActionableInboundSLAGate({
      now: "2026-09-18T22:00:00.000Z",
      eligible_at: "2026-09-18T10:38:31.319Z",
      state: "READY",
    }).result).toBe("FAIL");
    expect(evaluateBusinessLoopHealthGate({ scheduler_healthy: true, actionable_overdue: true }).result).toBe("FAIL");
    expect(evaluateStuckActionableInboundGate({ valid_actionable: true, terminal: false, overdue: true }).result).toBe("FAIL");
    expect(evaluateEligibleJobClaimGate({
      job: {
        job_id: "job:1a0af74557b0eb36:1a0b40e53a28b284",
        conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
        inbound_message_id: "1a0b40e53a28b284",
        thread_id: "1a0af74557b0eb36",
        eligible_at: "2026-09-18T10:38:31.319Z",
        state: "READY",
        attempt_count: 0,
        idempotency_key: "communication-job-send:1a0af74557b0eb36:1a0b40e53a28b284",
        provider: "GMAIL",
        created_at: "2026-09-18T10:30:31.319Z",
        started_at: null,
        sent_at: null,
        failure_reason: null,
      },
      now: "2026-09-18T22:00:00.000Z",
      claimed: false,
      later_infinity_reply: true,
    }).result).toBe("PASS");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "SALES_DOCTRINE",
      incoming_state: "ENGAGED",
      current_state: "ACTIVE_CONVERSATION",
      incoming_next_action: "SHOW_EXAMPLE",
      current_next_action: "REQUEST_NUMBERS",
      incoming_intent: "NEW_LEAD",
      current_intent: "TRY_WITH_NUMBERS",
    }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeAlwaysOnGate({ stuckActionableInbound: true }).result).toBe("FAIL");
    expect(ACTIONABLE_INBOUND_STRANDED_ESCAPE.defect_class).toContain("THREAD_LATEST_MESSAGE_SELECTION_FAILURE");
    expect(runDailyImprovementCycle({
      now: "2026-09-18T06:00:00.000Z",
      date: "2026-09-18",
      trigger: "VERCEL_CRON",
    }).report.top_sales_learnings).toEqual(expect.arrayContaining([
      "Did scheduler HEALTHY hide business-loop failure?",
      "Did GRANT:NOT_CONFIGURED blind inbound discovery?",
      "Did any cron enter NOT_CONFIGURED?",
    ]));
  });

  it("composes a simple consultative two-lease example without sending", () => {
    const composed = composeOccupancyNpvAlwaysClosingReply({ inbound: TWO_LEASES, turn: 2 });
    expect(composed.body).toMatch(/lease a|\$8,000/i);
    expect(composed.body).toMatch(/side by side|financial sense/i);
    expect(composed.body).toMatch(/3-day free trial|occupancynpv\.com\/pricing/i);
    expect(evaluateConsultativeSalesLanguageGate({
      inbound: TWO_LEASES,
      generated: composed.body,
      stage: composed.decision.stage,
      next_action: composed.next_action,
      turn: 2,
    }).result).toBe("PASS");
    expect(evaluateNaturalSalesConversationGate({ inbound: TWO_LEASES, generated: composed.body, next_action: composed.next_action }).result).toBe("PASS");
    expect(evaluateSalesOverExplanationGate({ inbound: TWO_LEASES, generated: composed.body }).over_explanation).toBe(false);
    expect(evaluateSalesQuestionQualityGate({ inbound: TWO_LEASES, generated: composed.body, stage: composed.decision.stage }).result).toBe("PASS");
    expect(evaluateResponseContentQualityGate({ inbound: TWO_LEASES, generated: composed.body, latest_question: TWO_LEASES }).result).toBe("PASS");
  });
});
