import "server-only";

import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { computeVentureLedger } from "@/lib/infinity/venture-financial-governance/ledger";
import { hydrateFinancialGovernance, inspectFinancialGovernance, mutateFinancialGovernance } from "@/lib/infinity/venture-financial-governance/store";
import { ingestCanonicalRefundEvent, ingestCanonicalRevenueEvent } from "@/lib/infinity/venture-financial-governance/revenue";
import { computeEpistemicMonthlyBurn } from "@/lib/infinity/venture-financial-governance/epistemic-burn";
import { roundUsd } from "./amounts";
import { createMercuryFinancialAccountAdapter } from "./adapters/mercury";
import { readLiveStripeSnapshot } from "./adapters/stripe";
import { detectFinancialAnomalies } from "./anomalies";
import { cacheAgeMs, emptyFinancialTruthSnapshot, readFinancialTruthCache, writeFinancialTruthCache } from "./cache";
import { projectActualEconomics, projectModeledEconomics } from "./economics";
import { applyStripeFinancialEvent } from "./events";
import { buildFinancialSourceRegistry } from "./registry";
import { accountPayoutsForSettlement, reconcileStripeMercury } from "./reconciliation";
import type { FinancialTruthSnapshot, HqFinancialTruthView } from "./types";
import { projectHqFinancialTruth } from "./project";
import { shouldRefreshMercury, shouldRefreshStripe } from "./live-cadence";
import { infinityAttributedPayouts, isInfinityAttributedStripeTxn } from "./stripe-attribution";

export { shouldRefreshMercury, shouldRefreshStripe };

function ingestStripeEconomics(snapshot: FinancialTruthSnapshot): void {
  hydrateFinancialGovernance();
  mutateFinancialGovernance((state) => {
    state.revenues = state.revenues.filter((row) => row.provenance !== "stripe-balance-transaction");
    state.refunds = state.refunds.filter((row) => row.reason !== "stripe-balance-transaction");
  });
  for (const txn of snapshot.stripe.balance_transactions) {
    if (txn.type === "payout" || txn.type === "payout_cancel" || txn.type === "payout_failure") continue;
    if (!isInfinityAttributedStripeTxn(txn)) continue;
    if (txn.type === "charge" || txn.type === "payment") {
      ingestCanonicalRevenueEvent({
        venture_id: CRE_VENTURE_ID,
        payment_id: txn.source ?? txn.safe_id,
        provider: "stripe",
        gross_amount: roundUsd(Math.abs(txn.amount)),
        paid_at: txn.created_at,
        fee_amount: txn.fee == null ? null : roundUsd(txn.fee),
        provenance: "stripe-balance-transaction",
      });
    }
    if (txn.type === "refund") {
      ingestCanonicalRefundEvent({
        venture_id: CRE_VENTURE_ID,
        payment_id: txn.source ?? txn.safe_id,
        amount: roundUsd(Math.abs(txn.amount)),
        refunded_at: txn.created_at,
        provider_ref: txn.safe_id,
        reason: "stripe-balance-transaction",
      });
    }
  }
}

export async function refreshFinancialTruth(input: {
  reason: "poll" | "catch-up" | "ssr" | "event";
  eventType?: string;
  env?: NodeJS.Dict<string>;
  fetchImpl?: typeof fetch;
} = { reason: "ssr" }): Promise<FinancialTruthSnapshot> {
  hydrateFinancialGovernance();
  const existing = readFinancialTruthCache() ?? emptyFinancialTruthSnapshot();
  if (input.reason === "poll") return existing;

  let mercury = existing.mercury;
  let stripe = existing.stripe;
  const mercuryAdapter = createMercuryFinancialAccountAdapter({ env: input.env, fetchImpl: input.fetchImpl });

  if (
    shouldRefreshMercury({
      lastVerified: mercury.last_verified,
      reason: input.reason,
      connection: mercury.connection,
    })
  ) {
    mercury = await mercuryAdapter.snapshot();
  }
  if (shouldRefreshStripe({ lastVerified: stripe.last_verified, reason: input.reason, eventType: input.eventType })) {
    const mercuryLast4 = mercury.safe_account_reference.match(/(\d{4})$/)?.[1] ?? null;
    stripe = await readLiveStripeSnapshot({
      env: input.env,
      fetchImpl: input.fetchImpl,
      mercuryLast4,
    });
  }
  const attributed = stripe.balance_transactions.filter((row) => isInfinityAttributedStripeTxn(row));
  const latestAccountPayout = stripe.balance_transactions.find((row) => row.type === "payout") ?? null;
  stripe = {
    ...stripe,
    processor_fees: attributed.reduce((sum, row) => sum + row.fee, 0),
    net_settlement: attributed.filter((row) => row.type === "charge" || row.type === "payment").reduce((sum, row) => sum + row.net, 0),
    recent_payout_amount: stripe.recent_payout_amount ?? (latestAccountPayout ? Math.abs(latestAccountPayout.amount) : null),
    recent_payout_id: stripe.recent_payout_id ?? latestAccountPayout?.source ?? null,
    recent_payout_status: stripe.recent_payout_status ?? (latestAccountPayout ? "paid" : null),
  };

  const draft: FinancialTruthSnapshot = {
    ...existing,
    mercury,
    stripe,
    captured_at: new Date().toISOString(),
  };
  ingestStripeEconomics(draft);
  const actual = projectActualEconomics(draft.captured_at);
  const state = inspectFinancialGovernance();
  const ledger = computeVentureLedger(state, CRE_VENTURE_ID, draft.captured_at);
  const burn = computeEpistemicMonthlyBurn(draft.captured_at);
  const reconciliation = reconcileStripeMercury({
    payouts: infinityAttributedPayouts(stripe.payouts, stripe.balance_transactions),
    mercuryTxns: mercury.transactions,
    mercuryConnected: mercury.connection === "LIVE",
    ledgerGross: actual.gross_revenue,
    stripeChargeGross: stripe.balance_transactions
      .filter((row) => (row.type === "charge" || row.type === "payment") && isInfinityAttributedStripeTxn(row))
      .reduce((sum, row) => sum + row.amount, 0),
    destinationClassification: stripe.settlement_destination_classification,
    accountPayouts: accountPayoutsForSettlement({
      payouts: stripe.payouts,
      recentAmount: stripe.recent_payout_amount,
      recentId: stripe.recent_payout_id,
      recentStatus: stripe.recent_payout_status,
      currency: stripe.currency,
    }),
  });
  const anomalies = detectFinancialAnomalies({
    mercury,
    stripe,
    actual,
    reconciliation,
    ledgerPaymentIds: state.revenues.map((row) => row.payment_id),
    stripePaymentIds: stripe.balance_transactions
      .filter((row) => (row.type === "charge" || row.type === "payment") && isInfinityAttributedStripeTxn(row))
      .map((row) => row.source ?? row.safe_id),
    ledgerRefundIds: state.refunds.map((row) => row.provider_ref),
    stripeRefundIds: stripe.balance_transactions
      .filter((row) => row.type === "refund" && isInfinityAttributedStripeTxn(row))
      .map((row) => row.safe_id),
  });
  const next: FinancialTruthSnapshot = {
    mercury,
    stripe,
    actual,
    modeled: projectModeledEconomics(),
    committed_capital: ledger.committed_capital.value,
    spent_capital: ledger.spent_capital.value,
    current_month_known_burn: burn.known_amount,
    unknown_cost_state: actual.unknown_cost_categories.length > 0 ? "UNKNOWN" : burn.total_state,
    lineages: reconciliation.lineages,
    anomalies,
    registry: buildFinancialSourceRegistry({
      mercury,
      stripe,
      ledgerVerifiedAt: state.last_ledger_calc,
    }),
    captured_at: draft.captured_at,
  };
  return writeFinancialTruthCache(next);
}

export function loadCachedFinancialTruthView(): HqFinancialTruthView {
  const snapshot = readFinancialTruthCache() ?? emptyFinancialTruthSnapshot();
  return projectHqFinancialTruth(snapshot);
}

export async function loadFinancialTruthView(reason: "poll" | "catch-up" | "ssr" | "event" = "ssr"): Promise<HqFinancialTruthView> {
  const snapshot = await refreshFinancialTruth({ reason });
  return projectHqFinancialTruth(snapshot);
}

export function financialTruthNeedsCatchUpRefresh(nowMs = Date.now()): boolean {
  const cached = readFinancialTruthCache();
  if (!cached) return true;
  const mercuryStale = shouldRefreshMercury({
    lastVerified: cached.mercury.last_verified,
    reason: "catch-up",
    connection: cached.mercury.connection,
    nowMs,
  });
  const stripeStale = shouldRefreshStripe({ lastVerified: cached.stripe.last_verified, reason: "catch-up", nowMs });
  const age = cacheAgeMs(cached, nowMs);
  return mercuryStale || stripeStale || age == null;
}

export function noteStripeFinancialEvent(type: string): void {
  const cached = readFinancialTruthCache();
  if (!cached) return;
  const applied = applyStripeFinancialEvent(cached.stripe, { type });
  if (!applied.applied) return;
  writeFinancialTruthCache({
    ...cached,
    stripe: applied.snapshot,
    captured_at: cached.captured_at,
  });
}
