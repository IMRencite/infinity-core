import { evaluateEconomicViability } from "@/lib/infinity/monetization-engine/viability/evaluate";
import type { LoadedMonetizationBundle } from "@/lib/infinity/venture-selection/types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import { unitEconomicsKnown, type MonetizationEvidenceLayers } from "./monetization-levels";
import type { FounderResearchPacket } from "./research-packet";
import type { RevenueModelResearch } from "./revenue-model-research/types";

function formatRange(range: { low: number | null; base: number | null; high: number | null } | undefined): string {
  if (!range) return "UNKNOWN";
  const low = range.low ?? range.base;
  const high = range.high ?? range.base;
  if (low == null && high == null) return "UNKNOWN";
  if (low != null && high != null && low !== high) return `$${Math.round(low)}–$${Math.round(high)}`;
  const value = low ?? high;
  return value == null ? "UNKNOWN" : `$${Math.round(value)}`;
}

export function monetizeFromResearchPacket(input: {
  candidate: OpportunityCandidate;
  packet: FounderResearchPacket;
  revenueModel?: RevenueModelResearch | null;
}): LoadedMonetizationBundle | null {
  const layers: MonetizationEvidenceLayers = input.packet.monetizationLayers;
  if (layers.category === "UNKNOWN" && layers.ideaSpecific === "UNKNOWN" && layers.unitEconomics === "UNKNOWN") {
    return null;
  }

  const categorySupported = layers.category === "SUPPORTED";
  const ideaSupported = layers.ideaSpecific === "SUPPORTED";
  const negative = layers.category === "UNSUPPORTED" || layers.ideaSpecific === "UNSUPPORTED";
  const unitKnown = unitEconomicsKnown(layers);
  const rm = input.revenueModel;
  const hasGroundedModel = Boolean(rm && rm.coverage.status !== "REVENUE_MODEL_INSUFFICIENT" && rm.recommended.recommendedModel !== "UNKNOWN");

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

  const pricedMonthly = formatRange(rm?.architecture.base?.monthly ?? rm?.revenuePerCustomer.monthlyRecurring);
  const pricedSetup = formatRange(rm?.architecture.setup);

  return {
    monetizationRunId: `founder-monetization:${input.packet.researchRunId}`,
    analysisId: `founder-monetization-analysis:${input.packet.researchRunId}`,
    primaryPlanId: `founder-monetization-plan:${input.packet.researchRunId}`,
    monetizationScore,
    combinedDecisionScore: viability.combinedDecisionScore,
    economicViability: viability.state,
    recommendation: {
      recommendedPrimaryModel: hasGroundedModel
        ? rm!.recommended.recommendedModel
        : ideaSupported
          ? "idea_specific"
          : "category_precedent",
      recommendedSecondaryModels: hasGroundedModel ? rm!.recommended.alternativeModels : [],
      recommendedPricingStrategy: hasGroundedModel
        ? `COMPARABLE_MODELED architecture: monthly ${pricedMonthly}; setup ${pricedSetup}. Not observed pricing.`
        : categorySupported
          ? "Category pricing exists; idea-specific pricing unproven"
          : "UNKNOWN",
      recommendedCustomer: input.candidate.targetCustomer,
      recommendedAcquisitionStrategy: "UNKNOWN until distribution evidence exists",
      expectedRevenueMechanism: hasGroundedModel
        ? rm!.streams.map((item) => item.name).join("; ") || rm!.recommended.recommendedModel
        : categorySupported
          ? "Category-comparable commercial model"
          : "UNKNOWN",
      expectedTimeToRevenue: unitPlan.estimatedMonthsToFirstRevenue != null ? `${unitPlan.estimatedMonthsToFirstRevenue} months` : "UNKNOWN",
      estimatedStartupCapital: unitPlan.estimatedCapitalRequired,
      keyEconomicAssumptions: [
        `Category monetization: ${layers.category}`,
        `Idea-specific monetization: ${layers.ideaSpecific}`,
        `Unit economics: ${layers.unitEconomics}`,
        ...(hasGroundedModel ? [`Revenue-model coverage: ${rm!.coverage.status}`, `Provenance: COMPARABLE_MODELED`] : []),
      ],
      largestEconomicRisks: ideaSupported
        ? ["Unit economics may not transfer"]
        : ["Exact concept is unproven even if the category monetizes"],
      confidence: unitKnown ? 0.62 : hasGroundedModel ? 0.45 : categorySupported ? 0.4 : 0.22,
    },
    primaryPlan: {
      id: `founder-monetization-plan:${input.packet.researchRunId}`,
      modelType: "other",
      modelName: hasGroundedModel ? rm!.recommended.recommendedModel : "Research-grounded monetization draft",
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
      keyAssumptions: [
        `Category ${layers.category}; idea ${layers.ideaSpecific}; unit ${layers.unitEconomics}`,
        ...(hasGroundedModel ? ["Revenue-model numbers are COMPARABLE_MODELED and must not be stored as OBSERVED."] : []),
      ],
      risks: ["Do not fabricate profitability"],
      sourceUrls: input.packet.sources.map((source) => source.url),
      revenueStreams: hasGroundedModel
        ? rm!.streams.map((item, index) => ({
            streamName: item.name,
            modelType: item.type,
            streamRole: index === 0 ? "primary" : item.recurringOrOneTime === "ONE_TIME" ? "setup" : "secondary",
          }))
        : [],
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
