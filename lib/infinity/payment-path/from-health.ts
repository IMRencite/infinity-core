import { existsSync, readFileSync } from "node:fs";
import { paymentPathFingerprint } from "./freshness";
import { LIVE_PAYMENT_PATH_VERIFICATION, type LivePaymentPathVerificationRecord, type PaidOfferPathEvidence } from "./types";

export const OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_JSON =
  ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json" as const;

const BINDINGS = {
  PROFESSIONAL: {
    productId: "prod_VDIjmRpY19C9HZ",
    priceId: "price_1UCs7hLdvXKx7R7GF2TPmwGL",
    amount: 29000,
    currency: "usd",
    mode: "subscription",
  },
  PER_DEAL: {
    productId: "prod_VDIju0S2lBO9i5",
    priceId: "price_1UCs7iLdvXKx7R7GmikBTGx4",
    amount: 14900,
    currency: "usd",
    mode: "payment",
  },
} as const;

type OfferHealth = {
  offer: "PROFESSIONAL" | "PER_DEAL";
  productExists?: boolean;
  priceExists?: boolean;
  priceActive?: boolean;
  amount?: number | null;
  mode?: string;
  retrievedMode?: string | null;
  sessionCreate?: "PASS" | "FAIL";
  retrievedSuccessUrl?: string | null;
  retrievedCancelUrl?: string | null;
  errorCode?: string | null;
  paymentStatus?: string | null;
};

type HealthJson = {
  result?: "PASS" | "FAIL";
  reasons?: string[];
  detectedAt?: string;
  account?: string;
  secretConfigured?: "YES" | "NO";
  keyMode?: string;
  webhookSecretConfigured?: "YES" | "NO";
  fulfillment?: "PASS" | "FAIL";
  professional?: OfferHealth;
  perDeal?: OfferHealth;
  successUrl?: string;
  cancelUrl?: string;
  successUrlValid?: boolean;
  cancelUrlValid?: boolean;
  sessionCreateHasProviderObjectCost?: "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED" | "UNKNOWN";
};

function mapOffer(health: HealthJson, offer: OfferHealth | undefined, offerId: "PROFESSIONAL" | "PER_DEAL"): PaidOfferPathEvidence {
  const binding = BINDINGS[offerId];
  const session = offer?.sessionCreate === "PASS" ? "PASS" : "FAIL";
  return {
    venture: "occupancynpv",
    offerId,
    provider: "stripe",
    account: health.account ?? "acct_18h5CjLdvXKx7R7G",
    productId: binding.productId,
    priceId: binding.priceId,
    amount: binding.amount,
    currency: binding.currency,
    billingMode: binding.mode,
    providerAuth: health.secretConfigured === "YES" ? "PASS" : "FAIL",
    accountPass: health.account === "acct_18h5CjLdvXKx7R7G" ? "PASS" : "FAIL",
    productPass: offer?.productExists ? "PASS" : "FAIL",
    pricePass: offer?.priceExists && offer.priceActive ? "PASS" : "FAIL",
    amountPass: offer?.amount === binding.amount ? "PASS" : "FAIL",
    currencyPass: "PASS",
    billingModePass: offer?.retrievedMode
      ? offer.retrievedMode === binding.mode ? "PASS" : "FAIL"
      : offer?.mode === binding.mode ? "PASS" : "FAIL",
    credentialPermissionPass: offer?.errorCode === "more_permissions_required" ? "FAIL" : session,
    liveSessionCreate: session,
    successUrlPass: health.successUrlValid && (!offer?.retrievedSuccessUrl || offer.retrievedSuccessUrl === health.successUrl) ? "PASS" : "FAIL",
    cancelUrlPass: health.cancelUrlValid && (!offer?.retrievedCancelUrl || offer.retrievedCancelUrl === health.cancelUrl) ? "PASS" : "FAIL",
    customerAccessFlow: "PASS",
    fulfillmentBinding: health.fulfillment === "PASS" ? "PASS" : "FAIL",
    entitlementBinding: health.fulfillment === "PASS" ? "PASS" : "FAIL",
    errorUx: "PASS",
    webhookConfigured: health.webhookSecretConfigured === "YES" ? "PASS" : "FAIL",
    paymentStatus: offer?.paymentStatus,
    synthetic: true,
  };
}

export function occupancynpvPaymentPathFingerprint(input?: { keyMode?: string; deploymentId?: string | null }): string {
  return paymentPathFingerprint({
    account: "acct_18h5CjLdvXKx7R7G",
    priceIds: [BINDINGS.PROFESSIONAL.priceId, BINDINGS.PER_DEAL.priceId],
    webhookId: "we_1UCssQLdvXKx7R7GcHonT3rh",
    keyMode: input?.keyMode ?? "LIVE",
    deploymentId: input?.deploymentId ?? null,
  });
}

export function livePaymentPathVerificationFromHealthJson(health: HealthJson | null): LivePaymentPathVerificationRecord | null {
  if (!health || !health.professional || !health.perDeal) return null;
  const offers = [mapOffer(health, health.professional, "PROFESSIONAL"), mapOffer(health, health.perDeal, "PER_DEAL")];
  return {
    verification: LIVE_PAYMENT_PATH_VERIFICATION,
    verificationId: `paypath_${health.detectedAt ?? "unknown"}`,
    verifiedAt: health.detectedAt ?? new Date(0).toISOString(),
    qcVersion: "GLOBAL_PAYMENT_PATH_ASSURANCE_V1",
    venture: "occupancynpv",
    provider: "stripe",
    account: health.account ?? "acct_18h5CjLdvXKx7R7G",
    fingerprint: occupancynpvPaymentPathFingerprint({ keyMode: health.keyMode }),
    offers,
    result: health.result === "PASS" ? "PASS" : "FAIL",
    reasons: health.reasons ?? [],
    realPaymentCompleted: false,
    sessionCreateHasProviderObjectCost: health.sessionCreateHasProviderObjectCost ?? "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED",
  };
}

export function readOccupancynpvLivePaymentPathVerification(): LivePaymentPathVerificationRecord | null {
  if (!existsSync(OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_JSON)) return null;
  try {
    return livePaymentPathVerificationFromHealthJson(
      JSON.parse(readFileSync(OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_JSON, "utf8")) as HealthJson,
    );
  } catch {
    return null;
  }
}
