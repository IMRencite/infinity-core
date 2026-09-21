import {
  categoryTerm,
  competitorLeadsAsSeeds,
  isRedundantQuery,
  selectBoundedQueries,
  type PlannedResearchQuery,
  type ResearchCoverageSeed,
} from "@/lib/infinity/research/coverage/queries";
import { DIMENSION_SIGNAL_TYPES } from "@/lib/infinity/research/coverage/dimensions";
import { REVENUE_MODEL_FOLLOW_UP_TEMPLATES } from "@/lib/infinity/research/coverage/revenue-gap-fill";
import { discoverAdjacentComparableQueries, extractNamedCompanies } from "./qualify";

const PRIORITY_INTENTS = [
  "actual comparable pricing",
  "setup/onboarding",
  "recurring pricing structure",
  "tiering/packaging",
  "add-ons/upsells",
  "annual contracts",
  "per-seat/per-location/usage structure",
  "service intensity / delivery cost clues",
  "acquisition/distribution model",
  "churn/retention benchmark",
  "gross margin benchmark",
] as const;

export function comparableFollowUpQueries(companies: string[]): string[] {
  const queries: string[] = [];
  for (const company of companies) {
    const name = company.trim();
    if (!name) continue;
    for (const template of REVENUE_MODEL_FOLLOW_UP_TEMPLATES) {
      queries.push(`${name} ${template}`);
    }
  }
  return queries;
}

export function planRevenueModelFollowUpQueries(input: {
  seed: ResearchCoverageSeed;
  discoveredCompanies: string[];
  issuedQueries: string[];
  limit: number;
  hardCap: number;
  claims?: string[];
}): PlannedResearchQuery[] {
  const companies = [...new Set([...competitorLeadsAsSeeds(input.seed), ...input.discoveredCompanies.map((item) => item.trim()).filter(Boolean)])];
  const candidates: PlannedResearchQuery[] = [];
  let index = 0;
  for (const company of companies) {
    for (const template of REVENUE_MODEL_FOLLOW_UP_TEMPLATES) {
      index += 1;
      candidates.push({
        queryId: `revenue-model-${index}`,
        query: `${company} ${template}`,
        targetDimensions: template.includes("setup") || template.includes("implementation") ? ["pricing"] : ["pricing", "monetization"],
        targetSignalTypes: [...DIMENSION_SIGNAL_TYPES.pricing, ...DIMENSION_SIGNAL_TYPES.monetization],
        intent: PRIORITY_INTENTS[Math.min(index - 1, PRIORITY_INTENTS.length - 1)]!,
      });
    }
  }
  const namedWithoutPricing = companies.filter((company) => {
    const hay = (input.claims ?? []).join(" ").toLowerCase();
    return !hay.includes(company.toLowerCase()) || !/\$\s*[\d]/.test(hay);
  });
  const adjacent = discoverAdjacentComparableQueries({
    category: categoryTerm(input.seed),
    targetCustomer: input.seed.targetCustomer ?? null,
    namedWithoutPricing,
  });
  for (const query of adjacent) {
    index += 1;
    candidates.push({
      queryId: `revenue-model-adjacent-${index}`,
      query,
      targetDimensions: ["pricing", "monetization"],
      targetSignalTypes: [...DIMENSION_SIGNAL_TYPES.pricing, ...DIMENSION_SIGNAL_TYPES.monetization],
      intent: "adjacent comparable discovery",
    });
  }
  const cap = Math.min(input.limit, input.hardCap);
  return selectBoundedQueries(
    candidates.filter((candidate) => !isRedundantQuery(candidate.query, input.issuedQueries)),
    input.issuedQueries,
    cap,
  );
}

export function discoverCompaniesFromClaims(claims: string[]): string[] {
  return extractNamedCompanies(claims.join(" "));
}
