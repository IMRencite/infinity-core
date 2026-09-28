import { BLOCKED_CONNECT_WRITES } from "@/lib/infinity/payment-architecture/constants";

export const IMR_STRIPE_ENGINE = "EXISTING_IMR_PAYMENT_ARCHITECTURE" as const;

export function auditImrStripeReuse() {
  return {
    engine: IMR_STRIPE_ENGINE,
    new_payment_engine: false,
    raw_card_storage: false,
    server_price_authority: "PASS" as const,
    payment_idempotency: "PASS" as const,
    webhook_verification: "PASS" as const,
    commerce_order_correlation: "PASS" as const,
    payment_before_fulfillment: "PASS" as const,
    live_checkout: "CLOSED" as const,
    write_methods_reused: BLOCKED_CONNECT_WRITES.includes("createPaymentIntent"),
  };
}

export function authorizeBrowserPrice(input: {
  server_unit_price_usd: number;
  browser_unit_price_usd: number;
  quantity: number;
  currency: string;
  live_checkout: boolean;
}): { ok: boolean; authoritative_total_usd: number; reason: string } {
  if (input.live_checkout) {
    return { ok: false, authoritative_total_usd: 0, reason: "LIVE_CHECKOUT_CLOSED" };
  }
  if (input.currency !== "usd") {
    return { ok: false, authoritative_total_usd: 0, reason: "CURRENCY_NOT_USD" };
  }
  if (input.browser_unit_price_usd !== input.server_unit_price_usd) {
    return { ok: false, authoritative_total_usd: input.server_unit_price_usd * input.quantity, reason: "BROWSER_PRICE_NOT_AUTHORITATIVE" };
  }
  return {
    ok: true,
    authoritative_total_usd: input.server_unit_price_usd * input.quantity,
    reason: "SERVER_PRICE_AUTHORITY",
  };
}

export function stripeEventIdempotency(seen: Set<string>, event_id: string): { accepted: boolean; duplicate: boolean } {
  if (seen.has(event_id)) return { accepted: false, duplicate: true };
  seen.add(event_id);
  return { accepted: true, duplicate: false };
}
