import { createHash } from "node:crypto";
import { evaluateMerchandiseIpSafety } from "./ip-safety";
import { evaluateProductEconomics, snapshotContributionMargin } from "./economics";
import type {
  CommercePricingSnapshot,
  CommerceProduct,
  CommerceVariant,
  ProviderProductMapping,
  ProviderVariantMapping,
} from "./types";
import { CLUB_THROTTLE_VENTURE_ID } from "./club-throttle";

export const CLUB_THROTTLE_CANARY_DESIGN = {
  design_family_id: "dfam_ride_past_midnight_v1",
  title: "Ride Past Midnight",
  story: "Original Club Throttle mark: a simple midnight chevron and throttle arc. No manufacturer marks.",
  artwork_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000" role="img" aria-label="Ride Past Midnight">
  <rect width="2000" height="2000" fill="#0b1220"/>
  <path d="M280 1280 L1000 420 L1720 1280" fill="none" stroke="#7CFFB2" stroke-width="72" stroke-linecap="square"/>
  <circle cx="1000" cy="1180" r="220" fill="none" stroke="#F4F1EA" stroke-width="36"/>
  <path d="M1000 1180 L1420 900" stroke="#F4F1EA" stroke-width="36" stroke-linecap="square"/>
  <text x="1000" y="1680" text-anchor="middle" fill="#F4F1EA" font-size="92" font-family="Georgia, serif">CLUB THROTTLE</text>
</svg>`,
} as const;

export function clubThrottleCanaryArtworkProvenance() {
  const ip = evaluateMerchandiseIpSafety(`${CLUB_THROTTLE_CANARY_DESIGN.title} ${CLUB_THROTTLE_CANARY_DESIGN.story}`);
  return {
    original: true,
    provenance: "infinity-authored-svg",
    ip_safety: ip.decision,
    ip_reason: ip.reason,
    hash: createHash("sha256").update(CLUB_THROTTLE_CANARY_DESIGN.artwork_svg).digest("hex"),
  };
}

export function assembleClubThrottleCanaryProduct(input: {
  provider_product_uid: string;
  title?: string;
  retail_usd: number;
  provider_base_cost_usd: number;
  shipping_usd?: number;
  payment_fee_usd?: number;
}): {
  product: CommerceProduct;
  variants: CommerceVariant[];
  product_mapping: ProviderProductMapping;
  variant_mapping: ProviderVariantMapping;
  snapshot: CommercePricingSnapshot;
  economics: ReturnType<typeof evaluateProductEconomics>;
} {
  const product: CommerceProduct = {
    product_id: "cprod_club_throttle_midnight_tee_v1",
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    store_id: "cstore_club_throttle_v1",
    title: input.title ?? "Ride Past Midnight Tee",
    slug: "ride-past-midnight-tee",
    description: "Premium tee with the original Ride Past Midnight mark.",
    design_story: CLUB_THROTTLE_CANARY_DESIGN.story,
    lifecycle: "TESTING",
    design_family_id: CLUB_THROTTLE_CANARY_DESIGN.design_family_id,
    published: false,
  };
  const variant: CommerceVariant = {
    variant_id: "cvar_club_throttle_midnight_tee_m_black",
    product_id: product.product_id,
    size: "M",
    color: "black",
    available: false,
  };
  const economics = snapshotContributionMargin({
    retail_usd: input.retail_usd,
    provider_base_cost_usd: input.provider_base_cost_usd,
    shipping_usd: input.shipping_usd ?? 0,
    payment_fee_usd: input.payment_fee_usd ?? input.retail_usd * 0.029 + 0.3,
    refund_allowance_usd: input.retail_usd * 0.05,
  });
  const snapshot: CommercePricingSnapshot = {
    snapshot_id: "cprice_club_throttle_midnight_tee_v1",
    product_id: product.product_id,
    retail_usd: input.retail_usd,
    provider_base_cost_usd: input.provider_base_cost_usd,
    print_cost_usd: 0,
    shipping_usd: input.shipping_usd ?? 0,
    payment_fee_usd: input.payment_fee_usd ?? input.retail_usd * 0.029 + 0.3,
    refund_allowance_usd: input.retail_usd * 0.05,
    gross_profit_usd: economics.gross_profit_usd,
    contribution_margin: economics.contribution_margin,
    quoted_at: new Date().toISOString(),
    provider_mapping_id: "pmap_gelato_midnight_tee_v1",
    environment: "SANDBOX",
  };
  return {
    product,
    variants: [variant],
    product_mapping: {
      mapping_id: "pmap_gelato_midnight_tee_v1",
      product_id: product.product_id,
      provider: "GELATO",
      provider_product_uid: input.provider_product_uid,
    },
    variant_mapping: {
      mapping_id: "vmap_gelato_midnight_tee_m_black",
      variant_id: variant.variant_id,
      provider: "GELATO",
      provider_variant_uid: input.provider_product_uid,
    },
    snapshot,
    economics: evaluateProductEconomics({ snapshot }),
  };
}
