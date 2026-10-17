import { resolveClubThrottleVentureCheckoutAuthority } from "./club-throttle-venture-checkout-authority.ts";

export type ClubThrottleCommerceHealthState = {
  live_checkout: boolean;
  live_payment_acceptance: boolean;
  live_fulfillment_submit: boolean;
  commerce_live: boolean;
  /** Legacy: true only when full paid-order lifecycle can reach live provider submission. */
  live_paid_orders: boolean;
  CLUB_THROTTLE_LIVE_CHECKOUT: "ENABLED" | "DISABLED";
  CLUB_THROTTLE_GELATO_LIVE_SUBMIT: "ENABLED" | "DISABLED";
  CLUB_THROTTLE_COMMERCE_LIVE: "YES" | "NO";
  COMMERCE_HEALTH_SEMANTICS_QC: "PASS" | "FAIL";
};

function checkoutGateOpen(env: NodeJS.ProcessEnv): boolean {
  if (env.CLUB_THROTTLE_GLOBAL_COMMERCE_KILL_SWITCH === "true") return false;
  if (env.CLUB_THROTTLE_VENTURE_COMMERCE_KILL_SWITCH === "true") return false;
  if (env.CLUB_THROTTLE_LIVE_CHECKOUT !== "ENABLED") return false;
  return Boolean(env.STRIPE_SECRET_KEY?.trim());
}

export function resolveClubThrottleCommerceHealthState(
  env: NodeJS.ProcessEnv = process.env,
): ClubThrottleCommerceHealthState {
  const venture = resolveClubThrottleVentureCheckoutAuthority(env);
  const live_checkout = checkoutGateOpen(env);
  const live_payment_acceptance = venture.effective_club_throttle_checkout;
  const live_fulfillment_submit = env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT === "ENABLED" && env.GELATO_MODE === "live";
  const commerce_live =
    env.CLUB_THROTTLE_COMMERCE_LIVE === "YES" &&
    live_fulfillment_submit &&
    live_payment_acceptance &&
    Boolean(env.INFINITY_COMMERCE_BRIDGE_URL?.trim()) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const live_paid_orders = commerce_live;
  const semanticsOk =
    !live_paid_orders ||
    (live_fulfillment_submit && env.CLUB_THROTTLE_COMMERCE_LIVE === "YES" && live_payment_acceptance);
  return {
    live_checkout,
    live_payment_acceptance,
    live_fulfillment_submit,
    commerce_live,
    live_paid_orders,
    CLUB_THROTTLE_LIVE_CHECKOUT: env.CLUB_THROTTLE_LIVE_CHECKOUT === "ENABLED" ? "ENABLED" : "DISABLED",
    CLUB_THROTTLE_GELATO_LIVE_SUBMIT:
      env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT === "ENABLED" ? "ENABLED" : "DISABLED",
    CLUB_THROTTLE_COMMERCE_LIVE: env.CLUB_THROTTLE_COMMERCE_LIVE === "YES" ? "YES" : "NO",
    COMMERCE_HEALTH_SEMANTICS_QC: semanticsOk ? "PASS" : "FAIL",
  };
}

/** Source embedded in composed Club Throttle storefront (no infinity-core imports). */
export const CLUB_THROTTLE_STOREFRONT_COMMERCE_HEALTH_MODULE = `import { clubThrottleLiveCheckoutEnabled } from "./checkout-gate";

export function resolveClubThrottleStorefrontCommerceHealth() {
  const live_checkout = clubThrottleLiveCheckoutEnabled();
  const live_payment_acceptance = live_checkout;
  const live_fulfillment_submit =
    process.env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT === "ENABLED" &&
    (process.env.GELATO_MODE === "live" || process.env.CLUB_THROTTLE_COMMERCE_LIVE === "YES");
  const commerce_live =
    process.env.CLUB_THROTTLE_COMMERCE_LIVE === "YES" &&
    live_fulfillment_submit &&
    live_payment_acceptance;
  const live_paid_orders = commerce_live;
  const semanticsOk =
    !live_paid_orders ||
    (live_fulfillment_submit && process.env.CLUB_THROTTLE_COMMERCE_LIVE === "YES");
  return {
    live_checkout,
    live_payment_acceptance,
    live_fulfillment_submit,
    commerce_live,
    live_paid_orders,
    CLUB_THROTTLE_LIVE_CHECKOUT: process.env.CLUB_THROTTLE_LIVE_CHECKOUT === "ENABLED" ? "ENABLED" : "DISABLED",
    CLUB_THROTTLE_GELATO_LIVE_SUBMIT:
      process.env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT === "ENABLED" ? "ENABLED" : "DISABLED",
    CLUB_THROTTLE_COMMERCE_LIVE: process.env.CLUB_THROTTLE_COMMERCE_LIVE === "YES" ? "YES" : "NO",
    COMMERCE_HEALTH_SEMANTICS_QC: semanticsOk ? "PASS" : "FAIL",
    live_paid_orders_definition:
      "true when CLUB_THROTTLE_COMMERCE_LIVE=YES and live Gelato submit is enabled (full paid-order fulfillment path)",
  };
}
`;
