import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "../occupancynpv-payment-reactivation-surface";
import { applyOccupancynpvLaunchMessagingRepair } from "../occupancynpv-launch-messaging-repair";
import { evaluateOccupancynpvComposedLifecycleMessaging } from "../occupancynpv-lifecycle-messaging-sweep";
import {
  evaluateLifecycleContentInvalidation,
  evaluatePublicLaunchMessagingConsistencyGate,
  occupancynpvCurrentLifecycleContentState,
  PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_GATE,
  requiredLifecycleContentTransitions,
} from "../public-launch-messaging-consistency-gate";
import { occupancynpvPrivacyPolicyPageSource, occupancynpvTermsOfServicePageSource } from "@/lib/infinity/venture-website-architecture/occupancynpv-legal-surface-pages";

const STALE = /if the product is built|not a finished product|not generally available|payment is not collected|this site does not collect payment(?! card)|validation-stage|proposed early-access \/ pilot concept/i;

describe("OCCUPANCYNPV_PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_V1", () => {
  it("fails PRODUCT_BUILT plus if-the-product-is-built copy", () => {
    const result = evaluatePublicLaunchMessagingConsistencyGate({
      lifecycle: { productBuilt: true, paymentActive: false, fulfillmentReady: false, publiclyLaunched: false },
      pages: [{ route: "/pricing", html: "Join the waitlist if the product is built." }],
      revalidation: { transitions: ["PRODUCT_NOT_BUILT → PRODUCT_BUILT"], revalidatedAt: "2026-09-08T00:00:00.000Z" },
    });
    expect(result.gate).toBe(PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_GATE);
    expect(result.result).toBe("FAIL");
    expect(result.notBuiltClaims.join(" ")).toMatch(/if the product is built/i);
  });

  it("fails PAYMENT_ACTIVE plus payment-is-not-collected copy", () => {
    const result = evaluatePublicLaunchMessagingConsistencyGate({
      lifecycle: { productBuilt: true, paymentActive: true, fulfillmentReady: true, publiclyLaunched: false, stage: "PRE_LAUNCH" },
      pages: [{ route: "/", html: "Payment is not collected on this site." }],
      revalidation: {
        transitions: requiredLifecycleContentTransitions({
          productBuilt: true,
          paymentActive: true,
          fulfillmentReady: true,
          publiclyLaunched: false,
        }),
        revalidatedAt: "2026-09-08T00:00:00.000Z",
      },
    });
    expect(result.result).toBe("FAIL");
    expect(result.noPaymentClaims.length).toBeGreaterThan(0);
  });

  it("fails FULFILLMENT_READY plus contradictory product-not-available copy", () => {
    const result = evaluatePublicLaunchMessagingConsistencyGate({
      lifecycle: { productBuilt: true, paymentActive: true, fulfillmentReady: true, publiclyLaunched: false },
      pages: [{ route: "/faq", html: "The product is not available." }],
      revalidation: {
        transitions: requiredLifecycleContentTransitions({
          productBuilt: true,
          paymentActive: true,
          fulfillmentReady: true,
          publiclyLaunched: false,
        }),
        revalidatedAt: "2026-09-08T00:00:00.000Z",
      },
    });
    expect(result.result).toBe("FAIL");
  });

  it("passes VALIDATION_STAGE truthful pilot copy", () => {
    const result = evaluatePublicLaunchMessagingConsistencyGate({
      lifecycle: { productBuilt: false, paymentActive: false, fulfillmentReady: false, publiclyLaunched: false, stage: "VALIDATION_STAGE" },
      pages: [{ route: "/", html: "This is a validation / pilot concept and is not generally available." }],
      revalidation: { transitions: [], revalidatedAt: "2026-09-08T00:00:00.000Z" },
    });
    expect(result.result).toBe("PASS");
    expect(result.findings.some((row) => row.classification === "ALLOWED_VALIDATION_COPY")).toBe(true);
  });

  it("passes PRE_LAUNCH real product wording and does not require unavailable language when PUBLICLY_LAUNCHED is NO", () => {
    const result = evaluatePublicLaunchMessagingConsistencyGate({
      lifecycle: occupancynpvCurrentLifecycleContentState(),
      pages: [{
        route: "/",
        html: "OccupancyNPV is a live lease comparison and NPV workspace. Checkout is available for Professional and Per-Deal. Public rollout remains controlled.",
      }],
      revalidation: {
        transitions: requiredLifecycleContentTransitions(occupancynpvCurrentLifecycleContentState()),
        revalidatedAt: "2026-09-08T00:00:00.000Z",
      },
    });
    expect(result.result).toBe("PASS");
    expect(result.publiclyLaunchedDoesNotRequireUnavailableLanguage).toBe(true);
    expect(result.missingRevalidationEvidence).toBe(false);
  });

  it("fails missing revalidation evidence after a material lifecycle change", () => {
    const lifecycle = {
      productBuilt: true,
      paymentActive: true,
      fulfillmentReady: true,
      publiclyLaunched: false,
    };
    const result = evaluateLifecycleContentInvalidation({
      lifecycle,
      revalidation: null,
    });
    expect(result.result).toBe("FAIL");
    expect(result.missingRevalidationEvidence).toBe(true);
    expect(result.covered["PRODUCT_NOT_BUILT → PRODUCT_BUILT"]).toBe("FAIL");
    expect(result.covered["PAYMENT_DISABLED → PAYMENT_ACTIVE"]).toBe("FAIL");
    expect(result.covered["FULFILLMENT_MISSING → FULFILLMENT_READY"]).toBe("FAIL");
    expect(result.covered["PILOT_ONLY → GENERAL_AVAILABILITY_READY"]).toBe("FAIL");
  });

  it("fails PUBLICLY_LAUNCHED plus current-offer hypothesis language", () => {
    const result = evaluatePublicLaunchMessagingConsistencyGate({
      lifecycle: { productBuilt: true, paymentActive: true, fulfillmentReady: true, publiclyLaunched: true, stage: "PUBLICLY_LAUNCHED" },
      pages: [{ route: "/pricing", html: "Two hypotheses are being tested: $290 per year. The hypothesis includes access to the proposed cash-flow compare." }],
      revalidation: {
        transitions: requiredLifecycleContentTransitions({
          productBuilt: true,
          paymentActive: true,
          fulfillmentReady: true,
          publiclyLaunched: true,
        }),
        revalidatedAt: "2026-09-08T00:00:00.000Z",
      },
    });
    expect(result.result).toBe("FAIL");
    expect(result.launchBlockingPilotContradictions.join(" ")).toMatch(/hypothesis|proposed cash-flow/i);
  });

  it("repairs composed OccupancyNPV public files and legal sources", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const publicFiles = composed.files.filter((file) => {
      const path = file.path.replace(/\\/g, "/");
      return path.endsWith("page.tsx") && !path.startsWith("app/occupancynpv/") && !path.startsWith("app/api/");
    });
    expect(publicFiles.length).toBeGreaterThan(10);
    for (const file of publicFiles) {
      expect(file.content, file.path).not.toMatch(STALE);
    }
    expect(applyOccupancynpvLaunchMessagingRepair(applyOccupancynpvLaunchMessagingRepair("Payment is not collected."))).toContain("Live checkout");
    expect(occupancynpvTermsOfServicePageSource()).not.toMatch(STALE);
    expect(occupancynpvTermsOfServicePageSource()).toContain("one authenticated user");
    expect(occupancynpvTermsOfServicePageSource()).toContain("within 7 calendar days of the initial purchase");
    expect(occupancynpvPrivacyPolicyPageSource()).toContain("customer account");
    expect(occupancynpvPrivacyPolicyPageSource()).not.toMatch(/this page does not create user accounts/i);
    const how = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/how-it-works/page.tsx")?.content ?? "";
    expect(how).toContain("How OccupancyNPV works today");
    expect(how).toContain("Create a DealWorkspace");
    const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
    expect(pricing).toContain("$290");
    expect(pricing).toContain("$149");
    expect(pricing).toContain("/api/checkout/start");
    expect(pricing).not.toMatch(/\bhypothes(?:is|es)\b/i);
    expect(pricing).not.toMatch(/being tested/i);
    expect(pricing).not.toMatch(/proposed cash-flow/i);
    expect(pricing).toMatch(/Professional is \$290 per year/);
    expect(pricing).toMatch(/Per-Deal is \$149/);
    expect(pricing).toContain("Start Professional");
    expect(pricing).toContain("Start One Deal");
    expect(pricing).toContain("data-pricing-architecture");
    expect(pricing).toContain("data-promotional-offer=\"THREE_DAY_NO_CARD_TRIAL\"");
    expect(pricing).toContain("Start Free Trial");
    expect(pricing).not.toContain("data-offer-block");
    expect(pricing).not.toContain("Primary offer · paid-first");
    expect(pricing).not.toMatch(/entitlement remains ACTIVE/i);
    const sweep = evaluateOccupancynpvComposedLifecycleMessaging();
    expect(sweep.routesScanned).toBeGreaterThanOrEqual(93);
    expect(sweep.remainingContradictions).toBe(0);
  });
});
