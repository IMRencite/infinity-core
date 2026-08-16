import type { DerivedUnitEconomics } from "../types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function calculateUnitEconomics(input: {
  estimatedCustomersYear1: number;
  estimatedRevenuePerCustomer: number;
  estimatedVariableCosts: number;
  estimatedFixedCosts: number;
  estimatedCAC: number;
  estimatedLTV?: number | null;
  grossMarginPercentHint?: number | null;
}): DerivedUnitEconomics {
  const customers = Math.max(0, input.estimatedCustomersYear1);
  const revenuePerCustomer = Math.max(0, input.estimatedRevenuePerCustomer);
  const variableCosts = Math.max(0, input.estimatedVariableCosts);
  const fixedCosts = Math.max(0, input.estimatedFixedCosts);
  const cac = Math.max(0, input.estimatedCAC);

  const estimatedGrossRevenueYear1 = roundMoney(customers * revenuePerCustomer);
  const estimatedGrossProfitYear1 = roundMoney(estimatedGrossRevenueYear1 - variableCosts);
  const estimatedGrossMarginPercent =
    estimatedGrossRevenueYear1 > 0
      ? roundPercent((estimatedGrossProfitYear1 / estimatedGrossRevenueYear1) * 100)
      : input.grossMarginPercentHint != null
        ? roundPercent(input.grossMarginPercentHint)
        : 0;

  const contributionMarginPerCustomer =
    customers > 0
      ? roundMoney(estimatedGrossProfitYear1 / customers)
      : roundMoney(revenuePerCustomer * (estimatedGrossMarginPercent / 100));

  const breakEvenCustomers =
    contributionMarginPerCustomer > 0
      ? roundMoney(fixedCosts / contributionMarginPerCustomer)
      : null;

  const estimatedLTV =
    input.estimatedLTV != null && input.estimatedLTV > 0
      ? roundMoney(input.estimatedLTV)
      : roundMoney(revenuePerCustomer * Math.max(0.5, estimatedGrossMarginPercent / 100) * 3);

  const ltvCacRatio = cac > 0 ? roundRatio(estimatedLTV / cac) : null;

  return {
    estimatedGrossRevenueYear1,
    estimatedGrossMarginPercent,
    estimatedGrossProfitYear1,
    contributionMarginPerCustomer,
    breakEvenCustomers,
    ltvCacRatio,
    estimatedLTV,
  };
}

export function applyDerivedEconomicsToPlan<
  T extends {
    estimatedCustomersYear1: number | null;
    estimatedRevenuePerCustomer: number | null;
    estimatedVariableCosts: number | null;
    estimatedFixedCosts: number | null;
    estimatedCAC: number | null;
    estimatedLTV: number | null;
    marginScore: number;
  },
>(plan: T): T & DerivedUnitEconomics {
  const customers = plan.estimatedCustomersYear1 ?? 0;
  const revenuePerCustomer = plan.estimatedRevenuePerCustomer ?? 0;
  const variableCosts = plan.estimatedVariableCosts ?? 0;
  const fixedCosts = plan.estimatedFixedCosts ?? 0;
  const cac = plan.estimatedCAC ?? 0;

  const derived = calculateUnitEconomics({
    estimatedCustomersYear1: customers,
    estimatedRevenuePerCustomer: revenuePerCustomer,
    estimatedVariableCosts: variableCosts,
    estimatedFixedCosts: fixedCosts,
    estimatedCAC: cac,
    estimatedLTV: plan.estimatedLTV,
    grossMarginPercentHint: plan.marginScore > 0 ? plan.marginScore : null,
  });

  return {
    ...plan,
    ...derived,
    estimatedLTV: derived.estimatedLTV,
  };
}
