import { RIDE_PAST_MIDNIGHT_CREATIVE_STATUS } from "../brand/club-throttle-profile";
import type { BrandProfile } from "../brand/brand-system";

export type GateResult = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

const INTERNAL_LEAKS = [
  "canary",
  "test provenance",
  "founder-approved",
  "existing approved brand",
  "after the canary",
  "no live storefront checkout yet",
  "internal operations",
  "deployment",
  "qc",
  "gelato",
  "vercel",
  "infinity os venture",
  "venture_id",
  "brandtruth",
  "brandenvironment",
  "concept territory",
  "territory",
  "territories",
  "product opportunity",
  "design family",
];

const MECHANIC_WORKWEAR = [
  "the bench, the lamp",
  "clothes that can stand in that light",
  "earn this shelf",
  "garment on the floor",
  "oil-resistant",
  "mechanic shop",
  "tool-brand",
  "repair shop",
];

const CONFUSING_METAPHORS = [
  "earn this shelf",
  "garment on the floor",
  "stand in that light",
  "the bench, the lamp",
];

const GENERIC_FILLER = [
  "elevate your wardrobe",
  "perfect for any occasion",
  "experience comfort and style",
  "make a statement",
  "must-have piece",
];

function named(gate: string, reasons: string[]): GateResult {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateInfinityRelationshipPlacementGate(input: { header: string; hero: string; footer: string }): GateResult {
  const reasons: string[] = [];
  const top = `${input.header}\n${input.hero}`.toLowerCase();
  if (top.includes("infinity os venture") || top.includes("by imr")) reasons.push("relationship_in_header_or_hero");
  if (!input.footer.toLowerCase().includes("infinity os venture")) reasons.push("relationship_missing_from_footer");
  if (!input.footer.includes("https://imros.io") && !input.footer.includes("relationship_imros")) reasons.push("imros_link_missing");
  if (!input.footer.includes("https://infinitemediaresources.com") && !input.footer.includes("relationship_imr")) reasons.push("imr_link_missing");
  return named("InfinityRelationshipPlacementGate", reasons);
}

export function evaluateInternalLanguageLeakGate(copy: string): GateResult {
  const text = copy.toLowerCase();
  return named(
    "InternalLanguageLeakGate",
    INTERNAL_LEAKS.filter((leak) => leak !== "infinity os venture" && text.includes(leak)).map((leak) => `leak:${leak}`),
  );
}

export function evaluateCustomerFacingLanguageGate(copy: string): GateResult {
  const reasons: string[] = [];
  const leak = evaluateInternalLanguageLeakGate(copy);
  reasons.push(...leak.reasons);
  for (const filler of GENERIC_FILLER) {
    if (copy.toLowerCase().includes(filler)) reasons.push(`generic:${filler}`);
  }
  const lower = copy.toLowerCase();
  for (const phrase of MECHANIC_WORKWEAR) {
    if (lower.includes(phrase)) reasons.push(`wrong_category:${phrase}`);
  }
  for (const phrase of CONFUSING_METAPHORS) {
    if (lower.includes(phrase)) reasons.push(`confusing_metaphor:${phrase}`);
  }
  if (/club throttle is not a mechanic/i.test(copy) && /we are not/i.test(copy)) {
    reasons.push("repeated_negative_definition");
  }
  return named("CustomerFacingLanguageGate", reasons);
}

export const CLUB_THROTTLE_GARAGE_CULTURE_KNOWN_BAD_COPY =
  "Garage Culture is the bench, the lamp, and the clothes that can stand in that light. A design has to earn this shelf. Nothing is on this shelf yet. The Core Tee is the garment on the floor today.";

export function evaluateClubThrottleCollectionCopy(copy: string): GateResult {
  const language = evaluateCustomerFacingLanguageGate(copy);
  const reasons = [...language.reasons];
  if (!/motorcycle|rider|ride|throttle|road|garage meet|kickstand/i.test(copy)) {
    reasons.push("missing_motorcycle_street_signal");
  }
  if (!/collection|designs|wear/i.test(copy)) reasons.push("purpose_unclear");
  return named("CustomerFacingLanguageGate", reasons);
}

export function evaluateStorefrontContentQualityGate(input: {
  purpose: string;
  copy: string;
  module_count: number;
  image_count: number;
  answers_customer_questions: boolean;
  placeholder: boolean;
}): GateResult {
  const reasons: string[] = [];
  if (input.placeholder) reasons.push("placeholder");
  if (input.copy.trim().split(/\s+/).length < 80) reasons.push("thin_copy");
  if (input.module_count < 4) reasons.push("missing_modules");
  if (input.image_count < 1) reasons.push("missing_visual");
  if (!input.answers_customer_questions) reasons.push("purpose_incomplete");
  reasons.push(...evaluateCustomerFacingLanguageGate(input.copy).reasons);
  if (!input.purpose.trim()) reasons.push("purpose_missing");
  return named("StorefrontContentQualityGate", reasons);
}

export function evaluateCommercePageCompletenessGate(input: {
  page_type: string;
  required: string[];
  present: string[];
}): GateResult {
  const missing = input.required.filter((item) => !input.present.includes(item));
  return named("CommercePageCompletenessGate", missing.map((item) => `missing:${item}`));
}

export function evaluateProductFactEvidenceGate(input: { facts: Record<string, string | null>; sources: Record<string, string | null> }): GateResult {
  const reasons: string[] = [];
  for (const [key, value] of Object.entries(input.facts)) {
    if (!value) reasons.push(`fact_missing:${key}`);
    else if (!input.sources[key]) reasons.push(`source_missing:${key}`);
  }
  return named("ProductFactEvidenceGate", reasons);
}

export function evaluateProductSizeDataGate(input: { sizes: Array<{ size_name: string; body_width: number; body_length: number; source: string }> }): GateResult {
  const reasons: string[] = [];
  if (input.sizes.length < 3) reasons.push("SIZE_DATA_INCOMPLETE");
  for (const size of input.sizes) {
    if (!size.source || size.body_width <= 0 || size.body_length <= 0) reasons.push(`invalid:${size.size_name}`);
  }
  return named("ProductSizeDataGate", reasons);
}

export function evaluateShippingReturnsCompletenessGate(input: { shipping: string; returns: string; invented_promise: boolean }): GateResult {
  const reasons: string[] = [];
  if (input.shipping.trim().length < 40) reasons.push("shipping_thin");
  if (input.returns.trim().length < 40) reasons.push("returns_thin");
  if (input.invented_promise) reasons.push("invented_delivery_promise");
  return named("ShippingReturnsCompletenessGate", reasons);
}

export function evaluateStorefrontVisualAssetGate(input: { required: string[]; present: string[] }): GateResult {
  return named(
    "StorefrontVisualAssetGate",
    input.required.filter((item) => !input.present.includes(item)).map((item) => `missing_visual:${item}`),
  );
}

export function evaluateBrandCreativeFitGate(input: {
  brand: BrandProfile;
  territory_id: string | null;
  generic_pod: boolean;
  uses_foreign_venture: boolean;
  technical_only?: boolean;
}): GateResult {
  const reasons: string[] = [];
  if (input.generic_pod) reasons.push("generic_pod_risk");
  if (input.uses_foreign_venture) reasons.push("cross_venture_contamination");
  if (input.technical_only) reasons.push("technical_only_not_production");
  if (!input.territory_id || !input.brand.territories.some((row) => row.id === input.territory_id)) {
    reasons.push("missing_territory");
  }
  return named("BrandCreativeFitGate", reasons);
}

export function evaluateBrandContentFitGate(input: { brand: BrandProfile; copy: string; territory_id: string | null }): GateResult {
  const reasons: string[] = [];
  if (!input.territory_id) reasons.push("missing_territory");
  if (input.copy.length < 40) reasons.push("thin_brand_copy");
  for (const avoid of input.brand.boundaries.content_avoid) {
    if (input.copy.toLowerCase().includes(avoid.toLowerCase())) reasons.push(`boundary:${avoid}`);
  }
  return named("BrandContentFitGate", reasons);
}

export function evaluateCrossVentureBrandIsolationGate(input: { venture_id: string; copy: string; foreign_marks: string[] }): GateResult {
  const text = input.copy.toLowerCase();
  return named(
    "CrossVentureBrandIsolationGate",
    input.foreign_marks.filter((mark) => text.includes(mark.toLowerCase())).map((mark) => `foreign:${mark}`),
  );
}

export function evaluateRidePastMidnightProductionApproval(): GateResult {
  return named(
    "RidePastMidnightProduction",
    RIDE_PAST_MIDNIGHT_CREATIVE_STATUS.production_ready ? [] : ["TECHNICAL_ONLY"],
  );
}
