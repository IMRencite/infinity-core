import type { EconomicConfidenceLevel, EconomicRange } from "../comparable-economics/provenance";

export const ESTIMATE_CLASSES = [
  "OBSERVED",
  "DIRECT_COMPARABLE",
  "CATEGORY_BENCHMARK",
  "ADJACENT_BENCHMARK",
  "COMPONENT_MODEL",
  "SCENARIO_MODEL",
  "FOUNDER_HYPOTHESIS",
  "UNKNOWN",
] as const;

export type EstimateClass = (typeof ESTIMATE_CLASSES)[number];

export const ESTIMATE_INPUT_LABELS = [
  "BENCHMARK",
  "CATEGORY_BENCHMARK",
  "ADJACENT_BENCHMARK",
  "MODELED_ASSUMPTION",
  "SCENARIO_ASSUMPTION",
  "FOUNDER_HYPOTHESIS",
] as const;
export type EstimateInputLabel = (typeof ESTIMATE_INPUT_LABELS)[number];

export const FOUNDER_ESTIMATE_STRENGTHS = ["Strong", "Moderate", "Weak", "Insufficient"] as const;
export type FounderEstimateStrength = (typeof FOUNDER_ESTIMATE_STRENGTHS)[number];

export type EstimateAssumption = {
  name: string;
  value: string;
  label: EstimateInputLabel;
  why: string;
};

export type EducatedMetricEstimate = {
  actual: "UNKNOWN";
  actualDisplay: string;
  bestEstimate: EconomicRange;
  displayRange: string;
  displayBase: string;
  confidence: EconomicConfidenceLevel;
  strength: FounderEstimateStrength;
  provenance: EstimateClass;
  formula: string;
  assumptions: EstimateAssumption[];
  basis: string;
  whatIsIt: string;
  whatInfinityEstimates: string;
  why: string;
  whatToTestNext: string;
  nextValidation: string;
  modeledNotObserved: true;
  grantsBuild: false;
};

export type CacEstimatePaths = {
  directBenchmark: EducatedMetricEstimate | null;
  componentModel: EducatedMetricEstimate | null;
  scenarioModel: EducatedMetricEstimate | null;
  selected: EducatedMetricEstimate | null;
};

export type MarginEstimatePaths = {
  directBenchmark: EducatedMetricEstimate | null;
  componentModel: EducatedMetricEstimate | null;
  scenarioModel: EducatedMetricEstimate | null;
  selected: EducatedMetricEstimate | null;
  unknownCostsTreatedAsZero: false;
  costAssumptions: EstimateAssumption[];
};

export type EstimateAvailability = "AVAILABLE" | "SCENARIO_AVAILABLE" | "INSUFFICIENT";

export type RevenueAttachScenario = {
  id: "CORE_ONLY" | "CORE_PLUS_ADDON" | "CORE_PLUS_MANAGED" | "FULL_SERVICE";
  label: string;
  monthly: string;
  firstYear: string;
  assumption: string;
  available: EstimateAvailability;
};

export type EducatedEconomicsModel = {
  coreMonthly: EducatedMetricEstimate | null;
  managedMonthly: EducatedMetricEstimate | null;
  addOnMonthly: EducatedMetricEstimate | null;
  totalMonthly: EducatedMetricEstimate | null;
  setup: EducatedMetricEstimate | null;
  cac: CacEstimatePaths;
  retention: EducatedMetricEstimate | null;
  margin: MarginEstimatePaths;
  ltv: EducatedMetricEstimate | null;
  ltvCac: {
    conservative: number | null;
    base: number | null;
    upside: number | null;
    confidence: EconomicConfidenceLevel;
    strength: FounderEstimateStrength;
    provenance: EstimateClass;
    modeledNotObserved: true;
    grantsBuild: false;
    formula: string;
    why: string;
    whatToTestNext: string;
  } | null;
  payback: {
    conservative: number | null;
    base: number | null;
    upside: number | null;
    confidence: EconomicConfidenceLevel;
    strength: FounderEstimateStrength;
    provenance: EstimateClass;
    modeledNotObserved: true;
    grantsBuild: false;
    usesContributionMargin: true;
    formula: string;
    why: string;
    whatToTestNext: string;
  } | null;
  firstYearCustomerValue: EducatedMetricEstimate | null;
  revenueScenarios: RevenueAttachScenario[];
  inputSources: {
    coreArpu: string;
    managedArpu: string;
    addOnArpu: string;
    setup: string;
    cac: string;
    lifetime: string;
    margin: string;
    variableCosts: string;
    founderAssumptions: string;
  };
  availability: {
    corePrice: EstimateAvailability;
    setup: EstimateAvailability;
    cac: EstimateAvailability;
    lifetime: EstimateAvailability;
    margin: EstimateAvailability;
    ltv: EstimateAvailability;
    ltvCac: EstimateAvailability;
    payback: EstimateAvailability;
    firstYear: EstimateAvailability;
  };
  observedUntouched: {
    cac: "UNKNOWN";
    ltv: "UNKNOWN";
    margin: "UNKNOWN";
    conversion: "UNKNOWN";
    retention: "UNKNOWN";
  };
  grantsBuild: false;
};

export type FounderEstimateHeroMetric = {
  id: string;
  label: string;
  primary: string;
  range: string;
  confidence: FounderEstimateStrength;
  kind: "estimated" | "actual";
  help: string;
  why: string;
  secondary?: boolean;
};

export type FounderEconomicEstimateRow = {
  metric: string;
  actual: string;
  bestEstimate: string;
  range: string;
  base: string;
  confidence: FounderEstimateStrength;
  provenance: string;
  formula: string;
  assumptions: string[];
  basis: string;
  nextValidation: string;
  whatIsIt: string;
  why: string;
  whatToTestNext: string;
};

export type FounderEconomicEstimateView = {
  heading: "Infinity's Best Estimate";
  conclusion: string;
  note: string;
  hero: FounderEstimateHeroMetric[];
  secondary: FounderEstimateHeroMetric[];
  rows: FounderEconomicEstimateRow[];
  revenueScenarios: RevenueAttachScenario[];
  cacPaths: { direct: string; component: string; scenario: string };
  marginPaths: { direct: string; component: string; scenario: string };
  marginAssumptions: string[];
  ltvCac: { conservative: string; base: string; upside: string; note: string };
  payback: { conservative: string; base: string; upside: string; note: string };
  firstYear: { coreOnly: string; corePlusAddOn: string; corePlusManaged: string; fullService: string };
  inputSources: EducatedEconomicsModel["inputSources"];
  availability: EducatedEconomicsModel["availability"];
  methodology: string[];
  grantsBuild: false;
};
