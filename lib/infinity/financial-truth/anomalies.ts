import type {
  ActualEconomics,
  ClassifiedMercuryTransaction,
  FinancialAnomaly,
  MercuryCashSnapshot,
  NamedFinancialGate,
  StripeCashSnapshot,
  StripeMercurySettlementReconciliation,
} from "./types";
import { FINANCIAL_RECONCILIATION_ANOMALY_GATE } from "./types";

export function detectFinancialAnomalies(input: {
  mercury: MercuryCashSnapshot;
  stripe: StripeCashSnapshot;
  actual: ActualEconomics;
  reconciliation: StripeMercurySettlementReconciliation;
  ledgerPaymentIds: string[];
  stripePaymentIds: string[];
  ledgerRefundIds: string[];
  stripeRefundIds: string[];
}): FinancialAnomaly[] {
  const anomalies: FinancialAnomaly[] = [...input.reconciliation.anomalies];

  for (const paymentId of input.stripePaymentIds) {
    if (!input.ledgerPaymentIds.includes(paymentId)) {
      anomalies.push({
        code: "PAYMENT_WITHOUT_REVENUE_EVENT",
        detail: `Stripe payment ${paymentId} has no ledger revenue event`,
        severity: "WARN",
      });
    }
  }
  for (const refundId of input.stripeRefundIds) {
    if (!input.ledgerRefundIds.includes(refundId)) {
      anomalies.push({
        code: "REFUND_WITHOUT_LEDGER_EVENT",
        detail: `Stripe refund ${refundId} has no ledger refund event`,
        severity: "WARN",
      });
    }
  }
  if (
    input.stripe.processor_fees != null &&
    input.actual.processor_fees != null &&
    Math.abs(input.stripe.processor_fees - input.actual.processor_fees) > 0.02
  ) {
    anomalies.push({
      code: "STRIPE_FEE_MISSING_FROM_LEDGER",
      detail: "Stripe processor fees do not match ledger fees",
      severity: "WARN",
    });
  }
  if (
    input.actual.gross_revenue != null &&
    input.stripe.balance_transactions.some((row) => row.type === "charge") &&
    input.reconciliation.stripe_to_ledger === "FAIL"
  ) {
    anomalies.push({
      code: "LEDGER_REVENUE_INCONSISTENT_WITH_STRIPE",
      detail: "Ledger gross revenue does not match Stripe charge totals",
      severity: "FAIL",
    });
  }
  if (input.mercury.freshness === "STALE" || input.stripe.freshness === "STALE") {
    anomalies.push({
      code: "STALE_FINANCIAL_SOURCE",
      detail: "A live financial source is stale",
      severity: "WARN",
    });
  }
  const unexpected = input.mercury.transactions.filter(
    (row) => row.classification === "UNKNOWN" && row.amount != null && row.amount !== 0,
  );
  for (const txn of unexpected) {
    anomalies.push({
      code: "UNEXPECTED_BANK_TRANSACTION",
      detail: `Unclassified Mercury transaction ${txn.safe_transaction_id}`,
      severity: "INFO",
    });
  }
  return anomalies;
}

export function evaluateFinancialReconciliationAnomalyGate(anomalies: FinancialAnomaly[]): NamedFinancialGate {
  const failing = anomalies.filter((row) => row.severity === "FAIL");
  return {
    gate: FINANCIAL_RECONCILIATION_ANOMALY_GATE,
    result: failing.length === 0 ? "PASS" : "FAIL",
    reasons: anomalies.map((row) => row.code),
  };
}

export function unexpectedBankTransactions(txns: ClassifiedMercuryTransaction[]): ClassifiedMercuryTransaction[] {
  return txns.filter((row) => row.classification === "UNKNOWN");
}
