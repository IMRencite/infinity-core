import { createHash } from "node:crypto";
import { PAYMENT_PATH_VERIFICATION_FRESHNESS_GATE, type LivePaymentPathVerificationRecord, type NamedGateResult } from "./types";

export const PAYMENT_PATH_FRESHNESS_MS = 36 * 60 * 60 * 1000;

export function paymentPathFingerprint(input: {
  account: string;
  priceIds: string[];
  webhookId?: string | null;
  keyMode: string;
  deploymentId?: string | null;
}): string {
  return createHash("sha256")
    .update([input.account, ...input.priceIds, input.webhookId ?? "", input.keyMode, input.deploymentId ?? ""].join("|"))
    .digest("hex");
}

export function evaluatePaymentPathVerificationFreshnessGate(input: {
  verification: LivePaymentPathVerificationRecord | null;
  currentFingerprint: string;
  now?: string;
  relevantChange?: boolean;
}): NamedGateResult {
  if (!input.verification) {
    return { gate: PAYMENT_PATH_VERIFICATION_FRESHNESS_GATE, result: "FAIL", reasons: ["NEVER_VERIFIED"] };
  }
  const reasons: string[] = [];
  if (input.relevantChange) reasons.push("RELEVANT_CONFIG_OR_DEPLOY_CHANGE");
  if (input.verification.fingerprint && input.verification.fingerprint !== input.currentFingerprint) {
    reasons.push("FINGERPRINT_CHANGED");
  }
  const age = new Date(input.now ?? new Date().toISOString()).getTime() - new Date(input.verification.verifiedAt).getTime();
  if (age > PAYMENT_PATH_FRESHNESS_MS) reasons.push("VERIFICATION_STALE");
  return {
    gate: PAYMENT_PATH_VERIFICATION_FRESHNESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function invalidatePaymentPathVerificationOnChange(input: {
  previousFingerprint: string | null;
  currentFingerprint: string;
}): boolean {
  return Boolean(input.previousFingerprint && input.previousFingerprint !== input.currentFingerprint);
}
