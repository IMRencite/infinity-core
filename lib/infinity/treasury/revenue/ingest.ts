import type { CommercialPaymentEvent } from "@/lib/infinity/commercialization/types";
import { applyVentureRevenue } from "../allocations/venture";
import { recordLedgerEntry } from "../ledger/engine";
import type { TreasuryStore } from "../store";
import { actualAmount } from "../types";

/**
 * Consume existing commercialization payment events into the Treasury ledger.
 * Idempotent on commercial payment event id — does not double-count.
 */
export function ingestCommercialRevenueEvent(
  store: TreasuryStore,
  event: CommercialPaymentEvent,
): { ingested: boolean; duplicate: boolean } {
  const existing = store.findByIdempotency(
    event.organizationId,
    `treasury:commercial-revenue:${event.id}`,
    store.ledger,
  );
  if (existing) return { ingested: false, duplicate: true };

  if (event.eventType === "REFUND_CREATED") {
    const amount = event.grossAmountUsd ?? event.netAmountUsd;
    if (amount == null || event.amountTruth === "UNKNOWN") return { ingested: false, duplicate: false };
    recordLedgerEntry(store, {
      organizationId: event.organizationId,
      ventureId: event.ventureId,
      type: "REFUND",
      amount: actualAmount(amount, event.currency),
      provider: event.provider,
      commercialPaymentEventId: event.id,
      occurredAt: event.processedAt ?? event.createdAt,
      idempotencyKey: `treasury:commercial-revenue:${event.id}`,
    });
    return { ingested: true, duplicate: false };
  }

  if (event.eventType !== "PAYMENT_SUCCEEDED" && event.eventType !== "CHECKOUT_COMPLETED" && event.eventType !== "SUBSCRIPTION_RENEWED") {
    return { ingested: false, duplicate: false };
  }

  const gross = event.grossAmountUsd;
  if (gross == null || event.amountTruth === "UNKNOWN") return { ingested: false, duplicate: false };

  recordLedgerEntry(store, {
    organizationId: event.organizationId,
    ventureId: event.ventureId,
    type: "REVENUE",
    subtype: "GROSS_REVENUE",
    amount: actualAmount(gross, event.currency),
    provider: event.provider,
    commercialPaymentEventId: event.id,
    occurredAt: event.processedAt ?? event.createdAt,
    idempotencyKey: `treasury:commercial-revenue:${event.id}`,
  });

  if (event.feeAmountUsd != null && event.feeAmountUsd > 0) {
    recordLedgerEntry(store, {
      organizationId: event.organizationId,
      ventureId: event.ventureId,
      type: "EXPENSE",
      subtype: "PAYMENT_PROCESSING_FEE",
      amount: actualAmount(event.feeAmountUsd, event.currency),
      provider: event.provider,
      commercialPaymentEventId: event.id,
      occurredAt: event.processedAt ?? event.createdAt,
      idempotencyKey: `treasury:commercial-fee:${event.id}`,
    });
  }

  const allocation = [...store.allocations.values()].find(
    (a) => a.organizationId === event.organizationId && a.ventureId === event.ventureId,
  );
  if (allocation && event.netAmountUsd != null) {
    const prior = allocation.actualRevenue.actuality === "ACTUAL" ? allocation.actualRevenue.value ?? 0 : 0;
    applyVentureRevenue(store, allocation.allocationId, actualAmount(prior + event.netAmountUsd, event.currency));
  }

  return { ingested: true, duplicate: false };
}

export function recordCapitalContribution(
  store: TreasuryStore,
  input: {
    organizationId: string;
    ventureId?: string | null;
    amountUsd: number;
    currency?: string;
    source?: "FOUNDER_CAPITAL" | "INVESTOR_CAPITAL" | "OPERATOR_CAPITAL" | "MANUAL_TREASURY_ADJUSTMENT";
    provider?: string | null;
    financialActionRequestId?: string | null;
    idempotencyKey: string;
  },
) {
  return recordLedgerEntry(store, {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    type: "CAPITAL_CONTRIBUTION",
    subtype: input.source ?? "FOUNDER_CAPITAL",
    amount: actualAmount(input.amountUsd, input.currency ?? "USD"),
    provider: input.provider ?? null,
    financialActionRequestId: input.financialActionRequestId,
    idempotencyKey: input.idempotencyKey,
  });
}
