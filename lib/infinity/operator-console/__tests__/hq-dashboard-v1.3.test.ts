import { describe, it, expect } from "vitest";
import { HQ_WELCOME_TITLE, ROOM_DISPLAY_NAMES, getRoomDisplayNames } from "../room-naming";
import {
  humanizeCurrentActivityNarration,
  humanizeDepartmentHeadline,
  humanizeEventSummary,
  humanizeTask,
} from "../humanize";
import { buildWorkerNodes } from "../worker-nodes";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import type {
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorVentureSnapshot,
} from "../types";

function dept(id: OperatorDepartmentSnapshot["id"], overrides: Partial<OperatorDepartmentSnapshot> = {}): OperatorDepartmentSnapshot {
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

describe("HQ Dashboard V1.3 — welcome header and room naming", () => {
  it("1. welcome title is Welcome to Infinity OS", () => {
    expect(HQ_WELCOME_TITLE).toBe("Welcome to Infinity OS");
  });

  it("2. department display-name mapping exists for all rooms", () => {
    expect(Object.keys(ROOM_DISPLAY_NAMES)).toHaveLength(11);
    expect(getRoomDisplayNames("product_lab").displayName).toBe("Creation Lab");
    expect(getRoomDisplayNames("executive_office").displayName).toBe("Command");
  });

  it("3. supporting labels clarify room purpose", () => {
    expect(getRoomDisplayNames("company_operations").supportingLabel).toContain("business plan");
    expect(getRoomDisplayNames("product_lab").supportingLabel).toContain("Builds the product");
  });
});

describe("HQ Dashboard V1.3 — narration and headlines", () => {
  it("4. humanizes tasks with V1.3 phrasing", () => {
    expect(humanizeTask("PAB V2.1 build task")).toBe("Building the first working version");
    expect(humanizeTask("Grounded research")).toBe("Studying the market and validating demand");
  });

  it("5. mission log humanization uses premium phrasing", () => {
    expect(
      humanizeEventSummary({
        eventType: "learning_decision",
        summary: "LearningDecision: REPAIR",
        status: "READY",
      }),
    ).toBe("Chose the next repair mission");
  });

  it("6. room activity headlines updated", () => {
    expect(humanizeDepartmentHeadline("product_lab", "RUNNING")).toBe("Building the first working version");
  });

  it("7. current activity reads as direct narration", () => {
    const activity: OperatorCurrentActivity = {
      active: true,
      departmentId: "product_lab",
      departmentLabel: "Product Lab",
      departmentDisplayName: "BUILD LAB",
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
});

describe("HQ Dashboard V1.3 — worker node motion state", () => {
  const provider = (overrides: Partial<OperatorProviderSession>): OperatorProviderSession => ({
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
  });

  it("8. running room gets motion-capable node state", () => {
    const nodes = buildWorkerNodes([provider({ status: "running" })], [dept("product_lab", { state: "RUNNING", isActive: true })]);
    expect(nodes.some((n) => n.motionActive)).toBe(true);
  });

  it("9. waiting room does not have motion-active nodes", () => {
    const nodes = buildWorkerNodes([provider({ status: "waiting" })], [dept("product_lab", { state: "WAITING" })]);
    expect(nodes.every((n) => !n.motionActive)).toBe(true);
  });

  it("10. blocked room gets stalled node without motion", () => {
    const nodes = buildWorkerNodes([], [dept("launch_operations", { state: "BLOCKED", recordCount: 2 })]);
    expect(nodes[0]?.motionActive).toBe(false);
    expect(nodes[0]?.status).toBe("BLOCKED");
  });

  it("11. idle room has no fake active nodes", () => {
    const nodes = buildWorkerNodes([], [dept("quality_control", { state: "NOT_STARTED", recordCount: 0 })]);
    expect(nodes.filter((n) => n.isActive || n.motionActive)).toHaveLength(0);
  });

  it("12. enrichment preserves raw fields for System View", () => {
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
      departments: [dept("product_lab", { state: "RUNNING", isActive: true, currentTask: "PAB V2.1 build task" })],
      pipeline: { stagesCompleted: 1, stagesTotal: 11, stageLabels: [] },
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

    const enriched = enrichOperatorSnapshot(snapshot);
    expect(enriched.departments[0]?.label).toBe("product_lab");
    expect(enriched.departments[0]?.currentTask).toBe("PAB V2.1 build task");
    expect(enriched.departments[0]?.displayName).toBe("Creation Lab");
  });
});
