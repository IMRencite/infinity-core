import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  OCCUPANCYNPV_PER_DEAL_PRICE_USD,
  OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
} from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { evaluateFreeOfferEconomicSafetyGate } from "./gates";
import { assessPurchaseFriction, assessTimeToValue } from "./assess";
import { evaluateOfferEconomics } from "./economics";
import { buildOfferExperiment, offerPerformanceEvents } from "./experiment";
import { recordOfferArchitecture, recordOfferExperiment } from "./store";
import { buildOccupancyNpvCurrentOffer } from "./occupancynpv";
import type { OfferArchitectureContract, OfferDecision, OfferType } from "./types";
import { NOT_APPLICABLE, UNKNOWN } from "./types";

export const OCCUPANCYNPV_LIVE_OFFER_ID = `offer:${CRE_VENTURE_ID}:paid-first-rendered-v2` as const;
export const OCCUPANCYNPV_OFFER_EXPERIMENT_ID = `exp:${CRE_VENTURE_ID}:rendered-paid-first-v1` as const;
export const OCCUPANCYNPV_PRIMARY_OFFER_CTA = "Start Free Trial" as const;
export const OCCUPANCYNPV_SECONDARY_OFFER_CTA = "Start One Deal" as const;
export const OCCUPANCYNPV_HIGH_FRICTION_PAID_FIRST_JUSTIFICATION =
  "Paid Professional and Per-Deal remain available immediately. OccupancyNPV time-to-value is a completed lease comparison. The 3-day no-card trial is the primary acquisition offer so that first comparison can finish before payment." as const;
export const OCCUPANCYNPV_TRIAL_TTV_EXPLANATION =
  "The 3-day no-card trial includes one DealWorkspace so the first lease comparison can complete before Professional $290/year or Per-Deal $149." as const;

export const OCCUPANCYNPV_OFFER_EVENTS_PATH = ".infinity/offer-architecture/events.json" as const;

export const OCCUPANCYNPV_OFFER_EVENT_NAMES = [
  "offer_view",
  "offer_cta_click",
  "offer_start",
  "offer_activation",
  "meaningful_use",
  "checkout_start",
  "paid_conversion",
  "cancel",
  "refund",
  "offer_limit_hit",
  "upgrade_prompt",
  "upgrade_conversion",
] as const;
export type OccupancyNpvOfferEventName = (typeof OCCUPANCYNPV_OFFER_EVENT_NAMES)[number];

export type OccupancyNpvLiveOfferOptionId =
  | "CURRENT_PAID_FIRST"
  | "FREE_FIRST_DEAL"
  | "LIMITED_PILOT"
  | "SHORT_PROFESSIONAL_TRIAL"
  | "THREE_DAY_NO_CARD_TRIAL"
  | "DEMO_FIRST"
  | "DISCOUNTED_FIRST_DEAL"
  | "REQUEST_PILOT_ACCESS";

export type OccupancyNpvLiveOfferOption = {
  id: OccupancyNpvLiveOfferOptionId;
  offer_type: OfferType;
  purchase_friction: "LOW" | "MEDIUM" | "HIGH";
  time_to_value_fit: "FIT" | "MISMATCH" | "UNKNOWN";
  expected_conversion_effect: string;
  expected_margin_effect: string;
  provider_api_exposure: string;
  support_burden: string;
  abuse_risk: "LOW" | "MEDIUM" | "HIGH";
  operational_complexity: "LOW" | "MEDIUM" | "HIGH";
  fulfillment_compatibility: "PASS" | "FAIL";
  payment_compatibility: "PASS" | "FAIL";
  capital_exposure: string;
  evidence_quality: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  decision: OfferDecision;
  reason: string;
};

function paidFirstFriction() {
  return assessPurchaseFriction({
    purchase_price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
    commitment_duration: "ANNUAL",
    payment_before_value: true,
    product_novelty: "HIGH",
    brand_maturity: "LOW",
    buyer_trust: "MEDIUM",
    proof_availability: "LOW",
    risk_perception: "HIGH",
  });
}

export function evaluateOccupancyNpvLiveOfferOptions(): OccupancyNpvLiveOfferOption[] {
  const friction = paidFirstFriction();
  const ttv = assessTimeToValue({
    archetype: "TRANSACTIONAL_TOOL",
    value_type: "TRANSACTION_BASED",
    meaningful_value_before_payment: true,
  });
  const paidEconomics = evaluateOfferEconomics({
    price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
    offer_type: "PAID_FIRST",
  });
  const freeSafety = evaluateFreeOfferEconomicSafetyGate({
    infrastructure_cost: null,
    provider_cost: null,
    support_cost: null,
    fulfillment_cost: null,
    fraud_abuse_cost: null,
    opportunity_cost: null,
  });
  const unknownFree = freeSafety.result === "FAIL";
  return [
    {
      id: "CURRENT_PAID_FIRST",
      offer_type: "PAID_FIRST",
      purchase_friction: friction.level,
      time_to_value_fit: ttv.type === "TRANSACTION_BASED" ? "FIT" : "MISMATCH",
      expected_conversion_effect: paidEconomics.conversion_effect.display,
      expected_margin_effect: paidEconomics.expected_gross_margin.display,
      provider_api_exposure: "NONE incremental — existing paid workspace path",
      support_burden: paidEconomics.support_cost.display,
      abuse_risk: "LOW",
      operational_complexity: "LOW",
      fulfillment_compatibility: "PASS",
      payment_compatibility: "PASS",
      capital_exposure: "NONE incremental discretionary spend",
      evidence_quality: "MEDIUM",
      decision: "ACTIVATE",
      reason: "Keep $290/$149 as the paid purchase paths. They are not the acquisition offer.",
    },
    {
      id: "FREE_FIRST_DEAL",
      offer_type: "FREE_FIRST_DEAL",
      purchase_friction: assessPurchaseFriction({ purchase_price_usd: 0, payment_before_value: false, product_novelty: "HIGH" }).level,
      time_to_value_fit: "FIT",
      expected_conversion_effect: UNKNOWN,
      expected_margin_effect: UNKNOWN,
      provider_api_exposure: UNKNOWN,
      support_burden: UNKNOWN,
      abuse_risk: "HIGH",
      operational_complexity: "HIGH",
      fulfillment_compatibility: "FAIL",
      payment_compatibility: "PASS",
      capital_exposure: unknownFree ? "UNKNOWN free-offer cost; capital blocked" : "BLOCKED_PENDING_CAPITAL_POLICY for new spend",
      evidence_quality: "INSUFFICIENT",
      decision: "DEFER",
      reason: "Free first deal is not economically free. Provider/support/abuse cost is UNKNOWN and capital policy blocks new spend.",
    },
    {
      id: "LIMITED_PILOT",
      offer_type: "PAID_PILOT",
      purchase_friction: assessPurchaseFriction({ sales_cycle: "ASSISTED", payment_before_value: false, proof_availability: "MEDIUM" }).level,
      time_to_value_fit: "MISMATCH",
      expected_conversion_effect: UNKNOWN,
      expected_margin_effect: UNKNOWN,
      provider_api_exposure: UNKNOWN,
      support_burden: UNKNOWN,
      abuse_risk: "LOW",
      operational_complexity: "HIGH",
      fulfillment_compatibility: "FAIL",
      payment_compatibility: "PASS",
      capital_exposure: "Assisted support cost UNKNOWN",
      evidence_quality: "INSUFFICIENT",
      decision: "DEFER",
      reason: "A structured pilot would become a new primary offer with UNKNOWN support cost. Do not replace paid-first.",
    },
    {
      id: "SHORT_PROFESSIONAL_TRIAL",
      offer_type: "FREE_TRIAL",
      purchase_friction: assessPurchaseFriction({ purchase_price_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD, payment_before_value: false }).level,
      time_to_value_fit: "FIT",
      expected_conversion_effect: UNKNOWN,
      expected_margin_effect: "NONE incremental cash",
      provider_api_exposure: "NONE incremental — existing product compute",
      support_burden: "LOW",
      abuse_risk: "MEDIUM",
      operational_complexity: "LOW",
      fulfillment_compatibility: "PASS",
      payment_compatibility: "PASS",
      capital_exposure: "NONE incremental discretionary spend",
      evidence_quality: "MEDIUM",
      decision: "DEFER",
      reason: "Superseded by the 3-day no-card trial, which has lower friction and the same bounded cost.",
    },
    {
      id: "THREE_DAY_NO_CARD_TRIAL",
      offer_type: "NO_CARD_TRIAL",
      purchase_friction: assessPurchaseFriction({ purchase_price_usd: 0, payment_before_value: false, product_novelty: "HIGH" }).level,
      time_to_value_fit: "FIT",
      expected_conversion_effect: "Lower first-use friction; 72-hour path to one DealWorkspace",
      expected_margin_effect: "NONE incremental cash on existing infrastructure",
      provider_api_exposure: "NONE incremental — existing OccupancyNPV surface",
      support_burden: "LOW — self-serve",
      abuse_risk: "MEDIUM",
      operational_complexity: "LOW",
      fulfillment_compatibility: "PASS",
      payment_compatibility: "PASS",
      capital_exposure: "NONE incremental discretionary spend",
      evidence_quality: "MEDIUM",
      decision: "ACTIVATE",
      reason: "Smallest safe acquisition offer: 72 hours, no card, no auto-billing, one workspace, existing entitlement system.",
    },
    {
      id: "DEMO_FIRST",
      offer_type: "DEMO_FIRST",
      purchase_friction: assessPurchaseFriction({ payment_before_value: false, proof_availability: "MEDIUM" }).level,
      time_to_value_fit: "MISMATCH",
      expected_conversion_effect: UNKNOWN,
      expected_margin_effect: UNKNOWN,
      provider_api_exposure: UNKNOWN,
      support_burden: UNKNOWN,
      abuse_risk: "LOW",
      operational_complexity: "HIGH",
      fulfillment_compatibility: "FAIL",
      payment_compatibility: "PASS",
      capital_exposure: "Would require a new demo product surface",
      evidence_quality: "INSUFFICIENT",
      decision: "REJECT",
      reason: "Do not fabricate a demo product. OccupancyNPV value is a customer DealWorkspace, not a canned walkthrough.",
    },
    {
      id: "DISCOUNTED_FIRST_DEAL",
      offer_type: "DISCOUNTED_FIRST_PURCHASE",
      purchase_friction: assessPurchaseFriction({ purchase_price_usd: 99, payment_before_value: true }).level,
      time_to_value_fit: "FIT",
      expected_conversion_effect: UNKNOWN,
      expected_margin_effect: UNKNOWN,
      provider_api_exposure: "NONE",
      support_burden: UNKNOWN,
      abuse_risk: "MEDIUM",
      operational_complexity: "MEDIUM",
      fulfillment_compatibility: "PASS",
      payment_compatibility: "FAIL",
      capital_exposure: "Price change requires separate pricing governance",
      evidence_quality: "INSUFFICIENT",
      decision: "REJECT",
      reason: "Base prices stay $290/$149. No governed pricing authorization exists to discount the first deal.",
    },
    {
      id: "REQUEST_PILOT_ACCESS",
      offer_type: "FREE_PILOT",
      purchase_friction: assessPurchaseFriction({ sales_cycle: "ASSISTED", payment_before_value: false }).level,
      time_to_value_fit: "MISMATCH",
      expected_conversion_effect: UNKNOWN,
      expected_margin_effect: UNKNOWN,
      provider_api_exposure: UNKNOWN,
      support_burden: UNKNOWN,
      abuse_risk: "LOW",
      operational_complexity: "MEDIUM",
      fulfillment_compatibility: "FAIL",
      payment_compatibility: "PASS",
      capital_exposure: "Assisted pilot support UNKNOWN",
      evidence_quality: "LOW",
      decision: "DEFER",
      reason: "Request Pilot Access remains a secondary path. It is not a complete primary offer and must not replace paid-first.",
    },
  ];
}

export function selectOccupancyNpvLiveCustomerFacingOffer() {
  const options = evaluateOccupancyNpvLiveOfferOptions();
  const selected = options.find((row) => row.id === "THREE_DAY_NO_CARD_TRIAL")!;
  return {
    options,
    selected_offer: selected.id,
    offer_type: selected.offer_type,
    decision: selected.decision,
    confidence: "MEDIUM" as const,
    reason: selected.reason,
    economic_bounds: {
      incremental_discretionary_spend: "NONE",
      infrastructure_exposure: "EXISTING_AUTHORIZED_OCCUPANCYNPV_SURFACE",
      provider_api_exposure: selected.provider_api_exposure,
      support_exposure: "EXISTING_PAID_SUPPORT_PATH",
      fulfillment_exposure: "EXISTING_PAID_ENTITLEMENT",
      abuse_risk: selected.abuse_risk,
      unknown_material_cost_remaining: false,
      capital_policy_blocks_activation: false,
    },
    customer_journey: [
      "pricing",
      "trial_cta",
      "account_if_needed",
      "trial_entitlement",
      "dealworkspace_value",
      "upgrade_to_professional_or_per_deal",
    ],
    measurement_plan: [...OCCUPANCYNPV_OFFER_EVENT_NAMES],
    prices_changed: false as const,
    trial_changed: true as const,
    high_friction_justification: OCCUPANCYNPV_TRIAL_TTV_EXPLANATION,
  };
}

export function buildOccupancyNpvLiveActivatedOffer(): OfferArchitectureContract {
  const base = buildOccupancyNpvCurrentOffer();
  const now = new Date().toISOString();
  return {
    ...base,
    offer_id: OCCUPANCYNPV_LIVE_OFFER_ID,
    offer_version: 2,
    offer_name: `3-Day Free Trial · Professional $${OCCUPANCYNPV_PROFESSIONAL_PRICE_USD}/year · Per-Deal $${OCCUPANCYNPV_PER_DEAL_PRICE_USD}`,
    offer_type: "NO_CARD_TRIAL",
    trial_policy: {
      enabled: true,
      kind: "NO_CARD_TRIAL",
      duration: "3 days",
      post_trial_price: `$${OCCUPANCYNPV_PROFESSIONAL_PRICE_USD}/year or $${OCCUPANCYNPV_PER_DEAL_PRICE_USD} Per-Deal`,
      billing_date: NOT_APPLICABLE,
      billing_frequency: NOT_APPLICABLE,
      cancellation_path: "Trial ends automatically. No charge. Then choose Professional or Per-Deal.",
      explicit_customer_authorization: true,
      auto_convert: false,
    },
    conversion_path: "pricing → Start Free Trial → account → trial entitlement → DealWorkspace → Professional or Per-Deal",
    first_use_incentive: "3-day no-card Professional trial, one DealWorkspace",
    discount_policy: NOT_APPLICABLE,
    evidence_basis: [
      ...base.evidence_basis,
      OCCUPANCYNPV_TRIAL_TTV_EXPLANATION,
      "live rendered 3-day no-card trial on /pricing",
    ],
    status: "ACTIVATED",
    activation: "ACTIVATED",
    experiment_id: OCCUPANCYNPV_OFFER_EXPERIMENT_ID,
    updated_at: now,
    supersedes_offer_id: base.offer_id,
  };
}

export function activateOccupancyNpvLivePaidFirstOffer() {
  const selection = selectOccupancyNpvLiveCustomerFacingOffer();
  const offer = recordOfferArchitecture(buildOccupancyNpvLiveActivatedOffer());
  const experiment = recordOfferExperiment({
    ...buildOfferExperiment({
      venture_id: CRE_VENTURE_ID,
      experiment_id: OCCUPANCYNPV_OFFER_EXPERIMENT_ID,
      offer_variants: ["CONTROL_STANDARD_PRICING_NO_ACQUISITION_OFFER", "VARIANT_THREE_DAY_NO_CARD_TRIAL"],
      hypothesis: "A 3-day no-card trial increases pricing-view → trial-start versus list prices alone without changing $290/$149.",
    }),
    primary_metric: "pricing_view_to_primary_offer_start",
    secondary_metrics: [
      "offer_start_to_meaningful_use",
      "meaningful_use_to_checkout",
      "checkout_to_paid",
      "paid_to_retained",
      "support_burden",
      "abuse",
      "contribution_impact",
    ],
    status: "READY",
    sample_requirement: "decision-grade offer-start evidence; no fabricated conversion",
    allocation: "100% variant on live pricing; control is the prior price-card presentation",
  });
  return { selection, offer, experiment };
}

export type OccupancyNpvOfferEventRecord = {
  event: OccupancyNpvOfferEventName;
  offer_id: string;
  at: string;
  source?: string;
};

export function recordOccupancyNpvOfferEvent(event: OccupancyNpvOfferEventRecord): OccupancyNpvOfferEventRecord {
  const rows = readOccupancyNpvOfferEvents();
  rows.push(event);
  try {
    mkdirSync(dirname(OCCUPANCYNPV_OFFER_EVENTS_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_OFFER_EVENTS_PATH, `${JSON.stringify({ events: rows }, null, 2)}\n`);
  } catch {
    // serverless / read-only
  }
  void offerPerformanceEvents({
    venture_id: CRE_VENTURE_ID,
    offer_id: event.offer_id,
    metric: event.event,
    value: 1,
  });
  return event;
}

export function readOccupancyNpvOfferEvents(): OccupancyNpvOfferEventRecord[] {
  if (process.env.VITEST && process.env.INFINITY_OFFER_ARCHITECTURE_PERSIST !== "1") return [];
  if (!existsSync(OCCUPANCYNPV_OFFER_EVENTS_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(OCCUPANCYNPV_OFFER_EVENTS_PATH, "utf8")) as { events?: OccupancyNpvOfferEventRecord[] };
    return parsed.events ?? [];
  } catch {
    return [];
  }
}

export function summarizeOccupancyNpvOfferEvents(events = readOccupancyNpvOfferEvents()) {
  const count = (name: OccupancyNpvOfferEventName) => events.filter((row) => row.event === name).length;
  const views = count("offer_view");
  const starts = count("offer_start") + count("offer_cta_click");
  const paid = count("paid_conversion");
  return {
    exposure: views,
    starts,
    meaningful_uses: count("meaningful_use"),
    checkout_starts: count("checkout_start"),
    paid_conversions: paid,
    conversion_rate: views === 0 ? "UNKNOWN" : `${Math.round((starts / views) * 100)}%`,
    offer_cost: "NONE incremental",
    contribution_impact: UNKNOWN,
  };
}
