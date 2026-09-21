import type { NamedOutboundLoopGate } from "../closed-loop";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type PublicPresence = "PASS" | "FAIL" | "RENDER_NOT_PROVEN" | "NOT_PROVEN";
export type CommercialClaimEvidence = "STATED_ON_PAGE" | "CORROBORATED_BY_FLOW" | "CONFLICT" | "NOT_PROVEN";

export function classifyPageCopyClaim(input: {
  stated_on_page: boolean;
  flow_corroborated: boolean | null;
  conflict: boolean;
}): CommercialClaimEvidence {
  if (input.conflict) return "CONFLICT";
  if (input.flow_corroborated === true) return "CORROBORATED_BY_FLOW";
  if (input.stated_on_page) return "STATED_ON_PAGE";
  return "NOT_PROVEN";
}

export function classifyPublicPresence(input: {
  html_contains: boolean;
  js_rendered: boolean;
  rendered_verified: boolean;
}): PublicPresence {
  if (input.html_contains) return "PASS";
  if (input.js_rendered && !input.rendered_verified) return "RENDER_NOT_PROVEN";
  return "FAIL";
}

export function evaluateBillingFlowCorroborationGate(input: {
  payment_fields_before_trial: boolean | null;
  inspected_without_business_event: boolean;
}): NamedOutboundLoopGate {
  if (!input.inspected_without_business_event || input.payment_fields_before_trial === null) {
    return named("BillingFlowCorroborationGate", "NOT_PROVEN" as NamedOutboundLoopGate["result"], ["NOT_PROVEN"]);
  }
  return named("BillingFlowCorroborationGate", input.payment_fields_before_trial ? "FAIL" : "PASS", [
    input.payment_fields_before_trial ? "PAYMENT_BEFORE_TRIAL" : "NO_PAYMENT_BEFORE_TRIAL",
  ]);
}

export function evaluateOfferTruthCorroborationGate(input: {
  founder_attested: boolean;
  pricing_page: boolean;
  start_cta: PublicPresence;
  start_destination: PublicPresence;
}): NamedOutboundLoopGate {
  if (!input.founder_attested) return named("OfferTruthCorroborationGate", "FAIL", ["AWAITING_HUMAN"]);
  if (!input.pricing_page) return named("OfferTruthCorroborationGate", "FAIL", ["PRICING_PAGE"]);
  if (input.start_cta === "FAIL" || input.start_destination === "FAIL") {
    return named("OfferTruthCorroborationGate", "FAIL", ["START_ACTION"]);
  }
  return named("OfferTruthCorroborationGate", "PASS", ["FOUNDER_ATTESTED", input.start_cta]);
}
