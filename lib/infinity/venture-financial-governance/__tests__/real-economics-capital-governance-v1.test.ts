import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { buildOccupancynpvEconomics } from "@/lib/infinity/venture-economics/occupancynpv";
import { buildAskReviewEconomics } from "@/lib/infinity/venture-economics/askreview";
import { projectProfitLabHq } from "@/lib/infinity/venture-economics/hq";
import { OCCUPANCYNPV_PER_DEAL_PRICE_USD, OCCUPANCYNPV_PROFESSIONAL_PRICE_USD } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import {
  ACTION_SPEND_AUTHORIZATION_GATE,
  CAPITAL_RECOMMENDATION_STATES,
  authorizePortfolioCapital,
  authorizeVentureBudget,
  cancelCommitment,
  computeVentureLedger,
  evaluateActionSpendAuthorizationGate,
  evaluateActiveVentureBuildCapacityGate,
  evaluateExpectedValidationBudgetGate,
  evaluateFinancialEventIdempotencyGate,
  evaluatePortfolioCapitalStopGate,
  evaluatePortfolioFinancialReconciliationGate,
  evaluatePortfolioMonthlyBurnGate,
  evaluateUnvalidatedVentureCapitalRiskGate,
  evaluateVentureBudgetContract,
  evaluateVentureCreationPrecheck,
  evaluateVentureEconomicsActualVsModeledContract,
  evaluateVentureFinancialLedgerContract,
  evaluateVentureFinancialReconciliationGate,
  financialResultsToPerformanceEvents,
  ingestCanonicalCostEvent,
  ingestCanonicalRefundEvent,
  ingestCanonicalRevenueEvent,
  inspectFinancialGovernance,
  learnCrossVenturePriors,
  occupancyNpvModeledAssumptions,
  projectOccupancyNpvFinancialView,
  projectPortfolioCapitalView,
  recommendCapitalAllocation,
  resetFinancialGovernance,
  syncCommercialPaymentToVentureLedger,
} from "..";

const OCC = CRE_VENTURE_ID;

describe("REAL_ECONOMICS_AND_CAPITAL_GOVERNANCE_V1", () => {
  beforeEach(() => {
    resetFinancialGovernance();
  });

  it("keeps OccupancyNPV actuals at zero and UNKNOWN without inventing a budget", () => {
    const ledger = computeVentureLedger(inspectFinancialGovernance(), OCC);
    expect(evaluateVentureFinancialLedgerContract(ledger).result).toBe("PASS");
    expect(ledger.transaction_count).toBe(0);
    expect(ledger.gross_revenue.value).toBe(0);
    expect(ledger.refunds.value).toBe(0);
    expect(ledger.net_revenue.value).toBe(0);
    expect(ledger.actual_cac.actuality).toBe("UNKNOWN");
    expect(ledger.actual_ltv.actuality).toBe("UNKNOWN");
    expect(ledger.actual_payback.actuality).toBe("UNKNOWN");
    expect(ledger.infrastructure_cost.actuality).toBe("UNKNOWN");
    expect(ledger.provider_api_cost.actuality).toBe("UNKNOWN");
    expect(ledger.growth_cost.actuality).toBe("UNKNOWN");
    expect(ledger.fulfillment_cost.actuality).toBe("UNKNOWN");
    const budget = evaluateVentureBudgetContract(OCC);
    expect(budget.result).toBe("PASS");
    expect(budget.reasons).toContain("NOT_SET");
    const modeled = occupancyNpvModeledAssumptions();
    expect(modeled.cac).toBe("UNKNOWN");
    expect(modeled.ltv).toBe("UNKNOWN");
    expect(modeled.confidence).toBe("MEDIUM");
    expect(inspectFinancialGovernance().reinvestment).toBe("NO_AUTO_REINVESTMENT");
  });

  it("records a real $149 payment into actual economics and Profit Lab", () => {
    const first = ingestCanonicalRevenueEvent({
      venture_id: OCC,
      customer_ref: "cus_real_1",
      offer: "PER_DEAL",
      payment_id: "pi_real_149",
      provider: "stripe",
      gross_amount: 149,
      paid_at: "2026-09-11T15:00:00.000Z",
    });
    expect(first.ingested).toBe(true);
    const ledger = computeVentureLedger(inspectFinancialGovernance(), OCC);
    expect(ledger.gross_revenue.value).toBe(149);
    expect(ledger.transaction_count).toBe(1);
    expect(ledger.net_revenue.value).toBe(149);
    expect(ledger.payment_processing_fees.actuality).toBe("UNKNOWN");
    expect(evaluateVentureFinancialReconciliationGate(inspectFinancialGovernance(), ledger).result).toBe("PASS");
    const view = projectOccupancyNpvFinancialView();
    expect(view.actual.find((row) => row.label === "Revenue")?.value).toBe("$149");
    expect(view.transaction_count).toBe(1);
    const portfolio = projectPortfolioCapitalView({ venture_ids: [OCC] });
    expect(portfolio.revenue).toBe("$149");
  });

  it("excludes synthetic and unpaid checkout from actual revenue", () => {
    ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "pi_real_keep",
      provider: "stripe",
      gross_amount: 149,
    });
    const synthetic = ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "pi_synthetic",
      provider: "stripe",
      gross_amount: 149,
      synthetic: true,
    });
    const unpaid = ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "cs_unpaid",
      provider: "stripe",
      gross_amount: 149,
      unpaid: true,
    });
    const webhookSynthetic = syncCommercialPaymentToVentureLedger({
      venture_id: OCC,
      event_type: "PAYMENT_SUCCEEDED",
      payment_id: "pi_test_checkout",
      provider: "stripe",
      gross_amount: 149,
      synthetic: true,
    });
    expect(synthetic.ingested).toBe(false);
    expect(unpaid.ingested).toBe(false);
    expect(webhookSynthetic.reason).toBe("SYNTHETIC_EXCLUDED");
    expect(computeVentureLedger(inspectFinancialGovernance(), OCC).transaction_count).toBe(1);
    expect(computeVentureLedger(inspectFinancialGovernance(), OCC).gross_revenue.value).toBe(149);
  });

  it("does not double-count duplicate payment or refund webhooks", () => {
    ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "pi_dup",
      provider: "stripe",
      gross_amount: 149,
    });
    const again = ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "pi_dup",
      provider: "stripe",
      gross_amount: 149,
    });
    expect(again.ingested).toBe(false);
    expect(again.reason).toBe("DUPLICATE_IGNORED");
    expect(evaluateFinancialEventIdempotencyGate("rev:stripe:pi_dup").reasons).toContain("DUPLICATE_IGNORED");
    expect(computeVentureLedger(inspectFinancialGovernance(), OCC).gross_revenue.value).toBe(149);

    ingestCanonicalRefundEvent({
      venture_id: OCC,
      payment_id: "pi_dup",
      amount: 149,
      provider_ref: "re_dup",
    });
    const refundAgain = ingestCanonicalRefundEvent({
      venture_id: OCC,
      payment_id: "pi_dup",
      amount: 149,
      provider_ref: "re_dup",
    });
    expect(refundAgain.ingested).toBe(false);
    const ledger = computeVentureLedger(inspectFinancialGovernance(), OCC);
    expect(ledger.gross_revenue.value).toBe(149);
    expect(ledger.refunds.value).toBe(149);
    expect(ledger.net_revenue.value).toBe(0);
    expect(inspectFinancialGovernance().revenues[0]?.refund_status).toBe("FULL");
  });

  it("blocks discretionary spend when committed+spent exhausts the authorized envelope", () => {
    authorizeVentureBudget({
      venture_id: OCC,
      total_authorized_budget: 1000,
      authorized_by: "founder-test",
      envelopes: { GROWTH: 200, BUILD: 400 },
    });
    ingestCanonicalCostEvent({
      venture_id: OCC,
      category: "BUILD",
      amount: 900,
      source: "fixture-spent",
      committed_or_spent: "SPENT",
    });
    ingestCanonicalCostEvent({
      venture_id: OCC,
      category: "BUILD",
      amount: 100,
      source: "fixture-commit",
      committed_or_spent: "COMMITTED",
      event_id: "commit:50-block",
    });
    const gate = evaluateActionSpendAuthorizationGate({
      venture_id: OCC,
      amount: 50,
      envelope: "BUILD",
      kind: "DISCRETIONARY",
    });
    expect(gate.gate).toBe(ACTION_SPEND_AUTHORIZATION_GATE);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("BLOCKED_VENTURE_BUDGET");
    const released = cancelCommitment("commit:50-block");
    expect(released.released).toBe(true);
  });

  it("blocks category envelope spend even when overall budget remains", () => {
    authorizeVentureBudget({
      venture_id: OCC,
      total_authorized_budget: 1000,
      authorized_by: "founder-test",
      envelopes: { GROWTH: 0 },
    });
    const gate = evaluateActionSpendAuthorizationGate({
      venture_id: OCC,
      amount: 100,
      envelope: "GROWTH",
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("BLOCKED_CATEGORY_BUDGET");
  });

  it("fails portfolio stop, monthly burn, unvalidated risk, and multi-venture gates without inventing caps", () => {
    expect(evaluatePortfolioCapitalStopGate().reasons).toContain("NOT_SET");
    expect(evaluatePortfolioMonthlyBurnGate("DISCRETIONARY").reasons).toContain("NOT_SET");
    expect(evaluateUnvalidatedVentureCapitalRiskGate().reasons).toContain("NOT_SET");
    expect(evaluateActiveVentureBuildCapacityGate(0).reasons).toContain("NOT_SET");
    expect(evaluateExpectedValidationBudgetGate({ preliminary_economics: false }).result).toBe("FAIL");

    const unset = evaluateVentureCreationPrecheck({
      active_build_count: 0,
      unvalidated_at_risk: 0,
    });
    expect(unset.state).toBe("BLOCKED_PENDING_CAPITAL_POLICY");
    expect(unset.discovery_may_continue).toBe(true);
    expect(unset.new_spend_build_may_begin).toBe(false);

    authorizePortfolioCapital({
      total_authorized: 0,
      monthly_burn_cap: 0,
      unvalidated_capital_cap: 0,
      max_active_builds: 0,
      authorized_by: "founder-test",
    });
    expect(evaluatePortfolioCapitalStopGate().result).toBe("FAIL");
    expect(evaluatePortfolioMonthlyBurnGate("DISCRETIONARY").result).toBe("FAIL");
    expect(evaluatePortfolioMonthlyBurnGate("CRITICAL_FULFILLMENT").result).toBe("PASS");
    expect(evaluateUnvalidatedVentureCapitalRiskGate({ unvalidated_at_risk: 1, starting_unvalidated: true }).result).toBe("FAIL");
    expect(evaluateActiveVentureBuildCapacityGate(0).result).toBe("FAIL");
    const blocked = evaluateVentureCreationPrecheck({
      active_build_count: 0,
      unvalidated_at_risk: 0,
      preliminary_economics: true,
      expected_validation_cost: 100,
      expected_build_cost: 200,
      authorized_budget: 500,
    });
    expect(blocked.state).toBe("BLOCKED_CAPITAL");
    expect(blocked.new_spend_build_may_begin).toBe(false);
  });

  it("does not let revenue expand authorized spend and does not treat UNKNOWN cost as zero", () => {
    authorizeVentureBudget({
      venture_id: OCC,
      total_authorized_budget: 1000,
      authorized_by: "founder-test",
    });
    ingestCanonicalCostEvent({
      venture_id: OCC,
      category: "BUILD",
      amount: 1000,
      source: "spent-all",
      committed_or_spent: "SPENT",
    });
    ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "pi_reinvest",
      provider: "stripe",
      gross_amount: 1000,
    });
    const ledger = computeVentureLedger(inspectFinancialGovernance(), OCC);
    expect(ledger.gross_revenue.value).toBe(1000);
    expect(ledger.available_capital.value).toBe(0);
    const spend = evaluateActionSpendAuthorizationGate({ venture_id: OCC, amount: 10 });
    expect(spend.result).toBe("FAIL");
    const unknown = evaluateActionSpendAuthorizationGate({ venture_id: OCC, amount: null });
    expect(unknown.reasons).toContain("EXPECTED_COST_UNKNOWN");
    expect(unknown.result).toBe("FAIL");
    const rec = recommendCapitalAllocation(OCC);
    expect(rec.authorizes_money).toBe(false);
    expect(CAPITAL_RECOMMENDATION_STATES).toEqual(["INVEST_MORE", "MAINTAIN", "REDUCE", "PAUSE", "PIVOT", "SHUT_DOWN"]);
  });

  it("keeps modeled CAC separate from UNKNOWN actual CAC", () => {
    const modeled = buildOccupancynpvEconomics();
    expect(modeled.customer_acquisition_model.display).toMatch(/UNKNOWN/i);
    const view = projectOccupancyNpvFinancialView();
    expect(view.modeled.find((row) => row.label === "CAC")?.value).toBe("UNKNOWN");
    expect(view.actual.find((row) => row.label === "Actual CAC")?.value).toBe("UNKNOWN");
    expect(view.forecast.find((row) => row.label === "Forecast CAC")?.value).toBe("UNKNOWN");
    expect(view.layers_separated).toBe(true);
    expect(
      evaluateVentureEconomicsActualVsModeledContract({
        modeled_overwritten_by_actual: false,
        actual_inferred_from_forecast: false,
        blended: false,
      }).result,
    ).toBe("PASS");
    const hq = projectProfitLabHq([modeled]);
    expect(hq.financials?.[0]?.actual.find((row) => row.label === "Revenue")?.value).toBe("$0");
    expect(hq.financials?.[0]?.budget.find((row) => row.label === "Budget")?.value).toBe("NOT_SET");
    expect(hq.portfolio_capital?.authorized_capital).toBe("NOT_SET");
    expect(hq.portfolio_capital?.new_venture_creation_state).toBe("BLOCKED_PENDING_CAPITAL_POLICY");
  });

  it("feeds actuals to Performance Intelligence with sample-size confidence", () => {
    ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "pi_learn",
      provider: "stripe",
      gross_amount: 149,
    });
    const events = financialResultsToPerformanceEvents(OCC);
    expect(events.some((row) => row.metric === "actual_gross_revenue_usd" && row.value === 149)).toBe(true);
    const prior = learnCrossVenturePriors({
      name: "typical_validation_cost",
      values: [80],
      context: "CRE",
      date_range: "2026-09",
      evidence_sources: ["fixture"],
    });
    expect(prior.sample_size).toBe(1);
    expect(prior.confidence).toBe("INSUFFICIENT");
    expect(prior.value).toBeNull();
  });

  it("reconciles portfolio totals from venture ledgers", () => {
    ingestCanonicalRevenueEvent({
      venture_id: OCC,
      payment_id: "pi_port",
      provider: "stripe",
      gross_amount: 290,
    });
    expect(evaluatePortfolioFinancialReconciliationGate([OCC]).result).toBe("PASS");
  });

  it("does not change OccupancyNPV pricing, trial, or AskReview pause", () => {
    expect(OCCUPANCYNPV_PROFESSIONAL_PRICE_USD).toBe(290);
    expect(OCCUPANCYNPV_PER_DEAL_PRICE_USD).toBe(149);
    const experiment = readFileSync(join(process.cwd(), "lib/infinity/growth-engine/occupancynpv-experiment.ts"), "utf8");
    expect(experiment).toContain("trial_enabled: false");
    const ask = buildAskReviewEconomics();
    expect(ask.production_advancement).toBe("PAUSED");
    expect(ask.venture_id).toBe(ASKREVIEW_VENTURE_ID);
    const panel = readFileSync(join(process.cwd(), "components/dashboard/operator-console/department-detail-panel.tsx"), "utf8");
    expect(panel).toContain("data-hq-profit-lab-layer={layer}");
    expect(panel).toContain('layer="MODELED"');
    expect(panel).toContain('layer="ACTUAL"');
    expect(panel).toContain('layer="FORECAST"');
    expect(panel).toContain('layer="BUDGET"');
    expect(panel).toContain("data-hq-portfolio-capital");
    expect(panel).toContain("data-hq-financial-freshness");
    const migration = join(process.cwd(), "supabase/migrations/20260909040000_askreview_product_v1.sql");
    expect(readFileSync(migration, "utf8")).toContain("askreview");
  });
});
