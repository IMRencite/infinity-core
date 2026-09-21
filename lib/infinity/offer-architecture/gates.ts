import { evaluateActionSpendAuthorizationGate } from "@/lib/infinity/venture-financial-governance/gates";
import { evaluateFulfillmentReadinessGate } from "@/lib/infinity/fulfillment/gates";
import { evaluatePaymentPathReadinessGate } from "@/lib/infinity/payment-path/readiness";
import type { LivePaymentPathVerificationRecord } from "@/lib/infinity/payment-path/types";
import type { FulfillmentReadinessEvidence } from "@/lib/infinity/fulfillment/gates";
import type { NamedOfferGate, OfferArchitectureContract, TrialPolicy } from "./types";
import {
  FREE_OFFER_ECONOMIC_SAFETY_GATE,
  OFFER_ACTIVATION_GATE,
  OFFER_ARCHITECTURE_READINESS_GATE,
  OFFER_DISCLOSURE_QC_GATE,
  OFFER_ECONOMICS_QC_GATE,
  OFFER_FULFILLMENT_COMPATIBILITY_GATE,
  OFFER_PAYMENT_COMPATIBILITY_GATE,
  TRIAL_DISCLOSURE_QC_GATE,
} from "./types";
import type { OfferEconomicsEvaluation } from "./economics";
import { unknownCostTreatedAsZero } from "./economics";

export function evaluateOfferArchitectureReadinessGate(input: {
  offer: OfferArchitectureContract | null;
  commercial_venture: boolean;
  exempted?: boolean;
  exemption_reason?: string;
}): NamedOfferGate {
  if (!input.commercial_venture) return { gate: OFFER_ARCHITECTURE_READINESS_GATE, result: "PASS", reasons: ["NON_COMMERCIAL"] };
  if (input.offer) return { gate: OFFER_ARCHITECTURE_READINESS_GATE, result: "PASS", reasons: [] };
  if (input.exempted && input.exemption_reason) {
    return { gate: OFFER_ARCHITECTURE_READINESS_GATE, result: "PASS", reasons: [`EXEMPTED:${input.exemption_reason}`] };
  }
  return { gate: OFFER_ARCHITECTURE_READINESS_GATE, result: "FAIL", reasons: ["OFFER_ARCHITECTURE_MISSING"] };
}

export function evaluateOfferDisclosureQCGate(offer: OfferArchitectureContract): NamedOfferGate {
  const reasons: string[] = [];
  if (!offer.price.display || offer.price.display === "") reasons.push("PRICE_UNDISCLOSED");
  if (!offer.offer_name) reasons.push("OFFER_NAME_MISSING");
  if (!offer.conversion_path) reasons.push("CONVERSION_PATH_MISSING");
  return { gate: OFFER_DISCLOSURE_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateTrialDisclosureQCGate(trial: TrialPolicy): NamedOfferGate {
  const reasons: string[] = [];
  if (!trial.enabled || trial.kind === "NONE" || trial.kind === "NOT_APPLICABLE") {
    return { gate: TRIAL_DISCLOSURE_QC_GATE, result: "PASS", reasons: ["TRIAL_NOT_APPLICABLE"] };
  }
  if (trial.auto_convert) {
    if (trial.explicit_customer_authorization !== true) reasons.push("EXPLICIT_AUTHORIZATION_REQUIRED");
    if (!trial.duration || trial.duration === "UNKNOWN") reasons.push("TRIAL_DURATION_UNDEFINED");
    if (!trial.post_trial_price || trial.post_trial_price === "UNKNOWN") reasons.push("POST_TRIAL_PRICE_UNDEFINED");
    if (!trial.billing_date || trial.billing_date === "UNKNOWN") reasons.push("BILLING_DATE_UNDEFINED");
    if (!trial.billing_frequency || trial.billing_frequency === "UNKNOWN") reasons.push("BILLING_FREQUENCY_UNDEFINED");
    if (!trial.cancellation_path || trial.cancellation_path === "UNKNOWN") reasons.push("CANCELLATION_UNAVAILABLE");
  }
  return { gate: TRIAL_DISCLOSURE_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateOfferEconomicsQCGate(economics: OfferEconomicsEvaluation): NamedOfferGate {
  const reasons: string[] = [];
  for (const [key, value] of Object.entries(economics)) {
    if (unknownCostTreatedAsZero(value)) reasons.push(`UNKNOWN_COST_ZERO:${key}`);
  }
  return { gate: OFFER_ECONOMICS_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateOfferPaymentCompatibilityGate(verification: LivePaymentPathVerificationRecord | null): NamedOfferGate {
  const payment = evaluatePaymentPathReadinessGate(verification);
  return {
    gate: OFFER_PAYMENT_COMPATIBILITY_GATE,
    result: payment.result,
    reasons: payment.result === "PASS" ? [] : [...payment.reasons, "PAYMENT_READINESS_REQUIRED"],
  };
}

export function evaluateOfferFulfillmentCompatibilityGate(evidence?: FulfillmentReadinessEvidence): NamedOfferGate {
  const fulfillment = evaluateFulfillmentReadinessGate(evidence);
  return {
    gate: OFFER_FULFILLMENT_COMPATIBILITY_GATE,
    result: fulfillment.result === "PASS" ? "PASS" : "FAIL",
    reasons: fulfillment.result === "PASS" ? [] : [...fulfillment.reasons, "FULFILLMENT_READINESS_REQUIRED"],
  };
}

export function evaluateFreeOfferEconomicSafetyGate(input: {
  infrastructure_cost: number | null;
  provider_cost: number | null;
  support_cost: number | null;
  fulfillment_cost: number | null;
  fraud_abuse_cost: number | null;
  opportunity_cost: number | null;
  treated_as_economically_free?: boolean;
}): NamedOfferGate {
  const reasons: string[] = [];
  if (input.treated_as_economically_free) reasons.push("FREE_IS_NOT_ZERO_COST");
  const costs = [
    input.infrastructure_cost,
    input.provider_cost,
    input.support_cost,
    input.fulfillment_cost,
    input.fraud_abuse_cost,
    input.opportunity_cost,
  ];
  if (costs.some((row) => row == null)) reasons.push("UNKNOWN_FREE_OFFER_COST");
  if (costs.some((row) => row === 0 && row != null) && costs.some((row) => row == null)) {
    reasons.push("UNKNOWN_COST_NOT_ZERO");
  }
  return { gate: FREE_OFFER_ECONOMIC_SAFETY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateOfferActivationGate(input: {
  commercial_economics: "PASS" | "FAIL";
  payment: NamedOfferGate;
  fulfillment: NamedOfferGate;
  capital: ReturnType<typeof evaluateActionSpendAuthorizationGate> | { result: "PASS" | "FAIL"; reasons: string[] };
  legal_policy: "PASS" | "FAIL";
  customer_disclosure: NamedOfferGate;
  qc: "PASS" | "FAIL";
  trial: NamedOfferGate;
  free_safety?: NamedOfferGate;
  analysis_only?: boolean;
}): NamedOfferGate {
  const reasons: string[] = [];
  if (input.analysis_only) reasons.push("ANALYSIS_ONLY_NO_ACTIVATION");
  if (input.commercial_economics !== "PASS") reasons.push("COMMERCIAL_ECONOMICS_FAIL");
  if (input.payment.result !== "PASS") reasons.push("PAYMENT_READINESS_FAIL");
  if (input.fulfillment.result !== "PASS") reasons.push("FULFILLMENT_READINESS_FAIL");
  if (input.capital.result !== "PASS") reasons.push("CAPITAL_FAIL", ...(input.capital.reasons ?? []));
  if (input.legal_policy !== "PASS") reasons.push("LEGAL_POLICY_FAIL");
  if (input.customer_disclosure.result !== "PASS") reasons.push("CUSTOMER_DISCLOSURE_FAIL");
  if (input.qc !== "PASS") reasons.push("QC_FAIL");
  if (input.trial.result !== "PASS") reasons.push("TRIAL_DISCLOSURE_FAIL");
  if (input.free_safety && input.free_safety.result !== "PASS") reasons.push("FREE_OFFER_ECONOMIC_SAFETY_FAIL");
  return { gate: OFFER_ACTIVATION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function abuseControlsFor(risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"): string[] {
  if (risk === "LOW") return ["identity_account_limit"];
  if (risk === "MEDIUM") return ["identity_account_limit", "usage_limit", "workspace_limit"];
  if (risk === "HIGH") return ["identity_account_limit", "usage_limit", "workspace_limit", "transaction_limit", "rate_limit", "duplicate_abuse_detection"];
  return ["UNKNOWN — apply only after risk is evidenced"];
}
