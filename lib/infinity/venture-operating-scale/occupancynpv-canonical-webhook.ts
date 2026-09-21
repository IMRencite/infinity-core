import { createHmac, timingSafeEqual } from "node:crypto";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN } from "./cloudflare-dns-vercel-binding";
import { OCCUPANCYNPV_STRIPE_VENTURE } from "./constants";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "./occupancynpv-canonical-checkout";
import type { OccupancynpvStripeOfferId } from "./occupancynpv-canonical-stripe-offers";

export const OCCUPANCYNPV_WEBHOOK_ROUTE = "/api/webhooks/stripe" as const;
export const OCCUPANCYNPV_WEBHOOK_URL = `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${OCCUPANCYNPV_WEBHOOK_ROUTE}` as const;

export const OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "payment_intent.payment_failed",
] as const;

export type OccupancynpvCanonicalPaymentEvent =
  | "CHECKOUT_STARTED"
  | "CHECKOUT_COMPLETED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_UPDATED"
  | "SUBSCRIPTION_CANCELLED";

export const STRIPE_WEBHOOK_WRITE_GRANTS = [
  "GOVERNED_STRIPE_WEBHOOK_CONFIGURATION_AUTHORIZATION",
  "GOVERNED_CRE_WEBHOOK_WRITE",
  "STRIPE_WEBHOOK_WRITE_AUTHORIZED",
] as const;

export function authorizedOccupancynpvWebhookEventsMatch(actual: unknown): boolean {
  const list = Array.isArray(actual) ? [...actual].map(String).sort() : [];
  const expected = [...OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS].sort();
  return list.length === expected.length && list.every((event, index) => event === expected[index]);
}

export function occupancynpvWebhookWriteAuthorized(authorizations: string[]): boolean {
  return authorizations.some((row) =>
    STRIPE_WEBHOOK_WRITE_GRANTS.includes(row as (typeof STRIPE_WEBHOOK_WRITE_GRANTS)[number]),
  );
}

export function mapStripeEventToCanonicalOccupancynpvEvent(type: string): OccupancynpvCanonicalPaymentEvent | null {
  switch (type) {
    case "checkout.session.completed":
      return "CHECKOUT_COMPLETED";
    case "invoice.paid":
      return "PAYMENT_SUCCEEDED";
    case "invoice.payment_failed":
    case "payment_intent.payment_failed":
      return "PAYMENT_FAILED";
    case "customer.subscription.updated":
      return "SUBSCRIPTION_UPDATED";
    case "customer.subscription.deleted":
      return "SUBSCRIPTION_CANCELLED";
    default:
      return null;
  }
}

export function verifyStripeWebhookSignature(input: {
  secret: string;
  signature: string;
  rawBody: string;
  toleranceSeconds?: number;
}): { valid: boolean; reason: string } {
  if (!input.secret || !input.signature || !input.rawBody) {
    return { valid: false, reason: "MISSING_SIGNATURE_MATERIAL" };
  }
  const parts = Object.fromEntries(
    input.signature.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key?.trim() ?? "", rest.join("=")];
    }),
  );
  const timestamp = Number(parts.t);
  const expected = parts.v1;
  if (!Number.isFinite(timestamp) || !expected) return { valid: false, reason: "INVALID_SIGNATURE_HEADER" };
  const tolerance = input.toleranceSeconds ?? 300;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance) {
    return { valid: false, reason: "SIGNATURE_TIMESTAMP_EXPIRED" };
  }
  const digest = createHmac("sha256", input.secret).update(`${timestamp}.${input.rawBody}`).digest("hex");
  const actual = Buffer.from(digest);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }
  return { valid: true, reason: "VERIFIED" };
}

export function offerFromWebhookMetadata(metadata: Record<string, unknown> | null | undefined): OccupancynpvStripeOfferId | null {
  const offer = String(metadata?.infinity_offer ?? "");
  if (offer === "PROFESSIONAL" || offer === "PER_DEAL") return offer;
  const priceId = String(metadata?.price_id ?? metadata?.infinity_price ?? "");
  if (priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId) return "PROFESSIONAL";
  if (priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId) return "PER_DEAL";
  return null;
}

export function processOccupancynpvStripeWebhookEvent(input: {
  secret: string;
  signature: string;
  rawBody: string;
  seenEventIds: Set<string>;
}): {
  accepted: boolean;
  duplicate: boolean;
  rejected: boolean;
  reason: string;
  eventId: string | null;
  stripeType: string | null;
  canonicalEvent: OccupancynpvCanonicalPaymentEvent | null;
  venture: typeof OCCUPANCYNPV_STRIPE_VENTURE;
  offer: OccupancynpvStripeOfferId | null;
  recordsRevenue: boolean;
} {
  const verified = verifyStripeWebhookSignature(input);
  if (!verified.valid) {
    return {
      accepted: false,
      duplicate: false,
      rejected: true,
      reason: verified.reason,
      eventId: null,
      stripeType: null,
      canonicalEvent: null,
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      offer: null,
      recordsRevenue: false,
    };
  }
  let parsed: { id?: string; type?: string; data?: { object?: Record<string, unknown> } } = {};
  try {
    parsed = JSON.parse(input.rawBody) as typeof parsed;
  } catch {
    return {
      accepted: false,
      duplicate: false,
      rejected: true,
      reason: "INVALID_JSON",
      eventId: null,
      stripeType: null,
      canonicalEvent: null,
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      offer: null,
      recordsRevenue: false,
    };
  }
  const eventId = typeof parsed.id === "string" ? parsed.id : null;
  const stripeType = typeof parsed.type === "string" ? parsed.type : null;
  if (!eventId || !stripeType) {
    return {
      accepted: false,
      duplicate: false,
      rejected: true,
      reason: "MISSING_EVENT_IDENTITY",
      eventId,
      stripeType,
      canonicalEvent: null,
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      offer: null,
      recordsRevenue: false,
    };
  }
  if (input.seenEventIds.has(eventId)) {
    return {
      accepted: true,
      duplicate: true,
      rejected: false,
      reason: "DUPLICATE_EVENT",
      eventId,
      stripeType,
      canonicalEvent: mapStripeEventToCanonicalOccupancynpvEvent(stripeType),
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      offer: offerFromWebhookMetadata(parsed.data?.object?.metadata as Record<string, unknown> | undefined),
      recordsRevenue: false,
    };
  }
  const canonicalEvent = mapStripeEventToCanonicalOccupancynpvEvent(stripeType);
  if (!canonicalEvent) {
    return {
      accepted: false,
      duplicate: false,
      rejected: true,
      reason: "UNSUBSCRIBED_EVENT",
      eventId,
      stripeType,
      canonicalEvent: null,
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      offer: null,
      recordsRevenue: false,
    };
  }
  input.seenEventIds.add(eventId);
  return {
    accepted: true,
    duplicate: false,
    rejected: false,
    reason: "PROCESSED",
    eventId,
    stripeType,
    canonicalEvent,
    venture: OCCUPANCYNPV_STRIPE_VENTURE,
    offer: offerFromWebhookMetadata(parsed.data?.object?.metadata as Record<string, unknown> | undefined),
    recordsRevenue: canonicalEvent === "PAYMENT_SUCCEEDED" || canonicalEvent === "CHECKOUT_COMPLETED",
  };
}
