export const OCCUPANCYNPV_CURRENCY = "usd" as const;

export const OCCUPANCYNPV_CALCULATION_CONVENTION = {
  timing: "END_OF_MONTH",
  period0: "FIRST_MONTH_IS_T1",
  discounting: "ANNUAL_NOMINAL_TO_MONTHLY_EFFECTIVE",
  monthly_rate_formula: "(1 + annual_nominal_rate) ^ (1 / 12) - 1",
  rounding: "NEAREST_CENT",
  currency: OCCUPANCYNPV_CURRENCY,
  free_rent: "BASE_RENT_WAIVED_OPEX_CONTINUES",
} as const;

export type RentStep = {
  start_month: number;
  end_month: number;
  monthly_rent: number;
};

export type FreeRentPeriod = {
  start_month: number;
  end_month: number;
};

export type TimedAmount = {
  month: number;
  amount: number;
  label: string;
};

export type LeaseScenarioInput = {
  scenario_id: string;
  scenario_name: string;
  lease_start: string;
  term_months: number;
  rentable_area: number;
  currency: typeof OCCUPANCYNPV_CURRENCY;
  rent_steps: RentStep[];
  free_rent: FreeRentPeriod[];
  monthly_operating_expenses: number;
  monthly_other_recurring: number;
  one_time_costs: TimedAmount[];
  allowances: TimedAmount[];
  annual_discount_rate: number;
};

export type MonthlyCashFlow = {
  month: number;
  base_rent: number;
  operating_expenses: number;
  other_recurring: number;
  one_time_costs: number;
  allowances: number;
  net: number;
  present_value: number;
};

export type LeaseScenarioResult = {
  scenario_id: string;
  scenario_name: string;
  term_months: number;
  annual_discount_rate: number;
  monthly_discount_rate: number;
  total_nominal_occupancy_cost: number;
  npv: number;
  monthly: MonthlyCashFlow[];
  assumptions: {
    timing: typeof OCCUPANCYNPV_CALCULATION_CONVENTION.timing;
    discounting: typeof OCCUPANCYNPV_CALCULATION_CONVENTION.discounting;
    rounding: typeof OCCUPANCYNPV_CALCULATION_CONVENTION.rounding;
    free_rent: typeof OCCUPANCYNPV_CALCULATION_CONVENTION.free_rent;
    currency: typeof OCCUPANCYNPV_CURRENCY;
  };
};

export type ScenarioComparison = {
  basis: "NPV";
  scenarios: LeaseScenarioResult[];
  npv_difference: number;
  nominal_difference: number;
  lower_npv_scenario_id: string | null;
};

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function monthlyEffectiveRate(annualNominal: number): number {
  if (annualNominal < 0) throw new Error("DISCOUNT_RATE_NEGATIVE");
  return (1 + annualNominal) ** (1 / 12) - 1;
}

export function validateRentSchedule(input: Pick<LeaseScenarioInput, "term_months" | "rent_steps">): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.term_months) || input.term_months < 1) {
    errors.push("TERM_MONTHS_INVALID");
    return errors;
  }
  if (input.rent_steps.length === 0) {
    errors.push("RENT_STEPS_REQUIRED");
    return errors;
  }
  const coverage = Array.from({ length: input.term_months }, () => 0);
  for (const step of input.rent_steps) {
    if (!Number.isInteger(step.start_month) || !Number.isInteger(step.end_month)) errors.push("RENT_STEP_MONTH_NOT_INTEGER");
    if (step.start_month < 1 || step.end_month > input.term_months || step.start_month > step.end_month) {
      errors.push("RENT_STEP_RANGE_INVALID");
    }
    if (!(step.monthly_rent >= 0) || Number.isNaN(step.monthly_rent)) errors.push("RENT_STEP_RATE_INVALID");
    for (let month = step.start_month; month <= step.end_month; month += 1) {
      if (month >= 1 && month <= input.term_months) coverage[month - 1] += 1;
    }
  }
  if (coverage.some((count) => count === 0)) errors.push("RENT_STEP_GAP");
  if (coverage.some((count) => count > 1)) errors.push("RENT_STEP_OVERLAP");
  return [...new Set(errors)];
}

export function validateFreeRent(input: Pick<LeaseScenarioInput, "term_months" | "free_rent">): string[] {
  const errors: string[] = [];
  for (const period of input.free_rent) {
    if (period.start_month < 1 || period.end_month > input.term_months || period.start_month > period.end_month) {
      errors.push("FREE_RENT_RANGE_INVALID");
    }
  }
  return [...new Set(errors)];
}

function rentForMonth(steps: RentStep[], month: number): number {
  const step = steps.find((row) => month >= row.start_month && month <= row.end_month);
  return step?.monthly_rent ?? 0;
}

function isFreeRent(periods: FreeRentPeriod[], month: number): boolean {
  return periods.some((row) => month >= row.start_month && month <= row.end_month);
}

function amountInMonth(items: TimedAmount[], month: number): number {
  return items.filter((row) => row.month === month).reduce((sum, row) => sum + row.amount, 0);
}

export function analyzeLeaseScenario(input: LeaseScenarioInput): { ok: true; result: LeaseScenarioResult } | { ok: false; errors: string[] } {
  const errors = [
    ...validateRentSchedule(input),
    ...validateFreeRent(input),
  ];
  if (input.currency !== "usd") errors.push("CURRENCY_UNSUPPORTED");
  if (input.annual_discount_rate < 0) errors.push("DISCOUNT_RATE_NEGATIVE");
  if (input.monthly_operating_expenses < 0 || input.monthly_other_recurring < 0) errors.push("RECURRING_COST_NEGATIVE");
  if (errors.length) return { ok: false, errors };
  const monthlyRate = monthlyEffectiveRate(input.annual_discount_rate);
  const monthly: MonthlyCashFlow[] = [];
  for (let month = 1; month <= input.term_months; month += 1) {
    const baseRent = isFreeRent(input.free_rent, month) ? 0 : rentForMonth(input.rent_steps, month);
    const operating = input.monthly_operating_expenses;
    const other = input.monthly_other_recurring;
    const oneTime = amountInMonth(input.one_time_costs, month);
    const allowance = amountInMonth(input.allowances, month);
    const net = baseRent + operating + other + oneTime - allowance;
    const presentValue = net / (1 + monthlyRate) ** month;
    monthly.push({
      month,
      base_rent: cents(baseRent),
      operating_expenses: cents(operating),
      other_recurring: cents(other),
      one_time_costs: cents(oneTime),
      allowances: cents(allowance),
      net: cents(net),
      present_value: cents(presentValue),
    });
  }
  return {
    ok: true,
    result: {
      scenario_id: input.scenario_id,
      scenario_name: input.scenario_name,
      term_months: input.term_months,
      annual_discount_rate: input.annual_discount_rate,
      monthly_discount_rate: monthlyRate,
      total_nominal_occupancy_cost: cents(monthly.reduce((sum, row) => sum + row.net, 0)),
      npv: cents(monthly.reduce((sum, row) => sum + row.present_value, 0)),
      monthly,
      assumptions: {
        timing: OCCUPANCYNPV_CALCULATION_CONVENTION.timing,
        discounting: OCCUPANCYNPV_CALCULATION_CONVENTION.discounting,
        rounding: OCCUPANCYNPV_CALCULATION_CONVENTION.rounding,
        free_rent: OCCUPANCYNPV_CALCULATION_CONVENTION.free_rent,
        currency: OCCUPANCYNPV_CURRENCY,
      },
    },
  };
}

export function compareScenarios(results: LeaseScenarioResult[]): ScenarioComparison {
  if (results.length < 2) {
    return { basis: "NPV", scenarios: results, npv_difference: 0, nominal_difference: 0, lower_npv_scenario_id: results[0]?.scenario_id ?? null };
  }
  const [first, second] = results;
  const lower = results.reduce((best, row) => (row.npv < best.npv ? row : best));
  return {
    basis: "NPV",
    scenarios: results,
    npv_difference: cents(second.npv - first.npv),
    nominal_difference: cents(second.total_nominal_occupancy_cost - first.total_nominal_occupancy_cost),
    lower_npv_scenario_id: lower.scenario_id,
  };
}

export function sensitivityByDiscountRate(input: LeaseScenarioInput, rates: number[]): Array<{ annual_discount_rate: number; npv: number }> {
  return rates.map((rate) => {
    const analyzed = analyzeLeaseScenario({ ...input, annual_discount_rate: rate });
    if (!analyzed.ok) throw new Error(analyzed.errors.join(","));
    return { annual_discount_rate: rate, npv: analyzed.result.npv };
  });
}
