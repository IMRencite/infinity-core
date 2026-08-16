import { assembleVentureBlueprint, assembleBuildPackage } from "@/lib/infinity/company-builder/blueprint/assemble";
import type { LoadedBuildPackage } from "../../types";
import type { LoadedVentureSelectionHandoff } from "@/lib/infinity/company-builder/types";

function buildMarketplaceHandoff(orgId: string): LoadedVentureSelectionHandoff {
  return {
    id: null,
    organizationId: orgId,
    ventureSelectionRunId: null,
    candidateSelectionEvaluationId: null,
    opportunityCandidateId: "pab-v2-creator-marketplace",
    discoveryRunId: null,
    monetizationRunId: null,
    businessConcept: "Creator Community Marketplace",
    targetCustomer: "Digital creators and art collectors",
    problem: "Creators lack integrated storefront, community, and monetization tooling",
    solution: "Multi-sided creator marketplace with subscriptions and commissions",
    primaryMonetizationModel: "marketplace_commission",
    secondaryRevenueStreams: ["creator_subscription"],
    pricingStrategy: "10% marketplace take rate + premium creator plans",
    distributionStrategy: "SEO discovery + creator-led growth",
    recommendedProductType: "marketplace",
    requiredCapabilities: ["software_development", "community_platform"],
    mvpRequirements: [
      "Creator profiles",
      "Content posts",
      "Marketplace listings",
      "Transactions",
      "Subscriptions",
      "Moderation",
    ],
    futureFeatures: ["Live streaming", "NFT integration"],
    economicTargets: { expected12MonthProfit: 200000, expectedRoi: 2.5, estimatedCapitalRequired: 80000 },
    budgetEnvelope: { startupCapital: 80000, monthlyOperatingBudget: 8000 },
    riskConstraints: {},
    validationState: "simulation",
    sourceEvidenceRefs: [],
    handoffStatus: null,
    decision: "SIMULATION",
    simulationOnly: true,
    candidateTitle: "Creator Community Marketplace",
    candidateSummary: "PAB V2 capability test — multi-sided creator marketplace",
    businessModelCandidates: ["marketplace", "community_platform"],
  };
}

export function createMarketplaceBuildPackage(organizationId: string): LoadedBuildPackage {
  const handoff = buildMarketplaceHandoff(organizationId);
  const blueprint = assembleVentureBlueprint({
    handoff,
    simulationOnly: true,
    sourceLineage: { opportunityCandidateId: handoff.opportunityCandidateId, inputMode: "simulation" },
  });
  blueprint.core.ventureType = "marketplace";
  blueprint.core.secondaryVentureTypes = ["community", "marketplace"];
  blueprint.core.ventureNameWorking = "Creator Community Marketplace";
  blueprint.core.primaryMonetizationModel = "marketplace_commission";
  const buildPackage = assembleBuildPackage(blueprint, "pab-v2-marketplace-blueprint");
  return {
    packageId: null,
    blueprintId: null,
    organizationId,
    buildPackage,
    blueprint,
    buildGraph: blueprint.buildGraph,
    simulationOnly: true,
  };
}
