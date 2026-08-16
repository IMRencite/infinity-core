import type {
  AssumptionType,
  RecommendedProductType,
  SelectionDecision,
  VentureSelectionRunStatus,
} from "./constants";

export type AssumptionRecord = {
  assumption: string;
  category: string;
  assumptionType: AssumptionType;
  value: string | null;
  confidence: number;
  evidence: string[];
  sourceUrls: string[];
  impactIfWrong: string;
  validationMethod: string | null;
  validationCostEstimate: number | null;
  validationTimeEstimate: number | null;
  impactScore: number;
  uncertaintyScore: number;
  fatalRiskContribution: number;
};

export type ValidationExperimentPriority = {
  experimentType: string;
  title: string;
  description: string;
  priorityRank: number;
  priorityScore: number;
  informationGainScore: number;
  assumptionImpactScore: number;
  uncertaintyScore: number;
  estimatedCostUsd: number | null;
  estimatedTimeDays: number | null;
  monetizationExperimentId?: string | null;
};

export type BuildabilityAssessment = {
  buildabilityScore: number;
  automationScore: number;
  operationalAutonomyScore: number;
  externalDependencyScore: number;
  canBuildSoftware: boolean;
  canAutomateAcquisition: boolean;
  canAutomateFulfillment: boolean;
  canAutomateSupport: boolean;
  requiresPhysicalInventory: boolean;
  requiresSpecializedEmployees: boolean;
  requiresLicensing: boolean;
  requiresLargeUpfrontCapital: boolean;
  dependsOnManualSales: boolean;
  dependsOnInaccessibleSystems: boolean;
  canDeliverDigitally: boolean;
  assessmentNotes: string[];
  assessmentInputs: Record<string, number>;
};

export type SpeedToValueMetrics = {
  estimatedBuildTimeDays: number;
  estimatedValidationTimeDays: number;
  estimatedLaunchTimeDays: number;
  estimatedTimeToFirstVisitorDays: number;
  estimatedTimeToFirstLeadDays: number;
  estimatedTimeToFirstTransactionDays: number;
  estimatedTimeToFirstRevenueDays: number;
  estimatedTimeToBreakEvenDays: number;
  speedToValueScore: number;
};

export type ExpectedValueInputs = {
  probabilityOfSuccess: number;
  estimatedCustomersYear1: number;
  estimatedRevenuePerCustomer: number;
  estimatedGrossMarginPercent: number;
  estimatedFixedCosts: number;
  estimatedVariableCosts: number;
  startupCapital: number;
};

export type ExpectedValueDerived = {
  probabilityAdjustedRevenue: number;
  probabilityAdjustedGrossProfit: number;
  expected12MonthProfit: number;
  expectedRoi: number;
  capitalEfficiency: number;
  expectedValuePerDollarDeployed: number;
};

export type ValidationDimensionScores = Record<string, number>;

export type AdversarialFinding = {
  question: string;
  finding: string;
  severity: number;
  category: string;
};

export type AdversarialReviewResult = {
  provider: string;
  model: string | null;
  summary: string;
  findings: AdversarialFinding[];
  riskInputs: Record<string, number>;
  confidence: number;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  estimatedCostUsd: number | null;
};

export type SelectionExplanation = {
  whyThisOpportunity: string;
  whyNow: string;
  whyInfinityCanBuildIt: string;
  whyCustomersWillPay: string;
  whyThisModel: string;
  whyItRanksAboveAlternatives: string;
  largestRisks: string[];
  fatalAssumptions: string[];
  validationNeeded: string[];
  expectedEconomics: Record<string, number | string | null>;
  resourceRequirements: Record<string, number | string | null>;
  confidence: number;
};

export type VentureSelectionHandoff = {
  businessConcept: string;
  targetCustomer: string;
  problem: string;
  solution: string;
  primaryMonetizationModel: string;
  secondaryRevenueStreams: string[];
  pricingStrategy: string;
  distributionStrategy: string;
  recommendedProductType: RecommendedProductType;
  requiredCapabilities: string[];
  mvpRequirements: string[];
  futureFeatures: string[];
  economicTargets: Record<string, number | null>;
  budgetEnvelope: Record<string, number | null>;
  riskConstraints: Record<string, unknown>;
  validationState: string;
  sourceEvidenceRefs: string[];
};

export type LoadedMonetizationPlan = {
  id: string;
  modelType: string;
  modelName: string;
  monetizationScore: number | null;
  estimatedCapitalRequired: number | null;
  estimatedPriceBase: number | null;
  estimatedCustomersYear1: number | null;
  estimatedMonthsToFirstRevenue: number | null;
  estimatedGrossRevenueYear1: number | null;
  estimatedGrossMarginPercent: number | null;
  estimatedFixedCosts: number | null;
  estimatedVariableCosts: number | null;
  estimatedCAC: number | null;
  estimatedLTV: number | null;
  ltvCacRatio: number | null;
  automationPotential: number | null;
  technicalComplexity: number | null;
  operationalComplexity: number | null;
  regulatoryRisk: number | null;
  platformDependencyRisk: number | null;
  customerAcquisitionDifficulty: number | null;
  keyAssumptions: string[];
  risks: string[];
  sourceUrls: string[];
  revenueStreams: Array<{ streamName: string; modelType: string; streamRole: string }>;
};

export type LoadedMonetizationBundle = {
  monetizationRunId: string;
  analysisId: string;
  primaryPlanId: string | null;
  monetizationScore: number;
  combinedDecisionScore: number;
  economicViability: string;
  recommendation: {
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
    confidence: number;
  };
  primaryPlan: LoadedMonetizationPlan | null;
  allPlans: LoadedMonetizationPlan[];
  validationExperiments: Array<{
    id: string;
    experimentType: string;
    title: string;
    description: string | null;
    estimatedCostUsd: number | null;
    priority: number;
  }>;
};

export type LoadedCandidateBundle = {
  candidateId: string;
  discoveryRunId: string;
  title: string;
  summary: string;
  problem: string | null;
  targetCustomer: string | null;
  market: string | null;
  businessModelCandidates: string[];
  revenueMechanismCandidates: string[];
  opportunityScore: number | null;
  demandEvidence: unknown[];
  monetizationEvidence: unknown[];
  competitionEvidence: unknown[];
  distributionEvidence: unknown[];
  buildabilityEvidence: unknown[];
  risks: unknown[];
  researchSources: unknown[];
  researchRunIds: string[];
  monetization: LoadedMonetizationBundle | null;
};

export type CandidateEvaluationDraft = {
  candidate: LoadedCandidateBundle;
  assumptions: AssumptionRecord[];
  fatalAssumptionRiskScore: number;
  assumptionUncertaintyScore: number;
  blockingAssumptions: string[];
  validationScore: number;
  validationDimensions: ValidationDimensionScores;
  buildability: BuildabilityAssessment;
  speedToValue: SpeedToValueMetrics;
  expectedValueInputs: ExpectedValueInputs;
  expectedValueDerived: ExpectedValueDerived;
  capitalEfficiencyMetrics: Record<string, number>;
  selectionScoreInputs: Record<string, number>;
  selectionScore: number;
  portfolioAdjustedScore: number;
  dependencyTags: string[];
  correlationPenalties: Array<{ tag: string; penalty: number; reason: string }>;
  experimentPriorities: ValidationExperimentPriority[];
  adversarialReview: AdversarialReviewResult | null;
  decision: SelectionDecision;
  recommendedNextAction: string;
  queueReason: string;
  explanation: SelectionExplanation;
  handoff: VentureSelectionHandoff | null;
  confidence: number;
};

export type ResourceAllocationSnapshot = {
  constraints: {
    availableVentureCapital: number;
    monthlyOperatingBudget: number;
    aiApiBudget: number;
    buildCapacity: number;
    maxSimultaneousBuilds: number;
    maxSimultaneousValidations: number;
    riskTolerance: number;
  };
  allocations: Array<{
    candidateId: string;
    decision: SelectionDecision;
    allocatedCapital: number;
    allocatedValidationSlots: number;
    reason: string;
  }>;
  unallocatedCandidates: string[];
  summary: Record<string, number | string>;
};

export type VentureSelectionReport = {
  engineVersion: string;
  scoringVersion: string;
  candidatesEvaluated: number;
  buildCount: number;
  validateCount: number;
  holdCount: number;
  rejectCount: number;
  handoffsCreated: number;
  queue: Array<{
    rank: number;
    candidateId: string;
    candidateTitle: string;
    decision: SelectionDecision;
    selectionScore: number;
    portfolioAdjustedScore: number;
    opportunityScore: number;
    monetizationScore: number;
    validationScore: number;
    buildabilityScore: number;
  }>;
  reasoningRunIds: string[];
  costSummary: {
    adversarialReviewCount: number;
    tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
    estimatedCostUsd: number | null;
  };
  completedAt: string;
};

export type RunVentureSelectionInput = {
  organizationId: string;
  idempotencyKey: string;
  opportunityCandidateIds?: string[];
  monetizationRunId?: string;
  maxCandidates?: number;
  runPurpose?: string;
};

export type RunVentureSelectionSuccess = {
  ok: true;
  ventureSelectionRunId: string;
  report: VentureSelectionReport;
  evaluations: CandidateEvaluationDraft[];
  resourceAllocation: ResourceAllocationSnapshot;
};

export type RunVentureSelectionFailure = {
  ok: false;
  ventureSelectionRunId: string;
  status: VentureSelectionRunStatus;
  failureClassification: string;
  message: string;
};

export type RunVentureSelectionOutput = RunVentureSelectionSuccess | RunVentureSelectionFailure;
