import type { EvidenceDimension } from "../evidence-coverage";
import type {
  EconomicAssumption,
  EconomicConfidenceLevel,
  EconomicEvidenceClass,
  EconomicRange,
} from "./provenance";

export const COMPARABLE_SIMILARITY_FACTORS = [
  "same_target_customer",
  "similar_delivery_model",
  "similar_recurring_revenue_model",
  "similar_customer_value_proposition",
  "similar_acquisition_model",
  "similar_pricing_structure",
  "similar_service_intensity",
] as const;

export type ComparableSimilarityFactor = (typeof COMPARABLE_SIMILARITY_FACTORS)[number];

export type ComparableConfidenceBand = "HIGH" | "MEDIUM" | "WEAK_EXCLUDED";

export type ComparableBusiness = {
  id: string;
  name: string;
  category: string;
  whyComparable: string;
  similarity: Partial<Record<ComparableSimilarityFactor, boolean>>;
  similarityScore: number;
  confidenceBand: ComparableConfidenceBand;
  sourceRefs: string[];
  pricingEvidence: string[];
  businessModelEvidence: string[];
  customerEvidence: string[];
  distributionEvidence: string[];
  economicBenchmarkEvidence: string[];
  confidence: EconomicConfidenceLevel;
};

export type NormalizedPrice = {
  original: string;
  monthlyRecurringEquivalent: number | null;
  setupFee: number | null;
  annualEquivalent: number | null;
  minimumCommitment: string | null;
  variableCharges: string | null;
  includedServices: string[];
  premiumFeatures: string[];
  sourceRef: string | null;
};

export type PricingScenario = {
  id: "CONSERVATIVE" | "BASE" | "PREMIUM";
  setup: EconomicRange;
  monthly: EconomicRange;
  rationale: string;
};

export const ACQUISITION_CHANNELS = [
  "paid_search",
  "seo",
  "content",
  "outbound",
  "inside_sales",
  "reseller",
  "partnership",
  "agency_channel",
  "affiliate",
  "marketplace",
  "local_sales",
  "social",
  "referral",
] as const;

export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export type ChannelCacComponent = {
  channel: AcquisitionChannel;
  name: string;
  range: EconomicRange;
  provenance: EconomicEvidenceClass;
  sourceRefs: string[];
  formulaRole: string;
};

export type UnitEconomicsScenario = {
  id: "CONSERVATIVE" | "BASE" | "UPSIDE";
  pricingMonthly: number | null;
  setup: number | null;
  arpu: number | null;
  cac: number | null;
  ltv: number | null;
  grossMarginPercent: number | null;
  monthlyChurn: number | null;
  lifetimeMonths: number | null;
  ltvCac: number | null;
  paybackMonths: number | null;
  breakEvenCustomers: number | null;
  provenance: EconomicEvidenceClass;
};

export const ECONOMIC_HEALTH_STATES = [
  "ATTRACTIVE",
  "PROMISING_BUT_UNVALIDATED",
  "MARGINAL",
  "UNATTRACTIVE",
  "INSUFFICIENT_DATA",
] as const;

export type EconomicHealthState = (typeof ECONOMIC_HEALTH_STATES)[number];

export type SensitivityDriver = {
  name: string;
  direction: "downside" | "upside";
  why: string;
};

export type ComparableEconomicsModel = {
  comparables: ComparableBusiness[];
  excludedComparables: ComparableBusiness[];
  pricing: {
    observations: NormalizedPrice[];
    scenarios: PricingScenario[];
    recommendation: PricingScenario | null;
    rationale: string;
    provenance: EconomicEvidenceClass;
    confidence: EconomicConfidenceLevel;
  };
  cac: {
    channels: AcquisitionChannel[];
    components: ChannelCacComponent[];
    range: EconomicRange;
    formula: string;
    provenance: EconomicEvidenceClass;
    confidence: EconomicConfidenceLevel;
  };
  ltv: {
    monthlyRevenue: EconomicRange;
    grossMarginPercent: EconomicRange;
    monthlyChurn: EconomicRange;
    lifetimeMonths: EconomicRange;
    range: EconomicRange;
    formula: string;
    provenance: EconomicEvidenceClass;
    confidence: EconomicConfidenceLevel;
  };
  outputs: {
    arpu: EconomicRange;
    cac: EconomicRange;
    ltv: EconomicRange;
    ltvCac: EconomicRange;
    paybackMonths: EconomicRange;
    grossMarginPercent: EconomicRange;
    breakEvenCustomers: EconomicRange;
  };
  scenarios: UnitEconomicsScenario[];
  health: EconomicHealthState;
  healthWhy: string;
  sensitivity: SensitivityDriver[];
  assumptions: EconomicAssumption[];
  buildImplication: {
    modeledSatisfiesBuild: false;
    observedSatisfiesBuild: boolean;
    reason: string;
  };
  dimensionCoverage: Partial<Record<EvidenceDimension, number>>;
};
