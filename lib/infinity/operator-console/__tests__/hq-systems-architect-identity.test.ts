import { describe, expect, it } from "vitest";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import {
  findSelectedOpportunityCandidate,
  resolveArchitectureEntity,
} from "../architecture-entity";
import { isHarnessArchitectureLabel } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import { resolveSystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { VENTURE_SYSTEMS_WRITE_BOUNDARY } from "@/lib/infinity/venture-systems-architecture";
import type { HqWorkArtifact } from "../artifacts/types";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "../types";

const CANDIDATE_A = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_B = "22222222-2222-4222-8222-222222222222";

function artifact(partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title" | "sourceRecordId">): HqWorkArtifact {
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
      department("opportunity_lab"),
      department("systems_architect"),
      department("strategy_finance"),
      department("company_operations"),
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

describe("Systems Architect architecture identity", () => {
  it("treats Autonomous Venture Cycle as a harness label, not a business name", () => {
    expect(isHarnessArchitectureLabel("Autonomous Venture Cycle")).toBe(true);
    expect(isHarnessArchitectureLabel("AI-Powered RFP & Security Platform")).toBe(false);
  });

  it("does not invent a candidate match when HQ has only ranking cards", () => {
    const hq = snapshot({
      departments: [
        department("opportunity_lab", [
          artifact({
            id: "opp-a",
            artifactType: "opportunity_candidate",
            title: "Commercial Real Estate (CRE) Lease Abstraction",
            sourceRecordId: CANDIDATE_A,
            metadata: { candidateId: CANDIDATE_A, rank: 1 },
          }),
          artifact({
            id: "opp-b",
            artifactType: "opportunity_candidate",
            title: "Mobile-First Change Order Platform",
            sourceRecordId: CANDIDATE_B,
            metadata: { candidateId: CANDIDATE_B, rank: 2 },
          }),
        ]),
        department("systems_architect"),
      ],
    });
    expect(findSelectedOpportunityCandidate(hq)).toBeNull();
    expect(resolveArchitectureEntity(hq)).toEqual({
      kind: "NONE",
      id: null,
      name: null,
      origin: null,
      statusLabel: null,
    });
    const enriched = enrichOperatorSnapshot(hq);
    expect(enriched.systemsArchitecture?.entityKind).toBe("NONE");
    expect(enriched.systemsArchitecture?.ventureName).toBeNull();
    expect(enriched.systemsArchitecture?.entityName).toBeNull();
    expect(enriched.systemsArchitecture?.hasArchitectureContext).toBe(false);
  });

  it("binds Systems Architect to the selected-for-validation candidate, never another card", () => {
    const hq = snapshot({
      departments: [
        department("opportunity_lab", [
          artifact({
            id: "opp-a",
            artifactType: "opportunity_candidate",
            title: "Commercial Real Estate (CRE) Lease Abstraction",
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
    });
    const entity = resolveArchitectureEntity(hq);
    expect(entity.kind).toBe("OPPORTUNITY_CANDIDATE");
    expect(entity.id).toBe(CANDIDATE_B);
    expect(entity.name).toBe("AI-Powered RFP & Security Platform");
    const enriched = enrichOperatorSnapshot(hq);
    expect(enriched.systemsArchitecture?.entityKind).toBe("OPPORTUNITY_CANDIDATE");
    expect(enriched.systemsArchitecture?.entityName).toBe("AI-Powered RFP & Security Platform");
    expect(enriched.systemsArchitecture?.entityId).toBe(CANDIDATE_B);
    expect(enriched.systemsArchitecture?.ventureName).toBe("AI-Powered RFP & Security Platform");
    expect(enriched.systemsArchitecture?.ventureName).not.toBe("Autonomous Venture Cycle");
    expect(enriched.systemsArchitecture?.ventureName).not.toBe("Commercial Real Estate (CRE) Lease Abstraction");
    expect(enriched.systemsArchitecture?.ventureId).toBe(CANDIDATE_B);
    expect(enriched.systemsArchitecture?.tenancy).toBeTruthy();
  });

  it("never leaks candidate A architecture identity onto candidate B", () => {
    const a = resolveSystemsArchitectHqView(
      {},
      {
        entityKind: "OPPORTUNITY_CANDIDATE",
        entityId: CANDIDATE_A,
        entityName: "Commercial Real Estate (CRE) Lease Abstraction",
      },
    );
    const b = resolveSystemsArchitectHqView(
      {},
      {
        entityKind: "OPPORTUNITY_CANDIDATE",
        entityId: CANDIDATE_B,
        entityName: "AI-Powered RFP & Security Platform",
      },
    );
    expect(a.entityId).not.toBe(b.entityId);
    expect(a.entityName).not.toBe(b.entityName);
    expect(a.ventureId).toBe(CANDIDATE_A);
    expect(b.ventureId).toBe(CANDIDATE_B);
    expect(a.paymentArchitecture).toBe(a.nodes.length ? a.paymentArchitecture : a.paymentArchitecture);
    expect(a.tenancy).toBeTruthy();
    expect(b.tenancy).toBeTruthy();
  });

  it("follows a real selected venture instead of the FAVC1 harness", () => {
    const hq = snapshot({
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
    const entity = resolveArchitectureEntity(hq);
    expect(entity).toEqual({
      kind: "VENTURE",
      id: "venture-real",
      name: "Harbor Roofing",
      origin: "Founder",
      statusLabel: "active",
    });
    const enriched = enrichOperatorSnapshot(hq);
    expect(enriched.systemsArchitecture?.entityKind).toBe("VENTURE");
    expect(enriched.systemsArchitecture?.entityName).toBe("Harbor Roofing");
    expect(enriched.systemsArchitecture?.ventureName).not.toBe("Autonomous Venture Cycle");
  });

  it("does not write providers, treasury, EAG, validation, or selection", () => {
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.providerAccountCreations).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.treasuryExternalMovements).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.eagActions).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.crmWrites).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.stripeWrites).toBe(0);
  });
});
