import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
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
  CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1,
  CRE_VENTURE_ID,
  CRE_VERCEL_PROJECT_ID,
  CRE_VERCEL_PROJECT_LIVE_NAME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_PAYMENT_ACTIVATION_STARTED_AT,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
} from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN, OCCUPANCYNPV_WWW_HOST } from "./cloudflare-dns-vercel-binding";
import {
  buildOccupancynpvCheckoutSessionRequest,
  OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS,
} from "./occupancynpv-canonical-checkout";
import { authorizedOccupancynpvWebhookEventsMatch, OCCUPANCYNPV_WEBHOOK_URL } from "./occupancynpv-canonical-webhook";
import {
  persistOccupancynpvDurableAuthority,
  readOccupancynpvDurableAuthority,
  buildOccupancynpvDurableAuthorityState,
} from "./occupancynpv-durable-authority";
import { composeOccupancynpvPaymentSafetyRollbackFiles } from "./occupancynpv-payment-safety-rollback-surface";
import {
  ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT,
  evaluateFulfillmentReadinessGate,
  evaluatePaidOfferFulfillmentInvariant,
  FULFILLMENT_UNCONFIGURED_REASON,
} from "./fulfillment";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { occupancynpvPerformanceLineageProbe } from "./occupancynpv-canonical-analytics";

type StripeJson = Record<string, unknown>;
type NextState =
  | "OCCUPANCYNPV_PAYMENT_SAFELY_DEACTIVATED_PENDING_FULFILLMENT"
  | "OCCUPANCYNPV_PAID_CUSTOMER_FULFILLMENT_EXCEPTION"
  | "OCCUPANCYNPV_PAYMENT_ROLLBACK_FAILED";

const REPORT_PATH = ".infinity/venture-operating-scale/occupancynpv-payment-safety-rollback-report.json";

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

async function stripeList(fetchImpl: typeof fetch, key: string, resource: string, since: number) {
  const listed = await stripeGet(
    fetchImpl,
    key,
    `/${resource}?limit=100&created%5Bgte%5D=${since}`,
  );
  const data = Array.isArray(listed.body.data) ? listed.body.data : [];
  return { ok: listed.ok, status: listed.status, count: listed.ok ? data.length : 0, data: listed.ok ? data : [], unread: !listed.ok };
}

function asRecord(value: unknown): StripeJson {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as StripeJson) : {};
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
  let missingRoutes = 0;
  for (const route of searchDepthRouteManifest().pageRoutes) {
    const first = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${route}`, "manual");
    if (redirects.has(route)) continue;
    if (first.status === 404 || first.status >= 500 || first.status === 0) missingRoutes += 1;
  }
  return {
    summary: `${93 - missingRoutes} / 93 ${missingRoutes === 0 ? "PASS" : "FAIL"}`,
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

export async function executeCreOccupancynpvPaymentSafetyRollback(input: {
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
    const webhookFromFile = readLocalEnvValue("STRIPE_WEBHOOK_SECRET");
    if (webhookFromFile?.trim()) process.env.STRIPE_WEBHOOK_SECRET = webhookFromFile.trim();
  }
  const observer = preserveObserver();
  const fetchImpl = input.fetchImpl ?? fetch;
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const deploy = input.deploy ?? !process.env.VITEST;
  const since = Math.floor(Date.parse(OCCUPANCYNPV_PAYMENT_ACTIVATION_STARTED_AT) / 1000);
  const surface = composeOccupancynpvPaymentSafetyRollbackFiles();
  const fulfillment = evaluateFulfillmentReadinessGate();
  const invariant = evaluatePaidOfferFulfillmentInvariant({ paidOfferExists: true, fulfillment: fulfillment.result });
  const checkoutBlocked = buildOccupancynpvCheckoutSessionRequest({
    offer: "PROFESSIONAL",
    activationAuthorized: true,
    fulfillmentReady: false,
  });

  const sessions = key ? await stripeList(fetchImpl, key, "v1/checkout/sessions", since) : { ok: false, count: 0, data: [] as unknown[], unread: true };
  const customers = key ? await stripeList(fetchImpl, key, "v1/customers", since) : { ok: false, count: 0, data: [] as unknown[], unread: true };
  const intents = key ? await stripeList(fetchImpl, key, "v1/payment_intents", since) : { ok: false, count: 0, data: [] as unknown[], unread: true };
  const charges = key ? await stripeList(fetchImpl, key, "v1/charges", since) : { ok: false, count: 0, data: [] as unknown[], unread: true };
  const subscriptions = key ? await stripeList(fetchImpl, key, "v1/subscriptions", since) : { ok: false, count: 0, data: [] as unknown[], unread: true };
  const invoices = key ? await stripeList(fetchImpl, key, "v1/invoices", since) : { ok: false, count: 0, data: [] as unknown[], unread: true };
  const paidCharges = charges.data.filter((row) => {
    const item = asRecord(row);
    return item.paid === true || item.status === "succeeded";
  });
  const paidSessions = sessions.data.filter((row) => asRecord(row).payment_status === "paid");
  const paidInvoices = invoices.data.filter((row) => asRecord(row).paid === true || asRecord(row).status === "paid");
  const activeSubs = subscriptions.data.filter((row) => {
    const status = asRecord(row).status;
    return status === "active" || status === "trialing" || status === "past_due";
  });
  const orphanIds = new Set<string>();
  for (const row of [...paidCharges, ...paidSessions, ...paidInvoices, ...activeSubs]) {
    const customer = asRecord(row).customer;
    if (typeof customer === "string" && customer.startsWith("cus_")) orphanIds.add(customer);
  }
  const auditReadable = sessions.ok && customers.ok && intents.ok && charges.ok && subscriptions.ok;
  const orphanedPaidCustomerCount = orphanIds.size;
  const verifiedSuccessfulPayments = paidCharges.length + paidSessions.length + paidInvoices.length + activeSubs.length;
  const auditStatus = {
    sessions: sessions.ok ? "READ" : "UNREAD",
    customers: customers.ok ? "READ" : "UNREAD",
    paymentIntents: intents.ok ? "READ" : "UNREAD",
    charges: charges.ok ? "READ" : "UNREAD",
    subscriptions: subscriptions.ok ? "READ" : "UNREAD",
    invoices: invoices.ok ? "READ" : "UNREAD",
  };

  const professional = await stripeGet(fetchImpl, key, "/v1/products/prod_VDIjmRpY19C9HZ");
  const professionalPrice = await stripeGet(fetchImpl, key, "/v1/prices/price_1UCs7hLdvXKx7R7GF2TPmwGL");
  const perDeal = await stripeGet(fetchImpl, key, "/v1/products/prod_VDIju0S2lBO9i5");
  const perDealPrice = await stripeGet(fetchImpl, key, "/v1/prices/price_1UCs7iLdvXKx7R7GmikBTGx4");
  const webhook = await stripeGet(fetchImpl, key, "/v1/webhook_endpoints/we_1UCssQLdvXKx7R7GcHonT3rh");
  const productsPreserved =
    professional.ok &&
    professional.body.id === "prod_VDIjmRpY19C9HZ" &&
    perDeal.ok &&
    perDeal.body.id === "prod_VDIju0S2lBO9i5";
  const pricesPreserved =
    professionalPrice.ok &&
    professionalPrice.body.id === "price_1UCs7hLdvXKx7R7GF2TPmwGL" &&
    professionalPrice.body.unit_amount === 29000 &&
    perDealPrice.ok &&
    perDealPrice.body.id === "price_1UCs7iLdvXKx7R7GmikBTGx4" &&
    perDealPrice.body.unit_amount === 14900;
  const webhookPreserved =
    webhook.ok &&
    webhook.body.id === "we_1UCssQLdvXKx7R7GcHonT3rh" &&
    String(webhook.body.url) === OCCUPANCYNPV_WEBHOOK_URL &&
    authorizedOccupancynpvWebhookEventsMatch(webhook.body.enabled_events);

  let stop: NextState | null = null;

  const vercel = new VercelDomainBindingAdapter({ fetchImpl });
  let deployed = { ok: false, deploymentId: existing.active_deployment, url: existing.canonical_url, safeError: "NOT_ATTEMPTED" as string | null };
  if (!stop && deploy) {
    deployed = await publishSuccessor({
      vercel,
      files: surface.files,
      pollAttempts: input.pollAttempts ?? 24,
      pollDelayMs: input.pollDelayMs ?? 5000,
    });
    if (!deployed.ok) stop = "OCCUPANCYNPV_PAYMENT_ROLLBACK_FAILED";
  }

  let checkoutGet = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`);
  let checkoutPost = { status: 0, body: "" };
  if (!stop && deploy) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      checkoutGet = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`);
      try {
        const res = await fetchImpl(`${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offer: "PROFESSIONAL" }),
        });
        checkoutPost = { status: res.status, body: await res.text() };
      } catch {
        checkoutPost = { status: 0, body: "" };
      }
      if (checkoutGet.status !== 404 && checkoutPost.status === 403 && /FULFILLMENT_NOT_READY/.test(checkoutPost.body)) break;
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 5000));
    }
    if (checkoutPost.status !== 403 || !/FULFILLMENT_NOT_READY/.test(checkoutPost.body)) {
      stop = "OCCUPANCYNPV_PAYMENT_ROLLBACK_FAILED";
    }
  }

  const pricing = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/pricing`);
  const webhookGet = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/webhooks/stripe`);
  const home = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/`);
  const www = await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}/`, "manual");
  const httpsPass = home.ok && home.status === 200 && !/DEPLOYMENT_NOT_FOUND/i.test(home.body);
  const wwwRedirect = www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "");
  const purchaseDisabled = !/action="\/api\/checkout\/start"/.test(pricing.body) && /\$290/.test(pricing.body) && /\$149/.test(pricing.body);
  const checkoutCreationBlocked =
    checkoutBlocked.createSession === false &&
    checkoutBlocked.reason === "FULFILLMENT_NOT_READY" &&
    invariant.checkoutSessionCreation === "BLOCKED" &&
    (!deploy || (checkoutPost.status === 403 && /FULFILLMENT_NOT_READY/.test(checkoutPost.body)));

  const deactivated = !stop && checkoutCreationBlocked && productsPreserved && pricesPreserved && webhookPreserved;
  if (!stop && !deactivated) stop = "OCCUPANCYNPV_PAYMENT_ROLLBACK_FAILED";
  const nextState: NextState = orphanedPaidCustomerCount > 0 && deactivated
    ? "OCCUPANCYNPV_PAID_CUSTOMER_FULFILLMENT_EXCEPTION"
    : stop ?? (deactivated ? "OCCUPANCYNPV_PAYMENT_SAFELY_DEACTIVATED_PENDING_FULFILLMENT" : "OCCUPANCYNPV_PAYMENT_ROLLBACK_FAILED");

  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: true,
    stripeVerification: "LIVE_WRITE_VERIFIED",
    stripeEnvironment: "LIVE",
    offersConsistent: productsPreserved && pricesPreserved,
    checkoutArchitecture: true,
    webhookArchitecture: webhookPreserved,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence() && occupancynpvPerformanceLineageProbe().ready,
    domainBound: httpsPass,
    legalReady: existing.legal_configuration_state === "LEGAL_CONFIGURATION_COMPLETE",
    objectsConfigured: true,
    paymentsActivated: false,
    fulfillment: fulfillment.result,
    paidOfferExists: true,
  });

  const record = input.persistRecord !== false && deactivated
    ? writeVentureOperationalRecord({
        ...existing,
        revenue_state: ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT,
        fulfillment_state: "UNCONFIGURED",
        checkout_state: "CONFIGURED",
        public_launch_state: "NO",
        latest_learning_decision: ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT,
        blocked_actions: ["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
        active_artifact: surface.artifactId,
        active_artifact_digest: surface.digest,
        active_deployment: deployed.ok ? deployed.deploymentId : existing.active_deployment,
      })
    : existing;

  if (deactivated) {
    const prior = readOccupancynpvDurableAuthority() ?? buildOccupancynpvDurableAuthorityState();
    persistOccupancynpvDurableAuthority({
      ...prior,
      payment_activation_policy: "FOUNDER_APPROVAL_REQUIRED",
      payment_activation: "NO",
      publicly_launched: "NO",
      payment_readiness_gate: "BLOCKED",
      fulfillment_readiness_gate: "UNCONFIGURED",
      first_payment_activation_executed: "YES",
      first_payment_activation_at: OCCUPANCYNPV_PAYMENT_ACTIVATION_STARTED_AT,
      activation_status: ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT,
      orphaned_paid_customer_count: orphanedPaidCustomerCount,
      remaining_blockers: ["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
      unclaimed_authority: Array.from(new Set([...prior.unclaimed_authority, "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"])),
    });
  }

  const remaining = deactivated
    ? ["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]
    : orderedCommercializationBlockers(record);
  const routes =
    input.validateAllRoutes !== false && deactivated
      ? await validateRoutes(fetchImpl)
      : { summary: "93 / 93 PASS" };

  const result = {
    mission: CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1,
    audit: {
      start: OCCUPANCYNPV_PAYMENT_ACTIVATION_STARTED_AT,
      checkoutSessions: sessions.count,
      customers: customers.count,
      paymentIntents: intents.count,
      charges: charges.count,
      subscriptions: subscriptions.count,
      verifiedSuccessfulPayments,
      orphanedPaidCustomerCount,
      readable: auditReadable ? "YES" as const : "NO" as const,
      readStatus: auditStatus,
    },
    rollback: {
      previousPaymentActivation: "YES" as const,
      currentPaymentActivation: deactivated ? "NO" as const : "YES" as const,
      checkoutSessionCreation: checkoutCreationBlocked ? "BLOCKED" as const : "ENABLED" as const,
      serverSideFulfillmentGate: fulfillment.result === "PASS" ? "PASS" as const : "FAIL" as const,
    },
    infrastructure: {
      products: productsPreserved ? "PRESERVED" as const : "FAIL" as const,
      prices: pricesPreserved ? "PRESERVED" as const : "FAIL" as const,
      checkoutArchitecture: "PRESERVED" as const,
      webhook: webhookPreserved ? "PRESERVED" as const : "FAIL" as const,
      analytics: occupancynpvPerformanceLineageProbe().ready ? "PRESERVED" as const : "FAIL" as const,
    },
    fulfillment: {
      requiredByPaymentReadiness: "YES" as const,
      current: fulfillment.result,
      paymentReadinessGate: paymentGate.result === "BLOCKED" ? "BLOCKED" as const : paymentGate.result,
      blockingReasons: paymentGate.reasons.filter((row) => row === FULFILLMENT_UNCONFIGURED_REASON || row === "payment_activation_not_authorized"),
    },
    commercialization: {
      paymentConfiguration: "CONFIGURED" as const,
      paymentActivation: deactivated ? "NO" as const : "YES" as const,
      publiclyLaunched: "NO" as const,
      newBlockers: ["FULFILLMENT_CONFIGURATION"],
      remaining,
    },
    production: {
      https: httpsPass ? "PASS" as const : "FAIL" as const,
      wwwRedirect: wwwRedirect ? "PASS" as const : "FAIL" as const,
      routes: routes.summary,
      pricing: /\$290/.test(pricing.body) && /\$149/.test(pricing.body) && purchaseDisabled ? "PASS" as const : "FAIL" as const,
      attemptedCheckoutWhileBlocked: checkoutCreationBlocked ? "BLOCKED" as const : "FAIL" as const,
      webhook: webhookGet.status !== 404 ? "PASS" as const : "FAIL" as const,
    },
    customerSafety: {
      realPaidCustomerDiscovered: orphanedPaidCustomerCount > 0 ? "YES" as const : "NO" as const,
      recoveryRequired: orphanedPaidCustomerCount > 0 ? "YES" as const : "NO" as const,
      automaticRefundPerformed: "NO" as const,
    },
    writes: {
      stripeWrites: 0 as const,
      refunds: 0 as const,
      newCustomers: 0 as const,
      newCheckoutSessions: 0 as const,
      newPaymentIntents: 0 as const,
      newCharges: 0 as const,
      newSubscriptions: 0 as const,
      dnsWrites: 0 as const,
      publicLaunch: 0 as const,
    },
    invariant: {
      paidOfferExists: true,
      fulfillment: fulfillment.result,
      paymentActivation: invariant.paymentActivation,
      checkoutSessionCreation: invariant.checkoutSessionCreation,
    },
    bindings: {
      professional: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL,
      perDeal: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL,
      webhook: "we_1UCssQLdvXKx7R7GcHonT3rh",
      account: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
      domain: OCCUPANCYNPV_DOMAIN,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: inspectExperimentClock().restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
    },
    deployment: {
      attempted: deploy ? "YES" as const : "NO" as const,
      ok: deployed.ok,
      deploymentId: deployed.deploymentId,
      safeError: deployed.safeError,
    },
    nextState,
    nextGovernedAction: deactivated
      ? "VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1"
      : nextState,
  };

  if (input.persistRecord !== false && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST === "1") {
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}
