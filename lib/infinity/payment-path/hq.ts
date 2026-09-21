import { PAYMENT_PATH_FRESHNESS_MS } from "./freshness";
import type { LivePaymentPathVerificationRecord, NamedGateResult } from "./types";

export type PaymentPathHqProjection = {
  paymentActivation: "YES" | "NO";
  paymentPathHealth: "PASS" | "FAIL" | "UNKNOWN";
  lastLiveVerification: string | null;
  nextVerification: string | null;
  offersHealthy: string;
  provider: string;
  credentialCapability: "PASS" | "FAIL" | "UNKNOWN";
  webhookHealth: "PASS" | "FAIL" | "UNKNOWN";
  fulfillmentMapping: "PASS" | "FAIL" | "UNKNOWN";
  currentIncident: string | null;
};

export function projectPaymentPathHq(input: {
  paymentActivated: boolean;
  verification: LivePaymentPathVerificationRecord | null;
  path: NamedGateResult;
  credential: NamedGateResult;
  webhook: NamedGateResult;
  fulfillment: "PASS" | "FAIL";
  incident: string | null;
}): PaymentPathHqProjection {
  const last = input.verification?.verifiedAt ?? null;
  return {
    paymentActivation: input.paymentActivated ? "YES" : "NO",
    paymentPathHealth: input.verification ? input.path.result : "UNKNOWN",
    lastLiveVerification: last,
    nextVerification: last
      ? new Date(new Date(last).getTime() + Math.min(PAYMENT_PATH_FRESHNESS_MS, 24 * 60 * 60 * 1000)).toISOString()
      : null,
    offersHealthy: input.verification
      ? `${input.verification.offers.filter((offer) => offer.liveSessionCreate === "PASS").length}/${input.verification.offers.length}`
      : "0/0",
    provider: input.verification?.provider ?? "UNKNOWN",
    credentialCapability: input.credential.result,
    webhookHealth: input.webhook.result,
    fulfillmentMapping: input.fulfillment,
    currentIncident: input.incident,
  };
}

export function founderWorkVisibilityIncludesPaymentPath(): true {
  return true;
}
