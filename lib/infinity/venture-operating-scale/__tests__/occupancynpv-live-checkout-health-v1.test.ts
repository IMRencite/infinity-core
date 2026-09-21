import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  evaluateRenderedCommercialFailureExperienceGate,
  OCCUPANCYNPV_CHECKOUT_CUSTOMER_SAFE_ERROR,
} from "@/lib/infinity/public-venture-design/rendered-interaction/commercial-failure-experience";
import { evaluateClientSafeBarrelExportGate, evaluateServerClientBoundaryIntegrityGate } from "@/lib/infinity/server-client-boundary/gates";
import { projectOperationsRoom } from "@/lib/infinity/hq-information-architecture/operations-room";
import { projectCanonicalHqActivity } from "@/lib/infinity/hq-canonical-projection/activity";
import { evaluateFounderWorkVisibilityContract } from "@/lib/infinity/hq-canonical-projection/registry";
import {
  OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS,
  buildOccupancynpvCheckoutSessionRequest,
} from "../occupancynpv-canonical-checkout";
import { evaluateOccupancynpvFulfillmentReadiness } from "../occupancynpv-fulfillment";
import { composeOccupancynpvPaymentReactivationFiles } from "../occupancynpv-payment-reactivation-surface";
import {
  HIGH_PRIORITY_COMMERCIAL_INCIDENT,
  LIVE_COMMERCIAL_CHECKOUT_HEALTH_GATE,
  evaluateLiveCommercialCheckoutHealthGate,
  occupancynpvCustomerSafeCheckoutFailureHtml,
  persistLiveCommercialCheckoutHealth,
  readLiveCommercialCheckoutHealth,
  readLiveCommercialCheckoutIncident,
  syntheticCheckoutSessionExcludedFromRevenueAndFulfillment,
  type LiveCommercialCheckoutHealthRecord,
} from "../occupancynpv-live-checkout-health";
import { applyPostLaunchEvidenceOverlay } from "../post-launch-operating-runtime";
import { runDailyVentureOperatingCycle } from "../operations";
import { CRE_VENTURE_ID } from "../constants";
import { projectEvidenceAwareCheckoutState, projectEvidenceAwarePaymentState } from "../hq-venture-lifecycle";
import { backfillCreVentureOperationalRecord } from "../record";
import { projectOccupancynpvHqDetail } from "../hq-venture-registry";

function failedHealth(overrides: Partial<LiveCommercialCheckoutHealthRecord> = {}): LiveCommercialCheckoutHealthRecord {
  const professional = {
    offer: "PROFESSIONAL" as const,
    priceId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId,
    productId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.productId,
    mode: "subscription" as const,
    priceExists: true,
    priceActive: true,
    amount: 29000,
    billing: "ANNUAL_RECURRING",
    productExists: true,
    sessionCreate: "FAIL" as const,
    sessionId: null,
    checkoutUrlValid: false,
    retrievedMode: null,
    retrievedPriceId: null,
    retrievedSuccessUrl: null,
    retrievedCancelUrl: null,
    paymentStatus: null,
    errorType: "invalid_request_error",
    errorCode: "more_permissions_required",
    requestId: "req_test_professional",
  };
  const perDeal = {
    ...professional,
    offer: "PER_DEAL" as const,
    priceId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId,
    productId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.productId,
    mode: "payment" as const,
    amount: 14900,
    billing: "ONE_TIME",
    requestId: "req_test_per_deal",
  };
  return {
    gate: LIVE_COMMERCIAL_CHECKOUT_HEALTH_GATE,
    result: "FAIL",
    reasons: ["PROFESSIONAL_SESSION_CREATE_FAILED", "PER_DEAL_SESSION_CREATE_FAILED", "CHECKOUT_SESSION_WRITE_PERMISSION_MISSING"],
    classified: HIGH_PRIORITY_COMMERCIAL_INCIDENT,
    operatingAction: "REPAIR",
    detectedAt: "2026-09-10T04:50:00.000Z",
    venture: "occupancynpv",
    provider: "stripe",
    account: "acct_18h5CjLdvXKx7R7G",
    secretConfigured: "YES",
    keyMode: "LIVE",
    keyKind: "RESTRICTED",
    webhookSecretConfigured: "YES",
    fulfillment: "PASS",
    paymentActivation: "YES",
    publiclyLaunched: "YES",
    professional,
    perDeal,
    successUrl: "https://occupancynpv.com/occupancynpv/app/checkout/complete",
    cancelUrl: "https://occupancynpv.com/pricing",
    successUrlValid: true,
    cancelUrlValid: true,
    arbitraryClientPriceBlocked: true,
    realPaymentCompleted: false,
    sessionCreateHasProviderObjectCost: "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED",
    ...overrides,
  };
}

describe("OccupancyNPV live checkout health v1", () => {
  afterEach(() => {
    if (existsSync(".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json")) {
      persistLiveCommercialCheckoutHealth(
        JSON.parse(readFileSync(".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json", "utf8")),
      );
    }
  });

  it("binds only canonical Professional and Per-Deal prices and rejects arbitrary client prices", () => {
    const professional = buildOccupancynpvCheckoutSessionRequest({
      offer: "PROFESSIONAL",
      activationAuthorized: true,
      fulfillmentReady: true,
    });
    const perDeal = buildOccupancynpvCheckoutSessionRequest({
      offer: "PER_DEAL",
      activationAuthorized: true,
      fulfillmentReady: true,
    });
    expect(professional.request?.priceId).toBe("price_1UCs7hLdvXKx7R7GF2TPmwGL");
    expect(professional.request?.mode).toBe("subscription");
    expect(perDeal.request?.priceId).toBe("price_1UCs7iLdvXKx7R7GmikBTGx4");
    expect(perDeal.request?.mode).toBe("payment");
    expect(buildOccupancynpvCheckoutSessionRequest({
      offer: "PROFESSIONAL",
      clientPriceId: "price_1FakeClientPrice",
      activationAuthorized: true,
      fulfillmentReady: true,
    }).reason).toBe("ARBITRARY_PRICE_BLOCKED");
    expect(buildOccupancynpvCheckoutSessionRequest({
      offer: "UNKNOWN",
      activationAuthorized: true,
      fulfillmentReady: true,
    }).ok).toBe(false);
  });

  it("uses production OccupancyNPV return URLs in the generated checkout route", () => {
    const checkout = composeOccupancynpvPaymentReactivationFiles().files
      .find((file) => file.path.replace(/\\/g, "/") === "app/api/checkout/start/route.ts")?.content ?? "";
    expect(checkout).toContain("https://occupancynpv.com/occupancynpv/app/checkout/complete");
    expect(checkout).toContain("https://occupancynpv.com/pricing");
    expect(checkout).not.toContain("localhost");
    expect(checkout).not.toContain("vercel.app");
    expect(checkout).toContain(OCCUPANCYNPV_CHECKOUT_CUSTOMER_SAFE_ERROR);
    expect(checkout).toContain("CHECKOUT_UNAVAILABLE");
  });

  it("fails LiveCommercialCheckoutHealthGate when session create fails on a launched paid venture", () => {
    const record = failedHealth();
    const gate = evaluateLiveCommercialCheckoutHealthGate(record);
    expect(gate.gate).toBe("LiveCommercialCheckoutHealthGate");
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(expect.arrayContaining([
      "PUBLIC_LAUNCH_PAYMENT_ACTIVE_CHECKOUT_UNHEALTHY",
      "PROFESSIONAL_SESSION_CREATE_FAILED",
      "PER_DEAL_SESSION_CREATE_FAILED",
    ]));
  });

  it("classifies live checkout failure as a high-priority commercial incident with repair action", () => {
    persistLiveCommercialCheckoutHealth(failedHealth());
    const health = readLiveCommercialCheckoutHealth();
    const incident = readLiveCommercialCheckoutIncident();
    expect(health?.classified).toBe(HIGH_PRIORITY_COMMERCIAL_INCIDENT);
    expect(health?.operatingAction).toBe("REPAIR");
    expect(incident?.subsystem).toBe("PAYMENT / CHECKOUT DEGRADED");
    expect(incident?.repairMission).toBe("OCCUPANCYNPV_LIVE_CHECKOUT_REGRESSION_REPAIR_V1");
    const record = backfillCreVentureOperationalRecord();
    expect(projectEvidenceAwarePaymentState(record).payment).toBe("DEGRADED");
    expect(projectEvidenceAwarePaymentState(record).paymentActivation).toBe("YES");
    expect(projectEvidenceAwareCheckoutState({
      paymentActivation: true,
      fulfillmentReady: true,
    }).checkout).toBe("DEGRADED");
    expect(evaluateOccupancynpvFulfillmentReadiness().result).toBe("PASS");
  });

  it("does not render raw commercial JSON to customers", () => {
    const raw = evaluateRenderedCommercialFailureExperienceGate({
      body: JSON.stringify({ ok: false, reason: "CHECKOUT_SESSION_CREATE_FAILED", createSession: false }),
      contentType: "application/json",
    });
    expect(raw.result).toBe("FAIL");
    expect(raw.reasons).toEqual(expect.arrayContaining(["RAW_JSON", "INTERNAL_ENUM", "CUSTOMER_SAFE_COPY_MISSING"]));
    const safe = evaluateRenderedCommercialFailureExperienceGate({
      body: occupancynpvCustomerSafeCheckoutFailureHtml(),
      contentType: "text/html",
    });
    expect(safe.result).toBe("PASS");
  });

  it("projects checkout failure into daily operating repair instead of waiting for evidence", () => {
    persistLiveCommercialCheckoutHealth(failedHealth());
    const overlaid = applyPostLaunchEvidenceOverlay(
      runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 }),
      0,
    );
    expect(overlaid.snapshot.dailyResult).toBe("HIGH_PRIORITY_COMMERCIAL_INCIDENT");
    expect(overlaid.snapshot.nextGovernedWork).toEqual(["REPAIR_LIVE_COMMERCIAL_CHECKOUT"]);
    expect(overlaid.commercializationWorkRecognized).toBe(true);
    expect(overlaid.snapshot.learningSignals).toContain("live_checkout_session_create_failed");
  });

  it("makes the HQ incident and repair mission visible without marking fulfillment failed", () => {
    persistLiveCommercialCheckoutHealth(failedHealth());
    const operations = projectOperationsRoom();
    expect(operations.workers.some((row) => (row.task ?? row.displayTask ?? "").includes("CHECKOUT DEGRADED"))).toBe(true);
    expect(operations.department.artifacts?.some((row) => row.label.includes("HIGH_PRIORITY_COMMERCIAL_INCIDENT"))).toBe(true);
    expect(operations.department.artifacts?.some((row) => row.label.includes("OCCUPANCYNPV_LIVE_CHECKOUT_REGRESSION_REPAIR_V1"))).toBe(true);
    const activity = projectCanonicalHqActivity();
    expect(activity.some((row) => row.summary.includes("PAYMENT / CHECKOUT DEGRADED"))).toBe(true);
    const detail = projectOccupancynpvHqDetail();
    expect(detail?.commercial.checkout).toBe("DEGRADED");
    expect(detail?.fulfillment.gate).toBe("PASS");
    expect(detail?.fulfillment.orphanedPaidCustomerCount).toBe(0);
    expect(evaluateFounderWorkVisibilityContract("operations").productionAutonomy).toBe("READY");
    expect(evaluateFounderWorkVisibilityContract("incidents").productionAutonomy).toBe("READY");
    expect(evaluateFounderWorkVisibilityContract("payments").productionAutonomy).toBe("READY");
  });

  it("resolves the historical incident without deleting it when live checkout recovers", () => {
    persistLiveCommercialCheckoutHealth(failedHealth());
    const open = readLiveCommercialCheckoutIncident();
    expect(open?.status).toBe("OPEN");
    persistLiveCommercialCheckoutHealth({
      ...failedHealth({
        result: "PASS",
        reasons: [],
        classified: "HEALTHY",
        operatingAction: "NONE",
        professional: {
          ...failedHealth().professional,
          sessionCreate: "PASS",
          sessionId: "cs_test_professional",
          checkoutUrlValid: true,
          retrievedMode: "subscription",
          retrievedPriceId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId,
          retrievedSuccessUrl: "https://occupancynpv.com/occupancynpv/app/checkout/complete",
          retrievedCancelUrl: "https://occupancynpv.com/pricing",
          paymentStatus: "unpaid",
          errorType: null,
          errorCode: null,
          requestId: null,
        },
        perDeal: {
          ...failedHealth().perDeal,
          sessionCreate: "PASS",
          sessionId: "cs_test_per_deal",
          checkoutUrlValid: true,
          retrievedMode: "payment",
          retrievedPriceId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId,
          retrievedSuccessUrl: "https://occupancynpv.com/occupancynpv/app/checkout/complete",
          retrievedCancelUrl: "https://occupancynpv.com/pricing",
          paymentStatus: "unpaid",
          errorType: null,
          errorCode: null,
          requestId: null,
        },
      }),
    });
    const resolved = readLiveCommercialCheckoutIncident();
    expect(resolved?.status).toBe("RESOLVED");
    expect(resolved?.currentState).toBe("RESOLVED");
    expect(resolved?.repairMissionStatus).toBe("COMPLETED");
    expect(resolved?.detectedAt).toBe(open?.detectedAt);
    expect(resolved?.originalFailure.errorCode).toBe("more_permissions_required");
    expect(resolved?.originalFailure.missingPermission).toBe("checkout_session_write");
    expect(resolved?.resolvedAt).toBeTruthy();
    expect(existsSync(".infinity/venture-operating-scale/occupancynpv-live-checkout-incident.json")).toBe(true);
    const record = backfillCreVentureOperationalRecord();
    expect(projectEvidenceAwarePaymentState(record).payment).toBe("ACTIVE");
    expect(projectEvidenceAwareCheckoutState({
      paymentActivation: true,
      fulfillmentReady: true,
    }).checkout).toBe("ENABLED");
    const operations = projectOperationsRoom();
    expect(operations.department.artifacts?.some((row) => row.label.includes("RESOLVED"))).toBe(true);
    expect(projectCanonicalHqActivity().some((row) => row.summary.includes("RESOLVED"))).toBe(true);
  });

  it("excludes synthetic unpaid sessions from revenue and fulfillment", () => {
    expect(syntheticCheckoutSessionExcludedFromRevenueAndFulfillment({
      metadata: { infinity_health_check: "synthetic_unpaid", infinity_offer: "PROFESSIONAL" },
      payment_status: "unpaid",
      client_reference_id: "cust_healthcheck",
    })).toBe(true);
    expect(syntheticCheckoutSessionExcludedFromRevenueAndFulfillment({
      metadata: { infinity_offer: "PROFESSIONAL" },
      payment_status: "paid",
      client_reference_id: "cust_real",
    })).toBe(false);
  });

  it("keeps Stripe and Playwright off the client graph", () => {
    const barrels = evaluateClientSafeBarrelExportGate();
    const boundary = evaluateServerClientBoundaryIntegrityGate();
    expect(barrels.result).toBe("PASS");
    expect(boundary.result).toBe("PASS");
    expect(boundary.playwrightReach).toBe(0);
    expect(boundary.asyncHooksReach).toBe(0);
    expect(JSON.stringify(boundary.reasons)).not.toMatch(/stripe/i);
  });
});
