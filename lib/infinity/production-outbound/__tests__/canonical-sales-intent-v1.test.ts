import { describe, expect, it } from "vitest";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { evaluateConsultativeSalesLanguageGate, evaluateSalesOverExplanationGate, evaluateSalesQuestionQualityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateNaturalSalesConversationGate } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { evaluateOfferDrivenSalesAdvancementGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import {
  classifyCanonicalSalesIntent,
  evaluateBlockedActionableJobGate,
  evaluateBlockedConversationRecoveryPolicy,
  evaluateCanonicalSalesIntentGate,
  evaluateContextualShortReplyGate,
  evaluateDeliveredBodyResolutionGate,
  evaluateOutboundAuthorshipTruthGate,
} from "../canonical-sales-intent";
import { composeCanaryReplyForInbound } from "../communication-runtime";
import { classifyMessageRole, evaluateResponseContentQualityGate, looksLikeInfinityAuthored } from "../conversation-semantics";
import { evaluateLiveDeliveredSemanticParityGate } from "../conversation-repair";
import { classifySalesReply } from "@/lib/infinity/autonomous-sales-execution/engines";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";

const INBOUND = "Yes i currently have a couple leases im looking to compare";
const PREVIOUS = "Do you have two leases you're comparing right now?";

describe("canonical sales intent v1", () => {
  it("classifies the couple-leases yes as ACTIVE_EVALUATION from one path", () => {
    const canonical = classifyCanonicalSalesIntent({
      visible_body: INBOUND,
      previous_intent: "REQUEST_EXAMPLE",
      previous_outbound: PREVIOUS,
    });
    expect(canonical.intent).toBe("ACTIVE_EVALUATION");
    expect(canonical.next_action).toBe("START_TRIAL");
    expect(canonical.stage).toBe("QUALIFIED");
    expect(evaluateCanonicalSalesIntentGate({ paths: [canonical.intent, composeCanaryReplyForInbound(INBOUND).decision.intent] }).result).toBe("PASS");
    expect(evaluateContextualShortReplyGate({
      inbound: INBOUND,
      previous_outbound: PREVIOUS,
      previous_intent: "REQUEST_EXAMPLE",
      intent: canonical.intent,
    }).result).toBe("PASS");
    expect(classifySalesReply(INBOUND)).toBe("UNKNOWN");
    expect(HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED_ESCAPE.defect_class).toContain("HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED");
  });

  it("inherits short yes from the active two-lease question", () => {
    const yes = classifyCanonicalSalesIntent({
      visible_body: "yes",
      previous_intent: "REQUEST_EXAMPLE",
      previous_outbound: PREVIOUS,
    });
    expect(yes.intent).toBe("ACTIVE_EVALUATION");
    expect(evaluateContextualShortReplyGate({
      inbound: "yes",
      previous_outbound: PREVIOUS,
      previous_intent: "REQUEST_EXAMPLE",
      intent: "UNKNOWN",
    }).result).toBe("FAIL");
  });

  it("composes a high-intent trial reply that passes sales gates", () => {
    const composed = composeCanaryReplyForInbound(INBOUND, { previous_intent: "REQUEST_EXAMPLE", previous_outbound: PREVIOUS });
    expect(composed.decision.intent).toBe("ACTIVE_EVALUATION");
    expect(composed.body).toMatch(/3-day free trial/i);
    expect(composed.body).toMatch(/occupancynpv\.com\/pricing/i);
    expect(composed.body).toMatch(/rent|term/i);
    expect(evaluateResponseContentQualityGate({ inbound: INBOUND, generated: composed.body, latest_question: INBOUND }).result).toBe("PASS");
    expect(evaluateNaturalSalesConversationGate({ inbound: INBOUND, generated: composed.body, next_action: composed.next_action }).result).toBe("PASS");
    expect(evaluateConsultativeSalesLanguageGate({
      inbound: INBOUND,
      generated: composed.body,
      stage: composed.decision.stage,
      next_action: composed.next_action,
      turn: 4,
    }).result).toBe("PASS");
    expect(evaluateSalesOverExplanationGate({ inbound: INBOUND, generated: composed.body }).over_explanation).toBe(false);
    expect(evaluateSalesQuestionQualityGate({ inbound: INBOUND, generated: composed.body, stage: composed.decision.stage }).result).toBe("PASS");
    expect(evaluateOfferDrivenSalesAdvancementGate({
      stage: composed.decision.stage,
      profile: loadVentureOfferProfile("occupancynpv"),
      generated: composed.body,
      next_action: composed.next_action,
      inbound: INBOUND,
    }).result).toBe("PASS");
    expect(composeOccupancyNpvAlwaysClosingReply({ inbound: INBOUND, intent: "ACTIVE_EVALUATION", turn: 4 }).body).toMatch(/couple leases/i);
  });

  it("recovers BLOCKED jobs and resolves delivered body plus authorship", () => {
    expect(evaluateBlockedConversationRecoveryPolicy({
      failure_reason: "CONTENT_QUALITY_BLOCKED",
      recompose_attempts: 0,
    }).action).toBe("RECOMPOSE");
    expect(evaluateBlockedActionableJobGate({
      state: "BLOCKED",
      failure_reason: "CONTENT_QUALITY_BLOCKED",
      blocked_since: "2026-09-19T09:38:31.283Z",
      now: "2026-09-19T12:30:31.357Z",
      recovery_attempted: true,
      escalated: false,
    }).result).toBe("FAIL");
    const generated = composeCanaryReplyForInbound(INBOUND).body;
    expect(evaluateDeliveredBodyResolutionGate({
      provider_message_id: "1a0b8fc3ebad644f",
      generated,
      delivered_visible: generated.slice(0, 180),
    }).result).toBe("PASS");
    expect(evaluateLiveDeliveredSemanticParityGate({ generated, delivered: generated }).result).toBe("PASS");
    const firstTouch = "OccupancyNPV helps you compare lease options without rebuilding a spreadsheet every time the numbers change.";
    expect(looksLikeInfinityAuthored(firstTouch)).toBe(true);
    expect(classifyMessageRole({
      message_id: "1a0b78e048ac03cf",
      from: INFINITY_MANAGED_SENDER,
      to: INFINITY_MANAGED_SENDER,
      body: firstTouch,
      snippet: "",
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
      known_infinity_ids: ["1a0b78e048ac03cf"],
    })).toEqual({ role: "INFINITY", direction: "OUTBOUND" });
    expect(evaluateOutboundAuthorshipTruthGate({
      message_id: "1a0b78e048ac03cf",
      role: "PROSPECT",
      direction: "INBOUND",
      known_provider_outbound_ids: ["1a0b78e048ac03cf"],
      looks_infinity_authored: true,
    }).result).toBe("FAIL");
    const recovery = classifyMessageRole({
      message_id: "1a0b9fc9d7abd69b",
      from: INFINITY_MANAGED_SENDER,
      to: INFINITY_MANAGED_SENDER,
      body: "Perfect — that's exactly the kind of situation OccupancyNPV is built for.\n\nIf you have a couple leases you're comparing, the easiest next step is to plug in the rent.",
      snippet: "",
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: INFINITY_MANAGED_SENDER,
    });
    expect(recovery).toEqual({ role: "INFINITY", direction: "OUTBOUND" });
  });
});
