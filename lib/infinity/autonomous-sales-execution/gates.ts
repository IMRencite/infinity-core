import { evaluateSalesQualificationGate, evaluateSalesSuppressionGate, evaluateSalesDuplicateActionGate, evaluateSalesRoomHandoffGate } from "@/lib/infinity/venture-sales-floor/gates";
import { salesOutreachBlocked } from "@/lib/infinity/venture-sales-floor/compliance";
import {
  AUTONOMOUS_OUTBOUND_EXECUTION_GATE,
  OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
  OCCUPANCYNPV_OUTBOUND_ACTIVATION_GATE,
  OUTBOUND_MESSAGE_QUALITY_GATE,
  SALES_EXTERNAL_ACTION_IDEMPOTENCY_GATE,
  SALES_OUTBOUND_RATE_LIMIT_GATE,
  SALES_REPLY_CLASSIFICATION_GATE,
  SALES_TECHNICAL_FAILURE_TRUTH_GATE,
} from "./contract";
import { classifySalesReply, evaluateOutboundMessageQuality, evaluateSalesOutboundRateLimit, routeReplyToRoom, routeTrialStart, routeWonDeal } from "./engines";
import { classifyProviderOutcome, evaluateAutonomousOutboundExecutionPolicy, rememberSalesIdempotency, salesIdempotencyKey } from "./policy";
import type { SalesProspectCandidate } from "./types";

export type NamedSalesExecutionGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

function pass(gate: string, reason: string): NamedSalesExecutionGate {
  return { gate, result: "PASS", reasons: [reason] };
}
function fail(gate: string, reasons: string[]): NamedSalesExecutionGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateAutonomousOutboundExecutionGate(input: Parameters<typeof evaluateAutonomousOutboundExecutionPolicy>[0]): NamedSalesExecutionGate {
  const decision = evaluateAutonomousOutboundExecutionPolicy(input);
  return decision.authorized
    ? pass(AUTONOMOUS_OUTBOUND_EXECUTION_GATE, "ELIGIBLE_BOUNDED_SEND")
    : fail(AUTONOMOUS_OUTBOUND_EXECUTION_GATE, decision.reasons);
}

export function evaluateOutboundMessageQualityGate(message: string, venture = "OccupancyNPV"): NamedSalesExecutionGate {
  const quality = evaluateOutboundMessageQuality({ message, venture, recipient_context: "tenant representation occupancy" });
  return quality.pass ? pass(OUTBOUND_MESSAGE_QUALITY_GATE, "QUALITY_PASS") : fail(OUTBOUND_MESSAGE_QUALITY_GATE, quality.reasons);
}

export function evaluateSalesOutboundRateLimitGate(daily_sent: number, cap = 5): NamedSalesExecutionGate {
  const rate = evaluateSalesOutboundRateLimit({ daily_sent, domain_sent: 0, recipient_sent: 0 });
  if (daily_sent >= cap && rate.allowed) return fail(SALES_OUTBOUND_RATE_LIMIT_GATE, ["CAP_NOT_ENFORCED"]);
  return pass(SALES_OUTBOUND_RATE_LIMIT_GATE, "CAPS_ENFORCED");
}

export function evaluateSalesExternalActionIdempotencyGate(store: Set<string>, key: string): NamedSalesExecutionGate {
  const first = rememberSalesIdempotency(key, store);
  const second = rememberSalesIdempotency(key, store);
  return first && !second
    ? pass(SALES_EXTERNAL_ACTION_IDEMPOTENCY_GATE, "DUPLICATE_BLOCKED")
    : fail(SALES_EXTERNAL_ACTION_IDEMPOTENCY_GATE, ["DUPLICATE_ALLOWED"]);
}

export function evaluateSalesReplyClassificationGate(text: string, expected: string): NamedSalesExecutionGate {
  return classifySalesReply(text) === expected
    ? pass(SALES_REPLY_CLASSIFICATION_GATE, expected)
    : fail(SALES_REPLY_CLASSIFICATION_GATE, ["CLASS_MISMATCH"]);
}

export function evaluateSalesTechnicalFailureTruthGate(): NamedSalesExecutionGate {
  const provider = classifyProviderOutcome({ provider_failure: true });
  const bounce = classifyProviderOutcome({ hard_bounce: true });
  if (provider === "TECHNICAL_FAILURE" && bounce === "HARD_BOUNCE") {
    return pass(SALES_TECHNICAL_FAILURE_TRUTH_GATE, "FAILURE_NOT_REJECTION");
  }
  return fail(SALES_TECHNICAL_FAILURE_TRUTH_GATE, ["FAILURE_MISCLASSIFIED"]);
}

export function evaluateOccupancyNPVOutboundActivationGate(input: {
  campaign_id: string;
  duplicate_campaign: boolean;
  ramp: number;
}): NamedSalesExecutionGate {
  if (input.campaign_id !== OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID) return fail(OCCUPANCYNPV_OUTBOUND_ACTIVATION_GATE, ["CAMPAIGN_NOT_REUSED"]);
  if (input.duplicate_campaign) return fail(OCCUPANCYNPV_OUTBOUND_ACTIVATION_GATE, ["DUPLICATE_CAMPAIGN"]);
  if (input.ramp > 5) return fail(OCCUPANCYNPV_OUTBOUND_ACTIVATION_GATE, ["RAMP_INCREASED"]);
  return pass(OCCUPANCYNPV_OUTBOUND_ACTIVATION_GATE, "EXISTING_CAMPAIGN_REUSED");
}

export function evaluateSalesHandoffSuite(): NamedSalesExecutionGate {
  if (routeReplyToRoom("PRICING_QUESTION").handoff_room !== "OFFER_CLOSING") return fail("SalesRoomHandoffGate", ["PRICING"]);
  if (routeTrialStart().to !== "INBOUND_CONVERSION") return fail("SalesRoomHandoffGate", ["TRIAL"]);
  if (routeReplyToRoom("REFERRAL").handoff_room !== "PARTNERSHIPS_CHANNEL") return fail("SalesRoomHandoffGate", ["PARTNER"]);
  if (routeWonDeal().to !== "EXPANSION_RETENTION") return fail("SalesRoomHandoffGate", ["WON"]);
  return evaluateSalesRoomHandoffGate();
}

export function evaluateSuppressionAndQualification(candidate: SalesProspectCandidate): {
  qualification: ReturnType<typeof evaluateSalesQualificationGate>;
  suppression: ReturnType<typeof evaluateSalesSuppressionGate>;
  duplicate: ReturnType<typeof evaluateSalesDuplicateActionGate>;
} {
  return {
    qualification: evaluateSalesQualificationGate(true, true),
    suppression: evaluateSalesSuppressionGate(Boolean(candidate.unsubscribed || salesOutreachBlocked({ unsubscribed: candidate.unsubscribed }))),
    duplicate: evaluateSalesDuplicateActionGate(true),
  };
}

export { salesIdempotencyKey };
