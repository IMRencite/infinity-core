import { describe, expect, it } from "vitest";
import { evaluateFounderWorkVisibilityContract } from "@/lib/infinity/hq-canonical-projection/registry";
import { projectOccupancynpvHqDetail } from "@/lib/infinity/venture-operating-scale/hq-venture-registry";
import { backfillCreVentureOperationalRecord, writeVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale";
import { evaluatePublicLaunchReadinessGate } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-readiness";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { evaluateOccupancynpvFulfillmentReadiness } from "@/lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import { evaluateRenderedCommercialFailureExperienceGate } from "@/lib/infinity/public-venture-design/rendered-interaction/commercial-failure-experience";
import {
  COMMERCIAL_CREDENTIAL_CAPABILITY_CONTRACT,
  COMMERCIAL_PRODUCTION_READINESS_GATE,
  END_TO_END_MONEY_PATH_CONTRACT,
  PAYMENT_PATH_READINESS_GATE,
  PAYMENT_PATH_VERIFICATION_FRESHNESS_GATE,
  activationStateFromPath,
  commercialOperatingPrecedence,
  configurationOnlyPaymentEvidenceFails,
  evaluateCommercialCredentialCapabilityContract,
  evaluateCommercialProductionReadinessGate,
  evaluateEndToEndMoneyPathContract,
  evaluatePaymentPathReadinessGate,
  evaluatePaymentPathVerificationFreshnessGate,
  evaluateWebhookHealthIndependently,
  factoryPaymentPathIsProviderNeutral,
  futurePaidVentureMustVerifyExecutablePath,
  invalidatePaymentPathVerificationOnChange,
  leastPrivilegePaymentCredentialRule,
  occupancynpvEndToEndMoneyPath,
  occupancynpvKnownGoodPaymentPathFixture,
  occupancynpvMissingCheckoutWriteExpectedOutcomes,
  occupancynpvMissingCheckoutWriteFixture,
  paidVentureFactoryPaymentPathSequence,
  paidVentureFactoryRequiresPaymentPathQc,
  persistFounderOccupancynpvCheckoutReview,
  persistGlobalPaymentPathAssuranceEvidence,
  projectPaymentPathHq,
  readFounderOccupancynpvCheckoutReview,
  readOccupancynpvLivePaymentPathVerification,
  shouldReverifyPaymentPath,
  syntheticPaymentMustNotContaminate,
} from "@/lib/infinity/payment-path";

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 credential capability", () => {
  it("passes valid Stripe checkout capabilities on a restricted key", () => {
    const contract = evaluateCommercialCredentialCapabilityContract({
      provider: "stripe",
      credentialKind: "RESTRICTED",
      proven: {
        "account.read": "PASS",
        "product.read": "PASS",
        "price.read": "PASS",
        "checkout.session.write": "PASS",
        "webhook.read": "PASS",
      },
    });
    expect(contract.contract).toBe(COMMERCIAL_CREDENTIAL_CAPABILITY_CONTRACT);
    expect(contract.result).toBe("PASS");
    expect(contract.preferRestrictedKey).toBe(true);
    expect(contract.doNotRequestUnrestrictedKey).toBe(true);
  });

  it("fails when checkout.session.write is missing", () => {
    const contract = evaluateCommercialCredentialCapabilityContract({
      provider: "stripe",
      credentialKind: "RESTRICTED",
      proven: {
        "account.read": "PASS",
        "product.read": "PASS",
        "price.read": "PASS",
        "checkout.session.write": "FAIL",
        "webhook.read": "PASS",
      },
    });
    expect(contract.result).toBe("FAIL");
    expect(contract.reasons.some((row) => row.includes("CHECKOUT_SESSION_WRITE"))).toBe(true);
  });

  it("fails missing credentials as unknown required capabilities", () => {
    expect(evaluateCommercialCredentialCapabilityContract({
      provider: "stripe",
      proven: {},
    }).result).toBe("FAIL");
  });

  it("keeps non-Stripe providers on their own executable capability, not Stripe hard-coding", () => {
    const paddle = evaluateCommercialCredentialCapabilityContract({
      provider: "paddle",
      proven: { "payment.create": "PASS" },
    });
    expect(paddle.result).toBe("PASS");
    expect(paddle.capabilities.map((row) => row.id)).toEqual(["payment.create"]);
    expect(leastPrivilegePaymentCredentialRule()).toMatch(/unrestricted financial credentials/i);
  });
});

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 payment path", () => {
  it("passes a valid live unpaid verification", () => {
    const gate = evaluatePaymentPathReadinessGate(occupancynpvKnownGoodPaymentPathFixture());
    expect(gate.gate).toBe(PAYMENT_PATH_READINESS_GATE);
    expect(gate.result).toBe("PASS");
    expect(gate.activationState).toBe("ACTIVE");
  });

  it("fails never-verified configuration as CONFIGURED_NOT_VERIFIED", () => {
    const gate = evaluatePaymentPathReadinessGate(null);
    expect(gate.result).toBe("FAIL");
    expect(gate.activationState).toBe("CONFIGURED_NOT_VERIFIED");
    expect(gate.reasons).toEqual(expect.arrayContaining(["NEVER_VERIFIED", "CONFIGURATION_IS_NOT_READINESS"]));
  });

  it("fails configuration-only evidence when checkout_session_write is missing", () => {
    const gate = configurationOnlyPaymentEvidenceFails({
      accountExists: true,
      productExists: true,
      priceExists: true,
      webhookExists: true,
      checkoutSessionWrite: false,
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(expect.arrayContaining(["CONFIGURATION_IS_NOT_READINESS", "CHECKOUT_SESSION_WRITE_MISSING"]));
  });

  it("fails missing provider auth, wrong account, wrong mode, inactive price, and invalid return URLs independently", () => {
    const base = occupancynpvKnownGoodPaymentPathFixture();
    const broken = {
      ...base,
      result: "FAIL" as const,
      offers: [
        {
          ...base.offers[0],
          providerAuth: "FAIL" as const,
          accountPass: "FAIL" as const,
          billingModePass: "FAIL" as const,
          pricePass: "FAIL" as const,
          successUrlPass: "FAIL" as const,
          cancelUrlPass: "FAIL" as const,
        },
        base.offers[1],
      ],
    };
    const gate = evaluatePaymentPathReadinessGate(broken);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(expect.arrayContaining([
      "PROFESSIONAL_PROVIDER_AUTH",
      "PROFESSIONAL_ACCOUNT",
      "PROFESSIONAL_BILLING_MODE",
      "PROFESSIONAL_PRICE",
      "PROFESSIONAL_SUCCESS_URL",
      "PROFESSIONAL_CANCEL_URL",
    ]));
    expect(gate.reasons).not.toContain("PER_DEAL_LIVE_SESSION_CREATE");
  });

  it("fails provider create-session 403 / missing permission without treating readback as readiness", () => {
    const fixture = occupancynpvMissingCheckoutWriteFixture();
    const gate = evaluatePaymentPathReadinessGate(fixture);
    const expected = occupancynpvMissingCheckoutWriteExpectedOutcomes();
    expect(fixture.offers.every((offer) => offer.accountPass === "PASS" && offer.productPass === "PASS" && offer.pricePass === "PASS")).toBe(true);
    expect(gate.result).toBe(expected.PaymentPathReadinessGate);
    expect(gate.activationState).toBe("VERIFICATION_FAILED");
    expect(activationStateFromPath({
      configured: true,
      path: gate,
      publiclyLaunched: false,
      paymentActivated: false,
    })).toBe("VERIFICATION_FAILED");
    expect(activationStateFromPath({
      configured: true,
      path: gate,
      publiclyLaunched: true,
      paymentActivated: true,
    })).toBe("DEGRADED");
    expect(expected.preLaunch).toBe("BLOCKED");
    expect(expected.postLaunch).toBe("HIGH_PRIORITY_COMMERCIAL_INCIDENT");
    expect(expected.monitoringDetectsWithoutFounder).toBe(true);
    expect(commercialOperatingPrecedence({ paymentPath: "FAIL", observations: 0 })).toBe("REPAIR");
  });

  it("fails provider 5xx session create as a path failure", () => {
    const base = occupancynpvKnownGoodPaymentPathFixture();
    const gate = evaluatePaymentPathReadinessGate({
      ...base,
      result: "FAIL",
      reasons: ["PROVIDER_5XX"],
      offers: base.offers.map((offer) => ({ ...offer, liveSessionCreate: "FAIL" as const })),
    });
    expect(gate.result).toBe("FAIL");
  });

  it("fails when checkout works but fulfillment binding is missing", () => {
    const base = occupancynpvKnownGoodPaymentPathFixture();
    expect(evaluatePaymentPathReadinessGate({
      ...base,
      result: "FAIL",
      offers: base.offers.map((offer) => ({ ...offer, fulfillmentBinding: "FAIL" as const })),
    }).result).toBe("FAIL");
  });
});

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 freshness", () => {
  it("fails never verified, changed fingerprint, stale, and relevant change", () => {
    expect(evaluatePaymentPathVerificationFreshnessGate({
      verification: null,
      currentFingerprint: "now",
    }).reasons).toContain("NEVER_VERIFIED");
    const current = occupancynpvKnownGoodPaymentPathFixture();
    expect(evaluatePaymentPathVerificationFreshnessGate({
      verification: current,
      currentFingerprint: "different",
    }).result).toBe("FAIL");
    expect(evaluatePaymentPathVerificationFreshnessGate({
      verification: { ...current, verifiedAt: "2020-01-01T00:00:00.000Z" },
      currentFingerprint: current.fingerprint,
    }).reasons).toContain("VERIFICATION_STALE");
    expect(evaluatePaymentPathVerificationFreshnessGate({
      verification: current,
      currentFingerprint: current.fingerprint,
      relevantChange: true,
    }).reasons).toContain("RELEVANT_CONFIG_OR_DEPLOY_CHANGE");
    expect(invalidatePaymentPathVerificationOnChange({
      previousFingerprint: "a",
      currentFingerprint: "b",
    })).toBe(true);
  });

  it("passes current verification with no relevant change", () => {
    const current = occupancynpvKnownGoodPaymentPathFixture();
    const gate = evaluatePaymentPathVerificationFreshnessGate({
      verification: current,
      currentFingerprint: current.fingerprint,
    });
    expect(gate.gate).toBe(PAYMENT_PATH_VERIFICATION_FRESHNESS_GATE);
    expect(gate.result).toBe("PASS");
  });
});

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 money path", () => {
  it("requires every executable step through unpaid provider checkout", () => {
    const pass = occupancynpvEndToEndMoneyPath();
    expect(pass.contract).toBe(END_TO_END_MONEY_PATH_CONTRACT);
    expect(pass.result).toBe("PASS");
    expect(evaluateEndToEndMoneyPathContract({
      ...pass,
      fulfillment: "FAIL",
    }).result).toBe("FAIL");
    expect(occupancynpvEndToEndMoneyPath({ offerId: "PER_DEAL" }).offerId).toBe("PER_DEAL");
  });

  it("fails raw customer JSON independently of provider session create", () => {
    const raw = evaluateRenderedCommercialFailureExperienceGate({
      body: JSON.stringify({ ok: false, reason: "CHECKOUT_SESSION_CREATE_FAILED" }),
      contentType: "application/json",
    });
    expect(raw.result).toBe("FAIL");
  });

  it("verifies webhook health independently of checkout session create", () => {
    expect(evaluateWebhookHealthIndependently({
      configured: true,
      correctEndpoint: true,
      expectedEventSubscriptions: true,
      signatureValidation: true,
      idempotency: true,
      eventPersistence: true,
      failureRetry: true,
      checkoutSessionCreate: "FAIL",
    }).result).toBe("PASS");
    expect(evaluateWebhookHealthIndependently({
      configured: false,
      correctEndpoint: true,
      expectedEventSubscriptions: true,
      signatureValidation: true,
      idempotency: true,
      eventPersistence: true,
      failureRetry: true,
      checkoutSessionCreate: "PASS",
    }).result).toBe("FAIL");
  });
});

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 synthetic safety", () => {
  it("accepts labeled unpaid synthetic probes", () => {
    expect(syntheticPaymentMustNotContaminate({
      recordedAsRevenue: false,
      recordedAsCustomer: false,
      consumedEntitlement: false,
      triggeredFulfillment: false,
      metadataHealthCheck: "synthetic_unpaid",
      paymentStatus: "unpaid",
    }).result).toBe("PASS");
  });

  it("fails revenue, customer, entitlement, and fulfillment contamination", () => {
    expect(syntheticPaymentMustNotContaminate({
      recordedAsRevenue: true,
      recordedAsCustomer: false,
      consumedEntitlement: false,
      triggeredFulfillment: false,
      metadataHealthCheck: "synthetic_unpaid",
      paymentStatus: "unpaid",
    }).reasons).toContain("REVENUE_CONTAMINATION");
    expect(syntheticPaymentMustNotContaminate({
      recordedAsRevenue: false,
      recordedAsCustomer: true,
      consumedEntitlement: false,
      triggeredFulfillment: false,
      metadataHealthCheck: "synthetic_unpaid",
      paymentStatus: "unpaid",
    }).reasons).toContain("CUSTOMER_COUNT_CONTAMINATION");
    expect(syntheticPaymentMustNotContaminate({
      recordedAsRevenue: false,
      recordedAsCustomer: false,
      consumedEntitlement: true,
      triggeredFulfillment: false,
      metadataHealthCheck: "synthetic_unpaid",
      paymentStatus: "unpaid",
    }).reasons).toContain("ENTITLEMENT_CONTAMINATION");
    expect(syntheticPaymentMustNotContaminate({
      recordedAsRevenue: false,
      recordedAsCustomer: false,
      consumedEntitlement: false,
      triggeredFulfillment: true,
      metadataHealthCheck: "synthetic_unpaid",
      paymentStatus: "unpaid",
    }).reasons).toContain("FULFILLMENT_CONTAMINATION");
  });
});

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 HQ", () => {
  it("projects payment-path status, last/next verification, and incident fields", () => {
    const verification = occupancynpvKnownGoodPaymentPathFixture();
    const hq = projectPaymentPathHq({
      paymentActivated: true,
      verification,
      path: evaluatePaymentPathReadinessGate(verification),
      credential: { gate: COMMERCIAL_CREDENTIAL_CAPABILITY_CONTRACT, result: "PASS", reasons: [] },
      webhook: { gate: "WebhookHealthGate", result: "PASS", reasons: [] },
      fulfillment: "PASS",
      incident: "RESOLVED",
    });
    expect(hq.paymentPathHealth).toBe("PASS");
    expect(hq.lastLiveVerification).toBeTruthy();
    expect(hq.nextVerification).toBeTruthy();
    expect(hq.currentIncident).toBe("RESOLVED");
    expect(hq.offersHealthy).toBe("2/2");
    writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
    const detail = projectOccupancynpvHqDetail();
    expect(detail?.commercial.paymentPathHealth).toBeTruthy();
    expect(detail?.commercial.lastLiveVerification !== undefined).toBe(true);
    expect(detail?.commercial.nextVerification !== undefined).toBe(true);
    expect(detail?.commercial.currentIncident !== undefined).toBe(true);
    expect(evaluateFounderWorkVisibilityContract("payments").productionAutonomy).toBe("READY");
    expect(evaluateFounderWorkVisibilityContract("operations").productionAutonomy).toBe("READY");
    expect(evaluateFounderWorkVisibilityContract("incidents").productionAutonomy).toBe("READY");
  });

  it("records founder OccupancyNPV checkout review as PASS without making founder the monitor", () => {
    const review = persistFounderOccupancynpvCheckoutReview();
    expect(review.review).toBe("FOUNDER_OCCUPANCYNPV_CHECKOUT_REVIEW");
    expect(review.status).toBe("PASS");
    expect(readFounderOccupancynpvCheckoutReview()?.status).toBe("PASS");
    expect(review.automatedMonitoringReplacesFounderAsHealthSystem).toBe(true);
  });
});

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 factory", () => {
  it("requires payment-path QC on every future paid venture and stays provider-neutral", () => {
    expect(paidVentureFactoryRequiresPaymentPathQc()).toBe(true);
    expect(factoryPaymentPathIsProviderNeutral()).toBe(true);
    expect(paidVentureFactoryPaymentPathSequence()).toEqual([
      "CommercialOfferContract",
      "BackendReadiness",
      "FulfillmentContract",
      "PaymentProviderConfiguration",
      "PaymentPathReadinessGate",
      "CommercialProductionReadinessGate",
      "PublicLaunchReadinessGate",
    ]);
    expect(futurePaidVentureMustVerifyExecutablePath({
      productsExist: true,
      pricesExist: true,
      webhookExists: true,
      livePathVerified: false,
    })).toBe("BLOCKED");
    expect(evaluateCommercialProductionReadinessGate({
      offer: "PASS",
      backend: "PASS",
      security: "PASS",
      paymentPath: "FAIL",
      webhook: "PASS",
      fulfillment: "PASS",
      customerFailureUx: "PASS",
      legalCommercialTruth: "PASS",
    }).gate).toBe(COMMERCIAL_PRODUCTION_READINESS_GATE);
    expect(shouldReverifyPaymentPath("deployment")).toBe(true);
    expect(shouldReverifyPaymentPath("provider_configuration_mutation")).toBe(true);
  });
});

describe("GLOBAL_PAYMENT_PATH_ASSURANCE_V1 OccupancyNPV baseline", () => {
  it("preserves OccupancyNPV known-good live path and does not rewrite public launch", () => {
    const live = readOccupancynpvLivePaymentPathVerification();
    const path = evaluatePaymentPathReadinessGate(live);
    expect(live?.result).toBe("PASS");
    expect(path.result).toBe("PASS");
    expect(evaluateOccupancynpvFulfillmentReadiness().result).toBe("PASS");
    const launch = evaluatePublicLaunchReadinessGate();
    expect(launch.categories.PAYMENT_PATH).toBe("PASS");
    expect(launch.publiclyLaunched).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
    if (occupancynpvPubliclyLaunched()) {
      expect(launch.nextState).toBe("OCCUPANCYNPV_PUBLICLY_LAUNCHED");
    }
    persistGlobalPaymentPathAssuranceEvidence({
      qcVersion: "GLOBAL_PAYMENT_PATH_ASSURANCE_V1",
      occupancynpv: {
        founderCheckoutReview: "PASS",
        paymentPath: path.result,
        fulfillment: "PASS",
        incident: "RESOLVED",
      },
      persistedAt: new Date().toISOString(),
    });
  });
});
