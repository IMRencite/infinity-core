import type { VentureContext } from "../comparable-economics/qualify";
import type { ExtractedBenchmarkObservation, QualifiedBenchmark, BenchmarkRelevance, BenchmarkRelevanceFactors } from "./types";
import { sourceQualityScore } from "./quality";

function smbContext(context: VentureContext): boolean {
  return /smb|small business|local|owner/i.test(`${context.targetCustomer} ${context.title} ${context.description}`);
}

function enterpriseClaim(claim: string): boolean {
  return /\benterprise\b|\bFortune 500\b|\bCRM SaaS\b/i.test(claim);
}

function selfServe(context: VentureContext): boolean {
  return /self-?serve|signup|product-led/i.test(`${context.proposedSolution} ${context.businessModelHypothesis}`);
}

function salesAssisted(context: VentureContext): boolean {
  return /sales|demo|agency|outbound/i.test(`${context.proposedSolution} ${context.businessModelHypothesis} ${context.description}`);
}

function serviceHeavy(context: VentureContext): boolean {
  return /seo|content|managed|done-for-you|retainer/i.test(`${context.proposedSolution} ${context.businessModelHypothesis} ${context.description}`);
}

export function scoreBenchmarkRelevance(
  observation: ExtractedBenchmarkObservation,
  context: VentureContext,
): QualifiedBenchmark {
  const claim = observation.claim;
  const factors: BenchmarkRelevanceFactors = {
    target_customer_match: smbContext(context) ? !enterpriseClaim(claim) : /enterprise|mid-market/i.test(claim),
    business_model_match: /website|cms|saas|subscription|platform|agency|retainer/i.test(claim),
    revenue_model_match: /subscription|retainer|setup|monthly/i.test(claim) || observation.dimension !== "customer_acquisition_cost",
    acv_pricing_match: !/enterprise.{0,20}(cac|acv)|acv of \$(1[5-9]|[2-9]\d)\d{3}/i.test(claim),
    sales_motion_match: selfServe(context)
      ? !/enterprise sales|field sales/i.test(claim)
      : salesAssisted(context) || true,
    channel_match: observation.channel != null || !/cac|cpc|cpl/i.test(observation.dimension),
    service_intensity_match: serviceHeavy(context) ? /website|managed|agency|service/i.test(claim) || !/pure software|self-serve only/i.test(claim) : true,
    geography_match: !/india only|apac-only|europe-only/i.test(claim),
    recency: !observation.publishedAt || Number(observation.publishedAt) >= 2020,
    source_quality: sourceQualityScore(observation.sourceClass) >= 0.7,
  };
  const weights: Array<keyof BenchmarkRelevanceFactors> = [
    "target_customer_match",
    "business_model_match",
    "acv_pricing_match",
    "sales_motion_match",
    "source_quality",
    "recency",
    "service_intensity_match",
    "channel_match",
    "revenue_model_match",
    "geography_match",
  ];
  const hits = weights.filter((key) => factors[key]).length;
  let score = hits / weights.length;
  if (smbContext(context) && enterpriseClaim(claim)) score = Math.min(score, 0.22);
  if (!observation.grounded) score *= 0.5;
  score *= 0.5 + 0.5 * sourceQualityScore(observation.sourceClass);

  let relevance: BenchmarkRelevance = "MEDIUM_RELEVANCE";
  if (score >= 0.72) relevance = "HIGH_RELEVANCE";
  else if (score >= 0.45) relevance = "MEDIUM_RELEVANCE";
  else if (score >= 0.28) relevance = "LOW_RELEVANCE";
  else relevance = "REJECTED";

  const rejectedReason =
    relevance === "REJECTED"
      ? smbContext(context) && enterpriseClaim(claim)
        ? "Enterprise benchmark is not relevant to an SMB venture."
        : "Relevance score below acceptance floor."
      : null;

  const whyRelevant = factors.business_model_match
    ? "Recurring SMB software/service benchmark aligned to this delivery model."
    : "Partial category overlap; not treated as a close comparable.";

  return {
    ...observation,
    relevance,
    relevanceScore: Math.round(score * 100) / 100,
    relevanceFactors: factors,
    whyRelevant,
    rejectedReason,
  };
}

export function qualifyBenchmarks(
  observations: ExtractedBenchmarkObservation[],
  context: VentureContext,
): QualifiedBenchmark[] {
  const seen = new Set<string>();
  const qualified: QualifiedBenchmark[] = [];
  for (const observation of observations) {
    if (seen.has(observation.canonicalStatKey)) continue;
    seen.add(observation.canonicalStatKey);
    const scored = scoreBenchmarkRelevance(observation, context);
    if (observation.usableForModel === false) {
      qualified.push({
        ...scored,
        relevance: "REJECTED",
        rejectedReason: observation.unusedWhy ?? "Margin observation is not usable as a modeled base.",
      });
      continue;
    }
    qualified.push(scored);
  }
  return qualified;
}
