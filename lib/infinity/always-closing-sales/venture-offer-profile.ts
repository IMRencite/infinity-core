import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import type { CommercialAction, CommercialInteraction, SalesStagePolicy } from "./doctrine";

export const UNKNOWN = "UNKNOWN" as const;
export const NONE = "NONE" as const;

export type OfferTriState = true | false | typeof UNKNOWN;
export type OfferStatus = "VERIFIED" | "UNVERIFIED" | "EXPIRED" | typeof UNKNOWN;
export type VerifiedOfferField = string | typeof UNKNOWN | typeof NONE;

export type VentureOfferProfile = {
  venture_id: string;
  primary_offer: VerifiedOfferField;
  primary_product: VerifiedOfferField;
  pricing_model: VerifiedOfferField;
  current_price: VerifiedOfferField;
  free_trial_available: OfferTriState;
  free_trial_terms: VerifiedOfferField;
  free_trial_url: VerifiedOfferField;
  demo_available: OfferTriState;
  demo_url: VerifiedOfferField;
  checkout_url: VerifiedOfferField;
  purchase_url: VerifiedOfferField;
  primary_conversion_url: VerifiedOfferField;
  guarantee: VerifiedOfferField;
  risk_reversal: VerifiedOfferField;
  onboarding_offer: VerifiedOfferField;
  current_promotion: VerifiedOfferField;
  discount: VerifiedOfferField;
  promotion_expiry: VerifiedOfferField;
  upsell_offers: VerifiedOfferField[];
  renewal_offer: VerifiedOfferField;
  referral_offer: VerifiedOfferField;
  approved_claims: string[];
  approved_proof: string[];
  offer_status: OfferStatus;
  last_verified_at: VerifiedOfferField;
  evidence_url: VerifiedOfferField;
};

export const OCCUPANCYNPV_VERIFIED_OFFER_PROFILE: VentureOfferProfile = {
  venture_id: "occupancynpv",
  primary_offer: "3-day no-card free trial, then Professional $290/year or Per-Deal $149",
  primary_product: "OccupancyNPV DealWorkspace lease comparison",
  pricing_model: "annual_subscription + per_transaction",
  current_price: "Professional $290/year · Per-Deal $149",
  free_trial_available: true,
  free_trial_terms: "3 days · 1 user · 1 DealWorkspace · no credit card · no automatic billing",
  free_trial_url: "https://occupancynpv.com/pricing",
  demo_available: false,
  demo_url: NONE,
  checkout_url: "https://occupancynpv.com/pricing",
  purchase_url: "https://occupancynpv.com/pricing",
  primary_conversion_url: "https://occupancynpv.com/pricing",
  guarantee: NONE,
  risk_reversal: "No credit card. No automatic billing.",
  onboarding_offer: "3-day free trial",
  current_promotion: NONE,
  discount: NONE,
  promotion_expiry: NONE,
  upsell_offers: ["UNKNOWN"],
  renewal_offer: UNKNOWN,
  referral_offer: UNKNOWN,
  approved_claims: [
    "3-day free trial with no credit card and no automatic billing",
    "Professional is $290/year",
    "Per-Deal is $149",
    "One authenticated user and one DealWorkspace during the trial",
  ],
  approved_proof: [
    "occupancynpv-product-surface",
    "occupancynpv-npv-value",
    "occupancynpv-assumptions",
    "https://occupancynpv.com/pricing",
  ],
  offer_status: "VERIFIED",
  last_verified_at: "2026-09-18T07:20:00.000Z",
  evidence_url: "https://occupancynpv.com/pricing",
};

const PROFILES: Record<string, VentureOfferProfile> = {
  occupancynpv: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE,
};

export function unknownVentureOfferProfile(venture_id: string): VentureOfferProfile {
  return {
    venture_id,
    primary_offer: UNKNOWN,
    primary_product: UNKNOWN,
    pricing_model: UNKNOWN,
    current_price: UNKNOWN,
    free_trial_available: UNKNOWN,
    free_trial_terms: UNKNOWN,
    free_trial_url: UNKNOWN,
    demo_available: UNKNOWN,
    demo_url: UNKNOWN,
    checkout_url: UNKNOWN,
    purchase_url: UNKNOWN,
    primary_conversion_url: UNKNOWN,
    guarantee: UNKNOWN,
    risk_reversal: UNKNOWN,
    onboarding_offer: UNKNOWN,
    current_promotion: UNKNOWN,
    discount: UNKNOWN,
    promotion_expiry: UNKNOWN,
    upsell_offers: [UNKNOWN],
    renewal_offer: UNKNOWN,
    referral_offer: UNKNOWN,
    approved_claims: [],
    approved_proof: [],
    offer_status: UNKNOWN,
    last_verified_at: UNKNOWN,
    evidence_url: UNKNOWN,
  };
}

export function loadVentureOfferProfile(venture_id: string): VentureOfferProfile {
  return PROFILES[venture_id] ?? unknownVentureOfferProfile(venture_id);
}

export function offerFieldUsable(value: VerifiedOfferField | OfferTriState): boolean {
  return value !== UNKNOWN && value !== NONE && value !== false;
}

export function promotionExpired(profile: VentureOfferProfile, now: string): boolean {
  if (profile.promotion_expiry === UNKNOWN || profile.promotion_expiry === NONE) return false;
  return Date.parse(profile.promotion_expiry) <= Date.parse(now);
}

export function evaluateVentureOfferTruthGate(input: {
  profile: VentureOfferProfile;
  claimed: string;
  now?: string;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  const claim = input.claimed.toLowerCase();
  const { profile } = input;
  if (profile.offer_status !== "VERIFIED") reasons.push("OFFER_NOT_VERIFIED");
  if (profile.last_verified_at === UNKNOWN) reasons.push("OFFER_NOT_DATED");
  if (promotionExpired(profile, input.now ?? new Date().toISOString()) && /promo|discount|% off/.test(claim)) {
    reasons.push("OFFER_EXPIRED");
  }
  if (/free trial|start the 3-day/.test(claim) && profile.free_trial_available !== true) reasons.push("UNVERIFIED_TRIAL_CLAIM");
  if (/\bdemo\b/.test(claim) && profile.demo_available !== true) reasons.push("UNVERIFIED_DEMO_CLAIM");
  if (/guarantee|money[- ]back/.test(claim) && !offerFieldUsable(profile.guarantee)) reasons.push("UNVERIFIED_GUARANTEE_CLAIM");
  if (/discount|% off|limited time/.test(claim) && !offerFieldUsable(profile.discount) && !offerFieldUsable(profile.current_promotion)) {
    reasons.push("UNVERIFIED_PROMOTION_CLAIM");
  }
  const inventing = /7-day|14-day|30-day|money[- ]back|today only|expires tonight/.test(claim)
    && !profile.approved_claims.some((row) => claim.includes(row.toLowerCase().slice(0, 12)));
  if (inventing) reasons.push("INVENTED_OFFER_DETAIL");
  return {
    gate: "VentureOfferTruthGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["OFFER_VERIFIED_CURRENT"],
  };
}

export function evaluateVentureOfferFreshnessGate(input: {
  profile: VentureOfferProfile;
  now: string;
  max_age_hours?: number;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.profile.offer_status !== "VERIFIED") reasons.push("NOT_VERIFIED");
  if (input.profile.last_verified_at === UNKNOWN) reasons.push("NEVER_VERIFIED");
  else {
    const ageH = (Date.parse(input.now) - Date.parse(input.profile.last_verified_at)) / 3_600_000;
    if (Number.isNaN(ageH) || ageH > (input.max_age_hours ?? 48)) reasons.push("OFFER_STALE");
  }
  if (promotionExpired(input.profile, input.now)) reasons.push("PROMOTION_EXPIRED");
  if (input.profile.primary_conversion_url === UNKNOWN) reasons.push("CONVERSION_URL_UNKNOWN");
  return {
    gate: "VentureOfferFreshnessGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["OFFER_FRESH"],
  };
}

export function strongestRelevantOffer(profile: VentureOfferProfile, stage: SalesStagePolicy): {
  kind: "TRIAL" | "DEMO" | "PURCHASE" | "CONVERSION" | "NONE";
  cta: string;
  url: VerifiedOfferField;
} {
  if (stage === "FIRST_TOUCH") {
    return { kind: "NONE", cta: "", url: NONE };
  }
  if (profile.free_trial_available === true && offerFieldUsable(profile.free_trial_url)) {
    return {
      kind: "TRIAL",
      cta: stage === "HIGH_INTENT"
        ? `Start your free trial at ${profile.free_trial_url}`
        : `You can try this with your actual numbers in the free trial: ${profile.free_trial_url}`,
      url: profile.free_trial_url,
    };
  }
  if (profile.demo_available === true && offerFieldUsable(profile.demo_url)) {
    return { kind: "DEMO", cta: `Book the demo: ${profile.demo_url}`, url: profile.demo_url };
  }
  if (offerFieldUsable(profile.primary_conversion_url)) {
    return {
      kind: "CONVERSION",
      cta: `The next step is ${profile.primary_conversion_url}`,
      url: profile.primary_conversion_url,
    };
  }
  return { kind: "NONE", cta: "", url: NONE };
}

export function evaluateOfferDrivenSalesAdvancementGate(input: {
  stage: SalesStagePolicy;
  profile: VentureOfferProfile;
  generated: string;
  next_action: CommercialAction;
  inbound: string;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  const offer = strongestRelevantOffer(input.profile, input.stage);
  const body = input.generated;
  if (input.profile.offer_status !== "VERIFIED") reasons.push("REAL_OFFER_NOT_CHECKED");
  if (offer.kind === "NONE" && ["ENGAGED", "QUALIFIED", "HIGH_INTENT"].includes(input.stage) && input.profile.offer_status === "VERIFIED") {
    if (!offerFieldUsable(input.profile.primary_conversion_url) && input.profile.free_trial_available !== true && input.profile.demo_available !== true) {
      reasons.push("NO_VERIFIED_CONVERSION_PATH");
    }
  }
  if (["ENGAGED", "QUALIFIED", "HIGH_INTENT"].includes(input.stage) && offer.kind === "TRIAL" && !/free trial|trial at occupancynpv/i.test(body)) {
    reasons.push("OFFER_NOT_SURFACED");
  }
  if (/if useful|if you'd like|let me know if/i.test(body)) reasons.push("PASSIVE_DEAD_END");
  if (/7-day|14-day|30-day trial|money[- ]back|expires tonight/.test(body) && !input.profile.approved_claims.some((row) => body.toLowerCase().includes(row.toLowerCase().slice(0, 16)))) {
    reasons.push("FAKE_INCENTIVE");
  }
  if (offer.url !== NONE && offer.url !== UNKNOWN && /https:\/\/occupancynpv\.com\/pricing/.test(String(offer.url)) && /https:\/\/occupancynpv\.com(?!\/pricing)/.test(body) && !/pricing/.test(body)) {
    reasons.push("CTA_WRONG_DESTINATION");
  }
  if (input.next_action === "WAIT" && ["QUALIFIED", "HIGH_INTENT"].includes(input.stage)) reasons.push("NO_STAGE_CTA");
  const truth = evaluateVentureOfferTruthGate({ profile: input.profile, claimed: body });
  if (truth.result !== "PASS") reasons.push(...truth.reasons);
  return {
    gate: "OfferDrivenSalesAdvancementGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["OFFER_ADVANCED"],
  };
}

export function offerAwareFallbackAction(input: {
  stage: SalesStagePolicy;
  profile: VentureOfferProfile;
  customer?: boolean;
}): CommercialAction {
  if (input.customer) return "OFFER_UPSELL";
  if (input.stage === "HIGH_INTENT") return input.profile.free_trial_available === true ? "START_TRIAL" : "REQUEST_PURCHASE";
  if (input.stage === "QUALIFIED") {
    if (input.profile.free_trial_available === true) return "START_TRIAL";
    if (input.profile.demo_available === true) return "BOOK_DEMO";
    return "REQUEST_NUMBERS";
  }
  if (input.stage === "ENGAGED") {
    if (input.profile.free_trial_available === true) return "INVITE_TRIAL";
    if (input.profile.demo_available === true) return "INVITE_DEMO";
    return "SHOW_EXAMPLE";
  }
  return "SHOW_EXAMPLE";
}

export function attachOfferToInteraction(input: CommercialInteraction & { venture_id?: string }): VentureOfferProfile {
  return loadVentureOfferProfile(input.venture_id ?? "occupancynpv");
}
