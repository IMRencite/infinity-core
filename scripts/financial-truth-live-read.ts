import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { ensureOccupancyNpvCanonicalWork } from "../lib/infinity/canonical-work";
import { refreshFinancialTruth } from "../lib/infinity/financial-truth/live";
import { projectHqFinancialTruth } from "../lib/infinity/financial-truth/project";

async function main() {
  process.env.INFINITY_LOAD_LOCAL_ENV = "1";
  process.env.INFINITY_FINANCIAL_TRUTH_PERSIST = "1";
  process.env.INFINITY_CANONICAL_WORK_PERSIST = "1";
  loadServerEnvFromLocalFile();
  ensureOccupancyNpvCanonicalWork();
  const snapshot = await refreshFinancialTruth({ reason: "event", eventType: "manual_live_verify" });
  const view = projectHqFinancialTruth(snapshot);
  const report = {
    mercury_connection: view.mercury.connection,
    mercury_operating_verified: view.mercury.operating_account_verified,
    mercury_safe_ref: view.mercury.safe_account_reference,
    mercury_current: view.mercury.current,
    mercury_available: view.mercury.available,
    mercury_currency: view.mercury.currency,
    mercury_txn_count: view.mercury.transactions.length,
    mercury_txns: view.mercury.transactions.slice(0, 20).map((row) => ({
      class: row.classification,
      amount: row.amount,
      stripe_settlement: row.stripe_settlement,
      occurred_at: row.occurred_at,
      status: row.status,
    })),
    mercury_last_verified: view.mercury.last_verified,
    founder_estimate_used: view.founder_estimate_used,
    stripe_connection: view.stripe.connection,
    stripe_account: view.stripe.account,
    stripe_available: view.stripe.available,
    stripe_pending: view.stripe.pending,
    stripe_recent_payout: view.stripe.recent_payout_amount,
    stripe_recent_payout_status: view.stripe.recent_payout_status,
    stripe_payout_destination: view.stripe.payout_destination,
    settlement_classification: view.settlement_destination.classification,
    settlement_status: view.reconciliation.settlement_reconciliation_status,
    account_reconciliation: view.gates.account_reconciliation.result,
    infrastructure_mode: view.infrastructure_mode,
    parent_entity: view.parent_entity,
    mutation_adapter: view.mutation_adapter_status,
    stripe_last_verified: view.stripe.last_verified,
    verified_liquid_cash: view.cash.verified_liquid_cash,
    cash_completeness: view.cash.cash_completeness,
    unverified_accounts: view.cash.unverified_accounts,
    gross_revenue: view.actual.gross_revenue,
    refunds: view.actual.refunds,
    processor_fees: view.actual.processor_fees,
    known_costs: view.actual.known_costs,
    unknown_cost_categories: view.actual.unknown_cost_categories,
    contribution: view.actual.contribution,
    modeled_revenue: view.modeled.modeled_revenue,
    authorized_capital: view.capital.authorized_capital,
    allocated_capital: view.capital.allocated_capital,
    remaining_authorized_capital: view.capital.remaining_authorized_capital,
    unallocated_authorized_capital: view.capital.unallocated_authorized_capital,
    monthly_burn_cap: view.capital.monthly_burn_cap,
    capital_policy_status: view.capital.policy_status,
    portfolio_capital_allocation: view.gates.portfolio_capital_allocation.result,
    stripe_to_ledger: view.reconciliation.stripe_to_ledger,
    stripe_payout_to_mercury: view.reconciliation.stripe_payout_to_mercury,
    duplicate_settlements: view.reconciliation.duplicate_settlements,
    anomalies: view.reconciliation.anomalies.length,
    freshness: view.gates.freshness,
    founder_capital_policy_truth: view.gates.founder_capital_policy_truth.result,
    hq_live_financial_refresh: view.gates.hq_live_financial_refresh.result,
    read_only: view.read_only_bank_access,
    mutation_capability: view.mercury.mutation_capability,
    money_movement_capability: view.mercury.money_movement_capability,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.name : "ERROR"}\n`);
  process.exit(1);
});
