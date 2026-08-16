import { CORRELATION_PENALTY_WEIGHT } from "../constants";
import type { CandidateEvaluationDraft } from "../types";

export function inferDependencyTags(candidate: import("../types").LoadedCandidateBundle): string[] {
  const tags = new Set<string>();
  const haystack = [
    candidate.title,
    candidate.summary,
    candidate.market ?? "",
    ...candidate.businessModelCandidates,
    ...candidate.revenueMechanismCandidates,
    candidate.monetization?.recommendation.recommendedAcquisitionStrategy ?? "",
    candidate.monetization?.primaryPlan?.modelType ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (/seo|search|google|geo|organic/.test(haystack)) tags.add("seo");
  if (/google search|google seo/.test(haystack)) tags.add("google_search");
  if (/affiliate|commission/.test(haystack)) tags.add("affiliate_network");
  if (/marketplace|platform|two-sided|b2b marketplace/.test(haystack)) tags.add("marketplace_platform");
  if (/api|integration|platform dependency|shopify|stripe/.test(haystack)) tags.add("api_dependency");
  if (/paid ads|ppc|facebook ads|google ads/.test(haystack)) tags.add("paid_ads");
  if (/content|blog|newsletter|publishing/.test(haystack)) tags.add("content");
  if (/saas|software|subscription/.test(haystack)) tags.add("saas");
  if (/ecommerce|store|shop|inventory/.test(haystack)) tags.add("ecommerce");
  if (/marketplace/.test(haystack)) tags.add("marketplace");
  if (/lead gen|lead generation|leads/.test(haystack)) tags.add("lead_generation");
  if (/b2b|enterprise|sales/.test(haystack)) tags.add("b2b_sales");
  if (/regulated|compliance|finance|healthcare/.test(haystack)) tags.add("regulated");
  if (/community|creator|membership/.test(haystack)) tags.add("community");
  if (/data product|dataset|api access/.test(haystack)) tags.add("data_product");

  return [...tags];
}

export function applyPortfolioCorrelationPenalties(
  evaluations: CandidateEvaluationDraft[],
): CandidateEvaluationDraft[] {
  const tagCounts = new Map<string, number>();
  for (const evaluation of evaluations) {
    for (const tag of evaluation.dependencyTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return evaluations.map((evaluation) => {
    const correlationPenalties = evaluation.dependencyTags
      .filter((tag) => (tagCounts.get(tag) ?? 0) > 1)
      .map((tag) => ({
        tag,
        penalty: CORRELATION_PENALTY_WEIGHT * ((tagCounts.get(tag) ?? 1) - 1),
        reason: `Portfolio concentration on dependency tag: ${tag}`,
      }));

    const totalPenalty = correlationPenalties.reduce((sum, item) => sum + item.penalty, 0);
    const portfolioAdjustedScore = Math.max(
      0,
      Math.round((evaluation.selectionScore - totalPenalty * 100) * 100) / 100,
    );

    return {
      ...evaluation,
      correlationPenalties,
      portfolioAdjustedScore,
    };
  });
}

export function rankPortfolioEvaluations(
  evaluations: CandidateEvaluationDraft[],
): CandidateEvaluationDraft[] {
  return [...evaluations].sort((a, b) => {
    if (b.portfolioAdjustedScore !== a.portfolioAdjustedScore) {
      return b.portfolioAdjustedScore - a.portfolioAdjustedScore;
    }
    if ((b.expectedValueDerived.expectedValuePerDollarDeployed ?? 0) !==
      (a.expectedValueDerived.expectedValuePerDollarDeployed ?? 0)) {
      return (
        (b.expectedValueDerived.expectedValuePerDollarDeployed ?? 0) -
        (a.expectedValueDerived.expectedValuePerDollarDeployed ?? 0)
      );
    }
    return (b.speedToValue.speedToValueScore ?? 0) - (a.speedToValue.speedToValueScore ?? 0);
  });
}

export function generateQueueReason(
  evaluation: CandidateEvaluationDraft,
  rank: number,
  total: number,
): string {
  if (evaluation.decision === "BUILD") {
    return `Rank ${rank}/${total}: Passed build gate with selection score ${evaluation.portfolioAdjustedScore}.`;
  }
  if (evaluation.decision === "VALIDATE") {
    return `Rank ${rank}/${total}: Promising but blocked by assumptions or build gate — validation recommended.`;
  }
  if (evaluation.decision === "HOLD") {
    return `Rank ${rank}/${total}: Inferior to higher-ranked alternatives or resource constrained.`;
  }
  return `Rank ${rank}/${total}: Insufficient evidence/economics for pursuit.`;
}
