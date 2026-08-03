import type { CompareOpportunitiesResult, OpportunityScoreResult } from "./types";

export function compareOpportunities(
  primary: OpportunityScoreResult,
  secondary: OpportunityScoreResult,
): CompareOpportunitiesResult {
  const rationale: string[] = [];

  if (primary.overallScore !== secondary.overallScore) {
    rationale.push(
      `Overall score favors ${primary.overallScore >= secondary.overallScore ? primary.opportunityName : secondary.opportunityName} (${primary.overallScore} vs ${secondary.overallScore}).`,
    );
  } else {
    rationale.push(
      `Overall scores are tied at ${primary.overallScore}; breaking tie using confidence and dimension coverage.`,
    );
  }

  if (primary.confidence !== secondary.confidence) {
    rationale.push(
      `Confidence comparison: ${primary.opportunityName} ${primary.confidence}, ${secondary.opportunityName} ${secondary.confidence}.`,
    );
  }

  if (primary.unknownDimensionCount !== secondary.unknownDimensionCount) {
    rationale.push(
      `Unknown dimension count: ${primary.opportunityName} ${primary.unknownDimensionCount}, ${secondary.opportunityName} ${secondary.unknownDimensionCount}.`,
    );
  }

  const primaryWins =
    primary.overallScore > secondary.overallScore ||
    (primary.overallScore === secondary.overallScore &&
      (primary.confidence > secondary.confidence ||
        (primary.confidence === secondary.confidence &&
          primary.unknownDimensionCount <= secondary.unknownDimensionCount &&
          primary.opportunityId.localeCompare(secondary.opportunityId) <= 0)));

  const recommended = primaryWins ? primary : secondary;
  const other = primaryWins ? secondary : primary;

  rationale.push(
    `Recommendation: pursue "${recommended.opportunityName}" first based on deterministic reasoning rules.`,
  );

  return {
    recommendedOpportunityId: recommended.opportunityId,
    recommendedOpportunityName: recommended.opportunityName,
    otherOpportunityId: other.opportunityId,
    otherOpportunityName: other.opportunityName,
    scoreDelta: Math.abs(primary.overallScore - secondary.overallScore),
    rationale,
    deterministic: true,
  };
}
