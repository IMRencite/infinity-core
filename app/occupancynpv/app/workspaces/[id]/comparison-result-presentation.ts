export type ComparisonScenarioView = {
  scenario_id: string;
  scenario_name: string;
  npv: number;
  total_nominal_occupancy_cost: number;
  term_months: number;
  annual_discount_rate: number;
  monthly_rent?: number | null;
  stepped_monthly_rent?: number | null;
  free_rent_months?: number | null;
  monthly_operating_expenses?: number | null;
  allowance?: number | null;
};

export type ComparisonResultView = {
  scenarios: ComparisonScenarioView[];
  comparison: {
    npv_difference: number;
    lower_npv_scenario_id: string | null;
    basis: string;
  } | null;
  sensitivity: Array<{ annual_discount_rate: number; npv: number }>;
};

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(rate * 100 >= 1 || rate === 0 ? 0 : 1)}%`;
}

export function interpretComparisonResult(view: ComparisonResultView): {
  equal: boolean;
  lowerName: string | null;
  higherName: string | null;
  differenceAbs: number;
  discountRate: number | null;
  outcomeLabel: string;
  differenceSummary: string;
  explanation: string;
} {
  const [first, second] = view.scenarios;
  const equal = Boolean(first && second && first.npv === second.npv);
  const lower = !equal && view.comparison?.lower_npv_scenario_id
    ? view.scenarios.find((row) => row.scenario_id === view.comparison?.lower_npv_scenario_id) ?? null
    : equal
      ? null
      : view.scenarios.reduce<ComparisonScenarioView | null>((best, row) => (!best || row.npv < best.npv ? row : best), null);
  const higher = lower ? view.scenarios.find((row) => row.scenario_id !== lower.scenario_id) ?? null : null;
  const differenceAbs = first && second ? Math.abs(first.npv - second.npv) : Math.abs(view.comparison?.npv_difference ?? 0);
  const discountRate = first?.annual_discount_rate ?? second?.annual_discount_rate ?? null;
  const rateLabel = discountRate == null ? "the current discount rate" : `a ${formatRate(discountRate)} annual discount rate`;
  const outcomeLabel = equal
    ? "The leases are economically equal at the current assumptions."
    : lower
      ? `${lower.scenario_name} has the lower NPV at current assumptions`
      : "Lease comparison result";
  const differenceSummary = equal
    ? "The two scenarios have the same NPV under the current inputs."
    : lower && higher
      ? `${lower.scenario_name} is ${formatUsd(differenceAbs)} lower in NPV than ${higher.scenario_name} at ${rateLabel}.`
      : `NPV difference: ${formatUsd(differenceAbs)}.`;
  return {
    equal,
    lowerName: lower?.scenario_name ?? null,
    higherName: higher?.scenario_name ?? null,
    differenceAbs,
    discountRate,
    outcomeLabel,
    differenceSummary,
    explanation: "Lower NPV means the modeled occupancy cash flows have a lower present-value cost under the assumptions you entered. This is not legal, accounting, or investment advice.",
  };
}

export function scenarioViewFromStored(row: {
  result: {
    scenario_id?: string;
    scenario_name: string;
    npv: number;
    total_nominal_occupancy_cost: number;
    term_months: number;
    annual_discount_rate: number;
  };
  input?: {
    scenario_id?: string;
    rent_steps?: Array<{ monthly_rent: number; start_month: number }>;
    free_rent?: Array<{ end_month: number }>;
    monthly_operating_expenses?: number;
    allowances?: Array<{ amount: number }>;
  } | null;
}): ComparisonScenarioView {
  const steps = row.input?.rent_steps ?? [];
  return {
    scenario_id: row.result.scenario_id ?? row.input?.scenario_id ?? row.result.scenario_name,
    scenario_name: row.result.scenario_name,
    npv: row.result.npv,
    total_nominal_occupancy_cost: row.result.total_nominal_occupancy_cost,
    term_months: row.result.term_months,
    annual_discount_rate: row.result.annual_discount_rate,
    monthly_rent: steps[0]?.monthly_rent ?? null,
    stepped_monthly_rent: steps[1]?.monthly_rent ?? null,
    free_rent_months: row.input?.free_rent?.[0]?.end_month ?? null,
    monthly_operating_expenses: row.input?.monthly_operating_expenses ?? null,
    allowance: row.input?.allowances?.[0]?.amount ?? null,
  };
}
