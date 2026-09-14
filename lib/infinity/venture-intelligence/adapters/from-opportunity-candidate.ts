import type { CanonicalCandidateInput } from "../types";
import { asRecord, asString, asStringArray } from "../json";
import { jsonIdList } from "../lineage";
import { usefulList } from "../missing-data";

function evidenceClaims(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      return (
        asString(record?.claim) ??
        asString(record?.observedSignal) ??
        asString(record?.observed_signal) ??
        asString(record?.relevance) ??
        asString(item)
      );
    })
    .filter((item): item is string => Boolean(item));
}

function sourceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      return asString(record?.url) ?? asString(item);
    })
    .filter((item): item is string => Boolean(item));
}

export function fromOpportunityCandidate(raw: Record<string, unknown> | null): CanonicalCandidateInput | null {
  if (!raw) return null;
  const id = asString(raw.id);
  if (!id) return null;
  const models = raw.business_model_candidates ?? raw.businessModelCandidates;
  const revenue = raw.revenue_mechanism_candidates ?? raw.revenueMechanismCandidates;
  return {
    id,
    title: asString(raw.title) ?? "Untitled opportunity",
    summary: asString(raw.summary) ?? "",
    problem: asString(raw.problem) ?? "",
    targetCustomer: asString(raw.target_customer) ?? asString(raw.targetCustomer) ?? "",
    market: asString(raw.market) ?? "",
    businessModelCandidates: Array.isArray(models) ? models.map((item) => String(item)) : [],
    revenueMechanismCandidates: Array.isArray(revenue) ? revenue.map((item) => String(item)) : [],
    demandEvidence: evidenceClaims(raw.demand_evidence ?? raw.demandEvidence),
    marketEvidence: evidenceClaims(raw.market_evidence ?? raw.marketEvidence),
    monetizationEvidence: evidenceClaims(raw.monetization_evidence ?? raw.monetizationEvidence),
    distributionEvidence: evidenceClaims(raw.distribution_evidence ?? raw.distributionEvidence),
    buildabilityEvidence: evidenceClaims(raw.buildability_evidence ?? raw.buildabilityEvidence),
    competitionEvidence: evidenceClaims(raw.competition_evidence ?? raw.competitionEvidence),
    researchSources: sourceUrls(raw.research_sources ?? raw.researchSources),
    researchRunIds: jsonIdList(raw.research_run_ids ?? raw.researchRunIds),
    risks: asStringArray(raw.risks),
    unknowns: asStringArray(raw.unknowns),
  };
}

export function candidateMarketCopy(candidate: CanonicalCandidateInput | null): {
  pain: string;
  weakness: string;
  differentiator: string;
  better: string;
  problems: string[];
} {
  const pain = candidate?.problem || candidate?.demandEvidence[0] || "";
  const weakness = candidate?.competitionEvidence[0] || "";
  const hasEvidence = Boolean(pain && weakness);
  return {
    pain,
    weakness,
    differentiator: hasEvidence ? weakness : "",
    better: hasEvidence ? (candidate?.summary || "") : "",
    problems: usefulList([pain, ...(candidate?.demandEvidence ?? [])]),
  };
}
