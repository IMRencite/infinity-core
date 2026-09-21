import { describe, expect, it } from "vitest";
import { interpretComparisonResult } from "@/app/occupancynpv/app/workspaces/[id]/comparison-result-presentation";

function scenario(id: string, name: string, npv: number) {
  return {
    scenario_id: id,
    scenario_name: name,
    npv,
    total_nominal_occupancy_cost: npv,
    term_months: 12,
    annual_discount_rate: 0.08,
  };
}

describe("OccupancyNPV comparison result presentation", () => {
  it("describes Lease A as lower NPV without calling it a better investment", () => {
    const view = interpretComparisonResult({
      scenarios: [scenario("lease_a", "Lease A", 10000), scenario("lease_b", "Lease B", 12000)],
      comparison: { npv_difference: 2000, lower_npv_scenario_id: "lease_a", basis: "NPV" },
      sensitivity: [],
    });
    expect(view.equal).toBe(false);
    expect(view.lowerName).toBe("Lease A");
    expect(view.outcomeLabel).toMatch(/Lease A has the lower NPV at current assumptions/);
    expect(view.differenceSummary).toMatch(/\$2,000\.00 lower in NPV/);
    expect(view.explanation).toMatch(/not legal, accounting, or investment advice/);
  });

  it("describes Lease B as lower NPV", () => {
    const view = interpretComparisonResult({
      scenarios: [scenario("lease_a", "Lease A", 15000), scenario("lease_b", "Lease B", 11000)],
      comparison: { npv_difference: -4000, lower_npv_scenario_id: "lease_b", basis: "NPV" },
      sensitivity: [],
    });
    expect(view.lowerName).toBe("Lease B");
    expect(view.differenceAbs).toBe(4000);
  });

  it("treats equal NPVs as economically equal even if a lower id is present", () => {
    const view = interpretComparisonResult({
      scenarios: [scenario("lease_a", "Lease A", 9000), scenario("lease_b", "Lease B", 9000)],
      comparison: { npv_difference: 0, lower_npv_scenario_id: "lease_a", basis: "NPV" },
      sensitivity: [],
    });
    expect(view.equal).toBe(true);
    expect(view.outcomeLabel).toMatch(/economically equal/);
    expect(view.lowerName).toBeNull();
  });
});
