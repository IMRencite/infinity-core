import type { OfferType, VentureArchetype } from "./types";

const ARCHETYPE_OPTIONS: Record<VentureArchetype, OfferType[]> = {
  SAAS: ["PAID_FIRST", "MONTHLY_SUBSCRIPTION", "ANNUAL_SUBSCRIPTION", "FREE_TRIAL", "FREEMIUM", "PER_SEAT"],
  WEB_UTILITY: ["PAID_FIRST", "FREE_FIRST_USE", "PER_TRANSACTION", "USAGE_BASED", "ANNUAL_SUBSCRIPTION"],
  CALCULATOR: ["PAID_FIRST", "FREE_FIRST_USE", "PER_TRANSACTION", "FREE_FIRST_DEAL"],
  ECOMMERCE: ["PAID_FIRST", "PRODUCT_BUNDLE", "DISCOUNTED_FIRST_PURCHASE", "COUPON"],
  MERCH: ["PAID_FIRST", "PRODUCT_BUNDLE", "DISCOUNTED_FIRST_PURCHASE"],
  CREATOR: ["PAID_FIRST", "MONTHLY_SUBSCRIPTION", "PRODUCT_BUNDLE", "REFERRAL_INCENTIVE"],
  YOUTUBE_MEDIA: ["FREEMIUM", "MONTHLY_SUBSCRIPTION", "REFERRAL_INCENTIVE"],
  NEWSLETTER: ["FREEMIUM", "MONTHLY_SUBSCRIPTION", "ANNUAL_SUBSCRIPTION"],
  AFFILIATE_CONTENT: ["FREEMIUM", "REFERRAL_INCENTIVE", "OTHER"],
  DIGITAL_PRODUCT: ["PAID_FIRST", "PRODUCT_BUNDLE", "DISCOUNTED_FIRST_PURCHASE"],
  MARKETPLACE: ["PAID_FIRST", "PER_TRANSACTION", "FREEMIUM", "USAGE_BASED"],
  LEAD_GEN: ["CONSULTATION_FIRST", "PAID_PILOT", "DEMO_FIRST"],
  SERVICE: ["CONSULTATION_FIRST", "PAID_PILOT", "FREE_PILOT", "DEMO_FIRST"],
  SUBSCRIPTION: ["MONTHLY_SUBSCRIPTION", "ANNUAL_SUBSCRIPTION", "ANNUAL_DISCOUNT", "FREE_TRIAL"],
  TRANSACTIONAL_TOOL: ["PAID_FIRST", "PER_TRANSACTION", "FREE_FIRST_TRANSACTION", "FREE_FIRST_DEAL"],
};

export type OfferOptionInput = {
  archetype: VentureArchetype;
  current_types?: OfferType[];
  purchase_friction?: "LOW" | "MEDIUM" | "HIGH";
  time_to_value?: string;
  abuse_risk?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  evidence_quality?: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
};

export function generateOfferOptions(input: OfferOptionInput): OfferType[] {
  const base = [...ARCHETYPE_OPTIONS[input.archetype]];
  const extras = input.current_types ?? [];
  const unique = [...new Set([...extras, ...base])];
  return unique.filter((type) => {
    if (input.abuse_risk === "HIGH" && (type.includes("FREE") || type === "NO_CARD_TRIAL")) return false;
    if (input.evidence_quality === "INSUFFICIENT" && type === "FREEMIUM") return false;
    return true;
  });
}

export function offerOptionsAreBounded(types: OfferType[], archetype: VentureArchetype): boolean {
  return types.every((type) => ARCHETYPE_OPTIONS[archetype].includes(type) || type === "PAID_FIRST" || type === "OTHER");
}
