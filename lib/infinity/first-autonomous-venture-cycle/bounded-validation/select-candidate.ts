import type { AssumptionRecord, CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";
import {
  isAllowedValidationExperimentType,
  mapValidationMethodToAllowedExperiment,
} from "./constants";

export type ValidationCandidateSelection = {
  candidateId: string;
  title: string;
  selectionScore: number;
  selectionReason: string;
  blockingAssumption: string;
  validationExperimentType: string;
  regulatoryRisk: number;
  platformRisk: number;
};

function planRisk(evaluation: CandidateEvaluationDraft, field: "regulatory" | "platform"): number {
  const plan = evaluation.candidate.monetization?.primaryPlan;
  if (field === "regulatory") return plan?.regulatoryRisk ?? 0.3;
  return plan?.platformDependencyRisk ?? 0.3;
}

function resolvableBlockingAssumption(assumptions: AssumptionRecord[]): {
  assumption: string;
  experimentType: string;
} | null {
  const sorted = [...assumptions].sort((a, b) => b.fatalRiskContribution - a.fatalRiskContribution);
  for (const assumption of sorted) {
    const mapped = mapValidationMethodToAllowedExperiment(assumption.validationMethod);
    if (mapped && isAllowedValidationExperimentType(mapped)) {
      return { assumption: assumption.assumption, experimentType: mapped };
    }
  }
  return null;
}

export function selectValidationCandidate(
  evaluations: CandidateEvaluationDraft[],
): ValidationCandidateSelection | null {
  const validateEvaluations = evaluations.filter((evaluation) => evaluation.decision === "VALIDATE");
  if (validateEvaluations.length === 0) return null;

  const scored = validateEvaluations
    .map((evaluation) => {
      const resolvable = resolvableBlockingAssumption(evaluation.assumptions);
      if (!resolvable) return null;

      const monetizationScore = evaluation.candidate.monetization?.monetizationScore ?? 0;
      const buildabilityScore = evaluation.buildability.buildabilityScore;
      const regulatoryRisk = planRisk(evaluation, "regulatory");
      const platformRisk = planRisk(evaluation, "platform");
      const resolvabilityScore = resolvable ? 1 : 0;

      const compositeScore =
        evaluation.selectionScore * 0.35 +
        monetizationScore * 0.2 +
        buildabilityScore * 0.15 +
        (1 - regulatoryRisk) * 10 +
        (1 - platformRisk) * 8 +
        resolvabilityScore * 22;

      return {
        evaluation,
        compositeScore,
        resolvable,
        regulatoryRisk,
        platformRisk,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  const winner = scored[0];
  if (!winner) return null;

  return {
    candidateId: winner.evaluation.candidate.candidateId,
    title: winner.evaluation.candidate.title,
    selectionScore: winner.evaluation.selectionScore,
    selectionReason: `Highest composite validation score (${winner.compositeScore.toFixed(2)}) with resolvable blocking assumption and lower safety exposure.`,
    blockingAssumption: winner.resolvable.assumption,
    validationExperimentType: winner.resolvable.experimentType,
    regulatoryRisk: winner.regulatoryRisk,
    platformRisk: winner.platformRisk,
  };
}
