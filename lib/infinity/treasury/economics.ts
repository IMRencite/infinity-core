import { DEFAULT_CURRENCY } from "./constants";
import { knownValue } from "./budgets/engine";
import { computeActualProfit } from "./allocations/venture";
import type { CapitalEfficiencyMetrics, CapitalFlywheelModel, EpistemicAmount } from "./types";
import { actualAmount, unknownAmount } from "./types";

export function ratioWhenKnown(numerator: EpistemicAmount, denominator: EpistemicAmount): EpistemicAmount {
  const n = numerator.actuality === "ACTUAL" ? knownValue(numerator) : null;
  const d = denominator.actuality === "ACTUAL" ? knownValue(denominator) : null;
  if (n == null || d == null || d === 0) return unknownAmount(numerator.currency || denominator.currency || DEFAULT_CURRENCY);
  return actualAmount(n / d, numerator.currency);
}

export function computeCapitalEfficiency(input: {
  actualRevenue: EpistemicAmount;
  actualProfit: EpistemicAmount;
  capitalSpent: EpistemicAmount;
  capitalReturned: EpistemicAmount;
  capitalAllocated: EpistemicAmount;
}): CapitalEfficiencyMetrics {
  return {
    revenuePerCapitalSpent: ratioWhenKnown(input.actualRevenue, input.capitalSpent),
    profitPerCapitalSpent: ratioWhenKnown(input.actualProfit, input.capitalSpent),
    capitalReturnedRatio: ratioWhenKnown(input.capitalReturned, input.capitalAllocated),
  };
}

export function actualProfitOrUnknown(actualRevenue: EpistemicAmount, actualExpenses: EpistemicAmount): EpistemicAmount {
  return computeActualProfit(actualRevenue, actualExpenses);
}

export const CAPITAL_FLYWHEEL: CapitalFlywheelModel = {
  stages: [
    "CAPITAL",
    "VENTURE_ALLOCATION",
    "FINANCIAL_ACTION",
    "SPEND",
    "ACQUISITION",
    "REVENUE",
    "PROFIT",
    "CASH_RETURNED",
    "PORTFOLIO_PERFORMANCE",
    "REALLOCATION",
  ],
  autonomousReallocationEnabled: false,
};
