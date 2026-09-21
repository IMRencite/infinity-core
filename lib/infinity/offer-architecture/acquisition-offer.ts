import type { NamedOfferGate, VentureArchetype } from "./types";

export const VENTURE_ACQUISITION_OFFER_REQUIREMENT = "VentureAcquisitionOfferRequirement" as const;
export const MANDATORY_ACQUISITION_OFFER_GATE = "MandatoryAcquisitionOfferGate" as const;

export const ACQUISITION_OFFER_LIFECYCLE = [
  "RESEARCHING",
  "OFFER_CANDIDATES",
  "OFFER_SELECTED",
  "OFFER_READY",
  "OFFER_ACTIVE",
  "OFFER_MEASURING",
  "OFFER_OPTIMIZED",
] as const;
export type AcquisitionOfferLifecycle = (typeof ACQUISITION_OFFER_LIFECYCLE)[number];

export const ACQUISITION_OFFER_CANDIDATES = [
  "THREE_DAY_TRIAL",
  "SEVEN_DAY_TRIAL",
  "FOURTEEN_DAY_TRIAL",
  "NO_CARD_TRIAL",
  "CARD_REQUIRED_TRIAL",
  "FREE_FIRST_USE",
  "FREE_FIRST_TRANSACTION",
  "FREE_FIRST_DEAL",
  "INTRODUCTORY_DISCOUNT",
  "FIRST_PURCHASE_DISCOUNT",
  "FIRST_MONTH_FREE",
  "MONTHS_FREE",
  "LIMITED_PILOT",
  "FREE_ASSESSMENT",
  "CREDIT",
  "BONUS_ENTITLEMENT",
  "BUNDLE_BONUS",
  "MONEY_BACK_GUARANTEE",
  "WAIVED_FEE",
  "REFERRAL_BONUS",
  "FREE_SHIPPING",
  "DEMO_PLUS_INCENTIVE",
  "OTHER",
] as const;
export type AcquisitionOfferCandidate = (typeof ACQUISITION_OFFER_CANDIDATES)[number];

export const ACQUISITION_OFFER_EXEMPTIONS = [
  "INTERNAL_TOOL",
  "NON_COMMERCIAL_INFORMATIONAL",
  "REGULATED_INCENTIVE_PROHIBITED",
  "MARKETPLACE_POLICY_FORBIDS_INCENTIVE",
] as const;
export type AcquisitionOfferExemption = (typeof ACQUISITION_OFFER_EXEMPTIONS)[number];

export const COMMERCIAL_COMPLETE_STATES = ["COMMERCIAL_COMPLETE", "PUBLIC_LAUNCH_READY"] as const;

export function offerNoneIsIncompleteCommercialState(): true {
  return true;
}

export function priceIsNotAnOffer(): false {
  return false;
}

export function purchaseModelIsNotAnOffer(): false {
  return false;
}

export function futureCommercialVenturesInheritAcquisitionRequirement(): true {
  return true;
}

export function evaluateMandatoryAcquisitionOfferGate(input: {
  customer_facing: boolean;
  commercial: boolean;
  acquisition_offer: string | null | undefined;
  commercial_complete_or_public_launch?: boolean;
  exemption?: { kind: AcquisitionOfferExemption; reason: string } | null;
}): NamedOfferGate {
  if (!input.customer_facing || !input.commercial) {
    return { gate: MANDATORY_ACQUISITION_OFFER_GATE, result: "PASS", reasons: ["NOT_CUSTOMER_FACING_COMMERCIAL"] };
  }
  const offer = (input.acquisition_offer ?? "NONE").trim();
  const none = !offer || offer === "NONE";
  if (none && input.exemption?.kind && input.exemption.reason) {
    return {
      gate: MANDATORY_ACQUISITION_OFFER_GATE,
      result: "PASS",
      reasons: [`EXEMPTED:${input.exemption.kind}`],
    };
  }
  if (none) {
    return {
      gate: MANDATORY_ACQUISITION_OFFER_GATE,
      result: "FAIL",
      reasons: input.commercial_complete_or_public_launch
        ? ["ACQUISITION_OFFER_NONE_BLOCKS_COMMERCIAL_COMPLETION"]
        : ["ACQUISITION_OFFER_NONE_INCOMPLETE"],
    };
  }
  return { gate: MANDATORY_ACQUISITION_OFFER_GATE, result: "PASS", reasons: [] };
}

export function evaluateFactoryCannotShipOfferNone(input: {
  customer_facing: boolean;
  commercial: boolean;
  selected_acquisition_offer: string | null | undefined;
  exemption?: { kind: AcquisitionOfferExemption; reason: string } | null;
}): NamedOfferGate {
  return evaluateMandatoryAcquisitionOfferGate({
    customer_facing: input.customer_facing,
    commercial: input.commercial,
    acquisition_offer: input.selected_acquisition_offer,
    commercial_complete_or_public_launch: true,
    exemption: input.exemption ?? null,
  });
}

export function defaultAcquisitionOfferForArchetype(archetype: VentureArchetype): AcquisitionOfferCandidate {
  if (archetype === "SAAS" || archetype === "SUBSCRIPTION") return "THREE_DAY_TRIAL";
  if (archetype === "TRANSACTIONAL_TOOL" || archetype === "CALCULATOR" || archetype === "WEB_UTILITY") return "THREE_DAY_TRIAL";
  if (archetype === "ECOMMERCE" || archetype === "MERCH" || archetype === "DIGITAL_PRODUCT") return "FIRST_PURCHASE_DISCOUNT";
  if (archetype === "LEAD_GEN") return "FREE_ASSESSMENT";
  if (archetype === "SERVICE") return "LIMITED_PILOT";
  if (archetype === "CREATOR" || archetype === "YOUTUBE_MEDIA" || archetype === "NEWSLETTER") return "BONUS_ENTITLEMENT";
  return "THREE_DAY_TRIAL";
}

export const OCCUPANCYNPV_THREE_DAY_TRIAL = {
  candidate: "THREE_DAY_TRIAL" as const,
  offer_type: "NO_CARD_TRIAL" as const,
  display: "3-Day Free Trial",
  duration_hours: 72,
  card_required: false,
  auto_convert: false,
  account_limit: "one authenticated user",
  workspace_limit: "one DealWorkspace",
  professional_after: "$290/year",
  per_deal_after: "$149",
  incremental_infrastructure_usd: 0,
  incremental_provider_usd: 0,
  incremental_support_usd: 0,
  incremental_fulfillment_usd: 0,
  incremental_fraud_usd: 0,
  opportunity_cost_usd: 0,
  cost_note: "Incremental cash is $0 on already-running OccupancyNPV Vercel/Supabase/product compute. Opportunity cost is deferred conversion during 72 hours, not new spend. Capital NOT_SET does not block this bounded no-new-spend offer.",
} as const;
