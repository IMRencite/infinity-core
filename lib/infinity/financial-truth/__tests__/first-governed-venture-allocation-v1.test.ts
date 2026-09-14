import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { TreasuryControlCenter } from "@/components/dashboard/operator-console/treasury-control-center";
import { TreasuryCommitmentsPanel, TreasuryTransactionsPanel } from "@/components/dashboard/operator-console/treasury-capital-strip";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { MercuryTreasuryMutationAdapter } from "../adapters/mercury-mutation";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { resetCapitalLedger } from "../capital-ledger";
import { projectModeledEconomics } from "../economics";
import { evaluateFinancialDataFreshnessGate } from "../freshness";
import { evaluatePortfolioCapitalAllocationGate } from "../gates";
import { projectHqFinancialTruth } from "../project";
import { overlayCanonicalTreasuryOnHqReadModel } from "../treasury-overlay";
import { evaluateTreasuryControlGates } from "../treasury-gates";
import {
  mutatePortfolioBudgetPolicy,
  mutateVentureCapitalAllocation,
} from "../treasury-mutations";
import {
  evaluateVentureCapitalAllocationDecision,
  refreshCanonicalVenturesForAllocation,
} from "../venture-capital-allocation-decision";
import type { FinancialTruthSnapshot, MercuryCashSnapshot, StripeCashSnapshot } from "../types";

function mercury(overrides: Partial<MercuryCashSnapshot> = {}): MercuryCashSnapshot {
  return {
    ...emptyMercurySnapshot("LIVE"),
    connection: "LIVE",
    operating_account_verified: true,
    current: 50,
    available: 50,
    last_verified: "2026-09-13T05:58:23.532Z",
    freshness: "FRESH",
    safe_account_reference: "mercury ****0351",
    transactions: [
      {
        safe_transaction_id: "txn_safe_1",
        account_id: "acct_safe",
        amount: 50,
        currency: "USD",
        classification: "FOUNDER_FUNDING",
        description: "Founder funding",
        merchant: null,
        occurred_at: "2026-09-01T00:00:00.000Z",
        status: "posted",
        stripe_settlement: false,
        evidence: [],
      },
    ],
    ...overrides,
  };
}

function stripe(overrides: Partial<StripeCashSnapshot> = {}): StripeCashSnapshot {
  return {
    ...emptyStripeSnapshot("LIVE"),
    connection: "LIVE",
    available: 0,
    pending: 0,
    last_verified: "2026-09-13T05:58:23.822Z",
    freshness: "FRESH",
    payout_destination: "OTHER_VERIFIED",
    settlement_destination_classification: "KNOWN_EXTERNAL_BANK",
    ...overrides,
  };
}

function snapshot(): FinancialTruthSnapshot {
  return {
    mercury: mercury(),
    stripe: stripe(),
    actual: {
      layer: "ACTUAL",
      gross_revenue: 0,
      refunds: 0,
      processor_fees: 0,
      net_revenue: 0,
      known_costs: null,
      unknown_cost_categories: ["INFRASTRUCTURE"],
      contribution: null,
      current_month_gross_revenue: 0,
    },
    modeled: projectModeledEconomics({ modeled_revenue: null }),
    committed_capital: 0,
    spent_capital: 0,
    current_month_known_burn: 0,
    unknown_cost_state: "UNKNOWN",
    lineages: [],
    anomalies: [],
    registry: [],
    captured_at: "2026-09-13T06:10:00.000Z",
  };
}

afterEach(() => {
  resetCapitalLedger();
});

describe("First governed venture allocation v1", () => {
  it("1-4: Treasury shows Mercury $50, authorized $50, matches HQ, and removes UNKNOWN bank truth", () => {
    const view = projectHqFinancialTruth(snapshot());
    const treasury = view.treasury_control;
    expect(treasury.mercury_available.value).toBe(50);
    expect(treasury.verified_treasury_cash.value).toBe(50);
    expect(treasury.authorized_capital.value).toBe(50);
    expect(view.cash.verified_liquid_cash).toBe(treasury.verified_treasury_cash.value);
    expect(view.capital.authorized_capital).toBe(treasury.authorized_capital.value);
    expect(treasury.allocated_capital.value).toBe(0);
    expect(treasury.unallocated_authorized_capital.value).toBe(50);
    expect(view.capital.allocated_capital).toBe(treasury.allocated_capital.value);
    const model = overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), treasury);
    expect(model.cards.totalCash.display).toBe("$50");
    expect(model.cards.availableCapital.display).not.toBe("UNKNOWN");
    expect(model.treasurySource).toBe("CANONICAL FINANCIAL TRUTH");
    expect(treasury.verified_treasury_cash.source).toBe("MERCURY");
    expect(evaluateTreasuryControlGates(view, treasury).hq_treasury_consistency.result).toBe("PASS");
  });

  it("5: legacy $500 monthly policy cannot exceed current $50 authority", () => {
    expect(
      mutatePortfolioBudgetPolicy({
        actor: "founder",
        authorizedActor: true,
        monthlyBurnCap: 500,
      }).ok,
    ).toBe(false);
    expect(
      mutatePortfolioBudgetPolicy({
        actor: "founder",
        authorizedActor: true,
        ceiling: 51,
      }).ok,
    ).toBe(false);
    const view = projectHqFinancialTruth(snapshot());
    expect(view.treasury_control.legacy_monthly_policy_active).toBe(false);
    expect(view.treasury_control.monthly_burn_cap.display).toBe("NOT_SET");
    expect(evaluateTreasuryControlGates(view, view.treasury_control).budget_within_capital_authority.result).toBe("PASS");
  });

  it("6-8: canonical venture selector names OccupancyNPV and AskReview", () => {
    const view = projectHqFinancialTruth(snapshot());
    const occupancy = view.treasury_control.ventures.find((row) => row.venture_id === CRE_VENTURE_ID);
    const ask = view.treasury_control.ventures.find((row) => row.venture_id === ASKREVIEW_VENTURE_ID);
    expect(occupancy?.display_name).toBe("OccupancyNPV");
    expect(occupancy?.lifecycle_state).toBe("PUBLICLY_LAUNCHED");
    expect(ask?.display_name).toBe("AskReview");
    expect(ask?.lifecycle_state).toBe("SELECTION_UNDER_REVIEW");
    expect(view.treasury_control.ventures.some((row) => /unnamed venture/i.test(row.display_name))).toBe(false);
    expect(evaluateTreasuryControlGates(view, view.treasury_control).venture_allocation_identity.result).toBe("PASS");
  });

  it("9-12: system can allocate $0, can allocate less than $50, cannot exceed $50, and zero-cost actions consume no capital", () => {
    const live = evaluateVentureCapitalAllocationDecision();
    expect(live.allocated_capital).toBe(0);
    expect(live.unallocated_authorized_capital).toBe(50);
    const occupancy = live.ventures.find((row) => row.venture_id === CRE_VENTURE_ID);
    expect(occupancy?.decision).toBe("DEFER");
    expect(occupancy?.amount).toBe(0);
    expect(occupancy?.capital_dependent_next_action).toBeNull();

    const partial = evaluateVentureCapitalAllocationDecision(
      refreshCanonicalVenturesForAllocation({
        occupancyNpv: {
          capital_dependent_next_action: "required provider API",
          requested_amount: 10,
          minimum_viable_amount: 10,
          maximum_useful_amount: 10,
          use_case: "required provider/API cost",
          spend_category: "SOFTWARE_TOOLS",
          expected_outcome: "Keep production checkout live",
          expected_evidence: "Provider invoice + checkout health PASS",
          time_horizon: "7 days",
        },
      }),
    );
    expect(partial.allocated_capital).toBe(10);
    expect(partial.unallocated_authorized_capital).toBe(40);

    expect(evaluatePortfolioCapitalAllocationGate({ authorized: 50, allocated: 0, committed: 0, requested: 51 }).result).toBe(
      "FAIL",
    );
    expect(
      mutateVentureCapitalAllocation({
        actor: "founder",
        authorizedActor: true,
        ventureId: CRE_VENTURE_ID,
        amountUsd: 51,
        purpose: "over",
        idempotencyKey: "over-51",
      }).ok,
    ).toBe(false);

    const insufficient = evaluateVentureCapitalAllocationDecision(
      refreshCanonicalVenturesForAllocation({
        occupancyNpv: {
          capital_dependent_next_action: "undecomposable $100 action",
          requested_amount: 100,
          minimum_viable_amount: 100,
          use_case: "undecomposable infrastructure",
          spend_category: "HOSTING",
          expected_evidence: "uptime",
        },
      }),
    );
    expect(insufficient.ventures[0]?.decision).toBe("DEFER");
    expect(insufficient.ventures[0]?.reason).toContain("DEFER_INSUFFICIENT_CAPITAL");
    expect(insufficient.allocated_capital).toBe(0);
  });

  it("13-16: AskReview paused blocks unjustified allocation; allocation is not commitment or spend; ads stay $0", () => {
    const view = projectHqFinancialTruth(snapshot());
    const ask = view.treasury_control.latest_allocation_decision?.ventures.find((row) => row.venture_id === ASKREVIEW_VENTURE_ID);
    expect(ask?.decision).toBe("NOT_ELIGIBLE");
    expect(ask?.amount).toBe(0);
    expect(ask?.lifecycle_state).toBe("SELECTION_UNDER_REVIEW");
    expect(view.treasury_control.allocated_capital.value).toBe(0);
    expect(view.treasury_control.committed_capital.value).toBe(0);
    expect(view.treasury_control.actual_spend.value).toBe(0);
    expect(view.treasury_control.paid_acquisition_budget.value).toBe(0);
    expect(view.capital.paid_advertising_budget).toBe(0);
    expect(view.treasury_control.latest_allocation_decision?.paid_acquisition_budget).toBe(0);
    expect(evaluateTreasuryControlGates(view, view.treasury_control).allocation_vs_spend_separation.result).toBe("PASS");
  });

  it("17-20: Mercury stays read-only, no bank movement, HQ updates after ledger change, no duplicate poller", () => {
    const before = projectHqFinancialTruth(snapshot());
    expect(before.treasury_control.bank_connection).toBe("READ_ONLY");
    expect(before.treasury_control.mercury_write_access).toBe(false);
    expect(before.treasury_control.money_movement_enabled).toBe(false);
    expect(new MercuryTreasuryMutationAdapter().status).toBe("NOT_ACTIVE");
    expect(before.read_only_bank_access).toBe(true);

    const allocated = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 15,
      purpose: "founder direct after reserve decision",
      source: "FOUNDER_DIRECT_ALLOCATION",
      idempotencyKey: "founder-15",
    });
    expect(allocated.ok).toBe(true);
    const after = projectHqFinancialTruth(snapshot());
    expect(after.version).not.toBe(before.version);
    expect(after.capital.allocated_capital).toBe(15);
    expect(after.treasury_control.allocated_capital.value).toBe(15);
    expect(after.treasury_control.verified_treasury_cash.value).toBe(50);
    expect(after.treasury_control.actual_spend.value).toBe(0);
    expect(evaluateTreasuryControlGates(after, after.treasury_control).treasury_live_update.result).toBe("PASS");
    expect(evaluateTreasuryControlGates(after, after.treasury_control).hq_treasury_consistency.result).toBe("PASS");
  });

  it("21-22: transactions render from Mercury and empty commitments show an explicit empty state", () => {
    const view = projectHqFinancialTruth(snapshot());
    const model = overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), view.treasury_control);
    expect(view.treasury_control.transactions[0]?.classification).toBe("FOUNDER_FUNDING");
    expect(model.transactions[0]?.provider).toBe("Mercury");
    expect(model.commitments).toEqual([]);
    const txnHtml = renderToStaticMarkup(createElement(TreasuryTransactionsPanel, { model, ventureOptions: [] }));
    expect(txnHtml).toContain("Founder funding");
    expect(txnHtml).toContain("Mercury");
    expect(txnHtml).toContain("UNATTRIBUTED");
    expect(txnHtml).not.toContain("Unnamed Venture");
    const commitHtml = renderToStaticMarkup(createElement(TreasuryCommitmentsPanel, { model, ventureOptions: [] }));
    expect(commitHtml).toContain("No active commitments.");
    expect(commitHtml).not.toMatch(/>UNKNOWN</);
  });

  it("persists the first governed $0 reserve decision and all named gates PASS", () => {
    const view = projectHqFinancialTruth(snapshot());
    const decision = view.treasury_control.latest_allocation_decision;
    expect(decision?.allocated_capital).toBe(0);
    expect(decision?.unallocated_authorized_capital).toBe(50);
    expect(decision?.committed_capital).toBe(0);
    expect(decision?.actual_spend).toBe(0);
    expect(decision?.money_moved).toBe(false);
    expect(decision?.mercury_write_access).toBe(false);
    const gates = evaluateTreasuryControlGates(view, view.treasury_control);
    expect(gates.canonical_treasury_projection.result).toBe("PASS");
    expect(gates.hq_treasury_consistency.result).toBe("PASS");
    expect(gates.treasury_bank_cash_truth.result).toBe("PASS");
    expect(gates.founder_budget_policy_mutation.result).toBe("PASS");
    expect(gates.founder_capital_allocation_mutation.result).toBe("PASS");
    expect(gates.budget_within_capital_authority.result).toBe("PASS");
    expect(gates.venture_allocation_identity.result).toBe("PASS");
    expect(gates.venture_capital_eligibility.result).toBe("PASS");
    expect(evaluatePortfolioCapitalAllocationGate({ authorized: 50, allocated: 0, committed: 0 }).result).toBe("PASS");
    expect(gates.capital_use_evidence.result).toBe("PASS");
    expect(gates.capital_efficiency.result).toBe("PASS");
    expect(gates.allocation_vs_spend_separation.result).toBe("PASS");
    expect(gates.portfolio_reserve_integrity.result).toBe("PASS");
    expect(gates.capital_allocation_explainability.result).toBe("PASS");
    expect(gates.treasury_live_update.result).toBe("PASS");
    expect(evaluateFinancialDataFreshnessGate({ mercury: "FRESH", stripe: "FRESH", ledger: "FRESH" }).result).toBe("PASS");
    expect(view.gates.freshness.result).toBe("PASS");

    const html = renderToStaticMarkup(
      createElement(TreasuryControlCenter, {
        model: overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), view.treasury_control),
        financialTruth: view,
        ventureOptions: [],
        onModelChange: () => undefined,
      }),
    );
    expect(html).toContain("Governed allocation decision");
    expect(html).toContain("OccupancyNPV");
    expect(html).toContain("AskReview");
    expect(html).toContain("DEFER");
    expect(html).toContain("NOT_ELIGIBLE");
    expect(html).toContain("READ ONLY");
    expect(html).not.toContain("Unnamed Venture");
  });
});
