import type { CapitalRecommendation } from "./types";
import { computeVentureLedger } from "./ledger";
import { inspectFinancialGovernance } from "./store";

export function recommendCapitalAllocation(ventureId: string): {
  recommendation: CapitalRecommendation;
  authorizes_money: false;
  rationale: string;
} {
  const ledger = computeVentureLedger(inspectFinancialGovernance(), ventureId);
  const contribution = ledger.contribution_profit;
  const budget = inspectFinancialGovernance().budgets.find((row) => row.venture_id === ventureId);
  if (!budget || budget.total_authorized_budget == null) {
    return { recommendation: "PAUSE", authorizes_money: false, rationale: "BUDGET_NOT_SET" };
  }
  if ((ledger.available_capital.value ?? 0) <= 0) {
    return { recommendation: "PAUSE", authorizes_money: false, rationale: "BUDGET_EXHAUSTED" };
  }
  if (contribution.actuality === "UNKNOWN") {
    return { recommendation: "MAINTAIN", authorizes_money: false, rationale: "ACTUAL_CONTRIBUTION_UNKNOWN" };
  }
  if ((contribution.value ?? 0) > 0) {
    return { recommendation: "INVEST_MORE", authorizes_money: false, rationale: "POSITIVE_CONTRIBUTION_RECOMMENDATION_ONLY" };
  }
  if ((ledger.net_revenue.value ?? 0) === 0) {
    return { recommendation: "MAINTAIN", authorizes_money: false, rationale: "PRE_REVENUE" };
  }
  return { recommendation: "REDUCE", authorizes_money: false, rationale: "NEGATIVE_OR_FLAT_CONTRIBUTION" };
}

export const CAPITAL_RECOMMENDATION_STATES: CapitalRecommendation[] = [
  "INVEST_MORE",
  "MAINTAIN",
  "REDUCE",
  "PAUSE",
  "PIVOT",
  "SHUT_DOWN",
];
