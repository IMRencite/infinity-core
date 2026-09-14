import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HqFinancialTruthStrip } from "@/components/dashboard/operator-console/hq-financial-truth-strip";
import { applyFounderMercuryDeposit, computePortfolioCapitalPosition } from "../capital-position";
import { computePortfolioCashPosition, emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { classifyMercuryTransaction } from "../classify";
import { modeledDoesNotChangeCash, projectModeledEconomics } from "../economics";
import { evaluateFounderCapitalPolicyFinancialTruthGate, evaluateHQLiveFinancialRefreshGate } from "../gates";
import { infinityAttributedPayouts } from "../stripe-attribution";
import { applyHqCanonicalLiveState } from "@/lib/infinity/operator-console/hq-poll-generation";
import { projectHqFinancialTruth, unknownCostMustNotDisplayZero } from "../project";
import { matchPayoutToMercury, reconcileStripeMercury, settlementIsNotRevenue } from "../reconciliation";
import { shouldRefreshMercury, shouldRefreshStripe } from "../live-cadence";
import { mapMercuryConnection } from "../mercury-connection";
import { matchPayoutDestination } from "../payout-destination";
import { deniedBankCapabilities } from "../adapters/account-provider";
import { isInfinityAttributedStripeTxn } from "../stripe-attribution";
import type { FinancialTruthSnapshot, MercuryCashSnapshot, StripeCashSnapshot } from "../types";
import { SETTLEMENT_WINDOW_MS } from "../types";

function mercury(overrides: Partial<MercuryCashSnapshot> = {}): MercuryCashSnapshot {
  return {
    ...emptyMercurySnapshot("LIVE"),
    connection: "LIVE",
    operating_account_verified: true,
    current: 50,
    available: 50,
    last_verified: "2026-09-13T00:00:00.000Z",
    freshness: "FRESH",
    safe_account_reference: "mercury ****1234",
    ...overrides,
  };
}

function stripe(overrides: Partial<StripeCashSnapshot> = {}): StripeCashSnapshot {
  return {
    ...emptyStripeSnapshot("LIVE"),
    connection: "LIVE",
    available: 0,
    pending: 0,
    last_verified: "2026-09-13T00:00:00.000Z",
    freshness: "FRESH",
    ...overrides,
  };
}

function snapshot(input: {
  mercury?: MercuryCashSnapshot;
  stripe?: StripeCashSnapshot;
  gross?: number;
  refunds?: number;
  fees?: number | null;
  known?: number | null;
  unknown?: string[];
  contribution?: number | null;
  modeledRevenue?: number | null;
}): FinancialTruthSnapshot {
  const actualUnknown = input.unknown ?? ["INFRASTRUCTURE", "PROVIDER_API", "GROWTH", "FULFILLMENT", "DOMAIN", "SOFTWARE", "SHARED_OVERHEAD"];
  return {
    mercury: input.mercury ?? mercury(),
    stripe: input.stripe ?? stripe(),
    actual: {
      layer: "ACTUAL",
      gross_revenue: input.gross ?? 0,
      refunds: input.refunds ?? 0,
      processor_fees: input.fees ?? 0,
      net_revenue: (input.gross ?? 0) - (input.refunds ?? 0),
      known_costs: input.known ?? null,
      unknown_cost_categories: actualUnknown,
      contribution: input.contribution ?? null,
      current_month_gross_revenue: input.gross ?? 0,
    },
    modeled: projectModeledEconomics({ modeled_revenue: input.modeledRevenue ?? null }),
    committed_capital: 0,
    spent_capital: 0,
    current_month_known_burn: 0,
    unknown_cost_state: actualUnknown.length ? "UNKNOWN" : "KNOWN",
    lineages: [],
    anomalies: [],
    registry: [],
    captured_at: "2026-09-13T00:00:00.000Z",
  };
}

describe("Mercury + Stripe financial truth v1", () => {
  it("A: Mercury $50, Stripe available $0, pending $0 → verified liquid cash $50", () => {
    const cash = computePortfolioCashPosition({ mercury: mercury(), stripe: stripe({ available: 0, pending: 0 }) });
    expect(cash.verified_liquid_cash).toBe(50);
    expect(cash.stripe_pending).toBe(0);
  });

  it("B: Mercury $50, Stripe available $100, pending $25 → liquid $150, pending $25", () => {
    const cash = computePortfolioCashPosition({
      mercury: mercury(),
      stripe: stripe({ available: 100, pending: 25 }),
    });
    expect(cash.verified_liquid_cash).toBe(150);
    expect(cash.stripe_pending).toBe(25);
  });

  it("C: Stripe payout landing in Mercury is settlement, not new revenue", () => {
    const before = snapshot({
      mercury: mercury({ available: 50, current: 50 }),
      stripe: stripe({ available: 100, pending: 0 }),
      gross: 290,
    });
    const after = snapshot({
      mercury: mercury({
        available: 150,
        current: 150,
        transactions: [
          classifyMercuryTransaction({
            safe_transaction_id: "txn_stripe",
            account_id: "acct",
            amount: 100,
            description: "Stripe payout",
            occurred_at: "2026-09-13T00:00:00.000Z",
          }),
        ],
      }),
      stripe: stripe({
        available: 0,
        pending: 0,
        payouts: [
          {
            safe_id: "po_1",
            amount: 100,
            currency: "USD",
            status: "paid",
            arrival_at: "2026-09-13T00:00:00.000Z",
            created_at: "2026-09-13T00:00:00.000Z",
            destination_safe_ref: "stripe_dest ****1234",
          },
        ],
      }),
      gross: 290,
    });
    const recon = reconcileStripeMercury({
      payouts: after.stripe.payouts,
      mercuryTxns: after.mercury.transactions,
      mercuryConnected: true,
      ledgerGross: after.actual.gross_revenue,
      stripeChargeGross: 290,
    });
    expect(after.actual.gross_revenue).toBe(before.actual.gross_revenue);
    expect(recon.lineages[0]?.is_revenue).toBe(false);
    expect(settlementIsNotRevenue(recon.lineages[0]!)).toBe(true);
    expect(computePortfolioCashPosition({ mercury: after.mercury, stripe: after.stripe }).verified_liquid_cash).toBe(150);
  });

  it("D: historical Stripe revenue with Stripe available $0 is not liquid cash", () => {
    const view = projectHqFinancialTruth(
      snapshot({
        mercury: mercury({ available: 50, current: 50 }),
        stripe: stripe({ available: 0, pending: 0 }),
        gross: 1490,
      }),
    );
    expect(view.actual.gross_revenue).toBe(1490);
    expect(view.cash.verified_liquid_cash).toBe(50);
    expect(view.cash.verified_liquid_cash).not.toBe(1490);
  });

  it("E: Mercury unavailable → UNKNOWN cash and PARTIAL/UNKNOWN completeness", () => {
    const cash = computePortfolioCashPosition({
      mercury: emptyMercurySnapshot("CREDENTIALS_REQUIRED"),
      stripe: stripe({ available: 100, pending: 25 }),
    });
    expect(cash.mercury_current).toBeNull();
    expect(cash.verified_liquid_cash).toBeNull();
    expect(cash.cash_completeness).toBe("PARTIAL");
    expect(cash.unverified_accounts).toBeGreaterThanOrEqual(1);
    expect(projectHqFinancialTruth(snapshot({ mercury: emptyMercurySnapshot("CREDENTIALS_REQUIRED") })).mercury.connection).toBe(
      "CREDENTIALS_REQUIRED",
    );
  });

  it("F: unknown infrastructure cost stays UNKNOWN, not $0", () => {
    const view = projectHqFinancialTruth(snapshot({ known: null, unknown: ["INFRASTRUCTURE"], contribution: null }));
    expect(view.actual.unknown_cost_categories).toContain("INFRASTRUCTURE");
    expect(view.actual.contribution).toBeNull();
    expect(view.metrics.find((row) => row.id === "actual_contribution")?.display).toBe("UNKNOWN");
    expect(unknownCostMustNotDisplayZero(view)).toBe(true);
  });

  it("G: modeled revenue $5,000 does not change cash", () => {
    const cash = computePortfolioCashPosition({ mercury: mercury(), stripe: stripe({ available: 0 }) });
    expect(modeledDoesNotChangeCash(5000, cash.verified_liquid_cash, cash.verified_liquid_cash)).toBe(true);
    const view = projectHqFinancialTruth(snapshot({ modeledRevenue: 5000 }));
    expect(view.modeled.modeled_revenue).toBe(5000);
    expect(view.cash.verified_liquid_cash).toBe(50);
    expect(view.modeled.separated_from_actual).toBe(true);
  });

  it("H: founder Mercury deposit updates cash, not spend authority", () => {
    const moved = applyFounderMercuryDeposit({
      previousMercuryAvailable: 50,
      deposit: 500,
      previousAuthorized: "NOT_SET",
    });
    expect(moved.mercury_available).toBe(550);
    expect(moved.authorized_capital).toBe("NOT_SET");
    const cash = computePortfolioCashPosition({
      mercury: mercury({ available: 550, current: 550 }),
      stripe: stripe({ available: 0 }),
    });
    const capital = computePortfolioCapitalPosition({
      cash,
      committed_capital: 0,
      spent_capital: 0,
      current_month_known_burn: 0,
      unknown_cost_state: "UNKNOWN",
      applyCanonicalPolicy: false,
    });
    expect(capital.authorized_capital).toBe("NOT_SET");
    expect(capital.founder_deposits_auto_increase_spend_authority).toBe(false);
  });

  it("I: Stripe payout missing Mercury settlement is PENDING inside the window", () => {
    const now = Date.parse("2026-09-13T00:00:00.000Z");
    const lineage = matchPayoutToMercury(
      {
        safe_id: "po_missing",
        amount: 100,
        currency: "USD",
        status: "paid",
        arrival_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        destination_safe_ref: null,
      },
      [],
      now,
    );
    expect(lineage.status).toBe("PENDING_SETTLEMENT");
    const late = matchPayoutToMercury(
      {
        safe_id: "po_late",
        amount: 100,
        currency: "USD",
        status: "paid",
        arrival_at: new Date(now - SETTLEMENT_WINDOW_MS - 1000).toISOString(),
        created_at: new Date(now - SETTLEMENT_WINDOW_MS - 1000).toISOString(),
        destination_safe_ref: null,
      },
      [],
      now,
    );
    expect(late.status).toBe("UNRECONCILED");
  });

  it("J: duplicate Stripe settlement is an anomaly", () => {
    const txn = classifyMercuryTransaction({
      safe_transaction_id: "txn_dup",
      account_id: "acct",
      amount: 100,
      description: "STRIPE PAYOUT",
    });
    const recon = reconcileStripeMercury({
      payouts: [
        {
          safe_id: "po_1",
          amount: 100,
          currency: "USD",
          status: "paid",
          arrival_at: "2026-09-13T00:00:00.000Z",
          created_at: "2026-09-13T00:00:00.000Z",
          destination_safe_ref: null,
        },
        {
          safe_id: "po_2",
          amount: 100,
          currency: "USD",
          status: "paid",
          arrival_at: "2026-09-13T00:00:00.000Z",
          created_at: "2026-09-13T00:00:00.000Z",
          destination_safe_ref: null,
        },
      ],
      mercuryTxns: [txn],
      mercuryConnected: true,
      ledgerGross: 100,
      stripeChargeGross: 100,
    });
    expect(recon.duplicate_settlements).toBe(1);
    expect(recon.anomalies.some((row) => row.code === "DUPLICATE_SETTLEMENT_COUNTING")).toBe(true);
  });

  it("does not count unrelated Stripe account history as Infinity revenue", () => {
    expect(
      isInfinityAttributedStripeTxn({
        safe_id: "txn_x",
        type: "charge",
        reporting_category: "charge",
        amount: 99.97,
        fee: 3.2,
        net: 96.77,
        currency: "USD",
        created_at: "2026-02-20T00:00:00.000Z",
        source: "ch_x",
        payout_id: null,
        description: "Sell More Live More Sales Training - Order 2475",
      }),
    ).toBe(false);
    expect(
      isInfinityAttributedStripeTxn({
        safe_id: "txn_occ",
        type: "charge",
        reporting_category: "charge",
        amount: 290,
        fee: 8.7,
        net: 281.3,
        currency: "USD",
        created_at: "2026-09-13T00:00:00.000Z",
        source: "ch_occ",
        payout_id: null,
        description: "OccupancyNPV Professional infinity_offer=PROFESSIONAL",
      }),
    ).toBe(true);
  });

  it("does not treat founder $50 estimate as verified and keeps bank access read-only", () => {
    const view = projectHqFinancialTruth(snapshot({ mercury: emptyMercurySnapshot("CREDENTIALS_REQUIRED") }));
    expect(view.mercury.founder_estimate_treated_as_verified).toBe(false);
    expect(view.founder_estimate_used).toBe(false);
    expect(view.read_only_bank_access).toBe(true);
    expect(deniedBankCapabilities()).toEqual(
      expect.arrayContaining(["ACH_SEND", "WIRE_SEND", "INTERNAL_TRANSFER", "CARD_ISSUANCE", "CARD_SPENDING"]),
    );
    expect(mapMercuryConnection({ enabled: false, tokenConfigured: false })).toBe("CREDENTIALS_REQUIRED");
  });

  it("maps payout destination by safe Mercury evidence only", () => {
    expect(matchPayoutDestination({ bankName: "Mercury", last4: "1234" })).toBe("MERCURY_VERIFIED");
    expect(matchPayoutDestination({ bankName: "Chase", last4: "9999" })).toBe("OTHER_VERIFIED");
    expect(matchPayoutDestination({})).toBe("UNKNOWN");
  });

  it("does not query Mercury or Stripe on ordinary HQ poll cadence", () => {
    expect(shouldRefreshMercury({ lastVerified: "2026-09-13T00:00:00.000Z", reason: "poll" })).toBe(false);
    expect(shouldRefreshMercury({ lastVerified: "2026-09-13T00:00:00.000Z", reason: "event", connection: "LIVE" })).toBe(true);
    expect(shouldRefreshStripe({ lastVerified: "2026-09-13T00:00:00.000Z", reason: "poll" })).toBe(false);
    expect(shouldRefreshMercury({ lastVerified: null, reason: "catch-up" })).toBe(true);
    expect(
      shouldRefreshMercury({
        lastVerified: "2026-09-13T00:00:00.000Z",
        reason: "catch-up",
        connection: "CREDENTIALS_REQUIRED",
      }),
    ).toBe(true);
    expect(
      shouldRefreshMercury({
        lastVerified: "2026-09-13T00:00:00.000Z",
        reason: "catch-up",
        connection: "LIVE",
        nowMs: Date.parse("2026-09-13T00:05:00.000Z"),
      }),
    ).toBe(false);
  });

  it("returns NO_SETTLEMENT_HISTORY when there are no Infinity-attributed payouts", () => {
    const recon = reconcileStripeMercury({
      payouts: infinityAttributedPayouts(
        [
          {
            safe_id: "po_hist",
            amount: 96.77,
            currency: "USD",
            status: "paid",
            arrival_at: "2026-02-24T00:00:00.000Z",
            created_at: "2026-02-24T00:00:00.000Z",
            destination_safe_ref: null,
          },
        ],
        [
          {
            safe_id: "txn_hist",
            type: "payout",
            reporting_category: "payout",
            amount: -96.77,
            fee: 0,
            net: -96.77,
            currency: "USD",
            created_at: "2026-02-24T00:00:00.000Z",
            source: "po_hist",
            payout_id: "po_hist",
            description: "Sell More Live More Sales Training",
          },
        ],
      ),
      mercuryTxns: [],
      mercuryConnected: true,
      ledgerGross: 0,
      stripeChargeGross: 0,
    });
    expect(recon.stripe_payout_to_mercury).toBe("NO_SETTLEMENT_HISTORY");
  });

  it("HQLiveFinancialRefreshGate fails until Mercury is live", () => {
    const live = projectHqFinancialTruth(snapshot({}));
    expect(live.gates.hq_live_financial_refresh.gate).toBe("HQLiveFinancialRefreshGate");
    expect(live.gates.hq_live_financial_refresh.result).toBe("PASS");
    expect(
      projectHqFinancialTruth(snapshot({ mercury: emptyMercurySnapshot("CREDENTIALS_REQUIRED") })).gates
        .hq_live_financial_refresh.result,
    ).toBe("FAIL");
    expect(
      evaluateHQLiveFinancialRefreshGate({
        mercuryConnection: "LIVE",
        financialTruthProjected: true,
        mercuryMetricVisible: true,
        liquidMetricVisible: true,
        stripeAvailableVisible: true,
        stripePendingVisible: true,
        freshnessVisible: true,
        liveStateAttachesFinancialTruth: true,
        pollRefreshesProviders: false,
        catchUpRefreshesWhenUnverified: true,
        mercuryValueLive: true,
        verifiedLiquidRecalculated: true,
      }).result,
    ).toBe("PASS");
  });

  it("projects HQ financial layers and updates without treating modeled as cash", () => {
    const view = projectHqFinancialTruth(snapshot({ stripe: stripe({ available: 80, pending: 20 }), modeledRevenue: 5000 }));
    const html = renderToStaticMarkup(createElement(HqFinancialTruthStrip, { view }));
    expect(html).toContain("data-hq-financial-truth");
    expect(html).toContain("data-hq-financial-metric=\"verified_liquid_cash\"");
    expect(html).toContain("data-hq-financial-metric=\"mercury_cash\"");
    expect(html).toContain("data-hq-financial-metric=\"stripe_available\"");
    expect(html).toContain("data-hq-financial-metric=\"stripe_pending\"");
    expect(html).toContain("data-hq-financial-layer-group=\"PARENT\"");
    expect(html).toContain("data-hq-financial-layer-group=\"VENTURE\"");
    expect(html).toContain("data-hq-financial-layer-group=\"ACTUAL\"");
    expect(html).toContain("data-hq-financial-layer-group=\"MODELED\"");
    expect(html).toContain("data-hq-financial-layer-group=\"CAPITAL\"");
    expect(html).toContain("Source");
    expect(view.layers_separated).toBe(true);
    expect(view.capital.configured_portfolio_cap).toBe(50);
    expect(view.capital.authorized_capital).toBe(50);
    expect(evaluateFounderCapitalPolicyFinancialTruthGate(view).result).toBe("PASS");
    expect(
      evaluateFounderCapitalPolicyFinancialTruthGate(
        projectHqFinancialTruth(snapshot({ mercury: emptyMercurySnapshot("CREDENTIALS_REQUIRED") })),
      ).result,
    ).toBe("FAIL");
    const overlay = applyHqCanonicalLiveState(
      {
        departments: [],
        currentActivity: { active: false },
        workerNodes: [],
        financialTruth: undefined,
      } as never,
      {
        commandActivity: {
          nowInspecting: {},
          latestCompleted: null,
          rooms: {},
          counts: { activeMissions: 0 },
        } as never,
        generatedAt: "2026-09-13T01:00:00.000Z",
        financialTruth: view,
      },
    );
    expect(overlay.financialTruth?.cash.verified_liquid_cash).toBe(130);
  });
});
