import { mutateFinancialGovernance, inspectFinancialGovernance } from "./store";
import { computeVentureLedger } from "./ledger";
import { envelopeRemaining } from "./budget";
import type { BudgetEnvelope } from "./types";

export function recordFinancialIncident(kind: string, detail: string): void {
  mutateFinancialGovernance((state) => {
    const existing = state.incidents.find((row) => row.open && row.kind === kind && row.detail === detail);
    if (existing) return;
    state.incidents.push({
      incident_id: `fininc:${kind}:${Date.now()}`,
      kind,
      open: true,
      created_at: new Date().toISOString(),
      detail,
    });
  });
}

export function detectBudgetBreaches(ventureId: string): string[] {
  const state = inspectFinancialGovernance();
  const budget = state.budgets.find((row) => row.venture_id === ventureId);
  const opened: string[] = [];
  if (!budget || budget.total_authorized_budget == null) return opened;
  const ledger = computeVentureLedger(state, ventureId);
  const spent = ledger.spent_capital.value ?? 0;
  if (spent > budget.total_authorized_budget) {
    recordFinancialIncident("VENTURE_BUDGET_BREACH", `${ventureId} spent ${spent} > authorized ${budget.total_authorized_budget}`);
    opened.push("VENTURE_BUDGET_BREACH");
  }
  for (const envelope of Object.keys(budget.envelopes) as BudgetEnvelope[]) {
    const remaining = envelopeRemaining(ventureId, envelope);
    if (remaining != null && remaining < 0) {
      recordFinancialIncident("CATEGORY_ENVELOPE_BREACH", `${ventureId} ${envelope} remaining ${remaining}`);
      opened.push("CATEGORY_ENVELOPE_BREACH");
    }
  }
  const policy = state.portfolio;
  if (policy.total_authorized != null) {
    const used = state.costs.filter((row) => row.committed_or_spent !== "CANCELLED" && row.amount != null).reduce((sum, row) => sum + (row.amount ?? 0), 0);
    if (used > policy.total_authorized) {
      recordFinancialIncident("PORTFOLIO_CAP_BREACH", `used ${used} > cap ${policy.total_authorized}`);
      opened.push("PORTFOLIO_CAP_BREACH");
    }
  }
  return opened;
}
