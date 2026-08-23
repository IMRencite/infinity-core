import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { HqWorkArtifact } from "../artifacts/types";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "../types";
import {
  HQ_INSPECTION_WRITE_BOUNDARY,
  filterArtifactsForInspection,
  hqDashboardInspectionPath,
  inspectionRefFromVentureId,
  isRoomCompatibleWithInspection,
  resolveHqInspectionContext,
  systemsViewForInspection,
} from "../inspection-context";
import { HqInspectionWorkspace } from "@/components/dashboard/operator-console/hq-inspection-workspace";
import { hqVentureInspectionHref } from "@/components/dashboard/operator-console/hq-venture-inspection-link";

const CANDIDATE_A = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_B = "22222222-2222-4222-8222-222222222222";
const VENTURE_ID = "venture-real";
const ROOT = process.cwd();
const COMPONENTS = join(ROOT, "components/dashboard/operator-console");

function artifact(
  partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title" | "sourceRecordId">,
): HqWorkArtifact {
  return {
    roomId: "opportunity_lab",
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "opportunity_candidate",
    metadata: {},
    ...partial,
  };
}

function department(id: OperatorDepartmentSnapshot["id"], workArtifacts: HqWorkArtifact[] = []): OperatorDepartmentSnapshot {
  return {
    id,
    label: id,
    engines: [],
    state: "COMPLETE",
    isActive: false,
    isNextMissionTarget: false,
    summary: null,
    currentTask: null,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: workArtifacts.length,
    failureSemantics: null,
    detail: {},
    workArtifacts,
  };
}

function snapshot(overrides: Partial<OperatorVentureSnapshot> = {}): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: VENTURE_ID,
      organizationId: "org",
      missionId: "m1",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Harbor Roofing",
      ventureType: "local_services",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      origin: "Founder",
      correlationIds: [],
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
    departments: [
      department("opportunity_lab", [
        artifact({
          id: "opp-a",
          artifactType: "opportunity_candidate",
          title: "Commercial Real Estate Lease Comparison",
          sourceRecordId: CANDIDATE_A,
          metadata: { candidateId: CANDIDATE_A },
        }),
        artifact({
          id: "opp-b",
          artifactType: "opportunity_candidate",
          title: "AI-Powered RFP & Security Platform",
          sourceRecordId: CANDIDATE_B,
          metadata: { candidateId: CANDIDATE_B },
        }),
      ]),
      department("research_department", [
        artifact({
          id: "research-a",
          roomId: "research_department",
          artifactType: "research_packet",
          title: "Lease comparison evidence",
          sourceRecordId: "research-a",
          sourceRecordType: "research_run",
          metadata: { candidateId: CANDIDATE_A },
        }),
        artifact({
          id: "research-b",
          roomId: "research_department",
          artifactType: "research_packet",
          title: "RFP evidence",
          sourceRecordId: "research-b",
          sourceRecordType: "research_run",
          metadata: { candidateId: CANDIDATE_B },
        }),
      ]),
      department("strategy_finance", [
        artifact({
          id: "plan-a",
          roomId: "strategy_finance",
          artifactType: "monetization_plan",
          title: "SaaS subscription",
          sourceRecordId: "analysis-a",
          sourceRecordType: "monetization_candidate_analysis",
          metadata: { candidateId: CANDIDATE_A },
        }),
        artifact({
          id: "plan-b",
          roomId: "strategy_finance",
          artifactType: "monetization_plan",
          title: "Marketplace take rate",
          sourceRecordId: "analysis-b",
          sourceRecordType: "monetization_candidate_analysis",
          metadata: { candidateId: CANDIDATE_B },
        }),
      ]),
      department("quality_control", [
        artifact({
          id: "val-a",
          roomId: "quality_control",
          artifactType: "assumption",
          title: "Validation assumption A",
          sourceRecordId: "asm-a",
          sourceRecordType: "assumption",
          metadata: { candidateId: CANDIDATE_A },
        }),
      ]),
      department("systems_architect"),
    ],
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

function readComponent(relativePath: string): string {
  return readFileSync(join(COMPONENTS, relativePath), "utf8");
}

describe("HQ in-place inspection workspace", () => {
  it("keeps venture and opportunity HQ clicks on the /dashboard shell", () => {
    expect(hqVentureInspectionHref(VENTURE_ID)).toBe(hqDashboardInspectionPath({ entityType: "VENTURE", entityId: VENTURE_ID }));
    expect(hqVentureInspectionHref(VENTURE_ID)).toContain("/dashboard?");
    expect(hqVentureInspectionHref(VENTURE_ID)).not.toContain("/dashboard/ventures/");
    expect(inspectionRefFromVentureId(VENTURE_ID)?.entityType).toBe("VENTURE");

    const opportunityCards = readComponent("artifacts/primitives.tsx");
    expect(opportunityCards).toContain('data-hq-inspection-card={inspectionRef ? "opportunity_candidate"');
    expect(opportunityCards).toContain("selectInspection");
    expect(opportunityCards).not.toContain("/dashboard/ventures/");
    expect(opportunityCards).not.toContain("router.push");
    expect(opportunityCards).not.toMatch(/function DecisionToken[\s\S]*selectInspection/);

    const commandBar = readComponent("venture-operator-console.tsx");
    expect(commandBar).toContain("hqDashboardInspectionPath");
    expect(commandBar).toContain("HqInspectionWorkspace");
    expect(commandBar).toContain("scroll: false");
    expect(commandBar).toMatch(/const handleVentureChange = \(id: string\) => \{[\s\S]{0,220}hqDashboardInspectionPath/);
    expect(commandBar).not.toMatch(/const handleVentureChange = \(id: string\) => \{[\s\S]{0,220}\/dashboard\/ventures\//);

    const idle = readComponent("hq-idle-shell.tsx");
    expect(idle).toContain("HqVentureInspectionLink");
    expect(idle).not.toContain("/dashboard/ventures/");

    const selector = readComponent("venture-selector.tsx");
    expect(selector).toContain("hqDashboardInspectionPath");
    expect(selector).not.toContain("/dashboard/ventures/");

    const portfolio = readComponent("portfolio-executive-strip.tsx");
    const earners = readComponent("top-earners-panel.tsx");
    expect(portfolio).toContain("HqVentureInspectionLink");
    expect(portfolio).not.toContain("/dashboard/ventures/");
    expect(earners).toContain("HqVentureInspectionLink");
    expect(earners).not.toContain("/dashboard/ventures/");

    const dashboardPage = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    expect(dashboardPage).toContain("parseInspectionQuery");
    expect(dashboardPage).toContain("InfinityHqExperience");
    expect(dashboardPage).toContain("preferredVentureId");
  });

  it("opens a workspace with the inspected entity name and type", () => {
    const hq = snapshot();
    const candidate = resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A });
    const candidateHtml = renderToStaticMarkup(
      createElement(HqInspectionWorkspace, {
        snapshot: hq,
        context: candidate,
        systemsView: systemsViewForInspection(hq, candidate, null),
        open: true,
        onClose: () => undefined,
      }),
    );
    expect(candidateHtml).toContain("data-hq-inspection-workspace=\"true\"");
    expect(candidateHtml).toContain("Commercial Real Estate Lease Comparison");
    expect(candidateHtml).toContain("Opportunity Candidate");
    expect(candidateHtml).toContain("Opportunity Blueprint");
    expect(candidateHtml).toContain("data-hq-inspection-workspace-back");
    expect(candidateHtml).toContain("Back to HQ");
    expect(candidateHtml).toContain("Close inspection");
    expect(candidateHtml).toContain('data-hq-inspection-tab="research_department"');
    expect(candidateHtml).toContain('data-hq-inspection-tab="strategy_finance"');
    expect(candidateHtml).toContain('data-hq-inspection-tab="quality_control"');
    expect(candidateHtml).toContain('data-hq-inspection-tab="systems_architect"');

    const venture = resolveHqInspectionContext(hq, { entityType: "VENTURE", entityId: VENTURE_ID });
    const ventureHtml = renderToStaticMarkup(
      createElement(HqInspectionWorkspace, {
        snapshot: hq,
        context: venture,
        systemsView: systemsViewForInspection(hq, venture, null),
        open: true,
        onClose: () => undefined,
      }),
    );
    expect(ventureHtml).toContain("Harbor Roofing");
    expect(ventureHtml).toContain("Venture");
    expect(ventureHtml).toContain("Venture operating view");
    expect(ventureHtml).not.toContain("Opportunity Candidate");
  });

  it("keeps compatible rooms bound to the inspected entity and does not mutate business state", () => {
    const hq = snapshot();
    const candidate = resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A });
    expect(isRoomCompatibleWithInspection("systems_architect", candidate)).toBe(true);
    expect(isRoomCompatibleWithInspection("research_department", candidate)).toBe(true);
    expect(isRoomCompatibleWithInspection("strategy_finance", candidate)).toBe(true);
    expect(isRoomCompatibleWithInspection("quality_control", candidate)).toBe(true);
    expect(systemsViewForInspection(hq, candidate, null)?.entityId).toBe(CANDIDATE_A);
    expect(
      filterArtifactsForInspection(
        hq.departments.find((dept) => dept.id === "research_department")!.workArtifacts ?? [],
        candidate,
        "research_department",
      ).map((item) => item.id),
    ).toEqual(["research-a"]);
    expect(
      filterArtifactsForInspection(
        hq.departments.find((dept) => dept.id === "strategy_finance")!.workArtifacts ?? [],
        candidate,
        "strategy_finance",
      ).map((item) => item.id),
    ).toEqual(["plan-a"]);
    expect(
      filterArtifactsForInspection(
        hq.departments.find((dept) => dept.id === "quality_control")!.workArtifacts ?? [],
        candidate,
        "quality_control",
      ).map((item) => item.id),
    ).toEqual(["val-a"]);

    const room = readComponent("department-room.tsx");
    const detail = readComponent("department-detail-panel.tsx");
    const consoleSource = readComponent("venture-operator-console.tsx");
    expect(room).toContain("filterArtifactsForInspection");
    expect(detail).toContain("filterArtifactsForInspection");
    expect(consoleSource).toContain("systemsArchitectView");
    expect(readComponent("hq-inspection-provider.tsx")).toContain("systemsViewForInspection");
    expect(HQ_INSPECTION_WRITE_BOUNDARY).toEqual({
      validationWrites: 0,
      selectionWrites: 0,
      missionCreation: 0,
      treasuryMovements: 0,
      providerWrites: 0,
      eagActions: 0,
      buildAuthorizations: 0,
      deploymentActions: 0,
    });
  });

  it("closes the workspace without clearing inspection context or standalone routes", () => {
    const provider = readComponent("hq-inspection-provider.tsx");
    expect(provider).toContain("closeInspectionWorkspace: () => setWorkspaceOpen(false)");
    expect(provider).toContain("scroll: false");
    expect(provider).toMatch(/clearInspection:[\s\S]{0,160}writeInspect\(null\)/);
    expect(provider).not.toMatch(/closeInspectionWorkspace:[\s\S]{0,80}writeInspect/);

    expect(existsSync(join(ROOT, "app/dashboard/ventures/[ventureId]/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/dashboard/opportunities/page.tsx"))).toBe(true);
    const standalone = readFileSync(join(ROOT, "app/dashboard/ventures/[ventureId]/page.tsx"), "utf8");
    expect(standalone).toContain("VentureOperatorConsole");
    expect(standalone).toContain("HQ");
  });
});
