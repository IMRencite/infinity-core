import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import { isRequestInputsQuestion } from "@/lib/infinity/production-outbound/conversation-semantics";
import { isPositiveBuyingSignal } from "@/lib/infinity/production-outbound/conversation-semantics";
import { classifyObjection as classifySalesLearningObjection } from "@/lib/infinity/sales-learning/method";
import {
  loadVentureOfferProfile,
  strongestRelevantOffer,
  type VentureOfferProfile,
} from "./venture-offer-profile";

export const INFINITY_COMMERCIAL_OBJECTIVE = "InfinityCommercialObjective" as const;
export const PRIMARY_COMMERCIAL_OBJECTIVE = "REVENUE_GROWTH" as const;
export const SUPPORTING_COMMERCIAL_OBJECTIVES = [
  "QUALIFIED_ENGAGEMENT",
  "CONVERSATION_PROGRESSION",
  "TRIAL_ACTIVATION",
  "DEMO_COMPLETION",
  "PROPOSAL_PROGRESSION",
  "PURCHASE",
  "RETENTION",
  "EXPANSION",
  "REFERRAL",
] as const;

export const COMMERCIAL_FUNNEL = [
  "ATTENTION",
  "ENGAGEMENT",
  "QUALIFICATION",
  "PROBLEM_CLARITY",
  "VALUE",
  "PROOF",
  "NEXT_STEP",
  "TRIAL",
  "DEMO",
  "PROPOSAL",
  "PURCHASE",
  "ACTIVATION",
  "RETENTION",
  "EXPANSION",
  "REFERRAL",
] as const;

export const CONVERSATION_MOMENTUM_STATES = [
  "COLD",
  "ENGAGED",
  "DISCOVERY",
  "QUALIFIED",
  "EVALUATING",
  "HIGH_INTENT",
  "TRIAL",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
  "DORMANT",
  "SUPPRESSED",
] as const;

export type ConversationMomentumState = (typeof CONVERSATION_MOMENTUM_STATES)[number];
export const COMMERCIAL_ACTIONS = [
  "ANSWER_QUESTION",
  "ASK_QUALIFYING_QUESTION",
  "CLARIFY_PAIN",
  "SHOW_EXAMPLE",
  "SHOW_PROOF",
  "SEND_RESOURCE",
  "INVITE_TRIAL",
  "START_TRIAL",
  "INVITE_DEMO",
  "BOOK_DEMO",
  "REQUEST_NUMBERS",
  "BUILD_SCENARIO",
  "SEND_PROPOSAL",
  "REQUEST_PURCHASE",
  "FOLLOW_UP",
  "HANDLE_OBJECTION",
  "REACTIVATE",
  "ASK_FOR_REFERRAL",
  "OFFER_UPSELL",
  "OFFER_RENEWAL",
  "WAIT",
  "SUPPRESS",
] as const;

export type CommercialAction = (typeof COMMERCIAL_ACTIONS)[number];

export type ParsedCommercialAction =
  | { ok: true; value: CommercialAction; raw: string }
  | { ok: false; value: null; raw: string; reason: "UNKNOWN_COMMERCIAL_ACTION" };

export function parseCommercialAction(raw: unknown): ParsedCommercialAction {
  if (typeof raw !== "string") {
    return { ok: false, value: null, raw: raw == null ? "" : String(raw), reason: "UNKNOWN_COMMERCIAL_ACTION" };
  }
  for (const action of COMMERCIAL_ACTIONS) {
    if (action === raw) {
      return { ok: true, value: action, raw };
    }
  }
  return { ok: false, value: null, raw, reason: "UNKNOWN_COMMERCIAL_ACTION" };
}

export type SalesStagePolicy = "FIRST_TOUCH" | "ENGAGED" | "QUALIFIED" | "HIGH_INTENT" | "POST_SALE";
export type ObjectionFamily =
  | "PRICE" | "TIME" | "TRUST" | "NEED" | "FIT" | "COMPLEXITY" | "IMPLEMENTATION"
  | "AUTHORITY" | "RISK" | "COMPETITOR" | "STATUS_QUO" | "TIMING" | "BUDGET"
  | "PROOF" | "SECURITY" | "FEATURE" | "UNKNOWN";

export type CommercialInteraction = {
  inbound: string;
  turn?: number;
  momentum?: ConversationMomentumState | null;
  intent?: string | null;
  suppressed?: boolean;
  opt_out?: boolean;
  kill_switch?: boolean;
  customer?: boolean;
  venture_id?: string;
  offer?: VentureOfferProfile;
};

export type NextBestCommercialAction = {
  stage: SalesStagePolicy;
  momentum: ConversationMomentumState;
  intent: string;
  pain: string | null;
  dream_outcome: string | null;
  objection: ObjectionFamily | null;
  next_action: CommercialAction;
  cta: string;
  reason: string;
  guided_sales_mode: boolean;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateInfinityCommercialObjective(): NamedOutboundLoopGate {
  return named(INFINITY_COMMERCIAL_OBJECTIVE, "PASS", [PRIMARY_COMMERCIAL_OBJECTIVE, ...SUPPORTING_COMMERCIAL_OBJECTIVES]);
}

export function classifyCommercialObjection(text: string): ObjectionFamily {
  const value = text.toLowerCase();
  if (/price|expensive|cost too|too much|budget/.test(value)) return /budget/.test(value) ? "BUDGET" : "PRICE";
  if (/no time|too busy|don't have time/.test(value)) return "TIME";
  if (/trust|proof|who are you|skeptic|fake/.test(value)) return "TRUST";
  if (/don't need|no need|not a problem/.test(value)) return "NEED";
  if (/not a fit|wrong tool|doesn't fit/.test(value)) return "FIT";
  if (/complex|complicated|too hard to understand/.test(value)) return "COMPLEXITY";
  if (/implement|setup|integration|too hard/.test(value)) return "IMPLEMENTATION";
  if (/boss|partner|committee|not my decision/.test(value)) return "AUTHORITY";
  if (/risk|worried|what if|security/.test(value)) return /security|soc|gdpr/.test(value) ? "SECURITY" : "RISK";
  if (/competitor|other tool|already looking|excel|spreadsheet is enough/.test(value) && /already have|current/.test(value)) return "STATUS_QUO";
  if (/competitor|other tool|already looking/.test(value)) return "COMPETITOR";
  if (/later|not now|next quarter|timing/.test(value)) return "TIMING";
  if (/feature missing|doesn't have|need it to/.test(value)) return "FEATURE";
  if (/proof|case study|example of a client/.test(value)) return "PROOF";
  const mapped = classifySalesLearningObjection(text);
  if (mapped === "PRICE") return "PRICE";
  if (mapped === "TIMING") return "TIMING";
  if (mapped === "TRUST") return "TRUST";
  if (mapped === "NEED") return "NEED";
  if (mapped === "AUTHORITY") return "AUTHORITY";
  if (mapped === "COMPETITOR") return "COMPETITOR";
  if (mapped === "IMPLEMENTATION") return "IMPLEMENTATION";
  if (mapped === "RISK") return "RISK";
  return "UNKNOWN";
}

export function inferSalesStage(input: CommercialInteraction): SalesStagePolicy {
  if (input.customer) return "POST_SALE";
  if (input.opt_out || input.suppressed) return "ENGAGED";
  const text = input.inbound.toLowerCase();
  if (/buy|purchase|start now|sign up|checkout|approve/.test(text)) return "HIGH_INTENT";
  if (/how do i start the free trial|rather just try it|can i try it|i want to (try|start)|let'?s do it/.test(text)) return "HIGH_INTENT";
  if (/\btrial\b/.test(text) && /start|try|ready/.test(text)) return "HIGH_INTENT";
  if (isPositiveBuyingSignal(input.inbound) || /POSITIVE_INTEREST|ACTIVE_EVALUATION|REQUEST_INPUTS|QUALIFIED/i.test(input.intent ?? "")) return "QUALIFIED";
  if (isRequestInputsQuestion(input.inbound) || /couple leases|looking to compare|currently have .{0,48}lease|comparing .{0,24}leases/i.test(text)) return "QUALIFIED";
  if (/price|pricing|trial|demo|proposal|implementation/.test(text) && (input.turn ?? 1) >= 2) return "QUALIFIED";
  if ((input.turn ?? 1) >= 2) return "ENGAGED";
  return "FIRST_TOUCH";
}

export function inferMomentum(input: CommercialInteraction): ConversationMomentumState {
  if (input.opt_out || input.suppressed) return "SUPPRESSED";
  if (input.customer && /renew|upgrade|refer/.test(input.inbound)) return /refer/.test(input.inbound) ? "WON" : "TRIAL";
  const stage = inferSalesStage(input);
  if (stage === "HIGH_INTENT") return "HIGH_INTENT";
  if (stage === "QUALIFIED") return "QUALIFIED";
  if (stage === "ENGAGED") return (input.turn ?? 1) >= 3 ? "EVALUATING" : "ENGAGED";
  if (stage === "POST_SALE") return "WON";
  return "COLD";
}

export function inferPain(text: string): string | null {
  if (/spreadsheet|rebuild|manual/.test(text)) return "manual scenario rebuilding";
  if (/renew|relocat|mov(e|ing)|new location/.test(text)) return "slow lease-vs-relocation comparison";
  if (/example|comparison|compare/.test(text)) return "unclear NPV / property-value tradeoffs";
  if (/price|pricing/.test(text)) return "unclear whether the work is worth the cost";
  return /occupancy|lease|npv/.test(text) ? "inconsistent occupancy assumptions" : null;
}

export function inferDreamOutcome(text: string): string | null {
  if (/renew|relocat|mov(e|ing)/.test(text)) return "clear renew-vs-move decision without rebuilding models";
  if (/example|compar/.test(text)) return "side-by-side NPV and property-value visibility";
  if (/price|trial|demo/.test(text)) return "low-risk way to test the comparison on a live deal";
  return "faster occupancy decisions with less spreadsheet rework";
}

export function selectNextBestCommercialAction(input: CommercialInteraction): NextBestCommercialAction {
  if (input.opt_out || input.suppressed) {
    return {
      stage: inferSalesStage(input),
      momentum: "SUPPRESSED",
      intent: "OPT_OUT",
      pain: inferPain(input.inbound),
      dream_outcome: inferDreamOutcome(input.inbound),
      objection: null,
      next_action: "SUPPRESS",
      cta: "",
      reason: "suppression_or_opt_out_overrides_sales",
      guided_sales_mode: false,
    };
  }
  const stage = inferSalesStage(input);
  const momentum = inferMomentum(input);
  const objection = classifyCommercialObjection(input.inbound);
  const hasQuestion = /\?|how|what|can you|show|example|compar|price|trial/.test(input.inbound.toLowerCase());
  const text = input.inbound.toLowerCase();
  let next_action: CommercialAction = "WAIT";
  let cta = "";
  let intent = input.intent ?? "UNKNOWN";
  if (/stop|unsubscribe|opt[-\s]?out/.test(text)) {
    next_action = "SUPPRESS";
    intent = "OPT_OUT";
  } else if (/competitor|other tool|excel|spreadsheet is enough/.test(text)) {
    next_action = "SHOW_PROOF";
    intent = "COMPETITOR";
    cta = "Want to put both options side by side and see which one makes more financial sense?";
  } else if (objection !== "UNKNOWN" && /too expensive|not sure|later|boss/.test(text)) {
    next_action = "HANDLE_OBJECTION";
    intent = `OBJECTION_${objection}`;
    cta = "Which part is the real blocker — proof, time, or fit?";
  } else if (/refer|someone else|colleague/.test(text) && input.customer) {
    next_action = "ASK_FOR_REFERRAL";
    cta = "Who else on your team is comparing occupancy decisions this quarter?";
  } else if (/upgrade|upsell|more seats|another property/.test(text) && input.customer) {
    next_action = "OFFER_UPSELL";
    cta = "Want to run the same comparison across the rest of the portfolio?";
  } else if (/renew/.test(text) && input.customer) {
    next_action = "OFFER_RENEWAL";
    cta = "Want me to structure the renewal comparison with your current numbers?";
  } else if (/buy|purchase|start now|sign up/.test(text)) {
    next_action = "REQUEST_PURCHASE";
    intent = "HIGH_INTENT_PURCHASE";
    cta = "Start the free trial and run both options: https://occupancynpv.com/pricing";
  } else if (/trial/.test(text)) {
    next_action = "INVITE_TRIAL";
    intent = "TRIAL_INTEREST";
    cta = "Start here: https://occupancynpv.com/pricing";
  } else if (/demo|walkthrough/.test(text) && !/example|lease-vs-alternative/.test(text) && stage !== "FIRST_TOUCH") {
    next_action = "INVITE_DEMO";
    intent = "DEMO_REQUEST";
    cta = "Want the fastest walkthrough using a renew-vs-move scenario?";
  } else if (/price|pricing|how much|what does this cost|cost/.test(text)) {
    next_action = "ASK_QUALIFYING_QUESTION";
    intent = "PRICING_QUESTION";
    cta = "If you're already evaluating a lease this week, wouldn't it make sense to run your real numbers?";
  } else if (isRequestInputsQuestion(input.inbound)) {
    next_action = "REQUEST_NUMBERS";
    intent = "REQUEST_INPUTS";
    cta = "Start here: https://occupancynpv.com/pricing";
  } else if (/what would i need to enter|need to enter\?|try this with my current lease|what would i need to (enter|input)/.test(text)
    || (/\benter\b/.test(text) && /\?/.test(text) && /lease numbers|inputs?\b/.test(text))) {
    next_action = "REQUEST_NUMBERS";
    intent = "TRY_WITH_NUMBERS";
    cta = "Start here: https://occupancynpv.com/pricing";
  } else if (/renew/i.test(input.inbound) && /mov(e|ing)|new location|relocat/i.test(input.inbound)) {
    next_action = "REQUEST_NUMBERS";
    intent = "RENEW_VS_RELOCATE";
    cta = "Wouldn't it make sense to run your actual numbers and see which option comes out stronger?";
  } else if (isPositiveBuyingSignal(input.inbound) || /POSITIVE_INTEREST/i.test(input.intent ?? "")) {
    next_action = "START_TRIAL";
    intent = "POSITIVE_INTEREST";
    cta = "Start here: https://occupancynpv.com/pricing";
  } else if (/couple leases|looking to compare|currently have .{0,48}lease|comparing .{0,24}leases/i.test(input.inbound)
    || (/^(yes|yeah|i do|i have)\b/i.test(input.inbound.trim()) && !/example/i.test(input.inbound)
      && /REQUEST_EXAMPLE|SHOW_REAL_EXAMPLE|ACTIVE_EVALUATION/i.test(input.intent ?? ""))) {
    next_action = "START_TRIAL";
    intent = "ACTIVE_EVALUATION";
    cta = "Start here: https://occupancynpv.com/pricing";
  } else if (/lease-vs-alternative/i.test(input.inbound)) {
    next_action = "BUILD_SCENARIO";
    intent = "REQUEST_EXAMPLE";
    cta = "Want to see that comparison with two real lease numbers?";
  } else if (/example|show me what it would look like/i.test(input.inbound)) {
    next_action = "SHOW_EXAMPLE";
    intent = "REQUEST_EXAMPLE";
    cta = "Do you have two leases you're comparing right now?";
  } else if (hasQuestion && stage === "ENGAGED") {
    next_action = "INVITE_TRIAL";
    intent = input.intent ?? "QUESTION";
    cta = "Why not test both options in the free trial and see what comes out stronger?";
  } else if (stage === "FIRST_TOUCH") {
    next_action = "SHOW_EXAMPLE";
    intent = "NEW_LEAD";
    cta = "Want one short example of how that looks on a real lease?";
  } else if (stage === "POST_SALE") {
    next_action = "FOLLOW_UP";
    cta = "The useful next step is to run the next live comparison in the product.";
  } else {
    const offer = input.offer ?? loadVentureOfferProfile(input.venture_id ?? "occupancynpv");
    const strongest = strongestRelevantOffer(offer, stage);
    if (stage === "HIGH_INTENT") {
      next_action = offer.free_trial_available === true ? "START_TRIAL" : "REQUEST_PURCHASE";
      cta = strongest.cta || "Start now at https://occupancynpv.com/pricing";
    } else if (stage === "QUALIFIED") {
      next_action = offer.free_trial_available === true ? "START_TRIAL" : "REQUEST_NUMBERS";
      cta = strongest.cta;
    } else {
      next_action = "WAIT";
    }
  }
  return {
    stage,
    momentum,
    intent,
    pain: inferPain(input.inbound),
    dream_outcome: inferDreamOutcome(input.inbound),
    objection: objection === "UNKNOWN" ? null : objection,
    next_action,
    cta,
    reason: `${stage}:${intent}:${next_action}`.toLowerCase(),
    guided_sales_mode: next_action !== "SUPPRESS" && next_action !== "WAIT" && (
      stage !== "FIRST_TOUCH" || /interested|tell me more|sounds interesting|example|compar/i.test(input.inbound)
    ),
  };
}

export function evaluateAlwaysClosingSafetyGate(input: {
  suppressed: boolean;
  opt_out: boolean;
  kill_switch: boolean;
  action: CommercialAction;
  fabricated_urgency?: boolean;
  fabricated_personalization?: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if ((input.suppressed || input.opt_out) && input.action !== "SUPPRESS" && input.action !== "WAIT") reasons.push("SALES_BYPASSES_SUPPRESSION");
  if (input.kill_switch && !["WAIT", "SUPPRESS"].includes(input.action)) reasons.push("KILL_SWITCH_IGNORED");
  if (input.fabricated_urgency) reasons.push("FAKE_URGENCY");
  if (input.fabricated_personalization) reasons.push("FAKE_PERSONALIZATION");
  return named("AlwaysClosingSafetyGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["SAFETY_HOLDS"]);
}

export function evaluateSalesAdvancementQualityGate(input: {
  inbound: string;
  generated: string;
  next_action: CommercialAction;
}): NamedOutboundLoopGate {
  const body = input.generated;
  const reasons: string[] = [];
  if (!body.trim()) reasons.push("EMPTY");
  if (/\?|how|what|can you|show/.test(input.inbound) && body.length < 40) reasons.push("QUESTION_NOT_ANSWERED");
  if (/if useful|if you'd like|let me know if/i.test(body)) reasons.push("PASSIVE_DEAD_END");
  if (input.next_action !== "WAIT" && input.next_action !== "SUPPRESS" && !/[?.!]/.test(body.slice(-180))) reasons.push("NO_NEXT_STEP");
  if (input.next_action === "SUPPRESS" && !/stop|unsubscribe/i.test(input.inbound)) reasons.push("INAPPROPRIATE_SUPPRESS");
  return named("SalesAdvancementQualityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["DEAL_ADVANCED"]);
}

export function evaluateSalesConversationStagnationGate(input: {
  answers_without_next_step: number;
  repeated_passive_cta: boolean;
  repeated_product_explanation: boolean;
}): NamedOutboundLoopGate {
  if (input.answers_without_next_step >= 2 || input.repeated_passive_cta || input.repeated_product_explanation) {
    return named("SalesConversationStagnationGate", "FAIL", ["STAGNATING_CONVERSATION"]);
  }
  return named("SalesConversationStagnationGate", "PASS", ["MOMENTUM_PRESENT"]);
}

export function commercialStateSpecificity(state: string | null | undefined): number {
  if (/OPT_OUT|SUPPRESS/i.test(state ?? "")) return 100;
  if (/TRY_WITH_NUMBERS|REQUEST_NUMBERS|REQUEST_INPUTS|INVITE_FREE_TRIAL|INVITE_TRIAL|INVITE_DEMO|REQUEST_PURCHASE|START_TRIAL|SHOW_REAL_EXAMPLE|ACTIVE_EVALUATION|TRY_WITH_REAL_NUMBERS/i.test(state ?? "")) return 80;
  if (/RENEW_VS|HIGH_INTENT|QUALIFIED|ACTIVE_CONVERSATION|ENGAGED|REQUEST_EXAMPLE/i.test(state ?? "")) return 70;
  if (/SHOW_EXAMPLE|NEW_LEAD|WAIT|OPEN|RESPONDED|COLD|UNKNOWN/i.test(state ?? "")) return 20;
  return 40;
}

export function evaluateConversationStateOwnershipGate(input: {
  incoming_source: "GENERIC_TICK" | "COMMUNICATION_RUNTIME" | "SALES_DOCTRINE" | "OPT_OUT";
  incoming_state: string;
  current_state: string | null;
  incoming_next_action?: string | null;
  current_next_action?: string | null;
  incoming_intent?: string | null;
  current_intent?: string | null;
}): NamedOutboundLoopGate {
  if (input.incoming_source === "OPT_OUT" || /OPT_OUT|SUPPRESS/i.test(input.incoming_state) || /SUPPRESS/i.test(input.incoming_next_action ?? "")) {
    return named("ConversationStateOwnershipGate", "PASS", ["OPT_OUT_WINS"]);
  }
  const protectedSales = /ACTIVE_CONVERSATION|TRY_WITH_NUMBERS|REQUEST_NUMBERS|INVITE_FREE_TRIAL|INVITE_TRIAL|QUALIFIED|HIGH_INTENT|ENGAGED/i;
  const weakerGeneric = /^(OPEN|RESPONDED|WAIT|COLD|UNKNOWN|SHOW_EXAMPLE|NEW_LEAD)$/i;
  const currentSpec = Math.max(
    commercialStateSpecificity(input.current_state),
    commercialStateSpecificity(input.current_next_action),
    commercialStateSpecificity(input.current_intent),
  );
  const incomingSpec = Math.max(
    commercialStateSpecificity(input.incoming_state),
    commercialStateSpecificity(input.incoming_next_action),
    commercialStateSpecificity(input.incoming_intent),
  );
  if (currentSpec >= 70 && incomingSpec < currentSpec) {
    return named("ConversationStateOwnershipGate", "FAIL", ["GENERIC_TICK_CLOBBER_BLOCKED"]);
  }
  if (input.incoming_source === "GENERIC_TICK" && protectedSales.test(input.current_state ?? "") && weakerGeneric.test(input.incoming_state)) {
    return named("ConversationStateOwnershipGate", "FAIL", ["GENERIC_TICK_CLOBBER_BLOCKED"]);
  }
  const rank = (state: string | null, source: string) => {
    if (/OPT_OUT|SUPPRESS/i.test(state ?? "") || source === "OPT_OUT") return 100;
    if (source === "SALES_DOCTRINE") return 90;
    if (source === "COMMUNICATION_RUNTIME") return 80;
    if (protectedSales.test(state ?? "")) return 70;
    if (source === "GENERIC_TICK") return 10;
    return 20;
  };
  const allowed = rank(input.incoming_state, input.incoming_source) >= rank(input.current_state, "CURRENT");
  return named("ConversationStateOwnershipGate", allowed ? "PASS" : "FAIL", allowed ? ["SEMANTIC_OWNER_WINS"] : ["GENERIC_TICK_CLOBBER_BLOCKED"]);
}

export const SALES_PROOF_REGISTRY = [
  { id: "occupancynpv-product-surface", kind: "real product capability", claim: "OccupancyNPV compares lease scenarios side by side", verified: true },
  { id: "occupancynpv-npv-value", kind: "real feature", claim: "Shows NPV and property-value impact from shared assumptions", verified: true },
  { id: "occupancynpv-assumptions", kind: "real use case", claim: "Renew vs relocate using rent, increases, occupancy, and exit assumptions", verified: true },
] as const;

export const OCCUPANCYNPV_OFFER_PROFILE = {
  ...loadVentureOfferProfile("occupancynpv"),
  target_personas: ["BROKER", "TENANT_REP", "OWNER", "ASSET_MANAGER", "INVESTOR", "CFO", "FINANCE_TEAM"],
  primary_pains: ["manual scenario rebuilding", "spreadsheet complexity", "slow comparisons", "inconsistent assumptions", "unclear NPV impact"],
  dream_outcomes: ["faster comparison", "clearer decision support", "repeatable analysis", "less spreadsheet rework"],
  core_mechanism: "shared assumptions → side-by-side NPV and property-value impact",
  time_to_value: "one live comparison",
  effort_reduction: "no rebuilt spreadsheet per scenario",
  trial_available: true,
  demo_available: false,
  conversion_action: "start the verified 3-day free trial",
  common_objections: ["STATUS_QUO", "COMPLEXITY", "TIME", "PROOF"],
  upsell_paths: ["portfolio comparisons"],
  retention_paths: ["repeat live-deal analysis"],
  referral_paths: ["broker / tenant-rep colleagues"],
} as const;

export const OCCUPANCYNPV_CONVERSION_PROFILE = {
  primary_cta: "Start Free Trial",
  secondary_cta: "Start One Deal",
  trial_cta: "Start the 3-day free trial",
  demo_cta: "UNKNOWN",
  contact_cta: "reply with the two scenarios",
  pricing_path: "https://occupancynpv.com/pricing",
  checkout_path: "https://occupancynpv.com/pricing",
  lead_form: null,
  conversion_event: "free_trial_started",
  primary_conversion_url: "https://occupancynpv.com/pricing",
} as const;

export function selectSalesCta(stage: SalesStagePolicy, action: CommercialAction, inbound: string): string {
  const decided = selectNextBestCommercialAction({ inbound, intent: action });
  if (decided.cta) return decided.cta;
  if (stage === "FIRST_TOUCH") return "Want one short lease-vs-alternative example next?";
  if (stage === "HIGH_INTENT") return "The next step is to start with one live deal.";
  if (stage === "POST_SALE") return "Run the next comparison in OccupancyNPV.";
  return "Send the two scenarios you're comparing and I can show you how to structure them.";
}

export function planValueAddingFollowUp(input: { momentum: ConversationMomentumState; objection: ObjectionFamily | null }): {
  strategy: string;
  objective: "ADVANCE";
} {
  if (input.momentum === "SUPPRESSED") return { strategy: "CLOSE_LOOP", objective: "ADVANCE" };
  if (input.objection === "PROOF") return { strategy: "PROOF", objective: "ADVANCE" };
  if (input.objection === "COMPLEXITY") return { strategy: "USE_CASE", objective: "ADVANCE" };
  if (input.momentum === "DORMANT" || input.momentum === "QUALIFIED") return { strategy: "RELEVANT_EXAMPLE", objective: "ADVANCE" };
  if (input.momentum === "HIGH_INTENT") return { strategy: "DECISION_CHECK", objective: "ADVANCE" };
  return { strategy: "NEW_INSIGHT", objective: "ADVANCE" };
}

export function planSalesReactivation(input: { quiet: boolean; suppressed: boolean; qualified: boolean }): { allowed: boolean; action: CommercialAction } {
  if (input.suppressed) return { allowed: false, action: "SUPPRESS" };
  if (input.quiet && input.qualified) return { allowed: true, action: "REACTIVATE" };
  return { allowed: false, action: "WAIT" };
}

export const LOST_DEAL_REASONS = [
  "NO_NEED", "NO_BUDGET", "NO_AUTHORITY", "NO_TIMING", "COMPETITOR", "PRODUCT_GAP", "TRUST", "PRICE", "IMPLEMENTATION", "UNRESPONSIVE", "UNKNOWN",
] as const;

export function classifyLostDealReason(text: string): (typeof LOST_DEAL_REASONS)[number] {
  const family = classifyCommercialObjection(text);
  if (family === "NEED") return "NO_NEED";
  if (family === "BUDGET" || family === "PRICE") return family === "BUDGET" ? "NO_BUDGET" : "PRICE";
  if (family === "AUTHORITY") return "NO_AUTHORITY";
  if (family === "TIMING") return "NO_TIMING";
  if (family === "COMPETITOR") return "COMPETITOR";
  if (family === "FEATURE") return "PRODUCT_GAP";
  if (family === "TRUST") return "TRUST";
  if (family === "IMPLEMENTATION") return "IMPLEMENTATION";
  if (/no reply|unresponsive|ghost/.test(text.toLowerCase())) return "UNRESPONSIVE";
  return "UNKNOWN";
}

export function planCustomerExpansion(input: { signal: "ACTIVATE" | "RETAIN" | "EXPAND" | "REFER" }): CommercialAction {
  if (input.signal === "REFER") return "ASK_FOR_REFERRAL";
  if (input.signal === "EXPAND") return "OFFER_UPSELL";
  if (input.signal === "RETAIN") return "OFFER_RENEWAL";
  return "FOLLOW_UP";
}

export type SalesPriorityItem = {
  conversation_id: string;
  score: number;
  reason: string;
};

export function rankSalesPriorityQueue(items: Array<{
  conversation_id: string;
  intent?: string | null;
  recency_hours: number;
  suppressed?: boolean;
  momentum?: ConversationMomentumState;
}>): SalesPriorityItem[] {
  return items
    .filter((row) => !row.suppressed)
    .map((row) => {
      let score = 10;
      if (row.momentum === "HIGH_INTENT") score += 50;
      if (row.momentum === "QUALIFIED" || row.momentum === "EVALUATING") score += 30;
      if (row.momentum === "ENGAGED") score += 20;
      if (/PURCHASE|TRIAL|RENEW_VS/.test(row.intent ?? "")) score += 15;
      score += Math.max(0, 24 - row.recency_hours);
      return { conversation_id: row.conversation_id, score, reason: row.momentum ?? "COLD" };
    })
    .sort((a, b) => b.score - a.score);
}

export const FACTORY_INHERITED_SALES_DOCTRINE = [
  "VentureOfferProfile",
  "VentureConversionProfile",
  "SalesStageResponsePolicy",
  "NextBestCommercialActionEngine",
  "SalesCTAEngine",
  "ConversationMomentumState",
  "Objection Intelligence",
  "SalesProofRegistry",
  "Sales Learning",
  "Sales Attribution",
  "AlwaysClosingSafetyGate",
  "SalesAdvancementQualityGate",
  "SalesConversationStagnationGate",
] as const;

export function factoryVentureSalesDoctrinePlan(venture_id: string) {
  return {
    venture_id,
    inherits: [...FACTORY_INHERITED_SALES_DOCTRINE],
    commercial_objective: PRIMARY_COMMERCIAL_OBJECTIVE,
    outbound_mode: "CANARY" as const,
  };
}

export const COMMERCIAL_LEARNING_METRICS = [
  "QUALIFIED_RESPONSE_RATE",
  "CONVERSATION_PROGRESSION_RATE",
  "TRIAL_RATE",
  "DEMO_RATE",
  "PROPOSAL_RATE",
  "PURCHASE_RATE",
  "RETENTION_RATE",
  "EXPANSION_RATE",
  "REFERRAL_RATE",
] as const;
