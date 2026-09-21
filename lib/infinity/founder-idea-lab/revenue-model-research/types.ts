import type { EconomicConfidenceLevel, EconomicRange } from "../comparable-economics/provenance";
import type { PricingCluster } from "./pricing-cluster";
import type { IndependenceState } from "./source-independence";

export const REVENUE_MODEL_COVERAGE_STATUSES = [
  "REVENUE_MODEL_SUFFICIENT",
  "REVENUE_MODEL_PARTIAL",
  "REVENUE_MODEL_INSUFFICIENT",
] as const;

export type RevenueModelCoverageStatus = (typeof REVENUE_MODEL_COVERAGE_STATUSES)[number];

export const REVENUE_MODEL_COVERAGE_DIMENSIONS = [
  "revenue_model_type",
  "pricing_structure",
  "monthly_subscription",
  "annual_subscription",
  "setup_onboarding_fee",
  "implementation_fee",
  "tiering_packaging",
  "per_seat",
  "per_user",
  "per_location",
  "usage_based",
  "service_retainer",
  "commission",
  "marketplace_take_rate",
  "lead_generation_fee",
  "advertising",
  "licensing",
  "premium_support",
  "add_ons",
  "upsells",
  "cross_sell",
  "contract_terms",
  "billing_cadence",
  "revenue_per_customer",
  "gross_margin_basis",
  "customer_acquisition_basis",
  "retention_basis",
] as const;

export type RevenueModelCoverageDimension = (typeof REVENUE_MODEL_COVERAGE_DIMENSIONS)[number];

export const REVENUE_MODEL_TYPES = [
  "SUBSCRIPTION_SAAS",
  "SUBSCRIPTION_PLUS_SETUP",
  "MANAGED_SERVICE_RETAINER",
  "HYBRID_SOFTWARE_SERVICE",
  "PER_SEAT",
  "PER_USER",
  "PER_LOCATION",
  "USAGE_BASED",
  "TRANSACTION_FEE",
  "COMMISSION",
  "MARKETPLACE_TAKE_RATE",
  "ADVERTISING",
  "LEAD_GENERATION",
  "LICENSING",
  "FREEMIUM_UPSELL",
  "ONE_TIME_IMPLEMENTATION",
  "PRODUCTIZED_SERVICE",
  "OTHER",
  "UNKNOWN",
] as const;

export type RevenueModelType = (typeof REVENUE_MODEL_TYPES)[number];

export const REVENUE_STREAM_CADENCES = ["MONTHLY", "ANNUAL", "ONE_TIME", "USAGE", "PER_TRANSACTION", "UNKNOWN"] as const;
export type RevenueStreamCadence = (typeof REVENUE_STREAM_CADENCES)[number];

export const REVENUE_RECURRENCE = ["RECURRING", "ONE_TIME", "MIXED", "UNKNOWN"] as const;
export type RevenueRecurrence = (typeof REVENUE_RECURRENCE)[number];

export const REVENUE_MODEL_PROVENANCE = [
  "OBSERVED",
  "VALIDATION_ESTIMATE",
  "COMPARABLE_MODELED",
  "CATEGORY_BENCHMARK",
  "SCENARIO_MODEL",
  "FOUNDER_HYPOTHESIS",
  "UNKNOWN",
] as const;

export type RevenueModelProvenance = (typeof REVENUE_MODEL_PROVENANCE)[number];

export const REVENUE_SOURCE_CLASSES = [
  "OFFICIAL_PRICING_PAGE",
  "OFFICIAL_PLAN_PAGE",
  "OFFICIAL_PRODUCT_PAGE",
  "OFFICIAL_TERMS",
  "PUBLIC_PROPOSAL",
  "PUBLIC_RATE_CARD",
  "PUBLIC_MARKETPLACE_LISTING",
  "CREDIBLE_REVIEW_COMPARISON",
  "CREDIBLE_CUSTOMER_REPORT",
  "CATEGORY_BENCHMARK",
  "UNKNOWN",
] as const;

export type RevenueSourceClass = (typeof REVENUE_SOURCE_CLASSES)[number];

export const REVENUE_QUALITY_STATES = [
  "HIGH_QUALITY_RECURRING",
  "MIXED_RECURRING_SERVICE",
  "TRANSACTIONAL",
  "LOW_VISIBILITY",
  "INSUFFICIENT_DATA",
] as const;

export type RevenueQualityState = (typeof REVENUE_QUALITY_STATES)[number];

export const REVENUE_ATTRACTIVENESS_STATES = [
  "PROMISING_REVENUE_MODEL",
  "MIXED_REVENUE_MODEL",
  "WEAK_REVENUE_MODEL",
  "INSUFFICIENT_REVENUE_EVIDENCE",
] as const;

export type RevenueAttractivenessState = (typeof REVENUE_ATTRACTIVENESS_STATES)[number];

export const EXTRACTED_MONEY_KINDS = [
  "MONTHLY_PRICE",
  "ANNUAL_PRICE",
  "SETUP_FEE",
  "PER_SEAT",
  "PER_USER",
  "PER_LOCATION",
  "COMMISSION",
  "USAGE_FEE",
  "GROSS_MARGIN",
  "CHURN",
  "RANGE",
  "QUALITATIVE_ONLY",
] as const;

export type ExtractedMoneyKind = (typeof EXTRACTED_MONEY_KINDS)[number];

export const PRICE_BOUND_KINDS = ["CLOSED", "OPEN_HIGH", "UPPER_BOUND", "LOWER_BOUND"] as const;
export type PriceBoundKind = (typeof PRICE_BOUND_KINDS)[number];

export type ExtractedMoneyObservation = {
  sourceText: string;
  kind: ExtractedMoneyKind;
  amount: number | null;
  amountLow: number | null;
  amountHigh: number | null;
  boundKind: PriceBoundKind;
  /** True for forms like $80+ — the known upper anchor is not a closed ceiling. */
  upperOpen: boolean;
  /** Known upper figure when the range is open-ended (e.g. 80 in $10–$80+). */
  upperAnchor: number | null;
  unit: "USD" | "PERCENT" | "UNKNOWN";
  cadence: RevenueStreamCadence;
  perSeat: boolean;
  perUser: boolean;
  perLocation: boolean;
  vagueLanguage: boolean;
  monthlyRecurringEquivalent: number | null;
  annualEquivalent: number | null;
  sourceRef: string | null;
  confidence: EconomicConfidenceLevel;
};

export type ArpuObservationContribution = {
  sourceText: string;
  role: string;
  cluster: "CORE_PLATFORM" | "MANAGED_SERVICE" | "ADD_ON_TOOLING";
  semanticCluster?: PricingCluster;
  weight: number;
  monthlyLow: number | null;
  monthlyHigh: number | null;
  boundKind: PriceBoundKind;
  upperOpen: boolean;
  contributesToCore: boolean;
};

export type ModeledArpu = {
  range: EconomicRange;
  core: EconomicRange;
  managedService: EconomicRange;
  addOn: EconomicRange;
  total: EconomicRange;
  selfServe: EconomicRange;
  managedVertical: EconomicRange;
  observations: ArpuObservationContribution[];
  aggregationMethod: string;
  confidence: EconomicConfidenceLevel;
  provenance: RevenueModelProvenance;
  ventureObserved: "UNKNOWN";
  falsePrecision: false;
  recommendedPricingCluster: PricingCluster | null;
  selectedPricingCluster: PricingCluster | null;
  clusterReason: string;
  clusterConfidence: EconomicConfidenceLevel;
  sampleCount: number;
  sourceQuality: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  independenceState: IndependenceState;
  qualityReplacementRequired: boolean;
};

export type RevenueStream = {
  id: string;
  name: string;
  type: RevenueModelType;
  description: string;
  recurringOrOneTime: RevenueRecurrence;
  priceRange: EconomicRange;
  unit: string;
  billingCadence: RevenueStreamCadence;
  targetCustomer: string | null;
  comparableSupport: string[];
  sourceRefs: string[];
  sourceClass: RevenueSourceClass;
  confidence: EconomicConfidenceLevel;
  provenance: RevenueModelProvenance;
};

export type PricingArchitectureTier = {
  id: "entry" | "base" | "premium";
  monthly: EconomicRange;
  annual: EconomicRange;
  setupFee: EconomicRange;
  includedScope: string[];
  upsells: string[];
  customerSegment: string | null;
  confidence: EconomicConfidenceLevel;
  sourceBasis: RevenueModelProvenance;
};

export type PricingArchitecture = {
  appropriate: boolean;
  entry: PricingArchitectureTier | null;
  base: PricingArchitectureTier | null;
  premium: PricingArchitectureTier | null;
  setup: EconomicRange;
  rationale: string;
};

export type RevenuePerCustomer = {
  monthlyRecurring: EconomicRange;
  annualRecurring: EconomicRange;
  firstYearRecurring: EconomicRange;
  firstYearSetup: EconomicRange;
  firstYearAddOn: EconomicRange;
  firstYearRevenue: EconomicRange;
  firstYearGrossProfit: EconomicRange;
  recurring: EconomicRange;
  oneTime: EconomicRange;
  upsell: EconomicRange;
  coreRecurringARPU: EconomicRange;
  managedServiceARPU: EconomicRange;
  addOnARPU: EconomicRange;
  totalModeledMonthlyRevenuePerCustomer: EconomicRange;
  provenance: RevenueModelProvenance;
  arpuModel: ModeledArpu;
};

export type RevenueMix = {
  percentRecurring: number | null;
  percentOneTime: number | null;
  percentService: number | null;
  percentAddOn: number | null;
  percentTransaction: number | null;
};

export type CustomerCountScenario = {
  customers: number;
  mrr: number | null;
  arr: number | null;
  setupRevenue: number | null;
  addOnRevenue: number | null;
  totalFirstYearRevenue: number | null;
  provenance: "SCENARIO_MODEL";
  notAForecast: true;
};

export type BandRevenueScenario = {
  id: "CONSERVATIVE" | "BASE" | "UPSIDE";
  customers: number;
  mrr: number | null;
  arr: number | null;
  setupRevenue: number | null;
  addOnRevenue: number | null;
  totalFirstYearRevenue: number | null;
  provenance: "SCENARIO_MODEL";
  notAForecast: true;
};

export type BreakEvenRevenue = {
  customers: number | null;
  mrr: number | null;
  arr: number | null;
  known: boolean;
};

export type ContractBillingModel = {
  monthly: boolean;
  annual: boolean;
  minimumTerm: string | null;
  contractLength: string | null;
  discount: string | null;
  trial: string | null;
  setupFee: boolean;
  cancellation: string | null;
  renewal: string | null;
  implementationPeriod: string | null;
};

export type RecommendedRevenueModel = {
  recommendedModel: RevenueModelType;
  streams: RevenueStream[];
  alternativeModels: RevenueModelType[];
  rationale: string;
  comparableSupport: string[];
  confidence: EconomicConfidenceLevel;
  keyAssumptions: string[];
  majorUnknowns: string[];
  fitFactors: Record<string, number>;
};

export type RevenueModelComparable = {
  name: string;
  targetCustomer: string | null;
  strategicComparable: boolean;
  economicComparable: boolean;
  revenueModelComparable: boolean;
  revenueModelRole: "YES" | "PARTIAL" | "NO";
  revenueModelConfidence: EconomicConfidenceLevel;
  economicConfidence: EconomicConfidenceLevel;
  numericPricingContribution: boolean;
  adjacent: boolean;
  revenueModelType: RevenueModelType;
  monthlyPrice: EconomicRange;
  annualPrice: EconomicRange;
  setupFee: EconomicRange;
  recurring: boolean | null;
  addOns: string[];
  contractModel: string | null;
  whyRelevant: string;
  sourceConfidence: EconomicConfidenceLevel;
  sourceClass: RevenueSourceClass;
  sourceRefs: string[];
  priceRole: string;
  founderComparableRole: string;
};

export const REVENUE_EVIDENCE_SUFFICIENCY = ["SUFFICIENT", "PARTIAL", "INSUFFICIENT"] as const;
export type RevenueEvidenceSufficiency = (typeof REVENUE_EVIDENCE_SUFFICIENCY)[number];

export type RevenueModelCoverage = {
  status: RevenueModelCoverageStatus;
  decisionCoverageIndependent: true;
  dimensions: Record<RevenueModelCoverageDimension, "covered" | "partial" | "unknown" | "not_applicable">;
  revenueStructureStatus: RevenueEvidenceSufficiency;
  pricingEvidenceStatus: RevenueEvidenceSufficiency;
  setupEvidenceStatus: RevenueEvidenceSufficiency;
  revenuePerCustomerStatus: RevenueEvidenceSufficiency;
  evidence: {
    businessModelStructure: RevenueEvidenceSufficiency;
    monthlyPricingEvidence: RevenueEvidenceSufficiency;
    setupPricingEvidence: RevenueEvidenceSufficiency;
    upsellPricingEvidence: RevenueEvidenceSufficiency;
    billingEvidence: RevenueEvidenceSufficiency;
    revenuePerCustomerEvidence: RevenueEvidenceSufficiency;
  };
  sufficientBasis: string;
  researchableGaps: string[];
  nextMoneyResearchTargets: string[];
  pricingQualityReason?: string;
  stopReason?: string | null;
};

export type DirectMoneyAnswer = {
  question: "How should this make money?";
  recommendedModel: RevenueModelType;
  coreRevenue: string;
  setupOnboarding: string;
  upsells: string;
  billingStructure: string;
  expectedRecurringMix: string;
  why: string;
  confidence: EconomicConfidenceLevel;
  remainingUnknowns: string[];
  pricingClues: string[];
  pricingEvidence: RevenueEvidenceSufficiency;
  structureEvidence: RevenueEvidenceSufficiency;
};

export type RevenueModelExplainability = {
  whatCurrentPlatformsDo: string;
  patternsFound: string[];
  whyRecommendedFollowsPatterns: string;
  whatVentureDoesDifferently: string;
  modeledAssumptions: string[];
  sourceBackedFacts: string[];
};

export type RevenueModelCostTelemetry = {
  queriesPlanned: number | null;
  queriesExecuted: number | null;
  providerCalls: number | null;
  estimatedCostUsd: number | null;
  costUnknown: true;
  stopReason: string | null;
};

export type RevenueModelResearch = {
  coverage: RevenueModelCoverage;
  recommended: RecommendedRevenueModel;
  streams: RevenueStream[];
  architecture: PricingArchitecture;
  revenuePerCustomer: RevenuePerCustomer;
  mix: RevenueMix;
  customerCountScenarios: CustomerCountScenario[];
  bandScenarios: BandRevenueScenario[];
  breakEven: BreakEvenRevenue;
  contract: ContractBillingModel;
  quality: { assessment: RevenueQualityState; reason: string };
  attractiveness: { assessment: RevenueAttractivenessState; reason: string };
  comparables: RevenueModelComparable[];
  upsells: string[];
  categoryBenchmarks: string[];
  pricingClusters?: {
    recommended: string;
    selected: string;
    reason: string;
    confidence: string;
    selfServe: EconomicRange;
    managedVertical: EconomicRange;
    core: EconomicRange;
  };
  directAnswer: DirectMoneyAnswer;
  explainability: RevenueModelExplainability;
  costTelemetry: RevenueModelCostTelemetry;
  buildImplication: {
    revenueModelResearchGrantsBuild: false;
    reason: string;
  };
};
