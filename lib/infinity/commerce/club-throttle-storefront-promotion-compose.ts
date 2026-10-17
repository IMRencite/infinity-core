import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";
import { CLUB_THROTTLE_ACTIVE_PROMOTIONS } from "./club-throttle-promotion-catalog.ts";

/** Isolated storefront bundle: server-authoritative promotion resolution (no client trust). */
export function clubThrottleStorefrontPromotionResolveFile(): ComposedStorefrontFile {
  const profilesJson = JSON.stringify(CLUB_THROTTLE_ACTIVE_PROMOTIONS, null, 2);
  return {
    path: "lib/promotion-resolve.ts",
    content: `const PROFILES = ${profilesJson};

function estimateUnitProductionCostUsd(garment_color: string): number {
  const color = garment_color.toLowerCase();
  if (color === "black") return 22.5;
  if (color === "ash") return 21.25;
  return 20.75;
}

function contributionMarginAfterDiscount(input: {
  retail_usd: number;
  discount_usd: number;
  garment_color: string;
}): number {
  const fee = 0.029;
  const net = input.retail_usd - input.discount_usd;
  const proc = net * fee + 0.3;
  return net - proc - estimateUnitProductionCostUsd(input.garment_color);
}

export type PromotionPreview =
  | { ok: true; promotion_id: string; public_code: string; discount_type: string; discount_usd: number; unit_discount_cents: number }
  | { ok: false; reason: string };

export function resolveClubThrottlePromotion(input: {
  public_code: string;
  retail_usd: number;
  line_count: number;
  subtotal_usd: number;
  garment_colors: string[];
  now?: Date;
}): PromotionPreview {
  const code = input.public_code.trim().toUpperCase();
  if (!code) return { ok: false, reason: "EMPTY_CODE" };
  const now = input.now ?? new Date();
  const profile = PROFILES.find(
    (p) => p.public_code.toUpperCase() === code && p.status === "ACTIVE",
  );
  if (!profile) return { ok: false, reason: "UNKNOWN_CODE" };
  if (Date.parse(profile.starts_at) > now.getTime()) return { ok: false, reason: "NOT_STARTED" };
  if (profile.expires_at && Date.parse(profile.expires_at) <= now.getTime()) return { ok: false, reason: "EXPIRED" };
  if (input.line_count < profile.minimum_quantity) return { ok: false, reason: "MIN_QUANTITY" };
  if (input.subtotal_usd < profile.minimum_subtotal_usd) return { ok: false, reason: "MIN_SUBTOTAL" };

  let discount_usd =
    profile.discount_type === "PERCENT_OFF"
      ? Math.round(input.subtotal_usd * (profile.discount_value / 100) * 100) / 100
      : profile.discount_value;
  discount_usd = Math.min(discount_usd, input.subtotal_usd);

  const worstColor =
    input.garment_colors.slice().sort((a, b) => estimateUnitProductionCostUsd(b) - estimateUnitProductionCostUsd(a))[0] ??
    "white";
  const perUnitDiscount = discount_usd / Math.max(1, input.line_count);
  const margin = contributionMarginAfterDiscount({
    retail_usd: input.retail_usd,
    discount_usd: perUnitDiscount,
    garment_color: worstColor,
  });
  if (margin < profile.margin_floor_usd) return { ok: false, reason: "MARGIN_FLOOR" };

  const unit_discount_cents = Math.min(
    Math.round(perUnitDiscount * 100),
    Math.round(input.retail_usd * 100),
  );
  return {
    ok: true,
    promotion_id: profile.promotion_id,
    public_code: profile.public_code,
    discount_type: profile.discount_type,
    discount_usd,
    unit_discount_cents,
  };
}
`,
  };
}
