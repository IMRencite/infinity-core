import { describe, expect, it } from "vitest";
import {
  authorizeSingleSemanticReply,
  consumeSemanticReplyAuthorization,
  getClosedLoopDurableState,
  invalidateFalseInfinityOptOut,
  persistSuppressionRecord,
  repairOccupancynpvConversation,
  resetClosedLoopDurableState,
  semanticReplyAuthorized,
} from "../closed-loop-durable";
import {
  evaluateConversationStateRepairGate,
  evaluateLiveDeliveredSemanticParityGate,
  evaluatePerformanceObservationCorrectionGate,
  evaluateSuppressionCorrectionGate,
} from "../conversation-repair";
import { generateLeaseVsAlternativeExampleReply } from "../conversation-semantics";

describe("conversation state repair", () => {
  it("invalidates Infinity-authored STOP suppression and restores ACTIVE conversation", () => {
    resetClosedLoopDurableState();
    persistSuppressionRecord({ recipient: "canary@example.com", source_message_id: "1a0b254b39f5c645" });
    const correction = invalidateFalseInfinityOptOut({ expected_source_message_id: "1a0b254b39f5c645" });
    expect(correction.invalidated).toBe(true);
    expect(getClosedLoopDurableState().suppression?.status).toBe("INVALIDATED");
    expect(evaluateSuppressionCorrectionGate({
      found: true,
      source_message_id: "1a0b254b39f5c645",
      source_role: "SYSTEM",
      valid_prospect_opt_out: false,
      invalidated: true,
    }).result).toBe("PASS");
    const repaired = repairOccupancynpvConversation();
    expect(repaired.after?.conversation_state).toBe("ACTIVE");
    expect(repaired.after?.intent).toBe("REQUEST_EXAMPLE");
    expect(evaluateConversationStateRepairGate({
      state: repaired.after?.conversation_state ?? null,
      latest_valid_prospect_message_id: repaired.after?.latest_valid_prospect_message_id ?? null,
      intent: repaired.after?.intent ?? null,
      next_action: repaired.after?.next_action ?? null,
      not_opt_out: true,
    }).result).toBe("PASS");
    authorizeSingleSemanticReply({ inbound_message_id: "1a0b2000b6fda6c0" });
    expect(semanticReplyAuthorized("1a0b2000b6fda6c0")).toBe(true);
    expect(consumeSemanticReplyAuthorization("1a0b2000b6fda6c0")).toBe(true);
    expect(semanticReplyAuthorized("1a0b2000b6fda6c0")).toBe(false);
    const families = getClosedLoopDurableState().events.map((row) => row.family);
    expect(evaluatePerformanceObservationCorrectionGate({ families }).result).toBe("PASS");
    const generated = generateLeaseVsAlternativeExampleReply();
    expect(evaluateLiveDeliveredSemanticParityGate({ generated, delivered: generated }).result).toBe("PASS");
    expect(evaluateLiveDeliveredSemanticParityGate({ generated, delivered: "STOP" }).result).toBe("FAIL");
    const tryNumbers = "For a live comparison you enter the current lease first: remaining term, rent, occupancy.\n\nThat's exactly the point where it's worth trying with your real numbers.\n\n— Infinity\nIMR’s autonomous venture operating system\nOccupancyNPV | occupancynpv.com";
    expect(evaluateLiveDeliveredSemanticParityGate({ generated: tryNumbers, delivered: tryNumbers }).result).toBe("PASS");
  });

  it("keeps repaired ACTIVE conversation fields across a non-sending observe upsert", async () => {
    resetClosedLoopDurableState();
    persistSuppressionRecord({ recipient: "canary@example.com", source_message_id: "1a0b254b39f5c645" });
    invalidateFalseInfinityOptOut({ expected_source_message_id: "1a0b254b39f5c645" });
    repairOccupancynpvConversation();
    const { applyCanaryObservationToDurableStore, markSecondTurnAnswered } = await import("../closed-loop-durable");
    markSecondTurnAnswered({ outbound_id: "1a0b2811333bb557" });
    applyCanaryObservationToDurableStore({
      observation: {
        thread_id: "1a0af74557b0eb36",
        provider_message_id: "1a0b2000b6fda6c0",
        last_successful_check: "2026-09-18T03:10:00.000Z",
        idempotency_key: "canary-reply:1a0b2000b6fda6c0",
        reply_found: true,
        ingested: true,
        classifier_executed: true,
        classification: "REQUEST_EXAMPLE",
        queue_record: false,
        send_accepted: false,
        sent_at: null,
        reply_provider_message_id: null,
        next_action: "RESPOND_TO_SECOND_TURN_QUESTION",
        pipeline_state: "DELIVERED",
      },
    });
    const conversation = getClosedLoopDurableState().conversation;
    expect(conversation?.conversation_state).toBe("ACTIVE_CONVERSATION");
    expect(conversation?.intent).toBe("REQUEST_EXAMPLE");
    expect(conversation?.latest_valid_prospect_message_id).toBe("1a0b2000b6fda6c0");
    expect(conversation?.last_outbound_response_id).toBe("1a0b2811333bb557");
  });
});
