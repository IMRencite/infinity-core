import { CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import type { ClubThrottleProductConcept } from "./club-throttle-autonomous-product-development-v1.ts";
import { auditClubThrottleVariantMap } from "./club-throttle-variant-map.ts";
import { CLUB_THROTTLE_DEFAULT_GARMENT_COLOR } from "./club-throttle-apparel-color-v1.ts";

export const CLUB_THROTTLE_AUTONOMOUS_PRODUCT_BUILD_V1 = "CLUB_THROTTLE_AUTONOMOUS_PRODUCT_BUILD_V1" as const;

export type AutonomousClubThrottleBuiltProduct = {
  concept_id: string;
  product_id: string;
  sku: string;
  slug: string;
  title: string;
  short_description: string;
  design_story: string;
  source_artwork_hash: string;
  price_usd: number;
  garment_base: "GILDAN_5000_LARGE_BACK";
  default_color: string;
  checkout_sizes: readonly string[];
  public_hero_path: string;
  public_art_detail_path: string;
  source: "AUTONOMOUS_CREATIVE";
};

export function autonomousClubThrottleSkuForConcept(concept_id: string): string {
  const tail = concept_id.replace(/^ct-merch-concept-/i, "").replace(/-/g, "_").toUpperCase();
  return `AUTO_CT_${tail}`;
}

export function autonomousClubThrottleSlugForConcept(concept: ClubThrottleProductConcept): string {
  const base = concept.theme
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "autonomous-tee"}-auto-tee`;
}

export function autonomousClubThrottleProductIdForConcept(concept_id: string): string {
  const tail = concept_id.replace(/^ct-merch-concept-/i, "").replace(/-/g, "_");
  return `cprod_ct_auto_${tail}`;
}

export function buildAutonomousClubThrottleStorefrontProduct(input: {
  concept: ClubThrottleProductConcept;
  source_artwork_hash: string;
  cwd?: string;
}): AutonomousClubThrottleBuiltProduct {
  const sku = autonomousClubThrottleSkuForConcept(input.concept.concept_id);
  const slug = autonomousClubThrottleSlugForConcept(input.concept);
  const product_id = autonomousClubThrottleProductIdForConcept(input.concept.concept_id);
  const variant = auditClubThrottleVariantMap(input.cwd ?? process.cwd());
  const hero = `/storefront-merch/autonomous/${slug}-hero-back.png`;
  const detail = `/storefront-merch/autonomous/${slug}-art-detail.png`;
  return {
    concept_id: input.concept.concept_id,
    product_id,
    sku,
    slug,
    title: `${input.concept.theme} Tee`,
    short_description: `Original Club Throttle back print — ${input.concept.theme}.`,
    design_story: input.concept.differentiation_note,
    source_artwork_hash: input.source_artwork_hash,
    price_usd: CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD,
    garment_base: "GILDAN_5000_LARGE_BACK",
    default_color: CLUB_THROTTLE_DEFAULT_GARMENT_COLOR,
    checkout_sizes: variant.SUPPORTED_SIZES,
    public_hero_path: hero,
    public_art_detail_path: detail,
    source: "AUTONOMOUS_CREATIVE",
  };
}
