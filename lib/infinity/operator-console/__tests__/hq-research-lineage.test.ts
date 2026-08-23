import { describe, expect, it } from "vitest";
import type { HqWorkArtifact } from "../artifacts/types";
import { findSelectedOpportunityCandidate, resolveArchitectureEntity } from "../architecture-entity";
import {
  HQ_INSPECTION_WRITE_BOUNDARY,
  LEGACY_RESEARCH_LINEAGE_NOTICE,
  filterArtifactsForInspection,
  resolveHqInspectionContext,
  shouldShowLegacyResearchLineageNotice,
  systemsViewForInspection,
} from "../inspection-context";
import {
  addResearchRunCandidateLinks,
  researchLineageMetadata,
  resolveResearchRunCandidateIds,
} from "../research-lineage";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "../types";

const CANDIDATE_A = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_B = "22222222-2222-4222-8222-222222222222";
const OTHER_ORG_CANDIDATE = "33333333-3333-4333-8333-333333333333";
const VENTURE_ID = "venture-real";

function artifact(
  partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title" | "sourceRecordId">,
): HqWorkArtifact {
  return {
    roomId: "research_department",
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "research_run",
    metadata: {},
    ...partial,
  };
}

function department(
  id: OperatorDepartmentSnapshot["id"],
  workArtifacts: HqWorkArtifact[] = [],
): OperatorDepartmentSnapshot {
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
      organizationId: "org-1",
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
          roomId: "opportunity_lab",
          artifactType: "opportunity_candidate",
          title: "Commercial Real Estate Lease Comparison",
          sourceRecordId: CANDIDATE_A,
          sourceRecordType: "opportunity_candidate",
          metadata: { candidateId: CANDIDATE_A, rank: 1 },
        }),
        artifact({
          id: "opp-b",
          roomId: "opportunity_lab",
          artifactType: "opportunity_candidate",
          title: "AI-Powered RFP & Security Platform",
          sourceRecordId: CANDIDATE_B,
          sourceRecordType: "opportunity_candidate",
          metadata: { candidateId: CANDIDATE_B, rank: 2 },
        }),
      ]),
      department("research_department", [
        artifact({
          id: "research-a",
          artifactType: "research_packet",
          title: "Research A",
          sourceRecordId: "run-a",
          metadata: { candidateId: CANDIDATE_A, researchRunId: "run-a" },
          lineageId: CANDIDATE_A,
          lineageType: "candidate",
        }),
        artifact({
          id: "research-b",
          artifactType: "research_packet",
          title: "Research B",
          sourceRecordId: "run-b",
          metadata: { candidateId: CANDIDATE_B, researchRunId: "run-b" },
          lineageId: CANDIDATE_B,
          lineageType: "candidate",
        }),
        artifact({
          id: "research-legacy",
          artifactType: "research_packet",
          title: "Legacy untagged research",
          sourceRecordId: "run-legacy",
          metadata: { researchRunId: "run-legacy" },
        }),
        artifact({
          id: "research-org2",
          artifactType: "research_packet",
          title: "Org 2 research",
          sourceRecordId: "run-org2",
          metadata: { candidateId: OTHER_ORG_CANDIDATE, researchRunId: "run-org2" },
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

describe("HQ opportunity → research lineage", () => {
  it("propagates candidate A from research run to HQ artifact metadata", () => {
    const index = new Map<string, string[]>();
    addResearchRunCandidateLinks(index, ["run-a"], CANDIDATE_A);
    const ids = resolveResearchRunCandidateIds({
      researchRunId: "run-a",
      structuredResult: { candidateId: CANDIDATE_A },
      runIdToCandidateIds: index,
    });
    expect(ids).toEqual([CANDIDATE_A]);
    expect(researchLineageMetadata(ids)).toEqual({ candidateId: CANDIDATE_A });
  });

  it("filters Research Grid by the same inspection context as Systems Architect", () => {
    const hq = snapshot();
    const inspectA = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_A,
    });
    const inspectB = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_B,
    });
    const research = hq.departments.find((dept) => dept.id === "research_department")!.workArtifacts ?? [];

    const visibleA = filterArtifactsForInspection(research, inspectA, "research_department");
    const visibleB = filterArtifactsForInspection(research, inspectB, "research_department");
    expect(visibleA.map((item) => item.id)).toEqual(["research-a"]);
    expect(visibleB.map((item) => item.id)).toEqual(["research-b"]);
    expect(visibleA.some((item) => item.id === "research-b")).toBe(false);
    expect(visibleB.some((item) => item.id === "research-a")).toBe(false);

    const saA = systemsViewForInspection(hq, inspectA, null);
    const saB = systemsViewForInspection(hq, inspectB, null);
    expect(saA?.entityId).toBe(CANDIDATE_A);
    expect(saB?.entityId).toBe(CANDIDATE_B);
    expect(inspectA.entityId).toBe(saA?.entityId);
    expect(inspectB.entityId).toBe(saB?.entityId);
  });

  it("does not attribute untagged legacy research to an inspected candidate", () => {
    const hq = snapshot();
    const inspectA = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_A,
    });
    const research = hq.departments.find((dept) => dept.id === "research_department")!.workArtifacts ?? [];
    const visible = filterArtifactsForInspection(research, inspectA, "research_department");
    expect(visible.some((item) => item.id === "research-legacy")).toBe(false);
    expect(shouldShowLegacyResearchLineageNotice(research, inspectA, "research_department")).toBe(true);
    expect(LEGACY_RESEARCH_LINEAGE_NOTICE).toContain("lacks candidate lineage");
  });

  it("blocks cross-org candidate inspection and does not leak org 2 research", () => {
    const hq = snapshot();
    const crossOrg = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: OTHER_ORG_CANDIDATE,
    });
    expect(crossOrg.status).toBe("UNAVAILABLE");
    const research = hq.departments.find((dept) => dept.id === "research_department")!.workArtifacts ?? [];
    expect(filterArtifactsForInspection(research, crossOrg, "research_department")).toEqual([]);

    const inspectA = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_A,
    });
    const visibleA = filterArtifactsForInspection(research, inspectA, "research_department");
    expect(visibleA.some((item) => item.id === "research-org2")).toBe(false);
  });

  it("does not show candidate research when inspecting an unrelated venture", () => {
    const ventureHq = snapshot({
      venture: {
        ventureAssemblyId: VENTURE_ID,
        organizationId: "org-1",
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
    const inspectVenture = resolveHqInspectionContext(ventureHq, {
      entityType: "VENTURE",
      entityId: VENTURE_ID,
    });
    expect(inspectVenture.status).toBe("ACTIVE");
    const research = ventureHq.departments.find((dept) => dept.id === "research_department")!.workArtifacts ?? [];
    const visible = filterArtifactsForInspection(research, inspectVenture, "research_department");
    expect(visible).toEqual([]);
    expect(visible.some((item) => item.id === "research-a" || item.id === "research-b")).toBe(false);
  });

  it("keeps Profit Lab, Validation Station, and Systems Architect context-correct", () => {
    const hq = snapshot();
    const inspectA = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_A,
    });
    const inspectB = resolveHqInspectionContext(hq, {
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: CANDIDATE_B,
    });
    const profit = hq.departments.find((dept) => dept.id === "strategy_finance")!.workArtifacts ?? [];
    const validation = hq.departments.find((dept) => dept.id === "quality_control")!.workArtifacts ?? [];
    expect(filterArtifactsForInspection(profit, inspectA, "strategy_finance").map((item) => item.id)).toEqual([
      "plan-a",
    ]);
    expect(filterArtifactsForInspection(profit, inspectB, "strategy_finance").map((item) => item.id)).toEqual([
      "plan-b",
    ]);
    expect(filterArtifactsForInspection(validation, inspectA, "quality_control")).toEqual([]);
    expect(filterArtifactsForInspection(validation, inspectB, "quality_control").map((item) => item.id)).toEqual([
      "val-b",
    ]);
    expect(systemsViewForInspection(hq, inspectA, null)?.entityId).toBe(CANDIDATE_A);
    expect(systemsViewForInspection(hq, inspectB, null)?.entityId).toBe(CANDIDATE_B);
    expect(resolveArchitectureEntity(hq).kind).toBe("OPPORTUNITY_CANDIDATE");
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

  it("does not invent shared discovery lineage from titles or ranks", () => {
    const ids = resolveResearchRunCandidateIds({
      researchRunId: "run-shared",
      structuredResult: { summary: "AI-Powered RFP & Security Platform" },
      runIdToCandidateIds: new Map(),
    });
    expect(ids).toEqual([]);
    expect(researchLineageMetadata(ids)).toEqual({});
  });
});
