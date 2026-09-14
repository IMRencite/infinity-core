import type { StripeCashSnapshot } from "./types";

const BALANCE_EVENTS = new Set([
  "charge.succeeded",
  "payment_intent.succeeded",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
  "balance.available",
  "payout.created",
  "payout.paid",
  "payout.failed",
  "payout.canceled",
  "refund.created",
  "refund.updated",
]);

export function isStripeBalanceAffectingEvent(type: string): boolean {
  return BALANCE_EVENTS.has(type);
}

export function applyStripeFinancialEvent(
  snapshot: StripeCashSnapshot,
  event: { type: string; created?: string },
): { snapshot: StripeCashSnapshot; applied: boolean } {
  if (!isStripeBalanceAffectingEvent(event.type)) return { snapshot, applied: false };
  return {
    applied: true,
    snapshot: {
      ...snapshot,
      freshness: "AGING",
      last_verified: snapshot.last_verified,
    },
  };
}

export function stripeEventShouldRefresh(type: string): boolean {
  return isStripeBalanceAffectingEvent(type);
}
