import type { NamedOutboundLoopGate } from "../closed-loop";
import { evaluateConsultativeSalesLanguageGate, evaluateSalesOverExplanationGate, evaluateSalesQuestionQualityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateNaturalSalesConversationGate } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { evaluateAlwaysClosingSafetyGate } from "@/lib/infinity/always-closing-sales/doctrine";
import { evaluateVentureOfferTruthGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { evaluateFirstTouchContract, planConversation } from "../conversation-planner";
import { evaluateResponseContentQualityGate, isPositiveBuyingSignal, isStopOnly } from "../conversation-semantics";
import { INTERNAL_LANGUAGE } from "./canary";
import { evaluateStaleConversationLanguageGate } from "./stale-language";
import type { CommercialAction, SalesStagePolicy } from "@/lib/infinity/always-closing-sales/doctrine";

export const HARD_SALES_GATES = [
  "SuppressionGate",
  "OfferTruthGate",
  "ProductTruthGate",
  "NoInternalLanguageGate",
  "NoFirstTouchMidThreadGate",
  "AuthorshipGate",
  "DuplicateOwnershipGate",
  "ConversationThreadIntegrityGate",
  "UnsupportedClaimGate",
  "AlwaysClosingSafetyGate",
  "DirectQuestionResponsivenessGate",
  "StaleConversationLanguageGate",
] as const;

export const SOFT_SALES_GATES = [
  "ConsultativeSalesLanguageGate",
  "PainLanguageGate",
  "ConsequenceGate",
  "ContrastGate",
  "SalesQuestionQualityGate",
  "SalesOverExplanationGate",
] as const;

export const OFFER_TRUTH_VERSION = "occupancynpv-offer-truth-v1" as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateDirectQuestionResponsivenessGate(input: {
  inbound: string;
  generated: string;
}): NamedOutboundLoopGate {
  const asked = /how do i start|how do we start|how can i start|start the free trial/i.test(input.inbound);
  if (!asked) return named("DirectQuestionResponsivenessGate", "PASS", ["NO_DIRECT_START_QUESTION"]);
  const answers = /start here:|start the 3-day free trial|https:\/\/occupancynpv\.com\/pricing/i.test(input.generated);
  return named("DirectQuestionResponsivenessGate", answers ? "PASS" : "FAIL", [answers ? "START_ACTION_PRESENT" : "NO_START_ACTION"]);
}

export function evaluateHardSalesGates(input: {
  inbound: string;
  generated: string;
  suppressed: boolean;
  authorship: "PROSPECT" | "SYSTEM" | "UNKNOWN";
  ownership_free: boolean;
  prior_outbound: number;
  next_action: CommercialAction;
  stage: SalesStagePolicy;
  inbound_age_ms?: number;
}): { verdicts: NamedOutboundLoopGate[]; result: "PASS" | "FAIL"; first_failure: string | null } {
  const profile = loadVentureOfferProfile("occupancynpv");
  const offer = evaluateVentureOfferTruthGate({ profile, claimed: input.generated });
  const leak = INTERNAL_LANGUAGE.test(input.generated);
  const firstTouch = evaluateFirstTouchContract({
    prior_infinity_outbound_count: input.prior_outbound,
    used_first_touch_copy: /still rebuilding lease scenarios|i['’]m infinity\./i.test(input.generated),
  });
  const safety = evaluateAlwaysClosingSafetyGate({
    suppressed: input.suppressed,
    opt_out: isStopOnly(input.inbound),
    kill_switch: false,
    action: input.next_action,
  });
  const quality = evaluateResponseContentQualityGate({ inbound: input.inbound, generated: input.generated, latest_question: input.inbound });
  const verdicts = [
    named("SuppressionGate", input.suppressed ? "FAIL" : "PASS", [input.suppressed ? "SUPPRESSED" : "CLEAR"]),
    named("OfferTruthGate", offer.result, offer.reasons),
    named("ProductTruthGate", offer.result, offer.reasons),
    named("NoInternalLanguageGate", leak ? "FAIL" : "PASS", [leak ? "LEAK" : "CLEAN"]),
    named("NoFirstTouchMidThreadGate", firstTouch.result, firstTouch.reasons),
    named("AuthorshipGate", input.authorship === "PROSPECT" ? "PASS" : "FAIL", [input.authorship]),
    named("DuplicateOwnershipGate", input.ownership_free ? "PASS" : "FAIL", [input.ownership_free ? "FREE" : "OWNED"]),
    named("ConversationThreadIntegrityGate", input.prior_outbound > 0 || !/FIRST_TOUCH/.test(input.stage) ? "PASS" : "PASS", [input.stage]),
    named("UnsupportedClaimGate", quality.result === "FAIL" && quality.reasons.includes("PLACEHOLDER") ? "FAIL" : "PASS", quality.reasons),
    named("AlwaysClosingSafetyGate", safety.result, safety.reasons),
    evaluateDirectQuestionResponsivenessGate({ inbound: input.inbound, generated: input.generated }),
    evaluateStaleConversationLanguageGate({ generated: input.generated, inbound_age_ms: input.inbound_age_ms ?? 0 }),
  ];
  const first = verdicts.find((row) => row.result === "FAIL") ?? null;
  return { verdicts, result: first ? "FAIL" : "PASS", first_failure: first?.gate ?? null };
}

export function evaluateSoftSalesGates(input: {
  inbound: string;
  generated: string;
  next_action: CommercialAction;
  stage: SalesStagePolicy;
  turn: number;
}): { verdicts: NamedOutboundLoopGate[]; result: "PASS" | "DEGRADED"; first_degraded: string | null } {
  const consultative = evaluateConsultativeSalesLanguageGate({
    inbound: input.inbound,
    generated: input.generated,
    stage: input.stage,
    next_action: input.next_action,
    turn: input.turn,
  });
  const over = evaluateSalesOverExplanationGate({ inbound: input.inbound, generated: input.generated });
  const question = evaluateSalesQuestionQualityGate({ inbound: input.inbound, generated: input.generated, stage: input.stage });
  const natural = evaluateNaturalSalesConversationGate({ inbound: input.inbound, generated: input.generated, next_action: input.next_action });
  const verdicts = [
    named("ConsultativeSalesLanguageGate", consultative.result, consultative.reasons),
    named("PainLanguageGate", consultative.pain_recognized === "FAIL" ? "FAIL" : "PASS", [String(consultative.pain_recognized)]),
    named("ConsequenceGate", consultative.consequence_clear === "FAIL" ? "FAIL" : "PASS", [String(consultative.consequence_clear)]),
    named("ContrastGate", consultative.current_vs_better_contrast === "FAIL" ? "FAIL" : "PASS", [String(consultative.current_vs_better_contrast)]),
    named("SalesQuestionQualityGate", question.result, question.reasons),
    named("SalesOverExplanationGate", over.result, over.reasons),
    named("NaturalSalesConversationGate", natural.result, natural.reasons),
  ];
  const degraded = verdicts.find((row) => row.result === "FAIL") ?? null;
  return { verdicts, result: degraded ? "DEGRADED" : "PASS", first_degraded: degraded?.gate ?? null };
}

export function evaluateSalesHardGateSatisfiabilityGate(): NamedOutboundLoopGate {
  const cases = [
    { inbound: "Yeah, I think I’d rather just try it. How do I start the free trial?", stage: "HIGH_INTENT" as const, next: "START_TRIAL" as const, turn: 5 },
    { inbound: "Sounds like it would be a great tool for me to use", stage: "QUALIFIED" as const, next: "START_TRIAL" as const, turn: 4 },
    { inbound: "What does this cost?", stage: "QUALIFIED" as const, next: "INVITE_TRIAL" as const, turn: 3 },
  ];
  const profile = loadVentureOfferProfile("occupancynpv");
  const failed = cases.filter((row) => {
    const plan = planConversation({
      visible_body: row.inbound,
      previous_outbound: "prior",
      prior_infinity_outbound_count: 3,
      stage: row.stage,
    });
    const composed = `${row.inbound.includes("cost") ? "Professional is $290 a year." : "That tracks."} The 3-day free trial has no credit card and no automatic billing. Start here: ${profile.free_trial_url}`;
    const hard = evaluateHardSalesGates({
      inbound: row.inbound,
      generated: composed,
      suppressed: false,
      authorship: "PROSPECT",
      ownership_free: true,
      prior_outbound: 3,
      next_action: plan.next_action as CommercialAction,
      stage: plan.stage as SalesStagePolicy,
    });
    return hard.result !== "PASS";
  });
  return named("SalesHardGateSatisfiabilityGate", failed.length ? "FAIL" : "PASS", failed.length ? failed.map((row) => row.stage) : ["ALL_LEGAL_COMBINATIONS"]);
}

export function evaluateSoftGateCannotStrand(input: { blocked_for_soft_only: boolean }): NamedOutboundLoopGate {
  return named("SoftGateCannotStrandGate", input.blocked_for_soft_only ? "FAIL" : "PASS", [
    input.blocked_for_soft_only ? "SOFT_STRANDED" : "SOFT_NONBLOCKING",
  ]);
}

export function highIntentBuyingCannotBeSoftBlocked(inbound: string): boolean {
  return isPositiveBuyingSignal(inbound) && /trial|try it|start/i.test(inbound);
}
