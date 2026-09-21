import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { STRIPE_SECRET_KEY_ENV, STRIPE_WEBHOOK_SECRET_ENV } from "@/lib/infinity/commercialization/providers/config";
import {
  loadServerEnvFromLocalFile,
  readLocalEnvValue,
  reloadStripeSecretFromLocalFile,
  reloadVercelFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_VENTURE_ID,
  CRE_VERCEL_PROJECT_ID,
  CRE_VERCEL_PROJECT_LIVE_NAME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_VENTURE,
} from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN } from "./cloudflare-dns-vercel-binding";
import {
  buildOccupancynpvCheckoutSessionRequest,
  checkoutReturnClaimsPaymentSuccess,
  OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS,
} from "./occupancynpv-canonical-checkout";
import {
  authorizedOccupancynpvWebhookEventsMatch,
  OCCUPANCYNPV_WEBHOOK_URL,
  processOccupancynpvStripeWebhookEvent,
} from "./occupancynpv-canonical-webhook";
import {
  buildOccupancynpvDurableAuthorityState,
  persistOccupancynpvDurableAuthority,
  readOccupancynpvDurableAuthority,
} from "./occupancynpv-durable-authority";
import {
  evaluateOccupancynpvFulfillmentReadiness,
  evaluateOccupancynpvOfferConsistency,
  evaluateOccupancynpvPaymentReadinessReport,
  occupancynpvClearedCommercializationBlockers,
  occupancynpvCommercializationBlockers,
} from "./occupancynpv-fulfillment";
import {
  OCCUPANCYNPV_FOUNDER_PAYMENT_REACTIVATION_AUTHORIZED,
  OCCUPANCYNPV_PAYMENT_REACTIVATION_EVIDENCE_PATH,
  type OccupancynpvPaymentReactivationEvidence,
} from "./occupancynpv-payment-reactivation-evidence";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";
import {
  evaluatePaymentActivationPolicy,
  evaluatePostActivationCustomerPayment,
  OCCUPANCYNPV_PAYMENT_ACTIVATION_GATES,
} from "./payment-activation-policy";
import { writeVentureOperationalRecord, readVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { classifyStripeEnvironment } from "./stripe-key-capabilities";

type StripeJson = Record<string, unknown>;

async function stripeGet(key: string, path: string) {
  const res = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${key}` } });
  let body: StripeJson = {};
  try { body = (await res.json()) as StripeJson; } catch { body = {}; }
  return { ok: res.ok, status: res.status, body };
}

async function fetchText(url: string, redirect: RequestRedirect = "follow") {
  try {
    const res = await fetch(url, { method: "GET", redirect });
    return { ok: res.ok, status: res.status, location: res.headers.get("location"), body: await res.text() };
  } catch {
    return { ok: false, status: 0, location: null, body: "" };
  }
}

async function validatePublicRoutes() {
  const redirects = new Set(SEO_GEO_REDIRECTS.map((row) => row.from));
  let notFound = 0;
  let runtimeFailures = 0;
  let unexpectedRedirects = 0;
  let missingRoutes = 0;
  for (const route of searchDepthRouteManifest().pageRoutes) {
    if (redirects.has(route)) continue;
    const res = await fetchText(`${OCCUPANCYNPV_PRODUCTION_ORIGIN}${route}`, "manual");
    if (res.status === 404) { notFound += 1; missingRoutes += 1; }
    else if (res.status >= 500 || res.status === 0) runtimeFailures += 1;
    else if (res.status >= 300 && res.status < 400) unexpectedRedirects += 1;
  }
  return {
    summary: `${93 - missingRoutes} / 93 ${notFound === 0 && runtimeFailures === 0 && unexpectedRedirects === 0 && missingRoutes === 0 ? "PASS" : "FAIL"}`,
    notFound,
    runtimeFailures,
    unexpectedRedirects,
    missingRoutes,
  };
}

export async function executeOccupancynpvPaymentReactivation(input: {
  deploy?: boolean;
  persistEvidence?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.deploy !== false) {
    loadServerEnvFromLocalFile();
    reloadStripeSecretFromLocalFile();
    reloadVercelFromLocalFile();
    const webhookFromFile = readLocalEnvValue(STRIPE_WEBHOOK_SECRET_ENV);
    if (webhookFromFile?.trim()) process.env[STRIPE_WEBHOOK_SECRET_ENV] = webhookFromFile.trim();
  }
  const activatedAt = new Date().toISOString();
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const webhookSecret = (process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim();
  const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
  const paymentReport = evaluateOccupancynpvPaymentReadinessReport();
  const consistency = evaluateOccupancynpvOfferConsistency();
  const composed = composeOccupancynpvPaymentReactivationFiles();

  const professionalReq = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true, fulfillmentReady: true });
  const perDealReq = buildOccupancynpvCheckoutSessionRequest({ offer: "PER_DEAL", activationAuthorized: true, fulfillmentReady: true });
  const unknownReq = buildOccupancynpvCheckoutSessionRequest({ offer: "ENTERPRISE", activationAuthorized: true, fulfillmentReady: true });
  const injectedPrice = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", clientPriceId: "price_injected", activationAuthorized: true, fulfillmentReady: true });
  const injectedAmount = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", clientAmount: 1, activationAuthorized: true, fulfillmentReady: true });

  let stop: "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED" | "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED" | null = null;
  let stopReason: string | null = null;

  const account = key ? await stripeGet(key, "/v1/account") : { ok: false, status: 0, body: {} as StripeJson };
  const accountId = typeof account.body.id === "string" ? account.body.id : "UNKNOWN";
  const chargesEnabled = account.body.charges_enabled === true;
  const payoutsEnabled = account.body.payouts_enabled === true;
  const mode = classifyStripeEnvironment(key);
  const identityPass = account.ok && accountId === OCCUPANCYNPV_STRIPE_ACCOUNT_ID && mode === "LIVE" && chargesEnabled && payoutsEnabled;
  if (!identityPass) {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "stripe_account_identity_mismatch";
  }

  const professionalProduct = !stop ? await stripeGet(key, "/v1/products/prod_VDIjmRpY19C9HZ") : { ok: false, status: 0, body: {} as StripeJson };
  const professionalPrice = !stop ? await stripeGet(key, "/v1/prices/price_1UCs7hLdvXKx7R7GF2TPmwGL") : { ok: false, status: 0, body: {} as StripeJson };
  const perDealProduct = !stop ? await stripeGet(key, "/v1/products/prod_VDIju0S2lBO9i5") : { ok: false, status: 0, body: {} as StripeJson };
  const perDealPrice = !stop ? await stripeGet(key, "/v1/prices/price_1UCs7iLdvXKx7R7GmikBTGx4") : { ok: false, status: 0, body: {} as StripeJson };
  const proRecurring = professionalPrice.body.recurring && typeof professionalPrice.body.recurring === "object" ? professionalPrice.body.recurring as StripeJson : {};
  const offersPass =
    professionalProduct.ok && professionalProduct.body.id === "prod_VDIjmRpY19C9HZ" && professionalProduct.body.active === true
    && professionalPrice.ok && professionalPrice.body.id === "price_1UCs7hLdvXKx7R7GF2TPmwGL" && professionalPrice.body.unit_amount === 29000
    && String(professionalPrice.body.currency) === "usd" && proRecurring.interval === "year" && professionalPrice.body.active === true
    && perDealProduct.ok && perDealProduct.body.id === "prod_VDIju0S2lBO9i5" && perDealProduct.body.active === true
    && perDealPrice.ok && perDealPrice.body.id === "price_1UCs7iLdvXKx7R7GmikBTGx4" && perDealPrice.body.unit_amount === 14900
    && String(perDealPrice.body.currency) === "usd" && perDealPrice.body.recurring == null && perDealPrice.body.active === true;
  if (!stop && !offersPass) {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "canonical_payment_object_mismatch";
  }

  const webhook = !stop ? await stripeGet(key, "/v1/webhook_endpoints/we_1UCssQLdvXKx7R7GcHonT3rh") : { ok: false, status: 0, body: {} as StripeJson };
  const webhookPass =
    webhook.ok
    && webhook.body.id === "we_1UCssQLdvXKx7R7GcHonT3rh"
    && String(webhook.body.url) === OCCUPANCYNPV_WEBHOOK_URL
    && (webhook.body.status === "enabled" || webhook.body.status == null)
    && authorizedOccupancynpvWebhookEventsMatch(webhook.body.enabled_events)
    && webhookSecret.startsWith("whsec_");
  const signed = processOccupancynpvStripeWebhookEvent({ secret: webhookSecret || "whsec_fixture", signature: "", rawBody: "", seenEventIds: new Set() });
  if (!stop && (!webhookPass || signed.reason !== "MISSING_SIGNATURE_MATERIAL")) {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "webhook_activation_blocked";
  }

  if (!stop && fulfillment.result !== "PASS") {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "fulfillment_not_pass";
  }
  if (!stop && paymentReport.PaymentReadinessGate !== "READY_FOR_ACTIVATION_AUTHORIZATION") {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "payment_readiness_blocked";
  }
  if (!stop && !OCCUPANCYNPV_FOUNDER_PAYMENT_REACTIVATION_AUTHORIZED) {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "founder_reauthorization_missing";
  }
  if (!stop && !composed.fulfillmentReady) {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "composed_fulfillment_not_ready";
  }

  const activationDecision = evaluatePaymentActivationPolicy({
    venture: OCCUPANCYNPV_STRIPE_VENTURE,
    provider: "payments",
    policy: "FOUNDER_APPROVAL_REQUIRED",
    paymentActivated: false,
    publicLaunch: "NO",
    founderAuthorizationGranted: true,
    providerAccountId: accountId,
    expectedProviderAccountId: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    gates: {
      ...OCCUPANCYNPV_PAYMENT_ACTIVATION_GATES,
      FulfillmentReadinessGate: fulfillment.result,
      BackendReadinessGate: paymentReport.BackendReadinessGate,
      PaymentReadinessGate: paymentReport.PaymentReadinessGate,
    },
  });
  if (!stop && activationDecision.decision.decision !== "ALLOW_AUTONOMOUS") {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_BLOCKED";
    stopReason = "activation_policy_blocked";
  }

  const vercel = new VercelDomainBindingAdapter();
  let deploymentId: string | null = null;
  let deployed = false;
  let safeError: string | null = null;
  if (!stop && input.deploy !== false) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (url && publishable) {
      await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: "NEXT_PUBLIC_SUPABASE_URL", value: url, target: ["production", "preview"] });
      await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: publishable, target: ["production", "preview"] });
    }
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (serviceRole) {
      await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: "SUPABASE_SERVICE_ROLE_KEY", value: serviceRole, target: ["production", "preview"] });
    }
    const stripeEnv = await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: STRIPE_SECRET_KEY_ENV, value: key, target: ["production", "preview"] });
    const webhookEnv = await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: STRIPE_WEBHOOK_SECRET_ENV, value: webhookSecret, target: ["production", "preview"] });
    if (!stripeEnv.ok || !webhookEnv.ok) {
      stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
      safeError = stripeEnv.safeError ?? webhookEnv.safeError ?? "VERCEL_ENV_UPSERT_FAILED";
    } else {
      for (const file of composed.files) {
        const uploaded = await vercel.uploadSourceFile(file);
        if (!uploaded.ok) {
          stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
          safeError = uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED";
          break;
        }
      }
      if (!stop) {
        const created = await vercel.createSourceBundleDeployment({
          projectName: CRE_VERCEL_PROJECT_LIVE_NAME,
          files: composed.files,
        });
        if (!created.ok || created.id === "UNKNOWN") {
          stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
          safeError = created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED";
        } else {
          deploymentId = created.id;
          for (let attempt = 0; attempt < (input.pollAttempts ?? 50); attempt += 1) {
            const status = await vercel.getDeployment(created.id);
            if (status.readyState === "READY") {
              const aliased = await vercel.assignDeploymentAlias(created.id, OCCUPANCYNPV_DOMAIN);
              deployed = aliased.ok;
              if (!aliased.ok) {
                stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
                safeError = aliased.safeError ?? "VERCEL_ALIAS_FAILED";
              }
              break;
            }
            if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
              stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
              safeError = status.safeError ?? "VERCEL_DEPLOYMENT_FAILED";
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 8000));
          }
          if (!deployed && !stop) {
            stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
            safeError = "VERCEL_DEPLOYMENT_NOT_READY";
          }
        }
      }
    }
  }

  let checkoutGet = { status: 0, body: "" };
  let unknownPost = { status: 0, body: "" };
  if (!stop && input.deploy !== false) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const get = await fetchText(`${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`);
      checkoutGet = { status: get.status, body: get.body };
      try {
        const res = await fetch(`${OCCUPANCYNPV_PRODUCTION_ORIGIN}/api/checkout/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ offer: "ENTERPRISE" }),
        });
        unknownPost = { status: res.status, body: await res.text() };
      } catch {
        unknownPost = { status: 0, body: "" };
      }
      if (/activated":true/.test(checkoutGet.body) && unknownPost.status === 400 && /UNKNOWN_OFFER/.test(unknownPost.body)) break;
      await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 5000));
    }
    if (!/activated":true/.test(checkoutGet.body) || unknownPost.status !== 400 || !/UNKNOWN_OFFER/.test(unknownPost.body)) {
      stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
      safeError = safeError ?? "CHECKOUT_SURFACE_NOT_ACTIVATED";
    }
  }

  const productionCheckoutEnabled =
    input.deploy !== false
    && deployed
    && /activated":true/.test(checkoutGet.body)
    && unknownPost.status === 400
    && /UNKNOWN_OFFER/.test(unknownPost.body);
  const activated = input.deploy === false ? !stop : !stop && productionCheckoutEnabled;
  if (!activated && !stop && input.deploy !== false) {
    stop = "OCCUPANCYNPV_PAYMENT_REACTIVATION_FAILED";
    safeError = safeError ?? "CHECKOUT_SURFACE_NOT_ACTIVATED";
  }
  const routes = input.deploy === false ? { summary: "SKIPPED", notFound: 0, runtimeFailures: 0, unexpectedRedirects: 0, missingRoutes: 0 } : await validatePublicRoutes();
  const evidence: OccupancynpvPaymentReactivationEvidence = {
    founder_reauthorization: true,
    payment_activation: activated ? "YES" : "NO",
    publicly_launched: "NO",
    activated_at: activated ? activatedAt : null,
    authority: "Founder reauthorization after FulfillmentReadinessGate PASS",
    stripe_account: "acct_18h5CjLdvXKx7R7G",
    professional_price: "price_1UCs7hLdvXKx7R7GF2TPmwGL",
    per_deal_price: "price_1UCs7iLdvXKx7R7GmikBTGx4",
    webhook: "we_1UCssQLdvXKx7R7GcHonT3rh",
    deployment_id: deploymentId,
    artifact_id: composed.artifactId,
    digest: composed.digest,
  };
  const persistProduction = input.persistEvidence !== false && input.deploy !== false;
  if (persistProduction) {
    mkdirSync(dirname(OCCUPANCYNPV_PAYMENT_REACTIVATION_EVIDENCE_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_PAYMENT_REACTIVATION_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  }

  if (activated && persistProduction) {
    const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
    writeVentureOperationalRecord({
      ...existing,
      revenue_state: "PAYMENT_ACTIVATED",
      checkout_state: "ACTIVATED",
      fulfillment_state: "FULFILLMENT_READY",
      public_launch_state: "NO",
      latest_learning_decision: "OCCUPANCYNPV_LIVE_PAYMENT_REACTIVATION_V2",
      blocked_actions: occupancynpvCommercializationBlockers(),
      active_artifact: composed.artifactId,
      active_artifact_digest: composed.digest,
      active_deployment: deploymentId ?? existing.active_deployment,
    });
    const prior = readOccupancynpvDurableAuthority() ?? buildOccupancynpvDurableAuthorityState(activatedAt);
    persistOccupancynpvDurableAuthority({
      ...prior,
      payment_activation_policy: "AUTONOMOUS_WITHIN_POLICY",
      payment_activation: "YES",
      publicly_launched: "NO",
      payment_readiness_gate: "READY_FOR_ACTIVATION_AUTHORIZATION",
      fulfillment_readiness_gate: "PASS",
      activation_status: "PAYMENT_REACTIVATED",
      remaining_blockers: occupancynpvCommercializationBlockers(),
    });
  }

  const autonomy = evaluatePostActivationCustomerPayment({
    mutationClass: "CUSTOMER_CHECKOUT_EXECUTION",
    venture: OCCUPANCYNPV_STRIPE_VENTURE,
    provider: "payments",
    resource: "validated_customer_checkout",
    paymentActivated: activated,
  });

  return {
    nextState: stop ?? "OCCUPANCYNPV_PAYMENT_REACTIVATED",
    stopReason,
    safeError,
    activated,
    deployed,
    deploymentId,
    activatedAt: activated ? activatedAt : null,
    identity: { accountId, mode, chargesEnabled, payoutsEnabled, pass: identityPass },
    offers: {
      professional: {
        product: professionalProduct.body.id ?? null,
        price: professionalPrice.body.id ?? null,
        amount: professionalPrice.body.unit_amount ?? null,
        currency: professionalPrice.body.currency ?? null,
        recurrence: proRecurring.interval ?? null,
        pass: offersPass,
      },
      perDeal: {
        product: perDealProduct.body.id ?? null,
        price: perDealPrice.body.id ?? null,
        amount: perDealPrice.body.unit_amount ?? null,
        currency: perDealPrice.body.currency ?? null,
        recurrence: perDealPrice.body.recurring == null ? "NONE" : "UNEXPECTED",
        pass: offersPass,
      },
    },
    webhook: { pass: webhookPass, url: webhook.body.url ?? null, events: webhook.body.enabled_events ?? null },
    fulfillment,
    paymentReport,
    consistency,
    checkoutSafety: {
      professionalMapping: professionalReq.request?.priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId ? "PASS" : "FAIL",
      perDealMapping: perDealReq.request?.priceId === OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId ? "PASS" : "FAIL",
      arbitraryPrice: injectedPrice.reason === "ARBITRARY_PRICE_BLOCKED" ? "BLOCKED" : "FAIL",
      arbitraryAmount: injectedAmount.reason === "ARBITRARY_AMOUNT_BLOCKED" ? "BLOCKED" : "FAIL",
      unknownOffer: unknownReq.reason === "UNKNOWN_OFFER" ? "BLOCKED" : "FAIL",
      successSpoof: checkoutReturnClaimsPaymentSuccess("success", false) ? "FAIL" : "BLOCKED",
    },
    composed,
    evidence,
    routes,
    checkoutGet,
    unknownPost,
    commercialization: {
      cleared: occupancynpvClearedCommercializationBlockers(),
      remaining: occupancynpvCommercializationBlockers(),
    },
    autonomy: autonomy.decision,
    writes: {
      productsCreated: 0 as const,
      pricesCreated: 0 as const,
      webhookMutations: 0 as const,
      customersManuallyCreated: 0 as const,
      checkoutSessionsManuallyCreated: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      refunds: 0 as const,
      dnsWrites: 0 as const,
      publicLaunch: 0 as const,
    },
  };
}
