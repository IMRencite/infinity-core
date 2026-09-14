import type { ClassifiedMercuryTransaction, MercuryTxnClass } from "./types";

const STRIPE_MARK = /\bstripe\b|stripe payments|stripe payout|stripe settlement/i;
const FOUNDER_MARK = /\bfounder\b|\bowner\b|\bcapital contribution\b|\bpersonal\b/i;
const INFRA_MARK = /\bvercel\b|\baws\b|\bcloudflare\b|\bgithub\b|\brender\b|\bhosting\b|\bdigitalocean\b/i;
const DOMAIN_MARK = /\bnamecheap\b|\bgodaddy\b|\bcloudflare registrar\b|\bdomain\b/i;
const GROWTH_MARK = /\bgoogle ads\b|\bmeta ads\b|\bfacebook ads\b|\badvertis/i;
const FULFILLMENT_MARK = /\bfulfillment\b|\bshipping\b|\busps\b|\bups\b|\bfedex\b/i;
const PROVIDER_MARK = /\bopenai\b|\banthropic\b|\bgemini\b|\bopenrouter\b|\bresend\b/i;

function textOf(txn: { description?: string | null; merchant?: string | null }): string {
  return `${txn.description ?? ""} ${txn.merchant ?? ""}`.trim();
}

export function classifyMercuryTransaction(input: {
  safe_transaction_id: string;
  account_id: string;
  amount: number | null;
  currency?: string;
  description?: string | null;
  merchant?: string | null;
  occurred_at?: string | null;
  status?: string;
}): ClassifiedMercuryTransaction {
  const text = textOf(input);
  const amount = input.amount;
  const evidence: string[] = [];
  let classification: MercuryTxnClass = "UNKNOWN";
  let stripe_settlement = false;

  if (STRIPE_MARK.test(text)) {
    classification = "STRIPE_SETTLEMENT";
    stripe_settlement = true;
    evidence.push("COUNTERPARTY_OR_DESCRIPTION_STRIPE");
  } else if (amount != null && amount > 0 && FOUNDER_MARK.test(text)) {
    classification = "FOUNDER_FUNDING";
    evidence.push("FOUNDER_FUNDING_MARK");
  } else if (amount != null && amount < 0 && INFRA_MARK.test(text)) {
    classification = "INFRASTRUCTURE_EXPENSE";
    evidence.push("INFRASTRUCTURE_MERCHANT");
  } else if (amount != null && amount < 0 && DOMAIN_MARK.test(text)) {
    classification = "DOMAIN_EXPENSE";
    evidence.push("DOMAIN_MERCHANT");
  } else if (amount != null && amount < 0 && GROWTH_MARK.test(text)) {
    classification = "GROWTH_EXPENSE";
    evidence.push("GROWTH_MERCHANT");
  } else if (amount != null && amount < 0 && FULFILLMENT_MARK.test(text)) {
    classification = "FULFILLMENT_EXPENSE";
    evidence.push("FULFILLMENT_MERCHANT");
  } else if (amount != null && amount < 0 && PROVIDER_MARK.test(text)) {
    classification = "PROVIDER_EXPENSE";
    evidence.push("PROVIDER_MERCHANT");
  } else if (amount != null && amount > 0 && /transfer|internal/i.test(text)) {
    classification = "TRANSFER";
    evidence.push("TRANSFER_MARK");
  } else if (amount != null && amount > 0) {
    classification = "UNKNOWN";
    evidence.push("INFLOW_WITHOUT_EVIDENCE");
  } else if (amount != null && amount < 0) {
    classification = "UNKNOWN";
    evidence.push("OUTFLOW_WITHOUT_EXPENSE_EVIDENCE");
  }

  return {
    safe_transaction_id: input.safe_transaction_id,
    account_id: input.account_id,
    amount,
    currency: input.currency ?? "USD",
    classification,
    description: input.description ?? null,
    merchant: input.merchant ?? null,
    occurred_at: input.occurred_at ?? null,
    status: input.status ?? "UNKNOWN",
    stripe_settlement,
    evidence,
  };
}

export function identifyStripeSettlements(
  transactions: ClassifiedMercuryTransaction[],
): ClassifiedMercuryTransaction[] {
  return transactions.filter((row) => row.stripe_settlement || row.classification === "STRIPE_SETTLEMENT");
}

export function isAmbiguousExpense(txn: ClassifiedMercuryTransaction): boolean {
  return txn.classification === "UNKNOWN" && txn.amount != null && txn.amount < 0;
}
