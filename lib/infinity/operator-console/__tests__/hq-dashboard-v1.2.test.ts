import { describe, it, expect } from "vitest";
import {
  humanizeDepartmentHeadline,
  humanizeDepartmentState,
  humanizeEventSummary,
  humanizeTask,
  humanizeCurrentActivityNarration,
  humanizeProviderSession,
  buildRoomArtifacts,
} from "../humanize";
import { buildWorkerNodes, workerNodesForDepartment } from "../worker-nodes";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import type {
  OperatorActivityEvent,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorVentureSnapshot,
} from "../types";

function dept(
  id: OperatorDepartmentSnapshot["id"],
  overrides: Partial<OperatorDepartmentSnapshot> = {},
): OperatorDepartmentSnapshot {
  return {
    id,
    label: id,
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
    ...overrides,
  };
}

function provider(overrides: Partial<OperatorProviderSession>): OperatorProviderSession {
  return {
    sessionId: "s1",
    departmentId: "product_lab",
    engine: "product_asset_builder",
    role: "IMPLEMENTER",
    provider: "openai",
    model: "gpt-4.1-mini",
    status: "running",
    task: "PAB V2.1 build task",
    costUsd: 0.01,
    costKnown: true,
    startedAt: null,
    filesChanged: [],
    ...overrides,
  };
}

describe("HQ Dashboard V1.2 — human-friendly language", () => {
  it("1. humanizes technical task strings", () => {
    expect(humanizeTask("PAB V2.1 build task")).toBe("Building the first working version");
    expect(humanizeTask("Generate image")).toBe("Creating a new visual asset");
    expect(humanizeTask("Grounded research")).toBe("Studying the market and validating demand");
  });

  it("2. humanizes room headlines by department and state", () => {
    expect(humanizeDepartmentHeadline("product_lab", "RUNNING")).toBe("Building the first working version");
    expect(humanizeDepartmentHeadline("executive_office", "RUNNING")).toBe("Choosing what happens next");
    expect(humanizeDepartmentHeadline("opportunity_lab", "NOT_STARTED")).toBe("Standing by to scan");
  });

  it("3. humanizes mission log event summaries", () => {
    const event: Pick<OperatorActivityEvent, "eventType" | "summary" | "status"> = {
      eventType: "monetization_plan",
      summary: "MonetizationPlan First revenue path",
      status: "ready",
    };
    expect(humanizeEventSummary(event)).toBe("Defined the first revenue strategy: First revenue path");
    expect(
      humanizeEventSummary({
        eventType: "learning_decision",
        summary: "LearningDecision: REPAIR",
        status: "READY",
      }),
    ).toBe("Chose the next repair mission");
  });

  it("4. humanizes current activity narration", () => {
    const activity: OperatorCurrentActivity = {
      active: true,
      departmentId: "product_lab",
      departmentLabel: "Product Lab",
      engine: "product_asset_builder",
      task: "PAB V2.1 build task",
      provider: "openai",
      model: "gpt-4.1-mini",
      status: "RUNNING",
      startedAt: null,
      elapsedSeconds: 42,
      attempt: null,
      costUsd: 0.0184,
      costKnown: true,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    };
    expect(humanizeCurrentActivityNarration(activity)).toBe("Building the first working version");
  });

  it("5. preserves raw technical fields after enrichment", () => {
    const snapshot: OperatorVentureSnapshot = {
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
        ventureName: "Test Venture",
        ventureType: null,
        assemblyStatus: "active",
        readinessStatus: null,
        launchStage: null,
        correlationIds: ["v1"],
      },
      overallStatus: "RUNNING",
      currentDepartments: ["product_lab"],
      currentActivity: {
        active: true,
        departmentId: "product_lab",
        departmentLabel: "Product Lab",
        engine: "product_asset_builder",
        task: "PAB V2.1 build task",
        provider: "openai",
        model: "gpt-4.1-mini",
        status: "RUNNING",
        startedAt: null,
        elapsedSeconds: 10,
        attempt: null,
        costUsd: 0.01,
        costKnown: true,
        artifactStatus: null,
        latestActivitySummary: null,
        latestActivityAt: null,
      },
      departments: [
        dept("product_lab", {
          state: "RUNNING",
          isActive: true,
          currentTask: "PAB V2.1 build task",
          recordCount: 3,
          detail: { productionArtifacts: [{}], changeSets: [{}, {}] },
        }),
      ],
      pipeline: { stagesCompleted: 1, stagesTotal: 11, stageLabels: [] },
      activityFeed: [
        {
          id: "e1",
          timestamp: new Date().toISOString(),
          departmentId: "product_lab",
          departmentLabel: "Product Lab",
          engine: "product_asset_builder",
          eventType: "pab_run",
          summary: "PAB V2.1 run running",
          status: "running",
          relatedIds: {},
          provider: null,
          model: null,
          costUsd: null,
          costKnown: false,
        },
      ],
      providers: [provider({})],
      costs: { knownSpendUsd: 0.01, unpricedProviderCalls: 0, breakdown: [] },
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

    const enriched = enrichOperatorSnapshot(snapshot);
    expect(enriched.departments[0]?.currentTask).toBe("PAB V2.1 build task");
    expect(enriched.departments[0]?.displayTask).toBe("Building the first working version");
    expect(enriched.activityFeed[0]?.summary).toBe("PAB V2.1 run running");
    expect(enriched.activityFeed[0]?.displaySummary).toContain("Building");
  });
});

describe("HQ Dashboard V1.2 — worker nodes", () => {
  it("6. maps running provider sessions to active nodes", () => {
    const nodes = buildWorkerNodes(
      [provider({ status: "running" }), provider({ sessionId: "s2", role: "REVIEWER", status: "waiting" })],
      [dept("product_lab", { state: "RUNNING", isActive: true })],
    );
    expect(nodes.some((n) => n.isActive && n.displayRole === "Implementer")).toBe(true);
    expect(workerNodesForDepartment(nodes, "product_lab").length).toBeGreaterThan(0);
  });

  it("7. shows generic active node when department is running without sessions", () => {
    const nodes = buildWorkerNodes([], [dept("research_department", { state: "RUNNING", isActive: true })]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.isActive).toBe(true);
    expect(nodes[0]?.departmentId).toBe("research_department");
  });

  it("8. inactive rooms have no active fake nodes", () => {
    const nodes = buildWorkerNodes([], [dept("quality_control", { state: "NOT_STARTED", recordCount: 0 })]);
    expect(nodes.filter((n) => n.isActive)).toHaveLength(0);
  });

  it("9. blocked rooms show dimmed warning node", () => {
    const nodes = buildWorkerNodes([], [dept("launch_operations", { state: "BLOCKED", recordCount: 2 })]);
    expect(nodes[0]?.status).toBe("BLOCKED");
    expect(nodes[0]?.isDormant).toBe(true);
  });

  it("10. product lab can show multiple nodes", () => {
    const nodes = buildWorkerNodes(
      [
        provider({ sessionId: "a", status: "running" }),
        provider({ sessionId: "b", role: "REVIEWER", status: "running" }),
      ],
      [dept("product_lab", { state: "RUNNING", isActive: true })],
    );
    expect(nodes.length).toBe(2);
  });
});

describe("HQ Dashboard V1.2 — room artifacts and detail summaries", () => {
  it("11. derives real output badges from department detail", () => {
    const artifacts = buildRoomArtifacts(
      dept("product_lab", {
        state: "RUNNING",
        detail: { productionArtifacts: [{}], changeSets: [{}, {}] },
      }),
    );
    expect(artifacts.some((a) => a.label.includes("production artifact"))).toBe(true);
    expect(artifacts.some((a) => a.label.includes("change set"))).toBe(true);
  });

  it("12. humanizes provider session labels for detail panel", () => {
    const display = humanizeProviderSession(provider({}));
    expect(display.displayRole).toBe("Implementer");
    expect(display.displayTask).toBe("Building the first working version");
  });

  it("13. humanizes department UI state labels", () => {
    expect(humanizeDepartmentState("RUNNING")).toBe("In progress");
    expect(humanizeDepartmentState("BLOCKED")).toBe("Blocked");
  });
});
