import { ingestCanonicalRefundEvent, ingestCanonicalRevenueEvent } from "./revenue";

export function syncCommercialPaymentToVentureLedger(input: {
  venture_id: string;
  event_type: string;
  payment_id: string;
  provider: string;
  gross_amount: number | null;
  fee_amount?: number | null;
  customer_ref?: string | null;
  offer?: string | null;
  paid_at?: string;
  synthetic?: boolean;
  unpaid?: boolean;
  fulfillment_state?: "PAYMENT_RECEIVED" | "FULFILLMENT_PENDING" | "FULFILLMENT_COMPLETED" | "REFUNDED";
  refund_amount?: number | null;
  refund_ref?: string | null;
  refund_reason?: string | null;
}): { ingested: boolean; reason: string } {
  if (input.synthetic) return { ingested: false, reason: "SYNTHETIC_EXCLUDED" };
  if (input.unpaid) return { ingested: false, reason: "UNPAID_EXCLUDED" };
  if (input.event_type === "REFUND_CREATED") {
    if (input.refund_amount == null && input.gross_amount == null) return { ingested: false, reason: "INVALID_AMOUNT" };
    const refund = ingestCanonicalRefundEvent({
      venture_id: input.venture_id,
      payment_id: input.payment_id,
      amount: input.refund_amount ?? input.gross_amount ?? 0,
      refunded_at: input.paid_at,
      provider_ref: input.refund_ref ?? `refund:${input.provider}:${input.payment_id}`,
      reason: input.refund_reason ?? null,
    });
    return { ingested: refund.ingested, reason: refund.reason };
  }
  if (input.event_type !== "PAYMENT_SUCCEEDED" && input.event_type !== "SUBSCRIPTION_RENEWED") {
    return { ingested: false, reason: "NOT_ACTUAL_CASH_RECEIVED" };
  }
  if (input.gross_amount == null) return { ingested: false, reason: "INVALID_AMOUNT" };
  const revenue = ingestCanonicalRevenueEvent({
    venture_id: input.venture_id,
    customer_ref: input.customer_ref,
    offer: input.offer,
    price_usd: input.gross_amount,
    payment_id: input.payment_id,
    provider: input.provider,
    gross_amount: input.gross_amount,
    paid_at: input.paid_at,
    fee_amount: input.fee_amount,
    fulfillment_state: input.fulfillment_state ?? "PAYMENT_RECEIVED",
    synthetic: false,
    unpaid: false,
    provenance: "commercial-payment-webhook",
  });
  return { ingested: revenue.ingested, reason: revenue.reason };
}
