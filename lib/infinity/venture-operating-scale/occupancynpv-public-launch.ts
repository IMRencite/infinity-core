import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { CRE_VENTURE_ID } from "./constants";
import { occupancynpvCurrentProductionIdentity } from "./occupancynpv-artifact-lineage";
import {
  evaluateOccupancynpvFulfillmentReadiness,
  occupancynpvClearedCommercializationBlockers,
  occupancynpvCommercializationBlockers,
  OCCUPANCYNPV_PRODUCT_TRUTH,
} from "./occupancynpv-fulfillment";
import {
  buildOccupancynpvDurableAuthorityState,
  persistOccupancynpvDurableAuthority,
  readOccupancynpvDurableAuthority,
} from "./occupancynpv-durable-authority";
import { occupancynpvPaymentActivationEnabled } from "./occupancynpv-payment-reactivation-evidence";
import {
  OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORITY,
  OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORIZED,
  OCCUPANCYNPV_LAUNCH_PERFORMANCE_BASELINE_PATH,
  OCCUPANCYNPV_PUBLIC_LAUNCH_EVENT_PATH,
  OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION,
  occupancynpvPubliclyLaunched,
  persistOccupancynpvPublicLaunchEvidence,
  readOccupancynpvPublicLaunchEvidence,
  type OccupancynpvPublicLaunchEvidence,
} from "./occupancynpv-public-launch-evidence";
import { evaluatePublicLaunchReadinessGate, persistOccupancynpvPublicLaunchReadiness } from "./occupancynpv-public-launch-readiness";
import { evaluatePostActivationCustomerPayment } from "./payment-activation-policy";
import { runDailyVentureOperatingCycle } from "./operations";
import { backfillCreVentureOperationalRecord } from "./record";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "./occupancynpv-canonical-checkout";

export const OCCUPANCYNPV_PUBLIC_LAUNCH_EXECUTION_V1 = "OCCUPANCYNPV_PUBLIC_LAUNCH_EXECUTION_V1" as const;

const STALE_LAUNCH = /if the product is built|not a finished product|not generally available|payment is not collected|this site does not collect payment(?! card)|validation-stage|proposed early-access \/ pilot concept/i;

async function fetchText(url: string, redirect: RequestRedirect = "follow") {
  const res = await fetch(url, { redirect });
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

function persistOccupancynpvLaunchProjection(input: {
  launchedAt: string;
  identity: { artifactId: string; digest: string; deploymentId: string };
}) {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  writeVentureOperationalRecord({
    ...existing,
    operating_stage: "OPERATING",
    commercialization_state: "PUBLICLY_LAUNCHED",
    public_launch_state: "YES",
    deployment_state: "PUBLICLY_LAUNCHED",
    revenue_state: "PAYMENT_ACTIVATED",
    checkout_state: "ACTIVATED",
    fulfillment_state: "FULFILLMENT_READY",
    acquisition_state: "ACTIVE",
    optimization_state: "OBSERVING",
    indexability_state: "PUBLIC_INDEXABLE",
    robots_state: "ALLOW_PUBLIC",
    sitemap_url: "https://occupancynpv.com/sitemap.xml",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    latest_learning_decision: "OCCUPANCYNPV_PUBLICLY_LAUNCHED",
    blocked_actions: occupancynpvCommercializationBlockers(),
    active_artifact: input.identity.artifactId,
    active_artifact_digest: input.identity.digest,
    active_deployment: input.identity.deploymentId,
  });
  const prior = readOccupancynpvDurableAuthority() ?? buildOccupancynpvDurableAuthorityState(input.launchedAt);
  persistOccupancynpvDurableAuthority({
    ...prior,
    publicly_launched: "YES",
    payment_activation: "YES",
    payment_activation_policy: "AUTONOMOUS_WITHIN_POLICY",
    activation_status: "PAYMENT_REACTIVATED",
    fulfillment_readiness_gate: "PASS",
    remaining_blockers: occupancynpvCommercializationBlockers(),
    unclaimed_authority: prior.unclaimed_authority.filter(
      (row) => row !== "PUBLIC_LAUNCH" && row !== "PAYMENT_ACTIVATION",
    ),
  });
  persistOccupancynpvPublicLaunchReadiness();
}

export async function executeOccupancynpvPublicLaunch(input: {
  persist?: boolean;
  liveVerify?: boolean;
} = {}) {
  const persist = input.persist !== false;
  const launchedAt = new Date().toISOString();
  const identity = occupancynpvCurrentProductionIdentity();
  const readiness = persistOccupancynpvPublicLaunchReadiness();
  const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
  const clock = inspectExperimentClock();
  const paymentYes = occupancynpvPaymentActivationEnabled();
  const founderAuth = OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORIZED === true;
  const productTruth =
    OCCUPANCYNPV_PRODUCT_TRUTH.authenticatedCustomerApplication === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.customerDashboard === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.dealWorkspacePersistence === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.npv === "BUILT"
    && OCCUPANCYNPV_PRODUCT_TRUTH.sensitivity === "BUILT";
  const commercialTruth =
    OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.amount === 29000
    && OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.amount === 14900;
  const checkoutAutonomy = evaluatePostActivationCustomerPayment({
    mutationClass: "CUSTOMER_CHECKOUT_EXECUTION",
    venture: "occupancynpv",
    provider: "stripe",
    resource: "checkout",
    paymentActivated: paymentYes,
  });
  const fulfillmentAutonomy = evaluatePostActivationCustomerPayment({
    mutationClass: "CUSTOMER_CHECKOUT_EXECUTION",
    venture: "occupancynpv",
    provider: "stripe",
    resource: "fulfillment",
    paymentActivated: paymentYes,
  });

  let live = {
    checkout: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    robots: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    sitemap: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    https: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    wwwRedirect: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    earlyAccessCompatible: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    homepage: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    pricing: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    terms: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    privacy: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
    login: "UNAVAILABLE" as "PASS" | "FAIL" | "UNAVAILABLE",
  };
  if (input.liveVerify !== false) {
    const home = await fetchText("https://occupancynpv.com/");
    const pricing = await fetchText("https://occupancynpv.com/pricing");
    const early = await fetchText("https://occupancynpv.com/early-access");
    const terms = await fetchText("https://occupancynpv.com/terms-of-service");
    const privacy = await fetchText("https://occupancynpv.com/privacy-policy");
    const login = await fetchText("https://occupancynpv.com/occupancynpv/app/login");
    const robots = await fetchText("https://occupancynpv.com/robots.txt");
    const sitemap = await fetchText("https://occupancynpv.com/sitemap.xml");
    const checkout = await fetch("https://occupancynpv.com/api/checkout/start").then(async (res) => ({
      status: res.status,
      json: await res.json().catch(() => ({})),
    }));
    const www = await fetch("https://www.occupancynpv.com/", { redirect: "manual" });
    live = {
      checkout: checkout.status === 200 && checkout.json.activated === true && checkout.json.fulfillment === "PASS" ? "PASS" : "FAIL",
      robots: /Allow:\s*\//i.test(robots.body) && !/noindex/i.test(robots.body) ? "PASS" : "FAIL",
      sitemap: sitemap.status === 200 && /<urlset/i.test(sitemap.body) ? "PASS" : "FAIL",
      https: home.status === 200 ? "PASS" : "FAIL",
      wwwRedirect: www.status === 307 && (www.headers.get("location") ?? "").startsWith("https://occupancynpv.com") ? "PASS" : "FAIL",
      earlyAccessCompatible: early.status === 200 && !STALE_LAUNCH.test(early.body) ? "PASS" : "FAIL",
      homepage: home.status === 200 && !STALE_LAUNCH.test(home.body) ? "PASS" : "FAIL",
      pricing: pricing.status === 200 && pricing.body.includes("$290") && pricing.body.includes("$149") && !STALE_LAUNCH.test(pricing.body) ? "PASS" : "FAIL",
      terms: terms.status === 200 && /Infinite Media Resources LLC/.test(terms.body) && !STALE_LAUNCH.test(terms.body) ? "PASS" : "FAIL",
      privacy: privacy.status === 200 && /Infinite Media Resources LLC/.test(privacy.body) ? "PASS" : "FAIL",
      login: login.status === 200 ? "PASS" : "FAIL",
    };
  }

  const liveFailed = Object.values(live).some((row) => row === "FAIL");
  const ready =
    founderAuth
    && readiness.result === "READY_FOR_PUBLIC_LAUNCH_AUTHORIZATION"
    && readiness.failed.length === 0
    && fulfillment.result === "PASS"
    && paymentYes
    && productTruth
    && commercialTruth
    && checkoutAutonomy.decision === "ALLOW_AUTONOMOUS"
    && !liveFailed;

  const alreadyLaunched = occupancynpvPubliclyLaunched();
  if (!ready && !alreadyLaunched) {
    return {
      attempted: true,
      succeeded: false,
      nextState: "OCCUPANCYNPV_PUBLIC_LAUNCH_BLOCKED" as const,
      launchTimestamp: null,
      publiclyLaunched: "NO" as const,
      readiness,
      live,
      writes: {
        stripeProductsCreated: 0 as const,
        stripePricesCreated: 0 as const,
        priceChanges: 0 as const,
        manualCustomers: 0 as const,
        manualCharges: 0 as const,
        dnsWrites: 0 as const,
        searchSubmissions: 0 as const,
        outreachMessages: 0 as const,
        paidMediaSpend: 0 as const,
        publicLaunchTransitions: 0 as const,
      },
    };
  }

  if (alreadyLaunched) {
    const existing = readOccupancynpvPublicLaunchEvidence();
    if (persist) {
      persistOccupancynpvLaunchProjection({
        launchedAt: existing?.launched_at ?? launchedAt,
        identity,
      });
    }
    const daily = persist ? runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 }) : null;
    return {
      attempted: persist,
      succeeded: true,
      nextState: "OCCUPANCYNPV_PUBLICLY_LAUNCHED" as const,
      nextAction: "OCCUPANCYNPV_POST_LAUNCH_AUTONOMOUS_OPERATIONS" as const,
      launchTimestamp: existing?.launched_at ?? null,
      publiclyLaunched: "YES" as const,
      launchEvent: existing ? `evt_occupancynpv_public_launch_${String(existing.launched_at).slice(0, 10).replace(/-/g, "")}` : null,
      launchAuthority: OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORITY,
      policyVersion: OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION,
      identity,
      readiness,
      live,
      fulfillment,
      checkoutAutonomy: checkoutAutonomy.decision,
      fulfillmentAutonomy: fulfillmentAutonomy.decision,
      searchDiscovery: existing?.search_discovery ?? "SEARCH_PROVIDER_CONFIGURATION_REQUIRED",
      organic: existing?.organic ?? "ACTIVE",
      outreach: existing?.outreach ?? "OBSERVING",
      creativeMedia: existing?.creative_media ?? "OBSERVING",
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      experimentClockRestarted: clock.restarted,
      dailyCycle: daily?.snapshot.dailyResult === "NO_ACTION_REQUIRED" || !daily ? "ACTIVE" as const : "READY" as const,
      commercialization: {
        cleared: occupancynpvClearedCommercializationBlockers(),
        remaining: occupancynpvCommercializationBlockers(),
      },
      writes: {
        stripeProductsCreated: 0 as const,
        stripePricesCreated: 0 as const,
        priceChanges: 0 as const,
        manualCustomers: 0 as const,
        manualCharges: 0 as const,
        dnsWrites: 0 as const,
        searchSubmissions: 0 as const,
        outreachMessages: 0 as const,
        paidMediaSpend: 0 as const,
        publicLaunchTransitions: 0 as const,
      },
    };
  }

  const evidence: OccupancynpvPublicLaunchEvidence = {
    founder_authorization: true,
    authority: OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORITY,
    publicly_launched: "YES",
    launched_at: launchedAt,
    policy_version: OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION,
    production_url: "https://occupancynpv.com",
    artifact_id: identity.artifactId,
    digest: identity.digest,
    deployment_id: identity.deploymentId,
    experiment_id: LOCKED_CRE_EXPERIMENT_ID,
    search_discovery: "SEARCH_PROVIDER_CONFIGURATION_REQUIRED",
    organic: "ACTIVE",
    outreach: "OBSERVING",
    creative_media: "OBSERVING",
  };

  const launchEvent = {
    event_id: `evt_occupancynpv_public_launch_${launchedAt.slice(0, 10).replace(/-/g, "")}`,
    venture: "OccupancyNPV",
    venture_id: CRE_VENTURE_ID,
    launched_at: launchedAt,
    domain: "occupancynpv.com",
    production_url: "https://occupancynpv.com",
    artifact_id: identity.artifactId,
    digest: identity.digest,
    deployment_id: identity.deploymentId,
    payment_activation: "YES" as const,
    fulfillment: fulfillment.result,
    founder_authorization: OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORITY,
    policy_version: OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION,
    experiment_id: LOCKED_CRE_EXPERIMENT_ID,
    experiment_clock_restarted: clock.restarted,
    readiness_result: readiness.result,
    traceability_id: `trl_occupancynpv_public_launch_${identity.deploymentId}`,
  };

  const baseline = {
    launch_timestamp: launchedAt,
    venture: "OccupancyNPV",
    observations: 0,
    fabricated_observations: 0,
    metrics: [
      "traffic",
      "source_channel",
      "pricing_views",
      "checkout_starts",
      "checkout_completion",
      "payments",
      "revenue",
      "subscriptions",
      "entitlements",
      "fulfillment_completion",
      "fulfillment_failures",
      "workspace_creation",
      "workspace_usage",
      "scenario_completion",
      "orphaned_paid_customers",
      "support_recovery_issues",
    ],
    initial_values: "ZERO_VALID",
  };

  if (!persist) {
    return {
      attempted: false,
      succeeded: occupancynpvPubliclyLaunched(),
      nextState: ready ? "OCCUPANCYNPV_READY_FOR_PUBLIC_LAUNCH_AUTHORIZATION" as const : "OCCUPANCYNPV_PUBLIC_LAUNCH_BLOCKED" as const,
      launchTimestamp: null,
      publiclyLaunched: occupancynpvPubliclyLaunched() ? "YES" as const : "NO" as const,
      readiness,
      live,
      writes: {
        stripeProductsCreated: 0 as const,
        stripePricesCreated: 0 as const,
        priceChanges: 0 as const,
        manualCustomers: 0 as const,
        manualCharges: 0 as const,
        dnsWrites: 0 as const,
        searchSubmissions: 0 as const,
        outreachMessages: 0 as const,
        paidMediaSpend: 0 as const,
        publicLaunchTransitions: 0 as const,
      },
    };
  }

  if (persist) {
    persistOccupancynpvPublicLaunchEvidence(evidence);
    mkdirSync(dirname(OCCUPANCYNPV_PUBLIC_LAUNCH_EVENT_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_PUBLIC_LAUNCH_EVENT_PATH, `${JSON.stringify(launchEvent, null, 2)}\n`);
    mkdirSync(dirname(OCCUPANCYNPV_LAUNCH_PERFORMANCE_BASELINE_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_LAUNCH_PERFORMANCE_BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
    persistOccupancynpvLaunchProjection({ launchedAt, identity });
  }

  const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });

  return {
    attempted: true,
    succeeded: true,
    nextState: "OCCUPANCYNPV_PUBLICLY_LAUNCHED" as const,
    nextAction: "OCCUPANCYNPV_POST_LAUNCH_AUTONOMOUS_OPERATIONS" as const,
    launchTimestamp: launchedAt,
    publiclyLaunched: "YES" as const,
    launchEvent: launchEvent.event_id,
    launchAuthority: OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORITY,
    policyVersion: OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION,
    identity,
    readiness,
    live,
    fulfillment,
    checkoutAutonomy: checkoutAutonomy.decision,
    fulfillmentAutonomy: fulfillmentAutonomy.decision,
    searchDiscovery: evidence.search_discovery,
    organic: evidence.organic,
    outreach: evidence.outreach,
    creativeMedia: evidence.creative_media,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    experimentClockRestarted: clock.restarted,
    dailyCycle: daily.snapshot.dailyResult === "NO_ACTION_REQUIRED" ? "ACTIVE" as const : "READY" as const,
    dailyResult: daily.snapshot.dailyResult,
    baseline,
    commercialization: {
      cleared: occupancynpvClearedCommercializationBlockers(),
      remaining: occupancynpvCommercializationBlockers(),
    },
    writes: {
      stripeProductsCreated: 0 as const,
      stripePricesCreated: 0 as const,
      priceChanges: 0 as const,
      manualCustomers: 0 as const,
      manualCharges: 0 as const,
      dnsWrites: 0 as const,
      searchSubmissions: 0 as const,
      outreachMessages: 0 as const,
      paidMediaSpend: 0 as const,
      publicLaunchTransitions: 1 as const,
    },
  };
}
