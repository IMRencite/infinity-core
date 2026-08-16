import { describe, it, expect } from "vitest";
import {
  deriveDepartmentOperationalState,
  computeFurthestLifecycleIndex,
  deriveDepartmentState,
  deriveDepartmentStateWithSemantics,
  departmentStateClasses,
  departmentVisualState,
} from "../status-derivation";
import { getRoomWorkZones, HQ_FLOOR_LAYOUT } from "../room-work-zones";
import { humanizeDepartmentHeadline } from "../humanize";
import { buildWorkerNodes } from "../worker-nodes";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import { LIFECYCLE_ROOM_SEQUENCE, COMMAND_ROOM_ID } from "../room-naming";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "../types";

describe("HQ Dashboard V1.5 — spatial floor structure", () => {
  it("1. shared spatial floor layout constants exist", () => {
    expect(HQ_FLOOR_LAYOUT.productionWingSpan).toBe("lg:col-span-11");
    expect(LIFECYCLE_ROOM_SEQUENCE).toHaveLength(10);
    expect(COMMAND_ROOM_ID).toBe("executive_office");
  });

  it("2. each room has workstation zone config", () => {
    for (const id of LIFECYCLE_ROOM_SEQUENCE) {
      const zones = getRoomWorkZones(id);
      expect(zones.intake.length).toBeGreaterThan(0);
      expect(zones.process.length).toBeGreaterThan(0);
      expect(zones.output.length).toBeGreaterThan(0);
    }
    expect(getRoomWorkZones("executive_office").motif).toBe("command");
  });
});

describe("HQ Dashboard V1.5 — failure semantics", () => {
  it("3. latest completed run wins over older failure", () => {
    const result = deriveDepartmentOperationalState({
      hasRecords: true,
      timeline: [
        { status: "failed", timestamp: "2026-01-01T00:00:00Z" },
        { status: "completed", timestamp: "2026-01-02T00:00:00Z" },
      ],
    });
    expect(result.state).toBe("COMPLETE");
    expect(result.failureSemantics).toBe("RECOVERED");
  });

  it("4. latest failed run is current blocking failure", () => {
    const result = deriveDepartmentOperationalState({
      hasRecords: true,
      timeline: [{ status: "failed", timestamp: "2026-01-02T00:00:00Z" }],
      departmentLifecycleOrder: 3,
      furthestVentureLifecycleIndex: 3,
    });
    expect(result.state).toBe("FAILED");
    expect(result.failureSemantics).toBe("CURRENT_BLOCKING_FAILURE");
  });

  it("5. historical failure when venture moved beyond stage", () => {
    const result = deriveDepartmentOperationalState({
      hasRecords: true,
      timeline: [{ status: "failed", timestamp: "2026-01-01T00:00:00Z" }],
      departmentLifecycleOrder: 3,
      furthestVentureLifecycleIndex: 7,
    });
    expect(result.state).not.toBe("FAILED");
    expect(result.failureSemantics).toBe("HISTORICAL_FAILURE");
  });

  it("6. running work overrides failure history", () => {
    const result = deriveDepartmentOperationalState({
      hasRecords: true,
      timeline: [
        { status: "failed", timestamp: "2026-01-01T00:00:00Z" },
        { status: "running", timestamp: "2026-01-03T00:00:00Z" },
      ],
    });
    expect(result.state).toBe("RUNNING");
    expect(result.failureSemantics).toBe("UNKNOWN");
  });

  it("7. deriveDepartmentState uses timeline precedence", () => {
    expect(
      deriveDepartmentState({
        runStatuses: ["failed", "completed"],
        hasRecords: true,
        timeline: [
          { status: "failed", timestamp: "2026-01-01T00:00:00Z" },
          { status: "completed", timestamp: "2026-01-02T00:00:00Z" },
        ],
      }),
    ).toBe("COMPLETE");
  });

  it("8. historical failure does not use failed visual state", () => {
    expect(departmentVisualState("COMPLETE", "HISTORICAL_FAILURE")).toBe("COMPLETE");
    expect(departmentStateClasses("COMPLETE", "HISTORICAL_FAILURE")).toContain("amber");
  });

  it("9. human-friendly current failure text", () => {
    expect(humanizeDepartmentHeadline("strategy_finance", "FAILED", "CURRENT_BLOCKING_FAILURE")).toBe(
      "Infinity could not complete the revenue strategy",
    );
  });

  it("10. human-friendly historical issue text", () => {
    expect(humanizeDepartmentHeadline("strategy_finance", "COMPLETE", "HISTORICAL_FAILURE")).toBe(
      "An earlier strategy pass did not complete",
    );
  });

  it("11. recovered stage uses complete headline", () => {
    expect(humanizeDepartmentHeadline("strategy_finance", "COMPLETE", "RECOVERED")).toBe(
      "Revenue strategy defined",
    );
  });

  it("12. raw failure preserved via latestRawStatus in snapshot build path", () => {
    const derived = deriveDepartmentStateWithSemantics({
      runStatuses: ["failed"],
      hasRecords: true,
      timeline: [{ status: "failed", timestamp: "2026-01-01T00:00:00Z" }],
    });
    expect(derived.latestRawStatus).toBe("failed");
  });
});

describe("HQ Dashboard V1.5 — orb and worker nodes", () => {
  it("13. active orb motion for running room", () => {
    const dept: OperatorDepartmentSnapshot = {
      id: "product_lab",
      label: "Product Lab",
      state: "RUNNING",
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 1,
      detail: {},
      isActive: true,
      isNextMissionTarget: false,
    };
    const nodes = buildWorkerNodes([], [dept]);
    expect(nodes[0]?.motionActive).toBe(true);
    expect(nodes[0]?.nodeId).toContain("product_lab");
  });

  it("14. idle room has no fake active nodes", () => {
    const nodes = buildWorkerNodes([], [{
      id: "quality_control",
      label: "Quality Control",
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
    }]);
    expect(nodes.filter((n) => n.motionActive)).toHaveLength(0);
  });

  it("15. historical failure does not spawn dormant failed orb", () => {
    const nodes = buildWorkerNodes([], [{
      id: "strategy_finance",
      label: "Strategy",
      state: "COMPLETE",
      failureSemantics: "HISTORICAL_FAILURE",
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 2,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    }]);
    expect(nodes.filter((n) => n.status === "FAILED")).toHaveLength(0);
  });

  it("16. blocked orb still shown for current blocking failure", () => {
    const nodes = buildWorkerNodes([], [{
      id: "strategy_finance",
      label: "Strategy",
      state: "FAILED",
      failureSemantics: "CURRENT_BLOCKING_FAILURE",
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 1,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    }]);
    expect(nodes.some((n) => n.status === "FAILED")).toBe(true);
  });
});

describe("HQ Dashboard V1.5 — enrichment and stability", () => {
  const baseSnapshot = (): OperatorVentureSnapshot => ({
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: "v1",
      organizationId: "org",
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
  });

  it("17. enrichment applies failure-aware headlines", () => {
    const snapshot = baseSnapshot();
    snapshot.departments = [{
      id: "strategy_finance",
      label: "Strategy",
      state: "COMPLETE",
      failureSemantics: "HISTORICAL_FAILURE",
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 2,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    }];
    const enriched = enrichOperatorSnapshot(snapshot);
    expect(enriched.departments[0]?.displayHeadline).toContain("earlier strategy pass");
  });

  it("18. stable worker-node keys across enrichment", () => {
    const dept: OperatorDepartmentSnapshot = {
      id: "product_lab",
      label: "Product Lab",
      state: "RUNNING",
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 1,
      detail: {},
      isActive: true,
      isNextMissionTarget: false,
    };
    const first = buildWorkerNodes([], [dept]);
    const second = buildWorkerNodes([], [dept]);
    expect(first.map((n) => n.nodeId)).toEqual(second.map((n) => n.nodeId));
  });

  it("19. computeFurthestLifecycleIndex from department states", () => {
    expect(
      computeFurthestLifecycleIndex([
        { lifecycleOrder: 1, state: "COMPLETE", recordCount: 1 },
        { lifecycleOrder: 7, state: "RUNNING", recordCount: 3 },
      ]),
    ).toBe(7);
  });

  it("20. no technical IDs required on display layer", () => {
    const snapshot = baseSnapshot();
    snapshot.departments = [{
      id: "product_lab",
      label: "Product Lab",
      state: "RUNNING",
      engines: [],
      summary: null,
      currentTask: "PAB V2.1 build task",
      provider: "openai",
      model: "gpt-4.1-mini",
      costUsd: 0.01,
      costKnown: true,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 1,
      detail: {},
      isActive: true,
      isNextMissionTarget: false,
    }];
    const enriched = enrichOperatorSnapshot(snapshot);
    expect(enriched.departments[0]?.displayHeadline).not.toContain("gpt-4.1");
    expect(enriched.departments[0]?.displayName).toBe("Creation Lab");
  });
});

describe("HQ Dashboard V1.5 — connector and command semantics", () => {
  it("21. command remains separate from lifecycle grid", () => {
    expect(LIFECYCLE_ROOM_SEQUENCE.includes("executive_office")).toBe(false);
  });

  it("22. product lab workflow zones match spec labels", () => {
    const zones = getRoomWorkZones("product_lab");
    expect(zones.intake).toBe("Build task");
    expect(zones.process).toBe("Implementation");
    expect(zones.output).toBe("Artifact");
  });

  it("23. validation station checkpoint motif", () => {
    expect(getRoomWorkZones("quality_control").motif).toBe("checkpoint");
  });

  it("24. venture radar wider zone config", () => {
    expect(getRoomWorkZones("opportunity_lab").motif).toBe("radar");
  });

  it("25. unknown failure semantics when no records", () => {
    const result = deriveDepartmentOperationalState({ hasRecords: false, timeline: [] });
    expect(result.failureSemantics).toBe("UNKNOWN");
  });

  it("26. duplicate node keys avoided per department role", () => {
    const dept: OperatorDepartmentSnapshot = {
      id: "product_lab",
      label: "Product Lab",
      state: "RUNNING",
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 1,
      detail: {},
      isActive: true,
      isNextMissionTarget: false,
    };
    const nodes = buildWorkerNodes([], [dept]);
    const ids = nodes.map((n) => n.nodeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
