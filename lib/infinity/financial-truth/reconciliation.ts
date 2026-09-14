import type {
  ClassifiedMercuryTransaction,
  ReconciliationState,
  SettlementDestinationClassification,
  SettlementLineage,
  SettlementReconciliationStatus,
  StripeMercurySettlementReconciliation,
  StripePayoutRecord,
} from "./types";
import { SETTLEMENT_WINDOW_MS, STRIPE_MERCURY_SETTLEMENT_RECONCILIATION } from "./types";
import type { FinancialAnomaly } from "./types";
import { destinationIsKnownNonMercury, mercuryMatchExpected } from "./settlement-destination";

function almostEqual(a: number, b: number, epsilon = 0.02): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function matchPayoutToMercury(
  payout: StripePayoutRecord,
  mercuryTxns: ClassifiedMercuryTransaction[],
  nowMs = Date.now(),
): SettlementLineage {
  const settlements = mercuryTxns.filter((row) => row.stripe_settlement && row.amount != null && row.amount > 0);
  const exact = settlements.filter((row) => row.amount != null && almostEqual(row.amount, payout.amount));
  const payoutAt = Date.parse(payout.arrival_at ?? payout.created_at);
  const withinWindow = Number.isFinite(payoutAt) ? nowMs - payoutAt <= SETTLEMENT_WINDOW_MS : true;

  if (exact.length > 1) {
    return lineage(payout, exact[0]!, "PARTIALLY_RECONCILED");
  }
  if (exact.length === 1) {
    return lineage(payout, exact[0]!, "RECONCILED");
  }
  if (settlements.length === 0) {
    if (!Number.isFinite(payoutAt)) return lineage(payout, null, "UNKNOWN");
    return lineage(payout, null, withinWindow ? "PENDING_SETTLEMENT" : "UNRECONCILED");
  }
  const partial = settlements.find((row) => row.amount != null && row.amount > 0 && row.amount < payout.amount);
  if (partial) return lineage(payout, partial, "PARTIALLY_RECONCILED");
  return lineage(payout, null, withinWindow ? "PENDING_SETTLEMENT" : "UNRECONCILED");
}

function lineage(
  payout: StripePayoutRecord,
  mercury: ClassifiedMercuryTransaction | null,
  status: ReconciliationState,
): SettlementLineage {
  const observed = mercury?.amount ?? null;
  return {
    safe_payment_id: null,
    safe_balance_transaction_id: null,
    safe_payout_id: payout.safe_id,
    safe_mercury_transaction_id: mercury?.safe_transaction_id ?? null,
    amount: payout.amount,
    currency: payout.currency,
    expected_amount: payout.amount,
    observed_amount: observed,
    difference: observed == null ? null : Math.round((observed - payout.amount) * 100) / 100,
    status,
    timestamps: {
      payment_at: null,
      available_at: null,
      payout_at: payout.created_at,
      mercury_at: mercury?.occurred_at ?? null,
    },
    kind: "SETTLEMENT_BALANCE_TRANSFER",
    is_revenue: false,
  };
}

export function accountPayoutsForSettlement(input: {
  payouts: StripePayoutRecord[];
  recentAmount?: number | null;
  recentId?: string | null;
  recentStatus?: string | null;
  currency?: string;
}): StripePayoutRecord[] {
  if (input.payouts.length > 0) return input.payouts;
  if (input.recentAmount == null) return [];
  return [
    {
      safe_id: input.recentId ?? "po_recent",
      amount: input.recentAmount,
      currency: input.currency ?? "USD",
      status: input.recentStatus ?? "paid",
      arrival_at: null,
      created_at: new Date().toISOString(),
      destination_safe_ref: null,
    },
  ];
}

export function classifySettlementReconciliation(input: {
  destinationClassification: SettlementDestinationClassification;
  accountPayouts: StripePayoutRecord[];
  mercuryMatches: number;
}): SettlementReconciliationStatus {
  const paid = input.accountPayouts.filter((row) => /paid|in_transit|pending/i.test(row.status));
  if (destinationIsKnownNonMercury(input.destinationClassification) && paid.length > 0) {
    return "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED";
  }
  if (mercuryMatchExpected(input.destinationClassification)) {
    if (input.mercuryMatches > 0 && input.mercuryMatches === input.accountPayouts.length) return "FULLY_RECONCILED";
    if (paid.length > 0) return "PENDING";
  }
  if (input.accountPayouts.length === 0) return "UNKNOWN";
  if (input.destinationClassification === "UNKNOWN") return "UNKNOWN";
  return "UNKNOWN";
}

export function reconcileStripeMercury(input: {
  payouts: StripePayoutRecord[];
  mercuryTxns: ClassifiedMercuryTransaction[];
  mercuryConnected: boolean;
  ledgerGross: number | null;
  stripeChargeGross: number | null;
  nowMs?: number;
  destinationClassification?: SettlementDestinationClassification;
  accountPayouts?: StripePayoutRecord[];
}): StripeMercurySettlementReconciliation {
  const nowMs = input.nowMs ?? Date.now();
  const destination = input.destinationClassification ?? "UNKNOWN";
  const expectMercury = mercuryMatchExpected(destination);
  const accountPayouts = input.accountPayouts ?? [];

  if (!expectMercury && destinationIsKnownNonMercury(destination)) {
    const status = classifySettlementReconciliation({
      destinationClassification: destination,
      accountPayouts: accountPayouts.length ? accountPayouts : input.payouts,
      mercuryMatches: 0,
    });
    return {
      contract: STRIPE_MERCURY_SETTLEMENT_RECONCILIATION,
      stripe_to_ledger: stripeLedgerState(input.ledgerGross, input.stripeChargeGross),
      stripe_payout_to_mercury:
        accountPayouts.length > 0 || input.payouts.length > 0 ? "OTHER_DESTINATION" : "NO_SETTLEMENT_HISTORY",
      settlement_reconciliation_status: status,
      destination_classification: destination,
      mercury_match_expected: false,
      lineages: [],
      duplicate_settlements: 0,
      anomalies: [],
    };
  }

  if (!input.mercuryConnected) {
    const lineages = input.payouts.map((payout) => lineage(payout, null, "UNKNOWN"));
    return {
      contract: STRIPE_MERCURY_SETTLEMENT_RECONCILIATION,
      stripe_to_ledger: stripeLedgerState(input.ledgerGross, input.stripeChargeGross),
      stripe_payout_to_mercury: input.payouts.length === 0 ? "NO_SETTLEMENT_HISTORY" : "UNKNOWN",
      settlement_reconciliation_status: classifySettlementReconciliation({
        destinationClassification: destination,
        accountPayouts,
        mercuryMatches: 0,
      }),
      destination_classification: destination,
      mercury_match_expected: expectMercury,
      lineages,
      duplicate_settlements: 0,
      anomalies: [],
    };
  }

  const usedMercury = new Set<string>();
  const lineages: SettlementLineage[] = [];
  let duplicates = 0;
  const anomalies: FinancialAnomaly[] = [];

  for (const payout of input.payouts) {
    const row = matchPayoutToMercury(payout, input.mercuryTxns, nowMs);
    if (row.safe_mercury_transaction_id && usedMercury.has(row.safe_mercury_transaction_id)) {
      duplicates += 1;
      anomalies.push({
        code: "DUPLICATE_SETTLEMENT_COUNTING",
        detail: `Mercury ${row.safe_mercury_transaction_id} matched more than one Stripe payout`,
        severity: "FAIL",
      });
      lineages.push({ ...row, status: "PARTIALLY_RECONCILED" });
      continue;
    }
    if (row.safe_mercury_transaction_id) usedMercury.add(row.safe_mercury_transaction_id);
    if (expectMercury && (row.status === "UNRECONCILED" || row.status === "PENDING_SETTLEMENT")) {
      anomalies.push({
        code: "PAYOUT_MISSING_EXPECTED_SETTLEMENT",
        detail: `Stripe payout ${payout.safe_id} has no matching Mercury deposit`,
        severity: row.status === "PENDING_SETTLEMENT" ? "WARN" : "FAIL",
      });
    }
    lineages.push(row);
  }

  for (const txn of input.mercuryTxns.filter((row) => row.stripe_settlement)) {
    if (!usedMercury.has(txn.safe_transaction_id)) {
      anomalies.push({
        code: "MERCURY_STRIPE_DEPOSIT_WITHOUT_PAYOUT",
        detail: `Mercury ${txn.safe_transaction_id} looks like Stripe but has no matching payout`,
        severity: "WARN",
      });
    }
  }

  const payoutState = payoutMercuryState(lineages);
  return {
    contract: STRIPE_MERCURY_SETTLEMENT_RECONCILIATION,
    stripe_to_ledger: stripeLedgerState(input.ledgerGross, input.stripeChargeGross),
    stripe_payout_to_mercury: payoutState,
    settlement_reconciliation_status: classifySettlementReconciliation({
      destinationClassification: destination,
      accountPayouts: accountPayouts.length ? accountPayouts : input.payouts,
      mercuryMatches: lineages.filter((row) => row.status === "RECONCILED").length,
    }),
    destination_classification: destination,
    mercury_match_expected: expectMercury,
    lineages,
    duplicate_settlements: duplicates,
    anomalies,
  };
}

function stripeLedgerState(ledgerGross: number | null, stripeChargeGross: number | null): "PASS" | "FAIL" | "PARTIAL" {
  if (ledgerGross == null || stripeChargeGross == null) return "PARTIAL";
  return Math.abs(ledgerGross - stripeChargeGross) <= 0.02 ? "PASS" : "FAIL";
}

function payoutMercuryState(
  lineages: SettlementLineage[],
): "PASS" | "PENDING" | "FAIL" | "UNKNOWN" | "NO_SETTLEMENT_HISTORY" {
  if (lineages.length === 0) return "NO_SETTLEMENT_HISTORY";
  if (lineages.every((row) => row.status === "RECONCILED")) return "PASS";
  if (lineages.some((row) => row.status === "UNRECONCILED")) return "FAIL";
  if (lineages.some((row) => row.status === "PENDING_SETTLEMENT" || row.status === "PARTIALLY_RECONCILED")) {
    return "PENDING";
  }
  if (lineages.every((row) => row.status === "UNKNOWN")) return "UNKNOWN";
  return "UNKNOWN";
}

export function settlementIsNotRevenue(lineage: SettlementLineage): boolean {
  return lineage.is_revenue === false && lineage.kind === "SETTLEMENT_BALANCE_TRANSFER";
}
