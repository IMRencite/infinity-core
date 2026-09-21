import { commercialEventToPerformanceEvents } from "@/lib/infinity/commercialization/revenue/webhook-ingest";
import { revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { OCCUPANCYNPV_STRIPE_VENTURE } from "./constants";
import type { OccupancynpvCanonicalPaymentEvent } from "./occupancynpv-canonical-webhook";

export const OCCUPANCYNPV_ANALYTICS_PROVIDER = "infinity.performance_intelligence" as const;

export const OCCUPANCYNPV_ANALYTICS_EVENTS = [
  "CHECKOUT_STARTED",
  "CHECKOUT_COMPLETED",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_CANCELLED",
] as const satisfies readonly OccupancynpvCanonicalPaymentEvent[];

export function occupancynpvAnalyticsRecordsRevenueFromPageLoad(): false {
  return false;
}

export function occupancynpvAnalyticsRecordsSuccessFromRedirect(): false {
  return false;
}

export function inspectOccupancynpvPrivacyAlignment(input: {
  privacyBody: string;
  addedThirdPartyProcessor: boolean;
  paymentsLive: boolean;
}): "PASS" | "UPDATE_REQUIRED" {
  if (input.addedThirdPartyProcessor) return "UPDATE_REQUIRED";
  if (input.paymentsLive && /does not collect payment card data or process purchases/i.test(input.privacyBody)) {
    return "UPDATE_REQUIRED";
  }
  if (/gtag\(|googletagmanager|plausible\.io|facebook\.net/i.test(input.privacyBody) && !/processor/i.test(input.privacyBody)) {
    return "UPDATE_REQUIRED";
  }
  return "PASS";
}

export function occupancynpvRevenueAttributionReady(): boolean {
  return revenueLineageFeedsPerformanceIntelligence();
}

export function occupancynpvPerformanceLineageProbe() {
  const events = commercialEventToPerformanceEvents({
    event: {
      id: "pay_occupancynpv_lineage_probe",
      organizationId: "org",
      ventureId: OCCUPANCYNPV_STRIPE_VENTURE,
      provider: "stripe",
      providerEventId: "evt_occupancynpv_probe",
      eventType: "PAYMENT_SUCCEEDED",
      commercialProductId: "PROFESSIONAL",
      commercialPriceId: "price_1UCs7hLdvXKx7R7GF2TPmwGL",
      grossAmountUsd: 290,
      feeAmountUsd: 0,
      netAmountUsd: 290,
      amountTruth: "ACTUAL",
      currency: "USD",
      customerReference: null,
      payloadSanitized: {},
      processedAt: new Date().toISOString(),
      idempotencyKey: "occupancynpv:analytics:lineage",
      createdAt: new Date().toISOString(),
    },
    sourceId: "occupancynpv-canonical-analytics",
  });
  return {
    ready: events.length === 2 && occupancynpvRevenueAttributionReady(),
    metrics: events.map((row) => row.metric),
    events: [...OCCUPANCYNPV_ANALYTICS_EVENTS],
  };
}
