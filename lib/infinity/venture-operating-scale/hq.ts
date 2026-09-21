import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { projectPortfolioActualEconomics } from "@/lib/infinity/financial-truth/portfolio-actual-economics";
import { displayMoney } from "@/lib/infinity/financial-truth/amounts";
import { readOccupancynpvDurableAuthority } from "./occupancynpv-durable-authority";
import { evaluateOccupancynpvFulfillmentReadiness, occupancynpvCommercializationBlockers } from "./occupancynpv-fulfillment";
import { occupancynpvPaymentActivationEnabled } from "./occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched, readOccupancynpvPublicLaunchEvidence } from "./occupancynpv-public-launch-evidence";
import { resolveCanonicalSelectedVenture } from "@/lib/infinity/capability-truth/selected-venture";
import { CRE_VENTURE_ID } from "./constants";
import { listVentureOperationalRecords } from "./persist";
import { inspectProviderCapabilityMatrix } from "./provider-matrix";
import { evaluateVentureCommercializationReadiness } from "./readiness";
import type { VentureOperatingScaleHqProjection } from "./types";

export function projectVentureOperatingScaleHq(input: {
  latestCompletedMission?: string | null;
} = {}): VentureOperatingScaleHqProjection {
  const records = listVentureOperationalRecords();
  const cre = records.find((row) => row.venture_id === CRE_VENTURE_ID) ?? records.find((row) => row.venture_id.includes("7e7e924e")) ?? null;
  const observer = inspectMailboxObserverHealth();
  const authority = readOccupancynpvDurableAuthority();
  const paymentActivated = occupancynpvPaymentActivationEnabled() || authority?.payment_activation === "YES" || cre?.revenue_state === "PAYMENT_ACTIVATED";
  const remaining = cre ? occupancynpvCommercializationBlockers() : authority?.remaining_blockers ?? [];
  const fulfillmentReady = evaluateOccupancynpvFulfillmentReadiness().result;
  const launched = occupancynpvPubliclyLaunched() || authority?.publicly_launched === "YES";
  const economics = projectPortfolioActualEconomics();
  const observerAgeMs = observer.lastSuccessfulObservation ? Date.now() - Date.parse(observer.lastSuccessfulObservation) : null;
  const communicationState =
    observer.status === "DEGRADED" && observerAgeMs != null && observerAgeMs > 6 * 60 * 60 * 1000
      ? "STALE"
      : observer.status;
  const commercializationReadiness = launched
    ? "PUBLICLY_LAUNCHED"
    : cre
      ? evaluateVentureCommercializationReadiness(cre).result
      : "NOT_READY";
  const stripeReady = paymentActivated || (cre?.payment_provider === "stripe" && cre.payment_products.length > 0);
  return {
    portfolioStatus: records.length ? "ACTIVE_VALIDATION_PORTFOLIO" : "EMPTY",
    activeVentures: records.filter((row) => row.venture_status === "ACTIVE").length,
    operatingVentures: records.filter((row) => row.operating_stage === "OPERATING").length,
    validationVentures: records.filter((row) => row.operating_stage === "VALIDATING").length,
    pausedVentures: records.filter((row) => row.venture_status === "PAUSED" || row.operating_stage === "PAUSED").length,
    commercializationReadiness,
    commercializationScope: "VENTURE:OccupancyNPV",
    revenueState: displayMoney(economics.lifetime_gross_revenue),
    activeExperiments: records
      .map((row) => row.current_experiment)
      .filter((row): row is string => row !== "UNCONFIGURED"),
    communicationState,
    providerHealth: inspectProviderCapabilityMatrix(),
    blockedActions: cre?.blocked_actions ?? [],
    latestLearning:
      cre?.latest_learning_decision && cre.latest_learning_decision !== "UNCONFIGURED"
        ? cre.latest_learning_decision
        : "NONE YET",
    selectedVentureLabel: resolveCanonicalSelectedVenture({}).venture_name,
    latestCompletedMission: input.latestCompletedMission ?? null,
    authorityVisibility: {
      mutationClass: authority?.demonstrated_routine_classes[0] ?? null,
      decision: authority ? "ALLOW_AUTONOMOUS" : null,
      authoritySource: authority?.policy_version ?? null,
      riskState: cre?.risk_state ?? null,
      financialExposure: authority ? "NONE" : null,
      founderActionRequired: remaining.length > 0,
      mutationPolicy: authority?.provider_mutation_policy ?? "UNCONFIGURED",
      paymentActivationPolicy: paymentActivated ? "AUTONOMOUS_WITHIN_POLICY" : (authority?.payment_activation_policy ?? "FOUNDER_APPROVAL_REQUIRED"),
      paymentActivation: paymentActivated ? "YES" : "NO",
      paymentInfrastructure: stripeReady ? "LIVE" : "UNCONFIGURED",
      paymentActivationState: paymentActivated ? "YES" : "BLOCKED",
      fulfillment: fulfillmentReady === "PASS" || cre?.fulfillment_state === "FULFILLMENT_READY" ? "PASS" : "REQUIRED",
      fulfillmentReadiness: fulfillmentReady,
      offerContracts: ["PROFESSIONAL", "PER_DEAL"],
      activeEntitlements: 0,
      fulfillmentFailures: 0,
      recoveryQueue: 0,
      publicLaunchState: occupancynpvPubliclyLaunched() || cre?.public_launch_state === "YES" ? "YES" : "BLOCKED",
      orphanedPaidCustomerCount: authority?.orphaned_paid_customer_count ?? 0,
      highPriorityIssue:
        (authority?.orphaned_paid_customer_count ?? 0) > 0 ? "HIGH_PRIORITY" : null,
      publicLaunch: occupancynpvPubliclyLaunched() || cre?.public_launch_state === "YES" || authority?.publicly_launched === "YES" ? "YES" : "NO",
      launchedAt: readOccupancynpvPublicLaunchEvidence()?.launched_at ?? null,
      founderLaunchAuthorization: occupancynpvPubliclyLaunched() ? "Founder-authorized public launch" : null,
      remainingBlockers: remaining,
      hqDecides: false,
    },
  };
}
