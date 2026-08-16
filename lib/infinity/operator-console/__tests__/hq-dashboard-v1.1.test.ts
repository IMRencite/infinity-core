import { describe, it, expect } from "vitest";
import { resolveDefaultVentureId, groupVenturesForSelector } from "../resolve-default-venture";
import type { OperatorVentureListItem, OperatorVentureSnapshot } from "../types";

function item(id: string, overrides: Partial<OperatorVentureListItem> = {}): OperatorVentureListItem {
  return {
    ventureAssemblyId: id,
    ventureName: id,
    status: "active",
    activeDepartment: null,
    latestActivity: null,
    latestActivityAt: null,
    launchState: null,
    knownSpendUsd: null,
    latestDecision: null,
    missionId: `mission-${id}`,
    ...overrides,
  };
}

function snapshot(id: string, overrides: Partial<OperatorVentureSnapshot> = {}): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: id,
      organizationId: "org",
      missionId: "m1",
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
    overallStatus: "UNKNOWN",
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
    ...overrides,
  };
}

describe("HQ Dashboard V1.1 — default venture resolution", () => {
  it("1. prefers RUNNING venture", () => {
    const items = [item("a"), item("b")];
    const map = new Map<string, OperatorVentureSnapshot>([
      ["a", snapshot("a", { overallStatus: "COMPLETE" })],
      ["b", snapshot("b", { overallStatus: "RUNNING" })],
    ]);
    expect(resolveDefaultVentureId(items, map)).toBe("b");
  });

  it("2-3. READY mission fallback", () => {
    const items = [item("a"), item("b")];
    const map = new Map<string, OperatorVentureSnapshot>([
      ["a", snapshot("a", { overallStatus: "COMPLETE" })],
      ["b", snapshot("b", { overallStatus: "WAITING", closedLoopRoute: { active: true, fromDepartmentId: "intelligence_center", viaDepartmentId: "executive_office", toDepartmentId: "product_lab", decisionType: "REPAIR", missionId: "m1", missionStatus: "READY" } })],
    ]);
    expect(resolveDefaultVentureId(items, map)).toBe("b");
  });

  it("4. recent active venture fallback", () => {
    const items = [
      item("old", { latestActivityAt: "2026-01-01T00:00:00Z" }),
      item("new", { latestActivityAt: "2026-08-16T04:00:00Z" }),
    ];
    const map = new Map<string, OperatorVentureSnapshot>([
      ["old", snapshot("old")],
      ["new", snapshot("new")],
    ]);
    expect(resolveDefaultVentureId(items, map)).toBe("new");
  });

  it("5. no venture returns null", () => {
    expect(resolveDefaultVentureId([], new Map())).toBeNull();
  });

  it("6. venture selector groups", () => {
    const groups = groupVenturesForSelector([
      item("a", { status: "running", activeDepartment: "product_lab" }),
      item("b", { status: "paused" }),
      item("c", { status: "completed" }),
    ]);
    expect(groups.active.length).toBe(1);
    expect(groups.paused.length).toBe(1);
    expect(groups.completed.length).toBe(1);
  });

  it("17. no fake demo venture in resolution", () => {
    const id = resolveDefaultVentureId([item("real-uuid")], new Map([["real-uuid", snapshot("real-uuid")]]));
    expect(id).toBe("real-uuid");
    expect(id).not.toContain("demo");
  });
});
