import type { FounderEstimateStrength } from "@/lib/infinity/founder-idea-lab/educated-estimates/types";
import type {
  FounderBuildPlanPhase,
  FounderRequiredSystem,
  FounderVentureBuildPlan,
  ZeroToProductionStep,
} from "@/lib/infinity/founder-idea-lab/build-plan/types";
import type { FounderVentureCommandDeck } from "@/lib/infinity/founder-idea-lab/command-deck/types";
import type { MarketVsInfinityRow } from "@/lib/infinity/founder-idea-lab/venture-brief/types";
import { BUILD_PLAN_AUTHORITY } from "@/lib/infinity/founder-idea-lab/build-plan/types";

export const VENTURE_SOURCE_CONTEXTS = [
  "FOUNDER_IDEA",
  "AUTONOMOUS_DISCOVERY",
  "OPPORTUNITY_CANDIDATE",
  "VALIDATED_VENTURE",
  "PORTFOLIO_VENTURE",
  "LIVE_VENTURE",
] as const;
export type VentureSourceContextId = (typeof VENTURE_SOURCE_CONTEXTS)[number];

export const VENTURE_SOURCE_BADGES: Record<VentureSourceContextId, string> = {
  FOUNDER_IDEA: "Founder submitted",
  AUTONOMOUS_DISCOVERY: "Discovered by Infinity",
  OPPORTUNITY_CANDIDATE: "Opportunity candidate",
  VALIDATED_VENTURE: "Validated venture",
  PORTFOLIO_VENTURE: "Portfolio venture",
  LIVE_VENTURE: "Live venture",
};

export const ECONOMIC_DISPLAY_ORIGINS = ["OBSERVED", "VALIDATED", "MODELED", "MISSING"] as const;
export type EconomicDisplayOrigin = (typeof ECONOMIC_DISPLAY_ORIGINS)[number];

export const BUILD_PLAN_HEADINGS = [
  "How Infinity Could Build This",
  "How Infinity Is Building This",
  "How This Venture Is Operating",
] as const;
export type VentureBuildPlanHeading = (typeof BUILD_PLAN_HEADINGS)[number];

export const VENTURE_INTELLIGENCE_AUTHORITY = {
  ...BUILD_PLAN_AUTHORITY,
  canDecide: false,
  canExecute: false,
  canDelete: false,
} as const;

export type VentureCommandDeckView = FounderVentureCommandDeck;
export type VentureBuildPlanView = Omit<FounderVentureBuildPlan, "heading"> & {
  heading: VentureBuildPlanHeading;
};

export type ProvenanceRef = {
  field: string;
  sourceType: string;
  sourceId: string | null;
  note: string;
};

export type VentureIdentityView = {
  ventureId: string;
  name: string;
  concept: string;
  originEntityType: string;
  originEntityId: string | null;
};

export type VentureThesisView = {
  thesis: string;
  whyThisCouldBeABusiness: string;
  whyThisCouldWin: string;
};

export type VentureCustomerView = {
  targetCustomer: string;
};

export type VentureProblemView = {
  coreProblem: string;
  primaryPain: string;
};

export type VentureSolutionView = {
  solution: string;
  howInfinityWouldSolve: string;
};

export type VentureBusinessModelView = {
  summary: string;
};

export type VentureBusinessCaseView = {
  label:
    | "Looks promising"
    | "Worth validating"
    | "Needs more evidence"
    | "Economics are weak"
    | "Performing well"
    | "Underperforming expectations";
  reason: string;
};

export type VentureEconomicMetricView = {
  id: string;
  label: string;
  display: string;
  origin: EconomicDisplayOrigin;
  confidence: FounderEstimateStrength;
  actualDisplay: string;
  expectedDisplay: string;
  varianceDisplay: string | null;
  help?: string;
  provenance: ProvenanceRef;
};

export type VentureEconomicsView = {
  monthlyRevenuePerCustomer: VentureEconomicMetricView;
  contributionProfitPerCustomer: VentureEconomicMetricView;
  cac: VentureEconomicMetricView;
  lifetime: VentureEconomicMetricView;
  ltv: VentureEconomicMetricView;
  ltvCac: VentureEconomicMetricView;
  payback: VentureEconomicMetricView;
  firstYearRevenuePerCustomer: VentureEconomicMetricView;
  firstYearContribution: VentureEconomicMetricView;
  lifetimeContribution: VentureEconomicMetricView;
  conversion: VentureEconomicMetricView;
  retention: VentureEconomicMetricView;
  margin: VentureEconomicMetricView;
  economicConfidence: "Weak" | "Moderate" | "Strong";
  evidenceStrength: string;
  prefersActuals: true;
};

export type ExpectedVsActualRow = {
  metric: string;
  expected: string;
  actual: string;
  variance: string;
  status: "above_plan" | "below_plan" | "on_plan" | "insufficient_data";
};

export type VentureMarketAdvantageView = {
  primaryCustomerPain: string;
  biggestMarketWeakness: string;
  strongestDifferentiator: string;
  whatInfinityCouldDoBetter: string;
  whyThisCouldWin: string;
  marketEdge: MarketVsInfinityRow[];
};

export type VentureCustomerProblemView = {
  problems: string[];
  productAdvantages: string[];
  liveComplaints: string[];
};

export type VentureCapabilityCoverageView = {
  alreadyAvailable: string[];
  productSpecificWork: string[];
  infinityOsNote: string;
  coverageSummary: string;
  platformAvailable?: number;
  platformPartial?: number;
  platformMissing?: number;
  platformTotal?: number;
  ventureReadyCount?: number;
  evidenceBlockedCount?: number;
};

export type VentureCurrentPositionView = {
  step: ZeroToProductionStep;
  label: string;
  path: Array<{ id: ZeroToProductionStep; complete: boolean; current: boolean }>;
};

export type VentureNextMoveView = {
  recommendation: string;
  why: string;
  whatInfinityWouldTest: string;
  successLooksLike: string;
};

export type VentureRiskView = {
  biggest: string;
  economic: string;
  product: string;
  market: string;
  operational: string;
};

export type VentureEvidenceView = {
  summary: string[];
  missing: string[];
};

export type VentureSourceContextView = {
  id: VentureSourceContextId;
  badge: string;
  founderIdeaId: string | null;
  opportunityCandidateId: string | null;
  ventureAssemblyId: string | null;
};

export type VenturePerformanceSummaryView = {
  available: boolean;
  actualMetrics: string[];
  expectedVsActual: ExpectedVsActualRow[];
  whatIsActuallyHappening: string[];
  learning: string[];
};

export type VentureIntelligenceView = {
  identity: VentureIdentityView;
  thesis: VentureThesisView;
  customer: VentureCustomerView;
  problem: VentureProblemView;
  solution: VentureSolutionView;
  businessModel: VentureBusinessModelView;
  businessCase: VentureBusinessCaseView;
  economics: VentureEconomicsView;
  marketAdvantage: VentureMarketAdvantageView;
  customerProblems: VentureCustomerProblemView;
  productAdvantages: string[];
  systemRequirements: FounderRequiredSystem[];
  capabilityCoverage: VentureCapabilityCoverageView;
  buildPlan: VentureBuildPlanView;
  currentPosition: VentureCurrentPositionView;
  nextMove: VentureNextMoveView;
  risks: VentureRiskView;
  evidence: VentureEvidenceView;
  sourceContext: VentureSourceContextView;
  performance: VenturePerformanceSummaryView;
  commandDeck: VentureCommandDeckView;
  buildReadiness: string;
  buildReadinessReason: string;
  buildReadinessReasonLabel: string;
  grantsBuild: false;
  authority: typeof VENTURE_INTELLIGENCE_AUTHORITY;
  provenance: ProvenanceRef[];
};

export type CanonicalMonetizationPlanInput = {
  id?: string | null;
  estimatedPriceBase: number | null;
  estimatedRevenuePerCustomer: number | null;
  estimatedCAC: number | null;
  estimatedLTV: number | null;
  estimatedGrossMarginPercent: number | null;
  contributionMarginPerCustomer: number | null;
  ltvCacRatio: number | null;
  estimatedMonthsToBreakEven: number | null;
  customerType: string | null;
  valueProposition: string | null;
  offerDescription: string | null;
  pricingModel: string | null;
  modelName: string | null;
  planRole?: string | null;
  monetizationConfidence?: number | null;
  monetizationScore?: number | null;
  createdAt?: string | null;
  researchRunIds?: string[];
  risks: string[];
};

export type CanonicalCandidateInput = {
  id: string;
  title: string;
  summary: string;
  problem: string;
  targetCustomer: string;
  market: string;
  businessModelCandidates: string[];
  revenueMechanismCandidates: string[];
  demandEvidence: string[];
  marketEvidence: string[];
  monetizationEvidence: string[];
  distributionEvidence: string[];
  buildabilityEvidence: string[];
  competitionEvidence: string[];
  researchSources: string[];
  researchRunIds: string[];
  risks: string[];
  unknowns: string[];
};

export type CanonicalSelectionInput = {
  runId: string | null;
  decision: string | null;
  selectionScore: number | null;
  opportunityScore: number | null;
  rank: number | null;
  reason: string | null;
  risk: string | null;
  counterfactual: string | null;
  monetizationPlanId: string | null;
  monetizationRunId: string | null;
  createdAt: string | null;
};

export type CanonicalResearchRunInput = {
  id: string;
  objective: string | null;
  status: string | null;
  summary: string | null;
};

export type CanonicalAssemblyEconomicsInput = {
  pricingHypothesis: string | null;
  acquisitionChannels: string[];
  costAssumptions: string | null;
  majorRisks: string[];
  keyMetrics: string[];
};

export type CanonicalPerformanceMetric = {
  metric: string;
  value: number;
  unit: string | null;
  sampleSize: number | null;
};

export type CanonicalPerformanceAssessment = {
  metric: string;
  expectedValue: number | null;
  actualValue: number | null;
  variance: number | null;
  variancePercent: number | null;
  status: ExpectedVsActualRow["status"];
  expectationSource: string;
  actualSource: string;
};

export type CanonicalPerformanceInput = {
  aggregates: CanonicalPerformanceMetric[];
  assessments: CanonicalPerformanceAssessment[];
  diagnoses: string[];
  hypotheses: string[];
  experiments: string[];
  learningDecisions: string[];
  optimizationOpportunities: string[];
};

export type CanonicalVentureAdapterInput = {
  ventureId: string;
  organizationId: string;
  name: string;
  origin: string | null;
  assemblyStatus: string;
  readinessStatus: string | null;
  launchStage: string | null;
  opportunityId: string | null;
  opportunityCandidateId?: string | null;
  buildId: string | null;
  productionArtifactId: string | null;
  identityPackage: Record<string, unknown>;
  businessModelPackage: Record<string, unknown>;
  monetizationPackage: Record<string, unknown>;
  candidate: CanonicalCandidateInput | null;
  monetizationPlan: CanonicalMonetizationPlanInput | null;
  selection?: CanonicalSelectionInput | null;
  researchRuns?: CanonicalResearchRunInput[];
  assemblyEconomics?: CanonicalAssemblyEconomicsInput | null;
  performance: CanonicalPerformanceInput;
  departmentStates: Array<{ id: string; state: string }>;
};

export const VENTURE_INTELLIGENCE_SECTION_IDS = [
  "venture-command-deck",
  "infinity-take",
  "why-this-could-win",
  "customer-problems-product-advantage",
  "what-we-should-build-better",
  "how-infinity-could-build-this",
  "market-vs-infinity",
  "venture-performance-actuals",
  "venture-learning-loop",
  "venture-risks",
  "venture-evidence",
  "venture-systems",
  "venture-next-move",
] as const;

export const VENTURE_INTELLIGENCE_MONEY_SECTION_IDS = [
  "money-customer-economics",
  "money-actual",
  "money-expected-vs-actual",
  "money-estimated",
] as const;
