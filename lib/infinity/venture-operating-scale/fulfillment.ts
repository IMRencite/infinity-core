export const FULFILLMENT_READINESS_GATE = "FulfillmentReadinessGate" as const;
export const FULFILLMENT_UNCONFIGURED_REASON = "fulfillment_unconfigured" as const;
export const ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT =
  "ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT" as const;

export type FulfillmentReadinessResult = "UNCONFIGURED" | "FAIL" | "PASS";

export type FulfillmentReadinessGateResult = {
  gate: typeof FULFILLMENT_READINESS_GATE;
  result: FulfillmentReadinessResult;
  reasons: string[];
};

export type PaidOfferFulfillmentInvariant = {
  paidOfferExists: boolean;
  fulfillment: FulfillmentReadinessResult;
  paymentActivation: "BLOCKED" | "ALLOWABLE";
  checkoutSessionCreation: "BLOCKED" | "ALLOWABLE";
  failClosed: true;
  reason: typeof FULFILLMENT_UNCONFIGURED_REASON | "FULFILLMENT_PASS" | "NO_PAID_OFFER";
};

export function evaluateFulfillmentReadinessGate(input?: {
  fulfillment?: FulfillmentReadinessResult;
  deliverableDefined?: boolean;
  accessDefined?: boolean;
  refundPolicyKnown?: boolean;
}): FulfillmentReadinessGateResult {
  // Compatibility wrapper. Canonical 16-check FulfillmentReadinessGate lives in
  // lib/infinity/fulfillment/gates.ts and is venture-specific at evaluation time.
  if (input?.fulfillment === "PASS" && input.deliverableDefined && input.accessDefined && input.refundPolicyKnown) {
    return { gate: FULFILLMENT_READINESS_GATE, result: "PASS", reasons: [] };
  }
  if (input?.fulfillment === "FAIL") {
    return {
      gate: FULFILLMENT_READINESS_GATE,
      result: "FAIL",
      reasons: [FULFILLMENT_UNCONFIGURED_REASON],
    };
  }
  return {
    gate: FULFILLMENT_READINESS_GATE,
    result: "UNCONFIGURED",
    reasons: [FULFILLMENT_UNCONFIGURED_REASON],
  };
}

export function evaluatePaidOfferFulfillmentInvariant(input: {
  paidOfferExists: boolean;
  fulfillment?: FulfillmentReadinessResult;
}): PaidOfferFulfillmentInvariant {
  const fulfillment = input.fulfillment ?? evaluateFulfillmentReadinessGate().result;
  if (!input.paidOfferExists) {
    return {
      paidOfferExists: false,
      fulfillment,
      paymentActivation: "BLOCKED",
      checkoutSessionCreation: "BLOCKED",
      failClosed: true,
      reason: "NO_PAID_OFFER",
    };
  }
  if (fulfillment === "PASS") {
    return {
      paidOfferExists: true,
      fulfillment,
      paymentActivation: "ALLOWABLE",
      checkoutSessionCreation: "ALLOWABLE",
      failClosed: true,
      reason: "FULFILLMENT_PASS",
    };
  }
  return {
    paidOfferExists: true,
    fulfillment,
    paymentActivation: "BLOCKED",
    checkoutSessionCreation: "BLOCKED",
    failClosed: true,
    reason: FULFILLMENT_UNCONFIGURED_REASON,
  };
}
