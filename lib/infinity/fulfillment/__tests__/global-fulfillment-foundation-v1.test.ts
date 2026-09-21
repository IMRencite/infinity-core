import { describe, expect, it } from "vitest";
import {
  applyRecurringPaymentPolicy,
  applyVerifiedPayment,
  consumeOneTimeEntitlement,
  contractMissingRequiredFields,
  createFulfillmentStore,
  detectOrphanedPaidCustomers,
  evaluateFulfillmentReadinessGate,
  evaluateOfferFulfillmentConsistencyGate,
  FULFILLMENT_TYPES,
  offerMissingPromise,
  recoveryPolicyAllowsAutomaticRefund,
  resolveCustomerIdentity,
  upsertCustomerIdentity,
} from "..";
import { buildOccupancynpvCheckoutSessionRequest } from "@/lib/infinity/venture-operating-scale/occupancynpv-canonical-checkout";
import { evaluatePaidOfferFulfillmentInvariant } from "@/lib/infinity/venture-operating-scale/fulfillment";
import { evaluatePaymentReadinessGate } from "@/lib/infinity/venture-operating-scale/payments";

describe("GLOBAL_FULFILLMENT_FOUNDATION_V1", () => {
  it("supports provider-neutral fulfillment classes", () => {
    expect(FULFILLMENT_TYPES).toEqual(expect.arrayContaining([
      "SAAS_ENTITLEMENT",
      "RECURRING_DIGITAL_ACCESS",
      "ONE_TIME_WORKSPACE",
      "USAGE_CREDIT",
      "DIGITAL_DOWNLOAD",
      "GENERATED_REPORT",
      "SERVICE_DELIVERY",
      "APPOINTMENT_ACCESS",
      "LEAD_OR_INTRODUCTION",
      "PHYSICAL_GOOD",
      "EXTERNAL_PROVIDER_DELIVERY",
      "API_OR_DATA_ACCESS",
      "MARKETPLACE_DELIVERY",
      "CUSTOM",
    ]));
  });

  it("blocks paid offers missing required fulfillment evidence", () => {
    expect(evaluateFulfillmentReadinessGate().result).toBe("UNCONFIGURED");
    expect(evaluateFulfillmentReadinessGate({}).result).toBe("FAIL");
    expect(evaluateFulfillmentReadinessGate({
      canonical_offer_exists: true,
      customer_promise_defined: false,
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
    }).result).toBe("FAIL");
    expect(contractMissingRequiredFields({ contract_id: "x" })).toBe(true);
    expect(offerMissingPromise({ customer_promise: "" })).toBe(true);
    expect(evaluatePaidOfferFulfillmentInvariant({ paidOfferExists: true }).paymentActivation).toBe("BLOCKED");
    expect(evaluatePaidOfferFulfillmentInvariant({ paidOfferExists: true }).checkoutSessionCreation).toBe("BLOCKED");
  });

  it("does not treat payment confirmation as fulfillment complete", () => {
    const store = createFulfillmentStore();
    upsertCustomerIdentity({ store, ventureId: "v1", customerIdentityId: "cust_a" });
    const first = applyVerifiedPayment({
      store,
      ventureId: "v1",
      offerId: "OFFER_A",
      contractId: "ffc_a",
      paymentReference: "pay_1",
      eventId: "evt_1",
      customerIdentityId: "cust_a",
      entitlementType: "ACCESS",
      resourceScope: "app",
      quantity: 1,
      deliveryExecutorReady: false,
    });
    expect(first.order.state).toBe("FULFILLMENT_FAILED");
    expect(first.fulfilled).toBe(false);
    expect(first.entitlement.status).toBe("ACTIVE");
    expect(store.failures.size).toBe(1);
    const duplicate = applyVerifiedPayment({
      store,
      ventureId: "v1",
      offerId: "OFFER_A",
      contractId: "ffc_a",
      paymentReference: "pay_1",
      eventId: "evt_1",
      customerIdentityId: "cust_a",
      entitlementType: "ACCESS",
      resourceScope: "app",
      quantity: 1,
      deliveryExecutorReady: false,
    });
    expect(duplicate.duplicate).toBe(true);
    expect([...store.orders.values()]).toHaveLength(1);
    expect([...store.entitlements.values()]).toHaveLength(1);
  });

  it("detects orphaned paid customers and never auto-refunds", () => {
    const store = createFulfillmentStore();
    const orphans = detectOrphanedPaidCustomers({
      store,
      payments: [{
        payment_reference: "pay_orphan",
        venture_id: "v1",
        customer_identity_id: null,
        offer_id: "OFFER_A",
        succeeded: true,
        confirmed_at: "2026-09-07T00:00:00.000Z",
      }],
    });
    expect(orphans.count).toBe(1);
    expect(recoveryPolicyAllowsAutomaticRefund({
      policy_id: "x",
      venture_id: "v1",
      automatic_refund: false,
      outcomes: ["CUSTOMER_SUPPORT_REQUIRED"],
      support_path: "infinitemediaresources@gmail.com",
    })).toBe(false);
  });

  it("consumes one-time entitlements once and isolates customers", () => {
    const store = createFulfillmentStore();
    upsertCustomerIdentity({ store, ventureId: "v1", customerIdentityId: "cust_a" });
    const paid = applyVerifiedPayment({
      store,
      ventureId: "v1",
      offerId: "PER_DEAL",
      contractId: "ffc_deal",
      paymentReference: "pay_deal",
      eventId: "evt_deal",
      customerIdentityId: "cust_a",
      entitlementType: "ONE_DEAL_WORKSPACE",
      resourceScope: "deal",
      quantity: 1,
      deliveryExecutorReady: true,
    });
    expect(paid.fulfilled).toBe(true);
    expect(consumeOneTimeEntitlement({ store, entitlementId: paid.entitlement.entitlement_id, customerIdentityId: "cust_b" }).reason).toBe("CROSS_CUSTOMER_DENIED");
    expect(consumeOneTimeEntitlement({ store, entitlementId: paid.entitlement.entitlement_id, customerIdentityId: "cust_a" }).ok).toBe(true);
    expect(consumeOneTimeEntitlement({ store, entitlementId: paid.entitlement.entitlement_id, customerIdentityId: "cust_a" }).reason).toBe("ENTITLEMENT_CONSUMED");
  });

  it("reconciles recurring renewal and requires a failed-payment policy", () => {
    const store = createFulfillmentStore();
    upsertCustomerIdentity({ store, ventureId: "v1", customerIdentityId: "cust_a" });
    const paid = applyVerifiedPayment({
      store,
      ventureId: "v1",
      offerId: "PROFESSIONAL",
      contractId: "ffc_pro",
      paymentReference: "pay_sub",
      eventId: "evt_sub",
      customerIdentityId: "cust_a",
      subscriptionReference: "sub_1",
      entitlementType: "PROFESSIONAL_ACCESS",
      resourceScope: "app",
      quantity: 1,
      recurring: true,
      expiresAt: "2026-09-07T00:00:00.000Z",
      deliveryExecutorReady: true,
    });
    expect(applyRecurringPaymentPolicy({
      store,
      entitlementId: paid.entitlement.entitlement_id,
      event: "invoice.paid",
      periodEnd: "2027-09-07T00:00:00.000Z",
    }).reason).toBe("RENEWED");
    expect(applyRecurringPaymentPolicy({
      store,
      entitlementId: paid.entitlement.entitlement_id,
      event: "invoice.payment_failed",
    }).reason).toBe("PROFESSIONAL_FAILED_PAYMENT_POLICY_REQUIRED");
    expect(applyRecurringPaymentPolicy({
      store,
      entitlementId: paid.entitlement.entitlement_id,
      event: "customer.subscription.deleted",
      periodEnd: "2027-09-07T00:00:00.000Z",
    }).entitlement?.status).toBe("EXPIRED");
  });

  it("blocks unknown identity email authorization and checkout without fulfillment PASS", () => {
    const store = createFulfillmentStore();
    expect(resolveCustomerIdentity({
      store,
      ventureId: "v1",
      email: "a@example.com",
    }).reason).toBe("EMAIL_IS_NOT_AUTHORIZATION");
    expect(evaluateOfferFulfillmentConsistencyGate({}).result).toBe("FAIL");
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true, fulfillmentReady: false }).createSession).toBe(false);
    expect(evaluatePaymentReadinessGate({
      stripeConnected: true,
      stripeVerification: "LIVE_WRITE_VERIFIED",
      stripeEnvironment: "LIVE",
      offersConsistent: true,
      checkoutArchitecture: true,
      webhookArchitecture: true,
      revenueLineage: true,
      domainBound: true,
      legalReady: true,
      objectsConfigured: true,
      paymentsActivated: true,
      paidOfferExists: true,
    }).result).toBe("BLOCKED");
  });
});
