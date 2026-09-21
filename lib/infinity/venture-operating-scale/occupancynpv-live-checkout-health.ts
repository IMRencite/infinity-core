import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  OCCUPANCYNPV_CHECKOUT_CUSTOMER_SAFE_ERROR,
  evaluateRenderedCommercialFailureExperienceGate,
} from "@/lib/infinity/public-venture-design/rendered-interaction/commercial-failure-experience";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "./occupancynpv-canonical-checkout";
import { OCCUPANCYNPV_STRIPE_ACCOUNT_ID } from "./constants";
import { evaluateOccupancynpvFulfillmentReadiness } from "./occupancynpv-fulfillment";
import { occupancynpvPaymentActivationEnabled } from "./occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched } from "./occupancynpv-public-launch-evidence";

export {
  OCCUPANCYNPV_CHECKOUT_CUSTOMER_SAFE_ERROR,
  evaluateRenderedCommercialFailureExperienceGate,
};

export const LIVE_COMMERCIAL_CHECKOUT_HEALTH_GATE = "LiveCommercialCheckoutHealthGate" as const;
export const HIGH_PRIORITY_COMMERCIAL_INCIDENT = "HIGH_PRIORITY_COMMERCIAL_INCIDENT" as const;
export const OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_PATH =
  ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json" as const;
export const OCCUPANCYNPV_LIVE_CHECKOUT_INCIDENT_PATH =
  ".infinity/venture-operating-scale/occupancynpv-live-checkout-incident.json" as const;
export const OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_VITEST_PATH =
  ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.vitest.json" as const;
export const OCCUPANCYNPV_LIVE_CHECKOUT_INCIDENT_VITEST_PATH =
  ".infinity/venture-operating-scale/occupancynpv-live-checkout-incident.vitest.json" as const;

function liveCheckoutHealthPath(): string {
  return process.env.VITEST ? OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_VITEST_PATH : OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_PATH;
}

function liveCheckoutIncidentPath(): string {
  return process.env.VITEST ? OCCUPANCYNPV_LIVE_CHECKOUT_INCIDENT_VITEST_PATH : OCCUPANCYNPV_LIVE_CHECKOUT_INCIDENT_PATH;
}

export type LiveCheckoutOfferHealth = {
  offer: "PROFESSIONAL" | "PER_DEAL";
  priceId: string;
  productId: string;
  mode: "subscription" | "payment";
  priceExists: boolean;
  priceActive: boolean;
  productExists: boolean;
  amount: number | null;
  billing: string | null;
  sessionCreate: "PASS" | "FAIL";
  sessionId: string | null;
  checkoutUrlValid: boolean;
  retrievedMode: string | null;
  retrievedPriceId: string | null;
  retrievedSuccessUrl: string | null;
  retrievedCancelUrl: string | null;
  paymentStatus: string | null;
  errorType: string | null;
  errorCode: string | null;
  requestId: string | null;
};

export type LiveCommercialCheckoutIncidentRecord = {
  venture: string;
  subsystem: string;
  classification: string;
  currentState: "OPEN" | "RESOLVED";
  operatingAction: string;
  defect: string;
  originalFailure: {
    errorType: string;
    errorCode: string;
    missingPermission: string;
    professionalRequestId: string | null;
    perDealRequestId: string | null;
  };
  provider: string;
  account: string;
  detectedAt: string;
  resolvedAt: string | null;
  repairMission: string;
  repairMissionStatus: "OPEN" | "COMPLETED";
  status: "OPEN" | "RESOLVED";
  resolution: {
    founderAction: string;
    verification: string;
    realPaymentCompleted: false;
  } | null;
  result: "PASS" | "FAIL";
};

export type LiveCommercialCheckoutHealthRecord = {
  gate: typeof LIVE_COMMERCIAL_CHECKOUT_HEALTH_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  classified: typeof HIGH_PRIORITY_COMMERCIAL_INCIDENT | "HEALTHY";
  operatingAction: "REPAIR" | "NONE";
  detectedAt: string;
  venture: "occupancynpv";
  provider: "stripe";
  account: string;
  secretConfigured: "YES" | "NO";
  keyMode: "LIVE" | "TEST" | "UNKNOWN";
  keyKind: "SECRET" | "RESTRICTED" | "UNKNOWN";
  webhookSecretConfigured: "YES" | "NO";
  fulfillment: "PASS" | "FAIL";
  paymentActivation: "YES" | "NO";
  publiclyLaunched: "YES" | "NO";
  professional: LiveCheckoutOfferHealth;
  perDeal: LiveCheckoutOfferHealth;
  successUrl: string;
  cancelUrl: string;
  successUrlValid: boolean;
  cancelUrlValid: boolean;
  arbitraryClientPriceBlocked: true;
  realPaymentCompleted: false;
  sessionCreateHasProviderObjectCost: "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED";
};

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

function classifyKey(key: string): {
  present: "YES" | "NO";
  mode: "LIVE" | "TEST" | "UNKNOWN";
  kind: "SECRET" | "RESTRICTED" | "UNKNOWN";
} {
  if (!key) return { present: "NO", mode: "UNKNOWN", kind: "UNKNOWN" };
  return {
    present: "YES",
    mode: key.includes("_live_") ? "LIVE" : key.includes("_test_") ? "TEST" : "UNKNOWN",
    kind: key.startsWith("rk_") ? "RESTRICTED" : key.startsWith("sk_") ? "SECRET" : "UNKNOWN",
  };
}

function stripeError(body: Record<string, unknown>, headers: Headers) {
  const err = (body.error ?? null) as Record<string, unknown> | null;
  return {
    type: typeof err?.type === "string" ? err.type : null,
    code: typeof err?.code === "string" ? err.code : null,
    message: typeof err?.message === "string" ? err.message.replace(/\b[rs]k_(live|test)_[A-Za-z0-9]+/g, "[REDACTED]") : null,
    requestId: typeof err?.request_id === "string" ? err.request_id : headers.get("request-id"),
  };
}

async function stripeJson(key: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body, error: stripeError(body, res.headers) };
}

function sessionParams(offer: "PROFESSIONAL" | "PER_DEAL") {
  const binding = OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS[offer];
  const body = new URLSearchParams();
  body.set("mode", binding.mode);
  body.set("line_items[0][price]", binding.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", "https://occupancynpv.com/occupancynpv/app/checkout/complete");
  body.set("cancel_url", "https://occupancynpv.com/pricing");
  body.set("client_reference_id", "cust_healthcheck");
  body.set("expires_at", String(Math.floor(Date.now() / 1000) + 1800));
  body.set("metadata[infinity_venture]", "occupancynpv");
  body.set("metadata[infinity_offer]", offer);
  body.set("metadata[infinity_environment]", "production");
  body.set("metadata[infinity_stripe_account]", OCCUPANCYNPV_STRIPE_ACCOUNT_ID);
  body.set("metadata[infinity_health_check]", "synthetic_unpaid");
  return { binding, body };
}

function offerHealth(
  offer: "PROFESSIONAL" | "PER_DEAL",
  price: Awaited<ReturnType<typeof stripeJson>> | null,
  product: Awaited<ReturnType<typeof stripeJson>> | null,
  session: Awaited<ReturnType<typeof stripeJson>> | null,
  retrieved: Awaited<ReturnType<typeof stripeJson>> | null,
): LiveCheckoutOfferHealth {
  const binding = OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS[offer];
  const url = typeof session?.body.url === "string" ? session.body.url : "";
  const items = retrieved?.body.line_items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  return {
    offer,
    priceId: binding.priceId,
    productId: binding.productId,
    mode: binding.mode,
    priceExists: Boolean(price?.ok && price.body.id === binding.priceId),
    priceActive: price?.body.active === true,
    productExists: Boolean(product?.ok && product.body.id === binding.productId),
    amount: typeof price?.body.unit_amount === "number" ? price.body.unit_amount : null,
    billing: offer === "PROFESSIONAL" ? "ANNUAL_RECURRING" : "ONE_TIME",
    sessionCreate: session?.ok && url.startsWith("https://checkout.stripe.com/") ? "PASS" : "FAIL",
    sessionId: typeof session?.body.id === "string" ? session.body.id : null,
    checkoutUrlValid: url.startsWith("https://checkout.stripe.com/"),
    retrievedMode: typeof retrieved?.body.mode === "string" ? retrieved.body.mode : null,
    retrievedPriceId: items?.data?.[0]?.price?.id ?? null,
    retrievedSuccessUrl: typeof retrieved?.body.success_url === "string" ? retrieved.body.success_url : null,
    retrievedCancelUrl: typeof retrieved?.body.cancel_url === "string" ? retrieved.body.cancel_url : null,
    paymentStatus: typeof retrieved?.body.payment_status === "string" ? retrieved.body.payment_status : null,
    errorType: session?.error.type ?? null,
    errorCode: session?.error.code ?? null,
    requestId: session?.error.requestId ?? null,
  };
}

export function evaluateLiveCommercialCheckoutHealthGate(
  record: LiveCommercialCheckoutHealthRecord,
): NamedGateResult {
  const reasons = [...record.reasons];
  if (occupancynpvPubliclyLaunched() && occupancynpvPaymentActivationEnabled() && record.result === "FAIL") {
    if (!reasons.includes("PUBLIC_LAUNCH_PAYMENT_ACTIVE_CHECKOUT_UNHEALTHY")) {
      reasons.push("PUBLIC_LAUNCH_PAYMENT_ACTIVE_CHECKOUT_UNHEALTHY");
    }
  }
  if (record.professional.sessionCreate !== "PASS") reasons.push("PROFESSIONAL_SESSION_CREATE_FAILED");
  if (record.perDeal.sessionCreate !== "PASS") reasons.push("PER_DEAL_SESSION_CREATE_FAILED");
  if (!record.professional.priceExists || !record.professional.priceActive) reasons.push("PROFESSIONAL_PRICE_INVALID");
  if (!record.perDeal.priceExists || !record.perDeal.priceActive) reasons.push("PER_DEAL_PRICE_INVALID");
  if (!record.successUrlValid) reasons.push("SUCCESS_URL_INVALID");
  if (!record.cancelUrlValid) reasons.push("CANCEL_URL_INVALID");
  if (!record.arbitraryClientPriceBlocked) reasons.push("ARBITRARY_CLIENT_PRICE_ALLOWED");
  if (evaluateOccupancynpvFulfillmentReadiness().result !== "PASS") reasons.push("FULFILLMENT_BINDING_MISSING");
  const unique = [...new Set(reasons)];
  return {
    gate: LIVE_COMMERCIAL_CHECKOUT_HEALTH_GATE,
    result: unique.length === 0 ? "PASS" : "FAIL",
    reasons: unique,
  };
}

export async function verifyLiveCommercialCheckoutSessions(input: {
  createSessions?: boolean;
  persist?: boolean;
} = {}): Promise<LiveCommercialCheckoutHealthRecord> {
  loadServerEnvFromLocalFile();
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const webhook = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  const classified = classifyKey(key);
  const create = input.createSessions !== false;
  const professionalPrice = key ? await stripeJson(key, `/v1/prices/${OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId}`) : null;
  const perDealPrice = key ? await stripeJson(key, `/v1/prices/${OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId}`) : null;
  const professionalProduct = key ? await stripeJson(key, `/v1/products/${OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.productId}`) : null;
  const perDealProduct = key ? await stripeJson(key, `/v1/products/${OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.productId}`) : null;
  const professionalSession = key && create
    ? await stripeJson(key, "/v1/checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: sessionParams("PROFESSIONAL").body,
      })
    : null;
  const perDealSession = key && create
    ? await stripeJson(key, "/v1/checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: sessionParams("PER_DEAL").body,
      })
    : null;
  const professionalId = typeof professionalSession?.body.id === "string" ? professionalSession.body.id : null;
  const perDealId = typeof perDealSession?.body.id === "string" ? perDealSession.body.id : null;
  const professionalRetrieved = key && professionalId
    ? await stripeJson(key, `/v1/checkout/sessions/${professionalId}?expand[]=line_items`)
    : null;
  const perDealRetrieved = key && perDealId
    ? await stripeJson(key, `/v1/checkout/sessions/${perDealId}?expand[]=line_items`)
    : null;
  const professional = offerHealth("PROFESSIONAL", professionalPrice, professionalProduct, professionalSession, professionalRetrieved);
  const perDeal = offerHealth("PER_DEAL", perDealPrice, perDealProduct, perDealSession, perDealRetrieved);
  const successUrl = "https://occupancynpv.com/occupancynpv/app/checkout/complete";
  const cancelUrl = "https://occupancynpv.com/pricing";
  const reasons: string[] = [];
  if (classified.present !== "YES") reasons.push("STRIPE_SECRET_KEY_MISSING");
  if (professional.sessionCreate !== "PASS") reasons.push("PROFESSIONAL_SESSION_CREATE_FAILED");
  if (perDeal.sessionCreate !== "PASS") reasons.push("PER_DEAL_SESSION_CREATE_FAILED");
  if (professional.errorCode === "more_permissions_required" || perDeal.errorCode === "more_permissions_required") {
    reasons.push("CHECKOUT_SESSION_WRITE_PERMISSION_MISSING");
  }
  const record: LiveCommercialCheckoutHealthRecord = {
    gate: LIVE_COMMERCIAL_CHECKOUT_HEALTH_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    classified: reasons.length === 0 ? "HEALTHY" : HIGH_PRIORITY_COMMERCIAL_INCIDENT,
    operatingAction: reasons.length === 0 ? "NONE" : "REPAIR",
    detectedAt: new Date().toISOString(),
    venture: "occupancynpv",
    provider: "stripe",
    account: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    secretConfigured: classified.present,
    keyMode: classified.mode,
    keyKind: classified.kind,
    webhookSecretConfigured: webhook ? "YES" : "NO",
    fulfillment: evaluateOccupancynpvFulfillmentReadiness().result === "PASS" ? "PASS" : "FAIL",
    paymentActivation: occupancynpvPaymentActivationEnabled() ? "YES" : "NO",
    publiclyLaunched: occupancynpvPubliclyLaunched() ? "YES" : "NO",
    professional,
    perDeal,
    successUrl,
    cancelUrl,
    successUrlValid: successUrl.startsWith("https://occupancynpv.com/") && !/localhost|vercel\.app/i.test(successUrl),
    cancelUrlValid: cancelUrl === "https://occupancynpv.com/pricing",
    arbitraryClientPriceBlocked: true,
    realPaymentCompleted: false,
    sessionCreateHasProviderObjectCost: "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED",
  };
  const gated = evaluateLiveCommercialCheckoutHealthGate(record);
  const persisted = { ...record, result: gated.result, reasons: gated.reasons };
  if (input.persist !== false) persistLiveCommercialCheckoutHealth(persisted);
  return persisted;
}

export function persistLiveCommercialCheckoutHealth(record: LiveCommercialCheckoutHealthRecord) {
  mkdirSync(dirname(liveCheckoutHealthPath()), { recursive: true });
  writeFileSync(liveCheckoutHealthPath(), `${JSON.stringify(record, null, 2)}\n`);
  mkdirSync(dirname(liveCheckoutIncidentPath()), { recursive: true });
  const prior = readLiveCommercialCheckoutIncident();
  const originalFailure = prior?.originalFailure ?? {
    errorType: record.professional.errorType ?? record.perDeal.errorType ?? "invalid_request_error",
    errorCode: record.professional.errorCode ?? record.perDeal.errorCode ?? "more_permissions_required",
    missingPermission: "checkout_session_write",
    professionalRequestId: record.professional.requestId,
    perDealRequestId: record.perDeal.requestId,
  };
  const incident: LiveCommercialCheckoutIncidentRecord = {
    venture: "OccupancyNPV",
    subsystem: "PAYMENT / CHECKOUT DEGRADED",
    classification: HIGH_PRIORITY_COMMERCIAL_INCIDENT,
    currentState: record.result === "FAIL" ? "OPEN" : "RESOLVED",
    operatingAction: record.result === "FAIL" ? "REPAIR" : "NONE",
    defect: prior?.defect ?? record.reasons.join(","),
    originalFailure,
    provider: "stripe",
    account: record.account,
    detectedAt: prior?.detectedAt ?? record.detectedAt,
    resolvedAt: record.result === "FAIL" ? null : new Date().toISOString(),
    repairMission: "OCCUPANCYNPV_LIVE_CHECKOUT_REGRESSION_REPAIR_V1",
    repairMissionStatus: record.result === "FAIL" ? "OPEN" : "COMPLETED",
    status: record.result === "FAIL" ? "OPEN" : "RESOLVED",
    resolution: record.result === "FAIL"
      ? null
      : {
          founderAction: "Checkout Sessions Write enabled on existing restricted live key Infinity CRE Commercialization",
          verification: "LiveCommercialCheckoutHealthGate PASS",
          realPaymentCompleted: false,
        },
    result: record.result,
  };
  writeFileSync(liveCheckoutIncidentPath(), `${JSON.stringify(incident, null, 2)}\n`);
  return record;
}

export function readLiveCommercialCheckoutHealth(): LiveCommercialCheckoutHealthRecord | null {
  if (!existsSync(liveCheckoutHealthPath())) return null;
  try {
    return JSON.parse(readFileSync(liveCheckoutHealthPath(), "utf8")) as LiveCommercialCheckoutHealthRecord;
  } catch {
    return null;
  }
}

export function readLiveCommercialCheckoutIncident(): LiveCommercialCheckoutIncidentRecord | null {
  if (!existsSync(liveCheckoutIncidentPath())) return null;
  try {
    return JSON.parse(readFileSync(liveCheckoutIncidentPath(), "utf8")) as LiveCommercialCheckoutIncidentRecord;
  } catch {
    return null;
  }
}

export function liveCommercialCheckoutIncidentOpen(): boolean {
  return readLiveCommercialCheckoutIncident()?.status === "OPEN";
}

export function liveCommercialCheckoutUnhealthy(): boolean {
  return readLiveCommercialCheckoutHealth()?.result === "FAIL";
}

export function syntheticCheckoutSessionExcludedFromRevenueAndFulfillment(session: {
  metadata?: Record<string, unknown> | null;
  payment_status?: string | null;
  client_reference_id?: string | null;
}): boolean {
  return (
    session.metadata?.infinity_health_check === "synthetic_unpaid"
    && session.payment_status !== "paid"
    && session.client_reference_id === "cust_healthcheck"
  );
}

export function occupancynpvCustomerSafeCheckoutFailureHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Checkout unavailable</title>
  </head>
  <body>
    <main>
      <h1>Checkout unavailable</h1>
      <p>${OCCUPANCYNPV_CHECKOUT_CUSTOMER_SAFE_ERROR}</p>
      <p><a href="/pricing">Return to pricing</a></p>
    </main>
  </body>
</html>`;
}
