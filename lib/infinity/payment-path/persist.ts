import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW_PATH =
  ".infinity/venture-operating-scale/occupancynpv-founder-checkout-review.json" as const;
export const GLOBAL_PAYMENT_PATH_ASSURANCE_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/global-payment-path-assurance-v1.json" as const;

export type FounderOccupancynpvCheckoutReview = {
  review: "FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW";
  status: "PASS";
  professional: "PASS";
  perDeal: "PASS";
  recordedAt: string;
  physicalEvidence: "FOUNDER_CONFIRMED_PRODUCTION_CHECKOUT_BUTTONS_WORK";
  closesIncident: true;
  automatedMonitoringReplacesFounderAsHealthSystem: true;
};

export function persistFounderOccupancynpvCheckoutReview(
  recordedAt = new Date().toISOString(),
): FounderOccupancynpvCheckoutReview {
  const record: FounderOccupancynpvCheckoutReview = {
    review: "FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW",
    status: "PASS",
    professional: "PASS",
    perDeal: "PASS",
    recordedAt,
    physicalEvidence: "FOUNDER_CONFIRMED_PRODUCTION_CHECKOUT_BUTTONS_WORK",
    closesIncident: true,
    automatedMonitoringReplacesFounderAsHealthSystem: true,
  };
  mkdirSync(dirname(FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW_PATH), { recursive: true });
  writeFileSync(FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export function readFounderOccupancynpvCheckoutReview(): FounderOccupancynpvCheckoutReview | null {
  if (!existsSync(FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW_PATH)) return null;
  try {
    return JSON.parse(readFileSync(FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW_PATH, "utf8")) as FounderOccupancynpvCheckoutReview;
  } catch {
    return null;
  }
}

export function persistGlobalPaymentPathAssuranceEvidence(evidence: Record<string, unknown>) {
  mkdirSync(dirname(GLOBAL_PAYMENT_PATH_ASSURANCE_EVIDENCE_PATH), { recursive: true });
  writeFileSync(GLOBAL_PAYMENT_PATH_ASSURANCE_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}
