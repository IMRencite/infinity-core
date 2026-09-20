import type { NamedOutboundLoopGate } from "./closed-loop";
import { classifyCanonicalSalesIntent, type CanonicalSalesIntent, type CanonicalSalesIntentResult } from "./canonical-sales-intent";
import { isPositiveBuyingSignal, isStopOnly } from "./conversation-semantics";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export const CONVERSATION_PLANNER_VERSION = "conversation-planner-v1" as const;

export { isPositiveBuyingSignal };

export type ConversationPlan = CanonicalSalesIntentResult & {
  strategy_id: string;
  actionable: boolean;
  prior_infinity_outbound_count: number;
  first_touch_legal: boolean;
  progression: "FORWARD" | "HOLD";
  planner_version: typeof CONVERSATION_PLANNER_VERSION;
};

export function planConversation(input: {
  visible_body: string;
  previous_intent?: string | null;
  previous_outbound?: string | null;
  previous_prospect_intent?: string | null;
  stage?: string | null;
  prior_infinity_outbound_count?: number;
}): ConversationPlan {
  const prior = input.prior_infinity_outbound_count ?? (input.previous_outbound ? 1 : 0);
  const firstTouchLegal = prior === 0;
  const classified = classifyCanonicalSalesIntent({
    visible_body: input.visible_body,
    previous_intent: input.previous_intent,
    previous_outbound: input.previous_outbound,
    previous_prospect_intent: input.previous_prospect_intent,
    stage: input.stage,
  });
  if (isStopOnly(input.visible_body)) {
    return {
      ...classified,
      strategy_id: "SUPPRESS",
      actionable: false,
      prior_infinity_outbound_count: prior,
      first_touch_legal: firstTouchLegal,
      progression: "HOLD",
      planner_version: CONVERSATION_PLANNER_VERSION,
    };
  }
  const buying = isPositiveBuyingSignal(input.visible_body);
  const qualifiedContext = /QUALIFIED|HIGH_INTENT|ACTIVE_EVALUATION|REQUEST_INPUTS|TRY_WITH/i.test(`${input.stage ?? ""} ${input.previous_intent ?? ""}`);
  let intent: CanonicalSalesIntent = classified.intent;
  let next_action = classified.next_action;
  let stage = classified.stage;
  if ((buying || /POSITIVE_INTEREST|QUESTION|NEW_LEAD/i.test(intent)) && (prior > 0 || qualifiedContext)) {
    intent = buying ? "POSITIVE_INTEREST" : intent === "NEW_LEAD" ? "QUESTION" : intent;
    next_action = buying || qualifiedContext ? "START_TRIAL" : "RESPOND_TO_INTERESTED_REPLY";
    const trialStart = /how do i start the free trial|rather just try it|can i try it|i want to (try|start)|start now|let'?s do it|\btrial\b/i.test(input.visible_body);
    stage = trialStart ? "HIGH_INTENT" : buying || qualifiedContext ? "QUALIFIED" : stage === "FIRST_TOUCH" ? "ENGAGED" : stage;
  }
  if (!firstTouchLegal && (intent === "NEW_LEAD" || stage === "FIRST_TOUCH")) {
    intent = "QUESTION";
    next_action = "RESPOND_TO_INTERESTED_REPLY";
    stage = "ENGAGED";
  }
  return {
    intent,
    next_action,
    stage,
    short_contextual: classified.short_contextual,
    source: classified.source,
    strategy_id: `${intent}:${next_action}`,
    actionable: next_action !== "WAIT" && next_action !== "SUPPRESS",
    prior_infinity_outbound_count: prior,
    first_touch_legal: firstTouchLegal,
    progression: stage === "FIRST_TOUCH" && prior > 0 ? "HOLD" : "FORWARD",
    planner_version: CONVERSATION_PLANNER_VERSION,
  };
}

export function evaluatePlannerTotalityGate(plan: ConversationPlan): NamedOutboundLoopGate {
  if (!plan.intent || (plan.intent === "NEW_LEAD" && !plan.first_touch_legal)) {
    return named("PlannerTotalityGate", "FAIL", ["UNKNOWN_OR_ILLEGAL_FIRST_TOUCH"]);
  }
  if (!plan.strategy_id || !plan.next_action) return named("PlannerTotalityGate", "FAIL", ["MISSING_STRATEGY"]);
  return named("PlannerTotalityGate", "PASS", ["TOTAL_PLAN"]);
}

export function evaluateFirstTouchContract(input: {
  prior_infinity_outbound_count: number;
  used_first_touch_copy: boolean;
}): NamedOutboundLoopGate {
  if (input.used_first_touch_copy && input.prior_infinity_outbound_count > 0) {
    return named("FirstTouchContract", "FAIL", ["FIRST_TOUCH_MID_THREAD"]);
  }
  return named("FirstTouchContract", "PASS", ["FIRST_TOUCH_LEGAL"]);
}

export function evaluateConversationProgressionInvariant(input: {
  previous_stage: string | null;
  next_stage: string;
  regression_justified: boolean;
}): NamedOutboundLoopGate {
  const rank = (stage: string) => /HIGH_INTENT/.test(stage) ? 4 : /QUALIFIED/.test(stage) ? 3 : /ENGAGED/.test(stage) ? 2 : 1;
  if (rank(input.next_stage) < rank(input.previous_stage ?? "") && !input.regression_justified) {
    return named("ConversationProgressionInvariant", "FAIL", ["STAGE_REGRESSED"]);
  }
  return named("ConversationProgressionInvariant", "PASS", ["FORWARD_OR_HOLD"]);
}
