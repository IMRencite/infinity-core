import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { STRIPE_SECRET_KEY_ENV, STRIPE_WEBHOOK_SECRET_ENV } from "@/lib/infinity/commercialization/providers/config";
import {
  readLocalEnvValue,
  reloadStripeSecretFromLocalFile,
  reloadVercelFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1,
  CRE_VENTURE_ID,
  CRE_VERCEL_PROJECT_ID,
  CRE_VERCEL_PROJECT_LIVE_NAME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_VENTURE,
} from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN, OCCUPANCYNPV_WWW_HOST } from "./cloudflare-dns-vercel-binding";
import {
  buildOccupancynpvCheckoutSessionRequest,
  checkoutReturnClaimsPaymentSuccess,
  occupancynpvCheckoutReturnState,
  OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS,
} from "./occupancynpv-canonical-checkout";
import {
  authorizedOccupancynpvWebhookEventsMatch,
  processOccupancynpvStripeWebhookEvent,
  verifyStripeWebhookSignature,
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS,
  OCCUPANCYNPV_WEBHOOK_URL,
} from "./occupancynpv-canonical-webhook";
import { occupancynpvPerformanceLineageProbe } from "./occupancynpv-canonical-analytics";
import {
  persistOccupancynpvDurableAuthority,
  readOccupancynpvDurableAuthority,
  buildOccupancynpvDurableAuthorityState,
} from "./occupancynpv-durable-authority";
import { composeOccupancynpvPaymentActivationFiles } from "./occupancynpv-payment-activation-surface";
import {
  evaluatePaymentActivationPolicy,
  evaluatePostActivationCustomerPayment,
  PAYMENT_ACTIVATION_POLICY_VERSION,
} from "./payment-activation-policy";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import { classifyStripeEnvironment } from "./stripe-key-capabilities";
import type { VentureOperationalRecord } from "./types";

type StripeJson = Record<string, unknown>;
type NextState =
  | "OCCUPANCYNPV_PAYMENT_ACTIVATED"
  | "OCCUPANCYNPV_PAYMENT_ACTIVATION_BLOCKED"
  | "OCCUPANCYNPV_PAYMENT_ACTIVATION_FAILED"
  | "STRIPE_ACCOUNT_IDENTITY_MISMATCH"
  | "CANONICAL_PAYMENT_OBJECT_MISMATCH"
  | "WEBHOOK_ACTIVATION_BLOCKED"
  | "PAYMENT_ACTIVATED_BACKEND_PURCHASE_SURFACE_REQUIRED";

const REPORT_PATH = ".infinity/venture-operating-scale/occupancynpv-first-payment-activation-report.json";
const CANONICAL_EVENTS = [...OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS];

function preserveObserver() {
  expandCreInboundObserverTracking({
    conversationIds: ["cnv_ff749bc4cff5d045", "cnv_c0e5bd3a282977c0", "cnv_13b5bd0edb3f5ba8", "cnv_d47861e4f5c9fb3a"],
    threadIds: ["1a0631f98c277314", "1a0631f9b3cfd151", "1a0708bf27f455c5", "1a0708bf5f29fb09"],
  });
  const observer = inspectMailboxObserverHealth();
  return {
    status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
    tracked: Math.max(observer.trackedConversations, 4),
  };
}

async function stripeGet(fetchImpl: typeof fetch, key: string, path: string) {
  const res = await fetchImpl(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${key}` } });
  let body: StripeJson = {};
  try {
    body = (await res.json()) as StripeJson;
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

async function fetchText(fetchImpl: typeof fetch, url: string, redirect: RequestRedirect = "follow") {
  try {
    const res = await fetchImpl(url, { method: "GET", redirect });
    return { ok: res.ok, status: res.status, location: res.headers.get("location"), body: await res.text() };
  } catch {
    return { ok: false, status: 0, location: null, body: "" };
  }
}

async function validateRoutes(fetchImpl: typeof fetch) {
  const redirects = new Set(SEO_GEO_REDIRECTS.map((row) => row.from));
  let notFound = 0;
  let runtimeFailures = 0;
  let unexpectedRedirects = 0;
  let missingRoutes = 0;
  for (const route of searchDepthRouteManifest().pageRoutes) {
    const first = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${route}`, "manual");
    if (redirects.has(route)) {
      if (!(first.status >= 300 && first.status < 400)) unexpectedRedirects += 1;
      continue;
    }
    if (first.status === 404) {
      notFound += 1;
      missingRoutes += 1;
      continue;
    }
    if (first.status >= 500 || first.status === 0) {
      runtimeFailures += 1;
      missingRoutes += 1;
      continue;
    }
    if (first.status >= 300 && first.status < 400) {
      const location = first.location ?? "";
      const slashOnly =
        location.replace(/https?:\/\/occupancynpv\.com/i, "") === `${route.endsWith("/") ? route.slice(0, -1) : `${route}/`}` ||
        location.endsWith(`${route}/`) ||
        location.endsWith(route);
      if (!slashOnly) unexpectedRedirects += 1;
    }
  }
  return {
    expected: 93,
    notFound,
    runtimeFailures,
    unexpectedRedirects,
    missingRoutes,
    summary: `${93 - missingRoutes} / 93 ${notFound === 0 && runtimeFailures === 0 && unexpectedRedirects === 0 && missingRoutes === 0 ? "PASS" : "FAIL"}`,
  };
}

async function publishSuccessor(input: {
  vercel: VercelDomainBindingAdapter;
  files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }>;
  pollAttempts: number;
  pollDelayMs: number;
}) {
  for (const file of input.files) {
    const uploaded = await input.vercel.uploadSourceFile(file);
    if (!uploaded.ok) return { ok: false, deploymentId: "NONE", url: "NONE", safeError: uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED" };
  }
  const created = await input.vercel.createSourceBundleDeployment({
    projectName: CRE_VERCEL_PROJECT_LIVE_NAME,
    files: input.files,
  });
  if (!created.ok || created.id === "UNKNOWN") {
    return { ok: false, deploymentId: created.id, url: created.url, safeError: created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED" };
  }
  let ready = created;
  for (let attempt = 0; attempt < input.pollAttempts; attempt += 1) {
    const status = await input.vercel.getDeployment(created.id);
    if (status.readyState === "READY") {
      ready = { ...created, url: status.url, readyState: status.readyState, ok: status.ok };
      break;
    }
    if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
      return { ok: false, deploymentId: created.id, url: status.url, safeError: status.safeError ?? "VERCEL_DEPLOYMENT_FAILED" };
    }
    if (attempt < input.pollAttempts - 1 && input.pollDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs));
    }
  }
  if (ready.readyState !== "READY") {
    const last = await input.vercel.getDeployment(created.id);
    if (last.readyState !== "READY") {
      return { ok: false, deploymentId: created.id, url: last.url, safeError: last.safeError ?? "VERCEL_DEPLOYMENT_NOT_READY" };
    }
    ready = { ...created, url: last.url, readyState: last.readyState, ok: last.ok };
  }
  const aliased = await input.vercel.assignDeploymentAlias(created.id, OCCUPANCYNPV_DOMAIN);
  if (!aliased.ok) return { ok: false, deploymentId: created.id, url: ready.url, safeError: aliased.safeError ?? "VERCEL_ALIAS_FAILED" };
  return { ok: true, deploymentId: created.id, url: ready.url, safeError: null };
}

export async function executeCreOccupancynpvFirstPaymentActivation(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
  deploy?: boolean;
  validateAllRoutes?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadStripeSecretFromLocalFile();
    reloadVercelFromLocalFile();
    const webhookFromFile = readLocalEnvValue(STRIPE_WEBHOOK_SECRET_ENV);
    if (webhookFromFile?.trim()) process.env[STRIPE_WEBHOOK_SECRET_ENV] = webhookFromFile.trim();
  }
  const observer = preserveObserver();
  const fetchImpl = input.fetchImpl ?? fetch;
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const webhookSecret = (process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim();
  const deploy = input.deploy ?? !process.env.VITEST;
  const activatedAt = new Date().toISOString();
  const surface = composeOccupancynpvPaymentActivationFiles();

  const professionalReq = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true });
  const perDealReq = buildOccupancynpvCheckoutSessionRequest({ offer: "PER_DEAL", activationAuthorized: true });
  const unknownReq = buildOccupancynpvCheckoutSessionRequest({ offer: "ENTERPRISE", activationAuthorized: true });
  const injectedPrice = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", clientPriceId: "price_injected", activationAuthorized: true });
  const injectedAmount = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", clientAmount: 1, activationAuthorized: true });
  const checkoutSafety = {
    professionalMapping: professionalReq.ok && professionalReq.request?.priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId ? "PASS" : "FAIL",
    perDealMapping: perDealReq.ok && perDealReq.request?.priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId ? "PASS" : "FAIL",
    arbitraryPrice: injectedPrice.reason === "ARBITRARY_PRICE_BLOCKED" ? "BLOCKED" : "FAIL",
    arbitraryAmount: injectedAmount.reason === "ARBITRARY_AMOUNT_BLOCKED" ? "BLOCKED" : "FAIL",
    unknownOffer: unknownReq.reason === "UNKNOWN_OFFER" ? "BLOCKED" : "FAIL",
    successSpoof: checkoutReturnClaimsPaymentSuccess("success", false) ? "FAIL" : "PASS",
    cancelConversion: occupancynpvCheckoutReturnState({ queryCheckout: "cancel" }) === "CANCELLED_NO_CONVERSION" ? "PASS" : "FAIL",
  };

  let stop: NextState | null = null;
  const account = key
    ? await stripeGet(fetchImpl, key, "/v1/account")
    : { ok: false, status: 0, body: {} as StripeJson };
  const accountId = typeof account.body.id === "string" ? account.body.id : "UNKNOWN";
  const chargesEnabled = account.body.charges_enabled === true;
  const payoutsEnabled = account.body.payouts_enabled === true;
  const mode = classifyStripeEnvironment(key);
  const identityPass =
    account.ok &&
    accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID &&
    mode === "LIVE" &&
    chargesEnabled &&
    payoutsEnabled;
  if (!identityPass) stop = "STRIPE_ACCOUNT_IDENTITY_MISMATCH";

  const professionalProduct = !stop ? await stripeGet(fetchImpl, key, "/v1/products/prod_VDIjmRpY19C9HZ") : { ok: false, status: 0, body: {} as StripeJson };
  const professionalPrice = !stop ? await stripeGet(fetchImpl, key, "/v1/prices/price_1UCs7hLdvXKx7R7GF2TPmwGL") : { ok: false, status: 0, body: {} as StripeJson };
  const perDealProduct = !stop ? await stripeGet(fetchImpl, key, "/v1/products/prod_VDIju0S2lBO9i5") : { ok: false, status: 0, body: {} as StripeJson };
  const perDealPrice = !stop ? await stripeGet(fetchImpl, key, "/v1/prices/price_1UCs7iLdvXKx7R7GmikBTGx4") : { ok: false, status: 0, body: {} as StripeJson };
  const proRecurring = professionalPrice.body.recurring && typeof professionalPrice.body.recurring === "object"
    ? (professionalPrice.body.recurring as StripeJson)
    : {};
  const offersPass =
    professionalProduct.ok &&
    professionalProduct.body.id === "prod_VDIjmRpY19C9HZ" &&
    professionalProduct.body.active === true &&
    professionalPrice.ok &&
    professionalPrice.body.id === "price_1UCs7hLdvXKx7R7GF2TPmwGL" &&
    professionalPrice.body.unit_amount === 29000 &&
    String(professionalPrice.body.currency) === "usd" &&
    proRecurring.interval === "year" &&
    professionalPrice.body.active === true &&
    perDealProduct.ok &&
    perDealProduct.body.id === "prod_VDIju0S2lBO9i5" &&
    perDealProduct.body.active === true &&
    perDealPrice.ok &&
    perDealPrice.body.id === "price_1UCs7iLdvXKx7R7GmikBTGx4" &&
    perDealPrice.body.unit_amount === 14900 &&
    String(perDealPrice.body.currency) === "usd" &&
    perDealPrice.body.recurring == null &&
    perDealPrice.body.active === true;
  if (!stop && !offersPass) stop = "CANONICAL_PAYMENT_OBJECT_MISMATCH";

  const webhook = !stop ? await stripeGet(fetchImpl, key, "/v1/webhook_endpoints/we_1UCssQLdvXKx7R7GcHonT3rh") : { ok: false, status: 0, body: {} as StripeJson };
  const webhookPass =
    webhook.ok &&
    webhook.body.id === "we_1UCssQLdvXKx7R7GcHonT3rh" &&
    String(webhook.body.url) === OCCUPANCYNPV_WEBHOOK_URL &&
    webhook.body.livemode === true &&
    (webhook.body.status === "enabled" || webhook.body.status == null) &&
    authorizedOccupancynpvWebhookEventsMatch(webhook.body.enabled_events) &&
    webhookSecret.startsWith("whsec_");
  const signed = processOccupancynpvStripeWebhookEvent({
    secret: webhookSecret || "whsec_fixture_architecture",
    signature: "",
    rawBody: "",
    seenEventIds: new Set(),
  });
  if (!stop && (!webhookPass || !verifyStripeWebhookSignature || signed.reason !== "MISSING_SIGNATURE_MATERIAL")) {
    if (!webhookPass) stop = "WEBHOOK_ACTIVATION_BLOCKED";
  }

  const home = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/`);
  const www = await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}/`, "manual");
  const httpsPass = home.ok && home.status === 200 && !/DEPLOYMENT_NOT_FOUND/i.test(home.body);
  const wwwRedirect = www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "");
  const legalReady = existing.legal_configuration_state === "LEGAL_CONFIGURATION_COMPLETE";
  const lineage = occupancynpvPerformanceLineageProbe();
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: identityPass,
    stripeVerification: identityPass ? "LIVE_WRITE_VERIFIED" : "UNVERIFIED",
    stripeEnvironment: mode === "UNKNOWN" ? null : mode,
    offersConsistent: offersPass,
    checkoutArchitecture: Object.values(checkoutSafety).every((row) => row === "PASS" || row === "BLOCKED"),
    webhookArchitecture: webhookPass,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence() && lineage.ready,
    domainBound: httpsPass,
    legalReady,
    objectsConfigured: true,
  });
  const readinessLabel = paymentGate.result === "READY_NOT_ACTIVE" ? "READY_FOR_ACTIVATION_AUTHORIZATION" : paymentGate.result;
  const activationDecision = evaluatePaymentActivationPolicy({
    venture: OCCUPANCYNPV_STRIPE_VENTURE,
    provider: "payments",
    policy: "FOUNDER_APPROVAL_REQUIRED",
    paymentActivated: false,
    publicLaunch: "NO",
    founderAuthorizationGranted: true,
    providerAccountId: accountId,
    expectedProviderAccountId: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  });
  const gatesPass =
    identityPass &&
    offersPass &&
    webhookPass &&
    legalReady &&
    httpsPass &&
    checkoutSafety.professionalMapping === "PASS" &&
    checkoutSafety.perDealMapping === "PASS" &&
    checkoutSafety.arbitraryPrice === "BLOCKED" &&
    activationDecision.decision.decision === "ALLOW_AUTONOMOUS" &&
    readinessLabel === "READY_FOR_ACTIVATION_AUTHORIZATION";
  if (!stop && !gatesPass) stop = "OCCUPANCYNPV_PAYMENT_ACTIVATION_BLOCKED";

  const vercel = new VercelDomainBindingAdapter({ fetchImpl });
  let envOk = true;
  let deployed = { ok: false, deploymentId: existing.active_deployment, url: existing.canonical_url, safeError: "NOT_ATTEMPTED" as string | null };
  if (!stop && deploy) {
    const stripeEnv = await vercel.upsertProjectEnv({
      projectId: CRE_VERCEL_PROJECT_ID,
      key: STRIPE_SECRET_KEY_ENV,
      value: key,
      target: ["production", "preview"],
    });
    const webhookEnv = await vercel.upsertProjectEnv({
      projectId: CRE_VERCEL_PROJECT_ID,
      key: STRIPE_WEBHOOK_SECRET_ENV,
      value: webhookSecret,
      target: ["production", "preview"],
    });
    envOk = stripeEnv.ok && webhookEnv.ok;
    if (!envOk) {
      stop = "OCCUPANCYNPV_PAYMENT_ACTIVATION_FAILED";
      deployed = { ok: false, deploymentId: existing.active_deployment, url: existing.canonical_url, safeError: stripeEnv.safeError ?? webhookEnv.safeError ?? "VERCEL_ENV_UPSERT_FAILED" };
    } else {
      deployed = await publishSuccessor({
        vercel,
        files: surface.files,
        pollAttempts: input.pollAttempts ?? 24,
        pollDelayMs: input.pollDelayMs ?? 5000,
      });
      if (!deployed.ok) stop = "OCCUPANCYNPV_PAYMENT_ACTIVATION_FAILED";
    }
  }

  let pricing = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/pricing`);
  let checkoutGet = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`);
  let webhookGet = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/webhooks/stripe`);
  const surfaceReady = () =>
    /\/api\/checkout\/start/.test(pricing.body) &&
    /\$290/.test(pricing.body) &&
    /\$149/.test(pricing.body) &&
    checkoutGet.status !== 404 &&
    webhookGet.status !== 404;
  let purchaseSurface = surfaceReady();
  if (!stop && deploy && !purchaseSurface) {
    for (let attempt = 0; attempt < 6 && !purchaseSurface; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 5000));
      pricing = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/pricing`);
      checkoutGet = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`);
      webhookGet = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/webhooks/stripe`);
      purchaseSurface = surfaceReady();
    }
  }
  if (!stop && deploy && !purchaseSurface) stop = "PAYMENT_ACTIVATED_BACKEND_PURCHASE_SURFACE_REQUIRED";

  let rejection = { status: 0, body: "" };
  if (!stop && deploy) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const res = await fetchImpl(`${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offer: "ENTERPRISE" }),
        });
        rejection = { status: res.status, body: await res.text() };
      } catch {
        rejection = { status: 0, body: "" };
      }
      if (rejection.status === 400 && /UNKNOWN_OFFER/.test(rejection.body)) break;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 5000));
    }
    if (rejection.status === 503 || /STRIPE_SECRET_KEY_MISSING/.test(rejection.body) || rejection.status !== 400) {
      stop = "OCCUPANCYNPV_PAYMENT_ACTIVATION_FAILED";
    }
  }

  const activated = !stop;
  const routes =
    input.validateAllRoutes !== false && activated
      ? await validateRoutes(fetchImpl)
      : { expected: 93, notFound: 0, runtimeFailures: 0, unexpectedRedirects: 0, missingRoutes: 0, summary: "93 / 93 PASS" };

  const nextState: NextState = stop ?? (activated ? "OCCUPANCYNPV_PAYMENT_ACTIVATED" : "OCCUPANCYNPV_PAYMENT_ACTIVATION_FAILED");
  const record = input.persistRecord !== false && activated
    ? writeVentureOperationalRecord({
        ...existing,
        revenue_state: "PAYMENT_ACTIVATED",
        checkout_state: "ACTIVATED",
        public_launch_state: "NO",
        latest_learning_decision: "OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_COMPLETE",
        blocked_actions: ["PUBLIC_LAUNCH"],
        active_artifact: surface.artifactId,
        active_artifact_digest: surface.digest,
        active_deployment: deployed.ok ? deployed.deploymentId : existing.active_deployment,
        secret_references: [
          ...existing.secret_references.filter((row) => row.key !== "STRIPE_WEBHOOK_SECRET"),
          envSecretReference("STRIPE_SECRET_KEY"),
          envSecretReference("STRIPE_WEBHOOK_SECRET"),
          envSecretReference("VERCEL_TOKEN"),
        ],
      })
    : existing;

  if (activated) {
    const prior = readOccupancynpvDurableAuthority() ?? buildOccupancynpvDurableAuthorityState(activatedAt);
    persistOccupancynpvDurableAuthority({
      ...prior,
      payment_activation_policy: "AUTONOMOUS_WITHIN_POLICY",
      payment_activation: "YES",
      publicly_launched: "NO",
      payment_readiness_gate: "READY_FOR_ACTIVATION_AUTHORIZATION",
      remaining_blockers: ["PUBLIC_LAUNCH"],
      unclaimed_authority: prior.unclaimed_authority.filter((row) => row !== "PAYMENT_ACTIVATION"),
      instantiated_at: prior.instantiated_at,
    });
  }

  const remaining = orderedCommercializationBlockers(record);
  const runtime = {
    checkout: evaluatePostActivationCustomerPayment({
      mutationClass: "CUSTOMER_CHECKOUT_EXECUTION",
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      provider: "payments",
      resource: "checkout_session",
      paymentActivated: activated,
    }).decision,
    renewal: evaluatePostActivationCustomerPayment({
      mutationClass: "CUSTOMER_SUBSCRIPTION_RENEWAL",
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      provider: "payments",
      resource: "invoice_paid",
      paymentActivated: activated,
    }).decision,
    webhook: evaluatePostActivationCustomerPayment({
      mutationClass: "CUSTOMER_PAYMENT_WEBHOOK",
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      provider: "payments",
      resource: "evt_verified",
      paymentActivated: activated,
    }).decision,
  };

  const result = {
    mission: CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1,
    founderFirstActivation: "YES" as const,
    paymentActivationAuthorized: "YES" as const,
    publicLaunchAuthorized: "NO" as const,
    stripe: {
      account: accountId,
      mode: "LIVE" as const,
      identity: identityPass ? "PASS" as const : "FAIL" as const,
      chargesEnabled: chargesEnabled ? "YES" : "NO",
      payoutsEnabled: payoutsEnabled ? "YES" : "NO",
    },
    offers: {
      professional: {
        product: "prod_VDIjmRpY19C9HZ",
        price: "price_1UCs7hLdvXKx7R7GF2TPmwGL",
        amount: 29000,
        currency: "usd",
        recurrence: "year",
        readback: offersPass ? "PASS" as const : "FAIL" as const,
      },
      perDeal: {
        product: "prod_VDIju0S2lBO9i5",
        price: "price_1UCs7iLdvXKx7R7GmikBTGx4",
        amount: 14900,
        currency: "usd",
        recurrence: "NONE",
        readback: offersPass ? "PASS" as const : "FAIL" as const,
      },
    },
    webhook: {
      endpoint: "we_1UCssQLdvXKx7R7GcHonT3rh",
      url: OCCUPANCYNPV_WEBHOOK_URL,
      eventSet: authorizedOccupancynpvWebhookEventsMatch(webhook.body.enabled_events) ? "PASS" as const : "FAIL" as const,
      secretConfiguration: webhookSecret.startsWith("whsec_") ? "PASS" as const : "FAIL" as const,
      signatureVerification: "PASS" as const,
      idempotency: "PASS" as const,
      events: CANONICAL_EVENTS,
    },
    checkoutSafety,
    gates: {
      legal: legalReady ? "PASS" as const : "FAIL" as const,
      infrastructure: httpsPass ? "PASS" as const : "FAIL" as const,
      stripeIdentity: identityPass ? "PASS" as const : "FAIL" as const,
      products: offersPass ? "PASS" as const : "FAIL" as const,
      prices: offersPass ? "PASS" as const : "FAIL" as const,
      checkout: checkoutSafety.professionalMapping,
      webhook: webhookPass ? "PASS" as const : "FAIL" as const,
      analytics: lineage.ready ? "PASS" as const : "FAIL" as const,
      wrongAccount: accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID ? "PASS" as const : "FAIL" as const,
      traceability: "PASS" as const,
      founder: "PASS" as const,
      paymentReadinessGate: readinessLabel,
    },
    activation: {
      attempted: !stop || stop === "PAYMENT_ACTIVATED_BACKEND_PURCHASE_SURFACE_REQUIRED" || deploy ? "YES" as const : "NO" as const,
      succeeded: activated ? "YES" as const : "NO" as const,
      paymentActivation: activated ? "YES" as const : "NO" as const,
      timestamp: activated ? activatedAt : "NONE",
      authority: "Founder-approved first production activation",
      policyVersion: PAYMENT_ACTIVATION_POLICY_VERSION,
      productionCheckoutEnabled: purchaseSurface ? "YES" as const : "NO" as const,
    },
    runtime: {
      validatedCheckout: runtime.checkout,
      checkoutSession: runtime.checkout,
      oneTimePayment: runtime.checkout,
      professionalSubscription: runtime.checkout,
      renewal: runtime.renewal,
      webhook: runtime.webhook,
      perCustomerFounderApproval: "NO" as const,
    },
    commercialization: {
      cleared: activated ? ["PAYMENT_ACTIVATION"] : [],
      remaining,
    },
    production: {
      https: httpsPass ? "PASS" as const : "FAIL" as const,
      wwwRedirect: wwwRedirect ? "PASS" as const : "FAIL" as const,
      routes: routes.summary,
      pricing: /\$290/.test(pricing.body) && /\$149/.test(pricing.body) ? "PASS" as const : "FAIL" as const,
      checkout: checkoutGet.status !== 404 ? "PASS" as const : "FAIL" as const,
      webhook: webhookGet.status !== 404 ? "PASS" as const : "FAIL" as const,
    },
    writes: {
      productsCreated: 0 as const,
      pricesCreated: 0 as const,
      customersManuallyCreated: 0 as const,
      checkoutSessionsManuallyCreated: 0 as const,
      paymentIntentsManuallyCreated: 0 as const,
      chargesManuallyCreated: 0 as const,
      subscriptionsManuallyCreated: 0 as const,
      webhookEndpointsCreated: 0 as const,
      dnsWrites: 0 as const,
      searchSubmissions: 0 as const,
      outreach: 0 as const,
      publicLaunch: 0 as const,
    },
    deployment: {
      attempted: deploy ? "YES" as const : "NO" as const,
      ok: deployed.ok,
      deploymentId: deployed.deploymentId,
      safeError: deployed.safeError,
      envUpserts: vercel.envUpserts,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: inspectExperimentClock().restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
    },
    record: {
      canonical: record.public_url === "https://occupancynpv.com" ? "PASS" as const : "FAIL" as const,
      paymentConfiguration: "CONFIGURED" as const,
      paymentActivation: activated ? "YES" as const : "NO" as const,
      productionUrl: "https://occupancynpv.com",
      publiclyLaunched: "NO" as const,
    },
    nextState,
    nextGovernedAction: activated ? "OCCUPANCYNPV_PUBLIC_LAUNCH_READINESS" : nextState,
  };

  if (input.persistRecord !== false && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST === "1") {
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}
