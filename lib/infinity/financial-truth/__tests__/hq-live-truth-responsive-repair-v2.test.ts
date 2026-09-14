import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emptyCodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import { nowInspectingFromCanonicalWork } from "@/lib/infinity/canonical-work/project";
import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract } from "@/lib/infinity/canonical-work/types";
import { FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD } from "@/lib/infinity/financial-truth/allocation-reconciliation";
import { computePortfolioCashPosition, emptyMercurySnapshot, emptyStripeSnapshot } from "@/lib/infinity/financial-truth/cash-position";
import { emptyFinancialTruthSnapshot } from "@/lib/infinity/financial-truth/empty-snapshot";
import { projectHqFinancialPulseFromView } from "@/lib/infinity/financial-truth/financial-pulse";
import { projectHqFinancialTruth } from "@/lib/infinity/financial-truth/project";
import {
  displayedCashIsNumericZero,
  evaluateTreasuryCashTruthGate,
  evaluateTreasuryCompletenessGate,
  projectTreasuryCashTruth,
} from "@/lib/infinity/financial-truth/treasury-cash-truth";
import { overlayCanonicalTreasuryOnHqReadModel } from "@/lib/infinity/financial-truth/treasury-overlay";
import {
  evaluateCommandCycleCanonicalConsistencyGate,
  evaluateCommandCycleCapabilityProjectionGate,
  projectCommandCycleCapability,
} from "@/lib/infinity/operator-console/command-cycle-capability";
import { deriveCommandSystemReadiness } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import {
  evaluateResponsiveHorizontalOverflowGate,
  pageHasHorizontalOverflow,
} from "@/lib/infinity/operator-console/responsive-overflow";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  evaluateAgentTaskLineageGate,
  evaluateAgentTaskSpecificityGate,
  resolveAgentCurrentTask,
} from "@/lib/infinity/room-work";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { evaluateNoQCNoReleaseGate } from "@/lib/infinity/universal-artifact-qc/gates";
import { ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";

const ROOT = join(process.cwd());

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

function liveMercury(amount: number) {
  return {
    ...emptyMercurySnapshot("LIVE"),
    connection: "LIVE" as const,
    operating_account_verified: true,
    current: amount,
    available: amount,
    last_verified: "2026-09-13T00:00:00.000Z",
    freshness: "FRESH" as const,
    failure_stage: null,
    provider_error: null,
  };
}

function liveStripe(available: number) {
  return {
    ...emptyStripeSnapshot("LIVE"),
    connection: "LIVE" as const,
    available,
    pending: 0,
    last_verified: "2026-09-13T00:00:00.000Z",
    freshness: "FRESH" as const,
  };
}

function work(overrides: Partial<CanonicalWorkExecutionContract> = {}): CanonicalWorkExecutionContract {
  return {
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: "work:infinity:hq-current-implementation",
    mission_id: "mission:hq-live-truth-v2",
    venture_id: null,
    work_type: "INCIDENT_REPAIR",
    title: "INFINITY — AUTHENTICATED PORT-3000 HQ LIVE-TRUTH + RESPONSIVE REPAIR V2",
    description: "TASK DETAIL UNAVAILABLE",
    stage: "REPAIR",
    status: "ACTIVE",
    assigned_rooms: ["product_lab", "quality_control"],
    assigned_workers: ["Native Coder", "Validation Station"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: "2026-09-14T00:00:00.000Z",
    updated_at: "2026-09-14T00:00:00.000Z",
    completed_at: null,
    blocked_reason: null,
    authorization_state: null,
    progress: "ACTIVE",
    latest_output: "Repairing HQ live truth",
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [],
    requires_infinity_worker_execution: true,
    next_expected_transition: "QC",
    ...overrides,
  };
}

function idleSnapshot(overrides: Partial<OperatorVentureSnapshot> = {}): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: "v1",
      organizationId: ORG_A,
      missionId: "m1",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Test",
      ventureType: null,
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: ["v1"],
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
    departments: [],
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
    ...overrides,
  };
}

describe("HQ live-truth + responsive repair v2", () => {
  it("1: Mercury failure cannot render $0 without zero evidence", () => {
    const cash = computePortfolioCashPosition({
      mercury: emptyMercurySnapshot("FAIL"),
      stripe: liveStripe(0),
    });
    const truth = projectTreasuryCashTruth({ mercury: emptyMercurySnapshot("FAIL"), stripe: liveStripe(0), cash });
    expect(cash.verified_liquid_cash).toBeNull();
    expect(truth.display).toBe("UNKNOWN");
    expect(displayedCashIsNumericZero(truth.display)).toBe(false);
    expect(evaluateTreasuryCashTruthGate({ truth, displayed: "$0" }).result).toBe("FAIL");
    expect(evaluateTreasuryCashTruthGate({ truth, displayed: truth.display }).result).toBe("PASS");
  });

  it("2: verified Mercury $0 may render $0", () => {
    const mercury = liveMercury(0);
    const cash = computePortfolioCashPosition({ mercury, stripe: liveStripe(0) });
    const truth = projectTreasuryCashTruth({ mercury, stripe: liveStripe(0), cash });
    expect(cash.verified_liquid_cash).toBe(0);
    expect(truth.display).toBe("$0");
    expect(evaluateTreasuryCashTruthGate({ truth, displayed: "$0" }).result).toBe("PASS");
  });

  it("3: verified Mercury $50 renders $50", () => {
    const mercury = liveMercury(50);
    const cash = computePortfolioCashPosition({ mercury, stripe: liveStripe(0) });
    const truth = projectTreasuryCashTruth({ mercury, stripe: liveStripe(0), cash });
    expect(cash.verified_liquid_cash).toBe(50);
    expect(truth.display).toBe("$50");
    expect(evaluateTreasuryCashTruthGate({ truth, displayed: "$50" }).result).toBe("PASS");
  });

  it("4: Mercury unavailable renders UNKNOWN/PARTIAL", () => {
    const mercury = emptyMercurySnapshot("FAIL");
    const cash = computePortfolioCashPosition({ mercury, stripe: liveStripe(0) });
    const truth = projectTreasuryCashTruth({ mercury, stripe: liveStripe(0), cash });
    expect(truth.display).toBe("UNKNOWN");
    expect(truth.completeness).toBe("PARTIAL");
    expect(cash.verified_liquid_cash).toBeNull();
  });

  it("5: completeness metadata stays correct", () => {
    const mercury = emptyMercurySnapshot("FAIL");
    const cash = computePortfolioCashPosition({ mercury, stripe: liveStripe(0) });
    expect(
      evaluateTreasuryCompletenessGate({
        mercuryConnection: mercury.connection,
        mercuryVerified: false,
        stripeVerified: true,
        completeness: cash.cash_completeness,
      }).result,
    ).toBe("PASS");
    expect(cash.cash_completeness).toBe("PARTIAL");
  });

  it("6-8: command-cycle Treasury derives from canonical capability, not empty-store freshness", () => {
    const snap = emptyFinancialTruthSnapshot();
    snap.mercury = emptyMercurySnapshot("FAIL");
    snap.stripe = liveStripe(0);
    const view = projectHqFinancialTruth(snap);
    const projection = projectCommandCycleCapability({
      financialTruth: view,
      treasuryModel: emptyTreasuryHqReadModel(ORG_A),
    });
    expect(projection.treasury).toBe("CONNECTED");
    expect(projection.mercury).toBe("READ_ONLY");
    expect(projection.verification).toBe("PARTIAL");
    expect(projection.mutation).toBe("GOVERNED / LOCKED");
    expect(projection.treasury_display).toBe("CONNECTED / DEGRADED");
    expect(evaluateCommandCycleCapabilityProjectionGate(projection).result).toBe("PASS");
    const indicators = deriveCommandSystemReadiness({
      snapshot: idleSnapshot({ financialTruth: view }),
      treasury: emptyTreasuryHqReadModel(ORG_A),
      coding: emptyCodingHqReadModel(ORG_A),
    });
    expect(indicators.find((row) => row.id === "treasury")?.status).toBe("CONNECTED / DEGRADED");
    expect(indicators.find((row) => row.id === "treasury")?.status).not.toBe("NOT CONFIGURED");
    expect(
      evaluateCommandCycleCanonicalConsistencyGate({
        projection,
        displayed: "CONNECTED / DEGRADED",
        hqShowsLiveCapital: true,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateCommandCycleCanonicalConsistencyGate({
        projection,
        displayed: "NOT CONFIGURED",
        hqShowsLiveCapital: true,
      }).result,
    ).toBe("FAIL");
  });

  it("9: command-cycle/HQ contradiction fails the consistency gate", () => {
    const projection = projectCommandCycleCapability({
      financialTruth: projectHqFinancialTruth({
        ...emptyFinancialTruthSnapshot(),
        mercury: emptyMercurySnapshot("FAIL"),
        stripe: liveStripe(0),
      }),
    });
    expect(
      evaluateCommandCycleCanonicalConsistencyGate({
        projection,
        displayed: "NOT CONFIGURED",
        hqShowsLiveCapital: true,
      }).reasons,
    ).toContain("HQ_CAPITAL_CONTRADICTS_NOT_CONFIGURED");
  });

  it("10-13: tablet/mobile overflow eliminated without global hide as the primary fix", () => {
    expect(source("components/dashboard/operator-console/coding-intelligence-strip.tsx")).not.toContain("min-w-[720px]");
    expect(source("components/dashboard/operator-console/treasury-capital-strip.tsx")).not.toContain("min-w-[640px]");
    expect(source("components/dashboard/operator-console/treasury-capital-strip.tsx")).not.toContain("min-w-[800px]");
    expect(source("components/dashboard/operator-console/treasury-capital-strip.tsx")).not.toContain("min-w-[880px]");
    expect(source("components/dashboard/operator-console/ztp-intelligence-strip.tsx")).not.toContain("min-w-[860px]");
    expect(source("components/dashboard/hq/pipeline-board.tsx")).not.toContain("min-w-[720px]");
    expect(source("app/globals.css")).toContain(".hq-reflow-table");
    expect(source("app/globals.css")).toMatch(/\.infinity-hq\s*>\s*\*\s*\{[\s\S]*min-width:\s*0/);
    expect(source("app/globals.css")).toContain(".hq-dashboard-main");
    expect(source("components/dashboard/dashboard-shell.tsx")).toContain("min-w-0");
    expect(source("components/dashboard/dashboard-shell.tsx")).toContain("max-w-[min(100rem,100%)]");
    expect(source("app/globals.css")).not.toMatch(/^(html|body)\s*,\s*(html|body)[^{]*\{[^}]*overflow-x:\s*hidden/m);
    expect(source("app/globals.css")).not.toMatch(/^html\s*\{[^}]*overflow-x:\s*hidden/m);
    const gate = evaluateResponsiveHorizontalOverflowGate({
      viewports: [
        { name: "desktop", scrollWidth: 1440, clientWidth: 1440 },
        { name: "tablet", scrollWidth: 768, clientWidth: 768 },
        { name: "mobile", scrollWidth: 390, clientWidth: 390 },
      ],
      usedGlobalOverflowXHiddenAsPrimary: false,
    });
    expect(gate.result).toBe("PASS");
    expect(pageHasHorizontalOverflow({ scrollWidth: 820, clientWidth: 768 })).toBe(true);
    expect(
      evaluateResponsiveHorizontalOverflowGate({
        viewports: [
          { name: "desktop", scrollWidth: 1440, clientWidth: 1440 },
          { name: "tablet", scrollWidth: 900, clientWidth: 768 },
          { name: "mobile", scrollWidth: 430, clientWidth: 390 },
        ],
        usedGlobalOverflowXHiddenAsPrimary: true,
      }).result,
    ).toBe("FAIL");
  });

  it("14-15: active agent with lineage renders a specific task, not TASK DETAIL UNAVAILABLE", () => {
    const current = work();
    const agent = resolveAgentCurrentTask({
      work: current,
      roomId: "product_lab",
      agentName: "Native Coder",
      agentId: "agent:product_lab",
    });
    const inspecting = nowInspectingFromCanonicalWork(current);
    expect(agent.task_summary).not.toBe("TASK DETAIL UNAVAILABLE");
    expect(inspecting.currentTask).not.toBe("TASK DETAIL UNAVAILABLE");
    expect(inspecting.currentStep).not.toBe("TASK DETAIL UNAVAILABLE");
    expect(evaluateAgentTaskLineageGate({ work: current, displayed: agent.task_summary }).result).toBe("PASS");
    expect(evaluateAgentTaskLineageGate({ work: current, displayed: "TASK DETAIL UNAVAILABLE" }).result).toBe("FAIL");
    expect(evaluateAgentTaskSpecificityGate([{ task: agent.task_summary }]).result).toBe("PASS");
    expect(
      evaluateAgentTaskLineageGate({
        work: work({ title: "Implementation in progress", description: "TASK DETAIL UNAVAILABLE" }),
        displayed: "TASK DETAIL UNAVAILABLE",
      }).result,
    ).toBe("PASS");
  });

  it("16: OccupancyNPV allocation remains exactly $25", () => {
    expect(FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD).toBe(25);
    expect(source("lib/infinity/financial-truth/treasury-cash-truth.ts")).not.toMatch(/allocate|OccupancyNPV/);
    expect(source("lib/infinity/operator-console/command-cycle-capability.ts")).not.toMatch(/mutateVentureCapitalAllocation/);
  });

  it("17: prior desktop reconciliation containment remains a source-level PASS", () => {
    const css = source("app/globals.css");
    expect(css).toContain("hq-financial-truth__status");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(source("components/dashboard/operator-console/hq-financial-truth-strip.tsx")).toContain(
      "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED",
    );
  });

  it("18: overlay and pulse keep capability-safe cash semantics", () => {
    const snap = emptyFinancialTruthSnapshot();
    snap.mercury = emptyMercurySnapshot("FAIL");
    snap.stripe = liveStripe(0);
    const view = projectHqFinancialTruth(snap);
    const pulse = projectHqFinancialPulseFromView(view);
    expect(view.treasury_control.verified_treasury_cash.display).toBe("UNKNOWN");
    expect(pulse?.metrics.find((row) => row.id === "treasury_cash")?.display).toBe("UNKNOWN");
    const overlaid = overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel(ORG_A), view.treasury_control);
    expect(overlaid.state.providerFreshness).not.toBe("NOT_CONFIGURED");
    expect(overlaid.cards.totalCash.display).toBe("UNKNOWN");
  });

  it("19: controlled safe SSE update path exists without mutating capital", () => {
    const sse = source("app/api/operator-console/hq-events/route.ts");
    expect(sse).toContain("text/event-stream");
    expect(source("lib/infinity/canonical-work/implementation-observe.ts")).toContain("pulseCurrentImplementationWork");
    expect(source("lib/infinity/canonical-work/implementation-observe.ts")).not.toContain("mutateVentureCapitalAllocation");
  });

  it("20: release remains blocked until authenticated recheck passes", () => {
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_REPAIR_REQUIRED",
        lifecycle_state: "QC_REPAIR_REQUIRED",
        release_requested: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_PENDING_BROWSER_PROOF",
        lifecycle_state: "QC_PENDING",
        release_requested: true,
      }).result,
    ).toBe("FAIL");
  });
});
