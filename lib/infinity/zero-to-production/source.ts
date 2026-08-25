import { calculateDeterministicScores } from "@/lib/infinity/opportunity-scanner/scoring/calculate";
import { canonicalGroundedEvidence, saasWorkflowMonetizationFixture, saasWorkflowResearchFixture } from "@/lib/infinity/founder-idea-lab/fixtures";
import { buildLoadedCandidate, gradeLoadedCandidate } from "@/lib/infinity/founder-idea-lab/grade";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import type { FounderIdeaGrade } from "@/lib/infinity/founder-idea-lab/types";
import { newId, nowIso, type ZeroToProductionStore } from "./store";

export function ingestAutonomousCandidate(
  ztp: ZeroToProductionStore,
  candidate: OpportunityCandidate,
  grade: FounderIdeaGrade,
): void {
  ztp.autonomousCandidates.set(candidate.id, candidate);
  ztp.autonomousGrades.set(candidate.id, grade);
}

export function createAutonomousBuildCandidate(organizationId: string): {
  candidate: OpportunityCandidate;
  grade: FounderIdeaGrade;
} {
  const scores = calculateDeterministicScores(saasWorkflowResearchFixture());
  const evidence = canonicalGroundedEvidence();
  const now = nowIso();
  const candidate: OpportunityCandidate = {
    id: newId(),
    organizationId,
    discoveryRunId: `discovery:autonomous:${newId()}`,
    title: "Simple SaaS that solves a clear business workflow.",
    summary: "Autonomously discovered workflow SaaS opportunity.",
    problem: "Operators still run the workflow manually.",
    targetCustomer: "Small business operators",
    market: "Digital workflow software",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    ...evidence,
    risks: ["Adoption slower than estimated"],
    unknowns: ["Exact willingness to pay"],
    researchSources: [{ url: "https://example.com/research", title: "Grounded research", domain: "example.com" }],
    researchRunIds: ["research:autonomous-fixture"],
    discoveryStrategies: ["search_demand_discovery"],
    dedupKey: `autonomous:${organizationId}:workflow-saas`,
    mergeGroupKey: null,
    opportunityScore: scores.opportunityScore,
    rankPosition: 1,
    scores,
    createdAt: now,
    updatedAt: now,
  };
  const loaded = buildLoadedCandidate(candidate, saasWorkflowMonetizationFixture());
  const evaluation = gradeLoadedCandidate(loaded);
  const grade: FounderIdeaGrade = {
    opportunityScores: scores,
    selectionScore: evaluation.selectionScore,
    validationScore: evaluation.validationScore,
    monetizationScore: loaded.monetization?.monetizationScore ?? 0,
    fatalAssumptionRisk: evaluation.fatalAssumptionRiskScore,
    expectedRoi: evaluation.expectedValueDerived.expectedRoi,
    estimatedCapitalRequired: loaded.monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
    buildReadiness: evaluation.decision,
    opportunityQuality: scores.opportunityScore,
    evaluation,
    scoreIntegrity: "TEST_FIXTURE",
    readyForDecision: true,
    researchRunId: candidate.researchRunIds[0] ?? null,
    monetizationRunId: loaded.monetization?.monetizationRunId ?? null,
    provenance: [],
    coverage: null,
    monetizationLayers: null,
  };
  return { candidate, grade };
}
