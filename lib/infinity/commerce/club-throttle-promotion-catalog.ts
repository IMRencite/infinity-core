import type { PromotionAuthorityProfile, VenturePromotionProfile } from "./autonomous-venture-promotion-engine-v1.ts";

/** Server-authoritative Club Throttle promotions (Stripe + checkout validate here). */
export const CLUB_THROTTLE_PROMOTION_AUTHORITY: PromotionAuthorityProfile = {
  level: "ACTIVATE_WITHIN_APPROVED_BOUNDS",
  max_autonomous_percent_discount: 12,
  max_autonomous_amount_discount_usd: 4,
  minimum_margin_floor_usd: 6,
  max_promotion_duration_days: 90,
  max_redemptions: 500,
};

export const CLUB_THROTTLE_ACTIVE_PROMOTIONS: VenturePromotionProfile[] = [
  {
    venture_id: "club-throttle",
    promotion_id: "ct-first-ride-2026",
    internal_name: "First ride — new customer",
    public_code: "RIDEFIRST",
    promotion_type: "FIRST_PURCHASE",
    discount_type: "AMOUNT_OFF",
    discount_value: 3,
    eligible_products: "ALL",
    minimum_quantity: 1,
    minimum_subtotal_usd: 33,
    first_purchase_only: true,
    repeat_customer_only: false,
    starts_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-12-31T23:59:59.000Z",
    max_redemptions: 500,
    max_redemptions_per_customer: 1,
    stacking_policy: "ONE_PRIMARY",
    margin_floor_usd: 6,
    status: "ACTIVE",
  },
];
