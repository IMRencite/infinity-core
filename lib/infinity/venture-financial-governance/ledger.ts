import { actualAmount, unknownAmount, type EpistemicAmount } from "@/lib/infinity/treasury/types";
import type {
  FinancialGovernanceState,
  MoneyTruth,
  NamedGate,
  VentureBudget,
  VentureFinancialLedger,
} from "./types";
import { VENTURE_FINANCIAL_LEDGER_CONTRACT, VENTURE_FINANCIAL_RECONCILIATION_GATE } from "./types";

function sumKnown(values: Array<number | null>): MoneyTruth {
  const known = values.filter((row): row is number => row != null);
  if (known.length === 0 && values.some((row) => row === null)) return unknownAmount();
  if (known.length === 0) return actualAmount(0);
  if (known.length !== values.length) return unknownAmount();
  return actualAmount(known.reduce((sum, value) => sum + value, 0));
}

function categorySum(state: FinancialGovernanceState, ventureId: string, categories: string[]): MoneyTruth {
  const rows = state.costs.filter(
    (row) => row.venture_id === ventureId && categories.includes(row.category) && row.committed_or_spent === "SPENT",
  );
  if (rows.length === 0) return unknownAmount();
  if (rows.some((row) => row.actual_or_estimated === "UNKNOWN" || row.amount == null)) return unknownAmount();
  return actualAmount(rows.reduce((sum, row) => sum + (row.amount ?? 0), 0));
}

function add(a: MoneyTruth, b: MoneyTruth): MoneyTruth {
  if (a.actuality === "UNKNOWN" || b.actuality === "UNKNOWN" || a.value == null || b.value == null) return unknownAmount();
  return actualAmount(a.value + b.value);
}

function sub(a: MoneyTruth, b: MoneyTruth): MoneyTruth {
  if (a.actuality === "UNKNOWN" || b.actuality === "UNKNOWN" || a.value == null || b.value == null) return unknownAmount();
  return actualAmount(a.value - b.value);
}

function budgetMoney(budget: VentureBudget | undefined, spent: number, committed: number, reserved: number): {
  remaining: MoneyTruth;
  available: MoneyTruth;
} {
  if (!budget || budget.total_authorized_budget == null || budget.status === "NOT_SET") {
    return { remaining: { value: null, actuality: "UNKNOWN", currency: "USD" }, available: { value: null, actuality: "UNKNOWN", currency: "USD" } };
  }
  const remaining = budget.total_authorized_budget - spent;
  const available = budget.total_authorized_budget - spent - committed - reserved;
  return { remaining: actualAmount(remaining), available: actualAmount(available) };
}

export function computeVentureLedger(
  state: FinancialGovernanceState,
  ventureId: string,
  now = new Date().toISOString(),
): VentureFinancialLedger {
  const revenues = state.revenues.filter((row) => row.venture_id === ventureId && !row.synthetic);
  const refunds = state.refunds.filter((row) => row.venture_id === ventureId);
  const costs = state.costs.filter((row) => row.venture_id === ventureId);
  const budget = state.budgets.find((row) => row.venture_id === ventureId);
  const gross = actualAmount(revenues.reduce((sum, row) => sum + row.gross_amount, 0));
  const refundTotal = actualAmount(refunds.reduce((sum, row) => sum + row.amount, 0));
  const net = actualAmount((gross.value ?? 0) - (refundTotal.value ?? 0));
  const feesKnown = revenues.every((row) => row.fee_status === "ACTUAL" && row.fee_amount != null);
  const fees = revenues.length === 0
    ? actualAmount(0)
    : feesKnown
      ? actualAmount(revenues.reduce((sum, row) => sum + (row.fee_amount ?? 0), 0))
      : unknownAmount();
  const fulfillment = categorySum(state, ventureId, ["FULFILLMENT"]);
  const infrastructure = categorySum(state, ventureId, ["INFRASTRUCTURE"]);
  const providerApi = categorySum(state, ventureId, ["PROVIDER_API"]);
  const growth = categorySum(state, ventureId, ["GROWTH", "ADVERTISING", "COMMUNICATION"]);
  const software = categorySum(state, ventureId, ["SOFTWARE"]);
  const domain = categorySum(state, ventureId, ["DOMAIN"]);
  const contractor = categorySum(state, ventureId, ["CONTRACTOR"]);
  const overhead = categorySum(state, ventureId, ["SHARED_OVERHEAD"]);
  const other = categorySum(state, ventureId, ["OTHER", "LEGAL", "COMPLIANCE", "RESEARCH", "BUILD"]);
  const spentRows = costs.filter((row) => row.committed_or_spent === "SPENT" && row.amount != null && row.actual_or_estimated !== "UNKNOWN");
  const unknownSpend = costs.some((row) => row.committed_or_spent === "SPENT" && (row.amount == null || row.actual_or_estimated === "UNKNOWN"));
  const spent = unknownSpend && spentRows.length === 0
    ? unknownAmount()
    : actualAmount(spentRows.reduce((sum, row) => sum + (row.amount ?? 0), 0));
  const committed = actualAmount(
    costs.filter((row) => row.committed_or_spent === "COMMITTED" && row.amount != null).reduce((sum, row) => sum + (row.amount ?? 0), 0),
  );
  const reserved = actualAmount(
    costs.filter((row) => row.committed_or_spent === "RESERVED" && row.amount != null).reduce((sum, row) => sum + (row.amount ?? 0), 0),
  );
  const { remaining, available } = budgetMoney(budget, spent.value ?? 0, committed.value ?? 0, reserved.value ?? 0);
  const grossProfit = sub(net, fees);
  const contribution = sub(grossProfit, add(fulfillment, growth));
  const customers = revenues.filter((row) => row.refund_status !== "FULL").length;
  const actualCac = customers === 0 || growth.actuality === "UNKNOWN" || growth.value == null
    ? unknownAmount()
    : actualAmount(growth.value / customers);
  return {
    contract: VENTURE_FINANCIAL_LEDGER_CONTRACT,
    venture_id: ventureId,
    currency: "USD",
    period: now.slice(0, 7),
    gross_revenue: gross,
    refunds: refundTotal,
    net_revenue: net,
    payment_processing_fees: fees,
    fulfillment_cost: fulfillment,
    infrastructure_cost: infrastructure,
    provider_api_cost: providerApi,
    growth_cost: growth,
    software_tooling_cost: software,
    domain_cost: domain,
    contractor_or_external_service_cost: contractor,
    allocated_shared_overhead: overhead,
    other_direct_cost: other,
    gross_profit: fees.actuality === "UNKNOWN" ? unknownAmount() : grossProfit,
    contribution_profit: contribution.actuality === "UNKNOWN" ? unknownAmount() : contribution,
    operating_contribution: contribution,
    committed_capital: committed,
    spent_capital: spent,
    remaining_budget: remaining,
    reserved_capital: reserved,
    available_capital: available,
    transaction_count: revenues.length,
    actual_cac: actualCac,
    actual_ltv: unknownAmount(),
    actual_payback: unknownAmount(),
    actual_break_even: unknownAmount(),
    updated_at: now,
    data_confidence: revenues.length === 0 ? "INSUFFICIENT" : "MEDIUM",
    provenance: "venture-financial-governance ledger from revenue/cost events",
  };
}

export function evaluateVentureFinancialLedgerContract(ledger: VentureFinancialLedger): NamedGate {
  return {
    gate: VENTURE_FINANCIAL_LEDGER_CONTRACT,
    result: ledger.contract === VENTURE_FINANCIAL_LEDGER_CONTRACT && Boolean(ledger.venture_id) ? "PASS" : "FAIL",
    reasons: [],
  };
}

export function evaluateVentureFinancialReconciliationGate(
  state: FinancialGovernanceState,
  ledger: VentureFinancialLedger,
): NamedGate {
  const expectedGross = state.revenues.filter((row) => row.venture_id === ledger.venture_id).reduce((sum, row) => sum + row.gross_amount, 0);
  const expectedRefunds = state.refunds.filter((row) => row.venture_id === ledger.venture_id).reduce((sum, row) => sum + row.amount, 0);
  const reasons: string[] = [];
  if (ledger.gross_revenue.value !== expectedGross) reasons.push("GROSS_MISMATCH");
  if (ledger.refunds.value !== expectedRefunds) reasons.push("REFUND_MISMATCH");
  if ((ledger.net_revenue.value ?? 0) !== expectedGross - expectedRefunds) reasons.push("NET_MISMATCH");
  return { gate: VENTURE_FINANCIAL_RECONCILIATION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function formatMoney(amount: EpistemicAmount, notSet = false): string {
  if (notSet) return "NOT_SET";
  if (amount.actuality === "UNKNOWN" || amount.value == null) return "UNKNOWN";
  return `$${amount.value.toFixed(amount.value % 1 === 0 ? 0 : 2)}`;
}

export { sumKnown };
