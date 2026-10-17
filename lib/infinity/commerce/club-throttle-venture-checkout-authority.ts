import { CLUB_THROTTLE_VENTURE_ID } from "./club-throttle-venture-id.ts";

export type VentureLiveCheckoutState = {
  global_live_checkout: "CLOSED" | "OPEN";
  club_throttle_live_checkout: "DISABLED" | "ENABLED";
  effective_club_throttle_checkout: boolean;
  venture_scoped_payment_authority_qc: "PASS" | "FAIL";
};

/** Global IMR live checkout stays CLOSED; Club Throttle may enable via venture env only. */
export function resolveClubThrottleVentureCheckoutAuthority(env: NodeJS.ProcessEnv = process.env): VentureLiveCheckoutState {
  const globalOpen = env.IMR_GLOBAL_LIVE_CHECKOUT === "OPEN";
  const ventureEnabled = env.CLUB_THROTTLE_LIVE_CHECKOUT === "ENABLED";
  const kills =
    env.CLUB_THROTTLE_GLOBAL_COMMERCE_KILL_SWITCH === "true" ||
    env.CLUB_THROTTLE_VENTURE_COMMERCE_KILL_SWITCH === "true";
  const stripeReady = Boolean(env.STRIPE_SECRET_KEY?.trim()) && Boolean(env.STRIPE_PUBLISHABLE_KEY?.trim());
  const effective = !globalOpen && ventureEnabled && !kills && stripeReady;
  return {
    global_live_checkout: globalOpen ? "OPEN" : "CLOSED",
    club_throttle_live_checkout: ventureEnabled ? "ENABLED" : "DISABLED",
    effective_club_throttle_checkout: effective,
    venture_scoped_payment_authority_qc: globalOpen ? "FAIL" : "PASS",
  };
}

export function assertClubThrottleCheckoutVenture(metadata: Record<string, string | undefined>): boolean {
  return (metadata.venture_id ?? metadata.ventureId) === CLUB_THROTTLE_VENTURE_ID;
}
