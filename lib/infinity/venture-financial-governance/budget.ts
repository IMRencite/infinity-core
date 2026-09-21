import type { BudgetEnvelope, NamedGate, PortfolioCapitalPolicy, VentureBudget } from "./types";
import { PORTFOLIO_CAPITAL_BUDGET_CONTRACT, VENTURE_BUDGET_CONTRACT, VENTURE_BUDGET_ENVELOPE_CONTRACT } from "./types";
import { inspectFinancialGovernance, mutateFinancialGovernance } from "./store";
import { computeVentureLedger } from "./ledger";

export function authorizeVentureBudget(input: {
  venture_id: string;
  total_authorized_budget: number;
  envelopes?: Partial<Record<BudgetEnvelope, number>>;
  authorized_by: string;
  start_at?: string | null;
  end_at?: string | null;
}): VentureBudget {
  const budget: VentureBudget = {
    contract: VENTURE_BUDGET_CONTRACT,
    venture_id: input.venture_id,
    total_authorized_budget: input.total_authorized_budget,
    status: "AUTHORIZED",
    authorized_by: input.authorized_by,
    start_at: input.start_at ?? new Date().toISOString(),
    end_at: input.end_at ?? null,
    envelopes: input.envelopes ?? {},
    last_updated: new Date().toISOString(),
  };
  mutateFinancialGovernance((state) => {
    state.budgets = state.budgets.filter((row) => row.venture_id !== input.venture_id);
    state.budgets.push(budget);
  });
  return budget;
}

export function authorizePortfolioCapital(input: {
  total_authorized: number;
  monthly_burn_cap?: number | null;
  unvalidated_capital_cap?: number | null;
  max_active_builds?: number | null;
  authorized_by: string;
}): PortfolioCapitalPolicy {
  const portfolio: PortfolioCapitalPolicy = {
    contract: PORTFOLIO_CAPITAL_BUDGET_CONTRACT,
    total_authorized: input.total_authorized,
    monthly_burn_cap: input.monthly_burn_cap ?? null,
    unvalidated_capital_cap: input.unvalidated_capital_cap ?? null,
    max_active_builds: input.max_active_builds ?? null,
    status: "AUTHORIZED",
    authorized_by: input.authorized_by,
    last_updated: new Date().toISOString(),
  };
  mutateFinancialGovernance((state) => {
    state.portfolio = portfolio;
  });
  return portfolio;
}

export function reallocateBudget(input: {
  amount: number;
  from: string;
  to: string;
  reason: string;
  authority: string;
}): { transferred: boolean; reason: string } {
  if (input.amount <= 0) return { transferred: false, reason: "INVALID_AMOUNT" };
  mutateFinancialGovernance((state) => {
    state.transfers.push({
      transfer_id: `xfer:${Date.now()}:${input.from}:${input.to}`,
      amount: input.amount,
      from: input.from,
      to: input.to,
      reason: input.reason,
      timestamp: new Date().toISOString(),
      authority: input.authority,
    });
  });
  return { transferred: true, reason: "RECORDED" };
}

export function evaluateVentureBudgetContract(ventureId: string): NamedGate {
  const budget = inspectFinancialGovernance().budgets.find((row) => row.venture_id === ventureId);
  return {
    gate: VENTURE_BUDGET_CONTRACT,
    result: "PASS",
    reasons: !budget || budget.status === "NOT_SET" || budget.total_authorized_budget == null ? ["NOT_SET"] : ["AUTHORIZED"],
  };
}

export function evaluateVentureBudgetEnvelopeContract(ventureId: string): NamedGate {
  const budget = inspectFinancialGovernance().budgets.find((row) => row.venture_id === ventureId);
  return {
    gate: VENTURE_BUDGET_ENVELOPE_CONTRACT,
    result: "PASS",
    reasons: budget && Object.keys(budget.envelopes).length > 0 ? ["ENVELOPES_SET"] : ["NOT_SET"],
  };
}

export function envelopeRemaining(ventureId: string, envelope: BudgetEnvelope): number | null {
  const state = inspectFinancialGovernance();
  const budget = state.budgets.find((row) => row.venture_id === ventureId);
  const authorized = budget?.envelopes[envelope];
  if (authorized == null) return null;
  const categoryMap: Record<string, string[]> = {
    RESEARCH: ["RESEARCH"],
    VALIDATION: ["RESEARCH"],
    BUILD: ["BUILD"],
    INFRASTRUCTURE: ["INFRASTRUCTURE"],
    GROWTH: ["GROWTH", "ADVERTISING", "COMMUNICATION"],
    PROVIDER_API: ["PROVIDER_API"],
    FULFILLMENT: ["FULFILLMENT"],
    CONTINGENCY: [],
    OTHER: ["OTHER"],
  };
  const cats = categoryMap[envelope] ?? [envelope];
  const used = state.costs
    .filter((row) => row.venture_id === ventureId && cats.includes(row.category) && row.committed_or_spent !== "CANCELLED" && row.amount != null)
    .reduce((sum, row) => sum + (row.amount ?? 0), 0);
  return authorized - used;
}

export function suggestIncreaseBudget(): { recommendation: "INCREASE_BUDGET"; authorized: false } {
  return { recommendation: "INCREASE_BUDGET", authorized: false };
}

export function ventureBudgetSnapshot(ventureId: string) {
  const state = inspectFinancialGovernance();
  const budget = state.budgets.find((row) => row.venture_id === ventureId);
  const ledger = computeVentureLedger(state, ventureId);
  return {
    authorized: budget?.total_authorized_budget ?? null,
    status: budget?.status ?? "NOT_SET",
    spent: ledger.spent_capital.value ?? 0,
    committed: ledger.committed_capital.value ?? 0,
    reserved: ledger.reserved_capital.value ?? 0,
    remaining: budget?.total_authorized_budget == null ? null : ledger.remaining_budget.value,
    available: budget?.total_authorized_budget == null ? null : ledger.available_capital.value,
    envelopes: budget && Object.keys(budget.envelopes).length > 0 ? budget.envelopes : null,
  };
}
