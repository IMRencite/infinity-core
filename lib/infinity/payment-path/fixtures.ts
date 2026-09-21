import { LIVE_PAYMENT_PATH_VERIFICATION, type LivePaymentPathVerificationRecord, type PaidOfferPathEvidence } from "./types";

function occupancynpvOffer(input: {
  offerId: "PROFESSIONAL" | "PER_DEAL";
  checkoutWrite: boolean;
}): PaidOfferPathEvidence {
  const session = input.checkoutWrite ? "PASS" : "FAIL";
  return {
    venture: "occupancynpv",
    offerId: input.offerId,
    provider: "stripe",
    account: "acct_18h5CjLdvXKx7R7G",
    productId: input.offerId === "PROFESSIONAL" ? "prod_VDIjmRpY19C9HZ" : "prod_VDIju0S2lBO9i5",
    priceId: input.offerId === "PROFESSIONAL" ? "price_1UCs7hLdvXKx7R7GF2TPmwGL" : "price_1UCs7iLdvXKx7R7GmikBTGx4",
    amount: input.offerId === "PROFESSIONAL" ? 29000 : 14900,
    currency: "usd",
    billingMode: input.offerId === "PROFESSIONAL" ? "subscription" : "payment",
    providerAuth: "PASS",
    accountPass: "PASS",
    productPass: "PASS",
    pricePass: "PASS",
    amountPass: "PASS",
    currencyPass: "PASS",
    billingModePass: "PASS",
    credentialPermissionPass: input.checkoutWrite ? "PASS" : "FAIL",
    liveSessionCreate: session,
    successUrlPass: "PASS",
    cancelUrlPass: "PASS",
    customerAccessFlow: "PASS",
    fulfillmentBinding: "PASS",
    entitlementBinding: "PASS",
    errorUx: "PASS",
    webhookConfigured: "PASS",
    paymentStatus: input.checkoutWrite ? "unpaid" : null,
    synthetic: true,
  };
}

export function occupancynpvMissingCheckoutWriteFixture(): LivePaymentPathVerificationRecord {
  return {
    verification: LIVE_PAYMENT_PATH_VERIFICATION,
    verificationId: "fix_occupancynpv_missing_checkout_session_write",
    verifiedAt: "2026-09-10T04:50:00.000Z",
    qcVersion: "GLOBAL_PAYMENT_PATH_ASSURANCE_V1",
    venture: "occupancynpv",
    provider: "stripe",
    account: "acct_18h5CjLdvXKx7R7G",
    fingerprint: "restricted_live_missing_checkout_session_write",
    offers: [occupancynpvOffer({ offerId: "PROFESSIONAL", checkoutWrite: false }), occupancynpvOffer({ offerId: "PER_DEAL", checkoutWrite: false })],
    result: "FAIL",
    reasons: ["CHECKOUT_SESSION_WRITE_MISSING", "PROFESSIONAL_LIVE_SESSION_CREATE", "PER_DEAL_LIVE_SESSION_CREATE"],
    realPaymentCompleted: false,
    sessionCreateHasProviderObjectCost: "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED",
  };
}

export function occupancynpvMissingCheckoutWriteExpectedOutcomes() {
  return {
    providerReadback: "PASS" as const,
    PaymentPathReadinessGate: "FAIL" as const,
    paymentHealth: "DEGRADED" as const,
    preLaunch: "BLOCKED" as const,
    postLaunch: "HIGH_PRIORITY_COMMERCIAL_INCIDENT" as const,
    monitoringDetectsWithoutFounder: true,
  };
}

export function occupancynpvKnownGoodPaymentPathFixture(): LivePaymentPathVerificationRecord {
  return {
    verification: LIVE_PAYMENT_PATH_VERIFICATION,
    verificationId: "fix_occupancynpv_known_good_checkout_write",
    verifiedAt: new Date().toISOString(),
    qcVersion: "GLOBAL_PAYMENT_PATH_ASSURANCE_V1",
    venture: "occupancynpv",
    provider: "stripe",
    account: "acct_18h5CjLdvXKx7R7G",
    fingerprint: "restricted_live_checkout_session_write",
    offers: [occupancynpvOffer({ offerId: "PROFESSIONAL", checkoutWrite: true }), occupancynpvOffer({ offerId: "PER_DEAL", checkoutWrite: true })],
    result: "PASS",
    reasons: [],
    realPaymentCompleted: false,
    sessionCreateHasProviderObjectCost: "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED",
  };
}
