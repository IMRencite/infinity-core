import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HqFinancialPulse } from "@/components/dashboard/operator-console/hq-financial-pulse";
import { attachCommandActivity, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import {
  evaluateActiveWorkStalenessGate,
  evaluateHQLiveWorkSurfaceConsistencyGate,
  evaluateOperatingFloorCurrentMissionGate,
  resetCanonicalWorkStore,
  resolveCurrentCanonicalWork,
} from "@/lib/infinity/canonical-work";
import { HQ_DESKTOP_REGION_ORDER } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { ingestCanonicalRevenueEvent } from "@/lib/infinity/venture-financial-governance/revenue";
import { resetFinancialGovernance } from "@/lib/infinity/venture-financial-governance/store";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { projectModeledEconomics } from "../economics";
import { resetCapitalLedger } from "../capital-ledger";
import { projectHqFinancialTruth } from "../project";
import { projectHqFinancialPulse, pulseMetric } from "../financial-pulse";
import { isRecognizedVentureRevenue, projectPortfolioActualEconomics } from "../portfolio-actual-economics";
import {
  evaluateActualContributionTruthGate,
  evaluateCardTextContainmentGate,
  evaluateCrossVentureRevenueAttributionGate,
  evaluateHQEconomicPulseConsistencyGate,
  evaluateHQExecutiveEconomicPulseGate,
  evaluateHQFinancialPulseConsistencyGate,
  evaluateHQFinancialPulseGate,
  evaluateHQInformationHierarchyGate,
  evaluateHQLiveEconomicRefreshGate,
  evaluateHQOperationalRoomsProminenceGate,
  evaluateHQTopInformationHierarchyGate,
  evaluateHorizontalOverflowGate,
  evaluatePortfolioRevenueTruthGate,
  evaluateResponsiveFinancialPulseGate,
  evaluateTopRevenueVentureTruthGate,
  pulseContainsForbiddenDetail,
} from "../financial-pulse-gates";
import type { FinancialTruthSnapshot, MercuryCashSnapshot, StripeCashSnapshot } from "../types";
import type { DepartmentId, OperatorVentureSnapshot as HqSnapshot, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

function source(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function mercury(): MercuryCashSnapshot {
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
  };
}

function stripe(): StripeCashSnapshot {
  return {
    ...emptyStripeSnapshot("LIVE"),
    connection: "LIVE",
    available: 0,
    pending: 0,
    last_verified: "2026-09-13T05:58:23.822Z",
    freshness: "FRESH",
    payout_destination: "OTHER_VERIFIED",
    settlement_destination_classification: "KNOWN_EXTERNAL_BANK",
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
    modeled: projectModeledEconomics({ modeled_revenue: 9999 }),
    committed_capital: 0,
    spent_capital: 0,
    current_month_known_burn: 0,
    unknown_cost_state: "UNKNOWN",
    lineages: [],
    anomalies: [],
    registry: [],
    captured_at: "2026-09-13T06:55:00.000Z",
    ...overrides,
  };
}

function idleWorker(departmentId: DepartmentId, role: string): OperatorWorkerNode {
  return {
    nodeId: `${departmentId}-${role.toLowerCase()}`,
    departmentId,
    role,
    displayRole: role,
    status: "WAITING",
    task: null,
    displayTask: null,
    provider: null,
    model: null,
    isActive: false,
    isDormant: true,
    motionActive: false,
  };
}

function hqSnapshot(): HqSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: CRE_VENTURE_ID,
      organizationId: "org_hot_economics",
      missionId: "msn_hot",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "OccupancyNPV",
      ventureType: "operating",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "NOT_STARTED",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments: (
      [
        ["operations", "Operations Room"],
        ["executive_office", "Command"],
        ["product_lab", "Creation Lab"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED",
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    })),
    pipeline: { stagesCompleted: 0, stagesTotal: 0, stageLabels: [] },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
    workerNodes: [idleWorker("operations", "VENTURE_OPERATOR"), idleWorker("product_lab", "Implementer")],
  } as HqSnapshot;
}

beforeEach(() => {
  resetFinancialGovernance();
  resetCapitalLedger();
  resetCanonicalWorkStore();
  resetMissionActivityStore();
});

afterEach(() => {
  resetFinancialGovernance();
  resetCapitalLedger();
  resetCanonicalWorkStore();
  resetMissionActivityStore();
});

describe("HQ hot economics + header hierarchy + stale test state correction v1", () => {
  it("classifies earlier typecheck and stale projection failures as superseded", () => {
    const project = source("lib/infinity/canonical-work/project.ts");
    const frontend = source("lib/infinity/operator-console/__tests__/hq-frontend-live-projection-v1.test.ts");
    expect(project).toContain("CommandActivityView[\"rooms\"][DepartmentId]");
    expect(project).not.toContain("CommandActivityView[\"rooms\"][string]");
    expect(frontend).toContain("msn_qkg_answer_authority_qc_v1");
    expect(frontend).toContain("keeps historical inspection while Command and rooms follow currentExecution");
  });

  it("keeps Command and the floor idle when no current mission exists", () => {
    const current = resolveCurrentCanonicalWork();
    const view = projectCommandActivity({ organizationId: "org_hot_economics" });
    const attached = attachCommandActivity(hqSnapshot(), view);
    expect(current.status).toBe("IDLE");
    expect(current.mission_title).toBeNull();
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.counts.activeMissions).toBe(0);
    expect(view.rooms.executive_office.status).not.toBe("ACTIVE_WORK");
    expect(attached.departments.find((dept) => dept.id === "operations")?.isActive).toBe(false);
    expect(attached.departments.find((dept) => dept.id === "operations")?.state).not.toBe("RUNNING");
    expect(attached.currentActivity.active).toBe(false);
    expect(attached.currentDepartments).toEqual([]);
    expect(evaluateOperatingFloorCurrentMissionGate({
      command_work_id: view.nowInspecting.currentWorkId,
      floor_work_id: view.nowInspecting.currentWorkId,
      command_mission: view.nowInspecting.currentMission,
      floor_mission: view.nowInspecting.currentMission,
    }).result).toBe("PASS");
    expect(evaluateHQLiveWorkSurfaceConsistencyGate({
      command: {
        work_id: view.nowInspecting.currentWorkId,
        status: view.nowInspecting.status,
        mission: view.nowInspecting.currentMission,
      },
      floor: {
        work_id: view.nowInspecting.currentWorkId,
        status: view.nowInspecting.status,
        mission: view.nowInspecting.currentMission,
      },
    }).result).toBe("PASS");
    expect(evaluateActiveWorkStalenessGate({
      displayed_mission: view.nowInspecting.currentMission,
      displayed_status: view.nowInspecting.status,
      canonical_status: current.status,
      latest_completed_title: current.latest_completed_title,
    }).result).toBe("PASS");
  });

  it("places pulse then Command, then status, then rooms, then full Financial Truth", () => {
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const pulseUi = source("components/dashboard/operator-console/hq-financial-pulse.tsx");
    const css = source("app/globals.css");
    const pulseIdx = consoleUi.indexOf("<HqFinancialPulse");
    const commandIdx = consoleUi.indexOf('data-hq-region="command"');
    const statusIdx = consoleUi.indexOf("<HqSecondaryStatusRow");
    const roomsIdx = consoleUi.indexOf("<HqSpatialFloor");
    const truthIdx = consoleUi.indexOf('data-hq-region="financial-truth"');
    expect(pulseIdx).toBeGreaterThan(-1);
    expect(pulseIdx).toBeLessThan(commandIdx);
    expect(statusIdx).toBeGreaterThan(commandIdx);
    expect(statusIdx).toBeLessThan(roomsIdx);
    expect(roomsIdx).toBeLessThan(truthIdx);
    expect(evaluateHQInformationHierarchyGate({ homeSurfaceOrder: [...HQ_DESKTOP_REGION_ORDER] }).result).toBe("PASS");
    expect(evaluateHQTopInformationHierarchyGate({ homeSurfaceOrder: [...HQ_DESKTOP_REGION_ORDER] }).result).toBe("PASS");
    expect(evaluateHQOperationalRoomsProminenceGate({
      commandBeforeRooms: commandIdx < roomsIdx,
      roomsBeforeFullTreasury: roomsIdx < truthIdx,
      fullTreasuryBetweenCommandAndRooms: commandIdx < truthIdx && truthIdx < roomsIdx,
      pulseCompact: pulseUi.includes("hq-financial-pulse") && !pulseUi.includes("hq-financial-truth__layers"),
      pulseMateriallyBuriesRooms: false,
    }).result).toBe("PASS");
    const pulseCss = css.slice(css.indexOf(".hq-financial-pulse {"), css.indexOf(".hq-financial-truth {"));
    expect(evaluateResponsiveFinancialPulseGate({
      desktopRow: pulseCss.includes("grid-template-columns: repeat(4, minmax(0, 1fr))"),
      mobileCompact: pulseCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"),
      overflowHidden: consoleUi.includes("overflow-x-hidden") && pulseCss.includes("overflow: hidden"),
      noForcedHorizontalScroll: !pulseCss.includes("overflow-x: auto") && !pulseCss.includes("overflow-x: scroll"),
    }).result).toBe("PASS");
    expect(evaluateCardTextContainmentGate({
      overflowHidden: pulseCss.includes("overflow: hidden") && pulseCss.includes("text-overflow: ellipsis"),
      ellipsis: pulseCss.includes("text-overflow: ellipsis"),
      noTimestampWrap: !pulseUi.includes("last_financial_sync") && !pulseUi.includes("toISOString"),
    }).result).toBe("PASS");
    expect(evaluateHorizontalOverflowGate({
      pageOverflowHidden: consoleUi.includes("overflow-x-hidden"),
      pulseNoForcedScroll: !pulseCss.includes("overflow-x: auto"),
    }).result).toBe("PASS");
  });

  it("shows real portfolio economics in the hot pulse and keeps modeled/settlement out", () => {
    const view = projectHqFinancialTruth(snapshot());
    const pulse = projectHqFinancialPulse(view.treasury_control, view.portfolio_economics);
    const html = renderToStaticMarkup(createElement(HqFinancialPulse, { view }));
    expect(html).toContain("Month Revenue");
    expect(html).toContain("Lifetime Revenue");
    expect(html).toContain("Contribution");
    expect(html).toContain("Top Venture");
    expect(html).toContain("UNKNOWN");
    expect(html).toContain("NONE YET");
    expect(html).not.toContain("$9,999");
    expect(html).not.toContain("Settlement Destination");
    expect(html).not.toContain("Modeled");
    expect(pulseMetric(pulse, "treasury_cash")?.value).toBe(50);
    expect(pulseMetric(pulse, "authorized_capital")?.value).toBe(50);
    expect(pulseMetric(pulse, "allocated_capital")?.value).toBe(0);
    expect(pulseMetric(pulse, "actual_spend")?.value).toBe(0);
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
    expect(evaluateHQEconomicPulseConsistencyGate({
      pulse,
      portfolio: view.portfolio_economics,
    }).result).toBe("PASS");
    expect(evaluateHQExecutiveEconomicPulseGate({
      pulse,
      hasMonthRevenue: html.includes("Month Revenue"),
      hasLifetimeRevenue: html.includes("Lifetime Revenue"),
      hasContribution: html.includes("Contribution"),
      hasTopVenture: html.includes("Top Venture"),
    }).result).toBe("PASS");
    expect(evaluateActualContributionTruthGate({
      unknownCostState: view.portfolio_economics.unknown_cost_state,
      contribution: view.portfolio_economics.actual_contribution,
      contributionDisplay: view.portfolio_economics.contribution_display,
    }).result).toBe("PASS");
    expect(evaluateTopRevenueVentureTruthGate({
      rankingBasis: view.portfolio_economics.top_revenue_venture.ranking_basis,
      topDisplay: view.portfolio_economics.top_revenue_venture.display,
      monthRevenue: view.portfolio_economics.current_month_gross_revenue,
    }).result).toBe("PASS");
  });

  it("excludes founder deposits, payouts, Mercury settlements, synthetics, and modeled revenue", () => {
    const economics = source("lib/infinity/financial-truth/portfolio-actual-economics.ts");
    const pulse = source("lib/infinity/financial-truth/financial-pulse.ts");
    const pulseUi = source("components/dashboard/operator-console/hq-financial-pulse.tsx");
    expect(economics).toContain("isRecognizedVentureRevenue");
    expect(economics).toContain("synthetic !== true");
    expect(economics).not.toContain("FOUNDER_FUNDING");
    expect(economics).not.toContain("STRIPE_SETTLEMENT");
    expect(economics).not.toContain("modeled_revenue");
    expect(economics).not.toContain("mercury.transactions");
    expect(pulse).not.toContain("modeled_revenue");
    expect(pulseUi).not.toContain("modeled");
    expect(isRecognizedVentureRevenue({ venture_id: CRE_VENTURE_ID, synthetic: true })).toBe(false);
    expect(isRecognizedVentureRevenue({ venture_id: CRE_VENTURE_ID, unpaid: true })).toBe(false);
    expect(isRecognizedVentureRevenue({ venture_id: CRE_VENTURE_ID, synthetic: false })).toBe(true);
    ingestCanonicalRevenueEvent({
      venture_id: CRE_VENTURE_ID,
      payment_id: "pi_synthetic_hot",
      provider: "stripe",
      gross_amount: 149,
      synthetic: true,
    });
    expect(projectPortfolioActualEconomics().lifetime_gross_revenue).toBe(0);
    ingestCanonicalRevenueEvent({
      venture_id: CRE_VENTURE_ID,
      payment_id: "pi_real_hot",
      provider: "stripe",
      gross_amount: 149,
      paid_at: "2026-09-13T06:00:00.000Z",
    });
    const live = projectPortfolioActualEconomics("2026-09-13T06:55:00.000Z");
    expect(live.lifetime_gross_revenue).toBe(149);
    expect(live.current_month_gross_revenue).toBe(149);
    expect(live.top_revenue_venture.display).toMatch(/OccupancyNPV/);
    expect(live.ventures.some((row) => row.venture_id === ASKREVIEW_VENTURE_ID)).toBe(true);
    expect(evaluatePortfolioRevenueTruthGate({
      founderDepositsExcluded: !economics.includes("FOUNDER_FUNDING"),
      stripePayoutsExcluded: !economics.includes("recent_payout") && !economics.includes("STRIPE_SETTLEMENT"),
      mercurySettlementsExcluded: !economics.includes("mercury.transactions"),
      syntheticExcluded: economics.includes("synthetic !== true"),
      modeledExcluded: !economics.includes("modeled_revenue"),
    }).result).toBe("PASS");
    expect(evaluateCrossVentureRevenueAttributionGate({
      sharedStripeIsNotPortfolioRevenue: !economics.includes("stripe.available") && !pulse.includes("stripe_available"),
      ventureRowsAttributed: live.ventures.every((row) => Boolean(row.venture_id)),
    }).result).toBe("PASS");
    expect(evaluateTopRevenueVentureTruthGate({
      rankingBasis: live.top_revenue_venture.ranking_basis,
      topDisplay: live.top_revenue_venture.display,
      monthRevenue: live.current_month_gross_revenue,
    }).result).toBe("PASS");
  });

  it("updates economics through the existing live financial path", () => {
    const liveState = source("app/api/operator-console/hq-live-state/route.ts");
    const liveAttach = source("lib/infinity/operator-console/hq-canonical-live-state.ts");
    const pulseUi = source("components/dashboard/operator-console/hq-financial-pulse.tsx");
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(evaluateHQLiveEconomicRefreshGate({
      usesExistingLiveFinancialPath: liveState.includes("withFinancialTruthLiveState") && liveAttach.includes("financialTruth"),
      noNewPollLoop: !pulseUi.includes("setInterval") && !pulseUi.includes("fetch("),
      pulseReadsFinancialTruth: consoleUi.includes("<HqFinancialPulse view={snapshot.financialTruth}"),
    }).result).toBe("PASS");
  });
});
