import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OperatorVentureListItem, OperatorVentureSnapshot } from "../types";

const loadOperatorVentureList = vi.fn();
const loadOperatorVentureSnapshot = vi.fn();
const resolveLatestFavc1Cycle = vi.fn();
const buildFavc1CycleSnapshot = vi.fn();

vi.mock("../operator-read-model", () => ({
  loadOperatorVentureList: (...args: unknown[]) => loadOperatorVentureList(...args),
  loadOperatorVentureSnapshot: (...args: unknown[]) => loadOperatorVentureSnapshot(...args),
}));

vi.mock("../favc1-cycle/resolve-active-cycle", () => ({
  resolveLatestFavc1Cycle: (...args: unknown[]) => resolveLatestFavc1Cycle(...args),
  shouldPreferFavc1CycleForHq: () => false,
}));

vi.mock("../favc1-cycle/build-cycle-snapshot", () => ({
  buildFavc1CycleSnapshot: (...args: unknown[]) => buildFavc1CycleSnapshot(...args),
}));

vi.mock("../favc1-cycle/exclude-fixtures", () => ({
  isVerificationVentureName: () => false,
}));

function listItem(id: string, overrides: Partial<OperatorVentureListItem> = {}): OperatorVentureListItem {
  return {
    ventureAssemblyId: id,
    ventureName: id,
    status: "active",
    activeDepartment: null,
    latestActivity: null,
    latestActivityAt: "2026-08-29T00:00:00Z",
    launchState: null,
    knownSpendUsd: null,
    latestDecision: null,
    missionId: `mission-${id}`,
    ...overrides,
  };
}

function snapshot(id: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: id,
      organizationId: "org",
      missionId: `mission-${id}`,
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: id,
      ventureType: null,
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [id],
    },
    overallStatus: "RUNNING",
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
    pipeline: { stagesCompleted: 0, stagesTotal: 11, stageLabels: [] },
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
  };
}

describe("HQ dashboard inspected-snapshot load", () => {
  beforeEach(() => {
    loadOperatorVentureList.mockReset();
    loadOperatorVentureSnapshot.mockReset();
    resolveLatestFavc1Cycle.mockReset();
    buildFavc1CycleSnapshot.mockReset();
    resolveLatestFavc1Cycle.mockResolvedValue(null);
  });

  it("loads only the preferred venture snapshot, not a 12-venture prefetch", async () => {
    const ids = Array.from({ length: 12 }, (_, index) => `venture-${index + 1}`);
    loadOperatorVentureList.mockResolvedValue(ids.map((id) => listItem(id)));
    loadOperatorVentureSnapshot.mockImplementation(async (_admin: unknown, _org: string, id: string) =>
      snapshot(id),
    );

    const { loadHqDashboardContext } = await import("../load-hq-dashboard");
    const ctx = await loadHqDashboardContext({} as never, "org", "venture-3");

    expect(loadOperatorVentureSnapshot).toHaveBeenCalledTimes(1);
    expect(loadOperatorVentureSnapshot).toHaveBeenCalledWith({}, "org", "venture-3");
    expect(ctx.defaultVentureId).toBe("venture-3");
    expect(ctx.snapshot?.venture.ventureAssemblyId).toBe("venture-3");
    expect(ctx.snapshots.size).toBe(1);
  });

  it("loads one default snapshot when no inspect target is provided", async () => {
    loadOperatorVentureList.mockResolvedValue([
      listItem("older", { latestActivityAt: "2026-01-01T00:00:00Z" }),
      listItem("newer", { latestActivityAt: "2026-08-29T00:00:00Z" }),
    ]);
    loadOperatorVentureSnapshot.mockImplementation(async (_admin: unknown, _org: string, id: string) =>
      snapshot(id),
    );

    const { loadHqDashboardContext } = await import("../load-hq-dashboard");
    const ctx = await loadHqDashboardContext({} as never, "org", null);

    expect(loadOperatorVentureSnapshot).toHaveBeenCalledTimes(1);
    expect(loadOperatorVentureSnapshot).toHaveBeenCalledWith({}, "org", "newer");
    expect(ctx.defaultVentureId).toBe("newer");
    expect(ctx.snapshots.size).toBe(1);
  });

  it("does not call FAVC1 discovery when inspecting a concrete venture", async () => {
    loadOperatorVentureList.mockResolvedValue([listItem("real-uuid")]);
    loadOperatorVentureSnapshot.mockResolvedValue(snapshot("real-uuid"));

    const { loadHqDashboardContext } = await import("../load-hq-dashboard");
    await loadHqDashboardContext({} as never, "org", "real-uuid");

    expect(resolveLatestFavc1Cycle).not.toHaveBeenCalled();
    expect(loadOperatorVentureSnapshot).toHaveBeenCalledTimes(1);
  });

  it("removed the unused 12-snapshot prefetch contract", () => {
    const source = readFileSync(join(process.cwd(), "lib/infinity/operator-console/load-hq-dashboard.ts"), "utf8");
    expect(source).not.toContain("SNAPSHOT_PREFETCH_LIMIT");
    expect(source).not.toMatch(/prefetchIds/);
    expect(source).toMatch(/loadOperatorVentureSnapshot\(admin, organizationId, (resolvedId|loadId)\)/);
  });

  it("does not replace an explicit OccupancyNPV inspect target with the AskReview default", async () => {
    const { CRE_VENTURE_ID } = await import("@/lib/infinity/venture-operating-scale/constants");
    const { ASKREVIEW_VENTURE_ID } = await import("@/lib/infinity/second-venture-factory/constants");
    loadOperatorVentureList.mockResolvedValue([
      listItem("ask-assembly", { ventureName: "AskReview", latestActivityAt: "2026-09-01T00:00:00Z" }),
      listItem("occ-assembly", { ventureName: "OccupancyNPV", latestActivityAt: "2026-01-01T00:00:00Z" }),
    ]);
    loadOperatorVentureSnapshot.mockImplementation(async (_admin: unknown, _org: string, id: string) =>
      snapshot(id),
    );

    const { loadHqDashboardContext } = await import("../load-hq-dashboard");
    const ctx = await loadHqDashboardContext({} as never, "org", CRE_VENTURE_ID);

    expect(ctx.defaultVentureId).toBe(CRE_VENTURE_ID);
    expect(ctx.selectionError).toBeNull();
    expect(ctx.snapshot?.venture.ventureAssemblyId).toBe(CRE_VENTURE_ID);
    expect(ctx.snapshot?.venture.ventureAssemblyId).not.toBe(ASKREVIEW_VENTURE_ID);
    expect(ctx.snapshot?.venture.ventureAssemblyId).not.toBe("ask-assembly");
    expect(loadOperatorVentureSnapshot.mock.calls.some((call) => call[2] === "ask-assembly")).toBe(false);
  });

  it("does not remount-fetch the SSR snapshot except for FAVC1 follow", () => {
    const source = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"),
      "utf8",
    );
    expect(source).toContain("useHqLiveProjection(refresh)");
    expect(source).not.toContain("setInterval(refresh, intervalMs)");
    expect(source).not.toContain("const intervalMs = favc1Polling ? 3000 : 4000");
  });
});
