import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { evaluateOccupancynpvCustomerFacingUiQc } from "./occupancynpv-customer-facing-ui-qc";
import { occupancynpvFounderCustomerUiReviewState } from "./occupancynpv-founder-customer-ui-review";
import { auditOccupancynpvArtifactLineage, occupancynpvCurrentProductionIdentity } from "./occupancynpv-artifact-lineage";
import { occupancynpvPaymentActivationEnabled } from "./occupancynpv-payment-reactivation-evidence";
import {
  evaluateOccupancynpvCommercialPolicyGates,
  evaluateOccupancynpvFulfillmentReadiness,
  evaluateOccupancynpvOfferConsistency,
  OCCUPANCYNPV_PRODUCT_TRUTH,
  OCCUPANCYNPV_SUPPORT_PATH,
} from "./occupancynpv-fulfillment";
import {
  evaluateOccupancynpvLaunchMessaging,
  readOccupancynpvLaunchMessagingEvidence,
} from "./public-launch-messaging-consistency-gate";
import type { OccupancynpvLaunchMessagingAudit } from "./occupancynpv-launch-messaging";
import { evaluatePostActivationCustomerPayment } from "./payment-activation-policy";
import { revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { occupancynpvProductProductionVerificationState } from "@/lib/infinity/occupancynpv-product/policy";
import { evaluateOccupancynpvBackendReadiness } from "@/lib/infinity/venture-backend-architecture";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "./occupancynpv-canonical-checkout";
import { OCCUPANCYNPV_STRIPE_ACCOUNT_ID } from "./constants";
import { evaluateCommercialProviderMutation } from "./commercial-provider-mutation-authority";
import { occupancynpvPubliclyLaunched } from "./occupancynpv-public-launch-evidence";
import { evaluatePaymentPathReadinessGate } from "@/lib/infinity/payment-path/readiness";
import { evaluatePaymentPathVerificationFreshnessGate } from "@/lib/infinity/payment-path/freshness";
import { readOccupancynpvLivePaymentPathVerification } from "@/lib/infinity/payment-path/from-health";
import { CRE_VENTURE_ID } from "./constants";
import { evaluateVentureImprovementIntakeReadinessGate } from "@/lib/infinity/venture-improvement-intake/readiness";

export const PUBLIC_LAUNCH_READINESS_GATE = "PublicLaunchReadinessGate" as const;

export const OCCUPANCYNPV_PUBLIC_LAUNCH_READINESS_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-public-launch-readiness.json" as const;

export {
  OCCUPANCYNPV_LAUNCH_MESSAGING_EVIDENCE_PATH,
  persistOccupancynpvLaunchMessagingEvidence,
  readOccupancynpvLaunchMessagingEvidence,
  evaluateOccupancynpvLaunchMessaging,
} from "./public-launch-messaging-consistency-gate";
export type { OccupancynpvLaunchMessagingEvidence } from "./public-launch-messaging-consistency-gate";
export type { OccupancynpvLaunchMessagingAudit };

export const OCCUPANCYNPV_PRODUCTION_ROUTE_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-production-route-evidence.json" as const;

export type LaunchCategoryResult = "PASS" | "FAIL";
export type PublicLaunchReadinessResult = "READY_FOR_PUBLIC_LAUNCH_AUTHORIZATION" | "BLOCKED";


export type OccupancynpvProductionRouteEvidence = {
  capturedAt: string;
  existingRoutes: string;
  notFound: number;
  runtimeFailures: number;
  unexpectedRedirects: number;
  missingRoutes: number;
  https: LaunchCategoryResult;
  wwwRedirect: LaunchCategoryResult;
  paidAppRoutes: LaunchCategoryResult;
  jsonLdPresent: boolean;
};

function passFail(ok: boolean): LaunchCategoryResult {
  return ok ? "PASS" : "FAIL";
}


export function readOccupancynpvProductionRouteEvidence(): OccupancynpvProductionRouteEvidence | null {
  if (!existsSync(OCCUPANCYNPV_PRODUCTION_ROUTE_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_PRODUCTION_ROUTE_EVIDENCE_PATH, "utf8")) as OccupancynpvProductionRouteEvidence;
  } catch {
    return null;
  }
}


export function evaluatePublicLaunchReadinessGate() {
  const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
  const consistency = evaluateOccupancynpvOfferConsistency();
  const policy = evaluateOccupancynpvCommercialPolicyGates();
  const verification = occupancynpvProductProductionVerificationState();
  const gutter = evaluateOccupancynpvCustomerFacingUiQc();
  const founderReview = occupancynpvFounderCustomerUiReviewState();
  const messaging = evaluateOccupancynpvLaunchMessaging();
  const routes = readOccupancynpvProductionRouteEvidence();
  const lineage = auditOccupancynpvArtifactLineage();
  const identity = occupancynpvCurrentProductionIdentity();
  const paymentYes = occupancynpvPaymentActivationEnabled();
  const checkoutAutonomy = evaluatePostActivationCustomerPayment({
    mutationClass: "CUSTOMER_CHECKOUT_EXECUTION",
    venture: "occupancynpv",
    provider: "stripe",
    resource: "checkout",
    paymentActivated: paymentYes,
  });
  const launchAuthority = evaluateCommercialProviderMutation({
    mutationClass: "PUBLIC_LAUNCH",
    venture: "occupancynpv",
    provider: "vercel",
    resource: "occupancynpv.com",
    providerIdentityVerified: true,
    providerAccountKnown: true,
    credentialScopeClear: true,
    resourceOwnershipClear: true,
    ventureOwnershipVerified: true,
    canonicalPlanExists: true,
    mutationBounded: true,
    duplicateProtected: true,
    readbackAvailable: true,
    traceabilityEnabled: true,
    riskKnown: true,
    legalIdentityClear: true,
    accountMatch: true,
  });

  const product = passFail(
    OCCUPANCYNPV_PRODUCT_TRUTH.authenticatedCustomerApplication === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.customerDashboard === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.npv === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.sensitivity === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.dealWorkspacePersistence === "BUILT"
    && verification.paid_application_deployed
    && verification.browser_verified,
  );
  const fulfillmentCat = passFail(fulfillment.result === "PASS");
  const pathVerification = readOccupancynpvLivePaymentPathVerification();
  const paymentPathGate = evaluatePaymentPathReadinessGate(pathVerification);
  const paymentPathFreshness = evaluatePaymentPathVerificationFreshnessGate({
    verification: pathVerification,
    currentFingerprint: pathVerification?.fingerprint ?? "never",
  });
  const paymentPath = occupancynpvPubliclyLaunched()
    ? passFail(paymentPathGate.result === "PASS")
    : passFail(paymentPathGate.result === "PASS" && paymentPathFreshness.result === "PASS");
  const payments = passFail(paymentYes && checkoutAutonomy.decision === "ALLOW_AUTONOMOUS" && paymentPath === "PASS");
  const legal = passFail(policy.refund === "PASS" && policy.cancellation === "PASS" && policy.professionalUsage === "PASS" && policy.failedPayment === "PASS");
  const customerExperience = passFail(gutter.result === "PASS" && founderReview.status === "PASS");
  const backend = passFail(evaluateOccupancynpvBackendReadiness().result === "PASS");
  const security = passFail(verification.tenant_isolation_production_verified && verification.production_auth_backend === "SUPABASE_AUTH");
  const production = passFail(
    routes !== null
    && routes.https === "PASS"
    && routes.wwwRedirect === "PASS"
    && routes.notFound === 0
    && routes.runtimeFailures === 0
    && routes.unexpectedRedirects === 0
    && routes.missingRoutes === 0,
  );
  const support = passFail(Boolean(OCCUPANCYNPV_SUPPORT_PATH.includes("@")));
  const observability = passFail(revenueLineageFeedsPerformanceIntelligence());
  const commercial = passFail(consistency.result === "PASS");
  const founder = passFail(founderReview.status === "PASS" && founderReview.inferred === false);
  const discoverability = passFail(Boolean(routes?.jsonLdPresent));
  const governance = passFail(launchAuthority.decision === "REQUIRE_AUTHORIZATION");
  const messagingCat = passFail(messaging.result === "PASS");
  const lineageCat = passFail(lineage.finding === "B" && lineage.composeDigestMatchesCurrent && !lineage.repairRequired);
  const improvementIntake = passFail(evaluateVentureImprovementIntakeReadinessGate({
    venture_id: CRE_VENTURE_ID,
    customer_facing: true,
  }).result === "PASS");

  const categories = {
    PRODUCT: product,
    FULFILLMENT: fulfillmentCat,
    PAYMENTS: payments,
    PAYMENT_PATH: paymentPath,
    LEGAL: legal,
    CUSTOMER_EXPERIENCE: customerExperience,
    PRODUCTION: production,
    SECURITY: security,
    BACKEND: backend,
    OBSERVABILITY: observability,
    SUPPORT: support,
    DISCOVERABILITY: discoverability,
    COMMERCIAL_CONSISTENCY: commercial,
    GOVERNANCE: governance,
    FOUNDER_REVIEW: founder,
    VALIDATION_MESSAGING: messagingCat,
    ARTIFACT_LINEAGE: lineageCat,
    IMPROVEMENT_INTAKE: improvementIntake,
  };
  const failed = Object.entries(categories).filter(([, value]) => value === "FAIL").map(([key]) => key);
  const missingEvidence: string[] = [];
  if (!readOccupancynpvLaunchMessagingEvidence()) missingEvidence.push("LAUNCH_MESSAGING_EVIDENCE");
  if (!routes) missingEvidence.push("PRODUCTION_ROUTE_EVIDENCE");
  if (founderReview.status !== "PASS") missingEvidence.push("FOUNDER_CUSTOMER_UI_REVIEW");
  if (gutter.result !== "PASS") missingEvidence.push("CUSTOMER_FACING_GUTTER_EVIDENCE");

  const result: PublicLaunchReadinessResult = failed.length === 0 && missingEvidence.length === 0
    ? "READY_FOR_PUBLIC_LAUNCH_AUTHORIZATION"
    : "BLOCKED";

  return {
    gate: PUBLIC_LAUNCH_READINESS_GATE,
    result,
    publiclyLaunched: occupancynpvPubliclyLaunched() ? "YES" as const : "NO" as const,
    categories,
    failed,
    missingEvidence,
    productTruth: OCCUPANCYNPV_PRODUCT_TRUTH,
    fulfillment,
    consistency,
    policy,
    gutter,
    founderReview,
    messaging,
    routes,
    lineage,
    identity,
    stripe: {
      account: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
      professional: `$${(OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.amount / 100)}/year`,
      perDeal: `$${(OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.amount / 100)}/deal`,
      paymentActivation: paymentYes ? "YES" as const : "NO" as const,
      checkoutAutonomy: checkoutAutonomy.decision,
      paymentPath: paymentPathGate.result,
      paymentPathFreshness: paymentPathFreshness.result,
    },
    paymentPath: paymentPathGate,
    support: OCCUPANCYNPV_SUPPORT_PATH,
    launchAuthority: launchAuthority.decision === "REQUIRE_AUTHORIZATION"
      ? "FOUNDER_APPROVAL_REQUIRED" as const
      : launchAuthority.decision,
    pendingFounderAction: occupancynpvPubliclyLaunched()
      ? "OCCUPANCYNPV_POST_LAUNCH_AUTONOMOUS_OPERATIONS"
      : messagingCat === "FAIL"
        ? "OCCUPANCYNPV_PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_REPAIR"
        : "OCCUPANCYNPV_PUBLIC_LAUNCH_AUTHORIZATION",
    nextState: occupancynpvPubliclyLaunched()
      ? "OCCUPANCYNPV_PUBLICLY_LAUNCHED" as const
      : result === "READY_FOR_PUBLIC_LAUNCH_AUTHORIZATION"
        ? "OCCUPANCYNPV_READY_FOR_PUBLIC_LAUNCH_AUTHORIZATION" as const
        : messagingCat === "FAIL"
          ? "OCCUPANCYNPV_LAUNCH_REPAIR_REQUIRED" as const
          : "OCCUPANCYNPV_PUBLIC_LAUNCH_BLOCKED" as const,
    writes: {
      stripeWrites: 0 as const,
      paymentActivationChanges: 0 as const,
      searchSubmissions: 0 as const,
      outreach: 0 as const,
      publicLaunch: 0 as const,
    },
  };
}

export function persistOccupancynpvPublicLaunchReadiness(
  evaluation = evaluatePublicLaunchReadinessGate(),
) {
  mkdirSync(dirname(OCCUPANCYNPV_PUBLIC_LAUNCH_READINESS_EVIDENCE_PATH), { recursive: true });
  const slim = {
    gate: evaluation.gate,
    result: evaluation.result,
    publiclyLaunched: evaluation.publiclyLaunched,
    categories: evaluation.categories,
    failed: evaluation.failed,
    missingEvidence: evaluation.missingEvidence,
    identity: evaluation.identity,
    launchAuthority: evaluation.launchAuthority,
    pendingFounderAction: evaluation.pendingFounderAction,
    nextState: evaluation.nextState,
    writes: evaluation.writes,
    evaluatedAt: new Date().toISOString(),
  };
  writeFileSync(OCCUPANCYNPV_PUBLIC_LAUNCH_READINESS_EVIDENCE_PATH, `${JSON.stringify(slim, null, 2)}\n`);
  return evaluation;
}
