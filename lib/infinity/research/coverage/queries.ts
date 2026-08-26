import type { EvidenceSignalType } from "../constants";
import {
  DIMENSION_SIGNAL_TYPES,
  type ResearchEvidenceDimension,
} from "./dimensions";

export type ResearchCoverageSeed = {
  ideaTitle?: string | null;
  ideaDescription?: string | null;
  targetCustomer?: string | null;
  problem?: string | null;
  businessModelHypothesis?: string | null;
  pricingHypothesis?: string | null;
  competitorLeads?: string[];
};

export type PlannedResearchQuery = {
  queryId: string;
  query: string;
  targetDimensions: ResearchEvidenceDimension[];
  targetSignalTypes: EvidenceSignalType[];
  intent: string;
};

export function queryIdentity(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRedundantQuery(candidate: string, existing: Iterable<string>): boolean {
  const normalized = queryIdentity(candidate);
  if (!normalized) return true;
  const candidateTokens = new Set(normalized.split(" ").filter((token) => token.length > 2));
  for (const prior of existing) {
    const other = queryIdentity(prior);
    if (!other) continue;
    if (normalized === other || normalized.includes(other) || other.includes(normalized)) {
      return true;
    }
    const priorTokens = new Set(other.split(" ").filter((token) => token.length > 2));
    const overlap = [...candidateTokens].filter((token) => priorTokens.has(token)).length;
    const min = Math.min(candidateTokens.size, priorTokens.size);
    if (min > 0 && overlap / min >= 0.8) return true;
  }
  return false;
}

export function categoryTerm(seed: ResearchCoverageSeed, objective = ""): string {
  const title = seed.ideaTitle?.trim();
  if (title) {
    const withoutBrand = title.replace(/^infinity\s+/i, "").trim();
    return withoutBrand || title;
  }
  const fromObjective = objective.match(/idea name:\s*([^.]{2,80})/i);
  if (fromObjective?.[1]) return fromObjective[1].trim();
  return "software product";
}

export function competitorLeadsAsSeeds(seed: ResearchCoverageSeed): string[] {
  return [...new Set((seed.competitorLeads ?? []).map((item) => item.trim()).filter(Boolean))].slice(0, 3);
}

function queryFor(
  dimension: ResearchEvidenceDimension,
  query: string,
  intent: string,
  index: number,
): PlannedResearchQuery {
  return {
    queryId: `${dimension}-${index}`,
    query,
    targetDimensions: [dimension],
    targetSignalTypes: DIMENSION_SIGNAL_TYPES[dimension],
    intent,
  };
}

export function candidateQueriesForDimension(
  dimension: ResearchEvidenceDimension,
  seed: ResearchCoverageSeed,
  objective = "",
): PlannedResearchQuery[] {
  const category = categoryTerm(seed, objective);
  const problem = seed.problem?.trim() || `${category} customer problem`;
  const leads = competitorLeadsAsSeeds(seed);
  switch (dimension) {
    case "demand":
      return [
        queryFor("demand", `${problem} customer complaints`, "recurring customer pain", 1),
        queryFor("demand", `${category} buyer complaints forum`, "alternate demand gap-fill", 2),
      ];
    case "market":
      return [
        queryFor("market", `${category} market growth adoption`, "category size and adoption", 1),
        queryFor("market", `${category} industry outlook`, "alternate market gap-fill", 2),
      ];
    case "competition":
      return [
        ...leads.map((lead, index) =>
          queryFor("competition", `${lead} product category`, "founder competitor existence/category", index + 1),
        ),
        queryFor("competition", `${category} competitors positioning`, "category competitor set", leads.length + 1),
        ...leads.map((lead, index) =>
          queryFor("competition", `${lead} reviews complaints`, "competitor weakness gap-fill", leads.length + index + 2),
        ),
      ];
    case "pricing":
      return [
        queryFor("pricing", `${category} pricing`, "category pricing", 1),
        ...leads.slice(0, 2).map((lead, index) =>
          queryFor("pricing", `${lead} pricing`, "competitor pricing seed", index + 2),
        ),
      ];
    case "monetization":
      return [
        queryFor(
          "monetization",
          `${category} subscription business model`,
          "category monetization precedent",
          1,
        ),
        queryFor("monetization", `${category} monthly pricing plans`, "alternate monetization gap-fill", 2),
      ];
    case "distribution":
      return [
        queryFor("distribution", `${category} customer acquisition channels`, "observable acquisition channels", 1),
      ];
    case "buildability":
      return [
        queryFor("buildability", `${category} implementation API integrations`, "externally visible build constraints", 1),
      ];
    case "capital_efficiency":
      return [queryFor("capital_efficiency", `${category} software platform cost`, "observable vendor/platform cost", 1)];
    case "speed_to_revenue":
      return [queryFor("speed_to_revenue", `${category} onboarding setup time`, "purchase/onboarding cycle proxies", 1)];
    default:
      return [];
  }
}

export function selectBoundedQueries(
  candidates: PlannedResearchQuery[],
  usedQueries: string[],
  limit: number,
): PlannedResearchQuery[] {
  const selected: PlannedResearchQuery[] = [];
  const seen = [...usedQueries];
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (isRedundantQuery(candidate.query, seen)) continue;
    selected.push(candidate);
    seen.push(candidate.query);
  }
  return selected;
}
