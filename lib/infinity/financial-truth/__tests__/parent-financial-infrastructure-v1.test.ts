import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HqFinancialTruthStrip } from "@/components/dashboard/operator-console/hq-financial-truth-strip";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { applyFounderMercuryDeposit } from "../capital-position";
import { computePortfolioCashPosition, emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { evaluateFinancialAccountReconciliationGate } from "../gates";
import { MercuryTreasuryMutationAdapter } from "../adapters/mercury-mutation";
import {
  CURRENT_PARENT_FINANCIAL_INFRASTRUCTURE_MODE,
  PARENT_INFRASTRUCTURE_MODES,
  buildSharedProcessorAccount,
  canonicalFinancialRules,
  forbiddenFinancialRules,
  settlementChangesRevenueAttribution,
  stripeMustSettleToMercury,
} from "../parent-infrastructure";
import {
  attributePaymentToVenture,
  occupancyNpvPaymentLineagePresent,
  requiredPaymentLineageFields,
  settlementDoesNotChangeAttribution,
} from "../payment-lineage";
import { projectHqFinancialTruth } from "../project";
import { classifyMercuryTransaction } from "../classify";
import { reconcileStripeMercury, settlementIsNotRevenue } from "../reconciliation";
import { classifySettlementDestination, hqSettlementDestinationLabel, hqSettlementStatusLabel } from "../settlement-destination";
import { isInfinityAttributedStripeTxn } from "../stripe-attribution";
import { allocationIsNotBalance, allocationIsNotSpendingAuthority, applyVentureRevenue, emptyVentureCapitalAllocation } from "../venture-allocation";
import type { FinancialTruthSnapshot, MercuryCashSnapshot, StripeCashSnapshot } from "../types";
import { projectModeledEconomics } from "../economics";

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
    recent_payout_amount: 96.77,
    recent_payout_status: "paid",
    payout_destination: "OTHER_VERIFIED",
    settlement_destination_classification: "KNOWN_EXTERNAL_BANK",
    last_verified: "2026-09-13T04:53:35.822Z",
    freshness: "FRESH",
    payouts: [
      {
        safe_id: "po_hist",
        amount: 96.77,
        currency: "USD",
        status: "paid",
        arrival_at: "2026-02-24T00:00:00.000Z",
        created_at: "2026-02-24T00:00:00.000Z",
        destination_safe_ref: "stripe dest ****9999",
      },
    ],
    ...overrides,
  };
}

function snapshot(input: { mercury?: MercuryCashSnapshot; stripe?: StripeCashSnapshot; gross?: number } = {}): FinancialTruthSnapshot {
  return {
    mercury: input.mercury ?? mercury(),
    stripe: input.stripe ?? stripe(),
    actual: {
      layer: "ACTUAL",
      gross_revenue: input.gross ?? 0,
      refunds: 0,
      processor_fees: 0,
      net_revenue: input.gross ?? 0,
      known_costs: null,
      unknown_cost_categories: ["INFRASTRUCTURE"],
      contribution: null,
      current_month_gross_revenue: input.gross ?? 0,
    },
    modeled: projectModeledEconomics({ modeled_revenue: null }),
    committed_capital: 0,
    spent_capital: 0,
    current_month_known_burn: 0,
    unknown_cost_state: "UNKNOWN",
    lineages: [],
    anomalies: [],
    registry: [],
    captured_at: "2026-09-13T04:53:35.822Z",
  };
}

describe("Parent financial infrastructure + venture treasury model v1", () => {
  it("1/11: supports shared Stripe across multiple ventures and both infrastructure modes", () => {
    expect(PARENT_INFRASTRUCTURE_MODES).toEqual([
      "SHARED_PARENT_FINANCIAL_INFRASTRUCTURE",
      "SEPARATE_VENTURE_ENTITY_INFRASTRUCTURE",
    ]);
    expect(CURRENT_PARENT_FINANCIAL_INFRASTRUCTURE_MODE).toBe("SHARED_PARENT_FINANCIAL_INFRASTRUCTURE");
    const processor = buildSharedProcessorAccount({
      classification: "KNOWN_EXTERNAL_BANK",
      lastVerifiedAt: "2026-09-13T04:53:35.822Z",
      status: "LIVE",
      connectedVentures: [CRE_VENTURE_ID, "candidate:other"],
    });
    expect(processor.shared_across_ventures).toBe(true);
    expect(processor.connected_ventures).toHaveLength(2);
    expect(processor.provider_account_id).toBe("acct_18h5CjLdvXKx7R7G");
  });

  it("2: attributes OccupancyNPV payments to the OccupancyNPV venture only", () => {
    expect(requiredPaymentLineageFields().length).toBeGreaterThanOrEqual(10);
    expect(occupancyNpvPaymentLineagePresent()).toBe(true);
    expect(attributePaymentToVenture({ description: "OccupancyNPV Professional infinity_offer=PROFESSIONAL" })).toBe(
      CRE_VENTURE_ID,
    );
    expect(
      isInfinityAttributedStripeTxn({
        safe_id: "txn_x",
        type: "charge",
        reporting_category: "charge",
        amount: 96.77,
        fee: 0,
        net: 96.77,
        currency: "USD",
        created_at: "2026-02-24T00:00:00.000Z",
        source: "ch_x",
        payout_id: null,
        description: "Sell More Live More Sales Training",
      }),
    ).toBe(false);
  });

  it("3/4/5: Stripe payout to a known non-Mercury destination is not an error and needs no Mercury txn", () => {
    expect(forbiddenFinancialRules()).toContain("STRIPE_PAYOUT_DESTINATION_MUST_EQUAL_MERCURY");
    expect(canonicalFinancialRules()).toContain("STRIPE_PAYOUT_DESTINATION_MUST_BE_KNOWN_OR_EXPLICITLY_UNKNOWN");
    expect(stripeMustSettleToMercury()).toBe(false);
    expect(classifySettlementDestination("OTHER_VERIFIED")).toBe("KNOWN_EXTERNAL_BANK");
    const recon = reconcileStripeMercury({
      payouts: [],
      mercuryTxns: [
        classifyMercuryTransaction({
          safe_transaction_id: "txn_founder",
          account_id: "acct",
          amount: 50,
          description: "Founder deposit",
          occurred_at: "2026-09-01T22:00:27.300179Z",
        }),
      ],
      mercuryConnected: true,
      ledgerGross: 0,
      stripeChargeGross: 0,
      destinationClassification: "KNOWN_EXTERNAL_BANK",
      accountPayouts: stripe().payouts,
    });
    expect(recon.settlement_reconciliation_status).toBe("PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED");
    expect(recon.stripe_payout_to_mercury).toBe("OTHER_DESTINATION");
    expect(recon.mercury_match_expected).toBe(false);
    expect(recon.anomalies).toEqual([]);
    expect(evaluateFinancialAccountReconciliationGate(recon).result).toBe(
      "PASS_WITH_UNCONNECTED_SETTLEMENT_DESTINATION",
    );
  });

  it("6/7: payout is not revenue and settlement is not duplicated cash", () => {
    const view = projectHqFinancialTruth(snapshot({ gross: 0 }));
    expect(view.actual.gross_revenue).toBe(0);
    expect(view.cash.verified_liquid_cash).toBe(50);
    expect(view.cash.verified_liquid_cash).not.toBe(146.77);
    expect(view.stripe.recent_payout_amount).toBe(96.77);
    const lineage = {
      safe_payment_id: null,
      safe_balance_transaction_id: null,
      safe_payout_id: "po_hist",
      safe_mercury_transaction_id: null,
      amount: 96.77,
      currency: "USD",
      expected_amount: 96.77,
      observed_amount: null,
      difference: null,
      status: "UNKNOWN" as const,
      timestamps: { payment_at: null, available_at: null, payout_at: null, mercury_at: null },
      kind: "SETTLEMENT_BALANCE_TRANSFER" as const,
      is_revenue: false as const,
    };
    expect(settlementIsNotRevenue(lineage)).toBe(true);
  });

  it("8: founder deposit changes cash but not capital authority", () => {
    const moved = applyFounderMercuryDeposit({
      previousMercuryAvailable: 0,
      deposit: 50,
      previousAuthorized: "NOT_SET",
    });
    expect(moved.mercury_available).toBe(50);
    expect(moved.authorized_capital).toBe("NOT_SET");
  });

  it("9: venture revenue changes economics but not spend authority", () => {
    const moved = applyVentureRevenue({ previousGross: 0, revenue: 149, previousAuthorized: "NOT_SET" });
    expect(moved.gross_revenue).toBe(149);
    expect(moved.authorized_capital).toBe("NOT_SET");
    expect(settlementChangesRevenueAttribution()).toBe(false);
    expect(settlementDoesNotChangeAttribution(CRE_VENTURE_ID, "KNOWN_EXTERNAL_BANK")).toBe(true);
  });

  it("10: allocation is distinct from cash balance and spending authority", () => {
    const allocation = emptyVentureCapitalAllocation(CRE_VENTURE_ID);
    expect(allocation.allocated_amount).toBeNull();
    expect(allocation.authorized_amount).toBe("NOT_SET");
    expect(allocationIsNotBalance(allocation, 50)).toBe(true);
    expect(allocationIsNotSpendingAuthority(allocation)).toBe(true);
  });

  it("12: HQ labels settlement as known external, not a Mercury mismatch error", () => {
    const view = projectHqFinancialTruth(snapshot());
    const html = renderToStaticMarkup(createElement(HqFinancialTruthStrip, { view }));
    expect(view.metrics.find((row) => row.id === "settlement_destination")?.display).toBe("Known external/parent bank");
    expect(view.metrics.find((row) => row.id === "settlement_status")?.display).toBe(
      "Processor confirmed — bank destination not connected",
    );
    expect(html).toContain("data-hq-settlement-not-error=\"true\"");
    expect(html).not.toContain("mismatch");
    expect(hqSettlementDestinationLabel("KNOWN_EXTERNAL_BANK")).toBe("Known external/parent bank");
    expect(hqSettlementStatusLabel("PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED")).toContain("not connected");
    const reconciliation = view.metrics.find((row) => row.id === "reconciliation");
    const sync = view.metrics.find((row) => row.id === "last_financial_sync");
    expect(reconciliation?.display).toBe("PASS\nProcessor confirmed —\ndestination not connected");
    expect(reconciliation?.display).not.toContain("PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED");
    expect(reconciliation?.canonical_state).toContain("PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED");
    expect(sync?.display).toMatch(/^\d{4}-\d{2}-\d{2}\n\d{2}:\d{2}:\d{2} UTC$/);
    expect(sync?.canonical_state).toBe(snapshot().captured_at);
    const valueLines = [...html.matchAll(/hq-financial-truth__value-line">([^<]*)</g)].map((match) => match[1]);
    expect(valueLines).toEqual(expect.arrayContaining(["PASS", "Processor confirmed —", "destination not connected"]));
    expect(valueLines.join("\n")).not.toContain("PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED");
    expect(html).toContain("data-hq-canonical-state=");
  });

  it("13/14/15: verified liquid cash stays $50 from live Mercury; Stripe available/pending stay $0", async () => {
    const cash = computePortfolioCashPosition({ mercury: mercury(), stripe: stripe() });
    expect(cash.verified_liquid_cash).toBe(50);
    expect(cash.stripe_available).toBe(0);
    expect(cash.stripe_pending).toBe(0);
    expect(cash.cash_completeness).toBe("COMPLETE");
    const view = projectHqFinancialTruth(snapshot());
    expect(view.mercury.connection).toBe("LIVE");
    expect(view.cash.verified_liquid_cash).toBe(50);
    expect(view.stripe.available).toBe(0);
    expect(view.stripe.pending).toBe(0);
    expect(view.infrastructure_mode).toBe("SHARED_PARENT_FINANCIAL_INFRASTRUCTURE");
    expect(view.parent_entity).toBe("IMR");
    expect(view.mutation_adapter_status).toBe("NOT_ACTIVE");
    expect(view.capital.authorized_capital).toBe(50);
    expect(new MercuryTreasuryMutationAdapter().status).toBe("NOT_ACTIVE");
    await expect(new MercuryTreasuryMutationAdapter().mutate()).rejects.toThrow("MERCURY_MUTATION_NOT_ACTIVE");
  });
});
