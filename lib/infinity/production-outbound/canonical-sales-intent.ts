import type { NamedOutboundLoopGate } from "./closed-loop";
import { classifySalesReply } from "@/lib/infinity/autonomous-sales-execution/engines";
import { isExampleRequest, isPositiveBuyingSignal, isRenewVsRelocateQuestion, isRequestInputsQuestion, isStopOnly, isTryWithNumbersQuestion } from "./conversation-semantics";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export const CANONICAL_SALES_INTENTS = [
  "OPT_OUT",
  "OUT_OF_OFFICE",
  "ACTIVE_EVALUATION",
  "TRY_WITH_REAL_NUMBERS",
  "COMPARE_MULTIPLE_OPTIONS",
  "REQUEST_INPUTS",
  "TRY_WITH_NUMBERS",
  "RENEW_VS_RELOCATE",
  "REQUEST_EXAMPLE",
  "HIGH_INTENT",
  "PRICING_QUESTION",
  "POSITIVE_INTEREST",
  "QUESTION",
  "NEW_LEAD",
] as const;
export type CanonicalSalesIntent = (typeof CANONICAL_SALES_INTENTS)[number];

export type CanonicalSalesIntentResult = {
  intent: CanonicalSalesIntent;
  next_action: string;
  stage: "FIRST_TOUCH" | "ENGAGED" | "QUALIFIED" | "HIGH_INTENT";
  short_contextual: boolean;
  source: "CANONICAL_SALES_INTENT";
};

export function isShortContextualReply(text: string): boolean {
  const value = text.trim();
  return /^(yes|yeah|yep|sure|ok|okay|i do|i have|i've got|thats what im doing|that's what i'm doing)\b/i.test(value)
    || /^yes[,.]?\s+(i |i'm |im |we |currently )/i.test(value);
}

export function isActiveEvaluationReply(text: string): boolean {
  return /couple leases|looking to compare|currently have .{0,48}lease|i have (a couple|two|a few) leases|leases i'?m looking to compare|comparing .{0,24}leases|i currently have/i.test(text);
}

export function previousAskedAboutTwoLeases(previousOutbound: string | null | undefined): boolean {
  if (!previousOutbound) return false;
  return /two leases|couple leases|comparing right now|plug them into|real example/i.test(previousOutbound);
}

export function classifyCanonicalSalesIntent(input: {
  visible_body: string;
  previous_intent?: string | null;
  previous_outbound?: string | null;
  previous_prospect_intent?: string | null;
  stage?: string | null;
}): CanonicalSalesIntentResult {
  const text = input.visible_body.trim();
  const short = isShortContextualReply(text);
  if (isStopOnly(text)) {
    return { intent: "OPT_OUT", next_action: "SUPPRESS", stage: "ENGAGED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (/out of office|on leave/i.test(text)) {
    return { intent: "OUT_OF_OFFICE", next_action: "WAIT", stage: "ENGAGED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (isRequestInputsQuestion(text)) {
    return { intent: "REQUEST_INPUTS", next_action: "REQUEST_NUMBERS", stage: "QUALIFIED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (isTryWithNumbersQuestion(text)) {
    return { intent: "TRY_WITH_NUMBERS", next_action: "REQUEST_NUMBERS", stage: "QUALIFIED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (isRenewVsRelocateQuestion(text)) {
    return { intent: "RENEW_VS_RELOCATE", next_action: "REQUEST_NUMBERS", stage: "QUALIFIED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if ((isActiveEvaluationReply(text) || (short && previousAskedAboutTwoLeases(input.previous_outbound))) && !isExampleRequest(text)) {
    return {
      intent: "ACTIVE_EVALUATION",
      next_action: "START_TRIAL",
      stage: "QUALIFIED",
      short_contextual: short,
      source: "CANONICAL_SALES_INTENT",
    };
  }
  if (isExampleRequest(text)) {
    return { intent: "REQUEST_EXAMPLE", next_action: "SHOW_REAL_EXAMPLE", stage: "ENGAGED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (/price|pricing|how much|what does this cost/i.test(text)) {
    return { intent: "PRICING_QUESTION", next_action: "ASK_QUALIFYING_QUESTION", stage: "QUALIFIED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (isPositiveBuyingSignal(text)) {
    return { intent: "POSITIVE_INTEREST", next_action: "START_TRIAL", stage: "QUALIFIED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  const legacy = classifySalesReply(text);
  if (legacy === "UNKNOWN" && short && /REQUEST_EXAMPLE|SHOW_EXAMPLE|SHOW_REAL_EXAMPLE/i.test(input.previous_intent ?? "")) {
    return { intent: "ACTIVE_EVALUATION", next_action: "START_TRIAL", stage: "QUALIFIED", short_contextual: true, source: "CANONICAL_SALES_INTENT" };
  }
  if (legacy === "PRICING_QUESTION") {
    return { intent: "PRICING_QUESTION", next_action: "ASK_QUALIFYING_QUESTION", stage: "QUALIFIED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (legacy === "DEMO_REQUEST" || legacy === "POSITIVE_INTEREST") {
    return { intent: "POSITIVE_INTEREST", next_action: "RESPOND_TO_INTERESTED_REPLY", stage: "ENGAGED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (legacy === "QUESTION") {
    return { intent: "QUESTION", next_action: "RESPOND_TO_INTERESTED_REPLY", stage: "ENGAGED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  if (text) {
    return { intent: "QUESTION", next_action: "RESPOND_TO_INTERESTED_REPLY", stage: "ENGAGED", short_contextual: short, source: "CANONICAL_SALES_INTENT" };
  }
  return { intent: "NEW_LEAD", next_action: "SHOW_EXAMPLE", stage: "FIRST_TOUCH", short_contextual: false, source: "CANONICAL_SALES_INTENT" };
}

export function evaluateCanonicalSalesIntentGate(input: {
  paths: string[];
}): NamedOutboundLoopGate {
  const unique = [...new Set(input.paths)];
  if (unique.length !== 1) return named("CanonicalSalesIntentGate", "FAIL", ["DIVERGENT_INTENT_PATHS", ...unique]);
  if (unique[0] === "UNKNOWN") return named("CanonicalSalesIntentGate", "FAIL", ["UNKNOWN_NOT_ALLOWED"]);
  return named("CanonicalSalesIntentGate", "PASS", ["SINGLE_CANONICAL_INTENT"]);
}

export function evaluateContextualShortReplyGate(input: {
  inbound: string;
  previous_outbound?: string | null;
  previous_intent?: string | null;
  intent: string;
}): NamedOutboundLoopGate {
  const short = isShortContextualReply(input.inbound) || isActiveEvaluationReply(input.inbound);
  if (!short) return named("ContextualShortReplyGate", "PASS", ["NOT_SHORT_CONTEXTUAL"]);
  if (/UNKNOWN|NEW_LEAD|FIRST_TOUCH|SHOW_EXAMPLE/i.test(input.intent)) {
    return named("ContextualShortReplyGate", "FAIL", ["SHORT_REPLY_LOST_CONTEXT"]);
  }
  if (previousAskedAboutTwoLeases(input.previous_outbound) || /REQUEST_EXAMPLE|SHOW_REAL_EXAMPLE/i.test(input.previous_intent ?? "")) {
    if (!/ACTIVE_EVALUATION|TRY_WITH_REAL_NUMBERS|COMPARE_MULTIPLE|TRY_WITH_NUMBERS|REQUEST_INPUTS|HIGH_INTENT/i.test(input.intent)) {
      return named("ContextualShortReplyGate", "FAIL", ["DID_NOT_INHERIT_ACTIVE_QUESTION"]);
    }
  }
  return named("ContextualShortReplyGate", "PASS", ["SHORT_REPLY_INHERITED_CONTEXT"]);
}

export function evaluateOutboundAuthorshipTruthGate(input: {
  message_id: string;
  role: string;
  direction: string;
  known_provider_outbound_ids: string[];
  looks_infinity_authored: boolean;
}): NamedOutboundLoopGate {
  const known = input.known_provider_outbound_ids.includes(input.message_id);
  if (known && (input.role !== "INFINITY" || input.direction !== "OUTBOUND")) {
    return named("OutboundAuthorshipTruthGate", "FAIL", ["PROVIDER_OUTBOUND_MISLABELED"]);
  }
  if (input.looks_infinity_authored && input.role === "PROSPECT") {
    return named("OutboundAuthorshipTruthGate", "FAIL", ["INFINITY_COPY_LABELED_PROSPECT"]);
  }
  return named("OutboundAuthorshipTruthGate", "PASS", ["AUTHORSHIP_TRUTH"]);
}

export function evaluateDeliveredBodyResolutionGate(input: {
  provider_message_id: string | null;
  generated: string;
  delivered_visible: string;
}): NamedOutboundLoopGate {
  if (!input.provider_message_id) return named("DeliveredBodyResolutionGate", "FAIL", ["NO_PROVIDER_ID"]);
  const visible = input.delivered_visible.trim();
  if (!visible) return named("DeliveredBodyResolutionGate", "FAIL", ["DELIVERED_EMPTY"]);
  const tokens = ["occupancynpv", "lease", "trial", "pricing", "$8,000", "rent"].filter((token) => input.generated.toLowerCase().includes(token));
  const matched = tokens.filter((token) => visible.toLowerCase().includes(token));
  if (tokens.length && matched.length === 0) return named("DeliveredBodyResolutionGate", "FAIL", ["GENERATED_NOT_VISIBLE"]);
  return named("DeliveredBodyResolutionGate", "PASS", ["PROVIDER_BODY_RESOLVED"]);
}

export function evaluateBlockedActionableJobGate(input: {
  state: string | null;
  failure_reason: string | null;
  blocked_since: string | null;
  now: string;
  cycle_ms?: number;
  recovery_attempted: boolean;
  escalated: boolean;
}): NamedOutboundLoopGate {
  if (input.state !== "BLOCKED") return named("BlockedActionableJobGate", "PASS", ["NOT_BLOCKED"]);
  if (input.escalated) return named("BlockedActionableJobGate", "PASS", ["VISIBLE_ESCALATION"]);
  const cycle = input.cycle_ms ?? 5 * 60 * 1000;
  const overdue = Boolean(input.blocked_since && Date.parse(input.now) > Date.parse(input.blocked_since) + cycle);
  if (overdue && !input.recovery_attempted) {
    return named("BlockedActionableJobGate", "FAIL", ["BLOCKED_WITHOUT_RECOVERY"]);
  }
  if (overdue && input.failure_reason === "CONTENT_QUALITY_BLOCKED") {
    return named("BlockedActionableJobGate", "FAIL", ["BLOCKED_PAST_SLA"]);
  }
  return named("BlockedActionableJobGate", "PASS", ["BLOCKED_IN_RECOVERY"]);
}

export function evaluateBlockedConversationRecoveryPolicy(input: {
  failure_reason: string | null;
  recompose_attempts: number;
  max_attempts?: number;
  never_attempted?: boolean;
  remapped_intent?: boolean;
  same_failed_composition?: boolean;
}): { action: "RECOMPOSE" | "ESCALATE_VISIBLE"; attempts: number } {
  const max = input.max_attempts ?? 2;
  if (input.never_attempted) {
    return { action: "RECOMPOSE", attempts: input.recompose_attempts };
  }
  if (input.remapped_intent) {
    return { action: "RECOMPOSE", attempts: 0 };
  }
  if (input.failure_reason === "CONTENT_QUALITY_BLOCKED" && input.recompose_attempts < max) {
    return { action: "RECOMPOSE", attempts: input.recompose_attempts + 1 };
  }
  if (input.same_failed_composition) {
    return { action: "ESCALATE_VISIBLE", attempts: input.recompose_attempts };
  }
  return { action: "ESCALATE_VISIBLE", attempts: input.recompose_attempts };
}

export function evaluateBlockedConversationRecoveryGate(input: {
  prior_intent: string;
  remapped_intent: string;
  prior_failure: string | null;
  remapped_failure: string | null;
  changed_failed_condition: boolean;
}): NamedOutboundLoopGate {
  if (input.prior_intent === input.remapped_intent && input.prior_failure === input.remapped_failure && !input.changed_failed_condition) {
    return named("BlockedConversationRecoveryGate", "FAIL", ["SAME_FAILED_COMPOSITION"]);
  }
  return named("BlockedConversationRecoveryGate", "PASS", ["FAILED_STATE_CHANGED"]);
}
