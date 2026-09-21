import { classified, unknownValue } from "@/lib/infinity/venture-economics/classified";
import type { ClassifiedValue } from "@/lib/infinity/venture-economics/types";
import { UNKNOWN } from "./types";
import type { OfferType } from "./types";

export type OfferEconomicsInput = {
  price_usd?: number | null;
  expected_conversion?: number | null;
  trial_to_paid?: number | null;
  fulfillment_cost_usd?: number | null;
  provider_cost_usd?: number | null;
  support_cost_usd?: number | null;
  refund_rate?: number | null;
  abuse_rate?: number | null;
  cac_usd?: number | null;
  ltv_usd?: number | null;
  offer_type: OfferType;
};

export type OfferEconomicsEvaluation = {
  expected_revenue: ClassifiedValue;
  expected_gross_margin: ClassifiedValue;
  expected_contribution_margin: ClassifiedValue;
  conversion_effect: ClassifiedValue;
  trial_to_paid_conversion: ClassifiedValue;
  fulfillment_cost: ClassifiedValue;
  provider_cost: ClassifiedValue;
  support_cost: ClassifiedValue;
  refund_risk: ClassifiedValue;
  abuse_risk: ClassifiedValue;
  cash_timing: ClassifiedValue;
  payback: ClassifiedValue;
  capital_exposure: ClassifiedValue;
};

function money(label: string, value: number | null | undefined, note: string): ClassifiedValue {
  if (value == null) return unknownValue(label, note);
  return classified(`$${value}`, "DERIVED", note, value, "usd");
}

export function evaluateOfferEconomics(input: OfferEconomicsInput): OfferEconomicsEvaluation {
  const price = input.price_usd ?? null;
  const fulfillment = input.fulfillment_cost_usd ?? null;
  const provider = input.provider_cost_usd ?? null;
  const support = input.support_cost_usd ?? null;
  const knownCosts = [fulfillment, provider, support].filter((row): row is number => row != null);
  const unknownCost = fulfillment == null || provider == null || support == null;
  const gross = price != null && fulfillment != null && provider != null
    ? price - fulfillment - provider
    : null;
  const contribution = gross != null && support != null ? gross - support : null;
  return {
    expected_revenue: money("expected revenue", price, "Price is not the complete offer; missing volume stays UNKNOWN."),
    expected_gross_margin: money("gross margin", gross, unknownCost ? "UNKNOWN cost is not treated as zero." : "Price minus known fulfillment and provider cost."),
    expected_contribution_margin: money("contribution margin", contribution, "Support and unknown costs remain UNKNOWN, not $0."),
    conversion_effect: input.expected_conversion == null
      ? unknownValue("conversion effect", "No observed conversion evidence.")
      : classified(`${Math.round(input.expected_conversion * 100)}%`, "ESTIMATED", "Modeled conversion, not observed.", input.expected_conversion, "ratio"),
    trial_to_paid_conversion: input.trial_to_paid == null
      ? unknownValue("trial-to-paid", input.offer_type.includes("TRIAL") || input.offer_type.includes("FREE") ? "Trial/free conversion is unobserved." : "Not a trial offer.")
      : classified(`${Math.round(input.trial_to_paid * 100)}%`, "ESTIMATED", "Trial-to-paid remains an estimate until measured.", input.trial_to_paid, "ratio"),
    fulfillment_cost: money("fulfillment cost", fulfillment, "Fulfillment cost missing is UNKNOWN, not free."),
    provider_cost: money("provider cost", provider, "Provider/API cost missing is UNKNOWN, not free."),
    support_cost: money("support cost", support, "Support burden missing is UNKNOWN, not free."),
    refund_risk: input.refund_rate == null
      ? unknownValue("refund risk", "No refund evidence.")
      : classified(`${Math.round(input.refund_rate * 100)}%`, "ESTIMATED", "Refund risk estimate.", input.refund_rate, "ratio"),
    abuse_risk: input.abuse_rate == null
      ? unknownValue("abuse risk", "No abuse telemetry.")
      : classified(`${Math.round(input.abuse_rate * 100)}%`, "ESTIMATED", "Abuse risk estimate.", input.abuse_rate, "ratio"),
    cash_timing: input.offer_type.includes("TRIAL") || input.offer_type.includes("FREE")
      ? classified("DELAYED", "DERIVED", "Free/trial cash arrives after conversion, if it arrives.", null, null)
      : classified("AT_PURCHASE", "DERIVED", "Paid-first collects cash at checkout.", null, null),
    payback: input.cac_usd == null || input.ltv_usd == null
      ? unknownValue("payback", "CAC or LTV is UNKNOWN.")
      : classified(`${(input.ltv_usd / Math.max(input.cac_usd, 0.01)).toFixed(2)}x LTV:CAC`, "DERIVED", "Ratio only; cash-timing payback stays uninvented when monthly CAC spend is UNKNOWN.", input.ltv_usd / Math.max(input.cac_usd, 0.01), "ratio"),
    capital_exposure: unknownCost || input.offer_type.includes("FREE") || input.offer_type.includes("TRIAL")
      ? unknownValue("capital exposure", "Free/trial or unknown operating cost creates capital exposure that is not $0.")
      : unknownValue("capital exposure", "Paid-first still requires capital authorization before any new spend."),
  };
}

export function unknownCostTreatedAsZero(value: ClassifiedValue): boolean {
  return value.classification === "UNKNOWN" && value.numeric === 0;
}
