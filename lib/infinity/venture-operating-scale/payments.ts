import { commercialEventToPerformanceEvents } from "@/lib/infinity/commercialization/revenue/webhook-ingest";
import { resolveConnectWriteReadiness } from "@/lib/infinity/payment-architecture/readiness";
import {
  evaluateFulfillmentReadinessGate,
  evaluatePaidOfferFulfillmentInvariant,
  FULFILLMENT_UNCONFIGURED_REASON,
  type FulfillmentReadinessResult,
} from "./fulfillment";
import { unconfiguredSecretReference } from "./secrets";
import type {
  PaymentProviderBinding,
  PaymentReadinessGateResult,
  RevenueLineageStep,
} from "./types";

export const REVENUE_LINEAGE: RevenueLineageStep[] = [
  "payment_provider",
  "transaction_observation",
  "normalized_financial_event",
  "venture_revenue_metric",
  "kpi_aggregation",
  "expected_vs_actual",
  "learning_system",
];

export const STRIPE_CAPABILITY_REQUIREMENTS = {
  "product.creation": "LIVE_WRITE_VERIFICATION_REQUIRED",
  "price.creation": "LIVE_WRITE_VERIFICATION_REQUIRED",
  "checkout.session.configuration": "LIVE_WRITE_VERIFICATION_REQUIRED",
  "webhook.setup": "LIVE_WRITE_VERIFICATION_REQUIRED",
  "transaction.observation": "READ_ONLY_VERIFICATION_REQUIRED",
  "refund.read": "READ_ONLY_VERIFICATION_REQUIRED",
  "revenue.telemetry": "READ_ONLY_VERIFICATION_REQUIRED",
} as const;

export function buildPaymentProviderBinding(): PaymentProviderBinding {
  return {
    provider: "UNCONFIGURED",
    capabilityRouted: true,
    accountBinding: unconfiguredSecretReference(),
    writeAuthorized: false,
  };
}

export function evaluatePaymentReadinessGate(input?: {
  stripeConnected?: boolean;
  stripeVerification?: "UNAVAILABLE" | "UNVERIFIED" | "READ_ONLY_VERIFIED" | "LIVE_WRITE_VERIFIED" | null;
  stripeEnvironment?: "TEST" | "LIVE" | "UNKNOWN" | null;
  offersConsistent?: boolean;
  checkoutArchitecture?: boolean;
  webhookArchitecture?: boolean;
  revenueLineage?: boolean;
  domainBound?: boolean;
  legalReady?: boolean;
  objectsConfigured?: boolean;
  paymentsActivated?: boolean;
  fulfillment?: FulfillmentReadinessResult;
  paidOfferExists?: boolean;
}): PaymentReadinessGateResult {
  const stripe = resolveConnectWriteReadiness({
    stripeVerification: input?.stripeVerification ?? null,
    stripeEnvironment: input?.stripeEnvironment ?? null,
  });
  if (!input) {
    return {
      gate: "PaymentReadinessGate",
      result: "NOT_READY",
      paymentsActive: false,
      reasons: [
        "offer_price_unconfigured",
        "legal_pages_unconfigured",
        "domain_public_url_unconfigured",
        "checkout_untested",
        "webhook_unverified",
        "revenue_telemetry_unconfigured",
        "fulfillment_unconfigured",
        stripe.readOnlyVerificationGrantsConnectWrites
          ? "stripe_read_granted_write"
          : "stripe_read_only_does_not_grant_write",
      ],
    };
  }
  const reasons: string[] = [];
  if (!input.offersConsistent) reasons.push("offer_price_unconfigured");
  if (!input.legalReady) reasons.push("legal_pages_unconfigured");
  if (!input.domainBound) reasons.push("domain_public_url_unconfigured");
  if (!input.checkoutArchitecture) reasons.push("checkout_untested");
  if (!input.webhookArchitecture) reasons.push("webhook_unverified");
  if (!input.revenueLineage) reasons.push("revenue_telemetry_unconfigured");
  if (!input.stripeConnected) reasons.push("stripe_unconnected");
  if (stripe.readOnlyVerificationGrantsConnectWrites) reasons.push("stripe_read_granted_write");
  else reasons.push("stripe_read_only_does_not_grant_write");
  reasons.push("live_payment_objects_not_written");
  if (input.paymentsActivated === true) reasons.push("payment_activation_authorized");
  else reasons.push("payment_activation_not_authorized");
  const fulfillment = evaluateFulfillmentReadinessGate({ fulfillment: input.fulfillment });
  if (fulfillment.result !== "PASS") reasons.push(FULFILLMENT_UNCONFIGURED_REASON);
  const paidOfferExists = input.paidOfferExists !== false;
  const invariant = evaluatePaidOfferFulfillmentInvariant({
    paidOfferExists,
    fulfillment: fulfillment.result,
  });
  const configurationReady =
    Boolean(input.stripeConnected) &&
    Boolean(input.offersConsistent) &&
    Boolean(input.checkoutArchitecture) &&
    Boolean(input.webhookArchitecture) &&
    Boolean(input.revenueLineage);
  const objectsConfigured = Boolean(input.objectsConfigured);
  const activationReady = configurationReady && objectsConfigured && Boolean(input.domainBound) && Boolean(input.legalReady);
  if (activationReady && invariant.paymentActivation === "BLOCKED") {
    return {
      gate: "PaymentReadinessGate",
      result: "BLOCKED",
      paymentsActive: false,
      reasons,
    };
  }
  if (input.paymentsActivated === true && activationReady && fulfillment.result === "PASS") {
    return {
      gate: "PaymentReadinessGate",
      result: "PAYMENTS_ACTIVE",
      paymentsActive: true,
      reasons,
    };
  }
  return {
    gate: "PaymentReadinessGate",
    result: activationReady
      ? "READY_NOT_ACTIVE"
      : objectsConfigured
        ? "CONFIGURATION_COMPLETE"
        : configurationReady
          ? "CONFIGURATION_REQUIRED"
          : "NOT_READY",
    paymentsActive: false,
    reasons,
  };
}

export function revenueLineageFeedsPerformanceIntelligence(): boolean {
  const events = commercialEventToPerformanceEvents({
    event: {
      id: "pay_lineage_probe",
      organizationId: "org",
      ventureId: "venture",
      provider: "stripe",
      providerEventId: "evt_probe",
      eventType: "PAYMENT_SUCCEEDED",
      commercialProductId: null,
      commercialPriceId: null,
      grossAmountUsd: 1,
      feeAmountUsd: 0,
      netAmountUsd: 1,
      amountTruth: "ACTUAL",
      currency: "USD",
      customerReference: null,
      payloadSanitized: {},
      processedAt: "2026-09-05T00:00:00.000Z",
      idempotencyKey: "lineage_probe",
      createdAt: "2026-09-05T00:00:00.000Z",
    },
    sourceId: "venture_operating_scale_v1",
  });
  return (
    REVENUE_LINEAGE.includes("learning_system") &&
    events.every((row) => row.metric === "gross_revenue_usd" || row.metric === "net_revenue_usd")
  );
}
