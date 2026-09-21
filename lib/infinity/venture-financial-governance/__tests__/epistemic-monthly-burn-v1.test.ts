import { beforeEach, describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { buildOccupancynpvEconomics } from "@/lib/infinity/venture-economics/occupancynpv";
import { projectProfitLabHq } from "@/lib/infinity/venture-economics/hq";
import {
  authorizePortfolioCapital,
  computeEpistemicMonthlyBurn,
  evaluateEpistemicMonthlyBurnContract,
  evaluateFounderCapitalPolicyReadinessGate,
  evaluatePortfolioMonthlyBurnGate,
  ingestCanonicalCostEvent,
  projectOccupancyNpvFinancialView,
  projectPortfolioCapitalView,
  resetFinancialGovernance,
} from "..";

const OCC = CRE_VENTURE_ID;
const NOW = new Date().toISOString();

describe("EPISTEMIC_MONTHLY_BURN_V1", () => {
  beforeEach(() => {
    resetFinancialGovernance();
  });

  it("does not collapse unmeasured OccupancyNPV costs to a known-zero total", () => {
    const burn = computeEpistemicMonthlyBurn();
    expect(burn.known_amount).toBe(0);
    expect(burn.estimated_amount).toBeNull();
    expect(burn.unknown_components).toEqual(["infrastructure", "provider/API", "growth", "fulfillment"]);
    expect(burn.total_state).toBe("UNKNOWN");
    expect(burn.total_amount).toBeNull();
    expect(evaluateEpistemicMonthlyBurnContract(burn).result).toBe("PASS");
    const portfolio = projectPortfolioCapitalView({ venture_ids: [OCC] });
    expect(portfolio.known_monthly_burn).toBe("$0");
    expect(portfolio.monthly_burn).toBe("UNKNOWN");
    expect(portfolio.monthly_burn_state).toBe("UNKNOWN");
    expect(portfolio.operating_contribution).toBe("UNKNOWN");
    const view = projectOccupancyNpvFinancialView();
    expect(view.actual.find((row) => row.label === "Known monthly burn")?.value).toBe("$0");
    expect(view.actual.find((row) => row.label === "Actual total monthly burn")?.value).toBe("UNKNOWN");
    expect(view.actual.find((row) => row.label === "Gross Profit")?.value).toBe("$0");
    expect(view.actual.find((row) => row.label === "Contribution Profit")?.value).toBe("UNKNOWN");
    const hq = projectProfitLabHq([buildOccupancynpvEconomics()]);
    expect(hq.portfolio_capital?.monthly_burn).not.toBe("$0");
    expect(hq.portfolio_capital?.known_monthly_burn).toBe("$0");
    expect(hq.portfolio_capital?.operating_contribution).toBe("UNKNOWN");
  });

  it("treats explicitly measured zero in every material category as known zero", () => {
    for (const category of ["INFRASTRUCTURE", "PROVIDER_API", "GROWTH", "FULFILLMENT"] as const) {
      ingestCanonicalCostEvent({
        venture_id: OCC,
        category,
        amount: 0,
        source: `explicit-zero-${category}`,
        occurred_at: NOW,
        committed_or_spent: "SPENT",
        actual_or_estimated: "ACTUAL",
      });
    }
    const burn = computeEpistemicMonthlyBurn();
    expect(burn.known_amount).toBe(0);
    expect(burn.unknown_components).toEqual([]);
    expect(burn.total_state).toBe("KNOWN");
    expect(burn.total_amount).toBe(0);
    expect(evaluateEpistemicMonthlyBurnContract(burn).result).toBe("PASS");
    expect(projectPortfolioCapitalView().monthly_burn).toBe("$0");
    expect(projectPortfolioCapitalView().monthly_burn_state).toBe("KNOWN");
  });

  it("keeps mixed known and unknown burn as PARTIAL and does not report the known slice as the total", () => {
    ingestCanonicalCostEvent({
      venture_id: OCC,
      category: "PROVIDER_API",
      amount: 25,
      source: "gemini",
      occurred_at: NOW,
      committed_or_spent: "SPENT",
      actual_or_estimated: "ACTUAL",
    });
    const burn = computeEpistemicMonthlyBurn();
    expect(burn.known_amount).toBe(25);
    expect(burn.unknown_components).toContain("infrastructure");
    expect(burn.total_state).toBe("PARTIAL");
    expect(burn.total_amount).toBeNull();
    const portfolio = projectPortfolioCapitalView();
    expect(portfolio.known_monthly_burn).toBe("$25");
    expect(portfolio.monthly_burn).toBe("PARTIAL");
    expect(portfolio.monthly_burn).not.toBe("$25");
  });

  it("does not treat unknown historical burn as discretionary monthly capacity", () => {
    authorizePortfolioCapital({
      total_authorized: 10_000,
      monthly_burn_cap: 5_000,
      unvalidated_capital_cap: 5_000,
      max_active_builds: 2,
      authorized_by: "founder-test",
    });
    const discretionary = evaluatePortfolioMonthlyBurnGate("DISCRETIONARY");
    expect(discretionary.result).toBe("FAIL");
    expect(discretionary.reasons).toContain("UNKNOWN_BURN_NOT_ZERO");
    expect(evaluatePortfolioMonthlyBurnGate("CRITICAL_FULFILLMENT").result).toBe("PASS");
    expect(evaluatePortfolioMonthlyBurnGate("CUSTOMER_SUPPORT").result).toBe("PASS");
  });

  it("passes founder capital policy readiness when known and unknown remain distinct", () => {
    expect(evaluateFounderCapitalPolicyReadinessGate().result).toBe("PASS");
    ingestCanonicalCostEvent({
      venture_id: OCC,
      category: "PROVIDER_API",
      amount: 25,
      source: "openai",
      occurred_at: NOW,
      committed_or_spent: "SPENT",
      actual_or_estimated: "ACTUAL",
    });
    expect(evaluateFounderCapitalPolicyReadinessGate().result).toBe("PASS");
    expect(evaluateEpistemicMonthlyBurnContract().result).toBe("PASS");
  });
});
