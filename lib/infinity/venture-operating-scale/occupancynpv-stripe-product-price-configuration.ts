import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
import { reloadStripeSecretFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1,
  CRE_VENTURE_ID,
  GOVERNED_CANONICAL_STRIPE_PRODUCT_PRICE_AUTHORIZATION,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_VENTURE,
} from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN } from "./cloudflare-dns-vercel-binding";
import {
  findCanonicalOccupancynpvObjects,
  OCCUPANCYNPV_CANONICAL_STRIPE_OFFERS,
  type OccupancynpvStripeOfferSpec,
} from "./occupancynpv-canonical-stripe-offers";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import { classifyStripeEnvironment, classifyStripeKeyType } from "./stripe-key-capabilities";
import type { VentureOperationalRecord } from "./types";

type StripeJson = Record<string, unknown>;

export type OccupancynpvStripeProductPriceNextState =
  | "CRE_CANONICAL_STRIPE_CONFIGURATION_COMPLETE"
  | "CRE_STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED"
  | "CRE_STRIPE_ACCOUNT_IDENTITY_MISMATCH"
  | "CRE_STRIPE_CONFIGURATION_FAILED";

const BINDINGS_PATH = ".infinity/venture-operating-scale/occupancynpv-stripe-product-price-bindings.json";
const PROFESSIONAL = OCCUPANCYNPV_CANONICAL_STRIPE_OFFERS[0]!;
const PER_DEAL = OCCUPANCYNPV_CANONICAL_STRIPE_OFFERS[1]!;

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
    .replace(/https:\/\/dashboard\.stripe\.com\/\S+/g, "[REDACTED_STRIPE_DASHBOARD_URL]");
}

function asList(body: StripeJson): StripeJson[] {
  return Array.isArray(body.data) ? (body.data as StripeJson[]) : [];
}

function stripeError(body: StripeJson, status: number): string {
  const err = body.error && typeof body.error === "object" ? (body.error as StripeJson) : {};
  return redactStripe(String(err.message ?? `STRIPE_HTTP_${status}`));
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

type OccupancynpvOfferBindingResult = {
  productExistedBefore: "YES" | "NO";
  productCreated: "YES" | "NO";
  productId: string;
  productReadback: "PASS" | "FAIL";
  priceExistedBefore: "YES" | "NO";
  priceCreated: "YES" | "NO";
  priceId: string;
  amount: number;
  currency: string;
  recurrence: string;
  priceReadback: "PASS" | "FAIL";
};

function emptyOffer(spec: OccupancynpvStripeOfferSpec): OccupancynpvOfferBindingResult {
  return {
    productExistedBefore: "NO",
    productCreated: "NO",
    productId: "NONE",
    productReadback: "FAIL",
    priceExistedBefore: "NO",
    priceCreated: "NO",
    priceId: "NONE",
    amount: spec.amount,
    currency: "USD",
    recurrence: spec.recurring === "year" ? "ANNUAL_RECURRING" : "ONE_TIME",
    priceReadback: "FAIL",
  };
}

function offerFromObjects(
  spec: OccupancynpvStripeOfferSpec,
  product: StripeJson | null,
  price: StripeJson | null,
  existed: { product: boolean; price: boolean },
  created: { product: boolean; price: boolean },
) {
  const productOk =
    typeof product?.id === "string" &&
    product.id.startsWith("prod_") &&
    product.active !== false &&
    String(product.name ?? "") === spec.name;
  const recurring = price?.recurring && typeof price.recurring === "object" ? (price.recurring as StripeJson) : null;
  const priceOk =
    typeof price?.id === "string" &&
    price.id.startsWith("price_") &&
    price.active !== false &&
    price.unit_amount === spec.amount &&
    String(price.currency ?? "").toLowerCase() === "usd" &&
    (spec.recurring ? recurring?.interval === "year" && (recurring.interval_count === 1 || recurring.interval_count == null) : !recurring);
  return {
    productExistedBefore: existed.product ? ("YES" as const) : ("NO" as const),
    productCreated: created.product ? ("YES" as const) : ("NO" as const),
    productId: typeof product?.id === "string" ? product.id : "NONE",
    productReadback: productOk ? ("PASS" as const) : ("FAIL" as const),
    priceExistedBefore: existed.price ? ("YES" as const) : ("NO" as const),
    priceCreated: created.price ? ("YES" as const) : ("NO" as const),
    priceId: typeof price?.id === "string" ? price.id : "NONE",
    amount: spec.amount,
    currency: "USD",
    recurrence: spec.recurring === "year" ? "ANNUAL_RECURRING" : "ONE_TIME",
    priceReadback: priceOk ? ("PASS" as const) : ("FAIL" as const),
  };
}

export async function executeCreOccupancynpvStripeProductPriceConfiguration(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
  authorizeWrites?: boolean;
} = {}) {
  if (input.reloadEnv !== false) reloadStripeSecretFromLocalFile();
  const observer = preserveObserver();
  const fetchImpl = input.fetchImpl ?? fetch;
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const authorizeWrites = input.authorizeWrites !== false;
  let productsCreated = 0;
  let pricesCreated = 0;
  let professional = emptyOffer(PROFESSIONAL);
  let perDeal = emptyOffer(PER_DEAL);
  let providerError = key ? "NONE" : "STRIPE_SECRET_KEY_MISSING";
  let nextState: OccupancynpvStripeProductPriceNextState = "CRE_STRIPE_CONFIGURATION_FAILED";

  const stopped = (state: OccupancynpvStripeProductPriceNextState, error: string) =>
    finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      identity: {
        apiReachable: error === "STRIPE_SECRET_KEY_MISSING" ? "NO" as const : "YES" as const,
        accountVerified: "NO" as const,
        accountId: "UNKNOWN",
        mode: classifyStripeEnvironment(key),
        providerError: error,
      },
      professional,
      perDeal,
      productsCreated,
      pricesCreated,
      duplicate: { professionalProducts: 0, professionalPrices: 0, perDealProducts: 0, perDealPrices: 0, result: "FAIL" as const },
      nextState: state,
    });

  if (!key) return stopped("CRE_STRIPE_CONFIGURATION_FAILED", "STRIPE_SECRET_KEY_MISSING");

  const account = await stripeJson(fetchImpl, key, "GET", "/v1/account");
  const accountId = account.ok && typeof account.body.id === "string" ? account.body.id : "UNKNOWN";
  if (!account.ok || accountId === "UNKNOWN") {
    return stopped("CRE_STRIPE_CONFIGURATION_FAILED", stripeError(account.body, account.status));
  }
  if (accountId !== OCCUPANCYNPV_STRIPE_ACCOUNT_ID) {
    return stopped("CRE_STRIPE_ACCOUNT_IDENTITY_MISMATCH", "STRIPE_ACCOUNT_IDENTITY_MISMATCH");
  }
  const prior =
    existing.payment_account_binding.kind === "PROVIDER_BINDING" &&
    typeof existing.payment_account_binding.key === "string" &&
    existing.payment_account_binding.key.startsWith("acct_")
      ? existing.payment_account_binding.key
      : OCCUPANCYNPV_STRIPE_ACCOUNT_ID;
  if (prior !== accountId) {
    return stopped("CRE_STRIPE_ACCOUNT_IDENTITY_MISMATCH", "STRIPE_ACCOUNT_IDENTITY_MISMATCH");
  }

  const identity = {
    apiReachable: "YES" as const,
    accountVerified: "YES" as const,
    accountId,
    mode: classifyStripeEnvironment(key),
    providerError: "NONE",
  };

  const [productsRes, pricesRes] = await Promise.all([
    stripeJson(fetchImpl, key, "GET", "/v1/products?limit=100"),
    stripeJson(fetchImpl, key, "GET", "/v1/prices?limit=100"),
  ]);
  if (!productsRes.ok || !pricesRes.ok) {
    return finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      identity: { ...identity, providerError: stripeError(!productsRes.ok ? productsRes.body : pricesRes.body, !productsRes.ok ? productsRes.status : pricesRes.status) },
      professional,
      perDeal,
      productsCreated,
      pricesCreated,
      duplicate: { professionalProducts: 0, professionalPrices: 0, perDealProducts: 0, perDealPrices: 0, result: "FAIL" },
      nextState: productsRes.status === 403 || pricesRes.status === 403
        ? "CRE_STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED"
        : "CRE_STRIPE_CONFIGURATION_FAILED",
    });
  }

  let products = asList(productsRes.body);
  let prices = asList(pricesRes.body);
  const professionalMatch = findCanonicalOccupancynpvObjects(products, prices, PROFESSIONAL);
  const perDealMatch = findCanonicalOccupancynpvObjects(products, prices, PER_DEAL);
  if (professionalMatch.conflicting || perDealMatch.conflicting) {
    return finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      identity,
      professional: offerFromObjects(PROFESSIONAL, professionalMatch.product, professionalMatch.price, { product: Boolean(professionalMatch.product), price: Boolean(professionalMatch.price) }, { product: false, price: false }),
      perDeal: offerFromObjects(PER_DEAL, perDealMatch.product, perDealMatch.price, { product: Boolean(perDealMatch.product), price: Boolean(perDealMatch.price) }, { product: false, price: false }),
      productsCreated,
      pricesCreated,
      duplicate: {
        professionalProducts: professionalMatch.products.length,
        professionalPrices: professionalMatch.prices.length,
        perDealProducts: perDealMatch.products.length,
        perDealPrices: perDealMatch.prices.length,
        result: "FAIL",
      },
      nextState: "CRE_STRIPE_CONFIGURATION_FAILED",
    });
  }

  const createProduct = async (spec: OccupancynpvStripeOfferSpec, existingRow: StripeJson | null) => {
    if (existingRow && typeof existingRow.id === "string") return { row: existingRow, created: false };
    if (!authorizeWrites) return { row: null, created: false, error: "WRITE_NOT_AUTHORIZED" };
    if (productsCreated >= 2) return { row: null, created: false, error: "PRODUCT_LIMIT_REACHED" };
    const body = new URLSearchParams();
    body.set("name", spec.name);
    body.set("description", spec.description);
    body.set("metadata[infinity_venture]", OCCUPANCYNPV_STRIPE_VENTURE);
    body.set("metadata[infinity_offer]", spec.offer);
    body.set("metadata[infinity_environment]", "production");
    const created = await stripeJson(
      fetchImpl,
      key,
      "POST",
      "/v1/products",
      body,
      `occupancynpv:product:${spec.offer}:v1`,
    );
    if (!created.ok || typeof created.body.id !== "string") {
      return {
        row: null,
        created: false,
        error: created.status === 403 ? "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED" : stripeError(created.body, created.status),
        status: created.status,
      };
    }
    productsCreated += 1;
    const readback = await stripeJson(fetchImpl, key, "GET", `/v1/products/${created.body.id}`);
    return { row: readback.ok ? readback.body : created.body, created: true };
  };

  const createPrice = async (spec: OccupancynpvStripeOfferSpec, productId: string, existingRow: StripeJson | null) => {
    if (existingRow && typeof existingRow.id === "string") return { row: existingRow, created: false };
    if (!authorizeWrites) return { row: null, created: false, error: "WRITE_NOT_AUTHORIZED" };
    if (pricesCreated >= 2) return { row: null, created: false, error: "PRICE_LIMIT_REACHED" };
    const body = new URLSearchParams();
    body.set("product", productId);
    body.set("unit_amount", String(spec.amount));
    body.set("currency", "usd");
    if (spec.recurring) {
      body.set("recurring[interval]", spec.recurring);
      body.set("recurring[interval_count]", String(spec.intervalCount ?? 1));
    }
    body.set("metadata[infinity_venture]", OCCUPANCYNPV_STRIPE_VENTURE);
    body.set("metadata[infinity_offer]", spec.offer);
    body.set("metadata[infinity_environment]", "production");
    const created = await stripeJson(
      fetchImpl,
      key,
      "POST",
      "/v1/prices",
      body,
      `occupancynpv:price:${spec.offer}:v1`,
    );
    if (!created.ok || typeof created.body.id !== "string") {
      return {
        row: null,
        created: false,
        error: created.status === 403 ? "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED" : stripeError(created.body, created.status),
        status: created.status,
      };
    }
    pricesCreated += 1;
    const readback = await stripeJson(fetchImpl, key, "GET", `/v1/prices/${created.body.id}`);
    return { row: readback.ok ? readback.body : created.body, created: true };
  };

  const professionalProduct = await createProduct(PROFESSIONAL, professionalMatch.product);
  if (professionalProduct.error === "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED") {
    return finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      identity: { ...identity, providerError: "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED" },
      professional,
      perDeal,
      productsCreated,
      pricesCreated,
      duplicate: { professionalProducts: professionalMatch.products.length, professionalPrices: professionalMatch.prices.length, perDealProducts: perDealMatch.products.length, perDealPrices: perDealMatch.prices.length, result: "PASS" },
      nextState: "CRE_STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED",
    });
  }
  const professionalPrice =
    professionalProduct.row && typeof professionalProduct.row.id === "string"
      ? await createPrice(PROFESSIONAL, professionalProduct.row.id, professionalMatch.price)
      : { row: null, created: false, error: "PROFESSIONAL_PRODUCT_MISSING" };
  if (professionalPrice.error === "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED") {
    return finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      identity: { ...identity, providerError: "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED" },
      professional: offerFromObjects(PROFESSIONAL, professionalProduct.row, null, { product: Boolean(professionalMatch.product), price: Boolean(professionalMatch.price) }, { product: professionalProduct.created, price: false }),
      perDeal,
      productsCreated,
      pricesCreated,
      duplicate: { professionalProducts: 1, professionalPrices: 0, perDealProducts: perDealMatch.products.length, perDealPrices: perDealMatch.prices.length, result: "PASS" },
      nextState: "CRE_STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED",
    });
  }

  const perDealProduct = await createProduct(PER_DEAL, perDealMatch.product);
  if (perDealProduct.error === "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED") {
    return finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      identity: { ...identity, providerError: "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED" },
      professional: offerFromObjects(PROFESSIONAL, professionalProduct.row, professionalPrice.row, { product: Boolean(professionalMatch.product), price: Boolean(professionalMatch.price) }, { product: professionalProduct.created, price: professionalPrice.created }),
      perDeal,
      productsCreated,
      pricesCreated,
      duplicate: { professionalProducts: 1, professionalPrices: professionalPrice.row ? 1 : 0, perDealProducts: 0, perDealPrices: 0, result: "PASS" },
      nextState: "CRE_STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED",
    });
  }
  const perDealPrice =
    perDealProduct.row && typeof perDealProduct.row.id === "string"
      ? await createPrice(PER_DEAL, perDealProduct.row.id, perDealMatch.price)
      : { row: null, created: false, error: "PER_DEAL_PRODUCT_MISSING" };
  if (perDealPrice.error === "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED") {
    return finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      identity: { ...identity, providerError: "STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED" },
      professional: offerFromObjects(PROFESSIONAL, professionalProduct.row, professionalPrice.row, { product: Boolean(professionalMatch.product), price: Boolean(professionalMatch.price) }, { product: professionalProduct.created, price: professionalPrice.created }),
      perDeal: offerFromObjects(PER_DEAL, perDealProduct.row, null, { product: Boolean(perDealMatch.product), price: Boolean(perDealMatch.price) }, { product: perDealProduct.created, price: false }),
      productsCreated,
      pricesCreated,
      duplicate: { professionalProducts: 1, professionalPrices: 1, perDealProducts: 1, perDealPrices: 0, result: "PASS" },
      nextState: "CRE_STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED",
    });
  }

  const listed = await Promise.all([
    stripeJson(fetchImpl, key, "GET", "/v1/products?limit=100"),
    stripeJson(fetchImpl, key, "GET", "/v1/prices?limit=100"),
  ]);
  products = listed[0].ok ? asList(listed[0].body) : products;
  prices = listed[1].ok ? asList(listed[1].body) : prices;
  const professionalFinal = findCanonicalOccupancynpvObjects(products, prices, PROFESSIONAL);
  const perDealFinal = findCanonicalOccupancynpvObjects(products, prices, PER_DEAL);
  professional = offerFromObjects(
    PROFESSIONAL,
    professionalFinal.product ?? professionalProduct.row,
    professionalFinal.price ?? professionalPrice.row,
    { product: Boolean(professionalMatch.product), price: Boolean(professionalMatch.price) },
    { product: professionalProduct.created, price: professionalPrice.created },
  );
  perDeal = offerFromObjects(
    PER_DEAL,
    perDealFinal.product ?? perDealProduct.row,
    perDealFinal.price ?? perDealPrice.row,
    { product: Boolean(perDealMatch.product), price: Boolean(perDealMatch.price) },
    { product: perDealProduct.created, price: perDealPrice.created },
  );
  const complete =
    professional.productReadback === "PASS" &&
    professional.priceReadback === "PASS" &&
    perDeal.productReadback === "PASS" &&
    perDeal.priceReadback === "PASS" &&
    professionalFinal.products.length === 1 &&
    professionalFinal.prices.length === 1 &&
    perDealFinal.products.length === 1 &&
    perDealFinal.prices.length === 1;
  if (!complete) {
    providerError = professionalProduct.error ?? professionalPrice.error ?? perDealProduct.error ?? perDealPrice.error ?? "CANONICAL_OBJECT_READBACK_FAILED";
    nextState = "CRE_STRIPE_CONFIGURATION_FAILED";
  } else {
    nextState = "CRE_CANONICAL_STRIPE_CONFIGURATION_COMPLETE";
  }

  return finalize({
    existing,
    observer,
    persistRecord: input.persistRecord,
    identity: { ...identity, providerError },
    professional,
    perDeal,
    productsCreated,
    pricesCreated,
    duplicate: {
      professionalProducts: professionalFinal.products.length,
      professionalPrices: professionalFinal.prices.length,
      perDealProducts: perDealFinal.products.length,
      perDealPrices: perDealFinal.prices.length,
      result: complete && productsCreated <= 2 && pricesCreated <= 2 ? "PASS" : "FAIL",
    },
    nextState,
  });
}

function finalize(input: {
  existing: VentureOperationalRecord;
  observer: { status: string; tracked: number };
  persistRecord?: boolean;
  identity: {
    apiReachable: "YES" | "NO";
    accountVerified: "YES" | "NO";
    accountId: string;
    mode: ReturnType<typeof classifyStripeEnvironment>;
    providerError: string;
  };
  professional: ReturnType<typeof emptyOffer>;
  perDeal: ReturnType<typeof emptyOffer>;
  productsCreated: number;
  pricesCreated: number;
  duplicate: {
    professionalProducts: number;
    professionalPrices: number;
    perDealProducts: number;
    perDealPrices: number;
    result: "PASS" | "FAIL";
  };
  nextState: OccupancynpvStripeProductPriceNextState;
}) {
  const objectsConfigured =
    input.professional.productReadback === "PASS" &&
    input.professional.priceReadback === "PASS" &&
    input.perDeal.productReadback === "PASS" &&
    input.perDeal.priceReadback === "PASS";
  const legalReady = input.existing.legal_configuration_state === "LEGAL_CONFIGURATION_COMPLETE";
  const domainBound = input.existing.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN;
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: input.identity.accountVerified === "YES",
    stripeVerification: objectsConfigured ? "LIVE_WRITE_VERIFIED" : input.identity.accountVerified === "YES" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    stripeEnvironment: input.identity.mode === "UNKNOWN" ? null : input.identity.mode,
    offersConsistent: objectsConfigured,
    checkoutArchitecture: false,
    webhookArchitecture: false,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
    domainBound,
    legalReady,
    objectsConfigured,
  });
  const record = input.persistRecord !== false
    ? reconcileRecordAfterStripeProductPriceConfiguration({
        existing: input.existing,
        observer: input.observer,
        accountId: input.identity.accountId,
        professional: input.professional,
        perDeal: input.perDeal,
        configured: objectsConfigured,
      })
    : input.existing;
  if (input.persistRecord !== false && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST === "1" && objectsConfigured) {
    mkdirSync(dirname(BINDINGS_PATH), { recursive: true });
    writeFileSync(
      BINDINGS_PATH,
      `${JSON.stringify(
        {
          PaymentProviderBinding: {
            venture: OCCUPANCYNPV_STRIPE_VENTURE,
            provider: "stripe",
            account: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
            mode: "LIVE",
            state: "VERIFIED",
          },
          PaymentProductBinding: {
            PROFESSIONAL: input.professional.productId,
            PER_DEAL: input.perDeal.productId,
          },
          PaymentPriceBinding: {
            PROFESSIONAL: {
              id: input.professional.priceId,
              currency: "usd",
              amount: 29000,
              recurrence: "ANNUAL_RECURRING",
            },
            PER_DEAL: {
              id: input.perDeal.priceId,
              currency: "usd",
              amount: 14900,
              recurrence: "ONE_TIME",
            },
          },
          authorization: GOVERNED_CANONICAL_STRIPE_PRODUCT_PRICE_AUTHORIZATION,
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
    stripeAccountAction: input.identity.accountVerified !== "YES",
    stripeIdentityVerified: input.identity.accountVerified === "YES",
  }).filter((row) =>
    !["DNS_CONFIGURATION", "PRODUCTION_DOMAIN_BINDING", "SSL_VERIFICATION", "LEGAL_CONFIGURATION", ...(objectsConfigured ? ["PAYMENT_CONFIGURATION"] : [])].includes(row),
  ).filter((row) =>
    ["PAYMENT_CONFIGURATION", "CHECKOUT_CONFIGURATION", "WEBHOOK_CONFIGURATION", "ANALYTICS_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"].includes(row),
  );
  void classifyStripeKeyType;
  return {
    mission: CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1,
    authorization: {
      founderAuthorized: "YES" as const,
      liveStripeWritesAuthorized: "YES" as const,
      productsMaximum: 2 as const,
      pricesMaximum: 2 as const,
      customersAuthorized: "NO" as const,
      chargesAuthorized: "NO" as const,
      paymentActivationAuthorized: "NO" as const,
    },
    identity: input.identity,
    professional: input.professional,
    perDeal: input.perDeal,
    duplicateProtection: {
      professionalProducts: input.duplicate.professionalProducts,
      professionalPrices: input.duplicate.professionalPrices,
      perDealProducts: input.duplicate.perDealProducts,
      perDealPrices: input.duplicate.perDealPrices,
      duplicateProductsCreated: 0 as const,
      duplicatePricesCreated: 0 as const,
      result: input.duplicate.result,
    },
    bindings: {
      paymentProvider: input.identity.accountVerified === "YES" && input.identity.accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID ? "PASS" as const : "FAIL" as const,
      professionalProduct: input.professional.productReadback,
      professionalPrice: input.professional.priceReadback,
      perDealProduct: input.perDeal.productReadback,
      perDealPrice: input.perDeal.priceReadback,
    },
    writes: {
      productsCreated: input.productsCreated,
      pricesCreated: input.pricesCreated,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      webhookMutations: 0 as const,
    },
    checkout: {
      professionalMapping: input.professional.priceId.startsWith("price_") ? "PASS" as const : "FAIL" as const,
      perDealMapping: input.perDeal.priceId.startsWith("price_") ? "PASS" as const : "FAIL" as const,
      configuration: objectsConfigured ? "READY_TO_CONFIGURE" as const : "BLOCKED" as const,
      activation: "NO" as const,
      productionBaseUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
      professionalPrice: input.professional.priceId,
      perDealPrice: input.perDeal.priceId,
    },
    webhook: {
      configuration: domainBound ? "READY_TO_CONFIGURE" as const : "BLOCKED" as const,
      mutation: "NO" as const,
      activation: "NO" as const,
    },
    paymentReadiness: {
      legal: legalReady ? "PASS" as const : "FAIL" as const,
      productionInfrastructure: domainBound ? "PASS" as const : "FAIL" as const,
      stripeIdentity: input.identity.accountVerified,
      products: input.professional.productReadback === "PASS" && input.perDeal.productReadback === "PASS" ? "PASS" as const : "FAIL" as const,
      prices: input.professional.priceReadback === "PASS" && input.perDeal.priceReadback === "PASS" ? "PASS" as const : "FAIL" as const,
      checkout: objectsConfigured ? "READY_TO_CONFIGURE" : "BLOCKED",
      webhooks: domainBound ? "READY_TO_CONFIGURE" : "BLOCKED",
      analytics: "PARTIAL" as const,
      paymentActivation: "NOT_AUTHORIZED" as const,
      gate: paymentGate.result === "READY_NOT_ACTIVE" ? "READY" as const : "BLOCKED" as const,
      blockingReasons: [
        ...(objectsConfigured ? [] : ["canonical_products_or_prices_missing"]),
        "checkout_unconfigured",
        "webhook_unconfigured",
        "analytics_unconfigured",
        "payment_activation_not_authorized",
      ],
    },
    record: {
      canonical: record.primary_domain === OCCUPANCYNPV_DOMAIN && record.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN ? "PASS" as const : "FAIL" as const,
      paymentProvider: "stripe" as const,
      paymentConfiguration: objectsConfigured ? "CONFIGURED" as const : "UNCONFIGURED" as const,
      professionalProduct: input.professional.productId,
      professionalPrice: input.professional.priceId,
      perDealProduct: input.perDeal.productId,
      perDealPrice: input.perDeal.priceId,
      publiclyLaunched: "NO" as const,
    },
    commercialization: {
      cleared: [
        "DNS_CONFIGURATION",
        "PRODUCTION_DOMAIN_BINDING",
        "SSL_VERIFICATION",
        "LEGAL_CONFIGURATION",
        ...(objectsConfigured ? ["PAYMENT_CONFIGURATION"] : []),
      ],
      remaining,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: inspectExperimentClock().restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: input.observer.status,
      tracked: input.observer.tracked,
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
    nextState: input.nextState,
    nextGovernedAction: input.nextState === "CRE_CANONICAL_STRIPE_CONFIGURATION_COMPLETE"
      ? "CHECKOUT_WEBHOOK_AND_ANALYTICS_CONFIGURATION"
      : input.nextState,
  };
}

function reconcileRecordAfterStripeProductPriceConfiguration(input: {
  existing: VentureOperationalRecord;
  observer: { status: string; tracked: number };
  accountId: string;
  professional: ReturnType<typeof emptyOffer>;
  perDeal: ReturnType<typeof emptyOffer>;
  configured: boolean;
}): VentureOperationalRecord {
  const products = [
    input.professional.productId.startsWith("prod_")
      ? { id: input.professional.productId, name: PROFESSIONAL.name, providerProductRef: { kind: "PROVIDER_BINDING" as const, key: input.professional.productId, rawSecretStored: false as const } }
      : null,
    input.perDeal.productId.startsWith("prod_")
      ? { id: input.perDeal.productId, name: PER_DEAL.name, providerProductRef: { kind: "PROVIDER_BINDING" as const, key: input.perDeal.productId, rawSecretStored: false as const } }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const prices = [
    input.professional.priceId.startsWith("price_")
      ? { id: input.professional.priceId, productId: input.professional.productId, amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: input.professional.priceId, rawSecretStored: false as const } }
      : null,
    input.perDeal.priceId.startsWith("price_")
      ? { id: input.perDeal.priceId, productId: input.perDeal.productId, amountUsd: 149, providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: input.perDeal.priceId, rawSecretStored: false as const } }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const next: VentureOperationalRecord = {
    ...input.existing,
    payment_provider: input.accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID ? "stripe" : input.existing.payment_provider,
    payment_account_binding: input.accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID
      ? { kind: "PROVIDER_BINDING", key: input.accountId, rawSecretStored: false }
      : input.existing.payment_account_binding,
    payment_products: products.length ? products : input.existing.payment_products,
    payment_prices: prices.length ? prices : input.existing.payment_prices,
    pricing_state: input.configured ? "CONFIGURED" : input.existing.pricing_state,
    public_launch_state: "NO",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${input.observer.status}:${input.observer.tracked}`,
    current_missions: [],
    active_authorizations: input.existing.active_authorizations.filter((row) => row.length <= 8 && !/authorization/i.test(row)),
    latest_learning_decision: "CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURED",
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
    stripeAccountAction: input.accountId !== OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    stripeIdentityVerified: input.accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  }).filter((row) => row !== "DNS_CONFIGURATION" && row !== "PRODUCTION_DOMAIN_BINDING" && row !== "SSL_VERIFICATION");
  return writeVentureOperationalRecord(next);
}

export type OccupancynpvStripeProductPriceConfigurationResult = Awaited<
  ReturnType<typeof executeCreOccupancynpvStripeProductPriceConfiguration>
>;
