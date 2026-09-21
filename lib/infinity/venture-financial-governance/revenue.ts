import type { NamedGate, VentureRefundEvent, VentureRevenueEvent } from "./types";
import { FINANCIAL_EVENT_IDEMPOTENCY_GATE, VENTURE_REVENUE_EVENT_CONTRACT } from "./types";
import { mutateFinancialGovernance, inspectFinancialGovernance } from "./store";

function money(amount: unknown): number | null {
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  if (typeof amount === "string" && amount.trim()) {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function evaluateFinancialEventIdempotencyGate(idempotencyKey: string): NamedGate {
  const state = inspectFinancialGovernance();
  const duplicate =
    state.revenues.some((row) => row.idempotency_key === idempotencyKey) ||
    state.refunds.some((row) => row.idempotency_key === idempotencyKey);
  return {
    gate: FINANCIAL_EVENT_IDEMPOTENCY_GATE,
    result: "PASS",
    reasons: duplicate ? ["DUPLICATE_IGNORED"] : ["UNIQUE"],
  };
}

export function ingestCanonicalRevenueEvent(input: {
  venture_id: string;
  customer_ref?: string | null;
  offer?: string | null;
  price_usd?: number | null;
  payment_id: string;
  provider: string;
  gross_amount: number;
  paid_at?: string;
  fee_amount?: number | null;
  fulfillment_state?: VentureRevenueEvent["fulfillment_state"];
  synthetic?: boolean;
  unpaid?: boolean;
  provenance?: string;
}): { ingested: boolean; event: VentureRevenueEvent | null; reason: string } {
  if (input.synthetic) return { ingested: false, event: null, reason: "SYNTHETIC_EXCLUDED" };
  if (input.unpaid) return { ingested: false, event: null, reason: "UNPAID_EXCLUDED" };
  const amount = money(input.gross_amount);
  if (amount == null || amount <= 0) return { ingested: false, event: null, reason: "INVALID_AMOUNT" };
  const key = `rev:${input.provider}:${input.payment_id}`;
  const existing = inspectFinancialGovernance().revenues.find((row) => row.idempotency_key === key);
  if (existing) return { ingested: false, event: existing, reason: "DUPLICATE_IGNORED" };
  const event: VentureRevenueEvent = {
    contract: VENTURE_REVENUE_EVENT_CONTRACT,
    event_id: key,
    idempotency_key: key,
    venture_id: input.venture_id,
    customer_ref: input.customer_ref ?? null,
    offer: input.offer ?? null,
    price_usd: input.price_usd ?? amount,
    payment_id: input.payment_id,
    provider: input.provider,
    gross_amount: amount,
    currency: "USD",
    paid_at: input.paid_at ?? new Date().toISOString(),
    refund_status: "NONE",
    refunded_amount: 0,
    fee_amount: input.fee_amount ?? null,
    fee_status: input.fee_amount == null ? "UNKNOWN" : "ACTUAL",
    fulfillment_state: input.fulfillment_state ?? "PAYMENT_RECEIVED",
    synthetic: false,
    unpaid: false,
    provenance: input.provenance ?? "canonical-revenue-ingest",
  };
  mutateFinancialGovernance((state) => {
    state.revenues.push(event);
    state.last_payment_sync = event.paid_at;
    state.last_ledger_calc = event.paid_at;
  });
  return { ingested: true, event, reason: "INGESTED" };
}

export function ingestCanonicalRefundEvent(input: {
  venture_id: string;
  payment_id: string;
  amount: number;
  refunded_at?: string;
  provider_ref: string;
  reason?: string | null;
}): { ingested: boolean; event: VentureRefundEvent | null; reason: string } {
  const amount = money(input.amount);
  if (amount == null || amount <= 0) return { ingested: false, event: null, reason: "INVALID_AMOUNT" };
  const key = `ref:${input.provider_ref}`;
  const existing = inspectFinancialGovernance().refunds.find((row) => row.idempotency_key === key);
  if (existing) return { ingested: false, event: existing, reason: "DUPLICATE_IGNORED" };
  const event: VentureRefundEvent = {
    refund_id: key,
    idempotency_key: key,
    venture_id: input.venture_id,
    payment_id: input.payment_id,
    amount,
    currency: "USD",
    refunded_at: input.refunded_at ?? new Date().toISOString(),
    provider_ref: input.provider_ref,
    reason: input.reason ?? null,
  };
  mutateFinancialGovernance((state) => {
    state.refunds.push(event);
    const original = state.revenues.find((row) => row.payment_id === input.payment_id && row.venture_id === input.venture_id);
    if (original) {
      original.refunded_amount += amount;
      original.refund_status = original.refunded_amount >= original.gross_amount ? "FULL" : "PARTIAL";
      if (original.refund_status === "FULL") original.fulfillment_state = "REFUNDED";
    }
    state.last_payment_sync = event.refunded_at;
    state.last_ledger_calc = event.refunded_at;
  });
  return { ingested: true, event, reason: "INGESTED" };
}

export function evaluateVentureRevenueEventContract(event: VentureRevenueEvent | null): NamedGate {
  return {
    gate: VENTURE_REVENUE_EVENT_CONTRACT,
    result: event?.contract === VENTURE_REVENUE_EVENT_CONTRACT && event.synthetic === false ? "PASS" : "FAIL",
    reasons: event ? [] : ["MISSING"],
  };
}
