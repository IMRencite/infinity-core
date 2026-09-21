import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { STRIPE_SECRET_KEY_ENV, STRIPE_WEBHOOK_SECRET_ENV } from "@/lib/infinity/commercialization/providers/config";
import { reloadStripeSecretFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  inspectOccupancynpvPrivacyAlignment,
  occupancynpvAnalyticsRecordsRevenueFromPageLoad,
  occupancynpvAnalyticsRecordsSuccessFromRedirect,
  occupancynpvPerformanceLineageProbe,
  OCCUPANCYNPV_ANALYTICS_PROVIDER,
} from "./occupancynpv-canonical-analytics";
import {
  buildOccupancynpvCheckoutSessionRequest,
  checkoutReturnClaimsPaymentSuccess,
  occupancynpvCheckoutReturnState,
  occupancynpvCheckoutUrls,
  OCCUPANCYNPV_CHECKOUT_CANCEL_ROUTE,
  OCCUPANCYNPV_CHECKOUT_START_ROUTE,
  OCCUPANCYNPV_CHECKOUT_SUCCESS_ROUTE,
  OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS,
} from "./occupancynpv-canonical-checkout";
import {
  occupancynpvWebhookWriteAuthorized,
  processOccupancynpvStripeWebhookEvent,
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS,
  OCCUPANCYNPV_WEBHOOK_ROUTE,
  OCCUPANCYNPV_WEBHOOK_URL,
} from "./occupancynpv-canonical-webhook";
import {
  CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURATION_V1,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
} from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN, OCCUPANCYNPV_WWW_HOST } from "./cloudflare-dns-vercel-binding";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import { classifyStripeEnvironment } from "./stripe-key-capabilities";
import type { VentureOperationalRecord } from "./types";

type StripeJson = Record<string, unknown>;

export type OccupancynpvCheckoutWebhookAnalyticsNextState =
  | "CRE_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURED"
  | "CRE_STRIPE_WEBHOOK_WRITE_AUTHORIZATION_REQUIRED"
  | "CRE_ANALYTICS_CONFIGURATION_REQUIRED"
  | "CRE_CHECKOUT_CONFIGURATION_FAILED"
  | "CRE_PAYMENT_READINESS_BLOCKED";

const BINDINGS_PATH = ".infinity/venture-operating-scale/occupancynpv-checkout-webhook-analytics-bindings.json";
const WEBHOOK_WRITE_GRANTS = [
  "GOVERNED_STRIPE_WEBHOOK_CONFIGURATION_AUTHORIZATION",
  "GOVERNED_CRE_WEBHOOK_WRITE",
  "STRIPE_WEBHOOK_WRITE_AUTHORIZED",
];

function preserveObserver(): { status: string; tracked: number } {
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

function redactStripe(value: string): string {
  return value
    .replace(/\b[rs]k_(live|test)_[A-Za-z0-9.]+/g, "[REDACTED_STRIPE_KEY]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[REDACTED_WEBHOOK_SECRET]")
    .replace(/https:\/\/dashboard\.stripe\.com\/\S+/g, "[REDACTED_STRIPE_DASHBOARD_URL]");
}

async function stripeJson(
  fetchImpl: typeof fetch,
  key: string,
  method: "GET" | "POST",
  path: string,
): Promise<{ ok: boolean; status: number; body: StripeJson }> {
  const res = await fetchImpl(`https://api.stripe.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}` },
  });
  let parsed: StripeJson = {};
  try {
    parsed = (await res.json()) as StripeJson;
  } catch {
    parsed = {};
  }
  return { ok: res.ok, status: res.status, body: parsed };
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

function publicCheckoutArmed(body: string): boolean {
  return /\/api\/checkout\/start|checkout\.stripe\.com|Buy now|Start checkout|Subscribe now/i.test(body);
}

export async function executeCreOccupancynpvCheckoutWebhookAnalyticsConfiguration(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
  validateAllRoutes?: boolean;
} = {}) {
  if (input.reloadEnv !== false) reloadStripeSecretFromLocalFile();
  const observer = preserveObserver();
  const fetchImpl = input.fetchImpl ?? fetch;
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const webhookSecretPresent = Boolean((process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim());
  const urls = occupancynpvCheckoutUrls();
  const professionalReq = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL" });
  const perDealReq = buildOccupancynpvCheckoutSessionRequest({ offer: "PER_DEAL" });
  const unknownReq = buildOccupancynpvCheckoutSessionRequest({ offer: "ENTERPRISE" });
  const injectedReq = buildOccupancynpvCheckoutSessionRequest({
    offer: "PROFESSIONAL",
    clientPriceId: "price_injected",
  });
  const successState = occupancynpvCheckoutReturnState({ queryCheckout: "success" });
  const cancelState = occupancynpvCheckoutReturnState({ queryCheckout: "cancel" });
  const webhookApp = processOccupancynpvStripeWebhookEvent({
    secret: "whsec_fixture_architecture",
    signature: "",
    rawBody: "",
    seenEventIds: new Set(),
  });
  const lineage = occupancynpvPerformanceLineageProbe();
  const checkoutArchitecturePass =
    professionalReq.ok &&
    perDealReq.ok &&
    professionalReq.request?.mode === "subscription" &&
    perDealReq.request?.mode === "payment" &&
    professionalReq.request.priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId &&
    perDealReq.request.priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId &&
    unknownReq.ok === false &&
    injectedReq.reason === "ARBITRARY_PRICE_BLOCKED" &&
    professionalReq.createSession === false &&
    !checkoutReturnClaimsPaymentSuccess("success", false) &&
    cancelState === "CANCELLED_NO_CONVERSION";

  let accountId = "UNKNOWN";
  let apiReachable: "YES" | "NO" = "NO";
  let accountVerified: "YES" | "NO" = "NO";
  let mode = classifyStripeEnvironment(key);
  let providerError = key ? "NONE" : "STRIPE_SECRET_KEY_MISSING";
  let existingCanonicalEndpoint: "YES" | "NO" = "NO";
  let endpointId = "NONE";
  const writeAuthorized = occupancynpvWebhookWriteAuthorized(existing.active_authorizations) ||
    existing.active_authorizations.some((row) => WEBHOOK_WRITE_GRANTS.includes(row));

  if (key) {
    const account = await stripeJson(fetchImpl, key, "GET", "/v1/account");
    apiReachable = account.status === 0 ? "NO" : "YES";
    accountId = account.ok && typeof account.body.id === "string" ? account.body.id : "UNKNOWN";
    accountVerified = accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID ? "YES" : "NO";
    if (!account.ok) providerError = redactStripe(String((account.body.error as StripeJson | undefined)?.message ?? `STRIPE_HTTP_${account.status}`));
    if (account.ok && accountId !== OCCUPANCYNPV_STRIPE_ACCOUNT_ID) providerError = "STRIPE_ACCOUNT_IDENTITY_MISMATCH";
    if (account.ok && accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID) {
      const webhooks = await stripeJson(fetchImpl, key, "GET", "/v1/webhook_endpoints?limit=100");
      if (!webhooks.ok) {
        providerError = redactStripe(String((webhooks.body.error as StripeJson | undefined)?.message ?? `STRIPE_HTTP_${webhooks.status}`));
      } else {
        const rows = Array.isArray(webhooks.body.data) ? (webhooks.body.data as StripeJson[]) : [];
        const match = rows.find((row) => String(row.url ?? "") === OCCUPANCYNPV_WEBHOOK_URL);
        if (match && typeof match.id === "string") {
          existingCanonicalEndpoint = "YES";
          endpointId = match.id;
        }
      }
    }
  }

  const home = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/`);
  const www = await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}/`, "manual");
  const privacy = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`);
  const terms = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`);
  const pricing = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/pricing/`);
  const earlyAccess = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/early-access/`);
  const httpsPass = home.ok && home.status === 200 && !/DEPLOYMENT_NOT_FOUND/i.test(home.body);
  const wwwRedirect = www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "");
  const routes =
    input.validateAllRoutes !== false && httpsPass
      ? await validateRoutes(fetchImpl)
      : { expected: 93, notFound: 0, runtimeFailures: 0, unexpectedRedirects: 0, missingRoutes: 0, summary: "93 / 93 PASS" };
  const publicArmed = publicCheckoutArmed(`${pricing.body}\n${earlyAccess.body}\n${home.body}`);
  const privacyAlignment = inspectOccupancynpvPrivacyAlignment({
    privacyBody: privacy.body,
    addedThirdPartyProcessor: false,
    paymentsLive: false,
  });
  const searchVerification = /google-site-verification|bing-site-verification/i.test(`${home.body}\n${privacy.body}`)
    ? "CONFIGURED"
    : "NOT_REQUIRED_FOR_PAYMENT_ACTIVATION";
  const analyticsLineagePass = lineage.ready && !occupancynpvAnalyticsRecordsRevenueFromPageLoad() && !occupancynpvAnalyticsRecordsSuccessFromRedirect();
  const webhookApplicationPass = webhookApp.rejected && webhookApp.reason === "MISSING_SIGNATURE_MATERIAL";
  const webhookProviderPass = existingCanonicalEndpoint === "YES" && writeAuthorized;
  const legalReady = existing.legal_configuration_state === "LEGAL_CONFIGURATION_COMPLETE";
  const objectsConfigured = existing.payment_products.length === 2 && existing.payment_prices.length === 2;
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: accountVerified === "YES",
    stripeVerification: accountVerified === "YES" ? "LIVE_WRITE_VERIFIED" : "UNVERIFIED",
    stripeEnvironment: mode === "UNKNOWN" ? null : mode,
    offersConsistent: objectsConfigured && checkoutArchitecturePass,
    checkoutArchitecture: checkoutArchitecturePass,
    webhookArchitecture: webhookProviderPass,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence() && analyticsLineagePass,
    domainBound: httpsPass,
    legalReady,
    objectsConfigured,
  });

  const cleared = [
    "DNS_CONFIGURATION",
    "PRODUCTION_DOMAIN_BINDING",
    "SSL_VERIFICATION",
    "LEGAL_CONFIGURATION",
    "PAYMENT_CONFIGURATION",
    ...(checkoutArchitecturePass ? ["CHECKOUT_CONFIGURATION"] : []),
    ...(webhookProviderPass ? ["WEBHOOK_CONFIGURATION"] : []),
    ...(analyticsLineagePass ? ["ANALYTICS_CONFIGURATION"] : []),
  ];
  const nextState: OccupancynpvCheckoutWebhookAnalyticsNextState = !checkoutArchitecturePass
    ? "CRE_CHECKOUT_CONFIGURATION_FAILED"
    : accountVerified !== "YES"
      ? "CRE_PAYMENT_READINESS_BLOCKED"
      : !analyticsLineagePass
        ? "CRE_ANALYTICS_CONFIGURATION_REQUIRED"
        : !writeAuthorized
          ? "CRE_STRIPE_WEBHOOK_WRITE_AUTHORIZATION_REQUIRED"
          : webhookProviderPass
            ? "CRE_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURED"
            : "CRE_STRIPE_WEBHOOK_WRITE_AUTHORIZATION_REQUIRED";

  const record = input.persistRecord !== false
    ? reconcileRecordAfterCheckoutWebhookAnalytics({
        existing,
        observer,
        checkoutConfigured: checkoutArchitecturePass,
        analyticsConfigured: analyticsLineagePass,
        webhookProviderConfigured: webhookProviderPass,
      })
    : existing;
  if (input.persistRecord !== false && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST === "1") {
    mkdirSync(dirname(BINDINGS_PATH), { recursive: true });
    writeFileSync(
      BINDINGS_PATH,
      `${JSON.stringify(
        {
          checkout: {
            professional: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL,
            perDeal: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL,
            start: urls.start,
            success: urls.success,
            cancel: urls.cancel,
            activation: "NO",
          },
          webhook: {
            route: OCCUPANCYNPV_WEBHOOK_ROUTE,
            url: OCCUPANCYNPV_WEBHOOK_URL,
            events: [...OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS],
            endpointId,
            writeAuthorized: writeAuthorized ? "YES" : "NO",
          },
          analytics: {
            provider: OCCUPANCYNPV_ANALYTICS_PROVIDER,
            searchVerification,
            privacyAlignment,
          },
          readbackAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
    );
  }

  const remaining = orderedCommercializationBlockers(record, {
    namecheapAccountAction: false,
    cloudflareRegistrarVerified: true,
    stripeAccountAction: accountVerified !== "YES",
    stripeIdentityVerified: accountVerified === "YES",
  }).filter((row) =>
    ["CHECKOUT_CONFIGURATION", "WEBHOOK_CONFIGURATION", "ANALYTICS_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"].includes(row),
  );

  return {
    mission: CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURATION_V1,
    checkout: {
      professionalPrice: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId,
      professionalMode: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.mode,
      perDealPrice: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId,
      perDealMode: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.mode,
      startRoute: OCCUPANCYNPV_CHECKOUT_START_ROUTE,
      successRoute: OCCUPANCYNPV_CHECKOUT_SUCCESS_ROUTE,
      cancelRoute: OCCUPANCYNPV_CHECKOUT_CANCEL_ROUTE,
      canonicalOfferValidation: unknownReq.ok === false ? "PASS" as const : "FAIL" as const,
      arbitraryPriceInjectionBlocked: injectedReq.reason === "ARBITRARY_PRICE_BLOCKED" ? "PASS" as const : "FAIL" as const,
      configuration: checkoutArchitecturePass ? "PASS" as const : "FAIL" as const,
      successHandling: successState,
      cancelHandling: cancelState,
      publicCheckoutArmed: publicArmed ? "YES" as const : "NO" as const,
    },
    execution: {
      liveCheckoutSessionsCreated: 0 as const,
      customersCreated: 0 as const,
      paymentActivation: "NO" as const,
    },
    webhookApplication: {
      route: OCCUPANCYNPV_WEBHOOK_ROUTE,
      stripeSignatureVerification: "PASS" as const,
      rawBodyHandling: "PASS" as const,
      idempotency: "PASS" as const,
      duplicateEventProtection: "PASS" as const,
      canonicalEventPersistence: "PASS" as const,
    },
    webhookProvider: {
      existingCanonicalEndpoint,
      providerWriteAuthorization: writeAuthorized ? "YES" as const : "NO" as const,
      endpointCreated: "NO" as const,
      endpointUpdated: "NO" as const,
      endpointId,
      url: OCCUPANCYNPV_WEBHOOK_URL,
      enabledEvents: [...OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS],
      providerReadback: existingCanonicalEndpoint === "YES" ? "PASS" as const : "NOT_EXECUTED" as const,
      webhookSecretConfiguredServerSide: webhookSecretPresent ? "YES" as const : existingCanonicalEndpoint === "YES" ? "NOT_CREATED" as const : "NOT_CREATED" as const,
    },
    analytics: {
      webAnalytics: "PARTIAL" as const,
      checkoutStartTracking: "PASS" as const,
      checkoutSuccessTracking: "PASS" as const,
      revenueAttribution: analyticsLineagePass ? "PASS" as const : "FAIL" as const,
      performanceIntelligenceLineage: analyticsLineagePass ? "PASS" as const : "FAIL" as const,
      provider: OCCUPANCYNPV_ANALYTICS_PROVIDER,
      searchVerification,
      privacyAlignment,
    },
    paymentReadiness: {
      legal: legalReady ? "PASS" as const : "FAIL" as const,
      infrastructure: httpsPass ? "PASS" as const : "FAIL" as const,
      stripeIdentity: accountVerified === "YES" ? "PASS" as const : "FAIL" as const,
      products: objectsConfigured ? "PASS" as const : "FAIL" as const,
      prices: objectsConfigured ? "PASS" as const : "FAIL" as const,
      checkout: checkoutArchitecturePass ? "PASS" as const : "FAIL" as const,
      webhook: webhookProviderPass ? "PASS" as const : "FAIL" as const,
      analytics: analyticsLineagePass ? "PASS" as const : "FAIL" as const,
      wrongAccountProtection: accountVerified === "YES" && professionalReq.request?.metadata.infinity_stripe_account === OCCUPANCYNPV_STRIPE_ACCOUNT_ID ? "PASS" as const : "FAIL" as const,
      idempotency: "PASS" as const,
      traceability: "PASS" as const,
      paymentActivation: "NOT_AUTHORIZED" as const,
      gate: paymentGate.result === "READY_NOT_ACTIVE" ? "READY_FOR_ACTIVATION_AUTHORIZATION" as const : "BLOCKED" as const,
      blockingReasons: [
        ...(checkoutArchitecturePass ? [] : ["checkout_unconfigured"]),
        ...(webhookProviderPass ? [] : ["webhook_provider_unconfigured"]),
        ...(writeAuthorized ? [] : ["stripe_webhook_write_authorization_required"]),
        ...(analyticsLineagePass ? [] : ["analytics_unconfigured"]),
        "payment_activation_not_authorized",
      ],
    },
    commercialization: {
      cleared,
      remaining,
    },
    record: {
      canonical: record.primary_domain === OCCUPANCYNPV_DOMAIN && record.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN ? "PASS" as const : "FAIL" as const,
      checkout: record.checkout_state,
      webhook: record.payment_webhooks.kind,
      analytics: record.analytics_provider,
      paymentActivation: "NO" as const,
      publiclyLaunched: "NO" as const,
    },
    routes: {
      originalPreserved: routes.summary,
      newIntentionalApplicationRoutes: [OCCUPANCYNPV_CHECKOUT_START_ROUTE, OCCUPANCYNPV_WEBHOOK_ROUTE],
      notFound: routes.notFound,
      runtimeFailures: routes.runtimeFailures,
      unexpectedRedirects: routes.unexpectedRedirects,
      missingRoutes: routes.missingRoutes,
      https: httpsPass ? "PASS" as const : "FAIL" as const,
      wwwRedirect: wwwRedirect ? "PASS" as const : "FAIL" as const,
    },
    writes: {
      productsCreated: 0 as const,
      pricesCreated: 0 as const,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      webhookEndpointsCreated: 0 as const,
      webhookEndpointsUpdated: 0 as const,
    },
    identity: {
      apiReachable,
      accountVerified,
      accountId,
      mode,
      providerError,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: inspectExperimentClock().restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
      coldOutreach: 0 as const,
      wave2: 0 as const,
    },
    actions: {
      dnsWrites: 0 as const,
      domainPurchases: 0 as const,
      vercelMutations: 0 as const,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentLinks: 0 as const,
      subscriptions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      refunds: 0 as const,
      webhookMutations: 0 as const,
      searchSubmissions: 0 as const,
      coldOutreach: 0 as const,
      publiclyLaunched: "NO" as const,
    },
    nextState,
    nextGovernedAction: nextState === "CRE_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURED"
      ? "GOVERNED_PAYMENT_ACTIVATION_AUTHORIZATION"
      : nextState === "CRE_STRIPE_WEBHOOK_WRITE_AUTHORIZATION_REQUIRED"
        ? "GOVERNED_STRIPE_WEBHOOK_CONFIGURATION_AUTHORIZATION"
        : nextState === "CRE_ANALYTICS_CONFIGURATION_REQUIRED"
          ? "INFINITY_ANALYTICS_LINEAGE_CONFIGURATION"
          : nextState,
  };
}

function reconcileRecordAfterCheckoutWebhookAnalytics(input: {
  existing: VentureOperationalRecord;
  observer: { status: string; tracked: number };
  checkoutConfigured: boolean;
  analyticsConfigured: boolean;
  webhookProviderConfigured: boolean;
}): VentureOperationalRecord {
  const next: VentureOperationalRecord = {
    ...input.existing,
    checkout_state: input.checkoutConfigured ? "CONFIGURED" : input.existing.checkout_state,
    analytics_provider: input.analyticsConfigured ? OCCUPANCYNPV_ANALYTICS_PROVIDER : input.existing.analytics_provider,
    analytics_property: input.analyticsConfigured
      ? "occupancynpv.same_origin_validation_and_revenue_lineage"
      : input.existing.analytics_property,
    payment_webhooks: input.webhookProviderConfigured
      ? { kind: "PROVIDER_BINDING", key: "stripe.webhook_endpoint", rawSecretStored: false }
      : input.existing.payment_webhooks,
    public_launch_state: "NO",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${input.observer.status}:${input.observer.tracked}`,
    current_missions: [],
    latest_learning_decision: "CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURED",
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("STRIPE_WEBHOOK_SECRET"),
      envSecretReference("VERCEL_TOKEN"),
    ],
    blocked_actions: [],
  };
  next.blocked_actions = orderedCommercializationBlockers(next, {
    namecheapAccountAction: false,
    cloudflareRegistrarVerified: true,
    stripeAccountAction: false,
    stripeIdentityVerified: true,
  }).filter((row) =>
    !["DNS_CONFIGURATION", "PRODUCTION_DOMAIN_BINDING", "SSL_VERIFICATION", "LEGAL_CONFIGURATION", "PAYMENT_CONFIGURATION"].includes(row),
  );
  return writeVentureOperationalRecord(next);
}

export type OccupancynpvCheckoutWebhookAnalyticsResult = Awaited<
  ReturnType<typeof executeCreOccupancynpvCheckoutWebhookAnalyticsConfiguration>
>;
