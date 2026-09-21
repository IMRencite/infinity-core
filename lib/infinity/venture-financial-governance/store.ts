import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FinancialGovernanceState, PortfolioCapitalPolicy } from "./types";

export const FINANCIAL_GOVERNANCE_PATH = ".infinity/venture-financial-governance/state.json" as const;

function emptyPortfolio(): PortfolioCapitalPolicy {
  return {
    contract: "PortfolioCapitalBudgetContract",
    total_authorized: null,
    monthly_burn_cap: null,
    unvalidated_capital_cap: null,
    max_active_builds: null,
    status: "NOT_SET",
    authorized_by: null,
    last_updated: new Date().toISOString(),
  };
}

export function emptyFinancialGovernanceState(): FinancialGovernanceState {
  return {
    revenues: [],
    refunds: [],
    costs: [],
    budgets: [],
    transfers: [],
    incidents: [],
    priors: [],
    portfolio: emptyPortfolio(),
    reinvestment: "NO_AUTO_REINVESTMENT",
    last_payment_sync: null,
    last_cost_sync: null,
    last_ledger_calc: null,
  };
}

const memory: FinancialGovernanceState = emptyFinancialGovernanceState();

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_FINANCIAL_GOVERNANCE_PERSIST !== "1") return false;
  return true;
}

export function resetFinancialGovernance(): void {
  Object.assign(memory, emptyFinancialGovernanceState());
}

export function inspectFinancialGovernance(): FinancialGovernanceState {
  return JSON.parse(JSON.stringify(memory)) as FinancialGovernanceState;
}

export function mutateFinancialGovernance(mutator: (state: FinancialGovernanceState) => void): FinancialGovernanceState {
  mutator(memory);
  if (persistEnabled()) {
    try {
      mkdirSync(dirname(FINANCIAL_GOVERNANCE_PATH), { recursive: true });
      writeFileSync(FINANCIAL_GOVERNANCE_PATH, `${JSON.stringify(memory)}\n`);
    } catch {
      // serverless / read-only
    }
  }
  return inspectFinancialGovernance();
}

export function hydrateFinancialGovernance(path = FINANCIAL_GOVERNANCE_PATH): FinancialGovernanceState {
  if (!persistEnabled() || !existsSync(path)) return inspectFinancialGovernance();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as FinancialGovernanceState;
    Object.assign(memory, emptyFinancialGovernanceState(), parsed);
  } catch {
    // keep memory
  }
  return inspectFinancialGovernance();
}
