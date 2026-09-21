import { computeVentureLedger, evaluateVentureFinancialReconciliationGate } from "./ledger";
import { inspectFinancialGovernance } from "./store";
import type { NamedGate } from "./types";
import { PORTFOLIO_FINANCIAL_RECONCILIATION_GATE } from "./types";

export function evaluatePortfolioFinancialReconciliationGate(ventureIds: string[]): NamedGate {
  const state = inspectFinancialGovernance();
  const reasons: string[] = [];
  let ledgerGross = 0;
  for (const ventureId of ventureIds) {
    const ledger = computeVentureLedger(state, ventureId);
    const gate = evaluateVentureFinancialReconciliationGate(state, ledger);
    if (gate.result === "FAIL") reasons.push(`${ventureId}:${gate.reasons.join(",")}`);
    ledgerGross += ledger.gross_revenue.value ?? 0;
  }
  const eventGross = state.revenues.reduce((sum, row) => sum + row.gross_amount, 0);
  if (ledgerGross !== eventGross) reasons.push("PORTFOLIO_GROSS_MISMATCH");
  const unallocated = state.costs.filter((row) => !row.venture_id && row.allocation === "UNALLOCATED_SHARED");
  if (unallocated.length > 0) {
    // Shared unallocated costs are expected to sit outside venture ledgers.
  }
  return {
    gate: PORTFOLIO_FINANCIAL_RECONCILIATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
