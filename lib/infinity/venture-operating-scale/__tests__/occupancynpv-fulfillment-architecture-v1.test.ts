import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  applyRecurringPaymentPolicy,
  consumeOneTimeEntitlement,
  detectOrphanedPaidCustomers,
} from "@/lib/infinity/fulfillment";
import {
  CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
  CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  backfillCreVentureOperationalRecord,
  buildOccupancynpvCheckoutSessionRequest,
  checkoutReturnClaimsPaymentSuccess,
  composeOccupancynpvPaymentSafetyRollbackFiles,
  createOccupancynpvFulfillmentHarness,
  executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitectureV1Mission,
  occupancynpvApplyVerifiedPaymentFixture,
  projectVentureOperatingScaleHq,
  resetOccupancynpvDurableAuthorityStore,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";
import {
  evaluateOccupancynpvFulfillmentReadiness,
  evaluateOccupancynpvOfferConsistency,
  evaluateOccupancynpvPaymentReadinessReport,
  occupancynpvFailedPaymentPolicy,
  occupancynpvPaymentFulfillmentGuard,
  occupancynpvPerDealPromise,
  occupancynpvProfessionalPromise,
} from "../occupancynpv-fulfillment";
import { successQueryGrantsAccess } from "../occupancynpv-canonical-checkout";
import { occupancynpvPaymentActivationEnabled } from "../occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched } from "../occupancynpv-public-launch-evidence";

function seedRecord() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    canonical_url: "https://occupancynpv.com",
    public_url: "https://occupancynpv.com",
    public_launch_state: "NO",
    dns_state: "CONFIGURED",
    ssl_state: "VERIFIED",
    legal_configuration_state: "LEGAL_CONFIGURATION_COMPLETE",
    privacy_policy_url: "https://occupancynpv.com/privacy-policy/",
    terms_of_service_url: "https://occupancynpv.com/terms-of-service/",
    payment_provider: "stripe",
    payment_account_binding: { kind: "PROVIDER_BINDING", key: OCCUPANCYNPV_STRIPE_ACCOUNT_ID, rawSecretStored: false },
    pricing_state: "CONFIGURED",
    checkout_state: "CONFIGURED",
    analytics_provider: "infinity.performance_intelligence",
    revenue_state: "ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT",
    fulfillment_state: "UNCONFIGURED",
    payment_webhooks: { kind: "PROVIDER_BINDING", key: "we_1UCssQLdvXKx7R7GcHonT3rh", rawSecretStored: false },
    payment_products: [
      { id: "prod_VDIjmRpY19C9HZ", name: "OccupancyNPV Professional", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIjmRpY19C9HZ", rawSecretStored: false } },
      { id: "prod_VDIju0S2lBO9i5", name: "OccupancyNPV Per-Deal", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIju0S2lBO9i5", rawSecretStored: false } },
    ],
    payment_prices: [
      { id: "price_1UCs7hLdvXKx7R7GF2TPmwGL", productId: "prod_VDIjmRpY19C9HZ", amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7hLdvXKx7R7GF2TPmwGL", rawSecretStored: false } },
      { id: "price_1UCs7iLdvXKx7R7GmikBTGx4", productId: "prod_VDIju0S2lBO9i5", amountUsd: 149, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7iLdvXKx7R7GmikBTGx4", rawSecretStored: false } },
    ],
    blocked_actions: ["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
  });
}

describe("OCCUPANCYNPV_FULFILLMENT_ARCHITECTURE_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetOccupancynpvDurableAuthorityStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetOccupancynpvDurableAuthorityStore();
    resetInboundCommunicationRuntime();
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.contracts[CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
    );
  });

  it("evaluates OccupancyNPV fulfillment and offer consistency from product truth", () => {
    const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
    expect(evaluateOccupancynpvOfferConsistency().result).toBe("PASS");
    const payment = evaluateOccupancynpvPaymentReadinessReport();
    if (fulfillment.result === "PASS") {
      expect(payment.PaymentReadinessGate).toBe("READY_FOR_ACTIVATION_AUTHORIZATION");
    } else {
      expect(payment.PaymentReadinessGate).toBe("BLOCKED");
    }
    expect(occupancynpvProfessionalPromise()).toMatch(/lease-comparison workspace/i);
    expect(occupancynpvPerDealPromise()).toMatch(/DealWorkspace/i);
    expect(occupancynpvFailedPaymentPolicy()).toBe("PAST_DUE_THEN_EXPIRE_AT_PAID_THROUGH");
  });

  it("blocks unknown offer, wrong venture, and provider mismatch", () => {
    expect(occupancynpvPaymentFulfillmentGuard({ offerId: "ENTERPRISE" }).reason).toBe("UNKNOWN_OFFER");
    expect(occupancynpvPaymentFulfillmentGuard({ offerId: "PROFESSIONAL", ventureId: "other" }).reason).toBe("WRONG_VENTURE");
    expect(occupancynpvPaymentFulfillmentGuard({ offerId: "PROFESSIONAL", providerAccountId: "acct_other" }).reason).toBe("PROVIDER_ACCOUNT_MISMATCH");
    expect(occupancynpvPaymentFulfillmentGuard({ offerId: "PER_DEAL", providerAccountId: OCCUPANCYNPV_STRIPE_ACCOUNT_ID }).ok).toBe(true);
  });

  it("creates one Professional entitlement from a verified-payment fixture and does not fulfill", () => {
    const store = createOccupancynpvFulfillmentHarness();
    const first = occupancynpvApplyVerifiedPaymentFixture({
      store,
      offerId: "PROFESSIONAL",
      customerIdentityId: "cust_pro",
      paymentReference: "pay_pro",
      eventId: "evt_pro",
      subscriptionReference: "sub_pro",
      expiresAt: "2027-09-07T00:00:00.000Z",
    });
    expect(first.entitlement.status).toBe("ACTIVE");
    expect(first.fulfilled).toBe(false);
    expect(first.order.state).toBe("FULFILLMENT_FAILED");
    const duplicate = occupancynpvApplyVerifiedPaymentFixture({
      store,
      offerId: "PROFESSIONAL",
      customerIdentityId: "cust_pro",
      paymentReference: "pay_pro",
      eventId: "evt_pro",
      subscriptionReference: "sub_pro",
    });
    expect(duplicate.duplicate).toBe(true);
    expect([...store.entitlements.values()]).toHaveLength(1);
    expect(applyRecurringPaymentPolicy({
      store,
      entitlementId: first.entitlement.entitlement_id,
      event: "invoice.paid",
      periodEnd: "2028-09-07T00:00:00.000Z",
    }).reason).toBe("RENEWED");
    expect(applyRecurringPaymentPolicy({
      store,
      entitlementId: first.entitlement.entitlement_id,
      event: "invoice.payment_failed",
    }).reason).toBe("PROFESSIONAL_FAILED_PAYMENT_POLICY_REQUIRED");
    expect(applyRecurringPaymentPolicy({
      store,
      entitlementId: first.entitlement.entitlement_id,
      event: "customer.subscription.deleted",
      periodEnd: "2028-09-07T00:00:00.000Z",
    }).entitlement?.status).toBe("EXPIRED");
  });

  it("creates one Per-Deal entitlement and consumes the first deal allocation only", () => {
    const store = createOccupancynpvFulfillmentHarness();
    const first = occupancynpvApplyVerifiedPaymentFixture({
      store,
      offerId: "PER_DEAL",
      customerIdentityId: "cust_deal",
      paymentReference: "pay_deal",
      eventId: "evt_deal",
    });
    expect(first.entitlement.quantity).toBe(1);
    expect(first.fulfilled).toBe(false);
    const duplicate = occupancynpvApplyVerifiedPaymentFixture({
      store,
      offerId: "PER_DEAL",
      customerIdentityId: "cust_deal",
      paymentReference: "pay_deal",
      eventId: "evt_deal",
    });
    expect(duplicate.duplicate).toBe(true);
    expect([...store.entitlements.values()]).toHaveLength(1);
    expect(consumeOneTimeEntitlement({
      store,
      entitlementId: first.entitlement.entitlement_id,
      customerIdentityId: "cust_other",
    }).reason).toBe("CROSS_CUSTOMER_DENIED");
    expect(consumeOneTimeEntitlement({
      store,
      entitlementId: first.entitlement.entitlement_id,
      customerIdentityId: "cust_deal",
    }).ok).toBe(true);
    expect(consumeOneTimeEntitlement({
      store,
      entitlementId: first.entitlement.entitlement_id,
      customerIdentityId: "cust_deal",
    }).reason).toBe("ENTITLEMENT_CONSUMED");
  });

  it("rejects success-URL spoof and unpaid access", () => {
    expect(checkoutReturnClaimsPaymentSuccess("success", false)).toBe(false);
    expect(successQueryGrantsAccess("success")).toBe(false);
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: false }).createSession).toBe(false);
    const orphans = detectOrphanedPaidCustomers({
      store: createOccupancynpvFulfillmentHarness(),
      payments: [{
        payment_reference: "pay_unfulfilled",
        venture_id: "occupancynpv",
        customer_identity_id: null,
        offer_id: "PROFESSIONAL",
        succeeded: true,
        confirmed_at: "2026-09-07T00:00:00.000Z",
      }],
    });
    expect(orphans.count).toBe(1);
  });

  it("upgrades the composed checkout route to consult the canonical gate", () => {
    const composed = composeOccupancynpvPaymentSafetyRollbackFiles();
    const checkout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/api/checkout/start/route.ts");
    expect(checkout?.content).toContain("FULFILLMENT_NOT_READY");
    expect(checkout?.content).toContain("if (fulfillmentReady !== true)");
    expect(checkout?.content).not.toContain("Infinity");
    expect(checkout?.content).not.toContain("FulfillmentReadinessGate");
  });

  it("runs the mission without activating payments or creating customer payment state", async () => {
    seedRecord();
    const result = await executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitectureV1Mission();
    expect(result.mission).toBe(CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1);
    expect(result.architecture).toBe("BUILT");
    expect(["FAIL", "PASS"]).toContain(result.gates.FulfillmentReadinessGate);
    expect(result.gates.OfferFulfillmentConsistencyGate).toBe("PASS");
    expect(["BLOCKED", "READY_FOR_ACTIVATION_AUTHORIZATION"]).toContain(result.gates.PaymentReadinessGate);
    expect(result.gates.serverSideCheckoutGate).toBe("PASS");
    expect(result.gates.checkoutWhileNotReady).toBe(result.gates.FulfillmentReadinessGate === "PASS" ? "ALLOWABLE" : "BLOCKED");
    expect(result.commercialization.paymentActivation).toBe("NO");
    expect(result.commercialization.publiclyLaunched).toBe("NO");
    if (occupancynpvPubliclyLaunched()) {
      expect(result.commercialization.remaining).not.toContain("PUBLIC_LAUNCH");
    } else {
      expect(result.commercialization.remaining).toEqual(expect.arrayContaining(["PUBLIC_LAUNCH"]));
    }
    if (occupancynpvPaymentActivationEnabled()) {
      expect(result.commercialization.remaining).not.toContain("PAYMENT_ACTIVATION");
      expect(result.commercialization.cleared).toContain("PAYMENT_ACTIVATION");
    } else {
      expect(result.commercialization.remaining).toContain("PAYMENT_ACTIVATION");
    }
    if (result.gates.FulfillmentReadinessGate !== "PASS") {
      expect(result.commercialization.remaining).toEqual(expect.arrayContaining([
        "FULFILLMENT_CONFIGURATION",
        "OCCUPANCYNPV_PRODUCTION_PERSISTENCE_CONFIGURATION",
        "OCCUPANCYNPV_PRODUCT_PRODUCTION_VERIFICATION",
      ]));
    }
    expect(result.commercialization.remaining).not.toContain("REFUND_CANCELLATION_POLICY_CONFIGURATION");
    expect(result.commercialization.remaining).not.toContain("PRODUCT_DELIVERABLE_CONFIGURATION");
    expect(result.commercialization.cleared).toEqual(expect.arrayContaining([
      "REFUND_CANCELLATION_POLICY_CONFIGURATION",
      "PROFESSIONAL_USAGE_POLICY_REQUIRED",
      "PROFESSIONAL_FAILED_PAYMENT_POLICY_REQUIRED",
    ]));
    expect(result.historicalActivation.recorded).toBe("YES");
    expect(result.historicalActivation.previousActivationRolledBack).toBe("YES");
    expect(result.historicalActivation.currentStatus).toBe("BLOCKED_PENDING_FULFILLMENT");
    expect(result.writes).toEqual({
      stripeWrites: 0,
      customers: 0,
      checkoutSessions: 0,
      paymentIntents: 0,
      charges: 0,
      subscriptions: 0,
      refunds: 0,
      dnsWrites: 0,
      domainPurchases: 0,
      paymentActivation: 0,
      publicLaunch: 0,
    });
    expect(result.nextState).toBe("OCCUPANCYNPV_POLICY_CONFIGURATION_COMPLETE");
    const hq = projectVentureOperatingScaleHq({
      latestCompletedMission: CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
    });
    expect(hq.authorityVisibility.hqDecides).toBe(false);
    expect(hq.authorityVisibility.fulfillmentReadiness).toBe(result.gates.FulfillmentReadinessGate);
    expect(hq.authorityVisibility.offerContracts).toEqual(["PROFESSIONAL", "PER_DEAL"]);
    expect(hq.authorityVisibility.orphanedPaidCustomerCount).toBe(0);
    if (occupancynpvPaymentActivationEnabled()) {
      expect(hq.authorityVisibility.paymentActivation).toBe("YES");
    } else {
      expect(hq.authorityVisibility.paymentActivation).toBe("NO");
    }
    expect(hq.authorityVisibility.publicLaunch).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
  });
});
