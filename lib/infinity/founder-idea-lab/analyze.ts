import { applyCanonicalResearchFixture, saasWorkflowMonetizationFixture, saasWorkflowResearchFixture, weakMonetizationFixture } from "./fixtures";
import { gradeFounderIdea } from "./grade";
import { applyResearchPacketToCandidate, convertFounderIdeaToCandidate } from "./convert";
import { coverageFromPacket, layersFromPacket, type FounderResearchPacket } from "./research-packet";
import { monetizeFromResearchPacket } from "./monetization-from-research";
import { scoreFromEvidenceCoverage } from "./score-from-evidence";
import { evaluateEvidenceReadiness } from "./readiness";
import { attachFounderIntelligence } from "./explainability/attach";
import { emptyEvidenceCoverage } from "./evidence-coverage";
import { emptyMonetizationLayers } from "./monetization-levels";
import { buildFounderResearchSeed } from "./research-seed";
import { buildCanonicalResearchRequest } from "./research-request";
import { founderResearchPacketFromFailure, founderResearchPacketFromResult } from "./research-from-canonical";
import type { FounderIdeaStore } from "./store";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import type { ScoringAssessmentInput } from "@/lib/infinity/opportunity-scanner/types";
import type { LoadedMonetizationBundle } from "@/lib/infinity/venture-selection/types";
import type { RunGroundedResearchInput, RunGroundedResearchOutput } from "@/lib/infinity/research/types";

export type CanonicalResearchExecutor = (input: RunGroundedResearchInput) => Promise<RunGroundedResearchOutput>;

export type AnalyzeOptions = {
  /** Test-only. Production must not pass a fixture. */
  researchFixture?: "saas_workflow" | "none" | "failed";
  monetizationFixture?: "saas_workflow" | "weak" | "none";
  scores?: ScoringAssessmentInput;
  monetization?: LoadedMonetizationBundle | null;
  researchPacket?: FounderResearchPacket | null;
  runResearch?: CanonicalResearchExecutor;
  analysisAttempt?: number;
};

export function analyzeFounderIdea(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  options: AnalyzeOptions = {},
): { submission: FounderIdeaSubmission; grade: FounderIdeaGrade | null; researchPipeline: string } {
  buildFounderResearchSeed(submission, submission.opportunityCandidateId, options.analysisAttempt ?? 1);

  if (options.researchFixture === "failed") {
    convertFounderIdeaToCandidate(store, submission);
    submission.status = "FAILED";
    submission.failureCode = "RESEARCH_FAILED";
    submission.infinityDecision = null;
    store.submissions.set(submission.id, submission);
    return { submission, grade: null, researchPipeline: "grounded_research" };
  }

  submission.status = "RESEARCHING";
  store.submissions.set(submission.id, submission);

  if (options.researchPacket) {
    return analyzeFromPacket(store, submission, options.researchPacket, options);
  }

  const usingSaasFixture = options.researchFixture === "saas_workflow";
  const explicitTestScores = Boolean(options.scores);
  if (!usingSaasFixture && !explicitTestScores && !options.monetization && options.researchFixture !== "none") {
    if (options.researchFixture == null && options.monetizationFixture == null) {
      return failIncomplete(store, submission, "INSUFFICIENT_EVIDENCE", "NO_RESEARCH");
    }
  }

  if (options.researchFixture === "none" && !explicitTestScores) {
    return failIncomplete(store, submission, "INSUFFICIENT_EVIDENCE", "NO_RESEARCH");
  }

  if (!usingSaasFixture && !explicitTestScores) {
    return failIncomplete(store, submission, "INSUFFICIENT_EVIDENCE", "NO_RESEARCH");
  }

  applyCanonicalResearchFixture(usingSaasFixture);
  const monetization =
    options.monetization ??
    (options.monetizationFixture === "weak"
      ? weakMonetizationFixture()
      : options.monetizationFixture === "saas_workflow" || usingSaasFixture
        ? saasWorkflowMonetizationFixture()
        : options.monetizationFixture === "none"
          ? null
          : null);

  const scores = options.scores ?? (usingSaasFixture ? saasWorkflowResearchFixture() : undefined);
  convertFounderIdeaToCandidate(store, submission, {
    scores,
    researchGrounded: usingSaasFixture,
  });
  const grade = gradeFounderIdea(store, submission, {
    scores,
    monetization,
    researchGrounded: usingSaasFixture,
    evidenceSufficient: Boolean(scores) && monetization != null,
    scoreIntegrity: "TEST_FIXTURE",
  });
  if (!grade.readyForDecision) {
    submission.status = monetization == null ? "INSUFFICIENT_EVIDENCE" : "GRADED";
    submission.infinityDecision = null;
    store.submissions.set(submission.id, submission);
  }
  return { submission, grade, researchPipeline: "grounded_research" };
}

export async function analyzeFounderIdeaWithCanonicalResearch(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  runResearch: CanonicalResearchExecutor,
  options: AnalyzeOptions = {},
): Promise<{ submission: FounderIdeaSubmission; grade: FounderIdeaGrade | null; researchPipeline: string }> {
  convertFounderIdeaToCandidate(store, submission);
  const seed = buildFounderResearchSeed(
    submission,
    submission.opportunityCandidateId,
    options.analysisAttempt ?? 1,
  );
  const request = buildCanonicalResearchRequest(seed);
  submission.status = "RESEARCHING";
  store.submissions.set(submission.id, submission);
  const output = await runResearch(request);
  const packet = output.ok
    ? founderResearchPacketFromResult({ result: output.result, submission })
    : founderResearchPacketFromFailure({ failure: output.failure, submission });
  return analyzeFromPacket(store, submission, packet, options);
}

function failIncomplete(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  status: FounderIdeaSubmission["status"],
  _reason: string,
): { submission: FounderIdeaSubmission; grade: FounderIdeaGrade | null; researchPipeline: string } {
  convertFounderIdeaToCandidate(store, submission);
  submission.status = status;
  submission.failureCode = status === "FAILED" ? "RESEARCH_FAILED" : "INSUFFICIENT_EVIDENCE";
  submission.infinityDecision = null;
  store.submissions.set(submission.id, submission);
  const grade = gradeFounderIdea(store, submission, {
    evidenceSufficient: false,
    scoreIntegrity: "INCOMPLETE",
  });
  return { submission, grade, researchPipeline: "grounded_research" };
}

function analyzeFromPacket(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  packet: FounderResearchPacket,
  options: AnalyzeOptions,
): { submission: FounderIdeaSubmission; grade: FounderIdeaGrade | null; researchPipeline: string } {
  convertFounderIdeaToCandidate(store, submission);
  const bound = { ...packet, candidateId: submission.opportunityCandidateId ?? packet.candidateId, submissionId: submission.id };
  if (bound.failed) {
    submission.status = "RESEARCH_INCOMPLETE";
    submission.failureCode = bound.failureCode === "PROVIDER_FAILED" ? "PROVIDER_FAILED" : "RESEARCH_FAILED";
    submission.infinityDecision = null;
    submission.researchRunId = bound.researchRunId;
    store.researchPackets.set(submission.id, bound);
    const grade = gradeFounderIdea(store, submission, {
      evidenceSufficient: false,
      scoreIntegrity: "INCOMPLETE",
      researchRunId: bound.researchRunId,
    });
    store.submissions.set(submission.id, submission);
    return { submission, grade, researchPipeline: "grounded_research" };
  }

  const coverage = coverageFromPacket(bound);
  const layers = layersFromPacket(bound);
  const scored = scoreFromEvidenceCoverage({ coverage, monetizationLayers: layers });
  const candidate = applyResearchPacketToCandidate(store, submission, bound, scored.scores);
  const monetization =
    options.monetization === undefined ? monetizeFromResearchPacket({ candidate, packet: bound }) : options.monetization;
  if (monetization) store.monetizationBySubmission.set(submission.id, monetization);
  const readiness = evaluateEvidenceReadiness({ packet: bound, coverage, monetization, layers });

  if (!readiness.readyForDecision) {
    const grade = gradeFounderIdea(store, submission, {
      scores: scored.scores?.scoringInputs,
      monetization,
      evidenceSufficient: false,
      scoreIntegrity: "INCOMPLETE",
      researchRunId: bound.researchRunId,
    });
    grade.opportunityScores = scored.scores;
    grade.opportunityQuality = scored.scores?.opportunityScore ?? null;
    grade.provenance = scored.provenance;
    grade.coverage = coverage;
    grade.monetizationLayers = layers;
    grade.monetizationScore = monetization?.monetizationScore ?? null;
    attachFounderIntelligence(store, submission, grade, bound, layers);
    submission.status = readiness.status;
    submission.failureCode =
      readiness.reason === "PROVIDER_FAILURE"
        ? "PROVIDER_FAILED"
        : readiness.reason === "RESEARCH_INCOMPLETE"
          ? "RESEARCH_INCOMPLETE"
          : "INSUFFICIENT_EVIDENCE";
    submission.infinityDecision = null;
    submission.researchRunId = bound.researchRunId;
    store.submissions.set(submission.id, submission);
    return { submission, grade, researchPipeline: "grounded_research" };
  }

  const grade = gradeFounderIdea(store, submission, {
    scores: scored.scores?.scoringInputs,
    monetization,
    researchGrounded: bound.grounded,
    evidenceSufficient: true,
    scoreIntegrity: "EVIDENCE_GROUNDED",
    researchRunId: bound.researchRunId,
  });
  grade.opportunityScores = scored.scores;
  grade.opportunityQuality = scored.scores?.opportunityScore ?? null;
  grade.provenance = scored.provenance;
  grade.coverage = coverage;
  grade.monetizationLayers = layers;
  attachFounderIntelligence(store, submission, grade, bound, layers);
  return { submission, grade, researchPipeline: "grounded_research" };
}

export { emptyEvidenceCoverage, emptyMonetizationLayers };
