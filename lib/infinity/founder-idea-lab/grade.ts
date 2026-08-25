import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
} from "@/lib/infinity/venture-selection/assumptions/register";
import { assessBuildability } from "@/lib/infinity/venture-selection/buildability/assess";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_RESOURCE_CONSTRAINTS,
} from "@/lib/infinity/venture-selection/constants";
import {
  classifyDecision,
  passesBuildGate,
  simulateResourceAllocation,
} from "@/lib/infinity/venture-selection/decisions/classify";
import {
  calculateExpectedValue,
  deriveExpectedValueInputs,
} from "@/lib/infinity/venture-selection/economics/expected-value";
import { inferDependencyTags } from "@/lib/infinity/venture-selection/portfolio/rank";
import { calculateSelectionScore } from "@/lib/infinity/venture-selection/scoring/selection-score";
import { calculateValidationDimensions } from "@/lib/infinity/venture-selection/scoring/validation-score";
import type {
  CandidateEvaluationDraft,
  LoadedCandidateBundle,
  LoadedMonetizationBundle,
} from "@/lib/infinity/venture-selection/types";
import type { OpportunityCandidate, ScoringAssessmentInput } from "@/lib/infinity/opportunity-scanner/types";
import { convertFounderIdeaToCandidate } from "./convert";
import { emptyEvidenceCoverage } from "./evidence-coverage";
import { emptyMonetizationLayers } from "./monetization-levels";
import { unitEconomicsKnown } from "./monetization-levels";
import type { FounderIdeaStore } from "./store";
import type { FounderIdeaGrade, FounderIdeaSubmission, FounderScoreIntegrity } from "./types";

export function buildLoadedCandidate(
  candidate: OpportunityCandidate,
  monetization: LoadedMonetizationBundle | null,
): LoadedCandidateBundle {
  return {
    candidateId: candidate.id,
    discoveryRunId: candidate.discoveryRunId,
    title: candidate.title,
    summary: candidate.summary,
    problem: candidate.problem,
    targetCustomer: candidate.targetCustomer,
    market: candidate.market,
    businessModelCandidates: candidate.businessModelCandidates,
    revenueMechanismCandidates: candidate.revenueMechanismCandidates,
    opportunityScore: candidate.opportunityScore,
    demandEvidence: candidate.demandEvidence,
    monetizationEvidence: candidate.monetizationEvidence,
    competitionEvidence: candidate.competitionEvidence,
    distributionEvidence: candidate.distributionEvidence,
    buildabilityEvidence: candidate.buildabilityEvidence,
    risks: candidate.risks,
    researchSources: candidate.researchSources,
    researchRunIds: candidate.researchRunIds,
    monetization,
  };
}

export function gradeLoadedCandidate(candidate: LoadedCandidateBundle): CandidateEvaluationDraft {
  const assumptions = buildAssumptionRegister(candidate);
  const fatal = analyzeFatalAssumptions(assumptions);
  const buildability = assessBuildability(candidate);
  const expectedValueInputs = deriveExpectedValueInputs(candidate);
  const expectedValueDerived = calculateExpectedValue(expectedValueInputs);
  const { validationScore, dimensions } = calculateValidationDimensions({
    candidate,
    buildability,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
  });
  const speedToValue = {
    estimatedBuildTimeDays: 30,
    estimatedValidationTimeDays: 14,
    estimatedLaunchTimeDays: 45,
    estimatedTimeToFirstVisitorDays: 50,
    estimatedTimeToFirstLeadDays: 60,
    estimatedTimeToFirstTransactionDays: 75,
    estimatedTimeToFirstRevenueDays: 60,
    estimatedTimeToBreakEvenDays: 180,
    speedToValueScore: 82,
  };
  const { selectionScore, selectionScoreInputs } = calculateSelectionScore({
    candidate,
    validationScore,
    buildability,
    expectedValue: expectedValueDerived,
    speedToValue,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
  });

  const evaluation: CandidateEvaluationDraft = {
    candidate,
    assumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    blockingAssumptions: fatal.blockingAssumptions,
    validationScore,
    validationDimensions: dimensions,
    buildability,
    speedToValue,
    expectedValueInputs,
    expectedValueDerived,
    capitalEfficiencyMetrics: {},
    selectionScoreInputs,
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    dependencyTags: inferDependencyTags(candidate),
    correlationPenalties: [],
    experimentPriorities: [],
    adversarialReview: null,
    decision: "HOLD",
    recommendedNextAction: "",
    queueReason: "",
    explanation: {
      whyThisOpportunity: candidate.summary,
      whyNow: "Founder-submitted idea entered canonical grading.",
      whyInfinityCanBuildIt: buildability.canDeliverDigitally ? "Digitally deliverable software path." : "Buildability constrained.",
      whyCustomersWillPay: candidate.monetization?.recommendation.expectedRevenueMechanism ?? "UNKNOWN",
      whyThisModel: candidate.monetization?.primaryPlan?.modelName ?? "UNKNOWN",
      whyItRanksAboveAlternatives: "Single-candidate founder intake — not ranked against a discovery pool.",
      largestRisks: fatal.blockingAssumptions,
      fatalAssumptions: fatal.blockingAssumptions,
      validationNeeded: fatal.blockingAssumptions,
      expectedEconomics: {
        expectedRoi: expectedValueDerived.expectedRoi,
        expected12MonthProfit: expectedValueDerived.expected12MonthProfit,
      },
      resourceRequirements: {
        estimatedCapitalRequired: candidate.monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
      },
      confidence: candidate.monetization?.recommendation.confidence ?? 0.4,
    },
    handoff: null,
    confidence: candidate.monetization?.recommendation.confidence ?? 0.4,
  };

  const buildGate = passesBuildGate({ evaluation, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
  const allocationPreview = simulateResourceAllocation({
    rankedEvaluations: [{ ...evaluation, decision: buildGate.passes ? "BUILD" : "VALIDATE" }],
    constraints: DEFAULT_RESOURCE_CONSTRAINTS,
  });
  const hasResourceCapacity =
    allocationPreview.allocations.some((item) => item.candidateId === evaluation.candidate.candidateId) ||
    buildGate.passes;
  const classified = classifyDecision({
    evaluation,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  });
  evaluation.decision = classified.decision;
  evaluation.recommendedNextAction = classified.recommendedNextAction;
  evaluation.queueReason = buildGate.reasons.join(" ");
  return evaluation;
}

export function gradeFounderIdea(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  input?: {
    scores?: ScoringAssessmentInput;
    monetization?: LoadedMonetizationBundle | null;
    researchGrounded?: boolean;
    evidenceSufficient?: boolean;
    scoreIntegrity?: FounderScoreIntegrity;
    researchRunId?: string | null;
    skipEconomicsClassification?: boolean;
  },
): FounderIdeaGrade {
  const fixtureScores = input?.scores;
  const candidate = convertFounderIdeaToCandidate(store, submission, {
    scores: fixtureScores,
    researchGrounded: input?.researchGrounded,
  });
  const monetization = input?.monetization ?? null;
  const integrity = input?.scoreIntegrity ?? (fixtureScores ? "TEST_FIXTURE" : "INCOMPLETE");
  const unitKnown = monetization
    ? unitEconomicsKnown({
        category: "SUPPORTED",
        ideaSpecific: "SUPPORTED",
        unitEconomics: monetization.primaryPlan?.ltvCacRatio != null ? "SUPPORTED" : "UNKNOWN",
      })
    : false;
  const sufficient = Boolean(input?.evidenceSufficient) && (integrity === "TEST_FIXTURE" || unitKnown);

  if (!sufficient) {
    const grade: FounderIdeaGrade = {
      opportunityScores: candidate.scores,
      selectionScore: null,
      validationScore: null,
      monetizationScore: monetization?.monetizationScore ?? null,
      fatalAssumptionRisk: null,
      expectedRoi: null,
      estimatedCapitalRequired: monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
      buildReadiness: null,
      opportunityQuality: candidate.opportunityScore,
      evaluation: null,
      scoreIntegrity: integrity,
      readyForDecision: false,
      researchRunId: input?.researchRunId ?? submission.researchRunId,
      monetizationRunId: monetization?.monetizationRunId ?? null,
      provenance: [],
      coverage: emptyEvidenceCoverage({ researched: Boolean(input?.researchRunId) }),
      monetizationLayers: emptyMonetizationLayers(),
    };
    store.grades.set(submission.id, grade);
    if (monetization) store.monetizationBySubmission.set(submission.id, monetization);
    return grade;
  }

  const loaded = buildLoadedCandidate(candidate, monetization);
  const evaluation = gradeLoadedCandidate(loaded);
  const expectedRoi = unitKnown ? evaluation.expectedValueDerived.expectedRoi : null;
  const grade: FounderIdeaGrade = {
    opportunityScores: candidate.scores,
    selectionScore: evaluation.selectionScore,
    validationScore: evaluation.validationScore,
    monetizationScore: monetization?.monetizationScore ?? null,
    fatalAssumptionRisk: evaluation.fatalAssumptionRiskScore,
    expectedRoi,
    estimatedCapitalRequired: monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
    buildReadiness: evaluation.decision,
    opportunityQuality: candidate.opportunityScore,
    evaluation,
    scoreIntegrity: integrity,
    readyForDecision: true,
    researchRunId: input?.researchRunId ?? submission.researchRunId,
    monetizationRunId: monetization?.monetizationRunId ?? null,
    provenance: [],
    coverage: emptyEvidenceCoverage({ researched: true }),
    monetizationLayers: emptyMonetizationLayers(),
  };
  store.grades.set(submission.id, grade);
  submission.infinityDecision = evaluation.decision;
  submission.status = "READY_FOR_DECISION";
  submission.updatedAt = new Date().toISOString();
  store.submissions.set(submission.id, submission);
  if (monetization) store.monetizationBySubmission.set(submission.id, monetization);
  return grade;
}
