import type {
  CommercialOfferContract,
  FulfillmentContract,
  FulfillmentRecoveryPolicy,
} from "./types";

export const FULFILLMENT_READINESS_CHECKS = [
  "canonical_offer_exists",
  "customer_promise_defined",
  "fulfillment_contract_exists",
  "entitlement_semantics_defined",
  "delivery_executor_exists",
  "customer_access_path_exists",
  "completion_criteria_defined",
  "verification_method_exists",
  "payment_to_fulfillment_mapping_verified",
  "duplicate_protection_verified",
  "failure_recovery_defined",
  "cancellation_revocation_defined",
  "support_path_available",
  "traceability_available",
  "offer_product_consistency",
  "deterministic_simulation",
] as const;

export type FulfillmentReadinessCheck = (typeof FULFILLMENT_READINESS_CHECKS)[number];

export type FulfillmentReadinessEvidence = Partial<Record<FulfillmentReadinessCheck, boolean>>;

export type FulfillmentReadinessGateResult = {
  gate: "FulfillmentReadinessGate";
  result: "PASS" | "FAIL" | "UNCONFIGURED";
  reasons: string[];
  missing: FulfillmentReadinessCheck[];
};

export type OfferFulfillmentConsistencyGateResult = {
  gate: "OfferFulfillmentConsistencyGate";
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function evaluateFulfillmentReadinessGate(evidence?: FulfillmentReadinessEvidence): FulfillmentReadinessGateResult {
  if (!evidence) {
    return {
      gate: "FulfillmentReadinessGate",
      result: "UNCONFIGURED",
      reasons: ["fulfillment_unconfigured"],
      missing: [...FULFILLMENT_READINESS_CHECKS],
    };
  }
  const missing = FULFILLMENT_READINESS_CHECKS.filter((check) => evidence[check] !== true);
  if (missing.length === 0) {
    return { gate: "FulfillmentReadinessGate", result: "PASS", reasons: [], missing: [] };
  }
  return {
    gate: "FulfillmentReadinessGate",
    result: "FAIL",
    reasons: missing.map((check) => `${check}_missing`),
    missing,
  };
}

export function evaluateOfferFulfillmentConsistencyGate(input: {
  marketingMatchesProduct?: boolean;
  pricingMatchesStripe?: boolean;
  pricingMatchesEntitlement?: boolean;
  marketingMatchesFulfillment?: boolean;
  identityLinkageDefined?: boolean;
  productRouteAvailable?: boolean;
  boundedResourceDefined?: boolean;
}): OfferFulfillmentConsistencyGateResult {
  const reasons: string[] = [];
  if (input.marketingMatchesProduct !== true) reasons.push("marketing_exceeds_product");
  if (input.pricingMatchesStripe !== true) reasons.push("pricing_stripe_mismatch");
  if (input.pricingMatchesEntitlement !== true) reasons.push("pricing_entitlement_mismatch");
  if (input.marketingMatchesFulfillment !== true) reasons.push("marketing_fulfillment_mismatch");
  if (input.identityLinkageDefined !== true) reasons.push("identity_linkage_missing");
  if (input.productRouteAvailable !== true) reasons.push("product_route_unavailable");
  if (input.boundedResourceDefined !== true) reasons.push("bounded_resource_undefined");
  return {
    gate: "OfferFulfillmentConsistencyGate",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function contractMissingRequiredFields(contract: Partial<FulfillmentContract> | null | undefined): boolean {
  if (!contract) return true;
  return !(
    contract.contract_id &&
    contract.venture_id &&
    contract.offer_id &&
    contract.fulfillment_type &&
    contract.completion_condition &&
    contract.delivery_executor &&
    contract.customer_access_method &&
    contract.verification_method
  );
}

export function offerMissingPromise(offer: Partial<CommercialOfferContract> | null | undefined): boolean {
  return !offer?.customer_promise || offer.customer_promise.trim().length < 8;
}

export function recoveryPolicyAllowsAutomaticRefund(policy: FulfillmentRecoveryPolicy | null | undefined): false {
  void policy;
  return false;
}
