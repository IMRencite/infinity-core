import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { HqWorkArtifact } from "../artifacts/types";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "../types";
import { findSelectedOpportunityCandidate, resolveArchitectureEntity } from "../architecture-entity";
import {
  HQ_INSPECTION_WRITE_BOUNDARY,
  filterArtifactsForInspection,
  formatInspectionQuery,
  hqDashboardInspectionPath,
  inspectionRefFromOpportunityArtifact,
  inspectionRefFromVentureId,
  isRoomCompatibleWithInspection,
  isValidateDecisionArtifact,
  parseInspectionQuery,
  resolveHqInspectionContext,
  systemsViewForInspection,
} from "../inspection-context";
import { ArtifactCard, DecisionToken } from "@/components/dashboard/operator-console/artifacts/primitives";
import { InspectionContextBar } from "@/components/dashboard/operator-console/inspection-context-bar";

const CANDIDATE_A = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_B = "22222222-2222-4222-8222-222222222222";
const OTHER_ORG_CANDIDATE = "33333333-3333-4333-8333-333333333333";
const COMPONENTS = join(process.cwd(), "components/dashboard/operator-console");

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
      ventureAssemblyId: "favc1-cycle:cycle-1",
      organizationId: "org",
      missionId: "favc1-cycle",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Autonomous Venture Cycle",
      ventureType: "first_autonomous_venture_v1",
      assemblyStatus: "running",
      readinessStatus: null,
      launchStage: null,
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
          metadata: { candidateId: CANDIDATE_A, rank: 1 },
        }),
        artifact({
          id: "opp-b",
          artifactType: "opportunity_candidate",
          title: "AI-Powered RFP & Security Platform",
          sourceRecordId: CANDIDATE_B,
          metadata: { candidateId: CANDIDATE_B, rank: 2 },
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
          metadata: { candidateId: CANDIDATE_A, modelType: "saas_subscription" },
        }),
        artifact({
          id: "plan-b",
          roomId: "strategy_finance",
          artifactType: "monetization_plan",
          title: "Marketplace take rate",
          sourceRecordId: "analysis-b",
          sourceRecordType: "monetization_candidate_analysis",
          metadata: { candidateId: CANDIDATE_B, modelType: "two_sided_marketplace" },
        }),
      ]),
      department("quality_control", [
        artifact({
          id: "val-b",
          roomId: "quality_control",
          artifactType: "assumption",
          title: "Validation assumption B",
          sourceRecordId: "asm-b",
          sourceRecordType: "assumption",
          metadata: { candidateId: CANDIDATE_B },
        }),
      ]),
      department("company_operations", [
        artifact({
          id: "sel-b",
          roomId: "company_operations",
          artifactType: "selection_blueprint",
          title: "AI-Powered RFP & Security Platform",
          sourceRecordId: "eval-b",
          sourceRecordType: "candidate_selection_evaluation",
          state: "SELECTED",
          metadata: { candidateId: CANDIDATE_B, selected: true, decision: "VALIDATE" },
        }),
        artifact({
          id: "dec-b",
          roomId: "company_operations",
          artifactType: "decision",
          title: "VALIDATE",
          sourceRecordId: "eval-b",
          sourceRecordType: "candidate_selection_evaluation",
          metadata: { candidateId: CANDIDATE_B, selected: true, decision: "VALIDATE" },
        }),
      ]),
      department("systems_architect"),
      department("launch_operations"),
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
    favc1Cycle: {
      cycleKey: "cycle-1",
      mode: "pre_venture",
      terminalOutcome: "RUNNING",
      discoveryRunId: "d1",
      monetizationRunId: null,
      selectionRunId: null,
      ventureAssemblyId: null,
      candidateCount: 2,
      monetizedCandidateCount: 0,
      researchSessionCount: 0,
      activeResearchSessionCount: 0,
      knownCycleCostUsd: null,
      knownCycleCostComplete: false,
      currentStageLabel: "Discovery",
      failureStage: null,
      failureMessage: null,
    },
    ...overrides,
  };
}

describe("HQ opportunity selection context", () => {
  it("selects Candidate A then replaces it with Candidate B without mutating validation selection", () => {
    const hq = snapshot();
    const first = resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A });
    expect(first.status).toBe("ACTIVE");
    expect(first.entityType).toBe("OPPORTUNITY_CANDIDATE");
    expect(first.entityId).toBe(CANDIDATE_A);
    expect(first.displayName).toContain("Commercial Real Estate");
    const second = resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_B });
    expect(second.entityId).toBe(CANDIDATE_B);
    expect(second.displayName).toContain("AI-Powered RFP");
    expect(findSelectedOpportunityCandidate(hq)?.id).toBe(CANDIDATE_B);
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

  it("binds Systems Architect to the inspected candidate and does not leak the other card", () => {
    const hq = snapshot();
    const viewA = systemsViewForInspection(
      hq,
      resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A }),
      null,
    );
    const viewB = systemsViewForInspection(
      hq,
      resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_B }),
      null,
    );
    expect(viewA?.entityKind).toBe("OPPORTUNITY_CANDIDATE");
    expect(viewA?.entityId).toBe(CANDIDATE_A);
    expect(viewA?.entityName).toContain("Commercial Real Estate");
    expect(viewB?.entityId).toBe(CANDIDATE_B);
    expect(viewB?.entityName).toContain("AI-Powered RFP");
    expect(viewA?.entityName).not.toBe(viewB?.entityName);
    expect(viewA?.ventureName).not.toBe("Autonomous Venture Cycle");
  });

  it("labels Opportunity Candidate and Venture as distinct entity types", () => {
    const candidate = resolveHqInspectionContext(snapshot(), {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_A,
    });
    expect(candidate.entityType).toBe("OPPORTUNITY_CANDIDATE");
    const ventureHq = snapshot({
      venture: {
        ventureAssemblyId: "venture-real",
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
      favc1Cycle: undefined,
    });
    const venture = resolveHqInspectionContext(ventureHq, { entityType: "VENTURE", entityId: "venture-real" });
    expect(venture.entityType).toBe("VENTURE");
    expect(venture.displayName).toBe("Harbor Roofing");
    expect(resolveArchitectureEntity(ventureHq).kind).toBe("VENTURE");
    const sa = systemsViewForInspection(ventureHq, venture, null);
    expect(sa?.entityKind).toBe("VENTURE");
  });

  it("shows a safe unavailable state for invalid and cross-org ids", () => {
    const hq = snapshot();
    const invalid = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: "not-a-real-id",
    });
    expect(invalid.status).toBe("UNAVAILABLE");
    expect(invalid.displayName).toBeNull();
    expect(invalid.entityId).toBe("not-a-real-id");
    const crossOrg = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: OTHER_ORG_CANDIDATE,
    });
    expect(crossOrg.status).toBe("UNAVAILABLE");
    expect(crossOrg.displayName).toBeNull();
    const foreignVenture = resolveHqInspectionContext(hq, { entityType: "VENTURE", entityId: "venture-other-org" });
    expect(foreignVenture.status).toBe("UNAVAILABLE");
    const html = renderToStaticMarkup(
      createElement(InspectionContextBar, { context: invalid, onClear: () => undefined }),
    );
    expect(html).toContain("Inspection context unavailable.");
    expect(html).not.toContain("Commercial Real Estate");
    expect(html).not.toContain("AI-Powered RFP");
  });

  it("clears explicit inspection back to the default HQ context", () => {
    const hq = snapshot();
    const explicit = resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A });
    expect(explicit.explicit).toBe(true);
    expect(explicit.entityId).toBe(CANDIDATE_A);
    const cleared = resolveHqInspectionContext(hq, null);
    expect(cleared.explicit).toBe(false);
    expect(cleared.entityId).toBe(CANDIDATE_B);
    expect(cleared.source).toBe("CYCLE_SELECTED");
  });

  it("keeps VALIDATE decision tokens off the opportunity-card inspection path", () => {
    const card = inspectionRefFromOpportunityArtifact(
      artifact({
        id: "opp-a",
        artifactType: "opportunity_candidate",
        title: "Commercial Real Estate Lease Comparison",
        sourceRecordId: CANDIDATE_A,
        metadata: { candidateId: CANDIDATE_A },
      }),
    );
    expect(card).toEqual({ entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A });
    const validate = artifact({
      id: "dec-b",
      roomId: "company_operations",
      artifactType: "decision",
      title: "VALIDATE",
      sourceRecordId: "eval-b",
      metadata: { candidateId: CANDIDATE_B, decision: "VALIDATE" },
    });
    expect(inspectionRefFromOpportunityArtifact(validate)).toBeNull();
    expect(isValidateDecisionArtifact(validate)).toBe(true);
    const cardSource = readFileSync(join(COMPONENTS, "artifacts/primitives.tsx"), "utf8");
    expect(cardSource).toContain("inspectionRefFromOpportunityArtifact");
    expect(cardSource).toContain("data-hq-inspection-card");
    expect(cardSource).toContain("data-hq-validation-token");
    expect(cardSource).toMatch(/function DecisionToken[\s\S]*openInspector/);
    expect(cardSource).not.toMatch(/function DecisionToken[\s\S]*selectInspection/);
    const cardHtml = renderToStaticMarkup(
      createElement(ArtifactCard, {
        artifact: artifact({
          id: "opp-a",
          artifactType: "opportunity_candidate",
          title: "Commercial Real Estate Lease Comparison",
          sourceRecordId: CANDIDATE_A,
          metadata: { candidateId: CANDIDATE_A },
        }),
      }),
    );
    expect(cardHtml).toContain("data-hq-inspection-card=\"opportunity_candidate\"");
    const tokenHtml = renderToStaticMarkup(createElement(DecisionToken, { artifact: validate, large: true }));
    expect(tokenHtml).toContain("data-hq-validation-token=\"true\"");
    expect(tokenHtml).not.toContain("data-hq-inspection-card");
  });

  it("filters compatible room artifacts and blocks incompatible rooms for a candidate", () => {
    const hq = snapshot();
    const inspectingA = resolveHqInspectionContext(hq, { entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A });
    const profit = hq.departments.find((dept) => dept.id === "strategy_finance")!.workArtifacts ?? [];
    const filtered = filterArtifactsForInspection(profit, inspectingA, "strategy_finance");
    expect(filtered.map((item) => item.id)).toEqual(["plan-a"]);
    expect(isRoomCompatibleWithInspection("systems_architect", inspectingA)).toBe(true);
    expect(isRoomCompatibleWithInspection("research_department", inspectingA)).toBe(true);
    expect(isRoomCompatibleWithInspection("quality_control", inspectingA)).toBe(true);
    expect(isRoomCompatibleWithInspection("launch_operations", inspectingA)).toBe(false);
    expect(parseInspectionQuery(formatInspectionQuery({ entityType: "OPPORTUNITY_CANDIDATE", entityId: CANDIDATE_A }))).toEqual({
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_A,
    });
  });

  it("keeps HQ inspection deep links on /dashboard without standalone venture routes", () => {
    const candidatePath = hqDashboardInspectionPath({
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_A,
    });
    const venturePath = hqDashboardInspectionPath({ entityType: "VENTURE", entityId: "venture-real" });
    expect(candidatePath.startsWith("/dashboard?")).toBe(true);
    expect(candidatePath).toContain("inspect=");
    expect(candidatePath).not.toContain("/dashboard/ventures/");
    expect(venturePath).toBe(`/dashboard?inspect=${encodeURIComponent("venture:venture-real")}`);
    expect(parseInspectionQuery(decodeURIComponent(venturePath.split("inspect=")[1] ?? ""))).toEqual({
      entityType: "VENTURE",
      entityId: "venture-real",
    });
    expect(inspectionRefFromVentureId("venture-real")).toEqual({ entityType: "VENTURE", entityId: "venture-real" });
    expect(inspectionRefFromVentureId("favc1-cycle:cycle-1")).toBeNull();
  });
});
