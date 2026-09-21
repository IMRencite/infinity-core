import { analyzeLeaseScenario, compareScenarios, sensitivityByDiscountRate, type LeaseScenarioInput } from "./npv";

export function flatRentInput(overrides: Partial<LeaseScenarioInput> = {}): LeaseScenarioInput {
  return {
    scenario_id: "sc_flat",
    scenario_name: "Flat",
    lease_start: "2026-01-01",
    term_months: 12,
    rentable_area: 1000,
    currency: "usd",
    rent_steps: [{ start_month: 1, end_month: 12, monthly_rent: 1000 }],
    free_rent: [],
    monthly_operating_expenses: 0,
    monthly_other_recurring: 0,
    one_time_costs: [],
    allowances: [],
    annual_discount_rate: 0,
    ...overrides,
  };
}

export const OCCUPANCYNPV_CALCULATION_FIXTURES = {
  flatZeroDiscount: { input: flatRentInput(), expectedNpv: 12000, expectedNominal: 12000 },
  steppedZeroDiscount: {
    input: flatRentInput({
      scenario_id: "sc_step",
      scenario_name: "Stepped",
      rent_steps: [
        { start_month: 1, end_month: 6, monthly_rent: 1000 },
        { start_month: 7, end_month: 12, monthly_rent: 1200 },
      ],
    }),
    expectedNpv: 13200,
    expectedNominal: 13200,
  },
  freeRentZeroDiscount: {
    input: flatRentInput({
      scenario_id: "sc_free",
      scenario_name: "Free rent",
      free_rent: [{ start_month: 1, end_month: 2 }],
    }),
    expectedNpv: 10000,
    expectedNominal: 10000,
  },
  expenseZeroDiscount: {
    input: flatRentInput({
      scenario_id: "sc_opex",
      scenario_name: "Expenses",
      monthly_operating_expenses: 200,
    }),
    expectedNpv: 14400,
    expectedNominal: 14400,
  },
  allowanceZeroDiscount: {
    input: flatRentInput({
      scenario_id: "sc_allow",
      scenario_name: "Allowance",
      allowances: [{ month: 1, amount: 3000, label: "TI allowance" }],
    }),
    expectedNpv: 9000,
    expectedNominal: 9000,
  },
  oneTimeCostZeroDiscount: {
    input: flatRentInput({
      scenario_id: "sc_onetime",
      scenario_name: "One-time",
      one_time_costs: [{ month: 1, amount: 1500, label: "Moving" }],
    }),
    expectedNpv: 13500,
    expectedNominal: 13500,
  },
} as const;

export function evaluateCalculationFixtures(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;
  for (const [name, fixture] of Object.entries(OCCUPANCYNPV_CALCULATION_FIXTURES)) {
    const analyzed = analyzeLeaseScenario(fixture.input);
    if (!analyzed.ok) {
      failed += 1;
      details.push(`${name}: ${analyzed.errors.join(",")}`);
      continue;
    }
    if (analyzed.result.npv !== fixture.expectedNpv || analyzed.result.total_nominal_occupancy_cost !== fixture.expectedNominal) {
      failed += 1;
      details.push(`${name}: got npv=${analyzed.result.npv} nominal=${analyzed.result.total_nominal_occupancy_cost}`);
      continue;
    }
    passed += 1;
  }
  const a = analyzeLeaseScenario(flatRentInput({ scenario_id: "a", scenario_name: "A" }));
  const b = analyzeLeaseScenario(flatRentInput({
    scenario_id: "b",
    scenario_name: "B",
    rent_steps: [{ start_month: 1, end_month: 12, monthly_rent: 1100 }],
  }));
  if (a.ok && b.ok) {
    const comparison = compareScenarios([a.result, b.result]);
    if (comparison.basis !== "NPV" || comparison.npv_difference !== 1200 || comparison.lower_npv_scenario_id !== "a") {
      failed += 1;
      details.push("comparison_mismatch");
    } else {
      passed += 1;
    }
  }
  const discounted = analyzeLeaseScenario(flatRentInput({ annual_discount_rate: 0.12 }));
  if (discounted.ok && discounted.result.npv < 12000 && discounted.result.npv > 0) {
    const curve = sensitivityByDiscountRate(flatRentInput({ annual_discount_rate: 0 }), [0, 0.08, 0.12]);
    if (curve[0].npv === 12000 && curve[1].npv < curve[0].npv && curve[2].npv < curve[1].npv) {
      passed += 1;
    } else {
      failed += 1;
      details.push("sensitivity_not_monotonic");
    }
  } else {
    failed += 1;
    details.push("discount_rate_fixture");
  }
  return { passed, failed, details };
}
