import { formatApproximateUsd } from "../money-presentation";
import type { EducatedEconomicsModel } from "../educated-estimates/types";
import type { FounderProfitBreakdown } from "./types";

export function buildProfitBreakdown(model: EducatedEconomicsModel): FounderProfitBreakdown {
  const monthly = model.coreMonthly?.bestEstimate.base ?? null;
  const margin = model.margin.selected?.bestEstimate.base ?? null;
  const setup = model.setup?.bestEstimate.base ?? null;
  const lifetime = model.ltv?.bestEstimate.base ?? null;
  const cac = model.cac.selected?.bestEstimate.base ?? null;
  const monthlyProfit = monthly != null && margin != null ? monthly * margin : null;
  const monthlyCost = monthly != null && margin != null ? monthly * (1 - margin) : null;
  const fyRecurring = monthly != null ? monthly * 12 : null;
  const fyTotal = fyRecurring != null ? fyRecurring + (setup ?? 0) : null;
  const fyProfit = monthlyProfit != null ? monthlyProfit * 12 : null;
  const warning =
    cac != null && fyProfit != null && cac > fyProfit
      ? "Potential issue: CAC may exceed first-year contribution profit."
      : null;
  return {
    monthlyRevenue: formatApproximateUsd(monthly),
    monthlyVariableCost: formatApproximateUsd(monthlyCost),
    monthlyContributionProfit: formatApproximateUsd(monthlyProfit),
    firstYearRecurringRevenue: formatApproximateUsd(fyRecurring),
    firstYearSetupRevenue: formatApproximateUsd(setup),
    firstYearTotalRevenue: formatApproximateUsd(fyTotal),
    firstYearContributionProfit: formatApproximateUsd(fyProfit),
    lifetimeContribution: formatApproximateUsd(lifetime),
    setupProfitIncluded: false,
    labelsContributionNotNet: true,
    warning,
    waterfall: [
      { id: "revenue", label: "Monthly revenue", value: formatApproximateUsd(monthly) },
      { id: "costs", label: "Variable costs", value: formatApproximateUsd(monthlyCost) },
      { id: "profit", label: "Contribution profit", value: formatApproximateUsd(monthlyProfit) },
      { id: "cac", label: "CAC", value: formatApproximateUsd(cac) },
      { id: "ltv", label: "Customer lifetime value", value: formatApproximateUsd(lifetime) },
    ],
  };
}
