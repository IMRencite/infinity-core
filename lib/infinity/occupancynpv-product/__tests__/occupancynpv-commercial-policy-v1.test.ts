import { describe, expect, it } from "vitest";
import { occupancynpvTermsOfServicePageSource } from "@/lib/infinity/venture-website-architecture/occupancynpv-legal-surface-pages";
import { successorPricingSource } from "@/lib/infinity/venture-website-architecture/page-sources-successor";
import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import {
  evaluateOccupancynpvCommercialPolicyGates,
  evaluateOccupancynpvFulfillmentReadiness,
  evaluateOccupancynpvOfferConsistency,
  evaluateOccupancynpvPaymentReadinessReport,
  occupancynpvPerDealOffer,
  occupancynpvProfessionalOffer,
  occupancynpvRefundCancellationPolicy,
} from "@/lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import {
  evaluateOccupancynpvRefundRequest,
  OCCUPANCYNPV_PRODUCTION_PERSISTENCE,
  OCCUPANCYNPV_PRODUCT_PRODUCTION_VERIFICATION,
  OCCUPANCYNPV_REFUND_POLICY,
  occupancynpvProductionPersistenceState,
  occupancynpvProductProductionVerificationState,
  PROFESSIONAL_CANCELLATION_POLICY,
  PROFESSIONAL_FAILED_PAYMENT_POLICY,
  PROFESSIONAL_USAGE_POLICY,
} from "../policy";

describe("OCCUPANCYNPV_COMMERCIAL_POLICY_CONFIGURATION_V1", () => {
  it("persists founder-approved usage, failed-payment, cancellation, and refund policies", () => {
    expect(PROFESSIONAL_USAGE_POLICY).toMatchObject({
      status: "PASS",
      seats: 1,
      workspace_numerical_cap: null,
      unlimited_marketing_claim: false,
      multiple_seats: false,
      team_accounts: false,
    });
    expect(PROFESSIONAL_FAILED_PAYMENT_POLICY).toMatchObject({
      status: "PASS",
      initial_state: "PAST_DUE",
      paid_through_access_preserved: true,
      failure_count_threshold: null,
      end_of_paid_period: "EXPIRED",
      suspend_after_n_failures: false,
    });
    expect(PROFESSIONAL_CANCELLATION_POLICY).toMatchObject({
      status: "PASS",
      future_renewal_stopped: true,
      paid_through_access_preserved: true,
      immediate_entitlement_revocation: false,
      prorated_refund_from_cancellation_alone: false,
    });
    expect(OCCUPANCYNPV_REFUND_POLICY).toMatchObject({
      status: "PASS",
      automatic_stripe_refund: false,
      applicable_law_exception: true,
    });
  });

  it("classifies refund requests without Stripe refund authority", () => {
    expect(evaluateOccupancynpvRefundRequest({
      offer: "PROFESSIONAL",
      purchaseKind: "INITIAL",
      purchasedAt: "2026-09-01T00:00:00.000Z",
      now: "2026-09-07T00:00:00.000Z",
      workspaceAllocated: false,
    }).decision).toBe("ELIGIBLE");
    expect(evaluateOccupancynpvRefundRequest({
      offer: "PROFESSIONAL",
      purchaseKind: "INITIAL",
      purchasedAt: "2026-09-01T00:00:00.000Z",
      now: "2026-09-07T00:00:00.000Z",
      workspaceAllocated: true,
    }).decision).toBe("INELIGIBLE");
    expect(evaluateOccupancynpvRefundRequest({
      offer: "PROFESSIONAL",
      purchaseKind: "RENEWAL",
      purchasedAt: "2026-09-01T00:00:00.000Z",
      now: "2026-09-02T00:00:00.000Z",
      workspaceAllocated: false,
    }).decision).toBe("INELIGIBLE");
    expect(evaluateOccupancynpvRefundRequest({
      offer: "PER_DEAL",
      purchaseKind: "INITIAL",
      purchasedAt: "2026-09-01T00:00:00.000Z",
      now: "2026-09-07T00:00:00.000Z",
      workspaceAllocated: false,
      entitlementConsumed: false,
    }).decision).toBe("ELIGIBLE");
    expect(evaluateOccupancynpvRefundRequest({
      offer: "PER_DEAL",
      purchaseKind: "INITIAL",
      purchasedAt: "2026-09-01T00:00:00.000Z",
      now: "2026-09-07T00:00:00.000Z",
      workspaceAllocated: true,
      entitlementConsumed: true,
    }).decision).toBe("INELIGIBLE");
    expect(evaluateOccupancynpvRefundRequest({
      offer: "PROFESSIONAL",
      purchaseKind: "INITIAL",
      purchasedAt: null,
      now: "2026-09-07T00:00:00.000Z",
      workspaceAllocated: false,
    }).decision).toBe("REVIEW_REQUIRED");
    expect(evaluateOccupancynpvRefundRequest({
      offer: "PROFESSIONAL",
      purchaseKind: "INITIAL",
      purchasedAt: "2026-09-01T00:00:00.000Z",
      now: "2026-09-20T00:00:00.000Z",
      workspaceAllocated: false,
      applicableLawClaimed: true,
    })).toMatchObject({
      decision: "REVIEW_REQUIRED",
      automatic_stripe_refund: false,
    });
  });

  it("updates offer contracts and customer surfaces without an unlimited claim", () => {
    const professional = occupancynpvProfessionalOffer();
    const perDeal = occupancynpvPerDealOffer();
    expect(professional.failure_policy).toBe("PAST_DUE_THEN_EXPIRE_AT_PAID_THROUGH");
    expect(professional.refund_policy_reference).toBe("OCCUPANCYNPV_REFUND_POLICY_V1");
    expect(professional.customer_promise).not.toMatch(/\bunlimited\b/i);
    expect(perDeal.entitlement_definition).toMatch(/Quantity 1/);
    expect(perDeal.refund_policy_reference).toBe("OCCUPANCYNPV_REFUND_POLICY_V1");
    const terms = occupancynpvTermsOfServicePageSource();
    expect(terms).toContain("one authenticated user");
    expect(terms).toContain("Cancellation stops future renewal");
    expect(terms).toContain("within 7 calendar days of the initial purchase");
    expect(terms).toContain("Infinite Media Resources LLC");
    expect(terms).toContain("1896 Coventry Dr");
    expect(terms).not.toMatch(/arbitration|class-action|HIPAA|GDPR|CCPA/i);
    expect(terms).not.toMatch(/\bunlimited\b/i);
    const pricing = successorPricingSource({
      route: "/pricing/",
      role: "conversion",
      primaryIntent: "convert",
      parentHub: null,
      title: "Pricing",
      metaDescription: "Pricing",
      canonical: "/pricing/",
      indexable: true,
      schemaTypes: [],
      patternId: "TRUST_NEAR_DECISION",
      ctaStrength: "medium",
      topicCluster: "pricing",
      pageOpportunityId: "pricing",
    } as unknown as PlannedPage);
    expect(pricing).toContain("One authenticated user");
    expect(pricing).toContain("one DealWorkspace");
    expect(pricing).not.toMatch(/\bunlimited\b/i);
  });

  it("clears commercial policy gates while keeping production durability blocked", () => {
    const policy = evaluateOccupancynpvCommercialPolicyGates();
    expect(policy).toEqual({
      professionalUsage: "PASS",
      failedPayment: "PASS",
      cancellation: "PASS",
      refund: "PASS",
      failureRecovery: "PASS",
      cancellationRevocation: "PASS",
      refundCancellationPolicyConfiguration: "CLEARED",
    });
    expect(occupancynpvRefundCancellationPolicy()).toBe("OCCUPANCYNPV_REFUND_POLICY_V1");
    expect(evaluateOccupancynpvOfferConsistency().result).toBe("PASS");
    const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
    const payment = evaluateOccupancynpvPaymentReadinessReport();
    if (occupancynpvProductionPersistenceState().durable && occupancynpvProductProductionVerificationState().status === "VERIFIED") {
      expect(fulfillment.result).toBe("PASS");
      expect(payment.PaymentReadinessGate).toBe("READY_FOR_ACTIVATION_AUTHORIZATION");
    } else {
      expect(fulfillment.result).toBe("FAIL");
      expect(fulfillment.reasons).toEqual(expect.arrayContaining([
        OCCUPANCYNPV_PRODUCTION_PERSISTENCE.blocker,
        OCCUPANCYNPV_PRODUCT_PRODUCTION_VERIFICATION.blocker,
      ].filter((blocker) => (
        blocker === OCCUPANCYNPV_PRODUCTION_PERSISTENCE.blocker
          ? !occupancynpvProductionPersistenceState().durable
          : occupancynpvProductProductionVerificationState().status !== "VERIFIED"
      ))));
      expect(payment.PaymentReadinessGate).toBe("BLOCKED");
    }
  });
});
