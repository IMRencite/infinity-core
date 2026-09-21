import { estimateResearchCostUsd } from "../cost-pricing";
import type { NormalizedEvidenceItem, NormalizedSource } from "../types";
import type { ResearchCoveragePolicy } from "./policy";
import {
  categoryTerm,
  competitorLeadsAsSeeds,
  isRedundantQuery,
  selectBoundedQueries,
  type PlannedResearchQuery,
  type ResearchCoverageSeed,
} from "./queries";
import { DIMENSION_SIGNAL_TYPES } from "./dimensions";
import { assessPricingEvidenceQuality } from "@/lib/infinity/founder-idea-lab/revenue-model-research/price-quality";
import { extractMoneyObservations } from "@/lib/infinity/founder-idea-lab/revenue-model-research/extract";

export const REVENUE_MODEL_STOP_REASONS = [
  "REVENUE_MODEL_SUFFICIENT",
  "CORE_PRICING_SUFFICIENT_SETUP_REMAINS",
  "NO_RESEARCHABLE_REVENUE_GAP",
  "REVENUE_RESEARCH_BUDGET_EXHAUSTED",
  "REVENUE_GAP_FILL_LIMIT",
  "LOW_REVENUE_INFORMATION_VALUE",
  "PROVIDER_FAILURE",
] as const;

export type RevenueModelStopReason = (typeof REVENUE_MODEL_STOP_REASONS)[number];

export type RevenuePlannerCoverageStatus = "REVENUE_MODEL_SUFFICIENT" | "REVENUE_MODEL_PARTIAL" | "REVENUE_MODEL_INSUFFICIENT";

export const REVENUE_MODEL_FOLLOW_UP_TEMPLATES = [
  "pricing",
  "plans",
  "monthly cost",
  "annual cost",
  "setup fee",
  "onboarding fee",
  "implementation fee",
  "packages",
  "pricing tiers",
  "subscription",
  "per location pricing",
  "per user pricing",
  "premium services",
  "add-ons",
  "contract",
  "service packages",
] as const;

const NUMERIC_PRICING_TEMPLATES = [
  "pricing",
  "monthly cost",
  "setup fee",
  "pricing tiers",
  "add-ons",
  "annual cost",
  "per location pricing",
] as const;

const NAME_STOP = new Set(["The", "A", "An", "SMB", "CMS", "SEO", "AEO", "AI", "Local", "Website", "Comparable", "Category"]);

const STRUCTURE_LANGUAGE =
  /\b(subscription|monthly package|retainer|setup fee|pricing tier|plan|packages?|commission|per seat|per user|per location|add-?on|upsell)\b/i;

function namedCompanies(seed: ResearchCoverageSeed, claims: string[]): string[] {
  const fromSeed = competitorLeadsAsSeeds(seed);
  const discovered: string[] = [];
  for (const claim of claims) {
    for (const match of claim.matchAll(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/g)) {
      const name = match[1]!;
      if (NAME_STOP.has(name.split(" ")[0]!)) continue;
      if (/pric(?:e|ing)|plan|subscription|setup|package|month/i.test(claim)) discovered.push(name);
    }
  }
  return [...new Set([...fromSeed, ...discovered])].slice(0, 8);
}

function setupEvidencePresent(claims: string[]): boolean {
  return claims.some((claim) =>
    extractMoneyObservations(claim).some(
      (item) => item.kind === "SETUP_FEE" && (item.amountLow != null || item.amountHigh != null || item.amount != null),
    ),
  );
}

export function assessRevenuePlannerCoverage(input: {
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded">>;
  sources: Pick<NormalizedSource, "url">[];
  seed?: ResearchCoverageSeed;
}): { status: RevenuePlannerCoverageStatus; companiesWithMoney: string[]; researchable: boolean; setupMissing: boolean; stopReason?: RevenueModelStopReason } {
  const claims = input.evidence.map((item) => item.claim);
  const hay = claims.join(" ");
  const companies = namedCompanies(input.seed ?? {}, claims);
  const companiesWithMoney = companies.filter((name) =>
    claims.some((claim) => claim.toLowerCase().includes(name.toLowerCase()) && /\$\s*[\d]/.test(claim)),
  );
  const structureKnown = STRUCTURE_LANGUAGE.test(hay);
  const findings = input.evidence.map((item) => ({
    claim: item.claim,
    sourceUrls: "sourceUrls" in item && Array.isArray((item as { sourceUrls?: string[] }).sourceUrls)
      ? (item as { sourceUrls?: string[] }).sourceUrls
      : [],
    grounded: item.grounded,
  }));
  const pricingQuality = assessPricingEvidenceQuality({
    findings,
    context: {
      title: input.seed?.ideaTitle ?? "",
      description: input.seed?.ideaTitle ?? "",
      targetCustomer: input.seed?.targetCustomer ?? "",
      problem: "",
      proposedSolution: input.seed?.ideaTitle ?? "",
      businessModelHypothesis: "",
      pricingHypothesis: "",
    },
  });
  const setupMissing = !setupEvidencePresent(claims);
  const pricingPartial = pricingQuality.status === "PARTIAL" || companiesWithMoney.length >= 1;
  if (pricingQuality.status === "SUFFICIENT") {
    return {
      status: "REVENUE_MODEL_SUFFICIENT",
      companiesWithMoney,
      researchable: setupMissing,
      setupMissing,
      stopReason: setupMissing ? "CORE_PRICING_SUFFICIENT_SETUP_REMAINS" : "REVENUE_MODEL_SUFFICIENT",
    };
  }
  if (structureKnown || pricingPartial) {
    return { status: "REVENUE_MODEL_PARTIAL", companiesWithMoney, researchable: true, setupMissing };
  }
  return { status: "REVENUE_MODEL_INSUFFICIENT", companiesWithMoney, researchable: true, setupMissing };
}

export type RevenueGapFillDecision =
  | { eligible: false; reason: RevenueModelStopReason; queries: [] }
  | { eligible: true; reason: "REVENUE_MODEL_GAP_RESEARCHABLE"; queries: PlannedResearchQuery[] };

export function evaluateRevenueGapFillEligibility(input: {
  materialCoverageSufficient: boolean;
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded">>;
  sources: Pick<NormalizedSource, "url">[];
  policy: ResearchCoveragePolicy;
  seed?: ResearchCoverageSeed;
  issuedQueries: PlannedResearchQuery[];
  revenueGapFillPhasesUsed: number;
  recordedCostUsd: number | null;
  estimatedGapFillCostUsd: number | null;
}): RevenueGapFillDecision {
  if (!input.materialCoverageSufficient) {
    return { eligible: false, reason: "NO_RESEARCHABLE_REVENUE_GAP", queries: [] };
  }
  const coverage = assessRevenuePlannerCoverage({ evidence: input.evidence, sources: input.sources, seed: input.seed });
  if (coverage.status === "REVENUE_MODEL_SUFFICIENT") {
    return { eligible: false, reason: coverage.stopReason ?? "REVENUE_MODEL_SUFFICIENT", queries: [] };
  }
  if (input.revenueGapFillPhasesUsed >= input.policy.maxRevenueGapFillPhases) {
    return { eligible: false, reason: "REVENUE_GAP_FILL_LIMIT", queries: [] };
  }
  if (
    input.recordedCostUsd != null &&
    (input.recordedCostUsd > input.policy.maxEstimatedCostUsd ||
      (input.estimatedGapFillCostUsd != null && input.recordedCostUsd + input.estimatedGapFillCostUsd > input.policy.maxEstimatedCostUsd))
  ) {
    return { eligible: false, reason: "REVENUE_RESEARCH_BUDGET_EXHAUSTED", queries: [] };
  }
  if (!coverage.researchable) {
    return { eligible: false, reason: "NO_RESEARCHABLE_REVENUE_GAP", queries: [] };
  }

  const claims = input.evidence.map((item) => item.claim);
  const hay = claims.join(" ");
  const structureKnown = STRUCTURE_LANGUAGE.test(hay);
  const companies = namedCompanies(input.seed ?? {}, claims);
  const candidates: PlannedResearchQuery[] = [];
  let index = 0;
  const templates = structureKnown ? NUMERIC_PRICING_TEMPLATES : REVENUE_MODEL_FOLLOW_UP_TEMPLATES;
  for (const company of companies) {
    for (const template of templates) {
      index += 1;
      candidates.push({
        queryId: `revenue-${index}`,
        query: `${company} ${template}`,
        targetDimensions: ["pricing", "monetization"],
        targetSignalTypes: [...DIMENSION_SIGNAL_TYPES.pricing, ...DIMENSION_SIGNAL_TYPES.monetization],
        intent: `revenue-model follow-up: ${template}`,
      });
    }
  }
  const category = categoryTerm(input.seed ?? {});
  const customer = input.seed?.targetCustomer?.trim() || "SMB";
  const numericPriority = [
    `${customer} ${category} monthly pricing`,
    `${category} adjacent comparable monthly pricing`,
    `${category} setup fee onboarding`,
    `${category} pricing tiers packages`,
    `${category} add-on pricing`,
    `${category} annual billing`,
    `${category} per location pricing`,
  ];
  for (const query of numericPriority) {
    index += 1;
    candidates.push({
      queryId: `revenue-adjacent-${index}`,
      query,
      targetDimensions: ["pricing", "monetization"],
      targetSignalTypes: [...DIMENSION_SIGNAL_TYPES.pricing, ...DIMENSION_SIGNAL_TYPES.monetization],
      intent: "numeric pricing gap-fill",
    });
  }

  const issued = input.issuedQueries.map((query) => query.query);
  const queries = selectBoundedQueries(
    candidates.filter((candidate) => !isRedundantQuery(candidate.query, issued)),
    issued,
    Math.min(input.policy.maxRevenueGapFillQueries, input.policy.maxRevenueGapFillQueryHardCap),
  );
  if (queries.length === 0) {
    return { eligible: false, reason: "LOW_REVENUE_INFORMATION_VALUE", queries: [] };
  }
  return { eligible: true, reason: "REVENUE_MODEL_GAP_RESEARCHABLE", queries };
}

export function estimateRevenueGapFillCostUsd(modelId: string, queryCount: number): number | null {
  return estimateResearchCostUsd({
    modelId,
    inputTokens: 800,
    outputTokens: 800,
    searchQueryCount: queryCount,
  }).estimatedCostUsd;
}
