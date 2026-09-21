import { evaluateFreeOfferEconomicSafetyGate } from "./gates";
import { OCCUPANCYNPV_THREE_DAY_TRIAL } from "./acquisition-offer";
import type { NamedOfferGate } from "./types";

export const MATERIAL_CUSTOMER_ADVANTAGE_GATE = "MaterialCustomerAdvantageGate" as const;
export const OFFER_TRUTHFULNESS_GATE = "OfferTruthfulnessGate" as const;
export const PRIMARY_COMMERCIAL_ACTION_VIEWPORT_GATE = "PrimaryCommercialActionViewportGate" as const;
export const COMMERCIAL_INFORMATION_HIERARCHY_GATE = "CommercialInformationHierarchyGate" as const;
export const COMMERCIAL_CONTENT_DENSITY_GATE = "CommercialContentDensityGate" as const;
export const CUSTOMER_FACING_LANGUAGE_GATE = "CustomerFacingLanguageGate" as const;

export const COMMERCIAL_OFFER_STATES = [
  "PRICING_PRESENT_OFFER_NONE",
  "PRICING_PRESENT_OFFER_ACTIVE",
  "PRICING_PRESENT_OFFER_TESTING",
] as const;
export type CommercialOfferState = (typeof COMMERCIAL_OFFER_STATES)[number];

export const MATERIAL_ADVANTAGE_KINDS = [
  "FREE_TRIAL",
  "FIRST_DEAL_FREE",
  "FIRST_USE_FREE",
  "REAL_DISCOUNT",
  "MONEY_BACK_GUARANTEE",
  "PAID_OR_FREE_PILOT",
  "BONUS_ENTITLEMENT",
] as const;

export const INTERNAL_CUSTOMER_LANGUAGE = [
  "entitlement remains active",
  "entitlement ACTIVE",
  "canonical offer",
  "fulfillment grants",
  "primary offer · paid-first",
  "offer type: paid-first",
] as const;

const MATERIAL_ADVANTAGE_PATTERN =
  /free trial|start trial|first (deal|comparison|use|transaction) free|money[- ]back|%\s*off|\d+\s*percent off|discounted? first|bonus (month|seat|deal)|included pilot|2 months free/i;

export function htmlHasMaterialCustomerAdvantage(html: string): boolean {
  if (!html) return false;
  if (/trial is off|trial off|no free recurring|no free access/i.test(html) && !/start trial|first deal free|%\s*off/i.test(html)) {
    return false;
  }
  return MATERIAL_ADVANTAGE_PATTERN.test(html);
}

export function htmlClaimsFakePaidFirstOffer(html: string): boolean {
  return /data-offer-block|primary offer · paid-first|offer type: paid-first|data-offer-type="PAID_FIRST"/i.test(html)
    && !htmlHasMaterialCustomerAdvantage(html);
}

export function evaluateMaterialCustomerAdvantageGate(input: {
  html?: string;
  customer_advantage?: string | null;
  standard_terms?: string | null;
  offer_terms?: string | null;
}): NamedOfferGate {
  const html = input.html ?? "";
  const stated = `${input.customer_advantage ?? ""} ${input.offer_terms ?? ""}`;
  const sameAsStandard = Boolean(input.standard_terms && input.offer_terms && input.standard_terms === input.offer_terms);
  const material = htmlHasMaterialCustomerAdvantage(html) || MATERIAL_ADVANTAGE_PATTERN.test(stated);
  if (htmlClaimsFakePaidFirstOffer(html) || sameAsStandard) {
    return {
      gate: MATERIAL_CUSTOMER_ADVANTAGE_GATE,
      result: "FAIL",
      reasons: ["BASE_PRICE_IS_NOT_AN_OFFER"],
    };
  }
  if (!material && /data-promotional-offer="NONE"/i.test(html)) {
    return {
      gate: MATERIAL_CUSTOMER_ADVANTAGE_GATE,
      result: "N/A",
      reasons: ["PROMOTIONAL_OFFER_NONE"],
    };
  }
  if (!material && /\$290|\$149/.test(html)) {
    return {
      gate: MATERIAL_CUSTOMER_ADVANTAGE_GATE,
      result: "FAIL",
      reasons: ["BASE_PRICE_IS_NOT_AN_OFFER"],
    };
  }
  if (!material) {
    return { gate: MATERIAL_CUSTOMER_ADVANTAGE_GATE, result: "FAIL", reasons: ["NO_MATERIAL_CUSTOMER_ADVANTAGE"] };
  }
  return { gate: MATERIAL_CUSTOMER_ADVANTAGE_GATE, result: "PASS", reasons: [] };
}

export function evaluateOfferTruthfulnessGate(input: { html?: string; claimed_offer?: string | null }): NamedOfferGate {
  const html = input.html ?? "";
  const reasons: string[] = [];
  if (htmlClaimsFakePaidFirstOffer(html)) reasons.push("PAID_FIRST_PURCHASE_MODEL_LABELED_AS_OFFER");
  if (/2 months free|limited.?time|%\s*off/i.test(html) && !/authorized|capital/i.test(input.claimed_offer ?? "")) {
    reasons.push("PROMOTION_WITHOUT_BASIS");
  }
  return { gate: OFFER_TRUTHFULNESS_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluatePrimaryCommercialActionViewportGate(input: {
  primary_cta_in_viewport?: boolean | null;
  measurement: "BROWSER_GEOMETRY" | "SOURCE_INFERENCE";
  scrollY?: number;
}): NamedOfferGate {
  if (input.measurement !== "BROWSER_GEOMETRY" || input.primary_cta_in_viewport == null) {
    return {
      gate: PRIMARY_COMMERCIAL_ACTION_VIEWPORT_GATE,
      result: "FAIL",
      reasons: ["VIEWPORT_NOT_MEASURED_IN_BROWSER"],
    };
  }
  if (input.scrollY != null && input.scrollY !== 0) {
    return {
      gate: PRIMARY_COMMERCIAL_ACTION_VIEWPORT_GATE,
      result: "FAIL",
      reasons: ["SCROLL_Y_NOT_ZERO"],
    };
  }
  return {
    gate: PRIMARY_COMMERCIAL_ACTION_VIEWPORT_GATE,
    result: input.primary_cta_in_viewport ? "PASS" : "FAIL",
    reasons: input.primary_cta_in_viewport ? [] : ["PRIMARY_CTA_BELOW_FOLD"],
  };
}

export function evaluateCommercialInformationHierarchyGate(html: string): NamedOfferGate {
  const offerCta = /Start Free Trial/i.test(html) ? "Start Free Trial" : "Start Professional";
  const headingBeforeCta = new RegExp(`<h[12][\\s\\S]{0,4000}${offerCta}`, "i").test(html);
  const priceBeforePaidCta = /\$290[\s\S]{0,2000}Start Professional/i.test(html);
  const fakeOfferFirst = /Primary offer · paid-first[\s\S]{0,8000}Start (?:Free Trial|Professional)/i.test(html);
  const preCta = html.slice(0, Math.max(0, html.search(/Start Free Trial|Start Professional/i)));
  const reasons: string[] = [];
  if (fakeOfferFirst) reasons.push("FAKE_OFFER_PUSHES_CTA_DOWN");
  if (!headingBeforeCta || !priceBeforePaidCta) reasons.push("PRICE_OR_HEADING_NOT_BEFORE_CTA");
  if (/Start Free Trial/i.test(html) && /Start Professional/i.test(html) && html.search(/Start Free Trial/i) > html.search(/Start Professional/i)) {
    reasons.push("OFFER_CTA_NOT_FIRST");
  }
  if (/What does OccupancyNPV cost\?/i.test(preCta)) reasons.push("DUPLICATE_COST_EXPLANATION_BEFORE_CTA");
  if (/pv-pricing-split/i.test(preCta)) reasons.push("DUPLICATE_PRICE_CARDS_BEFORE_CTA");
  if (/Request Pilot Access/i.test(preCta)) reasons.push("COMPETING_CTA_BEFORE_PURCHASE");
  if (reasons.length) {
    return { gate: COMMERCIAL_INFORMATION_HIERARCHY_GATE, result: "FAIL", reasons };
  }
  return { gate: COMMERCIAL_INFORMATION_HIERARCHY_GATE, result: "PASS", reasons: [] };
}

export function evaluateCommercialContentDensityGate(html: string): NamedOfferGate {
  const reasons: string[] = [];
  const offerBlock = html.match(/data-offer-block[\s\S]*?<\/section>/i)?.[0] ?? "";
  const preCta = html.slice(0, Math.max(0, html.search(/Start Free Trial|Start Professional/i)));
  const trialFirst = /Start Free Trial/i.test(html)
    && /Start Professional/i.test(html)
    && html.search(/Start Free Trial/i) < html.search(/Start Professional/i);
  if (offerBlock.length > 2200 || (!trialFirst && /What you get[\s\S]{800,}Start Professional/i.test(html))) {
    reasons.push("OFFER_COPY_BURIES_PURCHASE_ACTION");
  }
  if (/What does OccupancyNPV cost\?/i.test(preCta)) reasons.push("COST_QNA_BEFORE_CTA");
  if (/These offers exist because/i.test(preCta)) reasons.push("LONG_EXPLANATION_BEFORE_CTA");
  if (/pv-pricing-split/i.test(preCta) && /onpv-price-grid/i.test(html)) reasons.push("DUPLICATE_PRICING_BEFORE_CTA");
  if (/pv-hero-photo/i.test(preCta)) reasons.push("TALL_HERO_BEFORE_CTA");
  if (reasons.length) {
    return { gate: COMMERCIAL_CONTENT_DENSITY_GATE, result: "FAIL", reasons };
  }
  return { gate: COMMERCIAL_CONTENT_DENSITY_GATE, result: "PASS", reasons: [] };
}

export function evaluateCustomerFacingLanguageGate(html: string): NamedOfferGate {
  const hits = INTERNAL_CUSTOMER_LANGUAGE.filter((phrase) => html.toLowerCase().includes(phrase.toLowerCase()));
  return {
    gate: CUSTOMER_FACING_LANGUAGE_GATE,
    result: hits.length === 0 ? "PASS" : "FAIL",
    reasons: hits.map((phrase) => `INTERNAL_LANGUAGE:${phrase}`),
  };
}

export function classifyCommercialOfferState(input: {
  prices_visible: boolean;
  material_advantage: boolean;
  testing?: boolean;
}): CommercialOfferState {
  if (input.prices_visible && input.testing && input.material_advantage) return "PRICING_PRESENT_OFFER_TESTING";
  if (input.prices_visible && input.material_advantage) return "PRICING_PRESENT_OFFER_ACTIVE";
  return "PRICING_PRESENT_OFFER_NONE";
}

export type TrueOfferCandidateId =
  | "FREE_FIRST_DEAL"
  | "NO_CARD_TRIAL"
  | "SHORT_PROFESSIONAL_TRIAL"
  | "FIRST_DEAL_DISCOUNT"
  | "MONEY_BACK_GUARANTEE"
  | "LIMITED_PILOT"
  | "CREDIT_BONUS_DEAL"
  | "ANNUAL_INCENTIVE"
  | "NO_PROMOTIONAL_OFFER";

export type TrueOfferCandidateEval = {
  id: TrueOfferCandidateId;
  material_customer_advantage: string;
  incremental_cash_cost: string;
  opportunity_cost: string;
  capital_exposure: string;
  conversion_hypothesis: string;
  abuse_risk: string;
  support_burden: string;
  measurement_plan: string;
  eligible: boolean;
  block: string | null;
};

export type TrueOfferDecision =
  | "TRUE_OFFER_SELECTED"
  | "NO_SAFE_OFFER_PENDING_CAPITAL_POLICY"
  | "NEEDS_ECONOMIC_RESEARCH";

export function evaluateOccupancyNpvTrueOfferCandidates(): TrueOfferCandidateEval[] {
  const capital = "NOT_SET — new discretionary spend is not authorized";
  return [
    {
      id: "FREE_FIRST_DEAL",
      material_customer_advantage: "Waives the $149 first DealWorkspace purchase",
      incremental_cash_cost: "Unknown provider/fulfillment/support; FreeOfferEconomicSafetyGate FAIL",
      opportunity_cost: "$149 per redeemed first deal plus delayed Professional conversion",
      capital_exposure: capital,
      conversion_hypothesis: "Lower first-use friction for transaction-based buyers",
      abuse_risk: "HIGH — one free deal then churn",
      support_burden: "MEDIUM — extra fulfillment and abuse review",
      measurement_plan: "first_deal_redemption, paid_second_deal, Professional upgrade",
      eligible: false,
      block: "UNKNOWN_FREE_COST + CAPITAL_NOT_SET",
    },
    {
      id: "NO_CARD_TRIAL",
      material_customer_advantage: "72-hour Professional access with no card and no automatic billing",
      incremental_cash_cost: "$0 incremental cash on existing OccupancyNPV infrastructure",
      opportunity_cost: "Deferred $290 only if the buyer would have paid immediately; bounded to 72 hours and one workspace",
      capital_exposure: "NONE — no new discretionary provider spend",
      conversion_hypothesis: "High friction drops if a broker can finish one lease comparison before paying",
      abuse_risk: "MEDIUM — one trial per account, one DealWorkspace, 72-hour expiry",
      support_burden: "LOW — self-serve on existing product",
      measurement_plan: "pricing_view_to_trial_start, trial_start_to_meaningful_use, trial_to_professional, trial_to_per_deal",
      eligible: true,
      block: null,
    },
    {
      id: "SHORT_PROFESSIONAL_TRIAL",
      material_customer_advantage: "Same 72-hour Professional window; no-card variant is safer",
      incremental_cash_cost: "$0 incremental cash if no-card; card-required adds Stripe setup friction",
      opportunity_cost: "Same deferred conversion window",
      capital_exposure: "NONE incremental if bounded",
      conversion_hypothesis: "Card-required trial raises friction versus the no-card default",
      abuse_risk: "MEDIUM",
      support_burden: "LOW",
      measurement_plan: "trial_start, paid_conversion, support_tickets",
      eligible: false,
      block: "SUPERSEDED_BY_NO_CARD_THREE_DAY_TRIAL",
    },
    {
      id: "FIRST_DEAL_DISCOUNT",
      material_customer_advantage: "Would require a real authorized markdown vs $149",
      incremental_cash_cost: "Revenue reduction equal to the markdown",
      opportunity_cost: "Trains buyers to wait for a discount",
      capital_exposure: capital,
      conversion_hypothesis: "Lower entry price increases first purchase",
      abuse_risk: "MEDIUM",
      support_burden: "LOW",
      measurement_plan: "discount_redemption, full-price follow-on",
      eligible: false,
      block: "INVENTED_SAVINGS_NOT_AUTHORIZED + CAPITAL_NOT_SET",
    },
    {
      id: "MONEY_BACK_GUARANTEE",
      material_customer_advantage: "Refund window would reduce perceived purchase risk",
      incremental_cash_cost: "Unknown refund rate; Stripe refunds use existing infra but cash is exposed",
      opportunity_cost: "Refunded Professional or Per-Deal revenue",
      capital_exposure: "Refunds are discretionary economic exposure while capital is NOT_SET",
      conversion_hypothesis: "Guarantee may lift first purchase without a new provider",
      abuse_risk: "MEDIUM — refund-after-use",
      support_burden: "MEDIUM — refund operations",
      measurement_plan: "refund_rate, net_revenue, support_hours",
      eligible: false,
      block: "UNKNOWN_REFUND_COST + CAPITAL_NOT_SET",
    },
    {
      id: "LIMITED_PILOT",
      material_customer_advantage: "Pilot access beyond standard paid terms",
      incremental_cash_cost: "Unknown ops/support; often new spend",
      opportunity_cost: "Unpaid or discounted usage",
      capital_exposure: capital,
      conversion_hypothesis: "High-touch conversion for early brokers",
      abuse_risk: "LOW-MEDIUM",
      support_burden: "HIGH",
      measurement_plan: "pilot_to_paid, support_hours, cash_cost",
      eligible: false,
      block: "UNKNOWN_FREE_COST + CAPITAL_NOT_SET",
    },
    {
      id: "CREDIT_BONUS_DEAL",
      material_customer_advantage: "Extra DealWorkspace or credit beyond list terms",
      incremental_cash_cost: "Fulfillment of an unpaid extra deal",
      opportunity_cost: "$149 per bonus deal",
      capital_exposure: capital,
      conversion_hypothesis: "Bonus entitlement increases perceived value",
      abuse_risk: "MEDIUM",
      support_burden: "LOW-MEDIUM",
      measurement_plan: "bonus_redemption, paid_follow_on",
      eligible: false,
      block: "OPPORTUNITY_COST + CAPITAL_NOT_SET",
    },
    {
      id: "ANNUAL_INCENTIVE",
      material_customer_advantage: "Only truthful if a real comparison price exists; OccupancyNPV has no monthly list",
      incremental_cash_cost: "Would invent savings vs a nonexistent monthly price",
      opportunity_cost: "Credibility if untruthful",
      capital_exposure: capital,
      conversion_hypothesis: "Annual incentive can lift Professional if the savings are real",
      abuse_risk: "LOW",
      support_burden: "LOW",
      measurement_plan: "annual_starts vs baseline",
      eligible: false,
      block: "NOT_TRUTHFUL_WITHOUT_REFERENCE_PRICE",
    },
    {
      id: "NO_PROMOTIONAL_OFFER",
      material_customer_advantage: "NONE — standard $290/year and $149/deal terms only",
      incremental_cash_cost: "NONE",
      opportunity_cost: "Commercial completion blocked while acquisition offer is NONE",
      capital_exposure: "NONE",
      conversion_hypothesis: "List price alone leaves high friction",
      abuse_risk: "LOW",
      support_burden: "LOW",
      measurement_plan: "pricing_page_cta_click, checkout_start, paid_conversion",
      eligible: false,
      block: "ACQUISITION_OFFER_NONE_INCOMPLETE",
    },
  ];
}

export function evaluateOccupancyNpvTrueOfferSelection(): {
  selected: "TRUE_OFFER_SELECTED";
  decision: TrueOfferDecision;
  promotional_offer: "3-Day Free Trial";
  offer_type: "NO_CARD_TRIAL";
  offer_optimization: "PENDING";
  purchase_model: "PAID_FIRST";
  purchase_model_display: "Annual subscription + per-transaction";
  pricing: { professional_usd_year: 290; per_deal_usd: 149 };
  capital: "NOT_SET";
  capital_blocks: false;
  candidates: TrueOfferCandidateEval[];
  free_offer_safety: ReturnType<typeof evaluateFreeOfferEconomicSafetyGate>;
  activation_class: "OFFER_ACTIVE_NO_NEW_DISCRETIONARY_SPEND";
  reason: string;
} {
  const free_offer_safety = evaluateFreeOfferEconomicSafetyGate({
    infrastructure_cost: OCCUPANCYNPV_THREE_DAY_TRIAL.incremental_infrastructure_usd,
    provider_cost: OCCUPANCYNPV_THREE_DAY_TRIAL.incremental_provider_usd,
    support_cost: OCCUPANCYNPV_THREE_DAY_TRIAL.incremental_support_usd,
    fulfillment_cost: OCCUPANCYNPV_THREE_DAY_TRIAL.incremental_fulfillment_usd,
    fraud_abuse_cost: OCCUPANCYNPV_THREE_DAY_TRIAL.incremental_fraud_usd,
    opportunity_cost: OCCUPANCYNPV_THREE_DAY_TRIAL.opportunity_cost_usd,
  });
  const candidates = evaluateOccupancyNpvTrueOfferCandidates();
  return {
    selected: "TRUE_OFFER_SELECTED",
    decision: "TRUE_OFFER_SELECTED",
    promotional_offer: "3-Day Free Trial",
    offer_type: "NO_CARD_TRIAL",
    offer_optimization: "PENDING",
    purchase_model: "PAID_FIRST",
    purchase_model_display: "Annual subscription + per-transaction",
    pricing: { professional_usd_year: 290, per_deal_usd: 149 },
    capital: "NOT_SET",
    capital_blocks: false,
    candidates,
    free_offer_safety,
    activation_class: "OFFER_ACTIVE_NO_NEW_DISCRETIONARY_SPEND",
    reason: "3-day no-card Professional trial is the smallest safe acquisition offer: material advantage, no automatic billing, one workspace, $0 incremental cash on existing infrastructure.",
  };
}
