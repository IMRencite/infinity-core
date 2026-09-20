import type { NamedOutboundLoopGate } from "../closed-loop";
import { isPositiveBuyingSignal, isStopOnly } from "../conversation-semantics";
import { evaluateOfferDrivenSalesAdvancementGate, evaluateVentureOfferTruthGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { evaluateConsultativeSalesLanguageGate, evaluateSalesQuestionQualityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateResponseContentQualityGate } from "../conversation-semantics";
import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "../email-signature";

export const HIGH_INTENT_FALLBACK_BODY = `That tracks. If you are ready to try it, start the 3-day free trial — no credit card and no automatic billing.

Start here: https://occupancynpv.com/pricing

${OCCUPANCYNPV_EMAIL_SIGNATURE}`.trim();

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function highIntentFallbackAllowed(input: {
  authorship: "PROSPECT" | "SYSTEM" | "UNKNOWN" | string;
  suppressed: boolean;
  offer_current: boolean;
  thread_valid: boolean;
  ownership_free: boolean;
}): boolean {
  return input.authorship === "PROSPECT"
    && !input.suppressed
    && input.offer_current
    && input.thread_valid
    && input.ownership_free
    && !isStopOnly("");
}

export function composeHighIntentOfferFallback(inbound: string): { body: string; strategy: "HIGH_INTENT_OFFER_TRUTH_FALLBACK" } {
  void inbound;
  return { body: HIGH_INTENT_FALLBACK_BODY, strategy: "HIGH_INTENT_OFFER_TRUTH_FALLBACK" };
}

export function evaluateHighIntentSalesFallbackGate(inbound = "Yeah, I think I’d rather just try it. How do I start the free trial?"): NamedOutboundLoopGate {
  if (!isPositiveBuyingSignal(inbound)) return named("HighIntentSalesFallbackGate", "FAIL", ["NOT_HIGH_INTENT"]);
  const body = composeHighIntentOfferFallback(inbound).body;
  const profile = loadVentureOfferProfile("occupancynpv");
  const offer = evaluateVentureOfferTruthGate({ profile, claimed: body });
  const advancement = evaluateOfferDrivenSalesAdvancementGate({
    stage: "HIGH_INTENT",
    profile,
    generated: body,
    next_action: "START_TRIAL",
    inbound,
  });
  const quality = evaluateResponseContentQualityGate({ inbound, generated: body, latest_question: inbound });
  const consultative = evaluateConsultativeSalesLanguageGate({
    inbound,
    generated: body,
    stage: "HIGH_INTENT",
    next_action: "START_TRIAL",
    turn: 5,
  });
  const question = evaluateSalesQuestionQualityGate({ inbound, generated: body, stage: "HIGH_INTENT" });
  const leak = /canonical|runtime|planner|obligation|eligible_at|DealWorkspace/i.test(body);
  const pass = offer.result === "PASS"
    && advancement.result === "PASS"
    && quality.result === "PASS"
    && consultative.result === "PASS"
    && question.result === "PASS"
    && /3-day/i.test(body)
    && /no credit card/i.test(body)
    && /no automatic billing/i.test(body)
    && /occupancynpv.com\/pricing/i.test(body)
    && !leak;
  return named("HighIntentSalesFallbackGate", pass ? "PASS" : "FAIL", pass ? ["FALLBACK_VALID"] : [
    offer.result, advancement.result, quality.result, consultative.result, question.result,
  ]);
}

export function evaluateSalesGateMutualSatisfiabilityGate(inbound = "How do I start the free trial?"): NamedOutboundLoopGate {
  return named(
    "SalesGateMutualSatisfiabilityGate",
    evaluateHighIntentSalesFallbackGate(inbound).result,
    ["HIGH_INTENT_TEMPLATE"],
  );
}

export function evaluateSemanticRetryDiversityGate(input: {
  previous_strategy: string;
  new_strategy: string;
  rejection_reason: string;
  repair_action: string;
}): NamedOutboundLoopGate {
  const changed = Boolean(input.previous_strategy)
    && Boolean(input.new_strategy)
    && input.previous_strategy !== input.new_strategy
    && Boolean(input.repair_action);
  return named("SemanticRetryDiversityGate", changed ? "PASS" : "FAIL", [
    input.previous_strategy,
    input.new_strategy,
    input.rejection_reason,
  ]);
}

export function evaluateInRunSemanticRetryGate(input: { same_run: boolean; scheduler_cycle_consumed: boolean }): NamedOutboundLoopGate {
  return named(
    "InRunSemanticRetryGate",
    input.same_run && !input.scheduler_cycle_consumed ? "PASS" : "FAIL",
    [input.same_run ? "IN_RUN" : "DEFERRED", input.scheduler_cycle_consumed ? "ATE_TICK" : "NO_TICK"],
  );
}
