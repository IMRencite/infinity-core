export type PromotionDiscountType = "PERCENT_OFF" | "AMOUNT_OFF";
export type PromotionType =
  | "FIRST_PURCHASE"
  | "REPEAT_PURCHASE"
  | "ORDER_THRESHOLD"
  | "BUNDLE"
  | "CAMPAIGN_CODE";

export type VenturePromotionProfile = {
  venture_id: string;
  promotion_id: string;
  internal_name: string;
  public_code: string;
  promotion_type: PromotionType;
  discount_type: PromotionDiscountType;
  discount_value: number;
  eligible_products: "ALL" | readonly string[];
  minimum_quantity: number;
  minimum_subtotal_usd: number;
  first_purchase_only: boolean;
  repeat_customer_only: boolean;
  starts_at: string;
  expires_at: string | null;
  max_redemptions: number | null;
  max_redemptions_per_customer: number;
  stacking_policy: "ONE_PRIMARY";
  margin_floor_usd: number;
  status: "ACTIVE" | "DRAFT" | "EXPIRED";
  stripe_coupon_id?: string;
};

export type PromotionAuthorityProfile = {
  level: "ANALYZE_ONLY" | "DRAFT" | "ACTIVATE_WITHIN_APPROVED_BOUNDS" | "FOUNDER_APPROVAL_REQUIRED";
  max_autonomous_percent_discount: number;
  max_autonomous_amount_discount_usd: number;
  minimum_margin_floor_usd: number;
  max_promotion_duration_days: number;
  max_redemptions: number;
};

export type PromotionResolution = {
  ok: true;
  profile: VenturePromotionProfile;
  discount_usd: number;
  unit_amount_after_discount: number;
} | { ok: false; reason: string };

export function estimateUnitProductionCostUsd(input: { garment_color: string }): number {
  const color = input.garment_color.toLowerCase();
  if (color === "black") return 22.5;
  if (color === "dark-heather") return 22.75;
  if (color === "ash") return 21.25;
  if (color === "natural") return 21.5;
  if (color === "light-blue") return 21.65;
  return 20.75;
}

export function contributionMarginAfterDiscount(input: {
  retail_usd: number;
  discount_usd: number;
  garment_color: string;
  payment_fee_rate?: number;
}): number {
  const fee = input.payment_fee_rate ?? 0.029;
  const net = input.retail_usd - input.discount_usd;
  const proc = net * fee + 0.3;
  return net - proc - estimateUnitProductionCostUsd({ garment_color: input.garment_color });
}

export function resolveVenturePromotion(input: {
  venture_id: string;
  public_code: string;
  retail_usd: number;
  line_count: number;
  subtotal_usd: number;
  garment_colors: string[];
  profiles: VenturePromotionProfile[];
  now?: Date;
}): PromotionResolution {
  const code = input.public_code.trim().toUpperCase();
  const now = input.now ?? new Date();
  const profile = input.profiles.find(
    (p) => p.venture_id === input.venture_id && p.public_code.toUpperCase() === code && p.status === "ACTIVE",
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

  const worstColor = input.garment_colors.slice().sort((a, b) => {
    return (
      estimateUnitProductionCostUsd({ garment_color: b }) - estimateUnitProductionCostUsd({ garment_color: a })
    );
  })[0] ?? "white";
  const perUnitDiscount = discount_usd / Math.max(1, input.line_count);
  const margin = contributionMarginAfterDiscount({
    retail_usd: input.retail_usd,
    discount_usd: perUnitDiscount,
    garment_color: worstColor,
  });
  if (margin < profile.margin_floor_usd) return { ok: false, reason: "MARGIN_FLOOR" };

  const unit_amount_after_discount = Math.max(
    50,
    Math.round((input.retail_usd - perUnitDiscount) * 100),
  );
  return { ok: true, profile, discount_usd, unit_amount_after_discount };
}
