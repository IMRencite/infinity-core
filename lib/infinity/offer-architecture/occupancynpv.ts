import { classified, unknownValue } from "@/lib/infinity/venture-economics/classified";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  OCCUPANCYNPV_PER_DEAL_PRICE_USD,
  OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
} from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { projectVentureCustomerSuggestions } from "@/lib/infinity/product-improvement-loop/suggestions";
import { assessPurchaseFriction, assessTimeToValue } from "./assess";
import { evaluateOfferEconomics } from "./economics";
import { collectOfferFeedbackSignals } from "./feedback";
import { selectOffer } from "./selection";
import { recordOfferArchitecture } from "./store";
import type { OfferArchitectureContract, OfferDecision, OfferType } from "./types";
import { NOT_APPLICABLE, OFFER_ARCHITECTURE_CONTRACT, UNKNOWN } from "./types";

export const OCCUPANCYNPV_CURRENT_OFFER =
  `Professional $${OCCUPANCYNPV_PROFESSIONAL_PRICE_USD}/year · Per-Deal $${OCCUPANCYNPV_PER_DEAL_PRICE_USD} · Trial OFF · Request Pilot Access present` as const;

function trialOff() {
  return {
    enabled: false,
    kind: "NONE" as const,
    duration: NOT_APPLICABLE,
    post_trial_price: NOT_APPLICABLE,
    billing_date: NOT_APPLICABLE,
    billing_frequency: NOT_APPLICABLE,
    cancellation_path: "customer billing portal / Stripe customer portal",
    explicit_customer_authorization: NOT_APPLICABLE,
    auto_convert: false,
  };
}

export function buildOccupancyNpvCurrentOffer(): OfferArchitectureContract {
  const now = "2026-09-12T08:45:00.000Z";
  const friction = assessPurchaseFriction({
    buyer_trust: "MEDIUM",
    brand_maturity: "LOW",
    product_novelty: "HIGH",
    purchase_price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
    commitment_duration: "ANNUAL",
    payment_before_value: true,
    account_creation_burden: "MEDIUM",
    setup_effort: "MEDIUM",
    switching_cost: "LOW",
    sales_cycle: "SELF_SERVE",
    buyer_authority: "END_USER",
    proof_availability: "LOW",
    risk_perception: "HIGH",
  });
  const ttv = assessTimeToValue({
    archetype: "TRANSACTIONAL_TOOL",
    value_type: "TRANSACTION_BASED",
    meaningful_value_before_payment: true,
  });
  const economics = evaluateOfferEconomics({
    price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
    offer_type: "PAID_FIRST",
    fulfillment_cost_usd: null,
    provider_cost_usd: null,
    support_cost_usd: null,
  });
  return {
    contract: OFFER_ARCHITECTURE_CONTRACT,
    venture_id: CRE_VENTURE_ID,
    offer_id: `offer:${CRE_VENTURE_ID}:current-paid-first`,
    offer_version: 1,
    offer_name: OCCUPANCYNPV_CURRENT_OFFER,
    offer_type: "PAID_FIRST",
    target_segment: "US tenant-representation brokers",
    primary_product: "OccupancyNPV Professional + Per-Deal",
    pricing_model: "annual_subscription + per_transaction",
    price: classified(
      `$${OCCUPANCYNPV_PROFESSIONAL_PRICE_USD}/year and $${OCCUPANCYNPV_PER_DEAL_PRICE_USD} Per-Deal`,
      "OBSERVED",
      "Live OccupancyNPV prices. Analysis does not change them.",
      OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
      "usd",
    ),
    billing_frequency: "annual + per-deal",
    trial_policy: trialOff(),
    pilot_policy: "Request Pilot Access present — not a self-serve free trial",
    discount_policy: NOT_APPLICABLE,
    guarantee_policy: UNKNOWN,
    freemium_policy: NOT_APPLICABLE,
    first_use_incentive: NOT_APPLICABLE,
    bundle_configuration: NOT_APPLICABLE,
    seat_configuration: NOT_APPLICABLE,
    usage_configuration: "Professional unlimited within product; Per-Deal is one workspace purchase",
    conversion_path: "public site → checkout → fulfillment",
    fulfillment_requirements: "paid workspace entitlement after verified payment",
    payment_requirements: "live Stripe path for $290 and $149",
    capital_requirements: "BLOCKED_PENDING_CAPITAL_POLICY for new offer spend",
    expected_conversion_effect: unknownValue("conversion effect", "Post-launch conversion remains sparse."),
    expected_margin_effect: economics.expected_gross_margin,
    expected_support_cost_effect: economics.support_cost,
    abuse_risk: "LOW",
    refund_risk: UNKNOWN,
    time_to_value: ttv.type === UNKNOWN ? UNKNOWN : ttv.type,
    purchase_friction: friction.level,
    evidence_basis: [
      "live OccupancyNPV prices $290/$149",
      "trial OFF",
      "Request Pilot Access present",
      "CustomerFeedbackRecord projection",
    ],
    confidence: "MEDIUM",
    status: "LIVE_PROJECTION",
    created_at: now,
    updated_at: now,
    supersedes_offer_id: null,
    monetization_plan_id: null,
    commercialization_economics_id: "VentureEconomicsIntelligenceContract:occupancynpv",
    experiment_id: null,
    activation: "LIVE_PROJECTION",
  };
}

export type OccupancyNpvOfferAssessment = {
  candidate: "CURRENT_PAID_FIRST" | "FREE_FIRST_DEAL" | "PROFESSIONAL_SHORT_TRIAL" | "ASSISTED_PILOT";
  offer_type: OfferType;
  purchase_friction: ReturnType<typeof assessPurchaseFriction>;
  time_to_value: ReturnType<typeof assessTimeToValue>;
  conversion_potential: typeof UNKNOWN | "LOW" | "MEDIUM" | "HIGH";
  margin: string;
  support_burden: string;
  provider_cost: string;
  abuse_risk: "LOW" | "MEDIUM" | "HIGH" | typeof UNKNOWN;
  operational_complexity: "LOW" | "MEDIUM" | "HIGH";
  customer_fit: string;
  evidence_quality: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  decision: OfferDecision;
  reason: string;
};

export function analyzeOccupancyNpvOffers(): {
  current_offer: typeof OCCUPANCYNPV_CURRENT_OFFER;
  current_friction: ReturnType<typeof assessPurchaseFriction>;
  current_time_to_value: ReturnType<typeof assessTimeToValue>;
  assessments: OccupancyNpvOfferAssessment[];
  best_current_candidate: "CURRENT_PAID_FIRST";
  decision: OfferDecision;
  reason: string;
  founder_real_suggestion_as_evidence: boolean;
  pricing_changed: false;
  trial_changed: false;
  real_suggestions: number;
  synthetic_suggestions: number;
} {
  const suggestions = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
  const signals = collectOfferFeedbackSignals(CRE_VENTURE_ID);
  const realOfferSignals = signals.filter((row) => row.real_count > 0 && row.category !== "other");
  const current = buildOccupancyNpvCurrentOffer();
  const friction = assessPurchaseFriction({
    purchase_price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
    commitment_duration: "ANNUAL",
    payment_before_value: true,
    product_novelty: "HIGH",
    brand_maturity: "LOW",
    buyer_trust: "MEDIUM",
    proof_availability: "LOW",
    risk_perception: "HIGH",
  });
  const ttv = assessTimeToValue({
    archetype: "TRANSACTIONAL_TOOL",
    value_type: "TRANSACTION_BASED",
    meaningful_value_before_payment: true,
  });
  const economics = evaluateOfferEconomics({
    price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
    offer_type: "PAID_FIRST",
  });
  const shared = {
    friction,
    time_to_value: String(ttv.type),
    economics,
    payment_ready: false,
    fulfillment_ready: false,
    capital_authorized: false,
    legal_policy_pass: true,
    customer_disclosure_pass: true,
    qc_pass: true,
    evidence_quality: realOfferSignals.length ? "LOW" as const : "INSUFFICIENT" as const,
    strategic_fit: "STRONG" as const,
    analysis_only: true,
    feedback: signals,
  };

  const assessments: OccupancyNpvOfferAssessment[] = [
    {
      candidate: "CURRENT_PAID_FIRST",
      offer_type: "PAID_FIRST",
      purchase_friction: friction,
      time_to_value: ttv,
      conversion_potential: UNKNOWN,
      margin: economics.expected_gross_margin.display,
      support_burden: economics.support_cost.display,
      provider_cost: economics.provider_cost.display,
      abuse_risk: "LOW",
      operational_complexity: "LOW",
      customer_fit: "Matches current live paid-first OccupancyNPV commercial offer",
      evidence_quality: "MEDIUM",
      ...(() => {
        const selected = selectOffer({ ...shared, offer_type: "PAID_FIRST", already_live: true });
        return { decision: selected.decision, reason: selected.reason };
      })(),
    },
    {
      candidate: "FREE_FIRST_DEAL",
      offer_type: "FREE_FIRST_DEAL",
      purchase_friction: assessPurchaseFriction({
        purchase_price_usd: 0,
        payment_before_value: false,
        product_novelty: "HIGH",
        risk_perception: "MEDIUM",
      }),
      time_to_value: ttv,
      conversion_potential: UNKNOWN,
      margin: unknownValue("free-first-deal margin", "Free first deal is not economically free.").display,
      support_burden: UNKNOWN,
      provider_cost: UNKNOWN,
      abuse_risk: "HIGH",
      operational_complexity: "HIGH",
      customer_fit: "Could reduce first-deal friction for brokers if bounded to one DealWorkspace",
      evidence_quality: "INSUFFICIENT",
      decision: "DEFER",
      reason: "Do not activate FREE_FIRST_DEAL. Provider/support/abuse cost is UNKNOWN, capital is blocked, and the real suggestion is not demand evidence.",
    },
    {
      candidate: "PROFESSIONAL_SHORT_TRIAL",
      offer_type: "FREE_TRIAL",
      purchase_friction: assessPurchaseFriction({
        purchase_price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
        commitment_duration: "ANNUAL",
        payment_before_value: false,
        product_novelty: "HIGH",
      }),
      time_to_value: assessTimeToValue({ archetype: "SAAS", value_type: "TIME_BASED", meaningful_value_before_payment: true }),
      conversion_potential: UNKNOWN,
      margin: UNKNOWN,
      support_burden: UNKNOWN,
      provider_cost: UNKNOWN,
      abuse_risk: "MEDIUM",
      operational_complexity: "HIGH",
      customer_fit: "Calendar trial is a SaaS tactic; OccupancyNPV value is deal/event based",
      evidence_quality: "INSUFFICIENT",
      decision: "DEFER",
      reason: "Trial stays OFF. Auto-convert disclosure, capital, and deal-based time-to-value do not support enabling a Professional trial.",
    },
    {
      candidate: "ASSISTED_PILOT",
      offer_type: "PAID_PILOT",
      purchase_friction: assessPurchaseFriction({
        purchase_price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
        sales_cycle: "ASSISTED",
        payment_before_value: false,
        proof_availability: "MEDIUM",
      }),
      time_to_value: assessTimeToValue({ archetype: "SERVICE", value_type: "SERVICE_BASED" }),
      conversion_potential: UNKNOWN,
      margin: UNKNOWN,
      support_burden: UNKNOWN,
      provider_cost: UNKNOWN,
      abuse_risk: "LOW",
      operational_complexity: "MEDIUM",
      customer_fit: "Request Pilot Access is already present; do not invent a new pilot product",
      evidence_quality: "LOW",
      decision: "DEFER",
      reason: "Assisted pilot already exists as Request Pilot Access. No new pilot offer is activated.",
    },
  ];

  void current;
  return {
    current_offer: OCCUPANCYNPV_CURRENT_OFFER,
    current_friction: friction,
    current_time_to_value: ttv,
    assessments,
    best_current_candidate: "CURRENT_PAID_FIRST",
    decision: "DEFER",
    reason: "Keep the live paid-first OccupancyNPV offer. One real suggestion ('this is a test') is not pricing or trial evidence. Alternatives stay analysis-only.",
    founder_real_suggestion_as_evidence: suggestions.counts.real > 0,
    pricing_changed: false,
    trial_changed: false,
    real_suggestions: suggestions.counts.real,
    synthetic_suggestions: suggestions.counts.synthetic,
  };
}

export function projectOccupancyNpvOfferForHq(): OfferArchitectureContract {
  const offer = buildOccupancyNpvCurrentOffer();
  recordOfferArchitecture(offer);
  return offer;
}
