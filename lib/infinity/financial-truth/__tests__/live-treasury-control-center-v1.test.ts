import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TreasuryControlCenter } from "@/components/dashboard/operator-console/treasury-control-center";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { projectModeledEconomics } from "../economics";
import { resetCapitalLedger } from "../capital-ledger";
import { projectHqFinancialTruth } from "../project";
import { overlayCanonicalTreasuryOnHqReadModel } from "../treasury-overlay";
import {
  mutatePortfolioBudgetPolicy,
  mutateVentureCapitalAllocation,
  recordManualAccountingEvent,
} from "../treasury-mutations";
import { evaluateTreasuryControlGates } from "../treasury-gates";
import { evaluateFinancialDataFreshnessGate } from "../freshness";
import { MercuryTreasuryMutationAdapter } from "../adapters/mercury-mutation";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
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

describe("Live Treasury Control Center v1", () => {
  it("1-6: Treasury projects the same $50 live truth as HQ", () => {
    const view = projectHqFinancialTruth(snapshot());
    const treasury = view.treasury_control;
    expect(treasury.mercury_available.value).toBe(50);
    expect(treasury.verified_treasury_cash.value).toBe(50);
    expect(view.cash.verified_liquid_cash).toBe(treasury.verified_treasury_cash.value);
    expect(treasury.authorized_capital.value).toBe(50);
    expect(view.capital.authorized_capital).toBe(treasury.authorized_capital.value);
    expect(treasury.allocated_capital.value).toBe(0);
    expect(treasury.unallocated_authorized_capital.value).toBe(50);
    expect(treasury.committed_capital.value).toBe(0);
    expect(treasury.actual_spend.value).toBe(0);
    expect(treasury.monthly_burn_cap.display).toBe("NOT_SET");
    expect(evaluateTreasuryControlGates(view, treasury).hq_treasury_consistency.result).toBe("PASS");
  });

  it("6-8: stale UNKNOWN bank state and $500 monthly policy are not active", () => {
    const view = projectHqFinancialTruth(snapshot());
    const model = overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), view.treasury_control);
    expect(model.cards.totalCash.display).toBe("$50");
    expect(model.cards.availableCapital.display).not.toBe("UNKNOWN");
    expect(model.cards.internalCapital.display).not.toBe("UNKNOWN");
    expect(model.cards.monthlyBudget.display).toBe("NOT_SET");
    expect(model.cards.monthlyBudget.display).not.toContain("500");
    expect(view.treasury_control.legacy_monthly_policy_active).toBe(false);
    expect(view.treasury_control.manual_ledger_is_bank_cash_source).toBe(false);
    expect(
      mutatePortfolioBudgetPolicy({
        actor: "founder",
        authorizedActor: true,
        ceiling: 51,
      }).ok,
    ).toBe(false);
  });

  it("9-11: allocation selector uses OccupancyNPV and AskReview identities", () => {
    const view = projectHqFinancialTruth(snapshot());
    const names = view.treasury_control.ventures.map((row) => row.display_name);
    expect(names).toContain("OccupancyNPV");
    expect(names).toContain("AskReview");
    expect(names.some((name) => /unnamed venture/i.test(name))).toBe(false);
    expect(view.treasury_control.ventures.find((row) => row.venture_id === CRE_VENTURE_ID)?.display_name).toBe("OccupancyNPV");
    const ask = view.treasury_control.ventures.find((row) => row.venture_id === ASKREVIEW_VENTURE_ID);
    expect(ask?.display_name).toBe("AskReview");
    expect(ask?.lifecycle_state).toBe("SELECTION_UNDER_REVIEW");
    expect(ask?.production_state).toBe("PRODUCTION PAUSED");
    expect(evaluateTreasuryControlGates(view, view.treasury_control).venture_allocation_identity.result).toBe("PASS");
  });

  it("12-17: founder budget and allocation persist without collapsing layers", () => {
    const budget = mutatePortfolioBudgetPolicy({
      actor: "founder",
      authorizedActor: true,
      monthlyBurnCap: 40,
      paidAcquisitionBudget: 0,
    });
    expect(budget.ok).toBe(true);
    const afterBudget = projectHqFinancialTruth(snapshot());
    expect(afterBudget.capital.monthly_burn_cap).toBe(40);
    expect(afterBudget.treasury_control.monthly_burn_cap.value).toBe(40);

    const over = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 51,
      purpose: "too much",
      idempotencyKey: "over",
    });
    expect(over.ok).toBe(false);

    const allocated = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 20,
      purpose: "OccupancyNPV operating reserve",
      source: "FOUNDER_DIRECT_ALLOCATION",
      idempotencyKey: "alloc-20",
    });
    expect(allocated.ok).toBe(true);
    const afterAlloc = projectHqFinancialTruth(snapshot());
    expect(afterAlloc.capital.allocated_capital).toBe(20);
    expect(afterAlloc.capital.spent_capital).toBe(0);
    expect(afterAlloc.treasury_control.allocated_capital.value).not.toBe(afterAlloc.treasury_control.actual_spend.value === 20 ? 20 : afterAlloc.capital.spent_capital);
    expect(afterAlloc.treasury_control.actual_spend.value).toBe(0);
    expect(afterAlloc.treasury_control.verified_treasury_cash.value).toBe(50);
    expect(afterAlloc.capital.authorized_capital).toBe(50);
    expect(afterAlloc.treasury_control.allocations.find((row) => row.venture_id === CRE_VENTURE_ID)?.allocation_source).toBe(
      "FOUNDER_DIRECT_ALLOCATION",
    );
    expect(evaluateTreasuryControlGates(afterAlloc, afterAlloc.treasury_control).allocation_vs_spend_separation.result).toBe("PASS");

    const reserved = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: ASKREVIEW_VENTURE_ID,
      amountUsd: 10,
      purpose: "reserved only",
      idempotencyKey: "ask-10",
    });
    expect(reserved.ok).toBe(true);
    const afterAsk = projectHqFinancialTruth(snapshot());
    const ask = afterAsk.treasury_control.allocations.find((row) => row.venture_id === ASKREVIEW_VENTURE_ID);
    expect(ask?.status).toBe("RESERVED");
    expect(ask?.lifecycle_state).toBe("SELECTION_UNDER_REVIEW");
  });

  it("18-20: manual funding does not fabricate Mercury cash; transactions and empty commitments are explicit", () => {
    const before = projectHqFinancialTruth(snapshot());
    const recorded = recordManualAccountingEvent({
      actor: "founder",
      authorizedActor: true,
      amountUsd: 500,
      source: "founder_contribution",
      memo: "does not create bank cash",
      idempotencyKey: "manual-1",
    });
    expect(recorded.ok).toBe(true);
    const after = projectHqFinancialTruth(snapshot());
    expect(after.cash.mercury_available).toBe(50);
    expect(after.treasury_control.verified_treasury_cash.value).toBe(before.cash.verified_liquid_cash);
    expect(after.treasury_control.verified_treasury_cash.value).toBe(50);
    expect(after.treasury_control.accounting_events[0]?.kind).toBe("MANUAL_ACCOUNTING_EVENT");
    expect(after.treasury_control.accounting_events[0]?.increases_verified_bank_cash).toBe(false);
    expect(after.treasury_control.transactions.length).toBeGreaterThan(0);
    expect(after.treasury_control.transactions[0]?.classification).toBe("FOUNDER_FUNDING");
    expect(after.treasury_control.commitments).toEqual([]);
    const model = overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), after.treasury_control);
    expect(model.transactions[0]?.provider).toBe("Mercury");
    expect(model.commitments).toEqual([]);
  });

  it("21-24: live version includes ledger, Mercury stays read-only, and the UI is a control center", () => {
    mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 5,
      purpose: "live update",
      idempotencyKey: "live-5",
    });
    const before = projectHqFinancialTruth(snapshot());
    const afterBudget = mutatePortfolioBudgetPolicy({
      actor: "founder",
      authorizedActor: true,
      monthlyBurnCap: 25,
    });
    expect(afterBudget.ok).toBe(true);
    const after = projectHqFinancialTruth(snapshot());
    expect(after.version).not.toBe(before.version);
    expect(after.version.split(":").length).toBeGreaterThanOrEqual(6);
    expect(after.treasury_control.monthly_burn_cap.value).toBe(25);
    expect(after.capital.monthly_burn_cap).toBe(25);
    expect(after.read_only_bank_access).toBe(true);
    expect(after.treasury_control.mercury_write_access).toBe(false);
    expect(after.treasury_control.money_movement_enabled).toBe(false);
    expect(after.treasury_control.execute_approved_payment_enabled).toBe(false);
    expect(new MercuryTreasuryMutationAdapter().status).toBe("NOT_ACTIVE");
    expect(evaluateTreasuryControlGates(after, after.treasury_control).treasury_live_update.result).toBe("PASS");
    expect(evaluateTreasuryControlGates(after, after.treasury_control).treasury_bank_cash_truth.result).toBe("PASS");
    expect(evaluateTreasuryControlGates(after, after.treasury_control).canonical_treasury_projection.result).toBe("PASS");
    expect(evaluateFinancialDataFreshnessGate({ mercury: "FRESH", stripe: "FRESH", ledger: "FRESH" }).gate).toBe(
      "FinancialDataFreshnessGate",
    );

    const html = renderToStaticMarkup(
      createElement(TreasuryControlCenter, {
        model: overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), after.treasury_control),
        financialTruth: after,
        ventureOptions: [],
        onModelChange: () => undefined,
      }),
    );
    expect(html).toContain("Live Treasury");
    expect(html).toContain("Mercury");
    expect(html).toContain("OccupancyNPV");
    expect(html).toContain("AskReview");
    expect(html).not.toContain("INTERNAL / MANUAL / NON-BANK");
    expect(html).not.toContain("Unnamed Venture");
    expect(html).toContain("$50");
    expect(html).toContain("READ ONLY");
    expect(html).toContain("Execute approved payment");
    expect(html).toContain("disabled");
    expect(html).not.toContain("setInterval");
  });

  it("UI source uses live HQ financial truth and does not poll Mercury", () => {
    const center = readFileSync(join(process.cwd(), "components/dashboard/operator-console/treasury-control-center.tsx"), "utf8");
    const consoleUi = readFileSync(join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"), "utf8");
    const api = readFileSync(join(process.cwd(), "app/api/operator-console/treasury/route.ts"), "utf8");
    expect(center).toContain("financialTruth");
    expect(center).toContain("FOUNDER_DIRECT_ALLOCATION");
    expect(center).toContain("OccupancyNPV");
    expect(center).toContain("AskReview");
    expect(center).not.toContain("setInterval");
    expect(center).not.toContain("INTERNAL / MANUAL / NON-BANK");
    expect(consoleUi).toContain("overlayCanonicalTreasuryOnHqReadModel");
    expect(consoleUi).toContain("attachFinancialTruthToSnapshot");
    expect(api).toContain("mutateVentureCapitalAllocation");
    expect(api).toContain("mutatePortfolioBudgetPolicy");
    expect(api).toContain("recordManualAccountingEvent");
    expect(api).not.toContain("recordManualFunding");
    expect(api).not.toContain("ACH");
    expect(api).not.toContain("wire");
  });
});
