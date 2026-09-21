import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
import { buildProviderInventory } from "@/lib/infinity/commercialization/probes/inventory";
import { CRE_VENTURE_ID, STRIPE_LINEAGE, STRIPE_PRICING_VERSION } from "./constants";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { reconcileCreCanonicalOffers } from "./stripe-capability";
import type { PaymentReadinessGateResult, ProviderMatrixStatus } from "./types";

export type StripeReadCapability =
  | "account.read"
  | "product.read"
  | "price.read"
  | "webhook.read"
  | "payment.read"
  | "event.read"
  | "balance/revenue.read";

export type StripeOfferBinding = {
  offer: string;
  productId: string | "NONE";
  priceId: string | "NONE";
  livemode: boolean | null;
  currency: string | "UNKNOWN";
  amountUsd: number | "UNKNOWN";
  billingMode: string;
  recurrence: string | null;
  active: boolean | null;
  metadataLinkage: "PASS" | "FAIL" | "NONE";
  readback: "PASS" | "FAIL";
  reused: boolean;
};

export type StripeCommercialConfigurationResult = {
  mission: "CRE_STRIPE_COMMERCIAL_CONFIGURATION_V1";
  connected: "YES" | "NO";
  accountIdentityVerified: "YES" | "NO";
  stripeAccountId: string | "UNKNOWN";
  environment: "LIVE" | "TEST" | "UNKNOWN";
  wrongAccountProtection: "PASS" | "FAIL";
  ventureBinding: "PASS" | "FAIL";
  reads: Record<StripeReadCapability, ProviderMatrixStatus>;
  equivalentProductsFound: number;
  equivalentPricesFound: number;
  duplicatesAvoided: number;
  productsCreated: number;
  pricesCreated: number;
  customers: 0;
  checkoutSessions: 0;
  webhooksCreated: 0;
  paymentIntents: 0;
  realCharges: 0;
  testCharges: 0;
  professional: StripeOfferBinding;
  perDeal: StripeOfferBinding;
  writes: {
    "product.create": ProviderMatrixStatus;
    "price.create": ProviderMatrixStatus;
    "checkout/session.create": ProviderMatrixStatus;
    "webhook.create": ProviderMatrixStatus;
  };
  paymentGate: PaymentReadinessGateResult;
  configurationComplete: boolean;
  activationReady: false;
  activationBlockers: string[];
  writeStoppedReason: string | null;
  webhookState: "WEBHOOK_DOMAIN_DEPENDENCY" | "READ_ONLY_VERIFIED" | "UNVERIFIED";
};

type StripeJson = Record<string, unknown>;

async function stripeJson(
  fetchImpl: typeof fetch,
  key: string,
  method: "GET" | "POST",
  path: string,
  body?: URLSearchParams,
  idempotencyKey?: string,
): Promise<{ ok: boolean; status: number; body: StripeJson }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
  };
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

function metadataOf(row: StripeJson): Record<string, string> {
  const raw = row.metadata;
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]),
  );
}

function offerId(name: "Professional" | "Per-deal"): "professional" | "per_deal" {
  return name === "Professional" ? "professional" : "per_deal";
}

function matchesOffer(row: StripeJson, offer: "Professional" | "Per-deal"): boolean {
  const meta = metadataOf(row);
  return (
    meta.infinity_venture_id === CRE_VENTURE_ID &&
    meta.infinity_offer_id === offerId(offer) &&
    meta.infinity_pricing_version === STRIPE_PRICING_VERSION
  );
}

function safeAccountId(id: string | undefined): string | "UNKNOWN" {
  if (!id || !id.startsWith("acct_")) return "UNKNOWN";
  return id;
}

function emptyBinding(offer: string, billingMode: string, recurrence: string | null): StripeOfferBinding {
  return {
    offer,
    productId: "NONE",
    priceId: "NONE",
    livemode: null,
    currency: "UNKNOWN",
    amountUsd: "UNKNOWN",
    billingMode,
    recurrence,
    active: null,
    metadataLinkage: "NONE",
    readback: "FAIL",
    reused: false,
  };
}

export async function executeCreStripeCommercialConfiguration(input: {
  fetchImpl?: typeof fetch;
  expectedAccountId?: string | null;
  authorizeWrites?: boolean;
} = {}): Promise<StripeCommercialConfigurationResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const authorizeWrites = input.authorizeWrites !== false;
  const inventory = buildProviderInventory();
  const key = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  const environment =
    inventory.payments.environment === "TEST" || inventory.payments.environment === "LIVE"
      ? inventory.payments.environment
      : "UNKNOWN";
  const { offers, consistency } = reconcileCreCanonicalOffers();
  void offers;

  const none = (reason: string): StripeCommercialConfigurationResult => ({
    mission: "CRE_STRIPE_COMMERCIAL_CONFIGURATION_V1",
    connected: key.length > 0 ? "YES" : "NO",
    accountIdentityVerified: "NO",
    stripeAccountId: "UNKNOWN",
    environment,
    wrongAccountProtection: "FAIL",
    ventureBinding: "FAIL",
    reads: {
      "account.read": "UNVERIFIED",
      "product.read": "UNVERIFIED",
      "price.read": "UNVERIFIED",
      "webhook.read": "UNVERIFIED",
      "payment.read": "UNVERIFIED",
      "event.read": "UNVERIFIED",
      "balance/revenue.read": "UNVERIFIED",
    },
    equivalentProductsFound: 0,
    equivalentPricesFound: 0,
    duplicatesAvoided: 0,
    productsCreated: 0,
    pricesCreated: 0,
    customers: 0,
    checkoutSessions: 0,
    webhooksCreated: 0,
    paymentIntents: 0,
    realCharges: 0,
    testCharges: 0,
    professional: emptyBinding("Professional", "RECURRING_ANNUAL", "year"),
    perDeal: emptyBinding("Per-deal", "ONE_TIME", null),
    writes: {
      "product.create": "UNVERIFIED",
      "price.create": "UNVERIFIED",
      "checkout/session.create": "UNVERIFIED",
      "webhook.create": "UNVERIFIED",
    },
    paymentGate: evaluatePaymentReadinessGate({
      stripeConnected: key.length > 0,
      stripeVerification: "UNVERIFIED",
      stripeEnvironment: environment,
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
    activationBlockers: ["stripe_account_identity_unverified", reason, "domain_public_url_unconfigured", "webhook_domain_dependency", "checkout_unverified", "payment_activation_not_authorized"],
    writeStoppedReason: reason,
    webhookState: "WEBHOOK_DOMAIN_DEPENDENCY",
  });

  if (!key) return none("STRIPE_SECRET_KEY_MISSING");

  const account = await stripeJson(fetchImpl, key, "GET", "/v1/account");
  const fallback = account.ok ? account : await stripeJson(fetchImpl, key, "GET", "/v1/accounts?limit=1");
  const accountBody = account.ok
    ? account.body
    : asList(fallback.body)[0] ?? {};
  const accountId = safeAccountId(typeof accountBody.id === "string" ? accountBody.id : undefined);
  const identityVerified = account.ok || (fallback.ok && accountId !== "UNKNOWN");
  if (!identityVerified || accountId === "UNKNOWN") {
    const stopped = none("STRIPE_ACCOUNT_IDENTITY_UNVERIFIED");
    const balance = await stripeJson(fetchImpl, key, "GET", "/v1/balance");
    stopped.connected = balance.ok ? "YES" : stopped.connected;
    stopped.reads["balance/revenue.read"] = balance.ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED";
    stopped.reads["account.read"] = "UNVERIFIED";
    return stopped;
  }

  if (environment !== "LIVE") {
    return { ...none("STRIPE_ENVIRONMENT_NOT_LIVE"), stripeAccountId: accountId, accountIdentityVerified: "YES" };
  }

  const expected = input.expectedAccountId ?? null;
  const wrongAccountProtection: "PASS" | "FAIL" = expected && expected !== accountId ? "FAIL" : "PASS";
  const ventureBinding: "PASS" | "FAIL" = wrongAccountProtection;
  if (wrongAccountProtection === "FAIL") {
    return { ...none("WRONG_STRIPE_ACCOUNT"), stripeAccountId: accountId, accountIdentityVerified: "YES", wrongAccountProtection, ventureBinding };
  }

  const [productsRes, pricesRes, webhooksRes, eventsRes, intentsRes, balanceRes] = await Promise.all([
    stripeJson(fetchImpl, key, "GET", "/v1/products?limit=100"),
    stripeJson(fetchImpl, key, "GET", "/v1/prices?limit=100"),
    stripeJson(fetchImpl, key, "GET", "/v1/webhook_endpoints?limit=10"),
    stripeJson(fetchImpl, key, "GET", "/v1/events?limit=1"),
    stripeJson(fetchImpl, key, "GET", "/v1/payment_intents?limit=1"),
    stripeJson(fetchImpl, key, "GET", "/v1/balance"),
  ]);

  const reads: Record<StripeReadCapability, ProviderMatrixStatus> = {
    "account.read": "READ_ONLY_VERIFIED",
    "product.read": productsRes.ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "price.read": pricesRes.ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "webhook.read": webhooksRes.ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "payment.read": intentsRes.ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "event.read": eventsRes.ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "balance/revenue.read": balanceRes.ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
  };

  const products = asList(productsRes.body);
  const prices = asList(pricesRes.body);
  const professionalProduct = products.find((row) => matchesOffer(row, "Professional"));
  const perDealProduct = products.find((row) => matchesOffer(row, "Per-deal"));
  const professionalPrice = prices.find((row) => matchesOffer(row, "Professional") && row.unit_amount === 29000);
  const perDealPrice = prices.find((row) => matchesOffer(row, "Per-deal") && row.unit_amount === 14900);

  let productsCreated = 0;
  let pricesCreated = 0;
  let productCreate: ProviderMatrixStatus = "UNVERIFIED";
  let priceCreate: ProviderMatrixStatus = "UNVERIFIED";
  let writeStoppedReason: string | null = null;
  let professional = emptyBinding("Professional", "RECURRING_ANNUAL", "year");
  let perDeal = emptyBinding("Per-deal", "ONE_TIME", null);

  const canWrite =
    authorizeWrites &&
    identityVerified &&
    environment === "LIVE" &&
    consistency === "PASS" &&
    wrongAccountProtection === "PASS" &&
    productsRes.ok;

  if (!canWrite) {
    writeStoppedReason = !productsRes.ok
      ? "PRODUCT_READ_REQUIRED_BEFORE_WRITE"
      : consistency === "FAIL"
        ? "CANONICAL_PRICING_INCONSISTENT"
        : "WRITE_GATE_FAILED";
  } else {
    const ensureProduct = async (
      offer: "Professional" | "Per-deal",
      existing: StripeJson | undefined,
      description: string,
    ) => {
      if (existing && typeof existing.id === "string") return { row: existing, created: false };
      if (productsCreated >= 2) return { row: null, created: false };
      const body = new URLSearchParams();
      body.set("name", offer);
      body.set("description", description);
      body.set("metadata[infinity_venture_id]", CRE_VENTURE_ID);
      body.set("metadata[infinity_offer_id]", offerId(offer));
      body.set("metadata[infinity_pricing_version]", STRIPE_PRICING_VERSION);
      body.set("metadata[infinity_lineage]", STRIPE_LINEAGE);
      const created = await stripeJson(
        fetchImpl,
        key,
        "POST",
        "/v1/products",
        body,
        `cre:${CRE_VENTURE_ID}:${offerId(offer)}:product:${STRIPE_PRICING_VERSION}`,
      );
      if (!created.ok || typeof created.body.id !== "string") return { row: null, created: false };
      productsCreated += 1;
      productCreate = "LIVE_WRITE_VERIFIED";
      return { row: created.body, created: true };
    };

    const ensurePrice = async (
      offer: "Professional" | "Per-deal",
      productId: string,
      amount: number,
      recurring: boolean,
      existing: StripeJson | undefined,
    ) => {
      if (existing && typeof existing.id === "string") return { row: existing, created: false };
      if (pricesCreated >= 2) return { row: null, created: false };
      const body = new URLSearchParams();
      body.set("product", productId);
      body.set("unit_amount", String(amount));
      body.set("currency", "usd");
      if (recurring) body.set("recurring[interval]", "year");
      body.set("metadata[infinity_venture_id]", CRE_VENTURE_ID);
      body.set("metadata[infinity_offer_id]", offerId(offer));
      body.set("metadata[infinity_pricing_version]", STRIPE_PRICING_VERSION);
      body.set("metadata[infinity_lineage]", STRIPE_LINEAGE);
      const created = await stripeJson(
        fetchImpl,
        key,
        "POST",
        "/v1/prices",
        body,
        `cre:${CRE_VENTURE_ID}:${offerId(offer)}:price:${STRIPE_PRICING_VERSION}`,
      );
      if (!created.ok || typeof created.body.id !== "string") return { row: null, created: false };
      pricesCreated += 1;
      priceCreate = "LIVE_WRITE_VERIFIED";
      return { row: created.body, created: true };
    };

    const bind = (
      offer: string,
      billingMode: string,
      recurrence: string | null,
      product: StripeJson | null,
      price: StripeJson | null,
      reused: boolean,
    ): StripeOfferBinding => {
      const amount = typeof price?.unit_amount === "number" ? price.unit_amount / 100 : "UNKNOWN";
      const metaPass =
        product && price && matchesOffer(product, offer as "Professional" | "Per-deal") && matchesOffer(price, offer as "Professional" | "Per-deal")
          ? "PASS"
          : product && price
            ? "FAIL"
            : "NONE";
      return {
        offer,
        productId: typeof product?.id === "string" ? product.id : "NONE",
        priceId: typeof price?.id === "string" ? price.id : "NONE",
        livemode: typeof price?.livemode === "boolean" ? price.livemode : typeof product?.livemode === "boolean" ? product.livemode : null,
        currency: typeof price?.currency === "string" ? price.currency.toUpperCase() : "UNKNOWN",
        amountUsd: amount,
        billingMode,
        recurrence,
        active: typeof price?.active === "boolean" ? price.active : null,
        metadataLinkage: metaPass,
        readback: product && price ? "PASS" : "FAIL",
        reused,
      };
    };

    const professionalEnsured = await ensureProduct(
      "Professional",
      professionalProduct,
      "Annual professional access to the CRE lease-comparison product. Validation-stage offer.",
    );
    const perDealEnsured = await ensureProduct(
      "Per-deal",
      perDealProduct,
      "Single-deal access to a CRE lease-comparison report. Validation-stage offer.",
    );
    const professionalPriceEnsured =
      professionalEnsured.row && typeof professionalEnsured.row.id === "string"
        ? await ensurePrice("Professional", professionalEnsured.row.id, 29000, true, professionalPrice)
        : { row: null, created: false };
    const perDealPriceEnsured =
      perDealEnsured.row && typeof perDealEnsured.row.id === "string"
        ? await ensurePrice("Per-deal", perDealEnsured.row.id, 14900, false, perDealPrice)
        : { row: null, created: false };

    professional = bind(
      "Professional",
      "RECURRING_ANNUAL",
      "year",
      professionalEnsured.row,
      professionalPriceEnsured.row,
      Boolean(professionalProduct) && Boolean(professionalPrice),
    );
    perDeal = bind(
      "Per-deal",
      "ONE_TIME",
      null,
      perDealEnsured.row,
      perDealPriceEnsured.row,
      Boolean(perDealProduct) && Boolean(perDealPrice),
    );

    if (professional.productId === "NONE" || perDeal.productId === "NONE") {
      writeStoppedReason = "STRIPE_PRODUCT_WRITE_FAILED_OR_UNPERMITTED";
    }
    if ((professional.priceId === "NONE" || perDeal.priceId === "NONE") && !writeStoppedReason) {
      writeStoppedReason = "STRIPE_PRICE_WRITE_FAILED_OR_UNPERMITTED";
    }
  }

  const equivalentProductsFound = [professionalProduct, perDealProduct].filter(Boolean).length;
  const equivalentPricesFound = [professionalPrice, perDealPrice].filter(Boolean).length;
  const objectsConfigured = professional.readback === "PASS" && perDeal.readback === "PASS";
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: true,
    stripeVerification: "READ_ONLY_VERIFIED",
    stripeEnvironment: environment,
    offersConsistent: consistency === "PASS",
    checkoutArchitecture: true,
    webhookArchitecture: true,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
    domainBound: false,
    legalReady: false,
    objectsConfigured,
  });

  return {
    mission: "CRE_STRIPE_COMMERCIAL_CONFIGURATION_V1",
    connected: "YES",
    accountIdentityVerified: "YES",
    stripeAccountId: accountId,
    environment,
    wrongAccountProtection,
    ventureBinding,
    reads,
    equivalentProductsFound,
    equivalentPricesFound,
    duplicatesAvoided: equivalentProductsFound + equivalentPricesFound,
    productsCreated,
    pricesCreated,
    customers: 0,
    checkoutSessions: 0,
    webhooksCreated: 0,
    paymentIntents: 0,
    realCharges: 0,
    testCharges: 0,
    professional,
    perDeal,
    writes: {
      "product.create": productCreate,
      "price.create": priceCreate,
      "checkout/session.create": "UNVERIFIED",
      "webhook.create": "UNVERIFIED",
    },
    paymentGate,
    configurationComplete: objectsConfigured,
    activationReady: false,
    activationBlockers: [
      "domain_public_url_unconfigured",
      "ssl_unconfigured",
      "checkout/session.create_unverified",
      "WEBHOOK_DOMAIN_DEPENDENCY",
      "payment_activation_not_authorized",
    ],
    writeStoppedReason,
    webhookState: webhooksRes.ok ? "WEBHOOK_DOMAIN_DEPENDENCY" : "UNVERIFIED",
  };
}
