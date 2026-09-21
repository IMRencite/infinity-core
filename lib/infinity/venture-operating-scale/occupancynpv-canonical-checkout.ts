import { OCCUPANCYNPV_PRODUCTION_ORIGIN } from "./cloudflare-dns-vercel-binding";
import { OCCUPANCYNPV_STRIPE_ACCOUNT_ID, OCCUPANCYNPV_STRIPE_VENTURE } from "./constants";
import { occupancynpvCheckoutAllowedByFulfillment } from "./occupancynpv-fulfillment";
import type { OccupancynpvStripeOfferId } from "./occupancynpv-canonical-stripe-offers";

export const OCCUPANCYNPV_CHECKOUT_START_ROUTE = "/api/checkout/start" as const;
export const OCCUPANCYNPV_CHECKOUT_SUCCESS_ROUTE = "/early-access?checkout=success" as const;
export const OCCUPANCYNPV_CHECKOUT_CANCEL_ROUTE = "/pricing" as const;

export const OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS = {
  PROFESSIONAL: {
    offer: "PROFESSIONAL" as const,
    productId: "prod_VDIjmRpY19C9HZ",
    priceId: "price_1UCs7hLdvXKx7R7GF2TPmwGL",
    mode: "subscription" as const,
    amount: 29000,
    currency: "usd",
    recurrence: "ANNUAL_RECURRING" as const,
  },
  PER_DEAL: {
    offer: "PER_DEAL" as const,
    productId: "prod_VDIju0S2lBO9i5",
    priceId: "price_1UCs7iLdvXKx7R7GmikBTGx4",
    mode: "payment" as const,
    amount: 14900,
    currency: "usd",
    recurrence: "ONE_TIME" as const,
  },
} as const;

export type OccupancynpvCheckoutOfferInput = OccupancynpvStripeOfferId | string | null | undefined;

export type OccupancynpvCheckoutSessionRequest = {
  offer: OccupancynpvStripeOfferId;
  mode: "subscription" | "payment";
  priceId: string;
  productId: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string | null;
  metadata: {
    infinity_venture: typeof OCCUPANCYNPV_STRIPE_VENTURE;
    infinity_offer: OccupancynpvStripeOfferId;
    infinity_environment: "production";
    infinity_stripe_account: typeof OCCUPANCYNPV_STRIPE_ACCOUNT_ID;
    infinity_customer_id: string | null;
  };
};

export function isCanonicalOccupancynpvOffer(value: OccupancynpvCheckoutOfferInput): value is OccupancynpvStripeOfferId {
  return value === "PROFESSIONAL" || value === "PER_DEAL";
}

export function resolveCanonicalOccupancynpvCheckoutOffer(offer: OccupancynpvCheckoutOfferInput) {
  if (!isCanonicalOccupancynpvOffer(offer)) {
    return { ok: false as const, reason: "UNKNOWN_OFFER" as const, binding: null };
  }
  return { ok: true as const, reason: "CANONICAL_OFFER" as const, binding: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS[offer] };
}

export function occupancynpvCheckoutUrls() {
  return {
    start: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${OCCUPANCYNPV_CHECKOUT_START_ROUTE}`,
    success: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${OCCUPANCYNPV_CHECKOUT_SUCCESS_ROUTE}`,
    cancel: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${OCCUPANCYNPV_CHECKOUT_CANCEL_ROUTE}`,
  };
}

export function buildOccupancynpvCheckoutSessionRequest(input: {
  offer: OccupancynpvCheckoutOfferInput;
  clientPriceId?: string | null;
  clientAmount?: number | null;
  clientCurrency?: string | null;
  activationAuthorized?: boolean;
  fulfillmentReady?: boolean;
  customerIdentityId?: string | null;
}): {
  ok: boolean;
  reason: string;
  createSession: boolean;
  request: OccupancynpvCheckoutSessionRequest | null;
  arbitraryPriceBlocked: boolean;
} {
  const resolved = resolveCanonicalOccupancynpvCheckoutOffer(input.offer);
  if (!resolved.ok || !resolved.binding) {
    return { ok: false, reason: "UNKNOWN_OFFER", createSession: false, request: null, arbitraryPriceBlocked: true };
  }
  if (input.clientPriceId && input.clientPriceId !== resolved.binding.priceId) {
    return { ok: false, reason: "ARBITRARY_PRICE_BLOCKED", createSession: false, request: null, arbitraryPriceBlocked: true };
  }
  if (input.clientAmount != null && input.clientAmount !== resolved.binding.amount) {
    return { ok: false, reason: "ARBITRARY_AMOUNT_BLOCKED", createSession: false, request: null, arbitraryPriceBlocked: true };
  }
  if (input.clientCurrency && input.clientCurrency.toLowerCase() !== resolved.binding.currency) {
    return { ok: false, reason: "ARBITRARY_CURRENCY_BLOCKED", createSession: false, request: null, arbitraryPriceBlocked: true };
  }
  const urls = occupancynpvCheckoutUrls();
  const request: OccupancynpvCheckoutSessionRequest = {
    offer: resolved.binding.offer,
    mode: resolved.binding.mode,
    priceId: resolved.binding.priceId,
    productId: resolved.binding.productId,
    successUrl: urls.success,
    cancelUrl: urls.cancel,
    clientReferenceId: input.customerIdentityId ?? null,
    metadata: {
      infinity_venture: OCCUPANCYNPV_STRIPE_VENTURE,
      infinity_offer: resolved.binding.offer,
      infinity_environment: "production",
      infinity_stripe_account: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
      infinity_customer_id: input.customerIdentityId ?? null,
    },
  };
  const fulfillmentPass =
    input.fulfillmentReady === true
      ? true
      : input.fulfillmentReady === false
        ? false
        : occupancynpvCheckoutAllowedByFulfillment();
  if (!fulfillmentPass) {
    return { ok: true, reason: "FULFILLMENT_NOT_READY", createSession: false, request, arbitraryPriceBlocked: true };
  }
  if (input.activationAuthorized !== true) {
    return { ok: true, reason: "PAYMENT_ACTIVATION_NOT_AUTHORIZED", createSession: false, request, arbitraryPriceBlocked: true };
  }
  return { ok: true, reason: "PAYMENT_ACTIVATED", createSession: true, request, arbitraryPriceBlocked: true };
}

export function occupancynpvCheckoutReturnState(input: {
  queryCheckout?: string | null;
  providerVerified?: boolean;
}): "PENDING_PROVIDER_VERIFICATION" | "CANCELLED_NO_CONVERSION" | "UNCLAIMED" {
  if (input.queryCheckout === "cancel") return "CANCELLED_NO_CONVERSION";
  if (input.queryCheckout === "success") {
    return input.providerVerified === true ? "PENDING_PROVIDER_VERIFICATION" : "PENDING_PROVIDER_VERIFICATION";
  }
  return "UNCLAIMED";
}

export function checkoutReturnClaimsPaymentSuccess(queryCheckout?: string | null, providerVerified = false): boolean {
  void queryCheckout;
  void providerVerified;
  return false;
}

export function successQueryGrantsAccess(queryCheckout?: string | null): false {
  void queryCheckout;
  return false;
}
