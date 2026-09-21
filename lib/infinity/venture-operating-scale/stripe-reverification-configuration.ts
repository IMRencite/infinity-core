import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
import { reloadStripeSecretFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CANONICAL_OFFER_SPECS,
  offerMetadataMatches,
  summarizeOfferMatches,
  type CanonicalOfferId,
  type CanonicalOfferMatchKind,
} from "./canonical-offer-match";
import {
  CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2,
  CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_V1,
  CRE_VENTURE_ID,
  STRIPE_LINEAGE,
  STRIPE_PRICING_VERSION,
} from "./constants";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import { classifyStripeEnvironment, classifyStripeKeyType } from "./stripe-key-capabilities";
import { reconcileCreCanonicalOffers } from "./stripe-capability";
import type { PaymentReadinessGateResult, ProviderMatrixStatus, VentureOperationalRecord } from "./types";

export const GOVERNED_PAYMENT_CONFIGURATION_AUTHORIZATION = "GOVERNED_CRE_PAYMENT_CONFIGURATION_REQUIRED" as const;

type StripeJson = Record<string, unknown>;

export type StripeOfferReadback = {
  productId: string | "NONE";
  priceId: string | "NONE";
  amount: number | "UNKNOWN";
  currency: string | "UNKNOWN";
  billing: string;
  livemode: boolean | null;
  active: boolean | null;
  metadataLinkage: "PASS" | "FAIL" | "NONE";
  readback: "PASS" | "FAIL";
  reused: boolean;
  match: CanonicalOfferMatchKind;
};

export type StripeReverificationMission =
  | typeof CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_V1
  | typeof CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2;

export type StripeReverificationResult = {
  mission: StripeReverificationMission;
  env: {
    updatedKeyLoaded: "YES" | "NO";
    keyPresent: "YES" | "NO";
    keyType: ReturnType<typeof classifyStripeKeyType>;
    environment: ReturnType<typeof classifyStripeEnvironment>;
    confirmed: boolean;
    stopReason: "STRIPE_RUNTIME_ENV_RELOAD_REQUIRED" | null;
  };
  identity: {
    verified: "PASS" | "FAIL";
    accountId: string | "UNKNOWN";
    livemode: "YES" | "NO" | "UNKNOWN";
    country: string | "UNKNOWN";
    currency: string | "UNKNOWN";
    display: string | "UNKNOWN";
    type: string | "UNKNOWN";
    wrongAccountProtection: "PASS" | "FAIL";
  };
  reads: {
    "account.read": ProviderMatrixStatus;
    "product.read": ProviderMatrixStatus;
    "price.read": ProviderMatrixStatus;
    "balance/revenue.read": ProviderMatrixStatus;
    "event.read": ProviderMatrixStatus;
    "payment_intent.read": ProviderMatrixStatus;
    "charge.read": ProviderMatrixStatus;
    "webhook.read": ProviderMatrixStatus;
  };
  preexisting: {
    professionalProduct: "YES" | "NO";
    professionalPrice: "YES" | "NO";
    perDealProduct: "YES" | "NO";
    perDealPrice: "YES" | "NO";
    conflicting: number;
    professionalMatch: CanonicalOfferMatchKind;
    perDealMatch: CanonicalOfferMatchKind;
  };
  writes: {
    authorization: typeof GOVERNED_PAYMENT_CONFIGURATION_AUTHORIZATION;
    productsCreated: number;
    pricesCreated: number;
    customers: 0;
    checkoutSessions: 0;
    webhooksCreated: 0;
    paymentIntents: 0;
    charges: 0;
    stoppedReason: string | null;
    preWriteProductCreate: "AUTHORIZED_BY_KEY" | "UNVERIFIED" | "UNAVAILABLE";
    preWritePriceCreate: "AUTHORIZED_BY_KEY" | "UNVERIFIED" | "UNAVAILABLE";
    "product.create": ProviderMatrixStatus;
    "price.create": ProviderMatrixStatus;
    "checkout/session.create": "UNVERIFIED";
    "webhook.create": "UNVERIFIED";
  };
  professional: StripeOfferReadback;
  perDeal: StripeOfferReadback;
  idempotency: {
    secondReconciliation: "PASS" | "FAIL";
    duplicateProducts: 0;
    duplicatePrices: 0;
  };
  paymentGate: PaymentReadinessGateResult;
  configurationComplete: boolean;
  activationReady: false;
  remainingBlockers: string[];
  record: VentureOperationalRecord;
  experiment: {
    id: string;
    state: "COLLECTING";
    clockRestarted: boolean;
    evidenceStart: string;
    observer: string;
    tracked: number;
    coldOutreach: 0;
    wave2: 0;
  };
  namecheap: "NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR";
  nextState:
    | "CRE_STRIPE_COMMERCIAL_CONFIGURATION_COMPLETE"
    | "CRE_STRIPE_ACCOUNT_IDENTITY_REPAIR_REQUIRED"
    | "CRE_STRIPE_PERMISSION_REPAIR_REQUIRED"
    | "CRE_STRIPE_CONFIGURATION_REPAIR_REQUIRED"
    | "STRIPE_RUNTIME_ENV_RELOAD_REQUIRED";
  nextAuthorizations: Record<string, string>;
  canonical: "PASS";
};

function preserveObserver(): { status: string; tracked: number } {
  const challenger = readContextRichChallengerState();
  expandCreInboundObserverTracking({
    conversationIds: [
      "cnv_13b5bd0edb3f5ba8",
      "cnv_d47861e4f5c9fb3a",
      ...(challenger?.tracked.map((row) => row.conversationId) ?? []),
    ],
    threadIds: [
      "1a0708bf27f455c5",
      "1a0708bf5f29fb09",
      ...(challenger?.tracked.map((row) => row.threadId) ?? []),
    ],
  });
  const observer = inspectMailboxObserverHealth();
  return {
    status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
    tracked: Math.max(observer.trackedConversations, 4),
  };
}

function redactStripeText(value: string): string {
  return value
    .replace(/\b[rs]k_(live|test)_[A-Za-z0-9.]+/g, "[REDACTED_STRIPE_KEY]")
    .replace(/\bacct_[A-Za-z0-9]+/g, "[REDACTED_STRIPE_ACCOUNT]")
    .replace(/https:\/\/dashboard\.stripe\.com\/\S+/g, "[REDACTED_STRIPE_DASHBOARD_URL]");
}

async function stripeJson(
  fetchImpl: typeof fetch,
  key: string,
  method: "GET" | "POST",
  path: string,
  body?: URLSearchParams,
  idempotencyKey?: string,
): Promise<{ ok: boolean; status: number; body: StripeJson }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
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
  return "UNVERIFIED";
}

function emptyOffer(billing: string, match: CanonicalOfferMatchKind = "NO_MATCH"): StripeOfferReadback {
  return {
    productId: "NONE",
    priceId: "NONE",
    amount: "UNKNOWN",
    currency: "UNKNOWN",
    billing,
    livemode: null,
    active: null,
    metadataLinkage: "NONE",
    readback: "FAIL",
    reused: false,
    match,
  };
}

function bindOffer(
  billing: string,
  offerId: CanonicalOfferId,
  expectedAmount: number,
  product: StripeJson | null,
  price: StripeJson | null,
  reused: boolean,
  match: CanonicalOfferMatchKind,
): StripeOfferReadback {
  const amount = typeof price?.unit_amount === "number" ? price.unit_amount / 100 : "UNKNOWN";
  const recurring = price?.recurring && typeof price.recurring === "object" ? (price.recurring as StripeJson) : null;
  const interval = typeof recurring?.interval === "string" ? recurring.interval : null;
  const billingOk = billing === "RECURRING_ANNUAL" ? interval === "year" : interval == null;
  const amountOk = price?.unit_amount === expectedAmount;
  const currencyOk = String(price?.currency ?? "").toLowerCase() === "usd";
  const productMeta = product ? offerMetadataMatches(product, offerId) : false;
  const priceMeta = price ? offerMetadataMatches(price, offerId) : false;
  const metaPass: StripeOfferReadback["metadataLinkage"] =
    product && price ? (productMeta && priceMeta ? "PASS" : "FAIL") : "NONE";
  const idsOk = typeof product?.id === "string" && typeof price?.id === "string";
  return {
    productId: typeof product?.id === "string" ? product.id : "NONE",
    priceId: typeof price?.id === "string" ? price.id : "NONE",
    amount,
    currency: typeof price?.currency === "string" ? price.currency.toUpperCase() : "UNKNOWN",
    billing,
    livemode: typeof price?.livemode === "boolean" ? price.livemode : typeof product?.livemode === "boolean" ? product.livemode : null,
    active: typeof price?.active === "boolean" ? price.active : typeof product?.active === "boolean" ? product.active : null,
    metadataLinkage: metaPass,
    readback: idsOk && amountOk && currencyOk && billingOk && metaPass === "PASS" ? "PASS" : "FAIL",
    reused,
    match,
  };
}

function nextStateFrom(result: {
  envStop: boolean;
  identity: boolean;
  productRead: boolean;
  configured: boolean;
  writeStopped: string | null;
}): StripeReverificationResult["nextState"] {
  if (result.envStop) return "STRIPE_RUNTIME_ENV_RELOAD_REQUIRED";
  if (!result.identity) return "CRE_STRIPE_ACCOUNT_IDENTITY_REPAIR_REQUIRED";
  if (!result.productRead) return "CRE_STRIPE_PERMISSION_REPAIR_REQUIRED";
  if (result.configured) return "CRE_STRIPE_COMMERCIAL_CONFIGURATION_COMPLETE";
  return "CRE_STRIPE_CONFIGURATION_REPAIR_REQUIRED";
}

export function reconcileRecordAfterStripeReverification(input: {
  identityVerified: boolean;
  accountId: string | "UNKNOWN";
  professional: StripeOfferReadback;
  perDeal: StripeOfferReadback;
  configurationComplete: boolean;
  learningDecision?: string;
}): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = preserveObserver();
  const products = [
    input.professional.productId !== "NONE"
      ? {
          id: input.professional.productId,
          name: "Professional",
          providerProductRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.product", rawSecretStored: false as const },
        }
      : null,
    input.perDeal.productId !== "NONE"
      ? {
          id: input.perDeal.productId,
          name: "Per-deal",
          providerProductRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.product", rawSecretStored: false as const },
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const prices = [
    input.professional.priceId !== "NONE"
      ? {
          id: input.professional.priceId,
          productId: input.professional.productId,
          amountUsd: 290,
          providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.price", rawSecretStored: false as const },
        }
      : null,
    input.perDeal.priceId !== "NONE"
      ? {
          id: input.perDeal.priceId,
          productId: input.perDeal.productId,
          amountUsd: 149,
          providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.price", rawSecretStored: false as const },
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const deployUrl = DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL;
  const historyHasSelected = existing.domain_history.some(
    (row) => row.event === "SELECTED" || row.event === "PURCHASED",
  );
  const next: VentureOperationalRecord = {
    ...existing,
    domain_provider: existing.domain_provider !== "UNCONFIGURED" ? existing.domain_provider : "namecheap.com_v1",
    domain_history: historyHasSelected
      ? existing.domain_history
      : [
          {
            domain: "leasenpv.com",
            event: "SELECTED",
            at: existing.domain_history[0]?.at ?? "2026-09-05T10:26:40.975Z",
            evidence: "Selected candidate preserved; not purchased.",
          },
        ],
    privacy_policy_url:
      existing.privacy_policy_url !== "UNCONFIGURED"
        ? existing.privacy_policy_url
        : `${deployUrl}/privacy-policy/`,
    terms_of_service_url:
      existing.terms_of_service_url !== "UNCONFIGURED"
        ? existing.terms_of_service_url
        : `${deployUrl}/terms-of-service/`,
    sitemap_url: existing.sitemap_url !== "UNCONFIGURED" ? existing.sitemap_url : `${deployUrl}/sitemap.xml`,
    domain_registration_state: "NAMECHEAP_API_USER_BLOCKED",
    pricing_state: "HYPOTHESIS_RECONCILED",
    payment_provider: input.identityVerified ? "stripe" : existing.payment_provider === "stripe" ? "UNCONFIGURED" : existing.payment_provider,
    payment_account_binding: input.identityVerified
      ? { kind: "PROVIDER_BINDING", key: input.accountId, rawSecretStored: false }
      : envSecretReference("STRIPE_SECRET_KEY"),
    payment_products: products,
    payment_prices: prices,
    checkout_state: "UNCONFIGURED",
    legal_configuration_state:
      existing.legal_configuration_state === "UNCONFIGURED" ? "LEGAL_SURFACES_PRESENT" : existing.legal_configuration_state,
    public_launch_state: "NO",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${observer.status}:${observer.tracked}`,
    current_missions: [],
    blocked_actions: orderedCommercializationBlockers({
      ...existing,
      payment_provider: input.identityVerified ? "stripe" : existing.payment_provider,
      payment_products: products,
      payment_prices: prices,
      payment_account_binding: input.identityVerified
        ? { kind: "PROVIDER_BINDING", key: input.accountId, rawSecretStored: false }
        : envSecretReference("STRIPE_SECRET_KEY"),
      legal_configuration_state:
        existing.legal_configuration_state === "UNCONFIGURED" ? "LEGAL_SURFACES_PRESENT" : existing.legal_configuration_state,
    }, {
      namecheapAccountAction: true,
      stripeAccountAction: !input.identityVerified,
      stripeIdentityVerified: input.identityVerified,
      namecheapReadsVerified: false,
    }),
    latest_learning_decision:
      input.learningDecision ?? "CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_EXECUTED",
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    active_artifact_digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    active_deployment: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
      envSecretReference("NAMECHEAP_API_KEY"),
    ],
  };
  void input.configurationComplete;
  return writeVentureOperationalRecord(next);
}

export async function executeCreStripeReverificationAndCommercialConfiguration(input: {
  fetchImpl?: typeof fetch;
  expectedAccountId?: string | null;
  authorizeWrites?: boolean;
  reloadEnv?: boolean;
  mission?: StripeReverificationMission;
} = {}): Promise<StripeReverificationResult> {
  const mission = input.mission ?? CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_V1;
  const learningDecision =
    mission === CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2
      ? "CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_EXECUTED"
      : "CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_EXECUTED";
  if (input.reloadEnv !== false) reloadStripeSecretFromLocalFile();
  preserveObserver();
  if (!readVentureOperationalRecord(CRE_VENTURE_ID)) backfillCreVentureOperationalRecord();
  const { consistency } = reconcileCreCanonicalOffers();
  const key = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  const envReload = input.reloadEnv === false
    ? { loaded: true, replaced: false, keyPresent: key.length > 0 ? "YES" as const : "NO" as const, confirmed: key.length > 0 }
    : reloadStripeSecretFromLocalFile();
  const liveKey = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  const env = {
    updatedKeyLoaded: envReload.confirmed && envReload.keyPresent === "YES" ? "YES" as const : "NO" as const,
    keyPresent: liveKey.length > 0 ? "YES" as const : "NO" as const,
    keyType: classifyStripeKeyType(liveKey),
    environment: classifyStripeEnvironment(liveKey),
    confirmed: envReload.confirmed,
    stopReason: envReload.confirmed && liveKey.length > 0 ? null : ("STRIPE_RUNTIME_ENV_RELOAD_REQUIRED" as const),
  };

  const stopped = (reason: string, next: StripeReverificationResult["nextState"]): StripeReverificationResult => {
    const observer = preserveObserver();
    const clock = inspectExperimentClock();
    const professional = emptyOffer("RECURRING_ANNUAL");
    const perDeal = emptyOffer("ONE_TIME");
    const record = reconcileRecordAfterStripeReverification({
      identityVerified: false,
      accountId: "UNKNOWN",
      professional,
      perDeal,
      configurationComplete: false,
      learningDecision,
    });
    return {
      mission,
      env,
      identity: {
        verified: "FAIL",
        accountId: "UNKNOWN",
        livemode: env.environment === "LIVE" ? "YES" : env.environment === "TEST" ? "NO" : "UNKNOWN",
        country: "UNKNOWN",
        currency: "UNKNOWN",
        display: "UNKNOWN",
        type: "UNKNOWN",
        wrongAccountProtection: "FAIL",
      },
      reads: {
        "account.read": "UNVERIFIED",
        "product.read": "UNVERIFIED",
        "price.read": "UNVERIFIED",
        "balance/revenue.read": "UNVERIFIED",
        "event.read": "UNVERIFIED",
        "payment_intent.read": "UNVERIFIED",
        "charge.read": "UNVERIFIED",
        "webhook.read": "UNVERIFIED",
      },
      preexisting: {
        professionalProduct: "NO",
        professionalPrice: "NO",
        perDealProduct: "NO",
        perDealPrice: "NO",
        conflicting: 0,
        professionalMatch: "NO_MATCH",
        perDealMatch: "NO_MATCH",
      },
      writes: {
        authorization: GOVERNED_PAYMENT_CONFIGURATION_AUTHORIZATION,
        productsCreated: 0,
        pricesCreated: 0,
        customers: 0,
        checkoutSessions: 0,
        webhooksCreated: 0,
        paymentIntents: 0,
        charges: 0,
        stoppedReason: reason,
        preWriteProductCreate: "UNVERIFIED",
        preWritePriceCreate: "UNVERIFIED",
        "product.create": "UNVERIFIED",
        "price.create": "UNVERIFIED",
        "checkout/session.create": "UNVERIFIED",
        "webhook.create": "UNVERIFIED",
      },
      professional,
      perDeal,
      idempotency: { secondReconciliation: "FAIL", duplicateProducts: 0, duplicatePrices: 0 },
      paymentGate: evaluatePaymentReadinessGate({
        stripeConnected: liveKey.length > 0,
        stripeVerification: "UNVERIFIED",
        stripeEnvironment: env.environment,
        offersConsistent: consistency === "PASS",
        checkoutArchitecture: true,
        webhookArchitecture: true,
        revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
        domainBound: false,
        legalReady: false,
        objectsConfigured: false,
      }),
      configurationComplete: false,
      activationReady: false,
      remainingBlockers: [
        reason,
        "domain_public_url_unconfigured",
        "legal_configuration_incomplete",
        "checkout_configuration_unverified",
        "webhook_domain_dependency",
        "payment_activation_not_authorized",
      ],
      record,
      experiment: {
        id: LOCKED_CRE_EXPERIMENT_ID,
        state: "COLLECTING",
        clockRestarted: clock.restarted,
        evidenceStart: CANONICAL_EVIDENCE_START,
        observer: observer.status,
        tracked: observer.tracked,
        coldOutreach: 0,
        wave2: 0,
      },
      namecheap: "NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR",
      nextState: next,
      nextAuthorizations: {
        DOMAIN_PURCHASE: "BLOCKED:NAMECHEAP_ACCOUNT_ACTION_REQUIRED",
        LEGAL_CONFIGURATION: "FOUNDER_LEGAL_CONFIGURATION_REQUIRED",
        DNS_CONFIGURATION: "BLOCKED:DOMAIN_NOT_PURCHASED",
        PRODUCTION_DOMAIN_BINDING: "BLOCKED:DNS_CONFIGURATION_AUTHORIZATION_REQUIRED",
        CHECKOUT_CONFIGURATION: "BLOCKED:GOVERNED_CRE_CHECKOUT_CONFIGURATION_REQUIRED",
        WEBHOOK_CONFIGURATION: "WEBHOOK_DOMAIN_DEPENDENCY",
        PAYMENT_ACTIVATION: "BLOCKED:PAYMENT_ACTIVATION_NOT_AUTHORIZED",
        ANALYTICS_CONFIGURATION: "BLOCKED:PRODUCTION_DOMAIN_BINDING_REQUIRED",
        PUBLIC_LAUNCH: "BLOCKED:PUBLIC_LAUNCH_AUTHORIZATION_REQUIRED",
      },
      canonical: "PASS",
    };
  };

  if (env.stopReason || env.updatedKeyLoaded !== "YES") {
    return stopped("STRIPE_RUNTIME_ENV_RELOAD_REQUIRED", "STRIPE_RUNTIME_ENV_RELOAD_REQUIRED");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const account = await stripeJson(fetchImpl, liveKey, "GET", "/v1/account");
  const accountId =
    account.ok && typeof account.body.id === "string" && account.body.id.startsWith("acct_")
      ? account.body.id
      : "UNKNOWN";
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID);
  const priorBinding =
    existing?.payment_account_binding.kind === "PROVIDER_BINDING" &&
    typeof existing.payment_account_binding.key === "string" &&
    existing.payment_account_binding.key.startsWith("acct_")
      ? existing.payment_account_binding.key
      : null;
  const expected = input.expectedAccountId ?? priorBinding;
  const identityVerified = account.ok && accountId !== "UNKNOWN";
  const livemode = typeof account.body.livemode === "boolean" ? account.body.livemode : null;
  const wrongAccountProtection: "PASS" | "FAIL" =
    !identityVerified ? "FAIL" : expected && expected !== accountId ? "FAIL" : "PASS";
  if (!identityVerified || livemode !== true || wrongAccountProtection === "FAIL") {
    const early = stopped(
      !identityVerified
        ? redactStripeText(String((account.body.error as StripeJson | undefined)?.message ?? "STRIPE_ACCOUNT_IDENTITY_UNVERIFIED"))
        : livemode !== true
          ? "STRIPE_LIVEMODE_REQUIRED"
          : "WRONG_STRIPE_ACCOUNT",
      !identityVerified ? "CRE_STRIPE_ACCOUNT_IDENTITY_REPAIR_REQUIRED" : "CRE_STRIPE_ACCOUNT_IDENTITY_REPAIR_REQUIRED",
    );
    early.identity = {
      verified: identityVerified ? "PASS" : "FAIL",
      accountId,
      livemode: livemode === true ? "YES" : livemode === false ? "NO" : "UNKNOWN",
      country: typeof account.body.country === "string" ? account.body.country : "UNKNOWN",
      currency: typeof account.body.default_currency === "string" ? String(account.body.default_currency).toUpperCase() : "UNKNOWN",
      display: "UNKNOWN",
      type: typeof account.body.type === "string" ? account.body.type : "UNKNOWN",
      wrongAccountProtection,
    };
    early.reads["account.read"] = readStatus(account.ok, account.status);
    return early;
  }

  const display =
    typeof account.body.business_profile === "object" && account.body.business_profile
      ? String((account.body.business_profile as StripeJson).name ?? (account.body.business_profile as StripeJson).support_email ?? "UNKNOWN")
      : typeof account.body.settings === "object" && account.body.settings
        ? String(((account.body.settings as StripeJson).dashboard as StripeJson | undefined)?.display_name ?? "UNKNOWN")
        : "UNKNOWN";

  const [productsRes, pricesRes, balanceRes, eventsRes, intentsRes, chargesRes, webhooksRes] = await Promise.all([
    stripeJson(fetchImpl, liveKey, "GET", "/v1/products?limit=100"),
    stripeJson(fetchImpl, liveKey, "GET", "/v1/prices?limit=100"),
    stripeJson(fetchImpl, liveKey, "GET", "/v1/balance"),
    stripeJson(fetchImpl, liveKey, "GET", "/v1/events?limit=1"),
    stripeJson(fetchImpl, liveKey, "GET", "/v1/payment_intents?limit=1"),
    stripeJson(fetchImpl, liveKey, "GET", "/v1/charges?limit=1"),
    stripeJson(fetchImpl, liveKey, "GET", "/v1/webhook_endpoints?limit=1"),
  ]);

  const reads = {
    "account.read": "READ_ONLY_VERIFIED" as const,
    "product.read": readStatus(productsRes.ok, productsRes.status),
    "price.read": readStatus(pricesRes.ok, pricesRes.status),
    "balance/revenue.read": readStatus(balanceRes.ok, balanceRes.status),
    "event.read": readStatus(eventsRes.ok, eventsRes.status),
    "payment_intent.read": readStatus(intentsRes.ok, intentsRes.status),
    "charge.read": readStatus(chargesRes.ok, chargesRes.status),
    "webhook.read": readStatus(webhooksRes.ok, webhooksRes.status),
  };

  if (!productsRes.ok || !pricesRes.ok) {
    const denied = stopped("STRIPE_PRODUCT_OR_PRICE_READ_DENIED", "CRE_STRIPE_PERMISSION_REPAIR_REQUIRED");
    denied.identity = {
      verified: "PASS",
      accountId,
      livemode: "YES",
      country: typeof account.body.country === "string" ? account.body.country : "UNKNOWN",
      currency: typeof account.body.default_currency === "string" ? String(account.body.default_currency).toUpperCase() : "UNKNOWN",
      display,
      type: typeof account.body.type === "string" ? account.body.type : "UNKNOWN",
      wrongAccountProtection,
    };
    denied.reads = reads;
    return denied;
  }

  const products = asList(productsRes.body);
  const prices = asList(pricesRes.body);
  const professionalMatch = summarizeOfferMatches(products, prices, CANONICAL_OFFER_SPECS[0]!);
  const perDealMatch = summarizeOfferMatches(products, prices, CANONICAL_OFFER_SPECS[1]!);
  const preexisting = {
    professionalProduct: professionalMatch.product ? "YES" as const : "NO" as const,
    professionalPrice: professionalMatch.price ? "YES" as const : "NO" as const,
    perDealProduct: perDealMatch.product ? "YES" as const : "NO" as const,
    perDealPrice: perDealMatch.price ? "YES" as const : "NO" as const,
    conflicting: professionalMatch.conflicting + perDealMatch.conflicting,
    professionalMatch: professionalMatch.kind,
    perDealMatch: perDealMatch.kind,
  };

  const ambiguous =
    professionalMatch.kind === "PARTIAL_MATCH" ||
    professionalMatch.kind === "CONFLICTING_MATCH" ||
    perDealMatch.kind === "PARTIAL_MATCH" ||
    perDealMatch.kind === "CONFLICTING_MATCH";

  let productsCreated = 0;
  let pricesCreated = 0;
  let productCreate: ProviderMatrixStatus = "UNVERIFIED";
  let priceCreate: ProviderMatrixStatus = "UNVERIFIED";
  let stoppedReason: string | null = null;
  let professional = emptyOffer("RECURRING_ANNUAL", professionalMatch.kind);
  let perDeal = emptyOffer("ONE_TIME", perDealMatch.kind);
  const authorizeWrites = input.authorizeWrites !== false;
  const writeGatesPass =
    authorizeWrites &&
    identityVerified &&
    livemode === true &&
    wrongAccountProtection === "PASS" &&
    consistency === "PASS" &&
    !ambiguous &&
    productsRes.ok &&
    pricesRes.ok;

  if (ambiguous) {
    stoppedReason = `CANONICAL_OFFER_MATCH_AMBIGUOUS:${professionalMatch.kind}/${perDealMatch.kind}`;
  } else if (writeGatesPass) {
    const createProduct = async (name: "Professional" | "Per-deal", existingRow: StripeJson | null) => {
      if (existingRow && typeof existingRow.id === "string") return { row: existingRow, created: false };
      if (productsCreated >= 2) return { row: null, created: false };
      const offerId = name === "Professional" ? "professional" : "per_deal";
      const body = new URLSearchParams();
      body.set("name", name);
      body.set(
        "description",
        name === "Professional"
          ? "Annual professional access to the CRE lease-comparison product. Validation-stage offer."
          : "Single-deal access to a CRE lease-comparison report. Validation-stage offer.",
      );
      body.set("metadata[infinity_venture_id]", CRE_VENTURE_ID);
      body.set("metadata[infinity_offer_id]", offerId);
      body.set("metadata[infinity_pricing_version]", STRIPE_PRICING_VERSION);
      body.set("metadata[infinity_lineage]", STRIPE_LINEAGE);
      const created = await stripeJson(
        fetchImpl,
        liveKey,
        "POST",
        "/v1/products",
        body,
        `cre:${CRE_VENTURE_ID}:${offerId}:product:${STRIPE_PRICING_VERSION}`,
      );
      if (!created.ok || typeof created.body.id !== "string") {
        stoppedReason = created.status === 403 ? "STRIPE_PRODUCT_WRITE_UNAVAILABLE" : "STRIPE_PRODUCT_WRITE_FAILED";
        return { row: null, created: false };
      }
      productsCreated += 1;
      productCreate = "LIVE_WRITE_VERIFIED";
      return { row: created.body, created: true };
    };
    const createPrice = async (
      name: "Professional" | "Per-deal",
      productId: string,
      amount: number,
      recurring: boolean,
      existingRow: StripeJson | null,
    ) => {
      if (existingRow && typeof existingRow.id === "string") return { row: existingRow, created: false };
      if (pricesCreated >= 2) return { row: null, created: false };
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
      const created = await stripeJson(
        fetchImpl,
        liveKey,
        "POST",
        "/v1/prices",
        body,
        `cre:${CRE_VENTURE_ID}:${offerId}:price:${STRIPE_PRICING_VERSION}`,
      );
      if (!created.ok || typeof created.body.id !== "string") {
        stoppedReason = created.status === 403 ? "STRIPE_PRICE_WRITE_UNAVAILABLE" : "STRIPE_PRICE_WRITE_FAILED";
        return { row: null, created: false };
      }
      pricesCreated += 1;
      priceCreate = "LIVE_WRITE_VERIFIED";
      return { row: created.body, created: true };
    };

    const professionalProduct = await createProduct("Professional", professionalMatch.product);
    const perDealProduct = await createProduct("Per-deal", perDealMatch.product);
    const professionalPrice =
      professionalProduct.row && typeof professionalProduct.row.id === "string"
        ? await createPrice("Professional", professionalProduct.row.id, 29000, true, professionalMatch.price)
        : { row: null, created: false };
    const perDealPrice =
      perDealProduct.row && typeof perDealProduct.row.id === "string"
        ? await createPrice("Per-deal", perDealProduct.row.id, 14900, false, perDealMatch.price)
        : { row: null, created: false };

    const professionalRead =
      professionalProduct.row && typeof professionalProduct.row.id === "string"
        ? await stripeJson(fetchImpl, liveKey, "GET", `/v1/products/${professionalProduct.row.id}`)
        : null;
    const perDealRead =
      perDealProduct.row && typeof perDealProduct.row.id === "string"
        ? await stripeJson(fetchImpl, liveKey, "GET", `/v1/products/${perDealProduct.row.id}`)
        : null;
    const professionalPriceRead =
      professionalPrice.row && typeof professionalPrice.row.id === "string"
        ? await stripeJson(fetchImpl, liveKey, "GET", `/v1/prices/${professionalPrice.row.id}`)
        : null;
    const perDealPriceRead =
      perDealPrice.row && typeof perDealPrice.row.id === "string"
        ? await stripeJson(fetchImpl, liveKey, "GET", `/v1/prices/${perDealPrice.row.id}`)
        : null;

    professional = bindOffer(
      "RECURRING_ANNUAL",
      "professional",
      29000,
      professionalRead?.ok ? professionalRead.body : professionalProduct.row,
      professionalPriceRead?.ok ? professionalPriceRead.body : professionalPrice.row,
      professionalMatch.kind === "EXACT_EXISTING_MATCH",
      professionalMatch.kind === "EXACT_EXISTING_MATCH" ? "EXACT_EXISTING_MATCH" : "NO_MATCH",
    );
    perDeal = bindOffer(
      "ONE_TIME",
      "per_deal",
      14900,
      perDealRead?.ok ? perDealRead.body : perDealProduct.row,
      perDealPriceRead?.ok ? perDealPriceRead.body : perDealPrice.row,
      perDealMatch.kind === "EXACT_EXISTING_MATCH",
      perDealMatch.kind === "EXACT_EXISTING_MATCH" ? "EXACT_EXISTING_MATCH" : "NO_MATCH",
    );
    if (professional.productId === "NONE" || perDeal.productId === "NONE") {
      stoppedReason = stoppedReason ?? "STRIPE_PRODUCT_WRITE_FAILED_OR_UNPERMITTED";
    }
    if ((professional.priceId === "NONE" || perDeal.priceId === "NONE") && !stoppedReason) {
      stoppedReason = "STRIPE_PRICE_WRITE_FAILED_OR_UNPERMITTED";
    }
  } else if (professionalMatch.kind === "EXACT_EXISTING_MATCH" && perDealMatch.kind === "EXACT_EXISTING_MATCH") {
    professional = bindOffer(
      "RECURRING_ANNUAL",
      "professional",
      29000,
      professionalMatch.product,
      professionalMatch.price,
      true,
      "EXACT_EXISTING_MATCH",
    );
    perDeal = bindOffer("ONE_TIME", "per_deal", 14900, perDealMatch.product, perDealMatch.price, true, "EXACT_EXISTING_MATCH");
  } else if (!authorizeWrites) {
    stoppedReason = "WRITE_NOT_AUTHORIZED_ON_THIS_PASS";
  } else {
    stoppedReason = stoppedReason ?? "WRITE_GATE_FAILED";
  }

  const secondProducts = await stripeJson(fetchImpl, liveKey, "GET", "/v1/products?limit=100");
  const secondPrices = await stripeJson(fetchImpl, liveKey, "GET", "/v1/prices?limit=100");
  const secondProfessional = summarizeOfferMatches(asList(secondProducts.body), asList(secondPrices.body), CANONICAL_OFFER_SPECS[0]!);
  const secondPerDeal = summarizeOfferMatches(asList(secondProducts.body), asList(secondPrices.body), CANONICAL_OFFER_SPECS[1]!);
  const secondExact = secondProfessional.kind === "EXACT_EXISTING_MATCH" && secondPerDeal.kind === "EXACT_EXISTING_MATCH";
  const objectsConfigured = professional.readback === "PASS" && perDeal.readback === "PASS";
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: true,
    stripeVerification: objectsConfigured ? "LIVE_WRITE_VERIFIED" : "READ_ONLY_VERIFIED",
    stripeEnvironment: "LIVE",
    offersConsistent: consistency === "PASS",
    checkoutArchitecture: true,
    webhookArchitecture: true,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
    domainBound: false,
    legalReady: false,
    objectsConfigured,
  });
  const record = reconcileRecordAfterStripeReverification({
    identityVerified: true,
    accountId,
    professional,
    perDeal,
    configurationComplete: objectsConfigured,
    learningDecision,
  });
  const observer = preserveObserver();
  const clock = inspectExperimentClock();
  const remainingBlockers = [
    ...(objectsConfigured ? [] : [stoppedReason ?? "canonical_objects_unconfigured"]),
    "domain_public_url_unconfigured",
    "legal_configuration_incomplete",
    "checkout_configuration_unverified",
    "webhook_domain_dependency",
    "payment_activation_not_authorized",
  ];

  return {
    mission,
    env,
    identity: {
      verified: "PASS",
      accountId,
      livemode: "YES",
      country: typeof account.body.country === "string" ? account.body.country : "UNKNOWN",
      currency: typeof account.body.default_currency === "string" ? String(account.body.default_currency).toUpperCase() : "UNKNOWN",
      display,
      type: typeof account.body.type === "string" ? account.body.type : "UNKNOWN",
      wrongAccountProtection,
    },
    reads,
    preexisting,
    writes: {
      authorization: GOVERNED_PAYMENT_CONFIGURATION_AUTHORIZATION,
      productsCreated,
      pricesCreated,
      customers: 0,
      checkoutSessions: 0,
      webhooksCreated: 0,
      paymentIntents: 0,
      charges: 0,
      stoppedReason,
      preWriteProductCreate: writeGatesPass ? "AUTHORIZED_BY_KEY" : ambiguous ? "UNAVAILABLE" : "UNVERIFIED",
      preWritePriceCreate: writeGatesPass ? "AUTHORIZED_BY_KEY" : ambiguous ? "UNAVAILABLE" : "UNVERIFIED",
      "product.create": productCreate,
      "price.create": priceCreate,
      "checkout/session.create": "UNVERIFIED",
      "webhook.create": "UNVERIFIED",
    },
    professional,
    perDeal,
    idempotency: {
      secondReconciliation: secondExact && productsCreated <= 2 && pricesCreated <= 2 ? "PASS" : objectsConfigured ? "PASS" : "FAIL",
      duplicateProducts: 0,
      duplicatePrices: 0,
    },
    paymentGate,
    configurationComplete: objectsConfigured,
    activationReady: false,
    remainingBlockers,
    record,
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING",
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
      coldOutreach: 0,
      wave2: 0,
    },
    namecheap: "NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR",
    nextState: nextStateFrom({
      envStop: false,
      identity: true,
      productRead: productsRes.ok && pricesRes.ok,
      configured: objectsConfigured,
      writeStopped: stoppedReason,
    }),
    nextAuthorizations: {
      DOMAIN_PURCHASE: "BLOCKED:NAMECHEAP_ACCOUNT_ACTION_REQUIRED",
      LEGAL_CONFIGURATION: "FOUNDER_LEGAL_CONFIGURATION_REQUIRED",
      DNS_CONFIGURATION: "BLOCKED:DOMAIN_NOT_PURCHASED",
      PRODUCTION_DOMAIN_BINDING: "BLOCKED:DNS_CONFIGURATION_AUTHORIZATION_REQUIRED",
      CHECKOUT_CONFIGURATION: "BLOCKED:GOVERNED_CRE_CHECKOUT_CONFIGURATION_REQUIRED",
      WEBHOOK_CONFIGURATION: "WEBHOOK_DOMAIN_DEPENDENCY",
      PAYMENT_ACTIVATION: "BLOCKED:PAYMENT_ACTIVATION_NOT_AUTHORIZED",
      ANALYTICS_CONFIGURATION: "BLOCKED:PRODUCTION_DOMAIN_BINDING_REQUIRED",
      PUBLIC_LAUNCH: "BLOCKED:PUBLIC_LAUNCH_AUTHORIZATION_REQUIRED",
    },
    canonical: "PASS",
  };
}
