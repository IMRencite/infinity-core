import type { AssumptionRecord, LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";
import { canonicalValidationSourceKey } from "./evidence-dedupe";

export type EvidenceRelevanceClass =
  | "DIRECT"
  | "PARTIAL"
  | "INDIRECT"
  | "IRRELEVANT"
  | "CONTRADICTORY";

export type ValidationEvidentiaryResult =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "INCONCLUSIVE"
  | "CONTRADICTED";

export type AssumptionValidationKind =
  | "quantitative_customer_count"
  | "quantitative_cac"
  | "pricing"
  | "demand_qualitative"
  | "acquisition_qualitative"
  | "economic_qualitative"
  | "other";

const DEMAND_KEYWORDS =
  /demand|search|organic|calculator|pain|problem|waste|competition|spreadsheet|platform|market|adopt/i;
const CAC_KEYWORDS =
  /cac|acquisition cost|cpc|cpm|conversion|outbound|channel economics|paid|cost per|ltv/i;
const CUSTOMER_COUNT_KEYWORDS =
  /customer count|paying customer|users|signups|adoption rate|conversion volume|addressable|year one|year-one|\d+\s+customer/i;
const QUANTITATIVE_PATTERN = /\$?\d[\d,]*(?:\.\d+)?|\d+\s*(?:customer|user|paying|signup)/i;
const CONTRADICTION_KEYWORDS =
  /unlikely|no demand|crowded|saturated|cannot|won't pay|too expensive|substitut/i;

export function classifyAssumptionKind(assumption: AssumptionRecord): AssumptionValidationKind {
  const text = `${assumption.assumption} ${assumption.category} ${assumption.value ?? ""}`.toLowerCase();
  if (/cac|acquisition cost|customer acquisition/.test(text)) return "quantitative_cac";
  if (/customer|paying|year one|year-one|acquire ~\d+/.test(text) && /\d+/.test(text)) {
    return "quantitative_customer_count";
  }
  if (assumption.category === "pricing") return "pricing";
  if (assumption.category === "demand") return "demand_qualitative";
  if (assumption.category === "acquisition") return "acquisition_qualitative";
  if (assumption.category === "economic") return "economic_qualitative";
  return "other";
}

export function extractPriorSourceUrls(candidate: LoadedCandidateBundle): Set<string> {
  const urls = new Set<string>();
  const buckets = [
    candidate.demandEvidence,
    candidate.monetizationEvidence,
    candidate.competitionEvidence,
    candidate.distributionEvidence,
    candidate.buildabilityEvidence,
    candidate.researchSources,
  ];
  for (const bucket of buckets) {
    for (const item of bucket) {
      const record = item as Record<string, unknown>;
      if (Array.isArray(record.sourceUrls)) {
        for (const url of record.sourceUrls) {
          if (typeof url === "string") urls.add(url);
        }
      }
    }
  }
  for (const url of candidate.monetization?.primaryPlan?.sourceUrls ?? []) {
    urls.add(url);
  }
  for (const assumption of candidate.monetization?.primaryPlan?.keyAssumptions ?? []) {
    if (assumption.startsWith("http")) urls.add(assumption);
  }
  return urls;
}

export function classifySourceNovelty(
  sourceUrls: string[],
  priorSourceUrls: Set<string>,
): { newSourceUrls: string[]; reusedSourceUrls: string[]; newSourceCount: number; reusedSourceCount: number } {
  const priorKeys = new Set([...priorSourceUrls].map((url) => canonicalValidationSourceKey(url)));
  const newSourceUrls: string[] = [];
  const reusedSourceUrls: string[] = [];
  const seenNew = new Set<string>();
  const seenReused = new Set<string>();

  for (const url of sourceUrls) {
    const key = canonicalValidationSourceKey(url);
    const isReused = priorSourceUrls.has(url) || priorKeys.has(key);
    if (isReused) {
      if (seenReused.has(key)) continue;
      seenReused.add(key);
      reusedSourceUrls.push(url);
    } else {
      if (seenNew.has(key)) continue;
      seenNew.add(key);
      newSourceUrls.push(url);
    }
  }

  return {
    newSourceUrls,
    reusedSourceUrls,
    newSourceCount: newSourceUrls.length,
    reusedSourceCount: reusedSourceUrls.length,
  };
}

export function classifyEvidenceRelevance(input: {
  assumption: AssumptionRecord;
  evidenceText: string;
  experimentType: string;
}): EvidenceRelevanceClass {
  const text = input.evidenceText.toLowerCase();
  const assumptionText = input.assumption.assumption.toLowerCase();
  const kind = classifyAssumptionKind(input.assumption);

  if (CONTRADICTION_KEYWORDS.test(text) && !DEMAND_KEYWORDS.test(text)) {
    return "CONTRADICTORY";
  }

  switch (kind) {
    case "quantitative_customer_count": {
      const mentionsQuantity =
        CUSTOMER_COUNT_KEYWORDS.test(text) ||
        (QUANTITATIVE_PATTERN.test(text) && /customer|user|paying|signup|adopt/.test(text));
      const mentionsDemandOnly = DEMAND_KEYWORDS.test(text) && !mentionsQuantity;
      if (mentionsQuantity && text.includes(String(input.assumption.assumption.match(/\d+/)?.[0] ?? ""))) {
        return "DIRECT";
      }
      if (mentionsQuantity) return "PARTIAL";
      if (mentionsDemandOnly) return "INDIRECT";
      return "IRRELEVANT";
    }
    case "quantitative_cac": {
      const mentionsCac =
        CAC_KEYWORDS.test(text) ||
        (QUANTITATIVE_PATTERN.test(text) && /\$|cac|cost/.test(text));
      const mentionsDemandOnly = DEMAND_KEYWORDS.test(text) && !mentionsCac;
      const assumptionAmount = assumptionText.match(/\$?\d[\d,]*/)?.[0]?.replace(/[$,]/g, "");
      if (mentionsCac && assumptionAmount && text.includes(assumptionAmount)) return "DIRECT";
      if (mentionsCac) return "PARTIAL";
      if (mentionsDemandOnly) return "IRRELEVANT";
      return "IRRELEVANT";
    }
    case "pricing":
      if (/pricing|price|\$|subscription|willingness to pay|pay for/.test(text)) return "PARTIAL";
      if (DEMAND_KEYWORDS.test(text)) return "INDIRECT";
      return "IRRELEVANT";
    case "demand_qualitative":
      if (DEMAND_KEYWORDS.test(text)) return "PARTIAL";
      return "IRRELEVANT";
    case "acquisition_qualitative":
      if (CAC_KEYWORDS.test(text) || /distribution|channel|seo|outbound/.test(text)) return "PARTIAL";
      if (DEMAND_KEYWORDS.test(text)) return "INDIRECT";
      return "IRRELEVANT";
    case "economic_qualitative":
      if (/retention|churn|margin|economics|switching|substitut/.test(text)) return "PARTIAL";
      if (DEMAND_KEYWORDS.test(text)) return "INDIRECT";
      return "IRRELEVANT";
    default:
      if (DEMAND_KEYWORDS.test(text)) return "INDIRECT";
      return "IRRELEVANT";
  }
}

/** Bounded explainable credit constants — relevance-weighted, not flat completion rewards. */
export const EVIDENCE_CREDIT_BY_RELEVANCE: Record<
  EvidenceRelevanceClass,
  { confidenceImpact: number; assumptionImpact: number }
> = {
  DIRECT: { confidenceImpact: 0.12, assumptionImpact: 0.15 },
  PARTIAL: { confidenceImpact: 0.05, assumptionImpact: 0.06 },
  INDIRECT: { confidenceImpact: 0.01, assumptionImpact: 0.02 },
  IRRELEVANT: { confidenceImpact: 0, assumptionImpact: 0 },
  CONTRADICTORY: { confidenceImpact: -0.05, assumptionImpact: -0.08 },
};

export function deriveValidationCredit(input: {
  relevance: EvidenceRelevanceClass;
  newSourceCount: number;
  reusedSourceCount: number;
  hasQuantitativeClaim: boolean;
}): {
  confidenceImpact: number;
  assumptionImpact: number;
  uncertaintyReduction: number;
  newEvidenceFound: boolean;
  validationResult: ValidationEvidentiaryResult;
} {
  const base = EVIDENCE_CREDIT_BY_RELEVANCE[input.relevance];
  const onlyReusedSources = input.newSourceCount === 0 && input.reusedSourceCount > 0;
  const noMaterialNovelty = onlyReusedSources && input.relevance !== "DIRECT";

  if (input.relevance === "IRRELEVANT" || noMaterialNovelty) {
    return {
      confidenceImpact: 0,
      assumptionImpact: 0,
      uncertaintyReduction: 0,
      newEvidenceFound: false,
      validationResult: "INCONCLUSIVE",
    };
  }

  if (input.relevance === "CONTRADICTORY") {
    return {
      confidenceImpact: base.confidenceImpact,
      assumptionImpact: 0,
      uncertaintyReduction: 0,
      newEvidenceFound: input.newSourceCount > 0,
      validationResult: "CONTRADICTED",
    };
  }

  let confidenceImpact = base.confidenceImpact;
  let assumptionImpact = base.assumptionImpact;

  if (input.relevance === "INDIRECT") {
    confidenceImpact = Math.min(confidenceImpact, 0.01);
    assumptionImpact = Math.min(assumptionImpact, 0.02);
  }

  if (
    (input.relevance === "DIRECT" || input.relevance === "PARTIAL") &&
    input.hasQuantitativeClaim === false &&
    (input.relevance === "DIRECT" || input.relevance === "PARTIAL")
  ) {
    assumptionImpact *= 0.5;
    confidenceImpact *= 0.5;
  }

  const validationResult: ValidationEvidentiaryResult =
    input.relevance === "DIRECT"
      ? "SUPPORTED"
      : input.relevance === "PARTIAL"
        ? "PARTIALLY_SUPPORTED"
        : input.relevance === "INDIRECT"
          ? "INCONCLUSIVE"
          : "INCONCLUSIVE";

  return {
    confidenceImpact,
    assumptionImpact,
    uncertaintyReduction: assumptionImpact,
    newEvidenceFound: input.newSourceCount > 0 || input.relevance === "DIRECT",
    validationResult,
  };
}

export function resolveTruthfulExperimentType(input: {
  requestedType: string;
  providerCalls: number;
  hadExternalExposure: boolean;
}): string {
  const normalized = input.requestedType.toLowerCase();
  if (
    normalized.includes("landing_page_demand_test") ||
    normalized === "landing_page_demand_test"
  ) {
    if (input.hadExternalExposure && input.providerCalls > 0) return "landing_page_demand_test";
    return "search_demand_evidence";
  }
  if (normalized.includes("pricing_test") && input.providerCalls === 0) {
    return "public_pricing_comparison";
  }
  if (normalized.includes("outbound_response_test")) {
    return "search_demand_evidence";
  }
  return normalized;
}

export const EXPERIMENT_EXECUTABILITY: Record<
  string,
  {
    requiresExternalExposure: boolean;
    requiresHumanParticipation: boolean;
    requiresPublicDeployment: boolean;
    requiresProviderCall: boolean;
    requiresExternalSpend: boolean;
    autonomousUnderFavc1: boolean;
  }
> = {
  search_demand_evidence: {
    requiresExternalExposure: false,
    requiresHumanParticipation: false,
    requiresPublicDeployment: false,
    requiresProviderCall: false,
    requiresExternalSpend: false,
    autonomousUnderFavc1: true,
  },
  public_demand_evidence_research: {
    requiresExternalExposure: false,
    requiresHumanParticipation: false,
    requiresPublicDeployment: false,
    requiresProviderCall: false,
    requiresExternalSpend: false,
    autonomousUnderFavc1: true,
  },
  public_pricing_comparison: {
    requiresExternalExposure: false,
    requiresHumanParticipation: false,
    requiresPublicDeployment: false,
    requiresProviderCall: false,
    requiresExternalSpend: false,
    autonomousUnderFavc1: true,
  },
  landing_page_artifact: {
    requiresExternalExposure: false,
    requiresHumanParticipation: false,
    requiresPublicDeployment: false,
    requiresProviderCall: false,
    requiresExternalSpend: false,
    autonomousUnderFavc1: true,
  },
  landing_page_demand_test: {
    requiresExternalExposure: true,
    requiresHumanParticipation: true,
    requiresPublicDeployment: true,
    requiresProviderCall: false,
    requiresExternalSpend: false,
    autonomousUnderFavc1: false,
  },
  customer_interview: {
    requiresExternalExposure: true,
    requiresHumanParticipation: true,
    requiresPublicDeployment: false,
    requiresProviderCall: false,
    requiresExternalSpend: false,
    autonomousUnderFavc1: false,
  },
  paid_ads: {
    requiresExternalExposure: true,
    requiresHumanParticipation: false,
    requiresPublicDeployment: true,
    requiresProviderCall: true,
    requiresExternalSpend: true,
    autonomousUnderFavc1: false,
  },
};
