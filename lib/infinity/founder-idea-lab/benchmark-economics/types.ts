import type { AcquisitionChannel } from "../comparable-economics/types";
import type {
  EconomicConfidenceLevel,
  EconomicEvidenceClass,
  EconomicRange,
} from "../comparable-economics/provenance";
import type { EducatedEconomicsModel } from "../educated-estimates/types";

export const BENCHMARK_DIMENSIONS = [
  "customer_acquisition_cost",
  "cost_per_click",
  "cost_per_lead",
  "lead_to_customer_conversion",
  "trial_to_paid_conversion",
  "demo_to_close_conversion",
  "sales_close_rate",
  "sales_cycle_days",
  "sales_labor_cost",
  "commission_rate",
  "partner_fee",
  "affiliate_fee",
  "monthly_churn",
  "annual_churn",
  "retention_rate",
  "customer_lifetime",
  "gross_margin",
  "contribution_margin",
  "support_cost",
  "service_labor",
  "fulfillment_cost",
  "hosting_cost",
  "software_variable_cost",
  "payment_processing",
  "onboarding_cost",
  "implementation_cost",
  "ARPU",
  "ACV",
  "expansion_revenue",
  "net_revenue_retention",
  "visitor_to_lead_conversion",
] as const;

export type BenchmarkDimension = (typeof BENCHMARK_DIMENSIONS)[number];

export const BENCHMARK_COVERAGE_STATUSES = [
  "BENCHMARK_SUFFICIENT",
  "BENCHMARK_PARTIAL",
  "BENCHMARK_INSUFFICIENT",
] as const;
export type BenchmarkCoverageStatus = (typeof BENCHMARK_COVERAGE_STATUSES)[number];

export const BENCHMARK_RELEVANCE_LEVELS = ["HIGH_RELEVANCE", "MEDIUM_RELEVANCE", "LOW_RELEVANCE", "REJECTED"] as const;
export type BenchmarkRelevance = (typeof BENCHMARK_RELEVANCE_LEVELS)[number];

export const BENCHMARK_SOURCE_CLASSES = [
  "PUBLIC_COMPANY_REPORTING",
  "OFFICIAL_COMPANY_MATERIAL",
  "CREDIBLE_BENCHMARK_STUDY",
  "RECOGNIZED_RESEARCH_FIRM",
  "FINANCIAL_DISCLOSURE",
  "AGENCY_WITH_METHODOLOGY",
  "ACADEMIC_OR_INDUSTRY_RESEARCH",
  "ANONYMOUS_MARKETING_BLOG",
  "UNSOURCED_SEO_PAGE",
  "AI_GENERATED_LISTICLE",
  "UNKNOWN",
] as const;
export type BenchmarkSourceClass = (typeof BENCHMARK_SOURCE_CLASSES)[number];

export const BENCHMARK_STOP_REASONS = [
  "BENCHMARK_ECONOMICS_SUFFICIENT",
  "NO_RESEARCHABLE_BENCHMARK_GAP",
  "BENCHMARK_BUDGET_EXHAUSTED",
  "BENCHMARK_GAP_FILL_LIMIT",
  "LOW_BENCHMARK_INFORMATION_VALUE",
  "PROVIDER_FAILURE",
] as const;
export type BenchmarkStopReason = (typeof BENCHMARK_STOP_REASONS)[number];

export type ChurnKind =
  | "monthly_logo"
  | "annual_logo"
  | "monthly_revenue"
  | "annual_revenue"
  | "gross_retention"
  | "net_retention"
  | "customer_retention"
  | "unknown";

export type BenchmarkRelevanceFactors = {
  target_customer_match: boolean;
  business_model_match: boolean;
  revenue_model_match: boolean;
  acv_pricing_match: boolean;
  sales_motion_match: boolean;
  channel_match: boolean;
  service_intensity_match: boolean;
  geography_match: boolean;
  recency: boolean;
  source_quality: boolean;
};

export type ExtractedBenchmarkObservation = {
  observationId: string;
  dimension: BenchmarkDimension;
  claim: string;
  findingId: string;
  sourceUrl: string;
  sourceClass: BenchmarkSourceClass;
  companyName: string | null;
  categoryLabel: string | null;
  channel: AcquisitionChannel | null;
  range: EconomicRange;
  unit: "usd" | "percent" | "days" | "months" | "ratio";
  churnKind: ChurnKind | null;
  provenance: EconomicEvidenceClass;
  publishedAt: string | null;
  retrievedAt: string | null;
  grounded: boolean;
  canonicalStatKey: string;
  marginStage?: "OBSERVED_CURRENT_MARGIN" | "PROJECTED_MARGIN" | "CATEGORY_MARGIN" | "ADJACENT_MARGIN";
  marginRole?:
    | "DIRECT_COMPANY_MARGIN"
    | "CATEGORY_MARGIN"
    | "ADJACENT_MARGIN"
    | "PROJECTED_MARGIN"
    | "INFRASTRUCTURE_MARGIN"
    | "COMPONENT_COST"
    | "IRRELEVANT_MARGIN";
  usableForModel?: boolean;
  unusedWhy?: string | null;
};

export type QualifiedBenchmark = ExtractedBenchmarkObservation & {
  relevance: BenchmarkRelevance;
  relevanceScore: number;
  relevanceFactors: BenchmarkRelevanceFactors;
  whyRelevant: string;
  rejectedReason: string | null;
};

export type BenchmarkAggregation = {
  dimension: BenchmarkDimension;
  sampleCount: number;
  acceptedCount: number;
  rejectedCount: number;
  rawRange: EconomicRange;
  acceptedRange: EconomicRange;
  base: number | null;
  method: "median" | "weighted_median" | "single_observation" | "none";
  rejectedOutliers: QualifiedBenchmark[];
  conflict: boolean;
  conflictWhy: string | null;
  sourceCount: number;
  independentSourceCount: number;
  provenance: EconomicEvidenceClass;
  confidence: EconomicConfidenceLevel;
};

export type CacAdjustment = {
  name: string;
  factor: number;
  why: string;
};

export type ModeledMetric = {
  range: EconomicRange;
  base: number | null;
  confidence: EconomicConfidenceLevel;
  provenance: EconomicEvidenceClass;
  sourceRefs: string[];
  calculation: string;
  assumptions: string[];
  coverage: BenchmarkCoverageStatus;
};

export type BenchmarkEconomicsResearch = {
  observations: ExtractedBenchmarkObservation[];
  qualified: QualifiedBenchmark[];
  aggregations: Partial<Record<BenchmarkDimension, BenchmarkAggregation>>;
  coverage: {
    pricing: BenchmarkCoverageStatus;
    cac: BenchmarkCoverageStatus;
    retention: BenchmarkCoverageStatus;
    grossMargin: BenchmarkCoverageStatus;
    ltv: BenchmarkCoverageStatus;
    payback: BenchmarkCoverageStatus;
    conversion: BenchmarkCoverageStatus;
    salesCycle: BenchmarkCoverageStatus;
    overall: BenchmarkCoverageStatus;
  };
  modeled: {
    arpu: ModeledMetric;
    cac: ModeledMetric;
    ltv: ModeledMetric;
    ltvCac: ModeledMetric;
    grossMargin: ModeledMetric;
    contributionMargin: ModeledMetric;
    payback: ModeledMetric;
    lifetimeMonths: ModeledMetric;
  };
  ltvCacScenarios: { conservative: number | null; base: number | null; upside: number | null };
  paybackScenarios: { conservative: number | null; base: number | null; upside: number | null };
  attractiveness: "ATTRACTIVE" | "PROMISING_BUT_UNVALIDATED" | "MARGINAL" | "UNATTRACTIVE" | "INSUFFICIENT_DATA";
  attractivenessWhy: string;
  cacAdjustments: CacAdjustment[];
  componentCac: {
    used: boolean;
    channel: AcquisitionChannel | null;
    formula: string;
    range: EconomicRange;
  };
  sensitivity: Array<{ name: string; direction: "downside" | "upside"; why: string }>;
  validationTargets: string[];
  mainUncertainty: string;
  nextToProve: string;
  observed: {
    cac: "UNKNOWN";
    ltv: "UNKNOWN";
  };
  buildImplication: {
    companyComparableGrantsBuild: false;
    categoryBenchmarkGrantsBuild: false;
    adjacentBenchmarkGrantsBuild: false;
    comparableModeledGrantsBuild: false;
    scenarioModelGrantsBuild: false;
    reason: string;
  };
  sampleQuality: {
    sourcesFound: number;
    benchmarksExtracted: number;
    benchmarksAccepted: number;
    benchmarksRejected: number;
    independentSources: number;
    independenceState?: "KNOWN" | "PARTIALLY_KNOWN" | "INDEPENDENCE_UNKNOWN";
  };
  channelCac: {
    organic: number | null;
    paid: number | null;
    category: number | null;
    independentSourceCount: number;
    blendedFromSameSource: false;
    channelMismatch: boolean;
    channelMismatchReason: string | null;
  };
  unusedMarginEvidence?: Array<{ claim: string; values: string; why: string }>;
  educatedEstimates?: EducatedEconomicsModel;
  cacPresentation?: {
    displayRange: string;
    displayBase: string;
    displayConfidence: string;
    displayQualifier: string;
    organic: string | null;
    paid: string | null;
    category: string | null;
  };
  overallEconomicConfidence?: EconomicConfidenceLevel;
};
