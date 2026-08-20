import { describe, it, expect } from "vitest";
import {
  HQ_WELCOME_TITLE,
  LIFECYCLE_ROOM_SEQUENCE,
  COMMAND_ROOM_ID,
  FINAL_ROOM_DISPLAY_NAMES,
  getRoomDisplayNames,
} from "../room-naming";
import { humanizeDepartmentHeadline } from "../humanize";
import { buildWorkerNodes } from "../worker-nodes";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "../types";

describe("HQ Dashboard V1.4 — welcome and room names", () => {
  it("1. Welcome to Infinity OS exists as primary title", () => {
    expect(HQ_WELCOME_TITLE).toBe("Welcome to Infinity OS");
  });

  it("2. final locked room-name mapping", () => {
    expect(FINAL_ROOM_DISPLAY_NAMES).toEqual([
      "Venture Radar",
      "Research Grid",
      "Profit Lab",
      "Blueprint Lab",
      "Growth Nexus",
      "Design Core",
      "Creation Lab",
      "Validation Station",
      "Deployment Depot",
      "Signal Intelligence",
      "Command",
    ]);
  });

  it("3. Command is separate from lifecycle sequence", () => {
    expect(COMMAND_ROOM_ID).toBe("executive_office");
    expect(LIFECYCLE_ROOM_SEQUENCE).toHaveLength(10);
    expect(LIFECYCLE_ROOM_SEQUENCE.includes("executive_office")).toBe(false);
    expect(LIFECYCLE_ROOM_SEQUENCE[0]).toBe("opportunity_lab");
    expect(LIFECYCLE_ROOM_SEQUENCE.at(-1)).toBe("intelligence_center");
  });

  it("4. supporting labels are concise", () => {
    expect(getRoomDisplayNames("product_lab").supportingLabel).toBe(
      "Builds the product, website, software, assets, and systems the venture needs.",
    );
    expect(getRoomDisplayNames("executive_office").displayName).toBe("Command");
  });
});

describe("HQ Dashboard V1.4 — activity and routing", () => {
  it("5. room human-friendly activity headlines", () => {
    expect(humanizeDepartmentHeadline("opportunity_lab", "RUNNING")).toBe("Scanning for promising venture ideas");
    expect(humanizeDepartmentHeadline("creative_studio", "RUNNING")).toBe("Creating visual direction");
    expect(humanizeDepartmentHeadline("executive_office", "RUNNING")).toBe("Choosing what happens next");
  });

  it("6. enrichment applies final display names", () => {
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
      departments: [{
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
      }],
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

    const enriched = enrichOperatorSnapshot(snapshot);
    expect(enriched.departments[0]?.displayName).toBe("Creation Lab");
    expect(enriched.departments[0]?.label).toBe("Product Lab");
    expect(enriched.departments[0]?.currentTask).toBe("PAB V2.1 build task");
    expect(enriched.departments[0]?.provider).toBe("openai");
  });

  it("7. worker motion state unchanged for running rooms", () => {
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
      recordCount: 0,
      detail: {},
      isActive: true,
      isNextMissionTarget: false,
    };
    const nodes = buildWorkerNodes([], [dept]);
    expect(nodes[0]?.motionActive).toBe(true);
  });

  it("8. idle room has no fake active nodes", () => {
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
});
