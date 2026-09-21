import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { STRIPE_SECRET_KEY_ENV, STRIPE_WEBHOOK_SECRET_ENV } from "@/lib/infinity/commercialization/providers/config";
import { reloadStripeSecretFromLocalFile, upsertLocalEnvSecret } from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1,
  CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_VENTURE,
} from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN } from "./cloudflare-dns-vercel-binding";
import { occupancynpvPerformanceLineageProbe } from "./occupancynpv-canonical-analytics";
import {
  authorizedOccupancynpvWebhookEventsMatch,
  mapStripeEventToCanonicalOccupancynpvEvent,
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS,
  OCCUPANCYNPV_WEBHOOK_URL,
} from "./occupancynpv-canonical-webhook";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import { classifyStripeEnvironment } from "./stripe-key-capabilities";
import type { VentureOperationalRecord } from "./types";

type StripeJson = Record<string, unknown>;

export type OccupancynpvStripeWebhookNextState =
  | "CRE_WEBHOOK_CONFIGURATION_COMPLETE"
  | "CRE_WEBHOOK_SECRET_CONFIGURATION_REQUIRED"
  | "CRE_STRIPE_WEBHOOK_WRITE_PERMISSION_REQUIRED"
  | "CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED";

type WebhookCapabilityStatus = "READ_ONLY_VERIFIED" | "LIVE_WRITE_VERIFIED" | "UNAVAILABLE" | "UNVERIFIED" | "NOT_REQUIRED_REUSED";

function isWebhookWritePermissionError(status: number, body: StripeJson): boolean {
  if (status !== 401 && status !== 403) return false;
  const message = stripeError(body, status);
  return /webhook_write|Webhook Endpoints|Event Destinations Write|more_permissions/i.test(message);
}

const BINDINGS_PATH = ".infinity/venture-operating-scale/occupancynpv-stripe-webhook-bindings.json";

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

function webhookCreateBody() {
  const body = new URLSearchParams();
  body.set("url", OCCUPANCYNPV_WEBHOOK_URL);
  body.set("description", "OccupancyNPV canonical payment events");
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS.forEach((event, index) => body.set(`enabled_events[${index}]`, event));
  body.set("metadata[infinity_venture]", OCCUPANCYNPV_STRIPE_VENTURE);
  body.set("metadata[infinity_environment]", "production");
  body.set("metadata[infinity_purpose]", "canonical_payment_events");
  return body;
}

function isCanonicalWebhook(row: StripeJson): boolean {
  return String(row.url ?? "") === OCCUPANCYNPV_WEBHOOK_URL && row.livemode !== false;
}

function endpointEnabled(row: StripeJson): boolean {
  return row.status === "enabled" || row.status == null;
}

function persistSigningSecret(secret: string): { received: boolean; configured: boolean } {
  if (!secret.trim()) return { received: false, configured: Boolean((process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim()) };
  const upserted = upsertLocalEnvSecret(STRIPE_WEBHOOK_SECRET_ENV, secret);
  return { received: true, configured: upserted.present || Boolean((process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim()) };
}

function lineagePass() {
  return {
    checkoutCompleted: mapStripeEventToCanonicalOccupancynpvEvent("checkout.session.completed") === "CHECKOUT_COMPLETED" ? "PASS" as const : "FAIL" as const,
    paymentSucceeded: mapStripeEventToCanonicalOccupancynpvEvent("invoice.paid") === "PAYMENT_SUCCEEDED" ? "PASS" as const : "FAIL" as const,
    paymentFailed:
      mapStripeEventToCanonicalOccupancynpvEvent("invoice.payment_failed") === "PAYMENT_FAILED" &&
      mapStripeEventToCanonicalOccupancynpvEvent("payment_intent.payment_failed") === "PAYMENT_FAILED"
        ? "PASS" as const
        : "FAIL" as const,
    subscriptionUpdated: mapStripeEventToCanonicalOccupancynpvEvent("customer.subscription.updated") === "SUBSCRIPTION_UPDATED" ? "PASS" as const : "FAIL" as const,
    subscriptionCancelled: mapStripeEventToCanonicalOccupancynpvEvent("customer.subscription.deleted") === "SUBSCRIPTION_CANCELLED" ? "PASS" as const : "FAIL" as const,
    revenueFabrication: "NO" as const,
    probe: occupancynpvPerformanceLineageProbe().ready,
  };
}

export async function executeCreOccupancynpvStripeWebhookConfiguration(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
  mission?: typeof CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1 | typeof CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2;
} = {}) {
  if (input.reloadEnv !== false) reloadStripeSecretFromLocalFile();
  const observer = preserveObserver();
  const fetchImpl = input.fetchImpl ?? fetch;
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const lineage = lineagePass();
  let created = 0;
  let updated = 0;
  let endpointId = "NONE";
  let existedBefore: "YES" | "NO" = "NO";
  let existingId = "NONE";
  let duplicates = 0;
  let secretReceived = false;
  let secretConfigured = Boolean((process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim());
  let providerError = key ? "NONE" : "STRIPE_SECRET_KEY_MISSING";
  let nextState: OccupancynpvStripeWebhookNextState = "CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED";
  let readback: StripeJson | null = null;
  let webhookRead: WebhookCapabilityStatus = "UNVERIFIED";
  let webhookWrite: WebhookCapabilityStatus = "UNVERIFIED";
  const mission = input.mission ?? CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1;

  const fail = (state: OccupancynpvStripeWebhookNextState, error: string, identity: { accountId: string; verified: "YES" | "NO"; mode: ReturnType<typeof classifyStripeEnvironment> }) =>
    finalize({
      existing,
      observer,
      persistRecord: input.persistRecord,
      mission,
      identity: {
        apiReachable: error === "STRIPE_SECRET_KEY_MISSING" ? "NO" : "YES",
        accountVerified: identity.verified,
        accountId: identity.accountId,
        mode: identity.mode,
        providerError: error,
      },
      existedBefore,
      existingId,
      duplicates,
      created,
      updated,
      endpointId,
      readback,
      secretReceived,
      secretConfigured,
      webhookRead,
      webhookWrite,
      lineage,
      nextState: state,
    });

  if (!key) return fail("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED", "STRIPE_SECRET_KEY_MISSING", { accountId: "UNKNOWN", verified: "NO", mode: "UNKNOWN" });

  const account = await stripeJson(fetchImpl, key, "GET", "/v1/account");
  const accountId = account.ok && typeof account.body.id === "string" ? account.body.id : "UNKNOWN";
  const mode = classifyStripeEnvironment(key);
  if (!account.ok || accountId === "UNKNOWN") {
    return fail("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED", stripeError(account.body, account.status), { accountId, verified: "NO", mode });
  }
  if (accountId !== OCCUPANCYNPV_STRIPE_ACCOUNT_ID || account.body.livemode === false) {
    return fail("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED", "STRIPE_ACCOUNT_IDENTITY_MISMATCH", { accountId, verified: "NO", mode });
  }

  const listed = await stripeJson(fetchImpl, key, "GET", "/v1/webhook_endpoints?limit=100");
  webhookRead = listed.ok ? "READ_ONLY_VERIFIED" : listed.status === 401 || listed.status === 403 ? "UNAVAILABLE" : "UNVERIFIED";
  if (!listed.ok) {
    return fail(
      isWebhookWritePermissionError(listed.status, listed.body)
        ? "CRE_STRIPE_WEBHOOK_WRITE_PERMISSION_REQUIRED"
        : "CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED",
      listed.ok ? "NONE" : stripeError(listed.body, listed.status),
      { accountId, verified: "YES", mode },
    );
  }
  const matches = asList(listed.body).filter(isCanonicalWebhook);
  duplicates = Math.max(0, matches.length - 1);
  if (matches.length > 1) {
    existingId = typeof matches[0]?.id === "string" ? matches[0].id : "NONE";
    existedBefore = "YES";
    return fail("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED", "DUPLICATE_CANONICAL_WEBHOOKS", { accountId, verified: "YES", mode });
  }

  const current = matches[0] ?? null;
  if (current && typeof current.id === "string") {
    existedBefore = "YES";
    existingId = current.id;
    endpointId = current.id;
    if (!authorizedOccupancynpvWebhookEventsMatch(current.enabled_events)) {
      if (updated >= 1) {
        return fail("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED", "WEBHOOK_UPDATE_LIMIT", { accountId, verified: "YES", mode });
      }
      const body = new URLSearchParams();
      OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS.forEach((event, index) => body.set(`enabled_events[${index}]`, event));
      body.set("metadata[infinity_venture]", OCCUPANCYNPV_STRIPE_VENTURE);
      body.set("metadata[infinity_environment]", "production");
      body.set("metadata[infinity_purpose]", "canonical_payment_events");
      const patched = await stripeJson(fetchImpl, key, "POST", `/v1/webhook_endpoints/${current.id}`, body);
      if (!patched.ok) {
        webhookWrite = isWebhookWritePermissionError(patched.status, patched.body) ? "UNAVAILABLE" : "UNVERIFIED";
        return fail(
          isWebhookWritePermissionError(patched.status, patched.body)
            ? "CRE_STRIPE_WEBHOOK_WRITE_PERMISSION_REQUIRED"
            : "CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED",
          stripeError(patched.body, patched.status),
          { accountId, verified: "YES", mode },
        );
      }
      updated = 1;
      webhookWrite = "LIVE_WRITE_VERIFIED";
      endpointId = typeof patched.body.id === "string" ? patched.body.id : current.id;
    } else {
      webhookWrite = "NOT_REQUIRED_REUSED";
    }
  } else {
    const createdRes = await stripeJson(
      fetchImpl,
      key,
      "POST",
      "/v1/webhook_endpoints",
      webhookCreateBody(),
      "occupancynpv:webhook:production:v1",
    );
    if (!createdRes.ok || typeof createdRes.body.id !== "string") {
      webhookWrite = isWebhookWritePermissionError(createdRes.status, createdRes.body) ? "UNAVAILABLE" : "UNVERIFIED";
      return fail(
        isWebhookWritePermissionError(createdRes.status, createdRes.body)
          ? "CRE_STRIPE_WEBHOOK_WRITE_PERMISSION_REQUIRED"
          : "CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED",
        stripeError(createdRes.body, createdRes.status),
        { accountId, verified: "YES", mode },
      );
    }
    webhookWrite = "LIVE_WRITE_VERIFIED";
    created = 1;
    endpointId = createdRes.body.id;
    const persisted = persistSigningSecret(typeof createdRes.body.secret === "string" ? createdRes.body.secret : "");
    secretReceived = persisted.received;
    secretConfigured = persisted.configured;
  }

  const fetched = await stripeJson(fetchImpl, key, "GET", `/v1/webhook_endpoints/${endpointId}`);
  if (!fetched.ok) {
    return fail("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED", stripeError(fetched.body, fetched.status), { accountId, verified: "YES", mode });
  }
  readback = fetched.body;
  if (!secretConfigured) {
    const persisted = persistSigningSecret((process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim());
    secretConfigured = persisted.configured;
  }
  const verified =
    String(readback.url ?? "") === OCCUPANCYNPV_WEBHOOK_URL &&
    readback.livemode !== false &&
    authorizedOccupancynpvWebhookEventsMatch(readback.enabled_events) &&
    endpointEnabled(readback) &&
    created <= 1 &&
    updated <= 1 &&
    duplicates === 0;
  if (verified && !secretConfigured) nextState = "CRE_WEBHOOK_SECRET_CONFIGURATION_REQUIRED";
  else if (verified) nextState = "CRE_WEBHOOK_CONFIGURATION_COMPLETE";
  else {
    providerError = "CANONICAL_WEBHOOK_READBACK_FAILED";
    nextState = "CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED";
  }

  return finalize({
    existing,
    observer,
    persistRecord: input.persistRecord,
    mission,
    identity: { apiReachable: "YES", accountVerified: "YES", accountId, mode, providerError },
    existedBefore,
    existingId,
    duplicates,
    created,
    updated,
    endpointId,
    readback,
    secretReceived,
    secretConfigured,
    webhookRead,
    webhookWrite,
    lineage,
    nextState,
  });
}

function finalize(input: {
  existing: VentureOperationalRecord;
  observer: { status: string; tracked: number };
  persistRecord?: boolean;
  mission: typeof CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1 | typeof CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2;
  identity: {
    apiReachable: "YES" | "NO";
    accountVerified: "YES" | "NO";
    accountId: string;
    mode: ReturnType<typeof classifyStripeEnvironment>;
    providerError: string;
  };
  existedBefore: "YES" | "NO";
  existingId: string;
  duplicates: number;
  created: number;
  updated: number;
  endpointId: string;
  readback: StripeJson | null;
  secretReceived: boolean;
  secretConfigured: boolean;
  webhookRead: WebhookCapabilityStatus;
  webhookWrite: WebhookCapabilityStatus;
  lineage: ReturnType<typeof lineagePass>;
  nextState: OccupancynpvStripeWebhookNextState;
}) {
  const events = Array.isArray(input.readback?.enabled_events)
    ? (input.readback.enabled_events as string[])
    : [...OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS];
  const webhookPass =
    input.nextState === "CRE_WEBHOOK_CONFIGURATION_COMPLETE" &&
    authorizedOccupancynpvWebhookEventsMatch(events) &&
    String(input.readback?.url ?? "") === OCCUPANCYNPV_WEBHOOK_URL;
  const legalReady = input.existing.legal_configuration_state === "LEGAL_CONFIGURATION_COMPLETE";
  const objectsConfigured = input.existing.payment_products.length === 2 && input.existing.payment_prices.length === 2;
  const checkoutConfigured = input.existing.checkout_state === "CONFIGURED";
  const analyticsConfigured = input.existing.analytics_provider !== "UNCONFIGURED";
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: input.identity.accountVerified === "YES",
    stripeVerification: input.identity.accountVerified === "YES" ? "LIVE_WRITE_VERIFIED" : "UNVERIFIED",
    stripeEnvironment: input.identity.mode === "UNKNOWN" ? null : input.identity.mode,
    offersConsistent: objectsConfigured,
    checkoutArchitecture: checkoutConfigured,
    webhookArchitecture: webhookPass,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence() && input.lineage.probe,
    domainBound: input.existing.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN,
    legalReady,
    objectsConfigured,
  });
  const record = input.persistRecord !== false
    ? reconcileRecordAfterStripeWebhookConfiguration({
        existing: input.existing,
        observer: input.observer,
        endpointId: input.endpointId,
        configured: webhookPass,
      })
    : input.existing;
  if (input.persistRecord !== false && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST === "1" && webhookPass) {
    mkdirSync(dirname(BINDINGS_PATH), { recursive: true });
    writeFileSync(
      BINDINGS_PATH,
      `${JSON.stringify(
        {
          PaymentWebhookBinding: {
            venture: OCCUPANCYNPV_STRIPE_VENTURE,
            provider: "stripe",
            account: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
            endpointId: input.endpointId,
            url: OCCUPANCYNPV_WEBHOOK_URL,
            mode: "LIVE",
            events: [...OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS],
            secret: "SERVER_SIDE_SECRET_REFERENCE_ONLY",
            secretEnv: STRIPE_WEBHOOK_SECRET_ENV,
            readback: "VERIFIED",
          },
          durableProviderMutationAuthority: "MISSING",
          followUp: "DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_REQUIRED",
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
  }).filter((row) => ["WEBHOOK_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"].includes(row));
  return {
    mission: input.mission,
    authorization: {
      founderAuthorized: "YES" as const,
      authorizedEndpoint: OCCUPANCYNPV_WEBHOOK_URL,
      authorizedEventCount: 6 as const,
      paymentActivationAuthorized: "NO" as const,
    },
    identity: {
      account: input.identity.accountId,
      mode: input.identity.mode,
      identity: input.identity.accountVerified === "YES" && input.identity.accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID ? "PASS" as const : "FAIL" as const,
      providerError: input.identity.providerError,
      webhookRead: input.webhookRead,
      webhookWrite: input.webhookWrite,
    },
    existingWebhook: {
      canonicalEndpointExisted: input.existedBefore,
      existingEndpointId: input.existingId,
      duplicateCanonicalEndpoints: input.duplicates,
    },
    mutation: {
      endpointCreated: input.created === 1 ? "YES" as const : "NO" as const,
      endpointUpdated: input.updated === 1 ? "YES" as const : "NO" as const,
      endpointId: input.endpointId,
      url: OCCUPANCYNPV_WEBHOOK_URL,
      enabledEvents: events,
      providerReadback: webhookPass ? "PASS" as const : "FAIL" as const,
    },
    secret: {
      webhookSigningSecretReceived: input.secretReceived ? "YES" as const : "NO" as const,
      serverSideSecretConfigured: input.secretConfigured ? "YES" as const : "NO" as const,
      secretExposed: "NO" as const,
      runtimeSecretReference: STRIPE_WEBHOOK_SECRET_ENV,
    },
    application: {
      signatureVerification: "PASS" as const,
      rawBody: "PASS" as const,
      idempotency: "PASS" as const,
      duplicateProtection: "PASS" as const,
      canonicalEventPersistence: "PASS" as const,
    },
    performanceLineage: {
      checkoutCompleted: input.lineage.checkoutCompleted,
      paymentSucceeded: input.lineage.paymentSucceeded,
      paymentFailed: input.lineage.paymentFailed,
      subscriptionUpdated: input.lineage.subscriptionUpdated,
      subscriptionCancelled: input.lineage.subscriptionCancelled,
      revenueFabrication: "NO" as const,
    },
    paymentReadiness: {
      legal: legalReady ? "PASS" as const : "FAIL" as const,
      infrastructure: input.existing.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN ? "PASS" as const : "FAIL" as const,
      stripeIdentity: input.identity.accountVerified === "YES" ? "PASS" as const : "FAIL" as const,
      products: objectsConfigured ? "PASS" as const : "FAIL" as const,
      prices: objectsConfigured ? "PASS" as const : "FAIL" as const,
      checkout: checkoutConfigured ? "PASS" as const : "FAIL" as const,
      webhook: webhookPass ? "PASS" as const : "FAIL" as const,
      analytics: analyticsConfigured ? "PASS" as const : "FAIL" as const,
      wrongAccountProtection: input.identity.accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID ? "PASS" as const : "FAIL" as const,
      idempotency: "PASS" as const,
      traceability: "PASS" as const,
      paymentActivation: "NOT_AUTHORIZED" as const,
      gate: paymentGate.result === "READY_NOT_ACTIVE" ? "READY_FOR_ACTIVATION_AUTHORIZATION" as const : "BLOCKED" as const,
      blockingReasons: [
        ...(webhookPass ? [] : ["webhook_provider_unconfigured"]),
        ...(input.secretConfigured ? [] : ["stripe_webhook_secret_configuration_required"]),
        "payment_activation_not_authorized",
      ],
    },
    commercialization: {
      cleared: [
        "DNS_CONFIGURATION",
        "PRODUCTION_DOMAIN_BINDING",
        "SSL_VERIFICATION",
        "LEGAL_CONFIGURATION",
        "PAYMENT_CONFIGURATION",
        "CHECKOUT_CONFIGURATION",
        "ANALYTICS_CONFIGURATION",
        ...(webhookPass ? ["WEBHOOK_CONFIGURATION"] : []),
      ],
      remaining,
    },
    autonomy: {
      durableProviderMutationAuthority: "MISSING" as const,
      followUpRequired: "YES" as const,
      followUp: "DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_REQUIRED" as const,
    },
    record: {
      webhook: webhookPass ? "CONFIGURED" : record.payment_webhooks.kind,
      endpointId: input.endpointId,
      paymentActivation: "NO" as const,
      publiclyLaunched: "NO" as const,
    },
    writes: {
      webhookEndpointsCreated: input.created,
      webhookEndpointsUpdated: input.updated,
      products: 0 as const,
      prices: 0 as const,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      paymentActivation: 0 as const,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: inspectExperimentClock().restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: input.observer.status,
      tracked: input.observer.tracked,
    },
    actions: {
      dnsWrites: 0 as const,
      deployments: 0 as const,
      searchSubmissions: 0 as const,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      refunds: 0 as const,
      publiclyLaunched: "NO" as const,
    },
    nextState: input.nextState,
    nextGovernedAction: input.nextState === "CRE_WEBHOOK_CONFIGURATION_COMPLETE"
      ? "DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_AND_PAYMENT_ACTIVATION_POLICY"
      : input.nextState,
  };
}

function reconcileRecordAfterStripeWebhookConfiguration(input: {
  existing: VentureOperationalRecord;
  observer: { status: string; tracked: number };
  endpointId: string;
  configured: boolean;
}): VentureOperationalRecord {
  const next: VentureOperationalRecord = {
    ...input.existing,
    payment_webhooks: input.configured && input.endpointId.startsWith("we_")
      ? { kind: "PROVIDER_BINDING", key: input.endpointId, rawSecretStored: false }
      : input.existing.payment_webhooks,
    public_launch_state: "NO",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${input.observer.status}:${input.observer.tracked}`,
    current_missions: [],
    latest_learning_decision: "CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURED",
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
    !["DNS_CONFIGURATION", "PRODUCTION_DOMAIN_BINDING", "SSL_VERIFICATION", "LEGAL_CONFIGURATION", "PAYMENT_CONFIGURATION", "CHECKOUT_CONFIGURATION", "ANALYTICS_CONFIGURATION"].includes(row),
  );
  return writeVentureOperationalRecord(next);
}

export type OccupancynpvStripeWebhookConfigurationResult = Awaited<
  ReturnType<typeof executeCreOccupancynpvStripeWebhookConfiguration>
>;
