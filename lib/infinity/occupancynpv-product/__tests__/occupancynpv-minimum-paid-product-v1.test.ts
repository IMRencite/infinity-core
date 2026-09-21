import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkoutReturnClaimsPaymentSuccess } from "@/lib/infinity/venture-operating-scale/occupancynpv-canonical-checkout";
import { evaluateOccupancynpvFulfillmentReadiness, evaluateOccupancynpvOfferConsistency, evaluateOccupancynpvPaymentReadinessReport } from "@/lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import { createOccupancynpvAccount, signInOccupancynpv, signOutOccupancynpv } from "../customers";
import { evaluateCalculationFixtures, flatRentInput } from "../fixtures";
import { applyOccupancynpvSubscriptionEvent, fulfillOccupancynpvVerifiedPayment } from "../fulfillment";
import { analyzeLeaseScenario, validateRentSchedule } from "../npv";
import { resetOccupancynpvProductStore } from "../persist";
import { createOccupancynpvProductStore } from "../store";
import { PROFESSIONAL_FAILED_PAYMENT_POLICY, PROFESSIONAL_USAGE_POLICY } from "../policy";
import { createDealWorkspace, listCustomerWorkspaces, saveWorkspaceScenarios, workspaceResults } from "../workspaces";

describe("OCCUPANCYNPV_MINIMUM_PAID_PRODUCT_V1", () => {
  beforeEach(() => {
    resetOccupancynpvProductStore();
  });

  afterEach(() => {
    resetOccupancynpvProductStore();
  });

  it("creates accounts, signs in, and denies unauthenticated access", () => {
    const store = createOccupancynpvProductStore();
    const created = createOccupancynpvAccount({ store, email: "a@example.com", password: "password1" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(signInOccupancynpv({ store, email: "a@example.com", password: "password1" }).ok).toBe(true);
    const denied = createDealWorkspace({ store, session: null, name: "x" });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe("UNAUTHENTICATED");
    signOutOccupancynpv(store, created.session.auth_identity_id);
  });

  it("isolates workspaces across customers", () => {
    const store = createOccupancynpvProductStore();
    const a = createOccupancynpvAccount({ store, email: "a@example.com", password: "password1" });
    const b = createOccupancynpvAccount({ store, email: "b@example.com", password: "password1" });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    fulfillOccupancynpvVerifiedPayment({ store, offerId: "PROFESSIONAL", customerId: a.customer.customer_id, paymentReference: "pay_a", eventId: "evt_a" });
    const workspace = createDealWorkspace({ store, session: a.session, name: "A deal" });
    expect(workspace.ok).toBe(true);
    if (!workspace.ok) return;
    expect(workspaceResults({ store, session: b.session, workspaceId: workspace.workspace.workspace_id }).ok).toBe(false);
    expect(listCustomerWorkspaces(store, b.session)).toHaveLength(0);
  });

  it("allocates exactly one Per-Deal workspace and denies the second", () => {
    const store = createOccupancynpvProductStore();
    const created = createOccupancynpvAccount({ store, email: "deal@example.com", password: "password1" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const paid = fulfillOccupancynpvVerifiedPayment({
      store,
      offerId: "PER_DEAL",
      customerId: created.customer.customer_id,
      paymentReference: "pay_deal",
      eventId: "evt_deal",
    });
    expect(paid.ok && paid.entitlement.quantity).toBe(1);
    if (!paid.ok) return;
    expect(paid.order.state).toBe("ENTITLEMENT_ACTIVE");
    const first = createDealWorkspace({ store, session: created.session, name: "Deal 1" });
    expect(first.ok).toBe(true);
    const second = createDealWorkspace({ store, session: created.session, name: "Deal 2" });
    expect(second.ok).toBe(false);
    expect(paid.entitlement.status).toBe("CONSUMED");
    const duplicate = fulfillOccupancynpvVerifiedPayment({
      store,
      offerId: "PER_DEAL",
      customerId: created.customer.customer_id,
      paymentReference: "pay_deal",
      eventId: "evt_deal",
    });
    expect(duplicate.ok && duplicate.duplicate).toBe(true);
    if (duplicate.ok) expect([...store.fulfillment.entitlements.values()]).toHaveLength(1);
  });

  it("creates one Professional entitlement, renews, and applies founder-approved billing policy", () => {
    const store = createOccupancynpvProductStore();
    const created = createOccupancynpvAccount({ store, email: "pro@example.com", password: "password1" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const paid = fulfillOccupancynpvVerifiedPayment({
      store,
      offerId: "PROFESSIONAL",
      customerId: created.customer.customer_id,
      paymentReference: "pay_pro",
      eventId: "evt_pro",
      subscriptionReference: "sub_pro",
      expiresAt: "2027-09-07T00:00:00.000Z",
    });
    expect(paid.ok && paid.fulfilled).toBe(true);
    if (!paid.ok) return;
    expect(createDealWorkspace({ store, session: created.session, name: "WS1" }).ok).toBe(true);
    const second = createDealWorkspace({ store, session: created.session, name: "WS2" });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.professionalUsagePolicy.code).toBe("PROFESSIONAL_USAGE_POLICY_V1");
    expect(applyOccupancynpvSubscriptionEvent({
      store,
      entitlementId: paid.entitlement.entitlement_id,
      event: "invoice.paid",
      periodEnd: "2028-09-07T00:00:00.000Z",
    }).ok).toBe(true);
    const failed = applyOccupancynpvSubscriptionEvent({
      store,
      entitlementId: paid.entitlement.entitlement_id,
      event: "invoice.payment_failed",
      now: "2028-01-01T00:00:00.000Z",
    });
    expect(failed.ok).toBe(true);
    expect(failed.reason).toBe(PROFESSIONAL_FAILED_PAYMENT_POLICY.code);
    expect(failed.entitlement?.status).toBe("PAST_DUE");
    expect(createDealWorkspace({
      store,
      session: created.session,
      name: "WS3",
      now: "2028-01-01T00:00:00.000Z",
    }).ok).toBe(true);
    const cancelled = applyOccupancynpvSubscriptionEvent({
      store,
      entitlementId: paid.entitlement.entitlement_id,
      event: "customer.subscription.deleted",
      periodEnd: "2028-09-07T00:00:00.000Z",
      now: "2028-02-01T00:00:00.000Z",
    });
    expect(cancelled.entitlement?.status).toBe("ACTIVE");
    expect(applyOccupancynpvSubscriptionEvent({
      store,
      entitlementId: paid.entitlement.entitlement_id,
      event: "customer.subscription.deleted",
      periodEnd: "2028-09-07T00:00:00.000Z",
      now: "2028-09-07T00:00:00.000Z",
    }).entitlement?.status).toBe("EXPIRED");
    expect(PROFESSIONAL_USAGE_POLICY.status).toBe("PASS");
  });

  it("validates rent schedules and calculation fixtures", () => {
    expect(validateRentSchedule({
      term_months: 12,
      rent_steps: [
        { start_month: 1, end_month: 6, monthly_rent: 1000 },
        { start_month: 5, end_month: 12, monthly_rent: 1200 },
      ],
    })).toContain("RENT_STEP_OVERLAP");
    expect(analyzeLeaseScenario(flatRentInput()).ok).toBe(true);
    const fixtures = evaluateCalculationFixtures();
    expect(fixtures.failed).toBe(0);
    expect(fixtures.passed).toBeGreaterThanOrEqual(8);
  });

  it("saves two-scenario workspace results and blocks success-query spoof", () => {
    const store = createOccupancynpvProductStore();
    const created = createOccupancynpvAccount({ store, email: "cmp@example.com", password: "password1" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    fulfillOccupancynpvVerifiedPayment({
      store,
      offerId: "PROFESSIONAL",
      customerId: created.customer.customer_id,
      paymentReference: "pay_cmp",
      eventId: "evt_cmp",
    });
    const workspace = createDealWorkspace({ store, session: created.session, name: "Compare" });
    expect(workspace.ok).toBe(true);
    if (!workspace.ok) return;
    const saved = saveWorkspaceScenarios({
      store,
      session: created.session,
      workspaceId: workspace.workspace.workspace_id,
      scenarios: [
        flatRentInput({ scenario_id: "a", scenario_name: "A" }),
        flatRentInput({ scenario_id: "b", scenario_name: "B", rent_steps: [{ start_month: 1, end_month: 12, monthly_rent: 1100 }] }),
      ],
    });
    expect(saved.ok).toBe(true);
    const results = workspaceResults({ store, session: created.session, workspaceId: workspace.workspace.workspace_id });
    expect(results.ok && results.comparison?.basis).toBe("NPV");
    expect(checkoutReturnClaimsPaymentSuccess("success", false)).toBe(false);
  });

  it("keeps fulfillment and payment readiness gated on production durability evidence", () => {
    const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
    expect(evaluateOccupancynpvOfferConsistency().result).toBe("PASS");
    const payment = evaluateOccupancynpvPaymentReadinessReport();
    expect(payment.CustomerAccess).toBe("PASS");
    expect(payment.FailureRecovery).toBe("PASS");
    expect(payment.blockingReasons).not.toContain("PROFESSIONAL_USAGE_POLICY_REQUIRED");
    if (fulfillment.result === "PASS") {
      expect(payment.Fulfillment).toBe("PASS");
      expect(payment.PaymentReadinessGate).toBe("READY_FOR_ACTIVATION_AUTHORIZATION");
    } else {
      expect(payment.Fulfillment).toBe("FAIL");
      expect(payment.PaymentReadinessGate).toBe("BLOCKED");
    }
  });
});
