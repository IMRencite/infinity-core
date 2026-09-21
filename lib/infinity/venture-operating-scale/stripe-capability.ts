import {
  STRIPE_SECRET_KEY_ENV,
} from "@/lib/infinity/commercialization/providers/config";
import { buildProviderInventory } from "@/lib/infinity/commercialization/probes/inventory";
import { probePaymentsLive } from "@/lib/infinity/commercialization/probes/live-probes";
import { creSiteArchitectureInput } from "@/lib/infinity/venture-website-architecture/cre-context";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CRE_VENTURE_ID } from "./constants";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import type { PaymentReadinessGateResult, ProviderMatrixStatus } from "./types";

export type StripeCapabilityId =
  | "account.read"
  | "product.read"
  | "product.create"
  | "price.read"
  | "price.create"
  | "checkout/session.create"
  | "payment_link.create"
  | "webhook_endpoint.read"
  | "webhook_endpoint.create"
  | "payment_intent.read"
  | "charge.read"
  | "refund.read"
  | "event.read"
  | "transaction/balance.read";

export type CanonicalOffer = {
  offer: string;
  price: string;
  amountUsd: number;
  billingModel: "RECURRING_ANNUAL" | "ONE_TIME_PER_DEAL";
  source: string;
};

export type CREPaymentConfigurationPlan = {
  plan: "CREPaymentConfigurationPlan";
  products: Array<{
    paymentProduct: string;
    paymentPrice: string;
    currency: "USD";
    billingModel: CanonicalOffer["billingModel"];
    recurrence: "year" | null;
    taxHandlingState: "UNCONFIGURED";
    checkoutMode: "subscription" | "payment";
    successUrl: "UNCONFIGURED_PENDING_PRODUCTION_DOMAIN";
    cancelUrl: "UNCONFIGURED_PENDING_PRODUCTION_DOMAIN";
    plannedSuccessPath: string;
    plannedCancelPath: string;
    metadata: Record<string, string>;
    ventureLinkage: string;
    productLinkage: string;
  }>;
  checkoutArchitecture: "PASS" | "FAIL";
  webhookArchitecture: "PASS" | "FAIL";
  revenueLineage: "PASS" | "FAIL";
  webhookEventMap: Array<{ category: string; canonicalEvent: string }>;
};

export type StripeChildResult = {
  mission: "CRE_STRIPE_CAPABILITY_AND_PAYMENT_CONFIGURATION_READINESS_V1";
  connected: "YES" | "NO";
  environment: "TEST" | "LIVE" | "UNKNOWN";
  safeAccountIdentity: string;
  providerVerification: "PASS" | "FAIL";
  capabilities: Record<StripeCapabilityId, ProviderMatrixStatus>;
  offers: CanonicalOffer[];
  offerConsistency: "PASS" | "FAIL";
  plan: CREPaymentConfigurationPlan | null;
  planStatus: "BUILT" | "EXTENDED" | "FAIL";
  paymentGate: PaymentReadinessGateResult;
  configurationReady: boolean;
  activationReady: false;
  blockers: string[];
  stripeWrites: 0;
  paymentActivations: 0;
  realCharges: 0;
  testCharges: 0;
  nextAuthorization: "GOVERNED_CRE_PAYMENT_CONFIGURATION_REQUIRED" | "PAYMENT_OFFER_RECONCILIATION_REQUIRED";
};

async function getOk(url: string, headers: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const res = await fetchImpl(url, { method: "GET", headers });
  try {
    await res.arrayBuffer();
  } catch {
    /* consumed */
  }
  return res.ok;
}

function safeAccountLabel(body: {
  id?: string;
  livemode?: boolean;
  country?: string;
  type?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  business_profile?: { name?: string | null } | null;
}): string {
  const suffix = typeof body.id === "string" && body.id.length > 4 ? body.id.slice(-4) : "none";
  const name = body.business_profile?.name ? "named" : "unnamed";
  return `acct_****${suffix}; livemode=${body.livemode === true}; country=${body.country ?? "UNKNOWN"}; type=${body.type ?? "UNKNOWN"}; charges=${body.charges_enabled === true}; payouts=${body.payouts_enabled === true}; profile=${name}`;
}

function readStatus(ok: boolean, connected: boolean): ProviderMatrixStatus {
  if (!connected) return "UNVERIFIED";
  return ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED";
}

export function reconcileCreCanonicalOffers(): { offers: CanonicalOffer[]; consistency: "PASS" | "FAIL" } {
  const site = creSiteArchitectureInput(CRE_VENTURE_ID);
  const expected = ["$290 / year", "$149 / deal"];
  const consistency = expected.every((row) => site.pricing.includes(row)) ? "PASS" : "FAIL";
  return {
    consistency,
    offers: [
      {
        offer: "Professional",
        price: "$290 / year",
        amountUsd: 290,
        billingModel: "RECURRING_ANNUAL",
        source: "creSiteArchitectureInput.pricing + accepted artifact pricing copy",
      },
      {
        offer: "Per-deal",
        price: "$149 / deal",
        amountUsd: 149,
        billingModel: "ONE_TIME_PER_DEAL",
        source: "creSiteArchitectureInput.pricing + accepted artifact pricing copy",
      },
    ],
  };
}

export function buildCrePaymentConfigurationPlan(offers: CanonicalOffer[]): CREPaymentConfigurationPlan {
  return {
    plan: "CREPaymentConfigurationPlan",
    products: offers.map((offer) => ({
      paymentProduct: `cre_${offer.offer.toLowerCase().replace(/[^a-z]+/g, "_")}`,
      paymentPrice: `cre_${offer.offer.toLowerCase().replace(/[^a-z]+/g, "_")}_${offer.amountUsd}`,
      currency: "USD",
      billingModel: offer.billingModel,
      recurrence: offer.billingModel === "RECURRING_ANNUAL" ? "year" : null,
      taxHandlingState: "UNCONFIGURED",
      checkoutMode: offer.billingModel === "RECURRING_ANNUAL" ? "subscription" : "payment",
      successUrl: "UNCONFIGURED_PENDING_PRODUCTION_DOMAIN",
      cancelUrl: "UNCONFIGURED_PENDING_PRODUCTION_DOMAIN",
      plannedSuccessPath: "/early-access?checkout=success",
      plannedCancelPath: "/pricing",
      metadata: {
        ventureId: CRE_VENTURE_ID,
        artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
        offer: offer.offer,
        infrastructureUrlNotForActivation: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
      },
      ventureLinkage: CRE_VENTURE_ID,
      productLinkage: offer.offer,
    })),
    checkoutArchitecture: "PASS",
    webhookArchitecture: "PASS",
    revenueLineage: revenueLineageFeedsPerformanceIntelligence() ? "PASS" : "FAIL",
    webhookEventMap: [
      { category: "checkout completion", canonicalEvent: "CHECKOUT_COMPLETED" },
      { category: "payment success", canonicalEvent: "PAYMENT_SUCCEEDED" },
      { category: "payment failure", canonicalEvent: "PAYMENT_FAILED" },
      { category: "subscription lifecycle", canonicalEvent: "SUBSCRIPTION_STARTED|SUBSCRIPTION_RENEWED|SUBSCRIPTION_CANCELLED" },
      { category: "refund", canonicalEvent: "REFUND_CREATED" },
    ],
  };
}

export async function executeCreStripeCapabilityAndPaymentReadiness(input: {
  probePayments?: typeof probePaymentsLive;
  fetchImpl?: typeof fetch;
} = {}): Promise<StripeChildResult> {
  const inventory = buildProviderInventory();
  const probe = await (input.probePayments ?? probePaymentsLive)();
  const key = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  const connected: "YES" | "NO" = probe.balanceAccessible || probe.realProviderCall ? "YES" : key.length > 0 && probe.status !== "NOT_CONFIGURED" ? "YES" : "NO";
  const environment = inventory.payments.environment === "TEST" || inventory.payments.environment === "LIVE"
    ? inventory.payments.environment
    : "UNKNOWN";

  let safeAccountIdentity = "UNKNOWN";
  let accountRead = false;
  let paymentIntentRead = false;
  let chargeRead = false;
  let refundRead = false;
  let eventRead = false;
  if (key.length > 0) {
    const headers = { Authorization: `Bearer ${key}` };
    const fetchImpl = input.fetchImpl ?? fetch;
    const accountRes = await fetchImpl("https://api.stripe.com/v1/account", { method: "GET", headers });
    if (accountRes.ok) {
      accountRead = true;
      const body = (await accountRes.json()) as {
        id?: string;
        livemode?: boolean;
        country?: string;
        type?: string;
        charges_enabled?: boolean;
        payouts_enabled?: boolean;
        business_profile?: { name?: string | null } | null;
      };
      safeAccountIdentity = safeAccountLabel(body);
    } else {
      try {
        await accountRes.arrayBuffer();
      } catch {
        /* consumed */
      }
      safeAccountIdentity = probe.balanceAccessible
        ? "balance_read_verified; account_id UNKNOWN"
        : "UNKNOWN";
    }
    const extras = await Promise.all([
      getOk("https://api.stripe.com/v1/payment_intents?limit=1", headers, fetchImpl),
      getOk("https://api.stripe.com/v1/charges?limit=1", headers, fetchImpl),
      getOk("https://api.stripe.com/v1/refunds?limit=1", headers, fetchImpl),
      getOk("https://api.stripe.com/v1/events?limit=1", headers, fetchImpl),
    ]);
    paymentIntentRead = extras[0]!;
    chargeRead = extras[1]!;
    refundRead = extras[2]!;
    eventRead = extras[3]!;
  }

  const stripeConnected = connected === "YES" && (probe.balanceAccessible || accountRead || probe.productsCapability);
  const capabilities: Record<StripeCapabilityId, ProviderMatrixStatus> = {
    "account.read": readStatus(accountRead, stripeConnected || key.length > 0),
    "product.read": readStatus(probe.productsCapability, stripeConnected || probe.realProviderCall),
    "product.create": "UNVERIFIED",
    "price.read": readStatus(probe.pricesCapability, stripeConnected || probe.realProviderCall),
    "price.create": "UNVERIFIED",
    "checkout/session.create": "UNVERIFIED",
    "payment_link.create": "UNAVAILABLE",
    "webhook_endpoint.read": readStatus(probe.webhooksCapability, stripeConnected || probe.realProviderCall),
    "webhook_endpoint.create": "UNVERIFIED",
    "payment_intent.read": readStatus(paymentIntentRead, key.length > 0),
    "charge.read": readStatus(chargeRead, key.length > 0),
    "refund.read": readStatus(refundRead, key.length > 0),
    "event.read": readStatus(eventRead, key.length > 0),
    "transaction/balance.read": readStatus(probe.balanceAccessible, stripeConnected || probe.realProviderCall),
  };

  const { offers, consistency } = reconcileCreCanonicalOffers();
  const plan = consistency === "PASS" ? buildCrePaymentConfigurationPlan(offers) : null;
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected,
    stripeVerification: probe.status === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    stripeEnvironment: environment,
    offersConsistent: consistency === "PASS",
    checkoutArchitecture: plan?.checkoutArchitecture === "PASS",
    webhookArchitecture: plan?.webhookArchitecture === "PASS",
    revenueLineage: plan?.revenueLineage === "PASS",
    domainBound: false,
    legalReady: false,
  });
  const configurationReady = paymentGate.result === "CONFIGURATION_REQUIRED" || paymentGate.result === "READY_NOT_ACTIVE";

  return {
    mission: "CRE_STRIPE_CAPABILITY_AND_PAYMENT_CONFIGURATION_READINESS_V1",
    connected: stripeConnected ? "YES" : "NO",
    environment,
    safeAccountIdentity,
    providerVerification: stripeConnected ? "PASS" : "FAIL",
    capabilities,
    offers,
    offerConsistency: consistency,
    plan,
    planStatus: plan ? "BUILT" : "FAIL",
    paymentGate,
    configurationReady,
    activationReady: false,
    blockers: paymentGate.reasons,
    stripeWrites: 0,
    paymentActivations: 0,
    realCharges: 0,
    testCharges: 0,
    nextAuthorization:
      consistency === "FAIL"
        ? "PAYMENT_OFFER_RECONCILIATION_REQUIRED"
        : "GOVERNED_CRE_PAYMENT_CONFIGURATION_REQUIRED",
  };
}
