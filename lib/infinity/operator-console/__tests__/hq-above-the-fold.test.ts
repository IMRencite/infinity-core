import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emptyCodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import type { CodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import type { OperatorVentureSnapshot } from "../types";
import {
  codingPresentation,
  deriveCommandSystemReadiness,
  HQ_DESKTOP_REGION_ORDER,
  treasuryPresentation,
} from "../hq-infrastructure-priority";
import { ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";

const ROOT = join(process.cwd(), "components/dashboard/operator-console");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
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
    roomArtifacts: {},
    ...overrides,
  };
}

describe("HQ above-the-fold command restructure", () => {
  it("desktop DOM hierarchy is Welcome → Command → Scoreboard → Operating Floor → Infrastructure", () => {
    const consoleSource = readSource("venture-operator-console.tsx");
    const commandBar = readSource("venture-command-bar.tsx");
    expect(commandBar).toContain('data-hq-region="welcome"');
    expect(readSource("portfolio-executive-strip.tsx")).toContain('data-hq-region="scoreboard"');
    expect(readSource("hq-spatial-floor.tsx")).toContain('data-hq-region="operating-floor"');
    const commandIdx = consoleSource.indexOf('data-hq-region="command"');
    const scoreboardIdx = consoleSource.indexOf("<PortfolioExecutiveStrip");
    const floorIdx = consoleSource.indexOf("<HqSpatialFloor");
    const infraIdx = consoleSource.indexOf('data-hq-region="infrastructure"');
    expect([commandIdx, scoreboardIdx, floorIdx, infraIdx].every((index) => index >= 0)).toBe(true);
    expect(commandIdx).toBeLessThan(scoreboardIdx);
    expect(scoreboardIdx).toBeLessThan(floorIdx);
    expect(floorIdx).toBeLessThan(infraIdx);
    expect(HQ_DESKTOP_REGION_ORDER).toEqual(["welcome", "command", "scoreboard", "operating-floor", "infrastructure"]);

    const treasuryIdx = consoleSource.indexOf("<TreasuryCapitalStrip");
    const codingIdx = consoleSource.indexOf("<CodingIntelligenceStrip");
    expect(treasuryIdx).toBeGreaterThan(floorIdx);
    expect(codingIdx).toBeGreaterThan(floorIdx);
  });

  it("does not render a separate large autonomous-cycle status panel", () => {
    const consoleSource = readSource("venture-operator-console.tsx");
    expect(consoleSource).not.toContain("Favc1CycleHeader");
    expect(consoleSource).toContain("cycleMeta={snapshot.favc1Cycle");
    expect(readSource("command-chamber.tsx")).toContain("cycleKey");
    expect(readSource("command-chamber.tsx")).toContain("Command system status");
  });

  it("compresses the welcome header and keeps Command as the executive chamber", () => {
    const welcome = readSource("venture-command-bar.tsx");
    expect(welcome).toContain("HQ_WELCOME_TITLE");
    expect(welcome).toContain("py-2");
    expect(welcome).not.toContain("md:text-4xl");
    expect(readSource("command-chamber.tsx")).toContain("Decision core");
    expect(readSource("command-chamber.tsx")).toContain("InfinityRoomShell");
    expect(readSource("hq-spatial-floor.tsx")).not.toContain("CommandChamber");
  });

  it("presents idle Treasury as compact and allows expansion for active financial attention", () => {
    const idle = emptyTreasuryHqReadModel(ORG_A);
    expect(idle.state.providerFreshness).toBe("NOT_CONFIGURED");
    expect(treasuryPresentation(idle)).toBe("COMPACT");

    const active: TreasuryHqReadModel = {
      ...idle,
      requests: [{ status: "AUTHORIZED" } as TreasuryHqReadModel["requests"][number]],
    };
    expect(treasuryPresentation(active)).toBe("EXPANDED");

    const stale: TreasuryHqReadModel = {
      ...idle,
      state: { ...idle.state, providerFreshness: "STALE" },
    };
    expect(treasuryPresentation(stale)).toBe("EXPANDED");

    const strip = readSource("treasury-capital-strip.tsx");
    expect(strip).toContain("View Treasury");
    expect(strip).toContain("Internal capital");
    expect(strip).toContain("Available capital");
    expect(strip).toContain("Allocated capital");
    expect(strip).toContain("Unallocated capital");
    expect(strip).toContain("Bank cash");
    expect(strip).toContain("Monthly budget");
    expect(strip).toContain("Monthly spend");
    expect(strip).toContain('data-infrastructure-presentation={presentation}');
    expect(strip).toContain('presentation === "EXPANDED"');
    expect(strip).not.toMatch(/drawer|dialog|modal/i);
  });

  it("presents idle Coding Intelligence compactly and expands for an active run", () => {
    const idle = emptyCodingHqReadModel(ORG_A);
    expect(codingPresentation(idle)).toBe("COMPACT");
    const active: CodingHqReadModel = {
      ...idle,
      rows: [
        {
          runId: "run-1",
          venture: "v1",
          task: "Implement billing integration",
          provider: "Cursor",
          executionMode: "CURSOR_CLI",
          status: "RUNNING",
          duration: "4m 21s",
          knownCost: "ESTIMATE $0.42",
          filesAffected: 17,
          tests: "4",
          build: "UNKNOWN",
          repairAttempts: 0,
          validationState: "QA pending",
        },
      ],
    };
    expect(codingPresentation(active)).toBe("EXPANDED");

    const strip = readSource("coding-intelligence-strip.tsx");
    expect(strip).toContain("Native Coder");
    expect(strip).toContain("Cursor");
    expect(strip).toContain("Active Runs");
    expect(strip).not.toContain("Capabilities:");
    expect(strip).toContain('presentation === "EXPANDED"');
    expect(strip).not.toMatch(/drawer|dialog|\borb\b/i);
  });

  it("shows truthful Command system indicators from loaded state", () => {
    const treasury = emptyTreasuryHqReadModel(ORG_A);
    const coding = emptyCodingHqReadModel(ORG_A);
    const indicators = deriveCommandSystemReadiness({
      snapshot: idleSnapshot(),
      treasury,
      coding,
    });
    expect(indicators.find((item) => item.id === "treasury")?.status).toBe("NOT CONFIGURED");
    expect(indicators.find((item) => item.id === "cursor")?.status).toBe("NOT CONFIGURED");
    expect(indicators.find((item) => item.id === "native_coder")?.status).toBe("READY");
    expect(indicators.find((item) => item.id === "commercialization")?.status).toBe("ENGINE VERIFIED · MUTATIONS LOCKED");
    expect(indicators.find((item) => item.id === "ai_brain")?.status).not.toBe("READY");
  });

  it("preserves semantic order and overflow containment for tablet/mobile", () => {
    const consoleSource = readSource("venture-operator-console.tsx");
    expect(consoleSource).toContain("overflow-x-hidden");
    expect(consoleSource).not.toMatch(/md:order-|order-\d/);
    expect(readSource("hq-spatial-floor.tsx")).toContain("hq-floor-columns");
    expect(consoleSource.indexOf("<CommandChamber")).toBeLessThan(consoleSource.indexOf("<HqSpatialFloor"));
  });

  it("keeps room parity, holographic detail, ambient agents, and dark theme", () => {
    expect(readSource("department-room.tsx")).toContain("InfinityRoomShell");
    expect(readSource("hq-spatial-floor.tsx")).toContain("LIFECYCLE_ROOM_SEQUENCE");
    expect(readSource("artifacts/artifact-inspector-modal.tsx")).toContain("HQOutputDetail");
    expect(readSource("command-chamber.tsx")).toContain("WorkerNode");
    expect(readSource("infinity-room/room-presence-track.tsx")).toContain("Agents in room");
    expect(readSource("infinity-room/room-presence-track.tsx")).not.toMatch(/Workers|worker presence|No workers present/i);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".infinity-hq");
    expect(css).toContain(".hq-room-shell--command");
  });

  it("does not regress Treasury, Coding, or deep linking", () => {
    const consoleSource = readSource("venture-operator-console.tsx");
    expect(consoleSource).toContain("TreasuryCapitalStrip");
    expect(consoleSource).toContain("TreasuryControlCenter");
    expect(consoleSource).toContain("CodingIntelligenceStrip");
    expect(consoleSource).toContain("CommercializationReadinessStrip");
    expect(consoleSource).toContain("detailFromUrl");
    expect(consoleSource).toContain("ArtifactInspectorModal");
  });
});
