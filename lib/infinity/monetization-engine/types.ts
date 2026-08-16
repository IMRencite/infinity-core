import type {
  EconomicViabilityState,
  MonetizationArchetypeType,
  MonetizationRunStatus,
  PlanRole,
  RevenueStreamRole,
  ScenarioMilestone,
  ScenarioType,
  ValidationExperimentType,
} from "./constants";

export type MonetizationEvidenceItem = {
  evidenceType: string;
  title: string;
  claim: string;
  summary: string;
  sourceUrls: string[];
  grounded: boolean;
  limitations: string[];
};

export type RevenueStreamDraft = {
  streamRole: RevenueStreamRole;
  streamName: string;
  modelType: MonetizationArchetypeType;
  description: string;
  payer: string;
  pricingModel: string;
  estimatedPriceBase: number | null;
  billingFrequency: string;
  estimatedShareOfRevenuePercent: number | null;
  estimatedCustomersYear1: number | null;
};

export type MonetizationPlanDraft = {
  planRole: PlanRole;
  modelType: MonetizationArchetypeType;
  modelName: string;
  customerType: string;
  customerDescription: string;
  payer: string;
  beneficiary: string;
  valueProposition: string;
  purchaseTrigger: string;
  offerDescription: string;
  pricingModel: string;
  estimatedPriceLow: number | null;
  estimatedPriceBase: number | null;
  estimatedPriceHigh: number | null;
  billingFrequency: string;
  estimatedCustomersYear1: number | null;
  estimatedRevenuePerCustomer: number | null;
  estimatedVariableCosts: number | null;
  estimatedFixedCosts: number | null;
  estimatedCAC: number | null;
  estimatedLTV: number | null;
  estimatedMonthsToFirstRevenue: number | null;
  estimatedMonthsToBreakEven: number | null;
  estimatedCapitalRequired: number | null;
  automationPotential: number;
  scalabilityScore: number;
  marginScore: number;
  speedToRevenueScore: number;
  customerAcquisitionDifficulty: number;
  technicalComplexity: number;
  operationalComplexity: number;
  regulatoryRisk: number;
  platformDependencyRisk: number;
  monetizationConfidence: number;
  keyAssumptions: string[];
  risks: string[];
  evidence: MonetizationEvidenceItem[];
  sourceUrls: string[];
  revenueStreams: RevenueStreamDraft[];
  scoringAssessment: MonetizationScoringAssessmentInput;
};

export type MonetizationScoringAssessmentInput = {
  revenuePotential: number;
  marginPotential: number;
  speedToRevenue: number;
  recurringRevenuePotential: number;
  automationPotential: number;
  scalability: number;
  customerAcquisitionFeasibility: number;
  capitalEfficiency: number;
  competition: number;
  platformDependency: number;
  operationalComplexity: number;
  technicalComplexity: number;
  evidenceConfidence: number;
};

export type NormalizedMonetizationScores = {
  scoringVersion: string;
  revenuePotentialScore: number;
  marginPotentialScore: number;
  speedToRevenueScore: number;
  recurringRevenuePotentialScore: number;
  automationPotentialScore: number;
  scalabilityScore: number;
  customerAcquisitionFeasibilityScore: number;
  capitalEfficiencyScore: number;
  competitionScore: number;
  platformDependencyScore: number;
  operationalComplexityScore: number;
  technicalComplexityScore: number;
  evidenceConfidenceScore: number;
  monetizationScore: number;
  weightedBreakdown: Record<string, number>;
  scoringInputs: MonetizationScoringAssessmentInput;
};

export type DerivedUnitEconomics = {
  estimatedGrossRevenueYear1: number;
  estimatedGrossMarginPercent: number;
  estimatedGrossProfitYear1: number;
  contributionMarginPerCustomer: number;
  breakEvenCustomers: number | null;
  ltvCacRatio: number | null;
  estimatedLTV: number;
};

export type RevenueScenarioPoint = {
  scenarioType: ScenarioType;
  milestoneMonth: ScenarioMilestone;
  estimatedCustomers: number;
  estimatedRevenue: number;
  estimatedCost: number;
  estimatedGrossProfit: number;
  assumptions: string[];
};

export type ValidationExperimentDraft = {
  experimentType: ValidationExperimentType;
  title: string;
  description: string;
  estimatedCostUsd: number | null;
  priority: number;
};

export type BusinessModelRecommendation = {
  recommendedPrimaryModel: string;
  recommendedSecondaryModels: string[];
  recommendedPricingStrategy: string;
  recommendedCustomer: string;
  recommendedAcquisitionStrategy: string;
  expectedRevenueMechanism: string;
  expectedTimeToRevenue: string;
  estimatedStartupCapital: number | null;
  keyEconomicAssumptions: string[];
  largestEconomicRisks: string[];
  validationExperiments: ValidationExperimentDraft[];
  confidence: number;
};

export type EconomicViabilityResult = {
  state: EconomicViabilityState;
  combinedDecisionScore: number;
  opportunityScore: number;
  monetizationScore: number;
  rationale: string;
};

export type LoadedOpportunityCandidate = {
  id: string;
  organizationId: string;
  discoveryRunId: string;
  title: string;
  summary: string;
  problem: string | null;
  targetCustomer: string | null;
  market: string | null;
  businessModelCandidates: string[];
  revenueMechanismCandidates: string[];
  monetizationEvidence: unknown[];
  demandEvidence: unknown[];
  competitionEvidence: unknown[];
  distributionEvidence: unknown[];
  buildabilityEvidence: unknown[];
  marketEvidence: unknown[];
  risks: unknown[];
  unknowns: unknown[];
  researchSources: unknown[];
  researchRunIds: string[];
  opportunityScore: number | null;
};

export type MonetizationPlan = MonetizationPlanDraft & {
  id: string;
  organizationId: string;
  monetizationRunId: string;
  opportunityCandidateId: string;
  discoveryRunId: string | null;
  researchRunIds: string[];
  economicsDerived: DerivedUnitEconomics;
  monetizationScore: number;
  scores: NormalizedMonetizationScores;
  scenarios: RevenueScenarioPoint[];
};

export type MonetizationCandidateAnalysis = {
  id: string;
  opportunityCandidateId: string;
  candidateTitle: string;
  opportunityScore: number;
  monetizationScore: number;
  combinedDecisionScore: number;
  economicViability: EconomicViabilityState;
  primaryPlanId: string | null;
  recommendation: BusinessModelRecommendation;
  researchRunIds: string[];
  plans: MonetizationPlan[];
};

export type MonetizationCostSummary = {
  researchCallCount: number;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  groundingUsage: { searchQueryCount: number; groundingChunkCount: number };
  estimatedCostUsd: number | null;
  costUncertainty: string | null;
};

export type MonetizationEngineReport = {
  engineVersion: string;
  scoringVersion: string;
  candidatesAnalyzed: number;
  plansGenerated: number;
  revenueStreamsGenerated: number;
  researchRunIds: string[];
  analyses: Array<{
    candidateId: string;
    candidateTitle: string;
    economicViability: EconomicViabilityState;
    monetizationScore: number;
    combinedDecisionScore: number;
    primaryModel: string;
    planCount: number;
    revenueStreamCount: number;
    validationExperimentCount: number;
  }>;
  costSummary: MonetizationCostSummary;
  completedAt: string;
};

export type RunMonetizationEngineInput = {
  organizationId: string;
  idempotencyKey: string;
  opportunityCandidateIds?: string[];
  maxCandidates?: number;
  maxResearchCalls?: number;
  runPurpose?: string;
};

export type RunMonetizationEngineSuccess = {
  ok: true;
  monetizationRunId: string;
  report: MonetizationEngineReport;
  analyses: MonetizationCandidateAnalysis[];
};

export type RunMonetizationEngineFailure = {
  ok: false;
  monetizationRunId: string;
  status: MonetizationRunStatus;
  failureClassification: string;
  message: string;
};

export type RunMonetizationEngineOutput =
  | RunMonetizationEngineSuccess
  | RunMonetizationEngineFailure;

export type ProviderMonetizationExtractionOutput = {
  schemaVersion: string;
  opportunityCandidateId: string;
  limitations: string[];
  plans: Array<
    Omit<MonetizationPlanDraft, "scoringAssessment"> & {
      scoringAssessment: MonetizationScoringAssessmentInput;
    }
  >;
  recommendation: Omit<BusinessModelRecommendation, "validationExperiments">;
  validationExperiments: ValidationExperimentDraft[];
};
