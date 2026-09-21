import { unknownRange, type EconomicRange } from "../comparable-economics/provenance";
import type { BenchmarkAggregation, QualifiedBenchmark } from "./types";
import { feedsBaseCase } from "./aggregate";

function center(range: EconomicRange): number | null {
  return range.base ?? range.low ?? range.high;
}

function acceptedOf(items: QualifiedBenchmark[], dimension: string, kinds?: Set<string>): QualifiedBenchmark[] {
  return items.filter(
    (item) =>
      item.dimension === dimension &&
      feedsBaseCase(item) &&
      (!kinds || (item.churnKind != null && kinds.has(item.churnKind))),
  );
}

function rangeFromItems(items: QualifiedBenchmark[]): EconomicRange {
  const lows = items.map((item) => item.range.low).filter((value): value is number => value != null);
  const highs = items.map((item) => item.range.high).filter((value): value is number => value != null);
  const bases = items.map((item) => center(item.range)).filter((value): value is number => value != null);
  if (!bases.length) return unknownRange();
  return {
    low: lows.length ? Math.min(...lows) : Math.min(...bases),
    base: bases.sort((a, b) => a - b)[Math.floor(bases.length / 2)]!,
    high: highs.length ? Math.max(...highs) : Math.max(...bases),
  };
}

/** Annual retention R → monthly churn = 1 − R^(1/12). Never divide by 12. */
export function monthlyChurnFromAnnualRetention(annualRetention: number): number {
  if (annualRetention <= 0 || annualRetention >= 1) return 0;
  return 1 - annualRetention ** (1 / 12);
}

/** Annual logo churn c → monthly equivalent = 1 − (1 − c)^(1/12). Never divide by 12. */
export function monthlyChurnFromAnnualChurn(annualChurn: number): number {
  if (!(annualChurn > 0) || annualChurn >= 1) return 0;
  return 1 - (1 - annualChurn) ** (1 / 12);
}

export function annualChurnFromAnnualRetention(annualRetention: number): number {
  return 1 - annualRetention;
}

export function lifetimeMonthsFromMonthlyChurn(monthlyChurn: number): number | null {
  if (!(monthlyChurn > 0) || monthlyChurn >= 1) return null;
  return 1 / monthlyChurn;
}

const LIFETIME_FORMULA = "lifetime_months = 1 / monthly_logo_churn";
const ANNUAL_RETENTION_FORMULA =
  "monthly_churn = 1 − annual_logo_retention^(1/12); lifetime_months = 1 / monthly_churn";
const ANNUAL_CHURN_FORMULA =
  "monthly_churn = 1 − (1 − annual_logo_churn)^(1/12); lifetime_months = 1 / monthly_churn";

export function modelRetention(input: {
  aggregations: Partial<Record<string, BenchmarkAggregation>>;
  qualified: QualifiedBenchmark[];
}): {
  monthlyChurn: EconomicRange;
  annualChurn: EconomicRange;
  lifetimeMonths: EconomicRange;
  formula: string;
  mixedIncompatible: boolean;
} {
  const logoMonthly = acceptedOf(input.qualified, "monthly_churn", new Set(["monthly_logo"]));
  const revenueMonthly = acceptedOf(input.qualified, "monthly_churn", new Set(["monthly_revenue"]));
  const unknownMonthly = acceptedOf(input.qualified, "monthly_churn", new Set(["unknown"]));
  const mixedIncompatible = logoMonthly.length > 0 && revenueMonthly.length > 0;

  if (mixedIncompatible || (unknownMonthly.length > 0 && (logoMonthly.length > 0 || revenueMonthly.length > 0))) {
    return {
      monthlyChurn: unknownRange(),
      annualChurn: unknownRange(),
      lifetimeMonths: unknownRange(),
      formula: "Refused to mix logo churn with revenue churn or ambiguous churn.",
      mixedIncompatible: true,
    };
  }

  if (revenueMonthly.length || unknownMonthly.length) {
    const monthly = rangeFromItems(revenueMonthly.length ? revenueMonthly : unknownMonthly);
    return {
      monthlyChurn: monthly,
      annualChurn: input.aggregations.annual_churn?.acceptedRange ?? unknownRange(),
      lifetimeMonths: unknownRange(),
      formula: "UNKNOWN — revenue churn, gross churn, and ambiguous churn are excluded from customer lifetime.",
      mixedIncompatible: false,
    };
  }

  if (logoMonthly.length) {
    const monthly = rangeFromItems(logoMonthly);
    const life = {
      low: monthly.high != null ? lifetimeMonthsFromMonthlyChurn(monthly.high) : null,
      base: monthly.base != null ? lifetimeMonthsFromMonthlyChurn(monthly.base) : null,
      high: monthly.low != null ? lifetimeMonthsFromMonthlyChurn(monthly.low) : null,
    };
    return {
      monthlyChurn: monthly,
      annualChurn: input.aggregations.annual_churn?.acceptedRange ?? unknownRange(),
      lifetimeMonths: life,
      formula: LIFETIME_FORMULA,
      mixedIncompatible: false,
    };
  }

  const lifetimeObs = input.aggregations.customer_lifetime?.acceptedRange ?? unknownRange();
  if (center(lifetimeObs) != null) {
    return {
      monthlyChurn: unknownRange(),
      annualChurn: input.aggregations.annual_churn?.acceptedRange ?? unknownRange(),
      lifetimeMonths: lifetimeObs,
      formula: "lifetime_months from grounded customer-lifetime benchmark; monthly churn not inferred from incompatible metrics.",
      mixedIncompatible: false,
    };
  }

  const annualLogoRetention = acceptedOf(input.qualified, "retention_rate", new Set(["annual_logo", "customer_retention"]));
  if (annualLogoRetention.length) {
    const retention = rangeFromItems(annualLogoRetention);
    const toMonthly = (value: number | null) => (value == null ? null : monthlyChurnFromAnnualRetention(value));
    const monthlyFromRetention = {
      low: toMonthly(retention.high),
      base: toMonthly(retention.base),
      high: toMonthly(retention.low),
    };
    return {
      monthlyChurn: monthlyFromRetention,
      annualChurn: {
        low: retention.high != null ? annualChurnFromAnnualRetention(retention.high) : null,
        base: retention.base != null ? annualChurnFromAnnualRetention(retention.base) : null,
        high: retention.low != null ? annualChurnFromAnnualRetention(retention.low) : null,
      },
      lifetimeMonths: {
        low: monthlyFromRetention.high != null ? lifetimeMonthsFromMonthlyChurn(monthlyFromRetention.high) : null,
        base: monthlyFromRetention.base != null ? lifetimeMonthsFromMonthlyChurn(monthlyFromRetention.base) : null,
        high: monthlyFromRetention.low != null ? lifetimeMonthsFromMonthlyChurn(monthlyFromRetention.low) : null,
      },
      formula: ANNUAL_RETENTION_FORMULA,
      mixedIncompatible: false,
    };
  }

  const annualLogoChurn = acceptedOf(input.qualified, "annual_churn", new Set(["annual_logo"]));
  if (annualLogoChurn.length) {
    const annual = rangeFromItems(annualLogoChurn);
    const toMonthly = (value: number | null) => (value == null ? null : monthlyChurnFromAnnualChurn(value));
    const monthlyFromAnnual = {
      low: toMonthly(annual.high),
      base: toMonthly(annual.base),
      high: toMonthly(annual.low),
    };
    return {
      monthlyChurn: monthlyFromAnnual,
      annualChurn: annual,
      lifetimeMonths: {
        low: monthlyFromAnnual.high != null ? lifetimeMonthsFromMonthlyChurn(monthlyFromAnnual.high) : null,
        base: monthlyFromAnnual.base != null ? lifetimeMonthsFromMonthlyChurn(monthlyFromAnnual.base) : null,
        high: monthlyFromAnnual.low != null ? lifetimeMonthsFromMonthlyChurn(monthlyFromAnnual.low) : null,
      },
      formula: ANNUAL_CHURN_FORMULA,
      mixedIncompatible: false,
    };
  }

  return {
    monthlyChurn: unknownRange(),
    annualChurn: input.aggregations.annual_churn?.acceptedRange ?? unknownRange(),
    lifetimeMonths: unknownRange(),
    formula: "UNKNOWN — no compatible monthly logo churn or annual logo retention.",
    mixedIncompatible: false,
  };
}
