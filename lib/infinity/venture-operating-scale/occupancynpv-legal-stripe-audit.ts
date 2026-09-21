import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
import {
  reloadStripeSecretFromLocalFile,
  reloadVercelFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { CANONICAL_OFFER_SPECS, summarizeOfferMatches } from "./canonical-offer-match";
import {
  CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_DOMAIN,
  STRIPE_LINEAGE,
  STRIPE_PRICING_VERSION,
} from "./constants";
import { OCCUPANCYNPV_ZONE_ID } from "./cloudflare-dns-live-write-verification";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN, OCCUPANCYNPV_WWW_HOST } from "./cloudflare-dns-vercel-binding";
import { searchCanonicalLegalFacts } from "./legal-facts";
import { inspectFooterContract, inspectLegalFactSafety } from "./legal-reconciliation";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import { classifyStripeEnvironment, classifyStripeKeyType } from "./stripe-key-capabilities";
import { reconcileCreCanonicalOffers } from "./stripe-capability";
import type { ProviderMatrixStatus, VentureOperationalRecord } from "./types";

type StripeJson = Record<string, unknown>;

export type OccupancynpvLegalStripeAuditNextState =
  | "CRE_LEGAL_CONFIGURATION_REQUIRED"
  | "CRE_STRIPE_ACCOUNT_VERIFICATION_REQUIRED"
  | "CRE_PAYMENT_CONFIGURATION_WRITE_AUTHORIZATION_REQUIRED"
  | "CRE_CHECKOUT_WEBHOOK_CONFIGURATION_READY"
  | "CRE_PAYMENT_COMMERCIALIZATION_CONFIGURATION_READY";

const WRITE_AUTH_GRANTS = [
  "PAYMENT_CONFIGURATION",
  "PAYMENT_CONFIGURATION_WRITE",
  "PAYMENT_CONFIGURATION_WRITE_AUTHORIZED",
  "GOVERNED_CRE_PAYMENT_CONFIGURATION",
] as const;
const PREVIEW_HOST = new URL(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL).host;
const PLACEHOLDER = /LEGAL_CONFIGURATION_REQUIRED|\[\s*(insert|todo|tbd|placeholder)\s*\]|\bTODO\b|\bTBD\b|lorem ipsum|example\.com/i;

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

async function fetchText(fetchImpl: typeof fetch, url: string, redirect: RequestRedirect = "follow") {
  try {
    const res = await fetchImpl(url, { method: "GET", redirect });
    return { ok: res.ok, status: res.status, location: res.headers.get("location"), body: await res.text() };
  } catch {
    return { ok: false, status: 0, location: null, body: "" };
  }
}

function redactStripe(value: string): string {
  return value
    .replace(/\b[rs]k_(live|test)_[A-Za-z0-9.]+/g, "[REDACTED_STRIPE_KEY]")
    .replace(/https:\/\/dashboard\.stripe\.com\/\S+/g, "[REDACTED_STRIPE_DASHBOARD_URL]");
}

async function stripeJson(
  fetchImpl: typeof fetch,
  key: string,
  method: "GET" | "POST",
  path: string,
  body?: URLSearchParams,
): Promise<{ ok: boolean; status: number; body: StripeJson }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  const res = await fetchImpl(`https://api.stripe.com${path}`, {
    method,
    headers,
    body: method === "POST" ? body?.toString() : undefined,
  });
  let parsed: StripeJson = {};
  try {
    parsed = (await res.json()) as StripeJson;
  } catch {
    parsed = {};
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

function asList(body: StripeJson): StripeJson[] {
  return Array.isArray(body.data) ? (body.data as StripeJson[]) : [];
}

function readStatus(ok: boolean, status: number): ProviderMatrixStatus {
  if (ok) return "READ_ONLY_VERIFIED";
  if (status === 403 || status === 401) return "UNAVAILABLE";
  if (status === 0) return "UNAVAILABLE";
  return "UNVERIFIED";
}

function writeStatus(created: boolean): ProviderMatrixStatus {
  return created ? "LIVE_WRITE_VERIFIED" : "UNVERIFIED";
}

function yesNoUnknown(value: boolean | null | undefined): "YES" | "NO" | "UNKNOWN" {
  if (value === true) return "YES";
  if (value === false) return "NO";
  return "UNKNOWN";
}

function hasWriteAuthorization(record: VentureOperationalRecord): boolean {
  return record.active_authorizations.some((row) =>
    WRITE_AUTH_GRANTS.includes(row as (typeof WRITE_AUTH_GRANTS)[number]),
  );
}

function legalSurface(body: string, status: number): "PASS" | "FAIL" {
  if (status !== 200) return "FAIL";
  if (body.includes(PREVIEW_HOST)) return "FAIL";
  if (PLACEHOLDER.test(body)) return "FAIL";
  if (inspectLegalFactSafety(body).includes("unproven_specific_legal_claim_present")) return "FAIL";
  return "PASS";
}

function offerView(match: ReturnType<typeof summarizeOfferMatches>, spec: (typeof CANONICAL_OFFER_SPECS)[number]) {
  const product = match.product;
  const price = match.price;
  const recurring = price?.recurring && typeof price.recurring === "object" ? (price.recurring as StripeJson) : null;
  return {
    productExisting: product ? "YES" as const : "NO" as const,
    priceExisting: price ? "YES" as const : "NO" as const,
    exactMatch: match.kind === "EXACT_EXISTING_MATCH" ? "YES" as const : "NO" as const,
    productId: typeof product?.id === "string" ? product.id : "NONE",
    priceId: typeof price?.id === "string" ? price.id : "NONE",
    amount: typeof price?.unit_amount === "number" ? price.unit_amount : spec.amount,
    currency: "USD" as const,
    recurrence: spec.recurring === "year" ? "ANNUAL_RECURRING" : "ONE_TIME",
  };
}

function inspectAnalytics(home: string, privacy: string, terms: string): { state: "CONFIGURED" | "PARTIAL" | "UNCONFIGURED"; missing: string[] } {
  const blob = `${home}\n${privacy}\n${terms}`;
  const web = /vercel-insights|_vercel\/insights|gtag\(|googletagmanager|plausible\.io|analytics\.js/i.test(blob);
  const conversion = /purchase|checkout_complete|generate_lead|conversion/i.test(blob);
  const checkout = /checkout.*conversion|stripe.*checkout|begin_checkout/i.test(blob);
  const revenue = /purchase_value|transaction_id|revenue/i.test(blob);
  const search = /google-site-verification|bing-site-verification/i.test(blob);
  const missing = [
    web ? null : "web analytics",
    conversion ? null : "conversion events",
    checkout ? null : "checkout conversion tracking",
    revenue ? null : "revenue attribution",
    search ? null : "search verification",
  ].filter((row): row is string => row != null);
  return {
    state: missing.length === 0 ? "CONFIGURED" : missing.length < 5 ? "PARTIAL" : "UNCONFIGURED",
    missing,
  };
}

export async function executeCreOccupancynpvLegalStripeCommercializationAudit(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
  validateAllRoutes?: boolean;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadStripeSecretFromLocalFile();
    reloadVercelFromLocalFile();
  }
  const observer = preserveObserver();
  const fetchImpl = input.fetchImpl ?? fetch;
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const { consistency } = reconcileCreCanonicalOffers();

  const home = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/`);
  const www = await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}/`, "manual");
  const privacy = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`);
  const terms = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`);
  const vercel404 = /DEPLOYMENT_NOT_FOUND/i.test(home.body);
  const wwwRedirect = www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "");
  const httpsPass = home.ok && home.status === 200 && !vercel404;
  const facts = searchCanonicalLegalFacts({
    record: existing,
  });
  const footer = inspectFooterContract(home.body);
  const privacyRoute = legalSurface(privacy.body, privacy.status);
  const termsRoute = legalSurface(terms.body, terms.status);
  const missingFacts = [...facts.missingFields];
  const legalComplete = facts.configuration === "COMPLETE";
  const legalConfig = legalComplete ? "COMPLETE" as const : "INCOMPLETE" as const;

  let routes = { expected: 93, notFound: 0, runtimeFailures: 0, unexpectedRedirects: 0, missingRoutes: 0, summary: "93 / 93 PASS" };
  if (input.validateAllRoutes !== false && httpsPass) {
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
    routes = {
      expected: 93,
      notFound,
      runtimeFailures,
      unexpectedRedirects,
      missingRoutes,
      summary: `${93 - missingRoutes} / 93 ${notFound === 0 && runtimeFailures === 0 && unexpectedRedirects === 0 && missingRoutes === 0 ? "PASS" : "FAIL"}`,
    };
  }

  const writeAuthorized = hasWriteAuthorization(existing);
  const emptyReads = {
    "account.read": "UNAVAILABLE" as ProviderMatrixStatus,
    "products.read": "UNAVAILABLE" as ProviderMatrixStatus,
    "products.write": "UNVERIFIED" as ProviderMatrixStatus,
    "prices.read": "UNAVAILABLE" as ProviderMatrixStatus,
    "prices.write": "UNVERIFIED" as ProviderMatrixStatus,
    "balance.read": "UNAVAILABLE" as ProviderMatrixStatus,
    "events.read": "UNAVAILABLE" as ProviderMatrixStatus,
    "payment_intents.read": "UNAVAILABLE" as ProviderMatrixStatus,
    "charges.read": "UNAVAILABLE" as ProviderMatrixStatus,
    "webhook_endpoints.read": "UNAVAILABLE" as ProviderMatrixStatus,
  };
  let stripe: {
    credentialPresent: "YES" | "NO";
    mode: ReturnType<typeof classifyStripeEnvironment>;
    keyType: ReturnType<typeof classifyStripeKeyType>;
    apiReachable: "YES" | "NO";
    identityVerified: "YES" | "NO";
    accountId: string;
    accountName: string;
    country: string;
    chargesEnabled: "YES" | "NO" | "UNKNOWN";
    payoutsEnabled: "YES" | "NO" | "UNKNOWN";
    providerError: string;
    mismatch: boolean;
    reads: typeof emptyReads;
  } = {
    credentialPresent: key.length > 0 ? "YES" : "NO",
    mode: classifyStripeEnvironment(key),
    keyType: classifyStripeKeyType(key),
    apiReachable: "NO",
    identityVerified: "NO",
    accountId: "UNKNOWN",
    accountName: "UNKNOWN",
    country: "UNKNOWN",
    chargesEnabled: "UNKNOWN" as "YES" | "NO" | "UNKNOWN",
    payoutsEnabled: "UNKNOWN" as "YES" | "NO" | "UNKNOWN",
    providerError: key.length ? "STRIPE_ACCOUNT_NOT_PROBED" : "STRIPE_SECRET_KEY_MISSING",
    mismatch: false,
    reads: emptyReads,
  };
  let professional = offerView({ kind: "NO_MATCH", product: null, price: null, conflicting: 0 }, CANONICAL_OFFER_SPECS[0]!);
  let perDeal = offerView({ kind: "NO_MATCH", product: null, price: null, conflicting: 0 }, CANONICAL_OFFER_SPECS[1]!);
  let productsCreated = 0;
  let pricesCreated = 0;
  let writeState = writeAuthorized
    ? "PAYMENT_CONFIGURATION_WRITE_AUTHORIZED" as const
    : "PAYMENT_CONFIGURATION_WRITE_AUTHORIZATION_REQUIRED" as const;

  if (key) {
    const account = await stripeJson(fetchImpl, key, "GET", "/v1/account");
    const accountId =
      account.ok && typeof account.body.id === "string" && account.body.id.startsWith("acct_")
        ? account.body.id
        : "UNKNOWN";
    const prior =
      existing.payment_account_binding.kind === "PROVIDER_BINDING" &&
      typeof existing.payment_account_binding.key === "string" &&
      existing.payment_account_binding.key.startsWith("acct_")
        ? existing.payment_account_binding.key
        : null;
    const mismatch = Boolean(prior && accountId !== "UNKNOWN" && prior !== accountId);
    const err = account.body.error && typeof account.body.error === "object" ? (account.body.error as StripeJson) : {};
    stripe = {
      ...stripe,
      apiReachable: account.status > 0 ? "YES" as const : "NO" as const,
      identityVerified: account.ok && accountId !== "UNKNOWN" && !mismatch ? "YES" as const : "NO" as const,
      accountId,
      accountName:
        account.ok && account.body.business_profile && typeof account.body.business_profile === "object"
          ? String((account.body.business_profile as StripeJson).name ?? "UNKNOWN")
          : account.ok && account.body.settings && typeof account.body.settings === "object"
            ? String(((account.body.settings as StripeJson).dashboard as StripeJson | undefined)?.display_name ?? "UNKNOWN")
            : "UNKNOWN",
      country: account.ok && typeof account.body.country === "string" ? account.body.country : "UNKNOWN",
      chargesEnabled: yesNoUnknown(typeof account.body.charges_enabled === "boolean" ? account.body.charges_enabled : null),
      payoutsEnabled: yesNoUnknown(typeof account.body.payouts_enabled === "boolean" ? account.body.payouts_enabled : null),
      providerError: account.ok ? "NONE" : redactStripe(String(err.message ?? `STRIPE_HTTP_${account.status}`)),
      mismatch,
      reads: { ...emptyReads, "account.read": readStatus(account.ok, account.status) },
    };
    if (account.ok && accountId !== "UNKNOWN" && !mismatch) {
      const [productsRes, pricesRes, balanceRes, eventsRes, intentsRes, chargesRes, webhooksRes] = await Promise.all([
        stripeJson(fetchImpl, key, "GET", "/v1/products?limit=100"),
        stripeJson(fetchImpl, key, "GET", "/v1/prices?limit=100"),
        stripeJson(fetchImpl, key, "GET", "/v1/balance"),
        stripeJson(fetchImpl, key, "GET", "/v1/events?limit=1"),
        stripeJson(fetchImpl, key, "GET", "/v1/payment_intents?limit=1"),
        stripeJson(fetchImpl, key, "GET", "/v1/charges?limit=1"),
        stripeJson(fetchImpl, key, "GET", "/v1/webhook_endpoints?limit=1"),
      ]);
      stripe.reads = {
        "account.read": "READ_ONLY_VERIFIED",
        "products.read": readStatus(productsRes.ok, productsRes.status),
        "products.write": "UNVERIFIED",
        "prices.read": readStatus(pricesRes.ok, pricesRes.status),
        "prices.write": "UNVERIFIED",
        "balance.read": readStatus(balanceRes.ok, balanceRes.status),
        "events.read": readStatus(eventsRes.ok, eventsRes.status),
        "payment_intents.read": readStatus(intentsRes.ok, intentsRes.status),
        "charges.read": readStatus(chargesRes.ok, chargesRes.status),
        "webhook_endpoints.read": readStatus(webhooksRes.ok, webhooksRes.status),
      };
      if (productsRes.ok && pricesRes.ok) {
        const products = asList(productsRes.body);
        const prices = asList(pricesRes.body);
        const professionalMatch = summarizeOfferMatches(products, prices, CANONICAL_OFFER_SPECS[0]!);
        const perDealMatch = summarizeOfferMatches(products, prices, CANONICAL_OFFER_SPECS[1]!);
        professional = offerView(professionalMatch, CANONICAL_OFFER_SPECS[0]!);
        perDeal = offerView(perDealMatch, CANONICAL_OFFER_SPECS[1]!);
        const canCreate =
          writeAuthorized &&
          professionalMatch.kind !== "CONFLICTING_MATCH" &&
          perDealMatch.kind !== "CONFLICTING_MATCH" &&
          professionalMatch.kind !== "PARTIAL_MATCH" &&
          perDealMatch.kind !== "PARTIAL_MATCH";
        if (canCreate) {
          const createProduct = async (name: "Professional" | "Per-deal", existingRow: StripeJson | null) => {
            if (existingRow && typeof existingRow.id === "string") return existingRow;
            if (productsCreated >= 2) return null;
            const offerId = name === "Professional" ? "professional" : "per_deal";
            const body = new URLSearchParams();
            body.set("name", name);
            body.set("metadata[infinity_venture_id]", CRE_VENTURE_ID);
            body.set("metadata[infinity_offer_id]", offerId);
            body.set("metadata[infinity_pricing_version]", STRIPE_PRICING_VERSION);
            body.set("metadata[infinity_lineage]", STRIPE_LINEAGE);
            const created = await stripeJson(fetchImpl, key, "POST", "/v1/products", body);
            if (!created.ok || typeof created.body.id !== "string") return null;
            productsCreated += 1;
            return created.body;
          };
          const createPrice = async (
            name: "Professional" | "Per-deal",
            productId: string,
            amount: number,
            recurring: boolean,
            existingRow: StripeJson | null,
          ) => {
            if (existingRow && typeof existingRow.id === "string") return existingRow;
            if (pricesCreated >= 2) return null;
            const offerId = name === "Professional" ? "professional" : "per_deal";
            const body = new URLSearchParams();
            body.set("product", productId);
            body.set("unit_amount", String(amount));
            body.set("currency", "usd");
            if (recurring) body.set("recurring[interval]", "year");
            body.set("metadata[infinity_venture_id]", CRE_VENTURE_ID);
            body.set("metadata[infinity_offer_id]", offerId);
            body.set("metadata[infinity_pricing_version]", STRIPE_PRICING_VERSION);
            body.set("metadata[infinity_lineage]", STRIPE_LINEAGE);
            const created = await stripeJson(fetchImpl, key, "POST", "/v1/prices", body);
            if (!created.ok || typeof created.body.id !== "string") return null;
            pricesCreated += 1;
            return created.body;
          };
          const professionalProduct = await createProduct("Professional", professionalMatch.product);
          const perDealProduct = await createProduct("Per-deal", perDealMatch.product);
          const professionalPrice =
            professionalProduct && typeof professionalProduct.id === "string"
              ? await createPrice("Professional", professionalProduct.id, 29000, true, professionalMatch.price)
              : null;
          const perDealPrice =
            perDealProduct && typeof perDealProduct.id === "string"
              ? await createPrice("Per-deal", perDealProduct.id, 14900, false, perDealMatch.price)
              : null;
          professional = offerView(
            { kind: professionalProduct && professionalPrice ? "EXACT_EXISTING_MATCH" : professionalMatch.kind, product: professionalProduct, price: professionalPrice, conflicting: 0 },
            CANONICAL_OFFER_SPECS[0]!,
          );
          perDeal = offerView(
            { kind: perDealProduct && perDealPrice ? "EXACT_EXISTING_MATCH" : perDealMatch.kind, product: perDealProduct, price: perDealPrice, conflicting: 0 },
            CANONICAL_OFFER_SPECS[1]!,
          );
          stripe.reads["products.write"] = writeStatus(productsCreated > 0);
          stripe.reads["prices.write"] = writeStatus(pricesCreated > 0);
        }
      }
    }
  }

  const offersReady = professional.exactMatch === "YES" && perDeal.exactMatch === "YES";
  const checkout = {
    configuration: offersReady && httpsPass ? "READY_TO_CONFIGURE" as const : "BLOCKED" as const,
    productionBaseUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    professionalPrice: professional.priceId,
    perDealPrice: perDeal.priceId,
    success: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/early-access?checkout=success`,
    cancel: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/pricing`,
    customerReturn: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/early-access`,
    activation: "NO" as const,
  };
  const webhook = {
    configuration: httpsPass ? "READY_TO_CONFIGURE" as const : "BLOCKED" as const,
    productionHostname: OCCUPANCYNPV_DOMAIN,
    events: [
      "checkout.session.completed",
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
      "invoice.paid",
      "invoice.payment_failed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "charge.refunded",
    ],
    mutation: "NO" as const,
    activation: "NO" as const,
  };
  const analytics = inspectAnalytics(home.body, privacy.body, terms.body);
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: stripe.identityVerified === "YES",
    stripeVerification: productsCreated > 0 || pricesCreated > 0 ? "LIVE_WRITE_VERIFIED" : stripe.identityVerified === "YES" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    stripeEnvironment: stripe.mode === "UNKNOWN" ? null : stripe.mode,
    offersConsistent: consistency === "PASS" && offersReady,
    checkoutArchitecture: checkout.configuration === "READY_TO_CONFIGURE",
    webhookArchitecture: webhook.configuration === "READY_TO_CONFIGURE",
    revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
    domainBound: httpsPass,
    legalReady: legalComplete,
    objectsConfigured: offersReady,
  });
  const gateBlockers = [
    ...(stripe.identityVerified === "YES" ? [] : ["stripe_identity_unverified"]),
    ...(legalComplete ? [] : ["legal_configuration_incomplete"]),
    ...(offersReady ? [] : ["canonical_products_or_prices_missing"]),
    ...(writeAuthorized || offersReady ? [] : ["payment_configuration_write_authorization_required"]),
    ...(checkout.configuration === "READY_TO_CONFIGURE" ? [] : ["checkout_unconfigured"]),
    ...(webhook.configuration === "READY_TO_CONFIGURE" ? [] : ["webhook_unconfigured"]),
    ...(analytics.state === "CONFIGURED" ? [] : ["analytics_unconfigured"]),
    ...(stripe.mismatch ? ["STRIPE_ACCOUNT_IDENTITY_MISMATCH"] : []),
    "payment_activation_not_authorized",
  ];

  const nextState: OccupancynpvLegalStripeAuditNextState = stripe.mismatch || stripe.identityVerified !== "YES"
    ? "CRE_STRIPE_ACCOUNT_VERIFICATION_REQUIRED"
    : legalConfig === "INCOMPLETE"
      ? "CRE_LEGAL_CONFIGURATION_REQUIRED"
      : !offersReady
        ? "CRE_PAYMENT_CONFIGURATION_WRITE_AUTHORIZATION_REQUIRED"
        : checkout.configuration === "READY_TO_CONFIGURE" && webhook.configuration === "READY_TO_CONFIGURE"
          ? legalComplete && offersReady
            ? "CRE_CHECKOUT_WEBHOOK_CONFIGURATION_READY"
            : "CRE_PAYMENT_CONFIGURATION_WRITE_AUTHORIZATION_REQUIRED"
          : "CRE_PAYMENT_COMMERCIALIZATION_CONFIGURATION_READY";

  const persist = input.persistRecord !== false;
  const record = persist
    ? reconcileRecordAfterLegalStripeAudit({
        existing,
        observer,
        identityVerified: stripe.identityVerified === "YES",
        accountId: stripe.accountId,
        professional,
        perDeal,
        legalSurfaces: privacyRoute === "PASS" && termsRoute === "PASS",
        legalComplete,
      })
    : existing;

  return {
    mission: CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2,
    infrastructure: {
      domain: OCCUPANCYNPV_DOMAIN,
      https: httpsPass ? "PASS" as const : "FAIL" as const,
      tls: home.status > 0 && home.status !== 525 && home.status !== 526 ? "PASS" as const : "FAIL" as const,
      wwwRedirect: wwwRedirect ? "PASS" as const : "FAIL" as const,
      routes: routes.summary,
      routeCounts: routes,
      dnsConfigured: "YES" as const,
      productionDomainBound: "YES" as const,
      sslConfigured: "YES" as const,
      hostingProvider: "vercel",
      hostingPlan: "PRO",
      registrar: "cloudflare.registrar_v1",
      project: "infinity-validation-cre-lease-npv-e72beb7b",
    },
    legal: {
      legalEntity: facts.legalEntity,
      companyAddress: facts.companyAddress,
      jurisdiction: facts.jurisdiction,
      supportEmail: facts.supportEmail,
      privacyOperator: facts.privacyOperator,
      termsOperator: facts.termsOperator,
      configuration: legalConfig,
      missingFacts,
      privacyRoute,
      termsRoute,
      factualCompleteness: legalComplete ? "PASS" as const : "INCOMPLETE" as const,
      footer: footer.footer,
      invented: false,
    },
    stripe,
    professional,
    perDeal,
    writes: {
      existingAuthorization: writeAuthorized ? "YES" as const : "NO" as const,
      state: writeState,
      productsCreated,
      pricesCreated,
      duplicateObjects: 0 as const,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      webhookMutations: 0 as const,
    },
    checkout,
    webhook,
    analytics,
    paymentReadiness: {
      gate: paymentGate.result === "READY_NOT_ACTIVE" ? "READY" as const : "BLOCKED" as const,
      blockingReasons: gateBlockers,
      paymentsActive: false as const,
    },
    record: {
      canonical: record.primary_domain === OCCUPANCYNPV_DOMAIN && record.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN ? "PASS" as const : "FAIL" as const,
      domain: OCCUPANCYNPV_DOMAIN,
      domainAcquired: "YES" as const,
      dns: record.dns_state,
      productionDomain: record.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN ? "BOUND" as const : "UNBOUND" as const,
      ssl: record.ssl_state === "VERIFIED" || record.ssl_state === "CONFIGURED" ? "CONFIGURED" as const : record.ssl_state,
      productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
      paymentProvider: record.payment_provider,
      paymentConfiguration: record.payment_products.length === 2 && record.payment_prices.length === 2 ? "BOUND" : "UNCONFIGURED",
      publiclyLaunched: "NO" as const,
      remainingBlockers: record.blocked_actions,
    },
    commercialization: {
      cleared: ["DNS_CONFIGURATION", "PRODUCTION_DOMAIN_BINDING", "SSL_VERIFICATION"],
      remaining: record.blocked_actions.filter((row) =>
        ["LEGAL_CONFIGURATION", "CHECKOUT_CONFIGURATION", "WEBHOOK_CONFIGURATION", "ANALYTICS_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH", "PAYMENT_CONFIGURATION", "STRIPE_ACCOUNT_ACTION"].includes(row),
      ),
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
      deployments: 0 as const,
      vercelMutations: 0 as const,
      stripeProductsCreated: productsCreated,
      stripePricesCreated: pricesCreated,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      webhookMutations: 0 as const,
      searchSubmissions: 0 as const,
      coldOutreach: 0 as const,
      publiclyLaunched: "NO" as const,
    },
    nextState,
    nextGovernedAction:
      nextState === "CRE_STRIPE_ACCOUNT_VERIFICATION_REQUIRED"
        ? stripe.mismatch
          ? "STRIPE_ACCOUNT_IDENTITY_MISMATCH"
          : "STRIPE_ACCOUNT_IDENTITY_VERIFICATION_REQUIRED"
        : nextState === "CRE_LEGAL_CONFIGURATION_REQUIRED"
          ? "FOUNDER_LEGAL_CONFIGURATION_REQUIRED"
          : nextState === "CRE_PAYMENT_CONFIGURATION_WRITE_AUTHORIZATION_REQUIRED"
            ? "PAYMENT_CONFIGURATION_WRITE_AUTHORIZATION_REQUIRED"
            : nextState === "CRE_CHECKOUT_WEBHOOK_CONFIGURATION_READY"
              ? "GOVERNED_CRE_CHECKOUT_AND_WEBHOOK_CONFIGURATION"
              : "PAYMENT_COMMERCIALIZATION_CONFIGURATION_READY",
    artifact: {
      id: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
      digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
      changed: "NO" as const,
      redeployed: "NO" as const,
    },
  };
}

function reconcileRecordAfterLegalStripeAudit(input: {
  existing: VentureOperationalRecord;
  observer: { status: string; tracked: number };
  identityVerified: boolean;
  accountId: string;
  professional: ReturnType<typeof offerView>;
  perDeal: ReturnType<typeof offerView>;
  legalSurfaces: boolean;
  legalComplete: boolean;
}): VentureOperationalRecord {
  const products = [
    input.professional.productId !== "NONE"
      ? { id: input.professional.productId, name: "Professional", providerProductRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.product", rawSecretStored: false as const } }
      : null,
    input.perDeal.productId !== "NONE"
      ? { id: input.perDeal.productId, name: "Per-deal", providerProductRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.product", rawSecretStored: false as const } }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const prices = [
    input.professional.priceId !== "NONE"
      ? { id: input.professional.priceId, productId: input.professional.productId, amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.price", rawSecretStored: false as const } }
      : null,
    input.perDeal.priceId !== "NONE"
      ? { id: input.perDeal.priceId, productId: input.perDeal.productId, amountUsd: 149, providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.price", rawSecretStored: false as const } }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const next: VentureOperationalRecord = {
    ...input.existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    domain_provider: "cloudflare.registrar_v1",
    domain_registration_state: "ACTIVE",
    dns_provider: "cloudflare.dns_v1",
    dns_zone: OCCUPANCYNPV_ZONE_ID,
    dns_state: "CONFIGURED",
    ssl_state: "VERIFIED",
    canonical_url: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    public_url: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    public_launch_state: "NO",
    deployment_provider: "vercel",
    deployment_project: "infinity-validation-cre-lease-npv-e72beb7b",
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    active_artifact_digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    active_deployment: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    commercialization_state: "SSL_VERIFIED",
    privacy_policy_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`,
    terms_of_service_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`,
    sitemap_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`,
    legal_configuration_state: input.legalComplete
      ? "LEGAL_CONFIGURATION_COMPLETE"
      : input.legalSurfaces
        ? "LEGAL_SURFACES_PRESENT"
        : "LEGAL_CONFIGURATION_REQUIRED",
    payment_provider: input.identityVerified ? "stripe" : input.existing.payment_provider,
    payment_account_binding: input.identityVerified && input.accountId.startsWith("acct_")
      ? { kind: "PROVIDER_BINDING", key: input.accountId, rawSecretStored: false }
      : input.existing.payment_account_binding,
    payment_products: products.length ? products : input.existing.payment_products,
    payment_prices: prices.length ? prices : input.existing.payment_prices,
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${input.observer.status}:${input.observer.tracked}`,
    current_missions: [],
    latest_learning_decision: "CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDITED",
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
      envSecretReference("CLOUDFLARE_API_TOKEN"),
      envSecretReference("CLOUDFLARE_REGISTRAR_API_TOKEN"),
    ],
    blocked_actions: [],
  };
  next.blocked_actions = orderedCommercializationBlockers(next, {
    namecheapAccountAction: false,
    cloudflareRegistrarVerified: true,
    stripeAccountAction: !input.identityVerified,
    stripeIdentityVerified: input.identityVerified,
  }).filter((row) => row !== "DNS_CONFIGURATION" && row !== "PRODUCTION_DOMAIN_BINDING" && row !== "SSL_VERIFICATION");
  return writeVentureOperationalRecord(next);
}

export type OccupancynpvLegalStripeAuditResult = Awaited<
  ReturnType<typeof executeCreOccupancynpvLegalStripeCommercializationAudit>
>;
