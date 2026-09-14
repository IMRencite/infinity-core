import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HqFinancialPulse } from "@/components/dashboard/operator-console/hq-financial-pulse";
import { HqFinancialTruthStrip } from "@/components/dashboard/operator-console/hq-financial-truth-strip";
import { HQ_DESKTOP_REGION_ORDER } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { evaluateHQLiveFinancialRefreshGate } from "../gates";
import { evaluateHQTreasuryFinancialConsistencyGate } from "../treasury-gates";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { projectModeledEconomics } from "../economics";
import { resetCapitalLedger } from "../capital-ledger";
import { resetFinancialGovernance } from "@/lib/infinity/venture-financial-governance/store";
import { projectHqFinancialTruth } from "../project";
import { projectHqFinancialPulse, pulseMetric } from "../financial-pulse";
import {
  evaluateHQFinancialPulseConsistencyGate,
  evaluateHQFinancialPulseGate,
  evaluateHQInformationHierarchyGate,
  evaluateHQOperationalRoomsProminenceGate,
  evaluateResponsiveFinancialPulseGate,
  pulseContainsForbiddenDetail,
} from "../financial-pulse-gates";
import type { FinancialTruthSnapshot, MercuryCashSnapshot, StripeCashSnapshot } from "../types";

function source(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

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
    transactions: [],
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

function snapshot(overrides: Partial<FinancialTruthSnapshot> = {}): FinancialTruthSnapshot {
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
    ...overrides,
  };
}

afterEach(() => {
  resetCapitalLedger();
  resetFinancialGovernance();
});

describe("HQ financial pulse + treasury repositioning v1", () => {
  it("projects the compact pulse from CanonicalTreasuryProjection, not a second source", () => {
    const view = projectHqFinancialTruth(snapshot());
    const pulse = projectHqFinancialPulse(view.treasury_control, view.portfolio_economics);
    expect(pulse?.source_contract).toBe("CanonicalTreasuryProjection");
    expect(pulseMetric(pulse, "treasury_cash")?.display).toBe(view.treasury_control.verified_treasury_cash.display);
    expect(pulseMetric(pulse, "treasury_cash")?.value).toBe(50);
    expect(pulseMetric(pulse, "authorized_capital")?.value).toBe(50);
    expect(pulseMetric(pulse, "allocated_capital")?.value).toBe(0);
    expect(pulseMetric(pulse, "actual_spend")?.value).toBe(0);
    expect(pulseMetric(pulse, "month_revenue")?.display).toBe("$0");
    expect(pulseMetric(pulse, "lifetime_revenue")?.display).toBe("$0");
    expect(pulseMetric(pulse, "actual_contribution")?.display).toBe("UNKNOWN");
    expect(pulseMetric(pulse, "top_revenue_venture")?.display).toBe("NONE YET");
    expect(evaluateHQFinancialPulseGate({
      pulse,
      compact: true,
      containsForbiddenDetail: pulseContainsForbiddenDetail(source("components/dashboard/operator-console/hq-financial-pulse.tsx")),
    }).result).toBe("PASS");
    expect(evaluateHQFinancialPulseConsistencyGate({
      pulse,
      treasury: view.treasury_control,
      hq: view,
    }).result).toBe("PASS");
    expect(evaluateHQTreasuryFinancialConsistencyGate(view, view.treasury_control).result).toBe("PASS");
  });

  it("does not hard-code financial values in the pulse projector or component", () => {
    const pulseLib = source("lib/infinity/financial-truth/financial-pulse.ts");
    const pulseUi = source("components/dashboard/operator-console/hq-financial-pulse.tsx");
    expect(pulseLib).not.toMatch(/\$50\b/);
    expect(pulseUi).not.toMatch(/\$50\b/);
    expect(pulseLib).not.toMatch(/authorized_capital:\s*50/);
    expect(pulseUi).not.toContain("setInterval");
    expect(pulseLib).toContain("CanonicalTreasuryProjection");
    expect(pulseLib).toContain("verified_treasury_cash");
  });

  it("renders pulse metrics from live canonical state and keeps full detail in Financial Truth", () => {
    const view = projectHqFinancialTruth(snapshot());
    const pulseHtml = renderToStaticMarkup(createElement(HqFinancialPulse, { view }));
    const truthHtml = renderToStaticMarkup(createElement(HqFinancialTruthStrip, { view }));
    expect(pulseHtml).toContain("data-hq-financial-pulse");
    expect(pulseHtml).toContain("TREASURY LIVE");
    expect(pulseHtml).toContain("Treasury Cash");
    expect(pulseHtml).toContain("$50");
    expect(pulseHtml).toContain("Authorized");
    expect(pulseHtml).toContain("Allocated");
    expect(pulseHtml).toContain("Actual Spend");
    expect(pulseHtml).toContain("Month Revenue");
    expect(pulseHtml).toContain("Lifetime Revenue");
    expect(pulseHtml).toContain("Contribution");
    expect(pulseHtml).toContain("Top Venture");
    expect(pulseHtml).not.toContain("Settlement Destination");
    expect(pulseHtml).not.toContain("Modeled");
    expect(pulseHtml).not.toContain("Unknown cost");
    expect(pulseHtml).not.toContain("Last financial sync");
    expect(pulseHtml).not.toContain("Venture economics");
    expect(truthHtml).toContain("data-hq-financial-truth");
    expect(truthHtml).toContain("Verified treasury cash");
    expect(truthHtml).toContain("Mercury cash");
    expect(truthHtml).toContain("Stripe available");
    expect(truthHtml).toContain("Stripe pending");
    expect(truthHtml).toContain("Settlement destination");
    expect(truthHtml).toContain("Venture economics");
    expect(truthHtml).toContain("Modeled economics");
    expect(truthHtml).toContain("Allocated capital");
    expect(truthHtml).toContain("Actual spend");
    expect(truthHtml).toContain("Remaining authorized");
    expect(truthHtml).toContain("Last financial sync");
    expect(truthHtml).toContain("Source");
  });

  it("keeps pulse near the top and full Financial Truth after rooms", () => {
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const pulseUi = source("components/dashboard/operator-console/hq-financial-pulse.tsx");
    const css = source("app/globals.css");
    const pulseIdx = consoleUi.indexOf("<HqFinancialPulse");
    const commandIdx = consoleUi.indexOf('data-hq-region="command"');
    const roomsIdx = consoleUi.indexOf("<HqSpatialFloor");
    const truthIdx = consoleUi.indexOf('data-hq-region="financial-truth"');
    const infraIdx = consoleUi.indexOf('data-hq-region="infrastructure"');
    expect(pulseIdx).toBeGreaterThan(-1);
    expect(pulseIdx).toBeLessThan(commandIdx);
    expect(commandIdx).toBeLessThan(roomsIdx);
    expect(roomsIdx).toBeLessThan(truthIdx);
    expect(truthIdx).toBeLessThan(infraIdx);
    expect(consoleUi).toContain("TreasuryControlCenter");
    expect(consoleUi.indexOf("<HqFinancialTruthStrip")).toBeGreaterThan(roomsIdx);
    expect(evaluateHQInformationHierarchyGate({ homeSurfaceOrder: [...HQ_DESKTOP_REGION_ORDER] }).result).toBe("PASS");
    expect(evaluateHQOperationalRoomsProminenceGate({
      commandBeforeRooms: commandIdx < roomsIdx,
      roomsBeforeFullTreasury: roomsIdx < truthIdx,
      fullTreasuryBetweenCommandAndRooms: commandIdx < truthIdx && truthIdx < roomsIdx,
      pulseCompact: pulseUi.includes("hq-financial-pulse") && !pulseUi.includes("hq-financial-truth__layers"),
      pulseMateriallyBuriesRooms: false,
    }).result).toBe("PASS");
    const pulseCssStart = css.indexOf(".hq-financial-pulse {");
    const pulseCssEnd = css.indexOf(".hq-financial-truth {");
    const pulseCss = pulseCssStart >= 0 && pulseCssEnd > pulseCssStart ? css.slice(pulseCssStart, pulseCssEnd) : "";
    expect(evaluateResponsiveFinancialPulseGate({
      desktopRow: pulseCss.includes("grid-template-columns: repeat(4, minmax(0, 1fr))"),
      mobileCompact: pulseCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"),
      overflowHidden: consoleUi.includes("overflow-x-hidden"),
      noForcedHorizontalScroll: !pulseCss.includes("overflow-x: auto") && !pulseCss.includes("overflow-x: scroll"),
    }).result).toBe("PASS");
  });

  it("updates through the existing live financial path without a new poll loop", () => {
    const liveState = source("app/api/operator-console/hq-live-state/route.ts");
    const liveAttach = source("lib/infinity/operator-console/hq-canonical-live-state.ts");
    const pulseUi = source("components/dashboard/operator-console/hq-financial-pulse.tsx");
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const cadence = source("lib/infinity/financial-truth/live-cadence.ts");
    expect(liveState).toContain("withFinancialTruthLiveState");
    expect(liveState).not.toContain("setInterval");
    expect(liveAttach).toContain("financialTruth");
    expect(pulseUi).not.toContain("setInterval");
    expect(pulseUi).not.toContain("fetch(");
    expect(consoleUi).toContain("<HqFinancialPulse view={snapshot.financialTruth}");
    expect(consoleUi).toContain("<HqFinancialTruthStrip view={snapshot.financialTruth}");
    expect(cadence).toContain("if (input.reason === \"poll\") return false");
    const view = projectHqFinancialTruth(snapshot());
    expect(evaluateHQLiveFinancialRefreshGate({
      mercuryConnection: view.mercury.connection,
      financialTruthProjected: true,
      mercuryMetricVisible: true,
      liquidMetricVisible: true,
      stripeAvailableVisible: true,
      stripePendingVisible: true,
      freshnessVisible: true,
      liveStateAttachesFinancialTruth: true,
      pollRefreshesProviders: false,
      catchUpRefreshesWhenUnverified: true,
      mercuryValueLive: view.mercury.available === 50,
      verifiedLiquidRecalculated: view.cash.verified_liquid_cash === 50,
    }).result).toBe("PASS");
    const moved = projectHqFinancialTruth(snapshot({
      mercury: mercury({ current: 75, available: 75 }),
    }));
    const movedPulse = projectHqFinancialPulse(moved.treasury_control, moved.portfolio_economics);
    expect(pulseMetric(movedPulse, "treasury_cash")?.value).toBe(moved.cash.verified_liquid_cash);
    expect(pulseMetric(movedPulse, "treasury_cash")?.value).not.toBe(50);
  });
});
