import type { EvidenceBundle, ScoringAssessmentInput } from "@/lib/infinity/opportunity-scanner/types";
import type { LoadedMonetizationBundle } from "@/lib/infinity/venture-selection/types";

function grounded(signalType: string, claim: string, url = "https://example.com/research"): EvidenceBundle {
  return {
    signalType,
    claim,
    observedSignal: "grounded_research fixture",
    relevance: "high",
    sourceUrls: [url],
    grounded: true,
    limitations: [],
  };
}

/** Canonical grounded-research evidence shape. Founder claims are never marked grounded. */
export function canonicalGroundedEvidence(url = "https://example.com/research"): {
  demandEvidence: EvidenceBundle[];
  marketEvidence: EvidenceBundle[];
  competitionEvidence: EvidenceBundle[];
  monetizationEvidence: EvidenceBundle[];
  distributionEvidence: EvidenceBundle[];
  buildabilityEvidence: EvidenceBundle[];
} {
  return {
    demandEvidence: [grounded("demand", "Operators search for and pay to automate this workflow", url)],
    marketEvidence: [grounded("market", "Addressable digital workflow software market is expanding", url)],
    competitionEvidence: [grounded("competition", "Incumbents are generic; workflow-specific tools remain fragmented", url)],
    monetizationEvidence: [grounded("monetization", "Comparable workflow SaaS products charge monthly seats", url)],
    distributionEvidence: [grounded("distribution", "Self-serve content and search can reach operators", url)],
    buildabilityEvidence: [grounded("buildability", "Core product is a digitally delivered CRUD/workflow app", url)],
  };
}

export function saasWorkflowResearchFixture(): ScoringAssessmentInput {
  return {
    demandStrength: 0.86,
    marketGrowth: 0.78,
    competitionWeakness: 0.7,
    monetizationPotential: 0.88,
    buildability: 0.9,
    automationPotential: 0.88,
    distributionStrength: 0.74,
    capitalEfficiency: 0.82,
    speedToRevenue: 0.84,
    evidenceConfidence: 0.8,
  };
}

export function saasWorkflowMonetizationFixture(): LoadedMonetizationBundle {
  return {
    monetizationRunId: "founder-monetization-fixture",
    analysisId: "founder-analysis-fixture",
    primaryPlanId: "founder-plan-fixture",
    monetizationScore: 82,
    combinedDecisionScore: 80,
    economicViability: "STRONG",
    recommendation: {
      recommendedPrimaryModel: "saas_subscription",
      recommendedSecondaryModels: [],
      recommendedPricingStrategy: "Simple monthly subscription",
      recommendedCustomer: "Small business operators",
      recommendedAcquisitionStrategy: "Self-serve + content",
      expectedRevenueMechanism: "Subscription",
      expectedTimeToRevenue: "2-4 months ESTIMATE",
      estimatedStartupCapital: 18000,
      keyEconomicAssumptions: ["Operators pay for workflow time saved"],
      largestEconomicRisks: ["Adoption slower than estimated"],
      confidence: 0.72,
    },
    primaryPlan: {
      id: "founder-plan-fixture",
      modelType: "saas_subscription",
      modelName: "Workflow SaaS",
      monetizationScore: 82,
      estimatedCapitalRequired: 18000,
      estimatedPriceBase: 49,
      estimatedCustomersYear1: 180,
      estimatedMonthsToFirstRevenue: 3,
      estimatedGrossRevenueYear1: 88000,
      estimatedGrossMarginPercent: 82,
      estimatedFixedCosts: 18000,
      estimatedVariableCosts: 6000,
      estimatedCAC: 120,
      estimatedLTV: 900,
      ltvCacRatio: 7.5,
      automationPotential: 0.88,
      technicalComplexity: 0.28,
      operationalComplexity: 0.22,
      regulatoryRisk: 0.12,
      platformDependencyRisk: 0.18,
      customerAcquisitionDifficulty: 0.32,
      keyAssumptions: ["Clear workflow pain converts to paid seats"],
      risks: ["Incumbent bundling"],
      sourceUrls: ["https://example.com/pricing-benchmark"],
      revenueStreams: [{ streamName: "Core subscription", modelType: "saas_subscription", streamRole: "primary" }],
    },
    allPlans: [],
    validationExperiments: [
      {
        id: "exp-demand",
        experimentType: "landing_page_intent",
        title: "Landing page demand test",
        description: "Measure signup intent for the described workflow",
        estimatedCostUsd: 40,
        priority: 1,
      },
    ],
  };
}

export function rejectScoringFixture(): ScoringAssessmentInput {
  return {
    demandStrength: 0.12,
    marketGrowth: 0.1,
    competitionWeakness: 0.15,
    monetizationPotential: 0.1,
    buildability: 0.2,
    automationPotential: 0.15,
    distributionStrength: 0.1,
    capitalEfficiency: 0.1,
    speedToRevenue: 0.12,
    evidenceConfidence: 0.08,
  };
}

export function weakMonetizationFixture(): LoadedMonetizationBundle {
  const base = saasWorkflowMonetizationFixture();
  return {
    ...base,
    monetizationScore: 38,
    combinedDecisionScore: 32,
    economicViability: "WEAK",
    recommendation: {
      ...base.recommendation,
      confidence: 0.28,
      estimatedStartupCapital: 220000,
      largestEconomicRisks: ["No proven willingness to pay", "High CAC"],
    },
    primaryPlan: {
      ...base.primaryPlan!,
      monetizationScore: 38,
      estimatedCapitalRequired: 220000,
      estimatedMonthsToFirstRevenue: 14,
      estimatedGrossRevenueYear1: 18000,
      estimatedGrossMarginPercent: 30,
      estimatedCAC: 900,
      estimatedLTV: 400,
      ltvCacRatio: 0.4,
      automationPotential: 0.25,
      technicalComplexity: 0.8,
      operationalComplexity: 0.75,
      regulatoryRisk: 0.7,
      platformDependencyRisk: 0.8,
      customerAcquisitionDifficulty: 0.85,
      sourceUrls: [],
    },
  };
}

/** Research uses canonical evidence shape. Founder claims are never marked grounded. */
export function applyCanonicalResearchFixture(grounded: boolean): {
  pipeline: "grounded_research";
  grounded: boolean;
  topics: string[];
} {
  return {
    pipeline: "grounded_research",
    grounded,
    topics: [
      "demand",
      "market",
      "competitors",
      "pricing",
      "customer pain",
      "distribution",
      "technology feasibility",
      "regulatory/platform risk",
      "economic benchmarks",
    ],
  };
}
