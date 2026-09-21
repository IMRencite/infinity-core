import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
import type { ExternalConfigurationBlockClass } from "@/lib/infinity/commercialization/providers/namecheap/classify";
import { CRE_VENTURE_ID, STRIPE_PRICING_VERSION } from "./constants";
import { readLiveCommercialCheckoutHealth } from "./occupancynpv-live-checkout-health";
import { occupancynpvPaymentActivationEnabled } from "./occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched } from "./occupancynpv-public-launch-evidence";
import type { ProviderMatrixStatus } from "./types";

export type StripePermissionAnswer = "YES" | "NO" | "UNKNOWN";
export type StripeKeyType = "SECRET" | "RESTRICTED" | "UNKNOWN";
export type StripeLivemodeAnswer = "YES" | "NO" | "UNKNOWN";

export type StripeCapabilityInspection = {
  keyPresent: "YES" | "NO";
  keyType: StripeKeyType;
  environment: "LIVE" | "TEST" | "UNKNOWN";
  livemode: StripeLivemodeAnswer;
  permissions: {
    "account.read": StripePermissionAnswer;
    "product.read": StripePermissionAnswer;
    "product.write": StripePermissionAnswer;
    "price.read": StripePermissionAnswer;
    "price.write": StripePermissionAnswer;
    "checkout.write": StripePermissionAnswer;
    "webhook.read": StripePermissionAnswer;
    "webhook.write": StripePermissionAnswer;
    "event.read": StripePermissionAnswer;
    "payment.read": StripePermissionAnswer;
    "balance.read": StripePermissionAnswer;
  };
  statuses: {
    "account.read": ProviderMatrixStatus;
    "product.read": ProviderMatrixStatus;
    "product.create": ProviderMatrixStatus;
    "price.read": ProviderMatrixStatus;
    "price.create": ProviderMatrixStatus;
    "checkout/session.create": ProviderMatrixStatus;
    "webhook.read": ProviderMatrixStatus;
    "webhook.create": ProviderMatrixStatus;
    "event.read": ProviderMatrixStatus;
    "payment.read": ProviderMatrixStatus;
    "balance/revenue.read": ProviderMatrixStatus;
  };
  account: {
    ok: boolean;
    id: string | "UNKNOWN";
    livemode: boolean | null;
    country: string | "UNKNOWN";
    currency: string | "UNKNOWN";
    display: string | "UNKNOWN";
    errorCode: string | null;
    errorType: string | null;
    safeError: string | null;
    missingPermission: string | null;
  };
  products: Array<Record<string, unknown>>;
  prices: Array<Record<string, unknown>>;
  writeHttpCalls: 0;
  postCalls: 0;
  cause: "RESTRICTED_KEY_MISSING_ACCOUNT_READ" | "ACCOUNT_RETRIEVAL_FAILED" | "KEY_MISSING" | "IDENTITY_VERIFIED" | "OTHER";
  blockClass: ExternalConfigurationBlockClass;
};

export type StripeProviderRepairInstruction = {
  humanActionRequired: "YES" | "NO";
  minimumPermissionChanges: string[];
  futurePermissions: string[];
  preferRestrictedKey: true;
  doNotRequestUnrestrictedKey: true;
  doNotPasteKeyIntoChat: true;
  instructions: string;
};

type StripeJson = Record<string, unknown>;

function redactStripeText(value: string): string {
  return value
    .replace(/\b[rs]k_(live|test)_[A-Za-z0-9]+/g, "[REDACTED_STRIPE_KEY]")
    .replace(/sk_live_|sk_test_|rk_live_|rk_test_/g, "[REDACTED_STRIPE_PREFIX]")
    .replace(/\bacct_[A-Za-z0-9]+/g, "[REDACTED_STRIPE_ACCOUNT]")
    .replace(/\bmk_[A-Za-z0-9]+/g, "[REDACTED_STRIPE_KEY_ID]")
    .replace(/https:\/\/dashboard\.stripe\.com\/\S+/g, "[REDACTED_STRIPE_DASHBOARD_URL]");
}

export function classifyStripeKeyType(key: string): StripeKeyType {
  if (key.startsWith("rk_live_") || key.startsWith("rk_test_")) return "RESTRICTED";
  if (key.startsWith("sk_live_") || key.startsWith("sk_test_")) return "SECRET";
  return "UNKNOWN";
}

export function classifyStripeEnvironment(key: string): "LIVE" | "TEST" | "UNKNOWN" {
  if (key.startsWith("rk_live_") || key.startsWith("sk_live_")) return "LIVE";
  if (key.startsWith("rk_test_") || key.startsWith("sk_test_")) return "TEST";
  return "UNKNOWN";
}

function permissionFromHttp(ok: boolean, status: number, errorCode: string | null): StripePermissionAnswer {
  if (ok && status < 300) return "YES";
  if (status === 403 || errorCode === "more_permissions_needed" || errorCode === "permission_error") return "NO";
  if (status === 401) return "NO";
  return "UNKNOWN";
}

function statusFromPermission(answer: StripePermissionAnswer): ProviderMatrixStatus {
  if (answer === "YES") return "READ_ONLY_VERIFIED";
  if (answer === "NO") return "UNAVAILABLE";
  return "UNVERIFIED";
}

function writeStatusFromPermission(answer: StripePermissionAnswer): ProviderMatrixStatus {
  if (answer === "NO") return "UNAVAILABLE";
  return "UNVERIFIED";
}

function asList(body: StripeJson): StripeJson[] {
  return Array.isArray(body.data) ? (body.data as StripeJson[]) : [];
}

function errorOf(body: StripeJson): { code: string | null; type: string | null; message: string | null; missing: string | null } {
  const raw = body.error;
  const err = raw && typeof raw === "object" ? (raw as StripeJson) : body;
  const message = typeof err.message === "string" ? redactStripeText(err.message) : null;
  const missing =
    message?.match(/Missing permission:\s*`?([a-z0-9_]+)`?/i)?.[1] ??
    message?.match(/Enabling\s+([A-Za-z ]+)\s+\('([a-z0-9_]+)'\)/i)?.[2] ??
    message?.match(/rak_[a-z0-9_]+|connected_account_read/i)?.[0] ??
    null;
  return {
    code: typeof err.code === "string" ? err.code : null,
    type: typeof err.type === "string" ? err.type : null,
    message,
    missing,
  };
}

async function stripeGet(
  fetchImpl: typeof fetch,
  key: string,
  path: string,
): Promise<{ ok: boolean; status: number; body: StripeJson }> {
  const res = await fetchImpl(`https://api.stripe.com${path}`, {
    method: "GET",
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

export function buildStripeProviderRepairInstruction(input: {
  accountRead: StripePermissionAnswer;
  productRead: StripePermissionAnswer;
  productWrite: StripePermissionAnswer;
  priceRead: StripePermissionAnswer;
  priceWrite: StripePermissionAnswer;
}): StripeProviderRepairInstruction {
  const neededNow = [
    input.accountRead !== "YES" ? "Accounts Read / connected_account_read (Stripe Dashboard → restricted key → Accounts → Read)" : null,
    input.productRead !== "YES" ? "rak_product_read (Products → Read)" : null,
    input.productWrite !== "YES" ? "rak_product_write (Products → Write) — needed before authorized commercial writes; not used in this repair" : null,
    input.priceRead !== "YES" ? "rak_price_read (Prices → Read)" : null,
    input.priceWrite !== "YES" ? "rak_price_write (Prices → Write) — needed before authorized commercial writes; not used in this repair" : null,
    occupancynpvPubliclyLaunched() && occupancynpvPaymentActivationEnabled() && readLiveCommercialCheckoutHealth()?.result !== "PASS"
      ? "checkout_session_write (Checkout Sessions → Write) — required for live OccupancyNPV Checkout Session create"
      : null,
  ].filter((row): row is string => row != null);
  return {
    humanActionRequired: neededNow.length > 0 ? "YES" : "NO",
    minimumPermissionChanges: neededNow.length
      ? neededNow
      : ["No additional permissions required for the current read/reverification phase."],
    futurePermissions: [
      "rak_event_read — for webhook/event observation",
      "Charges/PaymentIntents → Read — for payment.read after activation architecture",
    ],
    preferRestrictedKey: true,
    doNotRequestUnrestrictedKey: true,
    doNotPasteKeyIntoChat: true,
    instructions: [
      "Open Stripe Dashboard → Developers → API keys → the existing restricted live key (rk_live_…).",
      "Edit permissions. Enable the minimum current-phase set: Accounts Read, Products Read, Products Write, Prices Read, Prices Write.",
      "OccupancyNPV is PUBLICLY_LAUNCHED with payment activation. Enable Checkout Sessions → Write (checkout_session_write) on the existing restricted live key. Do not replace this key with an unrestricted sk_live_ key.",
      "Do not paste the secret into Cursor or chat. Update only the server-side STRIPE_SECRET_KEY environment value if Stripe rotates the key.",
      "After saving, Infinity will re-run GET /v1/account, then product/price reads, and will not create objects until STRIPE_ACCOUNT_IDENTITY_VERIFIED = PASS.",
    ].join(" "),
  };
}

export function findEquivalentCommercialObjects(input: {
  products: Array<Record<string, unknown>>;
  prices: Array<Record<string, unknown>>;
}): {
  professionalProduct: string | "NONE";
  professionalPrice: string | "NONE";
  perDealProduct: string | "NONE";
  perDealPrice: string | "NONE";
  duplicateRisk: "NONE" | "PRESENT";
} {
  const meta = (row: Record<string, unknown>) => {
    const raw = row.metadata;
    if (!raw || typeof raw !== "object") return {};
    return raw as Record<string, unknown>;
  };
  const matches = (row: Record<string, unknown>, offer: "professional" | "per_deal") => {
    const data = meta(row);
    return (
      data.infinity_venture_id === CRE_VENTURE_ID &&
      data.infinity_offer_id === offer &&
      data.infinity_pricing_version === STRIPE_PRICING_VERSION
    );
  };
  const professionalProducts = input.products.filter((row) => matches(row, "professional") || row.name === "Professional");
  const perDealProducts = input.products.filter((row) => matches(row, "per_deal") || row.name === "Per-deal");
  const professionalPrices = input.prices.filter((row) => matches(row, "professional") || row.unit_amount === 29000);
  const perDealPrices = input.prices.filter((row) => matches(row, "per_deal") || row.unit_amount === 14900);
  const exactProfessionalPrice = input.prices.find((row) => matches(row, "professional") && row.unit_amount === 29000);
  const exactPerDealPrice = input.prices.find((row) => matches(row, "per_deal") && row.unit_amount === 14900);
  const looseProfessional = exactProfessionalPrice ?? professionalPrices.find((row) => row.unit_amount === 29000);
  const loosePerDeal = exactPerDealPrice ?? perDealPrices.find((row) => row.unit_amount === 14900);
  return {
    professionalProduct: typeof professionalProducts[0]?.id === "string" ? professionalProducts[0].id : "NONE",
    professionalPrice: typeof looseProfessional?.id === "string" ? looseProfessional.id : "NONE",
    perDealProduct: typeof perDealProducts[0]?.id === "string" ? perDealProducts[0].id : "NONE",
    perDealPrice: typeof loosePerDeal?.id === "string" ? loosePerDeal.id : "NONE",
    duplicateRisk:
      professionalProducts.length > 1 || perDealProducts.length > 1 || professionalPrices.length > 1 || perDealPrices.length > 1
        ? "PRESENT"
        : "NONE",
  };
}

export async function inspectStripeKeyCapabilities(input: {
  fetchImpl?: typeof fetch;
  key?: string;
} = {}): Promise<StripeCapabilityInspection> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const key = (input.key ?? process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const empty: StripeCapabilityInspection = {
    keyPresent: key.length > 0 ? "YES" : "NO",
    keyType: classifyStripeKeyType(key),
    environment: classifyStripeEnvironment(key),
    livemode: classifyStripeEnvironment(key) === "LIVE" ? "YES" : classifyStripeEnvironment(key) === "TEST" ? "NO" : "UNKNOWN",
    permissions: {
      "account.read": "UNKNOWN",
      "product.read": "UNKNOWN",
      "product.write": "UNKNOWN",
      "price.read": "UNKNOWN",
      "price.write": "UNKNOWN",
      "checkout.write": "UNKNOWN",
      "webhook.read": "UNKNOWN",
      "webhook.write": "UNKNOWN",
      "event.read": "UNKNOWN",
      "payment.read": "UNKNOWN",
      "balance.read": "UNKNOWN",
    },
    statuses: {
      "account.read": "UNVERIFIED",
      "product.read": "UNVERIFIED",
      "product.create": "UNVERIFIED",
      "price.read": "UNVERIFIED",
      "price.create": "UNVERIFIED",
      "checkout/session.create": "UNVERIFIED",
      "webhook.read": "UNVERIFIED",
      "webhook.create": "UNVERIFIED",
      "event.read": "UNVERIFIED",
      "payment.read": "UNVERIFIED",
      "balance/revenue.read": "UNVERIFIED",
    },
    account: {
      ok: false,
      id: "UNKNOWN",
      livemode: null,
      country: "UNKNOWN",
      currency: "UNKNOWN",
      display: "UNKNOWN",
      errorCode: null,
      errorType: null,
      safeError: key.length ? "STRIPE_SECRET_KEY_PRESENT_BUT_UNPROBED" : "STRIPE_SECRET_KEY_MISSING",
      missingPermission: null,
    },
    products: [],
    prices: [],
    writeHttpCalls: 0,
    postCalls: 0,
    cause: key.length ? "OTHER" : "KEY_MISSING",
    blockClass: key.length ? "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED" : "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
  };
  if (!key) return empty;

  const [account, products, prices, webhooks, events, payments, balance] = await Promise.all([
    stripeGet(fetchImpl, key, "/v1/account"),
    stripeGet(fetchImpl, key, "/v1/products?limit=100"),
    stripeGet(fetchImpl, key, "/v1/prices?limit=100"),
    stripeGet(fetchImpl, key, "/v1/webhook_endpoints?limit=1"),
    stripeGet(fetchImpl, key, "/v1/events?limit=1"),
    stripeGet(fetchImpl, key, "/v1/payment_intents?limit=1"),
    stripeGet(fetchImpl, key, "/v1/balance"),
  ]);

  const accountErr = errorOf(account.body);
  const productErr = errorOf(products.body);
  const priceErr = errorOf(prices.body);
  const webhookErr = errorOf(webhooks.body);
  const eventErr = errorOf(events.body);
  const paymentErr = errorOf(payments.body);
  const balanceErr = errorOf(balance.body);

  const permissions: StripeCapabilityInspection["permissions"] = {
    "account.read": permissionFromHttp(account.ok, account.status, accountErr.code),
    "product.read": permissionFromHttp(products.ok, products.status, productErr.code),
    "product.write": "UNKNOWN",
    "price.read": permissionFromHttp(prices.ok, prices.status, priceErr.code),
    "price.write": "UNKNOWN",
    "checkout.write": "UNKNOWN",
    "webhook.read": permissionFromHttp(webhooks.ok, webhooks.status, webhookErr.code),
    "webhook.write": "UNKNOWN",
    "event.read": permissionFromHttp(events.ok, events.status, eventErr.code),
    "payment.read": permissionFromHttp(payments.ok, payments.status, paymentErr.code),
    "balance.read": permissionFromHttp(balance.ok, balance.status, balanceErr.code),
  };

  const accountId =
    account.ok && typeof account.body.id === "string" && account.body.id.startsWith("acct_")
      ? account.body.id
      : "UNKNOWN";
  const livemode = typeof account.body.livemode === "boolean"
    ? account.body.livemode
    : typeof balance.body.livemode === "boolean"
      ? (balance.body.livemode as boolean)
      : null;
  const country = account.ok && typeof account.body.country === "string" ? account.body.country : "UNKNOWN";
  const currency =
    account.ok && typeof account.body.default_currency === "string"
      ? String(account.body.default_currency).toUpperCase()
      : "UNKNOWN";
  const display =
    account.ok && typeof account.body.business_profile === "object" && account.body.business_profile
      ? String((account.body.business_profile as StripeJson).name ?? (account.body.business_profile as StripeJson).support_email ?? "UNKNOWN")
      : account.ok && typeof account.body.settings === "object" && account.body.settings
        ? String(((account.body.settings as StripeJson).dashboard as StripeJson | undefined)?.display_name ?? "UNKNOWN")
        : "UNKNOWN";

  const missingAccount = permissions["account.read"] === "NO";
  const cause =
    missingAccount &&
    (accountErr.code === "more_permissions_needed" ||
      accountErr.code === "more_permissions_required" ||
      /rak_account_read|connected_account_read|Accounts Read|account.read/i.test(accountErr.message ?? ""))
      ? "RESTRICTED_KEY_MISSING_ACCOUNT_READ"
      : missingAccount
        ? "ACCOUNT_RETRIEVAL_FAILED"
        : account.ok
          ? "IDENTITY_VERIFIED"
          : "OTHER";

  return {
    keyPresent: "YES",
    keyType: classifyStripeKeyType(key),
    environment: classifyStripeEnvironment(key),
    livemode: livemode === true ? "YES" : livemode === false ? "NO" : empty.livemode,
    permissions,
    statuses: {
      "account.read": statusFromPermission(permissions["account.read"]),
      "product.read": statusFromPermission(permissions["product.read"]),
      "product.create": writeStatusFromPermission(permissions["product.write"]),
      "price.read": statusFromPermission(permissions["price.read"]),
      "price.create": writeStatusFromPermission(permissions["price.write"]),
      "checkout/session.create": writeStatusFromPermission(permissions["checkout.write"]),
      "webhook.read": statusFromPermission(permissions["webhook.read"]),
      "webhook.create": writeStatusFromPermission(permissions["webhook.write"]),
      "event.read": statusFromPermission(permissions["event.read"]),
      "payment.read": statusFromPermission(permissions["payment.read"]),
      "balance/revenue.read": statusFromPermission(permissions["balance.read"]),
    },
    account: {
      ok: account.ok,
      id: accountId,
      livemode,
      country,
      currency,
      display,
      errorCode: account.ok ? null : accountErr.code,
      errorType: account.ok ? null : accountErr.type,
      safeError: account.ok ? null : accountErr.message ?? `STRIPE_HTTP_${account.status}`,
      missingPermission: account.ok ? null : accountErr.missing,
    },
    products: products.ok ? asList(products.body) : [],
    prices: prices.ok ? asList(prices.body) : [],
    writeHttpCalls: 0,
    postCalls: 0,
    cause,
    blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
  };
}
