import { evaluateEconomicViability } from "@/lib/infinity/monetization-engine/viability/evaluate";
import type { LoadedMonetizationBundle } from "@/lib/infinity/venture-selection/types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import { unitEconomicsKnown, type MonetizationEvidenceLayers } from "./monetization-levels";
import type { FounderResearchPacket } from "./research-packet";

export function monetizeFromResearchPacket(input: {
  candidate: OpportunityCandidate;
  packet: FounderResearchPacket;
}): LoadedMonetizationBundle | null {
  const layers: MonetizationEvidenceLayers = input.packet.monetizationLayers;
  if (layers.category === "UNKNOWN" && layers.ideaSpecific === "UNKNOWN" && layers.unitEconomics === "UNKNOWN") {
    return null;
  }

  const categorySupported = layers.category === "SUPPORTED";
  const ideaSupported = layers.ideaSpecific === "SUPPORTED";
  const negative = layers.category === "UNSUPPORTED" || layers.ideaSpecific === "UNSUPPORTED";
  const unitKnown = unitEconomicsKnown(layers);

  const monetizationScore = negative
    ? 18
    : ideaSupported && unitKnown
      ? 78
      : categorySupported && !ideaSupported
        ? 54
        : categorySupported
          ? 58
          : 36;

  const opportunityScore = input.candidate.opportunityScore ?? 50;
  const viability = evaluateEconomicViability({
    opportunityScore,
    monetizationScore,
  });

  // Qualitative layers may be SUPPORTED/UNSUPPORTED without observed CAC/LTV.
  // Never fill placeholder numerics — those must not satisfy BUILD economics.
  const unitPlan = {
    estimatedCAC: null,
    estimatedLTV: null,
    ltvCacRatio: null,
    estimatedGrossMarginPercent: null,
    estimatedCapitalRequired: null,
    estimatedMonthsToFirstRevenue: null,
  };

  return {
    monetizationRunId: `founder-monetization:${input.packet.researchRunId}`,
    analysisId: `founder-monetization-analysis:${input.packet.researchRunId}`,
    primaryPlanId: `founder-monetization-plan:${input.packet.researchRunId}`,
    monetizationScore,
    combinedDecisionScore: viability.combinedDecisionScore,
    economicViability: viability.state,
    recommendation: {
      recommendedPrimaryModel: ideaSupported ? "idea_specific" : "category_precedent",
      recommendedSecondaryModels: [],
      recommendedPricingStrategy: categorySupported ? "Category pricing exists; idea-specific pricing unproven" : "UNKNOWN",
      recommendedCustomer: input.candidate.targetCustomer,
      recommendedAcquisitionStrategy: "UNKNOWN until distribution evidence exists",
      expectedRevenueMechanism: categorySupported ? "Category-comparable commercial model" : "UNKNOWN",
      expectedTimeToRevenue: unitPlan.estimatedMonthsToFirstRevenue != null ? `${unitPlan.estimatedMonthsToFirstRevenue} months` : "UNKNOWN",
      estimatedStartupCapital: unitPlan.estimatedCapitalRequired,
      keyEconomicAssumptions: [
        `Category monetization: ${layers.category}`,
        `Idea-specific monetization: ${layers.ideaSpecific}`,
        `Unit economics: ${layers.unitEconomics}`,
      ],
      largestEconomicRisks: ideaSupported
        ? ["Unit economics may not transfer"]
        : ["Exact concept is unproven even if the category monetizes"],
      confidence: unitKnown ? 0.62 : categorySupported ? 0.4 : 0.22,
    },
    primaryPlan: {
      id: `founder-monetization-plan:${input.packet.researchRunId}`,
      modelType: "other",
      modelName: "Research-grounded monetization draft",
      monetizationScore,
      estimatedCapitalRequired: unitPlan.estimatedCapitalRequired,
      estimatedPriceBase: null,
      estimatedCustomersYear1: null,
      estimatedMonthsToFirstRevenue: unitPlan.estimatedMonthsToFirstRevenue,
      estimatedGrossRevenueYear1: null,
      estimatedGrossMarginPercent: unitPlan.estimatedGrossMarginPercent,
      estimatedFixedCosts: null,
      estimatedVariableCosts: null,
      estimatedCAC: unitPlan.estimatedCAC,
      estimatedLTV: unitPlan.estimatedLTV,
      ltvCacRatio: unitPlan.ltvCacRatio,
      automationPotential: null,
      technicalComplexity: null,
      operationalComplexity: null,
      regulatoryRisk: null,
      platformDependencyRisk: null,
      customerAcquisitionDifficulty: null,
      keyAssumptions: [`Category ${layers.category}; idea ${layers.ideaSpecific}; unit ${layers.unitEconomics}`],
      risks: ["Do not fabricate profitability"],
      sourceUrls: input.packet.sources.map((source) => source.url),
      revenueStreams: [],
    },
    allPlans: [],
    validationExperiments: [
      {
        id: `founder-validation-demand:${input.packet.researchRunId}`,
        experimentType: "search_demand_evidence",
        title: "Search demand evidence",
        description: "Public demand evidence without paid acquisition or exposure.",
        estimatedCostUsd: 0,
        priority: 1,
      },
      {
        id: `founder-validation-pricing:${input.packet.researchRunId}`,
        experimentType: "pricing_evidence_research",
        title: "Pricing evidence research",
        description: "Public comparable pricing evidence for later economics conversion.",
        estimatedCostUsd: 0,
        priority: 2,
      },
      {
        id: `founder-validation-distribution:${input.packet.researchRunId}`,
        experimentType: "distribution_economics_research",
        title: "Distribution economics research",
        description: "Public acquisition-channel economics evidence.",
        estimatedCostUsd: 0,
        priority: 3,
      },
    ],
  };
}
