import type { ExpectedValueDerived, ExpectedValueInputs, LoadedCandidateBundle } from "../types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function clampRatio(value: number, max = 9999.9999): number {
  return roundRatio(Math.max(0, Math.min(max, value)));
}

export function deriveExpectedValueInputs(candidate: LoadedCandidateBundle): ExpectedValueInputs {
  const plan = candidate.monetization?.primaryPlan;
  const viability = candidate.monetization?.economicViability ?? "SPECULATIVE";
  const probabilityMap: Record<string, number> = {
    STRONG: 0.72,
    PROMISING: 0.58,
    SPECULATIVE: 0.42,
    WEAK: 0.28,
    REJECT: 0.15,
  };

  const estimatedCustomersYear1 =
    plan?.estimatedCustomersYear1 != null
      ? Math.min(1_000_000, Math.max(1, plan.estimatedCustomersYear1))
      : plan?.estimatedGrossRevenueYear1 != null
        ? Math.min(
            1_000_000,
            Math.max(
              1,
              (plan.estimatedGrossRevenueYear1 ?? 0) / Math.max(100, plan.estimatedLTV ?? 1000),
            ),
          )
        : 50;

  return {
    probabilityOfSuccess: probabilityMap[viability] ?? 0.4,
    estimatedCustomersYear1,
    estimatedRevenuePerCustomer:
      plan?.estimatedLTV != null
        ? Math.min(1_000_000, Math.max(1, plan.estimatedLTV))
        : plan?.estimatedGrossRevenueYear1 != null
          ? Math.max(100, (plan.estimatedGrossRevenueYear1 ?? 0) / Math.max(1, estimatedCustomersYear1))
          : 1000,
    estimatedGrossMarginPercent: plan?.estimatedGrossMarginPercent ?? 55,
    estimatedFixedCosts: plan?.estimatedFixedCosts ?? 40000,
    estimatedVariableCosts: plan?.estimatedVariableCosts ?? 25000,
    startupCapital: Math.max(100, plan?.estimatedCapitalRequired ?? 50000),
  };
}

export function calculateExpectedValue(inputs: ExpectedValueInputs): ExpectedValueDerived {
  const grossRevenue = inputs.estimatedCustomersYear1 * inputs.estimatedRevenuePerCustomer;
  const grossProfit =
    grossRevenue * (inputs.estimatedGrossMarginPercent / 100) - inputs.estimatedVariableCosts;
  const probabilityAdjustedRevenue = roundMoney(grossRevenue * inputs.probabilityOfSuccess);
  const probabilityAdjustedGrossProfit = roundMoney(grossProfit * inputs.probabilityOfSuccess);
  const expected12MonthProfit = roundMoney(probabilityAdjustedGrossProfit - inputs.estimatedFixedCosts);
  const expectedRoi =
    inputs.startupCapital > 0
      ? clampRatio(expected12MonthProfit / inputs.startupCapital)
      : 0;
  const capitalEfficiency =
    inputs.startupCapital > 0
      ? clampRatio(probabilityAdjustedGrossProfit / inputs.startupCapital)
      : 0;
  const expectedValuePerDollarDeployed =
    inputs.startupCapital > 0 ? clampRatio(expected12MonthProfit / inputs.startupCapital) : 0;

  return {
    probabilityAdjustedRevenue,
    probabilityAdjustedGrossProfit,
    expected12MonthProfit,
    expectedRoi,
    capitalEfficiency,
    expectedValuePerDollarDeployed,
  };
}

export function calculateCapitalEfficiencyMetrics(input: {
  startupCapital: number;
  expected12MonthProfit: number;
  probabilityAdjustedGrossProfit: number;
  monthlyBurn: number;
}): Record<string, number> {
  return {
    startupCapital: input.startupCapital,
    expected12MonthProfit: input.expected12MonthProfit,
    profitPerDollarDeployed:
      input.startupCapital > 0
        ? clampRatio(input.expected12MonthProfit / input.startupCapital)
        : 0,
    grossProfitPerDollarDeployed:
      input.startupCapital > 0
        ? clampRatio(input.probabilityAdjustedGrossProfit / input.startupCapital)
        : 0,
    monthlyBurn: input.monthlyBurn,
    monthsOfRunway:
      input.monthlyBurn > 0 ? clampRatio(input.startupCapital / input.monthlyBurn) : 0,
  };
}
