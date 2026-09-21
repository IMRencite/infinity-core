import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_RESOURCE_CONSTRAINTS,
  type SelectionDecision,
} from "../constants";
import {
  classifyDecision,
  passesBuildGate,
  simulateResourceAllocation,
} from "../decisions/classify";
import type { CandidateEvaluationDraft, LoadedCandidateBundle } from "../types";

export type PersistedSelectionSnapshot = {
  candidateId: string;
  title: string;
  oldDecision: SelectionDecision;
  selectionScore: number;
  portfolioAdjustedScore: number;
  monetizationScore: number;
  validationScore: number;
  buildabilityScore: number;
  confidence: number;
  fatalAssumptionRiskScore: number;
  expectedRoi: number;
  blockingAssumptions: string[];
  primaryPlan: {
    estimatedCapitalRequired: number | null;
    platformDependencyRisk: number | null;
    regulatoryRisk: number | null;
    ltvCacRatio: number | null;
  };
};

function toEvaluationDraft(snapshot: PersistedSelectionSnapshot): CandidateEvaluationDraft {
  const candidate: LoadedCandidateBundle = {
    candidateId: snapshot.candidateId,
    discoveryRunId: "replay",
    title: snapshot.title,
    summary: snapshot.title,
    problem: "",
    targetCustomer: "",
    market: "",
    businessModelCandidates: [],
    revenueMechanismCandidates: [],
    opportunityScore: 0,
    demandEvidence: [],
    monetizationEvidence: [],
    competitionEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [],
    risks: [],
    researchSources: [],
    researchRunIds: [],
    monetization: {
      monetizationRunId: "replay",
      analysisId: "replay",
      primaryPlanId: "replay",
      monetizationScore: snapshot.monetizationScore,
      combinedDecisionScore: snapshot.selectionScore,
      economicViability: "PROMISING",
      recommendation: {
        recommendedPrimaryModel: "saas_subscription",
        recommendedSecondaryModels: [],
        recommendedPricingStrategy: "",
        recommendedCustomer: "",
        recommendedAcquisitionStrategy: "",
        expectedRevenueMechanism: "",
        expectedTimeToRevenue: "",
        estimatedStartupCapital: snapshot.primaryPlan.estimatedCapitalRequired ?? 0,
        keyEconomicAssumptions: [],
        largestEconomicRisks: [],
        confidence: snapshot.confidence,
      },
      primaryPlan: {
        id: "replay",
        modelType: "saas_subscription",
        modelName: snapshot.title,
        monetizationScore: snapshot.monetizationScore,
        estimatedCapitalRequired: snapshot.primaryPlan.estimatedCapitalRequired,
        estimatedPriceBase: null,
        estimatedCustomersYear1: null,
        estimatedMonthsToFirstRevenue: 3,
        estimatedGrossRevenueYear1: null,
        estimatedGrossMarginPercent: null,
        estimatedFixedCosts: null,
        estimatedVariableCosts: null,
        estimatedCAC: null,
        estimatedLTV: null,
        ltvCacRatio: snapshot.primaryPlan.ltvCacRatio,
        automationPotential: null,
        technicalComplexity: null,
        operationalComplexity: null,
        regulatoryRisk: snapshot.primaryPlan.regulatoryRisk,
        platformDependencyRisk: snapshot.primaryPlan.platformDependencyRisk,
        customerAcquisitionDifficulty: null,
        keyAssumptions: [],
        risks: [],
        sourceUrls: [],
        revenueStreams: [],
      },
      allPlans: [],
      validationExperiments: [],
    },
  };

  return {
    candidate,
    assumptions: [],
    fatalAssumptionRiskScore: snapshot.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: 0,
    blockingAssumptions: snapshot.blockingAssumptions,
    validationScore: snapshot.validationScore,
    validationDimensions: {},
    buildability: {
      buildabilityScore: snapshot.buildabilityScore,
      automationScore: snapshot.buildabilityScore,
      operationalAutonomyScore: snapshot.buildabilityScore,
      externalDependencyScore: 50,
      canBuildSoftware: true,
      canAutomateAcquisition: true,
      canAutomateFulfillment: true,
      canAutomateSupport: true,
      requiresPhysicalInventory: false,
      requiresSpecializedEmployees: false,
      requiresLicensing: false,
      requiresLargeUpfrontCapital: false,
      dependsOnManualSales: false,
      dependsOnInaccessibleSystems: false,
      canDeliverDigitally: true,
      assessmentNotes: [],
      assessmentInputs: {},
    },
    speedToValue: {
      estimatedBuildTimeDays: 60,
      estimatedValidationTimeDays: 21,
      estimatedLaunchTimeDays: 74,
      estimatedTimeToFirstVisitorDays: 81,
      estimatedTimeToFirstLeadDays: 95,
      estimatedTimeToFirstTransactionDays: 72,
      estimatedTimeToFirstRevenueDays: 90,
      estimatedTimeToBreakEvenDays: 225,
      speedToValueScore: 70,
    },
    expectedValueInputs: {
      probabilityOfSuccess: 0.5,
      estimatedCustomersYear1: 100,
      estimatedRevenuePerCustomer: 1000,
      estimatedGrossMarginPercent: 70,
      estimatedFixedCosts: 20000,
      estimatedVariableCosts: 10000,
      startupCapital: snapshot.primaryPlan.estimatedCapitalRequired ?? 50000,
    },
    expectedValueDerived: {
      probabilityAdjustedRevenue: 50000,
      probabilityAdjustedGrossProfit: 35000,
      expected12MonthProfit: 5000,
      expectedRoi: snapshot.expectedRoi,
      capitalEfficiency: 0.5,
      expectedValuePerDollarDeployed: 0.1,
    },
    capitalEfficiencyMetrics: {},
    selectionScoreInputs: {},
    selectionScore: snapshot.selectionScore,
    portfolioAdjustedScore: snapshot.portfolioAdjustedScore,
    dependencyTags: [],
    correlationPenalties: [],
    experimentPriorities: [],
    adversarialReview: null,
    decision: snapshot.oldDecision,
    recommendedNextAction: "",
    queueReason: "",
    explanation: {
      whyThisOpportunity: "",
      whyNow: "",
      whyInfinityCanBuildIt: "",
      whyCustomersWillPay: "",
      whyThisModel: "",
      whyItRanksAboveAlternatives: "",
      largestRisks: [],
      fatalAssumptions: [],
      validationNeeded: [],
      expectedEconomics: {},
      resourceRequirements: {},
      confidence: snapshot.confidence,
    },
    handoff: null,
    confidence: snapshot.confidence,
  };
}

export function buildPersistedEvaluationDraft(snapshot: PersistedSelectionSnapshot): CandidateEvaluationDraft {
  return toEvaluationDraft(snapshot);
}

export function replaySelectionDecision(snapshot: PersistedSelectionSnapshot): {
  buildGatePassed: boolean;
  buildGateFailures: string[];
  recomputedDecision: SelectionDecision;
} {
  const evaluation = toEvaluationDraft(snapshot);
  const buildGate = passesBuildGate({
    evaluation,
    thresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
  });
  const allocationPreview = simulateResourceAllocation({
    rankedEvaluations: [{ ...evaluation, decision: buildGate.passes ? "BUILD" : "VALIDATE" }],
    constraints: DEFAULT_RESOURCE_CONSTRAINTS,
  });
  const hasResourceCapacity =
    allocationPreview.allocations.some((item) => item.candidateId === evaluation.candidate.candidateId) ||
    buildGate.passes;
  const classified = classifyDecision({
    evaluation,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  });

  return {
    buildGatePassed: buildGate.passes,
    buildGateFailures: buildGate.reasons,
    recomputedDecision: classified.decision,
  };
}

export function replaySelectionPool(snapshots: PersistedSelectionSnapshot[]) {
  return snapshots.map((snapshot) => ({
    ...snapshot,
    ...replaySelectionDecision(snapshot),
  }));
}
