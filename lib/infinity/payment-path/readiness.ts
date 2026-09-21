import { PAYMENT_PATH_READINESS_GATE, type LivePaymentPathVerificationRecord, type NamedGateResult, type PaidOfferPathEvidence, type PaymentActivationState } from "./types";

function offerFailReasons(offer: PaidOfferPathEvidence): string[] {
  const reasons: string[] = [];
  if (offer.providerAuth !== "PASS") reasons.push(`${offer.offerId}_PROVIDER_AUTH`);
  if (offer.accountPass !== "PASS") reasons.push(`${offer.offerId}_ACCOUNT`);
  if (offer.productPass !== "PASS") reasons.push(`${offer.offerId}_PRODUCT`);
  if (offer.pricePass !== "PASS") reasons.push(`${offer.offerId}_PRICE`);
  if (offer.amountPass !== "PASS") reasons.push(`${offer.offerId}_AMOUNT`);
  if (offer.currencyPass !== "PASS") reasons.push(`${offer.offerId}_CURRENCY`);
  if (offer.billingModePass !== "PASS") reasons.push(`${offer.offerId}_BILLING_MODE`);
  if (offer.credentialPermissionPass !== "PASS") reasons.push(`${offer.offerId}_CREDENTIAL_PERMISSION`);
  if (offer.liveSessionCreate !== "PASS") reasons.push(`${offer.offerId}_LIVE_SESSION_CREATE`);
  if (offer.successUrlPass !== "PASS") reasons.push(`${offer.offerId}_SUCCESS_URL`);
  if (offer.cancelUrlPass !== "PASS") reasons.push(`${offer.offerId}_CANCEL_URL`);
  if (offer.customerAccessFlow !== "PASS") reasons.push(`${offer.offerId}_CUSTOMER_ACCESS`);
  if (offer.fulfillmentBinding !== "PASS") reasons.push(`${offer.offerId}_FULFILLMENT`);
  if (offer.entitlementBinding !== "PASS") reasons.push(`${offer.offerId}_ENTITLEMENT`);
  if (offer.errorUx !== "PASS") reasons.push(`${offer.offerId}_ERROR_UX`);
  return reasons;
}

export function evaluatePaymentPathReadinessGate(
  verification: LivePaymentPathVerificationRecord | null,
): NamedGateResult & { activationState: PaymentActivationState } {
  if (!verification) {
    return {
      gate: PAYMENT_PATH_READINESS_GATE,
      result: "FAIL",
      reasons: ["NEVER_VERIFIED", "CONFIGURATION_IS_NOT_READINESS"],
      activationState: "CONFIGURED_NOT_VERIFIED",
    };
  }
  const reasons = [...verification.reasons];
  if (verification.offers.length === 0) reasons.push("NO_OFFERS_VERIFIED");
  for (const offer of verification.offers) {
    reasons.push(...offerFailReasons(offer));
  }
  if (verification.realPaymentCompleted) reasons.push("REAL_PAYMENT_COMPLETED");
  const unique = [...new Set(reasons)];
  const pass = unique.length === 0 && verification.result === "PASS";
  return {
    gate: PAYMENT_PATH_READINESS_GATE,
    result: pass ? "PASS" : "FAIL",
    reasons: unique,
    activationState: pass ? "ACTIVE" : verification.result === "FAIL" ? "VERIFICATION_FAILED" : "BLOCKED",
  };
}

export function configurationOnlyPaymentEvidenceFails(input: {
  accountExists: boolean;
  productExists: boolean;
  priceExists: boolean;
  webhookExists: boolean;
  checkoutSessionWrite: boolean;
}): NamedGateResult {
  const configPresent = input.accountExists && input.productExists && input.priceExists && input.webhookExists;
  const reasons = [
    ...(configPresent ? ["CONFIGURATION_PRESENT"] : ["CONFIGURATION_INCOMPLETE"]),
    ...(input.checkoutSessionWrite ? [] : ["CHECKOUT_SESSION_WRITE_MISSING"]),
  ];
  return {
    gate: PAYMENT_PATH_READINESS_GATE,
    result: configPresent && input.checkoutSessionWrite ? "PASS" : "FAIL",
    reasons: configPresent && !input.checkoutSessionWrite
      ? ["CONFIGURATION_IS_NOT_READINESS", "CHECKOUT_SESSION_WRITE_MISSING"]
      : reasons.filter((row) => row !== "CONFIGURATION_PRESENT"),
  };
}

export function activationStateFromPath(input: {
  configured: boolean;
  path: NamedGateResult;
  publiclyLaunched: boolean;
  paymentActivated: boolean;
}): PaymentActivationState {
  if (!input.configured) return "BLOCKED";
  if (input.path.result !== "PASS") {
    return input.paymentActivated || input.publiclyLaunched ? "DEGRADED" : "VERIFICATION_FAILED";
  }
  return input.paymentActivated ? "ACTIVE" : "CONFIGURED_NOT_VERIFIED";
}
