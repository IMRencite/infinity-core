import type { OfferArchitectureContract, OfferStatus, OfferType, TimeToValueType } from "@/lib/infinity/offer-architecture/types";
import type { NamedSystemGate } from "./contract";
import { evaluateRenderedVisualQualityGate } from "./visual";

export const COMMERCIAL_OFFER_COMPLETENESS_GATE = "CommercialOfferCompletenessGate" as const;
export const RENDERED_OFFER_SURFACE_CONTRACT = "RenderedOfferSurfaceContract" as const;
export const PRICE_ONLY_COMMERCIALIZATION_GATE = "PriceOnlyCommercializationGate" as const;
export const CANONICAL_RENDERED_OFFER_PARITY_GATE = "CanonicalRenderedOfferParityGate" as const;
export const OFFER_TIME_TO_VALUE_ALIGNMENT_GATE = "OfferTimeToValueAlignmentGate" as const;
export const OFFER_CTA_COMPLETENESS_GATE = "OfferCTACompletenessGate" as const;
export const COMMERCIAL_OFFER_JOURNEY_GATE = "CommercialOfferJourneyGate" as const;
export const OFFER_MEASUREMENT_READINESS_GATE = "OfferMeasurementReadinessGate" as const;
export const COMMERCIAL_OFFER_DISCLOSURE_QC_GATE = "OfferDisclosureQCGate" as const;
export const COMMERCIAL_OFFER_REMOVAL_GATE = "CommercialOfferRemovalGate" as const;

export const COMMERCIAL_OFFER_LIFECYCLE = [
  "ANALYSIS_ONLY",
  "PLANNED",
  "TEST_READY",
  "ACTIVE",
  "PAUSED",
  "RETIRED",
] as const;
export type CommercialOfferLifecycle = (typeof COMMERCIAL_OFFER_LIFECYCLE)[number];

export const OFFER_SURFACE_KINDS = [
  "pricing_page",
  "homepage_cta",
  "checkout_entry",
  "pilot_page",
  "trial_page",
  "signup_flow",
  "product_paywall",
  "sales_page",
  "product_upgrade_state",
] as const;
export type OfferSurfaceKind = (typeof OFFER_SURFACE_KINDS)[number];

export type RenderedOfferSurface = {
  kind: OfferSurfaceKind;
  present: boolean;
  primary: boolean;
};

export type RenderedOfferSurfaceContract = {
  contract: typeof RENDERED_OFFER_SURFACE_CONTRACT;
  venture_id: string;
  surfaces: RenderedOfferSurface[];
  primary_surface: OfferSurfaceKind | null;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type OfferJourneyObservation = {
  offer_surface: boolean;
  offer_start: boolean;
  product_account_or_payment: boolean;
  value_or_entitlement: boolean;
  paid_conversion?: boolean;
  dead_end: boolean;
};

export type OfferMeasurementObservation = {
  offer_impression: boolean;
  offer_cta_click: boolean;
  offer_start: boolean;
  activation: boolean;
  meaningful_use: boolean;
  checkout: boolean;
  paid_conversion: boolean;
  cancel_or_refund: boolean;
  support_burden: boolean;
};

export type RenderedOfferObservation = {
  prices_visible: boolean;
  billing_frequency_visible: boolean;
  checkout_cta_visible: boolean;
  value_proposition_visible: boolean;
  included_value_visible: boolean;
  offer_type_visible: boolean;
  offer_conditions_visible: boolean;
  risk_reduction_visible: boolean;
  conversion_path_visible: boolean;
  next_step_visible: boolean;
  offer_block_present: boolean;
  cta_label: string | null;
  cta_visible: boolean;
  cta_clickable: boolean;
  cta_behavior: string | null;
  live_offer_type?: string | null;
  live_price?: string | null;
  live_billing?: string | null;
  live_trial_or_pilot?: string | null;
  live_limits?: string | null;
  live_post_offer_price?: string | null;
  cancellation_disclosed?: boolean;
  eligibility_disclosed?: boolean;
  auto_convert_disclosed?: boolean;
  refund_or_guarantee_disclosed?: boolean;
  offer_prominence_ok?: boolean;
  cta_hierarchy_ok?: boolean;
  readable?: boolean;
  mobile_ok?: boolean;
  browser_default_controls?: boolean;
  terms_clipped?: boolean;
  journey: OfferJourneyObservation;
  measurement: OfferMeasurementObservation;
};

export type CommercialOfferQcInput = {
  commercial_venture: boolean;
  commercial_activation_claimed: boolean;
  canonical_offer: OfferArchitectureContract | null;
  surfaces: RenderedOfferSurface[];
  rendered: RenderedOfferObservation;
  purchase_friction: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  time_to_value: TimeToValueType | "UNKNOWN";
  high_friction_justification?: string | null;
  prior_offer_present?: boolean;
  prior_cta_present?: boolean;
  offer_architecture_changed?: boolean;
  claimed_lifecycle?: CommercialOfferLifecycle;
};

export function mapOfferStatusToLifecycle(status: OfferStatus | undefined, activation?: OfferArchitectureContract["activation"]): CommercialOfferLifecycle {
  if (status === "ANALYSIS_ONLY" || status === "LIVE_PROJECTION" || activation === "LIVE_PROJECTION") return "ANALYSIS_ONLY";
  if (status === "TEST_CANDIDATE") return "TEST_READY";
  if (status === "ACTIVATED" || activation === "ACTIVATED") return "ACTIVE";
  if (status === "SUPERSEDED" || status === "REJECTED") return "RETIRED";
  if (status === "DEFERRED" || status === "NEEDS_RESEARCH" || status === "DRAFT") return "PLANNED";
  return "PLANNED";
}

export function buildRenderedOfferSurfaceContract(input: {
  venture_id: string;
  surfaces: RenderedOfferSurface[];
  commercial_venture: boolean;
}): RenderedOfferSurfaceContract {
  const primary = input.surfaces.find((row) => row.primary && row.present) ?? null;
  const reasons: string[] = [];
  if (input.commercial_venture && !primary) reasons.push("PRIMARY_OFFER_SURFACE_MISSING");
  return {
    contract: RENDERED_OFFER_SURFACE_CONTRACT,
    venture_id: input.venture_id,
    surfaces: input.surfaces,
    primary_surface: primary?.kind ?? null,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluatePriceOnlyCommercializationGate(rendered: RenderedOfferObservation): NamedSystemGate {
  const priceCard = rendered.prices_visible && rendered.billing_frequency_visible && rendered.checkout_cta_visible;
  const expressed = [
    rendered.value_proposition_visible,
    rendered.included_value_visible,
    rendered.offer_type_visible,
    rendered.offer_conditions_visible,
    rendered.conversion_path_visible,
    rendered.next_step_visible,
    rendered.offer_block_present,
  ].filter(Boolean).length;
  if (priceCard && expressed < 4) {
    return {
      gate: PRICE_ONLY_COMMERCIALIZATION_GATE,
      result: "FAIL",
      reasons: ["PRICE_CARD_IS_NOT_OFFER_ARCHITECTURE"],
    };
  }
  return { gate: PRICE_ONLY_COMMERCIALIZATION_GATE, result: "PASS", reasons: [] };
}

export function evaluateCanonicalRenderedOfferParityGate(input: {
  canonical: OfferArchitectureContract | null;
  rendered: RenderedOfferObservation;
  lifecycle: CommercialOfferLifecycle;
}): NamedSystemGate {
  if (!input.canonical) {
    return { gate: CANONICAL_RENDERED_OFFER_PARITY_GATE, result: "FAIL", reasons: ["CANONICAL_OFFER_MISSING"] };
  }
  if (input.lifecycle === "ANALYSIS_ONLY" || input.lifecycle === "PLANNED" || input.lifecycle === "RETIRED") {
    return { gate: CANONICAL_RENDERED_OFFER_PARITY_GATE, result: "PASS", reasons: ["CANONICAL_NOT_CLAIMING_LIVE_IMPLEMENTATION"] };
  }
  const reasons: string[] = [];
  if (input.rendered.live_offer_type && input.rendered.live_offer_type !== input.canonical.offer_type) {
    reasons.push("OFFER_TYPE_MISMATCH");
  }
  if (input.rendered.live_price && !input.canonical.price.display.includes(input.rendered.live_price.replace(/[^0-9]/g, "")) && !input.rendered.live_price.includes(String(input.canonical.price.numeric ?? ""))) {
    if (!input.canonical.price.display.includes(input.rendered.live_price)) reasons.push("PRICE_MISMATCH");
  }
  if (input.canonical.trial_policy.enabled && /OFF|NONE|NOT_APPLICABLE/i.test(input.rendered.live_trial_or_pilot ?? "OFF")) {
    reasons.push("TRIAL_STATE_MISMATCH");
  }
  if (!input.canonical.trial_policy.enabled && /TRIAL ON|START TRIAL/i.test(`${input.rendered.cta_label ?? ""} ${input.rendered.live_trial_or_pilot ?? ""}`)) {
    reasons.push("CONTRADICTORY_LIVE_TRIAL");
  }
  if (!input.rendered.offer_block_present && input.lifecycle === "ACTIVE") reasons.push("LIVE_SURFACE_MISSING_ACTIVE_OFFER");
  return { gate: CANONICAL_RENDERED_OFFER_PARITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateOfferTimeToValueAlignmentGate(input: {
  offer_type: OfferType | null;
  time_to_value: TimeToValueType | "UNKNOWN";
  explanation?: string | null;
}): NamedSystemGate {
  if (!input.offer_type || input.time_to_value === "UNKNOWN") {
    return { gate: OFFER_TIME_TO_VALUE_ALIGNMENT_GATE, result: "PASS", reasons: ["ALIGNMENT_NOT_FORCED_WHEN_UNKNOWN"] };
  }
  const trialLike = /TRIAL|FREEMIUM/.test(input.offer_type);
  const transactional = input.time_to_value === "TRANSACTION_BASED" || input.time_to_value === "EVENT_BASED";
  if (trialLike && transactional && !input.explanation) {
    return {
      gate: OFFER_TIME_TO_VALUE_ALIGNMENT_GATE,
      result: "FAIL",
      reasons: ["TRIAL_WITHOUT_MEANINGFUL_TRANSACTION_PATH"],
    };
  }
  return { gate: OFFER_TIME_TO_VALUE_ALIGNMENT_GATE, result: "PASS", reasons: [] };
}

export function evaluateOfferCTACompletenessGate(rendered: RenderedOfferObservation, offerType?: OfferType | null): NamedSystemGate {
  const reasons: string[] = [];
  if (!rendered.cta_visible) reasons.push("CTA_NOT_VISIBLE");
  if (!rendered.cta_clickable) reasons.push("CTA_NOT_CLICKABLE");
  if (!rendered.cta_label) reasons.push("CTA_LABEL_MISSING");
  if (rendered.cta_label && rendered.cta_behavior && !ctaMatchesBehavior(rendered.cta_label, rendered.cta_behavior, offerType)) {
    reasons.push("CTA_BEHAVIOR_MISMATCH");
  }
  return { gate: OFFER_CTA_COMPLETENESS_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

function ctaMatchesBehavior(label: string, behavior: string, offerType?: OfferType | null): boolean {
  const text = `${label} ${behavior} ${offerType ?? ""}`.toLowerCase();
  if (/trial/i.test(label) && !/trial/i.test(behavior)) return false;
  if (/pilot/i.test(label) && !/pilot/i.test(behavior)) return false;
  if (/demo/i.test(label) && !/demo|consult/i.test(behavior)) return false;
  if (/buy|professional|checkout|purchase/i.test(label) && /dead|missing|none/i.test(behavior)) return false;
  return !/dead.?end|none/i.test(text);
}

export function evaluateCommercialOfferJourneyGate(journey: OfferJourneyObservation, paid: boolean): NamedSystemGate {
  const reasons: string[] = [];
  if (!journey.offer_surface) reasons.push("OFFER_SURFACE_MISSING");
  if (!journey.offer_start) reasons.push("OFFER_START_MISSING");
  if (!journey.product_account_or_payment) reasons.push("PAYMENT_OR_ACCOUNT_STEP_MISSING");
  if (!journey.value_or_entitlement) reasons.push("VALUE_ENTITLEMENT_MISSING");
  if (paid && journey.paid_conversion === false) reasons.push("PAID_CONVERSION_MISSING");
  if (journey.dead_end) reasons.push("OFFER_JOURNEY_DEAD_END");
  return { gate: COMMERCIAL_OFFER_JOURNEY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateOfferMeasurementReadinessGate(input: {
  lifecycle: CommercialOfferLifecycle;
  measurement: OfferMeasurementObservation;
  paid: boolean;
}): NamedSystemGate {
  if (input.lifecycle !== "ACTIVE") {
    return { gate: OFFER_MEASUREMENT_READINESS_GATE, result: "PASS", reasons: ["MEASUREMENT_NOT_REQUIRED_WHEN_NOT_ACTIVE"] };
  }
  const required: Array<keyof OfferMeasurementObservation> = [
    "offer_impression",
    "offer_cta_click",
    "offer_start",
    "activation",
    "meaningful_use",
  ];
  if (input.paid) required.push("checkout", "paid_conversion", "cancel_or_refund");
  const missing = required.filter((key) => !input.measurement[key]);
  return {
    gate: OFFER_MEASUREMENT_READINESS_GATE,
    result: missing.length === 0 ? "PASS" : "FAIL",
    reasons: missing.map((key) => `MEASUREMENT_MISSING:${key}`),
  };
}

export function evaluateCommercialOfferDisclosureQCGate(input: {
  rendered: RenderedOfferObservation;
  offer: OfferArchitectureContract | null;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.rendered.included_value_visible && !input.offer?.primary_product) reasons.push("INCLUDED_VALUE_UNDISCLOSED");
  if (!input.rendered.prices_visible) reasons.push("PRICE_UNDISCLOSED");
  if (input.offer?.trial_policy.auto_convert && !input.rendered.auto_convert_disclosed) reasons.push("AUTO_CONVERT_UNDISCLOSED");
  if (input.offer?.trial_policy.enabled && !input.rendered.live_post_offer_price && input.offer.trial_policy.post_trial_price === "UNKNOWN") {
    reasons.push("POST_OFFER_PRICE_UNDISCLOSED");
  }
  if (input.rendered.cancellation_disclosed === false) reasons.push("CANCELLATION_UNDISCLOSED");
  return { gate: COMMERCIAL_OFFER_DISCLOSURE_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluatePaidFirstOfferValidation(input: {
  offer_type: OfferType | null;
  rendered: RenderedOfferObservation;
  purchase_friction: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  high_friction_justification?: string | null;
  lifecycle: CommercialOfferLifecycle;
  commercial_activation_claimed: boolean;
}): NamedSystemGate {
  if (input.offer_type && input.offer_type !== "PAID_FIRST") {
    return { gate: "PaidFirstOfferValidation", result: "PASS", reasons: ["NOT_PAID_FIRST"] };
  }
  const reasons: string[] = [];
  if (!input.rendered.offer_block_present) reasons.push("PAID_FIRST_NOT_EXPRESSED");
  if (!input.rendered.value_proposition_visible) reasons.push("VALUE_PROPOSITION_MISSING");
  if (!input.rendered.included_value_visible) reasons.push("INCLUDED_VALUE_MISSING");
  if (!input.rendered.prices_visible) reasons.push("PRICE_MISSING");
  if (!input.rendered.cta_visible) reasons.push("CTA_MISSING");
  if (!input.rendered.conversion_path_visible && !input.rendered.journey.offer_start) reasons.push("PURCHASE_PATH_MISSING");
  if (/trial on|start trial/i.test(`${input.rendered.cta_label ?? ""} ${input.rendered.live_trial_or_pilot ?? ""}`)) {
    reasons.push("CONTRADICTORY_TRIAL_ON_PAID_FIRST");
  }
  if (input.purchase_friction === "HIGH") {
    const justified = Boolean(input.high_friction_justification);
    const deferredHonest = !input.commercial_activation_claimed && (input.lifecycle === "TEST_READY" || input.lifecycle === "PLANNED" || input.lifecycle === "ANALYSIS_ONLY");
    if (!justified && !deferredHonest && !input.rendered.risk_reduction_visible) {
      reasons.push("HIGH_FRICTION_PAID_FIRST_UNJUSTIFIED");
    }
  }
  return { gate: "PaidFirstOfferValidation", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateCommercialOfferRemovalGate(input: {
  prior_offer_present?: boolean;
  prior_cta_present?: boolean;
  rendered: RenderedOfferObservation;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (input.prior_offer_present && !input.rendered.offer_block_present) reasons.push("ACTIVE_OFFER_DISAPPEARED");
  if (input.prior_cta_present && !input.rendered.cta_visible) reasons.push("OFFER_CTA_DISAPPEARED");
  if (input.rendered.prices_visible && !input.rendered.offer_block_present && input.prior_offer_present) {
    reasons.push("PRICING_REMAINED_OFFER_CONTENT_GONE");
  }
  return { gate: COMMERCIAL_OFFER_REMOVAL_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function invalidateQcOnOfferArchitectureChange(): Record<string, "UNVERIFIED"> {
  return {
    SUBSCRIPTION: "UNVERIFIED",
    COMMERCIAL_OFFER: "UNVERIFIED",
    CHECKOUT: "UNVERIFIED",
    offer_surface: "UNVERIFIED",
    offer_cta: "UNVERIFIED",
    offer_disclosure: "UNVERIFIED",
    offer_journey: "UNVERIFIED",
    offer_measurement: "UNVERIFIED",
  };
}

export function evaluateRenderedOfferVisualQuality(input: RenderedOfferObservation) {
  return evaluateRenderedVisualQualityGate({
    unstyled_controls: input.browser_default_controls ? 1 : 0,
    layout_breaks: input.mobile_ok === false,
    clipping: input.terms_clipped === true,
    overflow: input.terms_clipped === true,
    overlapping: false,
    hierarchy_ok: input.cta_hierarchy_ok !== false && input.offer_prominence_ok !== false,
    readable: input.readable !== false,
    buttons_malformed: input.cta_visible && !input.cta_clickable,
  });
}

export function evaluateCommercialOfferCompletenessGate(input: CommercialOfferQcInput): NamedSystemGate & {
  lifecycle: CommercialOfferLifecycle;
  surfaces: RenderedOfferSurfaceContract;
  price_only: NamedSystemGate;
  parity: NamedSystemGate;
  ttv: NamedSystemGate;
  cta: NamedSystemGate;
  journey: NamedSystemGate;
  measurement: NamedSystemGate;
  disclosure: NamedSystemGate;
  paid_first: NamedSystemGate;
  removal: NamedSystemGate;
} {
  const lifecycle = input.claimed_lifecycle
    ?? mapOfferStatusToLifecycle(input.canonical_offer?.status, input.canonical_offer?.activation);
  const surfaces = buildRenderedOfferSurfaceContract({
    venture_id: input.canonical_offer?.venture_id ?? "unknown",
    surfaces: input.surfaces,
    commercial_venture: input.commercial_venture,
  });
  const price_only = evaluatePriceOnlyCommercializationGate(input.rendered);
  const parity = evaluateCanonicalRenderedOfferParityGate({
    canonical: input.canonical_offer,
    rendered: input.rendered,
    lifecycle,
  });
  const ttv = evaluateOfferTimeToValueAlignmentGate({
    offer_type: input.canonical_offer?.offer_type ?? null,
    time_to_value: input.time_to_value,
    explanation: input.high_friction_justification,
  });
  const cta = evaluateOfferCTACompletenessGate(input.rendered, input.canonical_offer?.offer_type);
  const journey = evaluateCommercialOfferJourneyGate(input.rendered.journey, input.commercial_venture);
  const measurement = evaluateOfferMeasurementReadinessGate({
    lifecycle: input.commercial_activation_claimed ? "ACTIVE" : lifecycle,
    measurement: input.rendered.measurement,
    paid: input.commercial_venture,
  });
  const disclosure = evaluateCommercialOfferDisclosureQCGate({
    rendered: input.rendered,
    offer: input.canonical_offer,
  });
  const paid_first = evaluatePaidFirstOfferValidation({
    offer_type: input.canonical_offer?.offer_type ?? "PAID_FIRST",
    rendered: input.rendered,
    purchase_friction: input.purchase_friction,
    high_friction_justification: input.high_friction_justification,
    lifecycle,
    commercial_activation_claimed: input.commercial_activation_claimed,
  });
  const removal = evaluateCommercialOfferRemovalGate({
    prior_offer_present: input.prior_offer_present,
    prior_cta_present: input.prior_cta_present,
    rendered: input.rendered,
  });

  const reasons: string[] = [];
  if (!input.commercial_venture) {
    return {
      gate: COMMERCIAL_OFFER_COMPLETENESS_GATE,
      result: "PASS",
      reasons: ["NON_COMMERCIAL"],
      lifecycle,
      surfaces,
      price_only,
      parity,
      ttv,
      cta,
      journey,
      measurement,
      disclosure,
      paid_first,
      removal,
    };
  }
  if (!input.canonical_offer) reasons.push("CANONICAL_OFFER_ARCHITECTURE_MISSING");
  if (surfaces.result !== "PASS") reasons.push("RENDERED_OFFER_SURFACE_MISSING");
  if (price_only.result !== "PASS") reasons.push("PRICE_ONLY_COMMERCIALIZATION");
  if (!input.rendered.offer_block_present) reasons.push("MISSING_OR_UNEXPRESSED_OFFER");
  if (parity.result !== "PASS") reasons.push("CANONICAL_LIVE_PARITY_FAIL");
  if (ttv.result !== "PASS") reasons.push("TIME_TO_VALUE_MISALIGNED");
  if (cta.result !== "PASS") reasons.push("OFFER_CTA_INCOMPLETE");
  if (journey.result !== "PASS") reasons.push("OFFER_JOURNEY_INCOMPLETE");
  if (measurement.result !== "PASS") reasons.push("OFFER_MEASUREMENT_INVISIBLE");
  if (disclosure.result !== "PASS") reasons.push("OFFER_DISCLOSURE_INCOMPLETE");
  if (paid_first.result !== "PASS") reasons.push("PAID_FIRST_INCOMPLETE");
  if (removal.result !== "PASS") reasons.push("ACTIVE_OFFER_REMOVED");
  if ((lifecycle === "ANALYSIS_ONLY" || lifecycle === "PLANNED") && input.commercial_activation_claimed) {
    reasons.push("HQ_OR_ANALYSIS_IS_NOT_LIVE_OFFER");
  }
  return {
    gate: COMMERCIAL_OFFER_COMPLETENESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    lifecycle,
    surfaces,
    price_only,
    parity,
    ttv,
    cta,
    journey,
    measurement,
    disclosure,
    paid_first,
    removal,
  };
}

export function occupancyNpvPriceOnlyRenderedOffer(): RenderedOfferObservation {
  return {
    prices_visible: true,
    billing_frequency_visible: true,
    checkout_cta_visible: true,
    value_proposition_visible: false,
    included_value_visible: false,
    offer_type_visible: false,
    offer_conditions_visible: false,
    risk_reduction_visible: false,
    conversion_path_visible: false,
    next_step_visible: false,
    offer_block_present: false,
    cta_label: "Buy Professional",
    cta_visible: true,
    cta_clickable: true,
    cta_behavior: "checkout",
    live_offer_type: null,
    live_price: "$290",
    live_billing: "year",
    live_trial_or_pilot: "OFF · Request Pilot Access",
    journey: {
      offer_surface: false,
      offer_start: true,
      product_account_or_payment: true,
      value_or_entitlement: true,
      paid_conversion: true,
      dead_end: false,
    },
    measurement: {
      offer_impression: false,
      offer_cta_click: false,
      offer_start: false,
      activation: false,
      meaningful_use: false,
      checkout: true,
      paid_conversion: true,
      cancel_or_refund: false,
      support_burden: false,
    },
  };
}

export function completePaidFirstRenderedOffer(): RenderedOfferObservation {
  return {
    prices_visible: true,
    billing_frequency_visible: true,
    checkout_cta_visible: true,
    value_proposition_visible: true,
    included_value_visible: true,
    offer_type_visible: true,
    offer_conditions_visible: true,
    risk_reduction_visible: true,
    conversion_path_visible: true,
    next_step_visible: true,
    offer_block_present: true,
    cta_label: "Buy Professional",
    cta_visible: true,
    cta_clickable: true,
    cta_behavior: "checkout",
    live_offer_type: "PAID_FIRST",
    live_price: "$290",
    live_billing: "year",
    live_trial_or_pilot: "OFF",
    cancellation_disclosed: true,
    eligibility_disclosed: true,
    offer_prominence_ok: true,
    cta_hierarchy_ok: true,
    readable: true,
    mobile_ok: true,
    browser_default_controls: false,
    terms_clipped: false,
    journey: {
      offer_surface: true,
      offer_start: true,
      product_account_or_payment: true,
      value_or_entitlement: true,
      paid_conversion: true,
      dead_end: false,
    },
    measurement: {
      offer_impression: true,
      offer_cta_click: true,
      offer_start: true,
      activation: true,
      meaningful_use: true,
      checkout: true,
      paid_conversion: true,
      cancel_or_refund: true,
      support_burden: true,
    },
  };
}

export function occupancyNpvOfferSurfaces(present = true): RenderedOfferSurface[] {
  return [
    { kind: "pricing_page", present, primary: true },
    { kind: "checkout_entry", present, primary: false },
    { kind: "homepage_cta", present, primary: false },
  ];
}

const RENDERED_OFFER_CTA_LABELS = "Start Free Trial|Buy Professional|Start Professional|Start One Deal|Start First Deal|Start Trial|Request Pilot(?: Access)?|Book Demo";

function inferPrimaryRenderedCtaLabel(text: string, hasCheckout: boolean): string | null {
  const offerSlice = /data-offer-block/i.test(text)
    ? (text.match(/data-offer-block[\s\S]{0,16000}/i)?.[0] ?? text)
    : text;
  const primary = offerSlice.match(/data-offer-cta=["']primary["'][^>]*>\s*([^<]+)\s*</i);
  if (primary?.[1]?.trim()) return primary[1].trim();
  const inOffer = offerSlice.match(new RegExp(`>(${RENDERED_OFFER_CTA_LABELS})<`, "i"));
  if (inOffer?.[1]) return inOffer[1];
  const page = text.match(new RegExp(`>(${RENDERED_OFFER_CTA_LABELS})<`, "i"));
  return page?.[1] ?? (hasCheckout ? "Start Professional" : null);
}

function inferLiveOfferType(text: string): string {
  const marked = text.match(/data-offer-type=["']([^"']+)["']/i)?.[1];
  if (marked) return marked;
  if (/no.card trial|start free trial|free for 3 days/i.test(text)) return "NO_CARD_TRIAL";
  if (/paid-first|PAID_FIRST/i.test(text)) return "PAID_FIRST";
  return completePaidFirstRenderedOffer().live_offer_type ?? "PAID_FIRST";
}

function inferLiveTrialOrPilot(text: string): string {
  if (/data-promotional-offer="NONE"|trial is off|trial off|TRIAL_OFF/i.test(text) && !/start free trial|free for 3 days/i.test(text)) {
    return "OFF";
  }
  if (/start free trial|3-day|3 days|no credit card/i.test(text)) return "3-DAY NO-CARD TRIAL";
  return completePaidFirstRenderedOffer().live_trial_or_pilot ?? "OFF";
}

function inferRenderedCtaBehavior(label: string | null): string {
  if (/pilot/i.test(label ?? "")) return "pilot";
  if (/trial/i.test(label ?? "")) return "trial";
  if (/demo|book/i.test(label ?? "")) return "demo";
  if (/first deal|first use/i.test(label ?? "")) return "first-use";
  return "checkout";
}

export function inferRenderedOfferFromHtml(html: string | undefined): RenderedOfferObservation {
  const text = html ?? "";
  const hasPrice = /\$\s?290|\$\s?149|\/year|\/mo|per year|per month/i.test(text);
  const hasBilling = /\/year|annual|per-deal|\/mo|monthly|billing/i.test(text);
  const hasCheckout = /checkout|buy professional|start professional|start one deal|subscribe|purchase|stripe/i.test(text);
  const materialAdvantage = /free trial|start trial|first (deal|comparison|use) free|money[- ]back|%\s*off|discounted first|bonus (month|seat)|included pilot/i.test(text)
    && !/trial is off|trial off|no free recurring|data-promotional-offer="NONE"/i.test(text);
  const fakePaidFirst = /data-offer-block|primary offer · paid-first|offer type: paid-first|data-offer-type="PAID_FIRST"/i.test(text)
    && !materialAdvantage;
  const offerBlock = materialAdvantage && (
    /data-offer-block/i.test(text)
    || /data-promotional-offer="(?!NONE)[^"]+"/i.test(text)
    || /data-customer-advantage=/i.test(text)
  );
  const value = /what you get|what's included|included value|you receive|you get|try occupancynpv|dealworkspace|free for 3 days/i.test(text);
  const offerType = /data-offer-type|paid-first|paid first|free trial|no.card trial|free first|pilot offer|membership/i.test(text);
  const conditions = /eligib|limit|duration|cancel|terms|conditions|no credit card|no automatic billing/i.test(text);
  const path = /start first deal|start professional|start one deal|start free trial|start trial|request pilot|buy professional|book demo|next step|what happens next/i.test(text);
  const cta = inferPrimaryRenderedCtaLabel(text, hasCheckout);
  const instrumented = /data-offer-events|\/api\/occupancynpv\/offer-events/i.test(text);
  if (fakePaidFirst) {
    return {
      ...occupancyNpvPriceOnlyRenderedOffer(),
      prices_visible: hasPrice,
      billing_frequency_visible: hasBilling || hasPrice,
      checkout_cta_visible: hasCheckout,
      cta_label: cta,
      cta_visible: Boolean(cta),
      cta_clickable: Boolean(cta),
      offer_block_present: false,
      live_offer_type: null,
      value_proposition_visible: false,
      included_value_visible: false,
      offer_type_visible: false,
    };
  }
  if (offerBlock) {
    return {
      ...completePaidFirstRenderedOffer(),
      prices_visible: hasPrice,
      billing_frequency_visible: hasBilling,
      checkout_cta_visible: hasCheckout,
      value_proposition_visible: value,
      included_value_visible: value,
      offer_type_visible: offerType,
      offer_conditions_visible: conditions,
      conversion_path_visible: path,
      next_step_visible: path,
      cta_label: cta,
      cta_visible: Boolean(cta),
      cta_clickable: Boolean(cta),
      cta_behavior: inferRenderedCtaBehavior(cta),
      live_offer_type: inferLiveOfferType(text),
      live_trial_or_pilot: inferLiveTrialOrPilot(text),
      live_post_offer_price: /\$290\/year/.test(text) ? "$290/year" : completePaidFirstRenderedOffer().live_post_offer_price,
      auto_convert_disclosed: /no automatic billing|no auto-convert|cancel anytime/i.test(text),
      cancellation_disclosed: /cancel/i.test(text),
      measurement: {
        offer_impression: instrumented,
        offer_cta_click: instrumented,
        offer_start: instrumented,
        activation: instrumented,
        meaningful_use: instrumented,
        checkout: instrumented || hasCheckout,
        paid_conversion: instrumented || hasCheckout,
        cancel_or_refund: instrumented || /refund|cancel/i.test(text),
        support_burden: instrumented,
      },
    };
  }
  return {
    ...occupancyNpvPriceOnlyRenderedOffer(),
    prices_visible: hasPrice,
    billing_frequency_visible: hasBilling || hasPrice,
    checkout_cta_visible: hasCheckout,
    cta_label: cta,
    cta_visible: Boolean(cta),
    cta_clickable: Boolean(cta),
    offer_block_present: false,
    value_proposition_visible: false,
    included_value_visible: false,
    offer_type_visible: false,
  };
}

export function evaluateOccupancynpvCommercialOfferCompleteness(input: {
  html?: string;
  rendered?: RenderedOfferObservation;
  canonical: OfferArchitectureContract;
  commercial_activation_claimed?: boolean;
  claimed_lifecycle?: CommercialOfferLifecycle;
  high_friction_justification?: string | null;
  prior_offer_present?: boolean;
  prior_cta_present?: boolean;
} ) {
  const rendered = input.rendered ?? inferRenderedOfferFromHtml(input.html);
  return evaluateCommercialOfferCompletenessGate({
    commercial_venture: true,
    commercial_activation_claimed: input.commercial_activation_claimed ?? true,
    canonical_offer: input.canonical,
    surfaces: occupancyNpvOfferSurfaces(true),
    rendered,
    purchase_friction: input.canonical.purchase_friction,
    time_to_value: input.canonical.time_to_value === "UNKNOWN" ? "UNKNOWN" : input.canonical.time_to_value,
    high_friction_justification: input.high_friction_justification ?? null,
    claimed_lifecycle: input.claimed_lifecycle,
    prior_offer_present: input.prior_offer_present,
    prior_cta_present: input.prior_cta_present,
  });
}

export function evaluateOccupancynpvPriorBlindSpotRegression(canonical: OfferArchitectureContract) {
  const completeness = evaluateOccupancynpvCommercialOfferCompleteness({
    canonical,
    rendered: occupancyNpvPriceOnlyRenderedOffer(),
    commercial_activation_claimed: true,
    claimed_lifecycle: "ACTIVE",
  });
  return {
    pricing: "PASS" as const,
    checkout: "PASS" as const,
    payment: "PASS" as const,
    fulfillment: "PASS" as const,
    active_rendered_offer: "FAIL" as const,
    completeness,
    expected_full_qc: "FAIL" as const,
    blind_spot_caught: completeness.result === "FAIL" && completeness.reasons.includes("PRICE_ONLY_COMMERCIALIZATION"),
  };
}

export function commercialOfferSmokeSurfaces(input: {
  commercial: boolean;
  completeness: ReturnType<typeof evaluateCommercialOfferCompletenessGate>;
  rendered: RenderedOfferObservation;
}): Array<{
  surface: "primary_offer_surface" | "primary_offer_cta" | "offer_state" | "offer_price_consistency" | "offer_journey_entry";
  applicable: boolean;
  result: "PASS" | "FAIL" | "UNKNOWN";
  reason?: string;
}> {
  if (!input.commercial) {
    return [
      { surface: "primary_offer_surface", applicable: false, result: "PASS" },
      { surface: "primary_offer_cta", applicable: false, result: "PASS" },
      { surface: "offer_state", applicable: false, result: "PASS" },
      { surface: "offer_price_consistency", applicable: false, result: "PASS" },
      { surface: "offer_journey_entry", applicable: false, result: "PASS" },
    ];
  }
  return [
    {
      surface: "primary_offer_surface",
      applicable: true,
      result: input.completeness.surfaces.result === "PASS" && input.rendered.offer_block_present ? "PASS" : "FAIL",
      reason: input.rendered.offer_block_present ? undefined : "PRIMARY_OFFER_SURFACE_HAS_NO_OFFER",
    },
    {
      surface: "primary_offer_cta",
      applicable: true,
      result: input.completeness.cta.result,
      reason: input.completeness.cta.reasons[0],
    },
    {
      surface: "offer_state",
      applicable: true,
      result: input.rendered.offer_block_present && input.completeness.result === "PASS" ? "PASS" : "FAIL",
      reason: input.completeness.reasons[0],
    },
    {
      surface: "offer_price_consistency",
      applicable: true,
      result: input.rendered.prices_visible && !input.completeness.parity.reasons.includes("PRICE_MISMATCH") ? "PASS" : "FAIL",
      reason: input.completeness.parity.reasons.includes("PRICE_MISMATCH") ? "PRICE_MISMATCH" : undefined,
    },
    {
      surface: "offer_journey_entry",
      applicable: true,
      result: input.rendered.journey.offer_surface && input.rendered.journey.offer_start ? "PASS" : "FAIL",
      reason: input.rendered.journey.offer_surface ? undefined : "OFFER_JOURNEY_ENTRY_MISSING",
    },
  ];
}
