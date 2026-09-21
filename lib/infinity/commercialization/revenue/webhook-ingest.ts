import { newId, nowIso, type CommercializationStore } from "../store";
import { recordLedgerEntry } from "../treasury/spend-authority";
import type { CommercialEntitlement, CommercialPaymentEvent, PaymentEventType } from "../types";
import type { PaymentCapability } from "../providers/contracts";
import type { NormalizedPerformanceEvent } from "@/lib/infinity/performance-intelligence-engine/types";
import { syncCommercialPaymentToVentureLedger } from "@/lib/infinity/venture-financial-governance/commercial-bridge";

const REDACTED = "[redacted]";

export function sanitizePaymentPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/secret|token|authorization|api_key|card|cvv|ssn/i.test(key)) {
      out[key] = REDACTED;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      out[key] = sanitizePaymentPayload(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export type IngestPaymentEventInput = {
  store: CommercializationStore;
  payments: PaymentCapability;
  organizationId: string;
  ventureId: string;
  commercialProductId: string;
  commercialPriceId: string;
  webhookSecret: string;
  signature: string;
  rawPayload: string;
};

export type IngestPaymentEventResult = {
  event: CommercialPaymentEvent | null;
  duplicate: boolean;
  rejected: boolean;
  reason?: string;
};

export async function ingestPaymentWebhookEvent(input: IngestPaymentEventInput): Promise<IngestPaymentEventResult> {
  const verified = await input.payments.verifyWebhookEndpoint(
    input.webhookSecret,
    input.signature,
    input.rawPayload,
  );

  if (!verified.valid) {
    return { event: null, duplicate: false, rejected: true, reason: "INVALID_SIGNATURE" };
  }

  const parsed = input.payments.parseWebhookEvent(input.rawPayload);
  const existing = input.store.paymentEventByProviderId(
    input.organizationId,
    input.payments.providerKey,
    parsed.providerEventId,
  );
  if (existing) return { event: existing, duplicate: true, rejected: false };

  const idempotencyKey = `payment-event:${parsed.providerEventId}`;
  const existingByKey = input.store.findByIdempotency(input.organizationId, idempotencyKey, input.store.paymentEvents);
  if (existingByKey) return { event: existingByKey, duplicate: true, rejected: false };

  const gross = parsed.amountUsd ?? null;
  const fee = parsed.feeUsd ?? null;
  const net = gross != null && fee != null ? gross - fee : gross;

  const event: CommercialPaymentEvent = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    provider: input.payments.providerKey,
    providerEventId: parsed.providerEventId,
    eventType: parsed.eventType as PaymentEventType,
    commercialProductId: input.commercialProductId,
    commercialPriceId: input.commercialPriceId,
    grossAmountUsd: gross,
    feeAmountUsd: fee,
    netAmountUsd: net,
    amountTruth: gross != null ? "ACTUAL" : "UNKNOWN",
    currency: parsed.currency,
    customerReference: parsed.customerReference,
    payloadSanitized: sanitizePaymentPayload(parsed.rawPayload),
    processedAt: nowIso(),
    idempotencyKey,
    createdAt: nowIso(),
  };

  input.store.paymentEvents.set(event.id, event);
  input.store.registerIdempotency(input.organizationId, idempotencyKey, event.id);

  const payload = event.payloadSanitized as Record<string, unknown>;
  const synthetic =
    payload.synthetic === true ||
    payload.infinity_synthetic === true ||
    payload.test_checkout === true ||
    payload.synthetic_checkout === true;
  syncCommercialPaymentToVentureLedger({
    venture_id: event.ventureId,
    event_type: event.eventType,
    payment_id: event.providerEventId,
    provider: event.provider,
    gross_amount: event.eventType === "REFUND_CREATED" ? null : gross,
    fee_amount: fee,
    customer_ref: event.customerReference ?? undefined,
    offer: event.commercialPriceId ?? undefined,
    paid_at: event.processedAt ?? undefined,
    synthetic,
    unpaid: event.eventType === "CHECKOUT_COMPLETED",
    refund_amount: event.eventType === "REFUND_CREATED" ? (gross ?? parsed.amountUsd ?? null) : null,
    refund_ref: event.eventType === "REFUND_CREATED" ? parsed.providerEventId : null,
  });

  if (event.eventType === "PAYMENT_SUCCEEDED" && net != null) {
    recordLedgerEntry(input.store, {
      organizationId: input.organizationId,
      ventureId: input.ventureId,
      entryType: "GROSS_REVENUE",
      amountUsd: gross ?? net,
      truth: "ACTUAL",
      sourceType: "commercial_payment_event",
      sourceId: event.id,
      idempotencyKey: `ledger:gross:${idempotencyKey}`,
    });
    if (fee != null && fee > 0) {
      recordLedgerEntry(input.store, {
        organizationId: input.organizationId,
        ventureId: input.ventureId,
        entryType: "PAYMENT_PROCESSING_FEES",
        amountUsd: fee,
        truth: "ACTUAL",
        sourceType: "commercial_payment_event",
        sourceId: event.id,
        idempotencyKey: `ledger:fee:${idempotencyKey}`,
      });
    }
    recordLedgerEntry(input.store, {
      organizationId: input.organizationId,
      ventureId: input.ventureId,
      entryType: "NET_REVENUE",
      amountUsd: net,
      truth: "ACTUAL",
      sourceType: "commercial_payment_event",
      sourceId: event.id,
      idempotencyKey: `ledger:net:${idempotencyKey}`,
    });
  }

  return { event, duplicate: false, rejected: false };
}

export function fulfillPaymentEvent(input: {
  store: CommercializationStore;
  event: CommercialPaymentEvent;
}): CommercialEntitlement {
  const idempotencyKey = `fulfillment:${input.event.providerEventId}`;
  const existing = input.store.findByIdempotency(input.event.organizationId, idempotencyKey, input.store.entitlements);
  if (existing) return existing;

  const entitlement: CommercialEntitlement = {
    id: newId(),
    organizationId: input.event.organizationId,
    ventureId: input.event.ventureId,
    customerId: input.event.customerReference ?? "unknown",
    commercialProductId: input.event.commercialProductId!,
    commercialPriceId: input.event.commercialPriceId,
    providerSubscriptionId: null,
    entitlementType: "SAAS_ENTITLEMENT",
    status: "ACTIVE",
    paymentEventId: input.event.id,
    startedAt: nowIso(),
    expiresAt: null,
    idempotencyKey,
  };

  input.store.entitlements.set(entitlement.id, entitlement);
  input.store.registerIdempotency(input.event.organizationId, idempotencyKey, entitlement.id);
  return entitlement;
}

export function commercialEventToPerformanceEvents(input: {
  event: CommercialPaymentEvent;
  sourceId: string;
}): NormalizedPerformanceEvent[] {
  if (input.event.netAmountUsd == null) return [];
  const observedAt = input.event.processedAt ?? input.event.createdAt;

  return [
    {
      id: `${input.event.id}:gross`,
      sourceId: input.sourceId,
      sourceReference: input.event.providerEventId,
      eventType: "commercial_payment",
      metric: "gross_revenue_usd",
      value: input.event.grossAmountUsd ?? input.event.netAmountUsd,
      unit: "USD",
      ventureId: input.event.ventureId,
      occurredAt: observedAt,
      observedAt,
      provenance: { provider: input.event.provider, commercialProductId: input.event.commercialProductId ?? null },
    },
    {
      id: `${input.event.id}:net`,
      sourceId: input.sourceId,
      sourceReference: `${input.event.providerEventId}:net`,
      eventType: "commercial_payment",
      metric: "net_revenue_usd",
      value: input.event.netAmountUsd,
      unit: "USD",
      ventureId: input.event.ventureId,
      occurredAt: observedAt,
      observedAt,
      provenance: { provider: input.event.provider, commercialProductId: input.event.commercialProductId ?? null },
    },
  ];
}
