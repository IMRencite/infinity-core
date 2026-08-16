import {
  MONTH_RAMP_FACTORS,
  SCENARIO_MULTIPLIERS,
  SCENARIO_MILESTONES,
  SCENARIO_TYPES,
} from "../constants";
import type { DerivedUnitEconomics, RevenueScenarioPoint } from "../types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function generateRevenueScenarios(input: {
  estimatedCustomersYear1: number;
  estimatedRevenuePerCustomer: number;
  estimatedVariableCosts: number;
  estimatedFixedCosts: number;
  assumptions: string[];
}): RevenueScenarioPoint[] {
  const scenarios: RevenueScenarioPoint[] = [];

  for (const scenarioType of SCENARIO_TYPES) {
    const multiplier = SCENARIO_MULTIPLIERS[scenarioType];

    for (const milestoneMonth of SCENARIO_MILESTONES) {
      const ramp = MONTH_RAMP_FACTORS[milestoneMonth] ?? 1;
      const customers = roundMoney(
        input.estimatedCustomersYear1 * multiplier.customers * ramp,
      );
      const revenuePerCustomer = roundMoney(
        input.estimatedRevenuePerCustomer * multiplier.price,
      );
      const revenue = roundMoney(customers * revenuePerCustomer);
      const variableCostRate =
        input.estimatedCustomersYear1 > 0 && input.estimatedRevenuePerCustomer > 0
          ? input.estimatedVariableCosts /
            (input.estimatedCustomersYear1 * input.estimatedRevenuePerCustomer)
          : 0.3;
      const variableCosts = roundMoney(revenue * variableCostRate * multiplier.cost);
      const fixedCosts = roundMoney(input.estimatedFixedCosts * ramp * multiplier.cost);
      const cost = roundMoney(variableCosts + fixedCosts);
      const grossProfit = roundMoney(revenue - cost);

      scenarios.push({
        scenarioType,
        milestoneMonth,
        estimatedCustomers: customers,
        estimatedRevenue: revenue,
        estimatedCost: cost,
        estimatedGrossProfit: grossProfit,
        assumptions: [
          ...input.assumptions,
          `Scenario=${scenarioType}`,
          `MilestoneMonth=${milestoneMonth}`,
          `RampFactor=${ramp}`,
          `CustomerMultiplier=${multiplier.customers}`,
          `PriceMultiplier=${multiplier.price}`,
        ],
      });
    }
  }

  return scenarios;
}

export function estimateMonthsToBreakEven(input: {
  economics: DerivedUnitEconomics;
  estimatedFixedCosts: number;
  estimatedCustomersYear1: number;
}): number | null {
  if (input.economics.contributionMarginPerCustomer <= 0) return null;
  const monthlyContribution =
    input.economics.contributionMarginPerCustomer * (input.estimatedCustomersYear1 / 12);
  if (monthlyContribution <= 0) return null;
  return Math.round((input.estimatedFixedCosts / monthlyContribution) * 10) / 10;
}
