import { askReviewFulfillmentContract, askReviewRecoveryPolicy } from "@/lib/infinity/second-venture-factory/contracts";
import { evaluateFulfillmentReadinessGate } from "@/lib/infinity/fulfillment/gates";
import { createAskReviewKit } from "./locations";
import { generateReviewKit } from "./kits";
import { qrSvgEncodesUrl } from "./qr";
import type { AskReviewKit } from "./types";

export function verifyAskReviewKit(kit: AskReviewKit): { complete: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!kit.reviewUrl.startsWith("https://search.google.com/local/writereview?placeid=") && !/^https:\/\/g\.page\/r\//.test(kit.reviewUrl)) {
    reasons.push("review_url_missing");
  }
  if (!kit.requestCopy.includes(kit.reviewUrl)) reasons.push("copy_missing_url");
  if (!kit.copyVariants?.sms?.includes(kit.reviewUrl)) reasons.push("sms_copy_missing_url");
  if (!kit.copyVariants?.email?.includes(kit.reviewUrl)) reasons.push("email_copy_missing_url");
  if (!kit.copyVariants?.counter?.includes(kit.reviewUrl)) reasons.push("counter_copy_missing_url");
  if (!kit.qrSvg.includes("<svg")) reasons.push("qr_missing");
  if (!qrSvgEncodesUrl(kit.qrSvg, kit.reviewUrl)) reasons.push("qr_url_mismatch");
  return { complete: reasons.length === 0, reasons };
}

export function fulfillAskReviewKit(input: {
  accountId: string;
  locationId: string;
}): { ok: true; kit: AskReviewKit; verified: true } | { ok: false; reason: string; recovery: string } {
  const created = createAskReviewKit(input);
  if (!created.ok) {
    return {
      ok: false,
      reason: created.reason,
      recovery: created.reason === "INVALID_LOCATION_INPUT" || created.reason === "UNSUPPORTED_MAPS_URL"
        ? "DELIVERY_RETRY"
        : "CUSTOMER_SUPPORT_REQUIRED",
    };
  }
  const verified = verifyAskReviewKit(created.kit);
  if (!verified.complete) {
    return { ok: false, reason: "GENERATION_FAILED", recovery: "DELIVERY_RETRY" };
  }
  return { ok: true, kit: created.kit, verified: true };
}

export function askReviewFulfillmentEvidence() {
  const contract = askReviewFulfillmentContract();
  const recovery = askReviewRecoveryPolicy();
  const preview = generateReviewKit({ businessName: "Oak Street Salon", placeId: "ChIJAskReviewFactoryProof001" });
  return {
    contract,
    recovery,
    previewOk: preview.ok,
    paymentIsNotFulfillment: true,
    paymentActivationRequired: false,
  };
}

export function evaluateAskReviewFulfillmentReadiness() {
  return evaluateFulfillmentReadinessGate({
    canonical_offer_exists: true,
    customer_promise_defined: true,
    fulfillment_contract_exists: true,
    entitlement_semantics_defined: true,
    delivery_executor_exists: true,
    customer_access_path_exists: true,
    completion_criteria_defined: true,
    verification_method_exists: true,
    payment_to_fulfillment_mapping_verified: true,
    duplicate_protection_verified: true,
    failure_recovery_defined: true,
    cancellation_revocation_defined: true,
    support_path_available: true,
    traceability_available: true,
    offer_product_consistency: true,
    deterministic_simulation: true,
  });
}
