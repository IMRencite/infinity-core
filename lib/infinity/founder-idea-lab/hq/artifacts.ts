import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { normalizeFounderIdea } from "../normalize";
import type { FounderIdeaStore } from "../store";
import type { FounderIdeaSubmission } from "../types";
import { recommendScoreDisplay } from "../score-from-evidence";
import type { FounderIdeaGrade } from "../types";
import { founderHotTakes } from "./hot-takes-from-store";

function push(map: HqRoomArtifactMap, roomId: DepartmentId, artifact: HqWorkArtifact): void {
  if (!map[roomId]) map[roomId] = [];
  map[roomId]!.push(artifact);
}

export function buildFounderIdeaArtifacts(store: FounderIdeaStore, organizationId: string): HqRoomArtifactMap {
  const map: HqRoomArtifactMap = {};
  for (const submission of store.scoped(organizationId)) {
    const thesis = normalizeFounderIdea(submission);
    const grade = store.grades.get(submission.id);
    const override = [...store.overrides.values()].find((o) => o.founderIdeaSubmissionId === submission.id);
    const baseMeta = {
      origin: submission.origin,
      founderBadge: "FOUNDER",
      status: submission.status,
      infinityDecision: submission.infinityDecision,
      founderDecision: submission.founderDecision ? String(submission.founderDecision) : null,
      opportunityScore: grade?.opportunityQuality ?? null,
      buildReadiness: grade?.buildReadiness ?? null,
      thesis: thesis.businessThesis.value,
      thesisSource: thesis.businessThesis.source,
      problem: thesis.problem.value,
      problemSource: thesis.problem.source,
      customer: thesis.targetCustomer.value,
      customerSource: thesis.targetCustomer.source,
      solution: thesis.solution.value,
      solutionSource: thesis.solution.source,
      selectionScore: grade?.selectionScore ?? null,
      monetizationScore: grade?.monetizationScore ?? null,
      validationScore: grade?.validationScore ?? null,
      fatalAssumptionRisk: grade?.fatalAssumptionRisk ?? null,
      expectedRoi: grade?.expectedRoi ?? null,
      capitalRequired: grade?.estimatedCapitalRequired ?? null,
      overrideInfinity: override?.infinityDecision ?? null,
      overrideFounder: override?.founderDecision ?? null,
      candidateId: submission.opportunityCandidateId,
      submittedBy: submission.submittedByUserId,
      approvedBy: submission.approvedByUserId,
      weakestAssumption: grade?.evaluation?.blockingAssumptions[0] ?? "Demand and willingness to pay are unproven.",
      cheapestValidation: grade?.evaluation?.candidate?.monetization?.validationExperiments[0]?.title ?? "UNKNOWN",
      researchPipeline: "grounded_research",
      researchRunId: submission.researchRunId,
      needsReanalysis: submission.needsReanalysis,
      historicalOpportunityScore: store.evaluationHistory.get(submission.id)?.[0]?.opportunityScore ?? null,
      historicalDecision: store.evaluationHistory.get(submission.id)?.[0]?.decision ?? null,
      historicalGrade: Boolean(store.evaluationHistory.get(submission.id)?.length),
    } satisfies Record<string, string | number | boolean | null>;

    push(map, "opportunity_lab", {
      id: buildArtifactRenderId({
        artifactType: "founder_idea",
        sourceRecordType: "founder_idea_submission",
        sourceRecordId: submission.id,
      }),
      roomId: "opportunity_lab",
      artifactType: "founder_idea",
      title: submission.title,
      subtitle: `FOUNDER · ${submission.status}`,
      state: submission.status === "FAILED" ? "FAILED" : submission.status === "REJECTED" ? "REJECTED" : "READY",
      createdAt: submission.createdAt,
      sourceRecordType: "founder_idea_submission",
      sourceRecordId: submission.id,
      lineageType: "candidate",
      lineageLabel: "FOUNDER",
      metadata: baseMeta,
    });

    if (submission.opportunityCandidateId) {
      const candidate = store.candidates.get(submission.opportunityCandidateId);
      if (candidate) {
        push(map, "opportunity_lab", {
          id: buildArtifactRenderId({
            artifactType: "opportunity_candidate",
            sourceRecordType: "opportunity_candidate",
            sourceRecordId: candidate.id,
            artifactRole: "founder",
          }),
          roomId: "opportunity_lab",
          artifactType: "opportunity_candidate",
          title: candidate.title,
          subtitle: "FOUNDER",
          state: "READY",
          createdAt: candidate.createdAt,
          sourceRecordType: "opportunity_candidate",
          sourceRecordId: candidate.id,
          lineageType: "candidate",
          lineageLabel: "FOUNDER",
          metadata: {
            origin: submission.origin,
            founderBadge: "FOUNDER",
            founderIdeaSubmissionId: submission.id,
            score: candidate.opportunityScore,
            candidateId: candidate.id,
          },
        });
      }
    }

    const packet = store.researchPackets.get(submission.id);
    if (packet && !packet.failed && packet.researchRunId) {
      push(map, "research_department", {
        id: buildArtifactRenderId({
          artifactType: "research_packet",
          sourceRecordType: "founder_idea_submission",
          sourceRecordId: submission.id,
          artifactRole: "research",
        }),
        roomId: "research_department",
        artifactType: "research_packet",
        title: `Research · ${submission.title}`,
        subtitle: packet.requiresMoreResearch || !packet.grounded ? "incomplete" : "grounded_research",
        state: packet.requiresMoreResearch || !packet.grounded ? "CREATING" : "READY",
        createdAt: submission.updatedAt,
        sourceRecordType: "founder_idea_submission",
        sourceRecordId: submission.id,
        lineageLabel: "FOUNDER",
        metadata: {
          origin: submission.origin,
          founderBadge: "FOUNDER",
          candidateId: submission.opportunityCandidateId,
          pipeline: "grounded_research",
          grounded: packet.grounded,
          researchRunId: packet.researchRunId,
          incomplete: packet.requiresMoreResearch || !packet.grounded,
        },
      });
    }

    const monetization = store.monetizationBySubmission.get(submission.id);
    if (monetization) {
      push(map, "strategy_finance", {
        id: buildArtifactRenderId({
          artifactType: "monetization_plan",
          sourceRecordType: "founder_idea_submission",
          sourceRecordId: submission.id,
          artifactRole: "monetization",
        }),
        roomId: "strategy_finance",
        artifactType: "monetization_plan",
        title: `Monetization · ${submission.title}`,
        subtitle: "ESTIMATE",
        state: "READY",
        createdAt: submission.updatedAt,
        sourceRecordType: "founder_idea_submission",
        sourceRecordId: submission.id,
        lineageLabel: "FOUNDER",
        metadata: {
          origin: submission.origin,
          founderBadge: "FOUNDER",
          candidateId: submission.opportunityCandidateId,
          monetizationScore: monetization.monetizationScore,
          expectedRoi: grade?.expectedRoi ?? null,
        },
      });
    }

    if (submission.status === "VALIDATING") {
      push(map, "quality_control", {
        id: buildArtifactRenderId({
          artifactType: "validation_experiment",
          sourceRecordType: "founder_idea_submission",
          sourceRecordId: submission.id,
          artifactRole: "validation",
        }),
        roomId: "quality_control",
        artifactType: "validation_experiment",
        title: `Validation · ${submission.title}`,
        subtitle: "Treasury-gated",
        state: "READY",
        createdAt: submission.updatedAt,
        sourceRecordType: "founder_idea_submission",
        sourceRecordId: submission.id,
        lineageLabel: "FOUNDER",
        metadata: {
          origin: submission.origin,
          founderBadge: "FOUNDER",
          candidateId: submission.opportunityCandidateId,
          treasuryRequired: true,
        },
      });
    }

    if (submission.status === "BUILDING" || submission.status === "BUILD_APPROVED") {
      const build = [...store.builds.values()].find((b) => b.missionId?.includes(submission.id));
      if (build) {
        push(map, "product_lab", {
          id: buildArtifactRenderId({
            artifactType: "company_blueprint",
            sourceRecordType: "founder_idea_submission",
            sourceRecordId: submission.id,
            artifactRole: "blueprint",
          }),
          roomId: "product_lab",
          artifactType: "company_blueprint",
          title: `Blueprint · ${submission.title}`,
          subtitle: "Company Builder",
          state: "READY",
          createdAt: submission.updatedAt,
          sourceRecordType: "founder_idea_submission",
          sourceRecordId: submission.id,
          lineageLabel: "FOUNDER",
          metadata: {
            origin: submission.origin,
            founderBadge: "FOUNDER",
            candidateId: submission.opportunityCandidateId,
            publiclyDeployed: false,
            treasuryBypassed: false,
          },
        });
      }
    }
  }
  return map;
}

function listScoreDisplay(grade: FounderIdeaGrade | undefined): string {
  if (!grade || grade.opportunityQuality == null) return "UNKNOWN";
  const unknownCount = grade.coverage?.unknownCount ?? 0;
  const confidences = grade.provenance
    .map((row) => row.confidence)
    .filter((value): value is number => value != null);
  const evidenceConfidence =
    confidences.length > 0 ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : null;
  if (grade.readyForDecision && grade.scoreIntegrity !== "INCOMPLETE") {
    return String(Math.round(grade.opportunityQuality));
  }
  return recommendScoreDisplay({
    opportunityScore: grade.opportunityQuality,
    evidenceConfidence,
    unknownCount: unknownCount > 0 ? unknownCount : 5,
  });
}

export type FounderIdeaListRow = {
  id: string;
  idea: string;
  score: string;
  historicalScore: string;
  infinityDecision: string;
  founderDecision: string;
  status: string;
  venture: string;
  revenue: string;
  profit: string;
  submitted: string;
  origin: string;
};

export function listFounderIdeas(store: FounderIdeaStore, organizationId: string): FounderIdeaListRow[] {
  return store.scoped(organizationId).map((submission) => {
    const grade = store.grades.get(submission.id);
    const build = [...store.builds.values()].find((b) => b.missionId?.includes(submission.id));
    return {
      id: submission.id,
      idea: submission.title,
      score: listScoreDisplay(grade),
      historicalScore:
        store.evaluationHistory.get(submission.id)?.[0]?.opportunityScore == null
          ? "NONE"
          : String(store.evaluationHistory.get(submission.id)![0]!.opportunityScore),
      infinityDecision: submission.infinityDecision ?? "UNKNOWN",
      founderDecision: submission.founderDecision ? String(submission.founderDecision) : "UNKNOWN",
      status: submission.status,
      venture: build?.blueprintId ? "ROUTED" : "NONE",
      revenue: "NOT YET MEASURED",
      profit: "NOT YET MEASURED",
      submitted: submission.createdAt,
      origin: submission.origin,
    };
  });
}

export { founderHotTakes };
