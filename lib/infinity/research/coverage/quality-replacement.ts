import type { NormalizedEvidenceItem, NormalizedSource } from "../types";
import type { ResearchCoveragePolicy } from "./policy";
import {
  isRedundantQuery,
  selectBoundedQueries,
  type PlannedResearchQuery,
  type ResearchCoverageSeed,
} from "./queries";
import { DIMENSION_SIGNAL_TYPES } from "./dimensions";
import { assessPricingEvidenceQuality } from "@/lib/infinity/founder-idea-lab/revenue-model-research/price-quality";
import {
  classifyPricingCluster,
  marginQueriesForCluster,
  selectPricingCluster,
  setupQueriesForCluster,
  type PricingCluster,
} from "@/lib/infinity/founder-idea-lab/revenue-model-research/pricing-cluster";
import { extractMoneyObservations } from "@/lib/infinity/founder-idea-lab/revenue-model-research/extract";
import { extractBenchmarkObservations } from "@/lib/infinity/founder-idea-lab/benchmark-economics/extract";
import { qualifyBenchmarks } from "@/lib/infinity/founder-idea-lab/benchmark-economics/qualify";
import { coverageFromAcceptedQuality, confidenceFromAcceptedQuality } from "@/lib/infinity/founder-idea-lab/benchmark-economics/confidence";
import { feedsBaseCase } from "@/lib/infinity/founder-idea-lab/benchmark-economics/aggregate";
import { modelRetention } from "@/lib/infinity/founder-idea-lab/benchmark-economics/model-retention";
import { rangeHasValue } from "@/lib/infinity/founder-idea-lab/comparable-economics/provenance";
import type { VentureContext } from "@/lib/infinity/founder-idea-lab/comparable-economics/qualify";
import type { FounderResearchFinding } from "@/lib/infinity/founder-idea-lab/research-packet";

export const QUALITY_REPLACEMENT_STATES = [
  "QUALITY_REPLACEMENT_REQUIRED",
  "QUALITY_REPLACEMENT_RUNNING",
  "QUALITY_REPLACEMENT_EXHAUSTED",
  "QUALITY_REPLACEMENT_SUCCEEDED",
] as const;

export type QualityReplacementState = (typeof QUALITY_REPLACEMENT_STATES)[number];

export const QUALITY_REPLACEMENT_STOP_REASONS = [
  "QUALITY_REPLACEMENT_SUCCEEDED",
  "QUALITY_REPLACEMENT_EXHAUSTED",
  "QUALITY_REPLACEMENT_LIMIT",
  "QUALITY_REPLACEMENT_BUDGET_EXHAUSTED",
  "NO_QUALITY_REPLACEMENT_GAP",
  "LOW_QUALITY_REPLACEMENT_INFORMATION_VALUE",
] as const;

export type QualityReplacementStopReason = (typeof QUALITY_REPLACEMENT_STOP_REASONS)[number];

export type QualityReplacementDimension = "pricing" | "cac" | "retention" | "margin" | "setup";

/** One quality-replacement phase may include several queries. Priority is deterministic. */
export const QUALITY_REPLACEMENT_PRIORITY: QualityReplacementDimension[] = [
  "margin",
  "pricing",
  "cac",
  "retention",
  "setup",
];

function contextFromSeed(seed?: ResearchCoverageSeed): VentureContext {
  return {
    title: seed?.ideaTitle ?? "",
    description: seed?.ideaDescription ?? seed?.ideaTitle ?? "",
    targetCustomer: seed?.targetCustomer ?? "",
    problem: seed?.problem ?? "",
    proposedSolution: seed?.ideaTitle ?? "",
    businessModelHypothesis: seed?.businessModelHypothesis ?? "",
    pricingHypothesis: seed?.pricingHypothesis ?? "",
  };
}

function findingsFromEvidence(
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded"> & { sourceUrls?: string[] }>,
  sources: Pick<NormalizedSource, "url">[],
): FounderResearchFinding[] {
  const fallback = sources[0]?.url ? [sources[0].url] : [];
  return evidence.map((item, index) => ({
    findingId: `quality-${index}`,
    dimension: "capital_efficiency",
    claim: item.claim,
    polarity: "mixed",
    grounded: item.grounded,
    confidence: 0.5,
    sourceUrls: item.sourceUrls?.length ? item.sourceUrls : fallback,
    limitations: [],
  }));
}

export function assessQualityReplacementNeeds(input: {
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded"> & { sourceUrls?: string[] }>;
  sources: Array<Pick<NormalizedSource, "url" | "title" | "publisher" | "domain">>;
  seed?: ResearchCoverageSeed;
}): {
  state: Exclude<QualityReplacementState, "QUALITY_REPLACEMENT_RUNNING" | "QUALITY_REPLACEMENT_EXHAUSTED">;
  dimensions: QualityReplacementDimension[];
  selectedCluster: PricingCluster;
  missingCacStages: string[];
} {
  const context = contextFromSeed(input.seed);
  const claims = input.evidence.map((item) => item.claim);
  const pricedClusters = claims
    .filter((claim) => /\$\s*[\d]/.test(claim))
    .map((claim) => classifyPricingCluster(claim, context));
  const selection = selectPricingCluster({ context, pricedClusters });
  const pricingQuality = assessPricingEvidenceQuality({
    findings: input.evidence.map((item) => ({ claim: item.claim, sourceUrls: item.sourceUrls })),
    context,
  });
  const findings = findingsFromEvidence(input.evidence, input.sources);
  const qualified = qualifyBenchmarks(extractBenchmarkObservations(findings), context);
  const accepted = qualified.filter(feedsBaseCase);
  const cacAccepted = accepted.filter((item) => item.dimension === "customer_acquisition_cost");
  const marginAccepted = accepted.filter((item) => item.dimension === "gross_margin" && item.usableForModel !== false);
  const retention = modelRetention({ aggregations: {}, qualified });
  const dimensions: QualityReplacementDimension[] = [];
  const hasNumericPrice = claims.some((claim) => extractMoneyObservations(claim).some((item) => item.unit === "USD"));
  if (hasNumericPrice && pricingQuality.status !== "SUFFICIENT") dimensions.push("pricing");
  if (cacAccepted.length > 0 && coverageFromAcceptedQuality(cacAccepted) !== "BENCHMARK_SUFFICIENT") dimensions.push("cac");
  if (cacAccepted.length === 0) dimensions.push("cac");
  const lifetimeUsable = rangeHasValue(retention.lifetimeMonths);
  const retentionAccepted = accepted.filter(
    (item) =>
      (item.dimension === "monthly_churn" && item.churnKind === "monthly_logo") ||
      (item.dimension === "annual_churn" && item.churnKind === "annual_logo") ||
      item.dimension === "customer_lifetime",
  );
  if (lifetimeUsable && coverageFromAcceptedQuality(retentionAccepted) !== "BENCHMARK_SUFFICIENT") dimensions.push("retention");
  if (!lifetimeUsable) dimensions.push("retention");
  if (marginAccepted.length === 0 || coverageFromAcceptedQuality(marginAccepted) !== "BENCHMARK_SUFFICIENT") {
    dimensions.push("margin");
  }
  const setupPresent = claims.some((claim) =>
    extractMoneyObservations(claim).some((item) => item.kind === "SETUP_FEE" && (item.amount != null || item.amountLow != null)),
  );
  if (!setupPresent) dimensions.push("setup");

  const missingCacStages: string[] = [];
  const has = (dimension: string) => accepted.some((item) => item.dimension === dimension);
  if (!has("cost_per_click")) missingCacStages.push("CPC");
  if (!has("visitor_to_lead_conversion")) missingCacStages.push("visitor_to_lead");
  if (!has("lead_to_customer_conversion") && !has("sales_close_rate")) missingCacStages.push("lead_to_customer");
  if (!has("sales_labor_cost")) missingCacStages.push("sales_labor");

  const unique = QUALITY_REPLACEMENT_PRIORITY.filter((dimension) => dimensions.includes(dimension));
  const succeeded =
    pricingQuality.status === "SUFFICIENT" &&
    coverageFromAcceptedQuality(cacAccepted) === "BENCHMARK_SUFFICIENT" &&
    coverageFromAcceptedQuality(marginAccepted) === "BENCHMARK_SUFFICIENT" &&
    (coverageFromAcceptedQuality(retentionAccepted) === "BENCHMARK_SUFFICIENT" ||
      (lifetimeUsable && confidenceFromAcceptedQuality(retentionAccepted) !== "LOW" && retentionAccepted.length > 1));
  return {
    state: succeeded ? "QUALITY_REPLACEMENT_SUCCEEDED" : unique.length ? "QUALITY_REPLACEMENT_REQUIRED" : "QUALITY_REPLACEMENT_SUCCEEDED",
    dimensions: unique,
    selectedCluster: selection.selectedPricingCluster,
    missingCacStages,
  };
}

function query(queryId: string, text: string, dimensions: Array<"pricing" | "monetization" | "distribution">, intent: string): PlannedResearchQuery {
  return {
    queryId,
    query: text,
    targetDimensions: dimensions,
    targetSignalTypes: dimensions.flatMap((dimension) => DIMENSION_SIGNAL_TYPES[dimension]),
    intent,
  };
}

function clusterModelLabel(cluster: PricingCluster): string {
  if (cluster === "VERTICAL_CMS_PLATFORM") return "vertical SaaS";
  if (cluster === "AI_CMS_PLATFORM") return "AI website CMS";
  if (cluster === "WEBSITE_AS_A_SERVICE") return "website-as-a-service";
  if (cluster === "HYBRID_CMS_MANAGED_SERVICE") return "hybrid CMS managed service";
  return "SMB software";
}

function queriesForDimension(
  dimension: QualityReplacementDimension,
  input: {
    seed?: ResearchCoverageSeed;
    selectedCluster: PricingCluster;
    missingCacStages: string[];
  },
): PlannedResearchQuery[] {
  const customer = input.seed?.targetCustomer?.trim() || "SMB";
  const cluster = input.selectedCluster;
  const model = clusterModelLabel(cluster);
  const items: Array<{ text: string; dimensions: Array<"pricing" | "monetization" | "distribution">; intent: string }> = [];
  if (dimension === "margin") {
    for (const item of marginQueriesForCluster(cluster, customer)) {
      items.push({ text: item, dimensions: ["monetization"], intent: "quality-replacement:margin" });
    }
  }
  if (dimension === "pricing") {
    items.push(
      { text: `vertical SaaS SMB website platform pricing`, dimensions: ["pricing"], intent: "quality-replacement:pricing" },
      { text: `${customer} ${model} official pricing page`, dimensions: ["pricing"], intent: "quality-replacement:pricing" },
      { text: `${customer} ${model} public rate card`, dimensions: ["pricing"], intent: "quality-replacement:pricing" },
      { text: `${model} methodology-backed pricing benchmark`, dimensions: ["pricing"], intent: "quality-replacement:pricing" },
      { text: `${customer} ${model} monthly subscription pricing`, dimensions: ["pricing"], intent: "quality-replacement:pricing" },
    );
  }
  if (dimension === "cac") {
    items.push(
      { text: `${customer} ${model} CAC benchmark report`, dimensions: ["monetization"], intent: "quality-replacement:cac" },
      { text: `SMB SaaS customer acquisition cost study`, dimensions: ["monetization"], intent: "quality-replacement:cac" },
      { text: `vertical SaaS CAC industry report`, dimensions: ["monetization"], intent: "quality-replacement:cac" },
      { text: `website-as-a-service customer acquisition cost`, dimensions: ["monetization"], intent: "quality-replacement:cac" },
      { text: `digital marketing SaaS CAC methodology`, dimensions: ["monetization"], intent: "quality-replacement:cac" },
    );
    if (input.missingCacStages.includes("CPC")) {
      items.push({ text: `${customer} ${model} Google Ads CPC`, dimensions: ["distribution"], intent: "quality-replacement:cac-component" });
    }
    if (input.missingCacStages.includes("visitor_to_lead")) {
      items.push({
        text: `${customer} ${model} visitor to lead conversion`,
        dimensions: ["distribution"],
        intent: "quality-replacement:cac-component",
      });
    }
    if (input.missingCacStages.includes("lead_to_customer")) {
      items.push({
        text: `${customer} ${model} lead to customer conversion`,
        dimensions: ["distribution"],
        intent: "quality-replacement:cac-component",
      });
    }
    if (input.missingCacStages.includes("sales_labor")) {
      items.push({
        text: `${customer} ${model} sales labor cost per customer`,
        dimensions: ["monetization"],
        intent: "quality-replacement:cac-component",
      });
    }
  }
  if (dimension === "retention") {
    items.push(
      { text: `${customer} SaaS monthly logo churn`, dimensions: ["monetization"], intent: "quality-replacement:retention" },
      { text: `vertical SaaS logo churn benchmark`, dimensions: ["monetization"], intent: "quality-replacement:retention" },
      { text: `SMB software customer retention`, dimensions: ["monetization"], intent: "quality-replacement:retention" },
      { text: `website subscription churn study`, dimensions: ["monetization"], intent: "quality-replacement:retention" },
      { text: `website-as-a-service retention`, dimensions: ["monetization"], intent: "quality-replacement:retention" },
    );
  }
  if (dimension === "setup") {
    for (const item of setupQueriesForCluster(cluster, customer)) {
      items.push({ text: item, dimensions: ["pricing"], intent: "quality-replacement:setup" });
    }
  }
  return items.map((item, index) => query(`${dimension}-${index + 1}`, item.text, item.dimensions, item.intent));
}

function interleaveByPriority(buckets: Map<QualityReplacementDimension, PlannedResearchQuery[]>): PlannedResearchQuery[] {
  const ordered = QUALITY_REPLACEMENT_PRIORITY.filter((dimension) => (buckets.get(dimension)?.length ?? 0) > 0);
  const out: PlannedResearchQuery[] = [];
  let round = 0;
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const dimension of ordered) {
      const bucket = buckets.get(dimension) ?? [];
      const next = bucket[round];
      if (next) {
        out.push(next);
        remaining = true;
      }
    }
    round += 1;
  }
  return out.map((item, index) => ({ ...item, queryId: `quality-${index + 1}` }));
}

export function qualityReplacementQueries(input: {
  seed?: ResearchCoverageSeed;
  dimensions: QualityReplacementDimension[];
  selectedCluster: PricingCluster;
  missingCacStages: string[];
}): PlannedResearchQuery[] {
  const buckets = new Map<QualityReplacementDimension, PlannedResearchQuery[]>();
  for (const dimension of QUALITY_REPLACEMENT_PRIORITY) {
    if (!input.dimensions.includes(dimension)) continue;
    buckets.set(dimension, queriesForDimension(dimension, input));
  }
  return interleaveByPriority(buckets);
}

export type QualityReplacementDecision =
  | { eligible: false; reason: QualityReplacementStopReason; state: QualityReplacementState; queries: [] }
  | { eligible: true; reason: "QUALITY_REPLACEMENT_REQUIRED"; state: "QUALITY_REPLACEMENT_REQUIRED"; queries: PlannedResearchQuery[] };

export function evaluateQualityReplacementEligibility(input: {
  materialCoverageSufficient: boolean;
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded"> & { sourceUrls?: string[] }>;
  sources: Array<Pick<NormalizedSource, "url" | "title" | "publisher" | "domain">>;
  policy: ResearchCoveragePolicy;
  seed?: ResearchCoverageSeed;
  issuedQueries: PlannedResearchQuery[];
  qualityReplacementPhasesUsed: number;
  recordedCostUsd: number | null;
  estimatedGapFillCostUsd: number | null;
}): QualityReplacementDecision {
  if (!input.materialCoverageSufficient) {
    return { eligible: false, reason: "NO_QUALITY_REPLACEMENT_GAP", state: "QUALITY_REPLACEMENT_SUCCEEDED", queries: [] };
  }
  const needs = assessQualityReplacementNeeds({ evidence: input.evidence, sources: input.sources, seed: input.seed });
  if (needs.state === "QUALITY_REPLACEMENT_SUCCEEDED") {
    return { eligible: false, reason: "QUALITY_REPLACEMENT_SUCCEEDED", state: "QUALITY_REPLACEMENT_SUCCEEDED", queries: [] };
  }
  if (input.qualityReplacementPhasesUsed >= (input.policy.maxQualityReplacementPhases ?? 1)) {
    return { eligible: false, reason: "QUALITY_REPLACEMENT_LIMIT", state: "QUALITY_REPLACEMENT_EXHAUSTED", queries: [] };
  }
  if (
    input.recordedCostUsd != null &&
    (input.recordedCostUsd > input.policy.maxEstimatedCostUsd ||
      (input.estimatedGapFillCostUsd != null && input.recordedCostUsd + input.estimatedGapFillCostUsd > input.policy.maxEstimatedCostUsd))
  ) {
    return { eligible: false, reason: "QUALITY_REPLACEMENT_BUDGET_EXHAUSTED", state: "QUALITY_REPLACEMENT_EXHAUSTED", queries: [] };
  }
  const candidates = qualityReplacementQueries({
    seed: input.seed,
    dimensions: needs.dimensions,
    selectedCluster: needs.selectedCluster,
    missingCacStages: needs.missingCacStages,
  });
  const issued = input.issuedQueries.map((item) => item.query);
  const cap = Math.min(
    Math.max(1, input.policy.maxQualityReplacementQueries ?? 5),
    Math.max(1, input.policy.maxQualityReplacementQueryHardCap ?? 8),
  );
  const queries = selectBoundedQueries(
    candidates.filter((candidate) => !isRedundantQuery(candidate.query, issued)),
    issued,
    cap,
  );
  if (!queries.length) {
    return { eligible: false, reason: "LOW_QUALITY_REPLACEMENT_INFORMATION_VALUE", state: "QUALITY_REPLACEMENT_EXHAUSTED", queries: [] };
  }
  return { eligible: true, reason: "QUALITY_REPLACEMENT_REQUIRED", state: "QUALITY_REPLACEMENT_REQUIRED", queries };
}

export function beginQualityReplacementPhase(decision: QualityReplacementDecision): QualityReplacementState {
  return decision.eligible ? "QUALITY_REPLACEMENT_RUNNING" : decision.state;
}

export function lowMetricRemainsResearchable(input: {
  hasNumericEvidence: boolean;
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  coverage: string;
}): boolean {
  if (input.coverage.includes("SUFFICIENT") && input.confidence !== "LOW" && input.confidence !== "NONE") return false;
  return input.hasNumericEvidence && (input.confidence === "LOW" || input.confidence === "NONE" || input.coverage.includes("PARTIAL") || input.coverage.includes("INSUFFICIENT"));
}
