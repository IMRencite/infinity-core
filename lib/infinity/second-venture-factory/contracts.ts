import type { CommercialOfferContract, FulfillmentContract, FulfillmentRecoveryPolicy } from "@/lib/infinity/fulfillment/types";
import {
  ASKREVIEW_HYPOTHESIZED_MONTHLY_USD,
  ASKREVIEW_VENTURE_ID,
  ASKREVIEW_WORKING_NAME,
} from "./constants";

export const ASKREVIEW_OFFER_ID = "ASKREVIEW_STARTER" as const;
export const ASKREVIEW_FULFILLMENT_CONTRACT_ID = "askreview_review_kit_v1" as const;

export function askReviewCommercialOffer(): CommercialOfferContract {
  return {
    offer_id: ASKREVIEW_OFFER_ID,
    venture_id: ASKREVIEW_VENTURE_ID,
    canonical_name: `${ASKREVIEW_WORKING_NAME} Starter`,
    offer_version: "draft_v1",
    billing_model: "CUSTOM",
    price_binding: {
      amount: ASKREVIEW_HYPOTHESIZED_MONTHLY_USD,
      currency: "usd",
      price_id: "UNCONFIGURED",
      product_id: "UNCONFIGURED",
    },
    customer_promise:
      "Authenticated access to generate Google review-request kits (review link, QR mark, and request copy) for saved business locations. Does not send SMS or email. Does not claim Google API partnership. Price is hypothesized from Monetization Engine and is not a live Stripe binding.",
    fulfillment_contract_id: ASKREVIEW_FULFILLMENT_CONTRACT_ID,
    entitlement_definition: "ASKREVIEW_KIT_ACCESS",
    fulfillment_trigger: "PAYMENT_CONFIRMED",
    delivery_type: "GENERATED_REPORT",
    completion_criteria: "A persisted review-request kit exists with a review URL, QR SVG, and request copy for the location.",
    customer_access_policy: "Direct Sign in from public navigation. Kits remain available while the account is active.",
    failure_policy: "Invalid Place ID or Maps URL fails closed; customer can correct and regenerate. No payment is collected in this state.",
    cancellation_policy: "Not activated. Future monthly cancellation would revoke new kit generation, not delete already generated kits unless requested.",
    refund_policy_reference: "UNCONFIGURED_UNTIL_PAYMENT_ACTIVATION",
    status: "DRAFT",
    evidence: [
      "monetization_candidate_analyses.recommended_pricing for f1336945-3350-4d08-921e-4dcb5bc77b8e",
      "opportunity_candidates.opportunity_score 85.85",
    ],
    traceability: "second_venture_factory.askReviewCommercialOffer",
  };
}

export function askReviewFulfillmentContract(): FulfillmentContract {
  return {
    contract_id: ASKREVIEW_FULFILLMENT_CONTRACT_ID,
    venture_id: ASKREVIEW_VENTURE_ID,
    offer_id: ASKREVIEW_OFFER_ID,
    fulfillment_type: "GENERATED_REPORT",
    trigger: "PAYMENT_CONFIRMED",
    required_inputs: ["business_name", "google_place_id_or_maps_url"],
    entitlement_type: "ASKREVIEW_KIT_ACCESS",
    quantity_or_scope: "Authenticated kit generation for owned locations during validation. Payment is not the live trigger. Paid entitlement remains deferred until price is canonical.",
    delivery_executor: "askreview-kit-generator",
    delivery_destination: "authenticated_app_location_detail",
    customer_access_method: "/askreview/app",
    completion_condition: "Kit record persisted with reviewUrl, qrSvg, and requestCopy; customer can view and download.",
    verification_method: "kit_record_readable_and_svg_contains_review_url",
    retry_policy: "Customer can regenerate after correcting Place ID or Maps URL. Duplicate generate for same location replaces the latest kit and keeps history bounded.",
    failure_policy: "INVALID_LOCATION_INPUT or GENERATION_FAILED; no silent empty kit.",
    revocation_policy: "Account disable stops new kits. Existing kits remain until customer archives the location.",
    expiration_policy: "Kits do not expire from generation. Future paid entitlement expiry would block new generation only.",
    support_path: "infinitemediaresources@gmail.com",
    version: "v1",
    status: "READY",
    evidence: [
      "lib/infinity/askreview-product/kits.ts",
      "lib/infinity/askreview-product/fulfillment.ts",
    ],
  };
}

export function askReviewRecoveryPolicy(): FulfillmentRecoveryPolicy {
  return {
    policy_id: "askreview_recovery_v1",
    venture_id: ASKREVIEW_VENTURE_ID,
    automatic_refund: false,
    outcomes: ["DELIVERY_RETRY", "CUSTOMER_SUPPORT_REQUIRED"],
    support_path: "infinitemediaresources@gmail.com",
  };
}

export function evaluateAskReviewOfferContract(): { result: "PASS" | "FAIL"; reasons: string[] } {
  const offer = askReviewCommercialOffer();
  const reasons: string[] = [];
  if (!offer.customer_promise) reasons.push("missing_promise");
  if (offer.price_binding.price_id !== "UNCONFIGURED") reasons.push("live_price_invented");
  if (offer.status !== "DRAFT") reasons.push("offer_must_remain_draft_until_payment_architecture");
  return { result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateAskReviewFulfillmentContract(): { result: "PASS" | "FAIL"; reasons: string[] } {
  const contract = askReviewFulfillmentContract();
  const reasons: string[] = [];
  if (contract.fulfillment_type !== "GENERATED_REPORT") reasons.push("wrong_fulfillment_type");
  if (!contract.completion_condition) reasons.push("missing_completion");
  if (!contract.failure_policy) reasons.push("missing_failure");
  if (!contract.support_path) reasons.push("missing_support");
  return { result: reasons.length ? "FAIL" : "PASS", reasons };
}
