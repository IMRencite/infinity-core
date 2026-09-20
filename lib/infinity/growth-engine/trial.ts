import {
  FREE_TRIAL_OFFER_CONTRACT,
  TRIAL_FULFILLMENT_CONTRACT,
  USAGE_LIMITED_TRIAL_CONTRACT,
  type NamedGrowthGate,
  type TrialSuitability,
} from "./contract";

export type FreeTrialOffer = {
  contract: typeof FREE_TRIAL_OFFER_CONTRACT;
  venture_id: string;
  offer_id: string;
  trial_enabled: boolean;
  duration: number | null;
  duration_unit: "DAY" | "WEEK" | "MONTH" | null;
  usage_limit: string | null;
  payment_method_required: boolean;
  auto_conversion_enabled: boolean;
  post_trial_offer: string | null;
  post_trial_price: string | null;
  billing_interval: string | null;
  trial_entitlement: string;
  limitations: string[];
  start_event: string;
  end_event: string;
  conversion_event: string;
  cancellation_policy: string;
  reminder_policy: string;
  abuse_controls: string[];
  eligibility: string;
  consent_evidence: string | null;
  status: "DESIGNED" | "DISABLED" | "AUTHORIZED" | "ACTIVE";
};

export type UsageLimitedTrial = {
  contract: typeof USAGE_LIMITED_TRIAL_CONTRACT;
  venture_id: string;
  limit_kind: "FIRST_REPORT" | "FIRST_COMPARISON" | "ONE_WORKSPACE" | "ONE_LOCATION" | "LIMITED_EXPORTS" | "LIMITED_CALCULATIONS";
  limit_count: number;
  enabled: boolean;
};

export function evaluateFreeTrialSuitabilityGate(input: {
  timeToValue: "FAST" | "MEDIUM" | "SLOW" | "UNKNOWN";
  usageFrequency: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  marginalCost: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  providerCost: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  supportBurden: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  abuseRisk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  competitiveNormsIncludeTrial: boolean;
  purchaseFriction: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
}): { gate: string; result: TrialSuitability; reasons: string[] } {
  const unknowns = Object.entries(input).filter(([, value]) => value === "UNKNOWN").map(([key]) => key);
  if (input.marginalCost === "HIGH" || input.providerCost === "HIGH" || input.abuseRisk === "HIGH") {
    return { gate: "FreeTrialSuitabilityGate", result: "NOT_RECOMMENDED", reasons: ["HIGH_COST_OR_ABUSE", ...unknowns.map((key) => `UNKNOWN:${key}`)] };
  }
  if (input.timeToValue === "FAST" && input.marginalCost === "LOW") {
    return { gate: "FreeTrialSuitabilityGate", result: "TEST", reasons: ["FAST_TTV_LOW_MARGINAL_COST", ...unknowns.map((key) => `UNKNOWN:${key}`)] };
  }
  if (input.competitiveNormsIncludeTrial && input.purchaseFriction === "HIGH") {
    return { gate: "FreeTrialSuitabilityGate", result: "TEST", reasons: ["COMPETITIVE_NORM_PLUS_FRICTION", ...unknowns.map((key) => `UNKNOWN:${key}`)] };
  }
  if (input.timeToValue === "UNKNOWN" && input.marginalCost === "UNKNOWN") {
    return { gate: "FreeTrialSuitabilityGate", result: "INSUFFICIENT_EVIDENCE", reasons: unknowns.map((key) => `UNKNOWN:${key}`) };
  }
  return { gate: "FreeTrialSuitabilityGate", result: "INSUFFICIENT_EVIDENCE", reasons: ["NO_UNIVERSAL_DEFAULT", ...unknowns.map((key) => `UNKNOWN:${key}`)] };
}

export function evaluateTrialActivationGate(input: {
  enabled: boolean;
  authorized: boolean;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (input.enabled && !input.authorized) reasons.push("TRIAL_NOT_AUTHORIZED");
  return { gate: "TrialActivationGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateTrialAbuseRiskGate(input: {
  invasiveSurveillance: boolean;
  proportionateControls: boolean;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (input.invasiveSurveillance) reasons.push("INVASIVE_SURVEILLANCE");
  if (!input.proportionateControls) reasons.push("CONTROLS_NOT_PROPORTIONATE");
  return { gate: "TrialAbuseRiskGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateAutoConversionSafety(input: {
  explicitConsent: boolean;
  durationShown: boolean;
  postTrialPriceShown: boolean;
  billingFrequencyShown: boolean;
  billingDateShown: boolean;
  paymentMethodValid: boolean;
  customerCancelled: boolean;
  paymentPathHealthy: boolean;
  fulfillmentHealthy: boolean;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (!input.explicitConsent) reasons.push("CONSENT_MISSING");
  if (!input.durationShown) reasons.push("DURATION_UNDISCLOSED");
  if (!input.postTrialPriceShown) reasons.push("POST_TRIAL_PRICE_UNDISCLOSED");
  if (!input.billingFrequencyShown) reasons.push("BILLING_FREQUENCY_UNDISCLOSED");
  if (!input.billingDateShown) reasons.push("BILLING_DATE_UNDISCLOSED");
  if (!input.paymentMethodValid) reasons.push("PAYMENT_METHOD_INVALID");
  if (input.customerCancelled) reasons.push("CANCELLED_BEFORE_BILLING");
  if (!input.paymentPathHealthy) reasons.push("PAYMENT_PATH_UNHEALTHY");
  if (!input.fulfillmentHealthy) reasons.push("FULFILLMENT_UNHEALTHY");
  return { gate: "TrialAutoConversionSafetyGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function trialContractsPresent(): string[] {
  return [FREE_TRIAL_OFFER_CONTRACT, USAGE_LIMITED_TRIAL_CONTRACT, TRIAL_FULFILLMENT_CONTRACT];
}
