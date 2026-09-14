import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HqFinancialTruthStrip } from "@/components/dashboard/operator-console/hq-financial-truth-strip";
import { deniedBankCapabilities } from "../adapters/account-provider";
import { MercuryTreasuryMutationAdapter } from "../adapters/mercury-mutation";
import { applyFounderMercuryDeposit, computePortfolioCapitalPosition } from "../capital-position";
import { computePortfolioCashPosition, emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import {
  CANONICAL_FOUNDER_CAPITAL_POLICY,
  DEFAULT_PAID_ADVERTISING_BUDGET_USD,
  EAG_TREASURY_EXECUTION_REQUIREMENTS,
  futureDepositDoesNotIncreaseAuthorization,
  revenueDoesNotIncreaseAuthorization,
} from "../founder-capital-policy";
import { evaluateFounderCapitalPolicyFinancialTruthGate, evaluatePortfolioCapitalAllocationGate } from "../gates";
import { projectHqFinancialTruth } from "../project";
import { applyVentureRevenue, tryAllocateVentureCapital, unallocatedVentureCapital } from "../venture-allocation";
import { projectModeledEconomics } from "../economics";
import type { FinancialTruthSnapshot, MercuryCashSnapshot, StripeCashSnapshot } from "../types";

function mercury(overrides: Partial<MercuryCashSnapshot> = {}): MercuryCashSnapshot {
  return {
    ...emptyMercurySnapshot("LIVE"),
    connection: "LIVE",
    operating_account_verified: true,
    current: 50,
    available: 50,
    last_verified: "2026-09-13T04:53:35.272Z",
    freshness: "FRESH",
    safe_account_reference: "mercury ****0351",
    ...overrides,
  };
}

function stripe(overrides: Partial<StripeCashSnapshot> = {}): StripeCashSnapshot {
  return {
    ...emptyStripeSnapshot("LIVE"),
    connection: "LIVE",
    available: 0,
    pending: 0,
    last_verified: "2026-09-13T04:53:35.822Z",
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
    captured_at: "2026-09-13T05:55:00.000Z",
  };
}

describe("Founder capital policy configuration v1", () => {
  it("1-6: $50 Mercury cash is authorized, unallocated, and unspent", () => {
    const cash = computePortfolioCashPosition({ mercury: mercury(), stripe: stripe() });
    const capital = computePortfolioCapitalPosition({
      cash,
      committed_capital: 0,
      spent_capital: 0,
      current_month_known_burn: 0,
      unknown_cost_state: "UNKNOWN",
    });
    expect(cash.mercury_available).toBe(50);
    expect(CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital).toBe(50);
    expect(capital.authorized_capital).toBe(50);
    expect(capital.remaining_authorized_capital).toBe(50);
    expect(capital.allocated_capital).toBe(0);
    expect(capital.spent_capital).toBe(0);
    expect(capital.unallocated_authorized_capital).toBe(50);
    expect(capital.policy_status).toBe("ACTIVE");
    expect(capital.authorization_source).toBe("FOUNDER_EXPLICIT_AUTHORIZATION");
  });

  it("7: a later Mercury deposit does not increase authorization", () => {
    const after = applyFounderMercuryDeposit({
      previousMercuryAvailable: 50,
      deposit: 450,
      previousAuthorized: 50,
    });
    expect(after.mercury_available).toBe(500);
    expect(after.authorized_capital).toBe(50);
    expect(futureDepositDoesNotIncreaseAuthorization({ previousAuthorized: 50, mercuryAfterDeposit: 500 })).toEqual({
      authorized_capital: 50,
      mercury_available: 500,
    });
  });

  it("8: venture revenue does not increase authorization", () => {
    const moved = applyVentureRevenue({ previousGross: 0, revenue: 149, previousAuthorized: 50 });
    expect(moved.gross_revenue).toBe(149);
    expect(moved.authorized_capital).toBe(50);
    expect(revenueDoesNotIncreaseAuthorization({ previousAuthorized: 50, revenue: 149 }).authorized_capital).toBe(50);
  });

  it("9/10: portfolio cannot allocate more than $50 and allocation is not spend", () => {
    expect(
      tryAllocateVentureCapital({
        requested_amount: 51,
        portfolio_authorized: 50,
        current_allocations: 0,
        current_commitments: 0,
      }).ok,
    ).toBe(false);
    expect(
      tryAllocateVentureCapital({
        requested_amount: 50,
        portfolio_authorized: 50,
        current_allocations: 0,
        current_commitments: 0,
      }),
    ).toEqual({ ok: true, remaining: 0 });
    expect(evaluatePortfolioCapitalAllocationGate({ authorized: 50, allocated: 0, committed: 0 }).result).toBe("PASS");
    expect(evaluatePortfolioCapitalAllocationGate({ authorized: 50, allocated: 40, committed: 20 }).result).toBe("FAIL");
    const occupancy = unallocatedVentureCapital("occupancynpv");
    expect(occupancy.allocated_amount).toBe(0);
    expect(occupancy.spent_amount).toBe(0);
    expect(occupancy.allocation_status).toBe("NOT_ALLOCATED");
    expect(occupancy.allocated_amount).not.toBe(occupancy.spent_amount === 0 ? 50 : occupancy.spent_amount);
  });

  it("11-13: authorization does not enable bank mutation, ads, or a burn cap", () => {
    expect(CANONICAL_FOUNDER_CAPITAL_POLICY.money_movement_enabled).toBe(false);
    expect(CANONICAL_FOUNDER_CAPITAL_POLICY.mercury_write_access).toBe(false);
    expect(CANONICAL_FOUNDER_CAPITAL_POLICY.paid_advertising_budget).toBe(DEFAULT_PAID_ADVERTISING_BUDGET_USD);
    expect(CANONICAL_FOUNDER_CAPITAL_POLICY.monthly_burn_cap).toBe("NOT_SET");
    expect(deniedBankCapabilities()).toEqual(
      expect.arrayContaining(["ACH_SEND", "WIRE_SEND", "INTERNAL_TRANSFER", "CARD_ISSUANCE"]),
    );
    expect(new MercuryTreasuryMutationAdapter().status).toBe("NOT_ACTIVE");
    expect(EAG_TREASURY_EXECUTION_REQUIREMENTS).toEqual(
      expect.arrayContaining(["PORTFOLIO_AUTHORIZATION_EXISTS", "VENTURE_ALLOCATION_EXISTS", "IDEMPOTENCY"]),
    );
  });

  it("14/15: HQ shows $50 cash and $50 authorized separately, and the truth gate passes", () => {
    const view = projectHqFinancialTruth(snapshot());
    const html = renderToStaticMarkup(createElement(HqFinancialTruthStrip, { view }));
    expect(view.cash.verified_liquid_cash).toBe(50);
    expect(view.capital.authorized_capital).toBe(50);
    expect(view.metrics.find((row) => row.id === "verified_liquid_cash")?.display).toBe("$50");
    expect(view.metrics.find((row) => row.id === "authorized_capital")?.display).toBe("$50");
    expect(view.metrics.find((row) => row.id === "allocated_capital")?.display).toBe("$0");
    expect(view.metrics.find((row) => row.id === "actual_spend")?.display).toBe("$0");
    expect(view.metrics.find((row) => row.id === "remaining_authorized_capital")?.display).toBe("$50");
    expect(view.metrics.find((row) => row.id === "unallocated_authorized_capital")?.display).toBe("$50");
    expect(view.metrics.find((row) => row.id === "monthly_burn_cap")?.display).toBe("NOT_SET");
    expect(html).toContain("Cash is not authorization");
    expect(html).toContain("data-hq-financial-metric=\"authorized_capital\"");
    expect(evaluateFounderCapitalPolicyFinancialTruthGate(view).result).toBe("PASS");
    expect(view.gates.portfolio_capital_allocation.result).toBe("PASS");
    expect(view.allocations.every((row) => row.allocation_status === "NOT_ALLOCATED")).toBe(true);
  });
});
