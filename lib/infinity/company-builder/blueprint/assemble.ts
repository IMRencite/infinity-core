import {
  buildArchitectureContext,
  generateComplexMarketplaceProductArchitecture,
} from "../architecture/generators";
import { generateBuildGraph, generateBuildPhases } from "../build-graph/generate";
import {
  createBuildPackage,
  defineMvp,
  evaluateArchitectureFeedback,
  evaluateBuildPackageReadiness,
  evaluateEconomicGuardrails,
} from "../planning/evaluate";
import type { LoadedVentureSelectionHandoff, SourceLineage, VentureBlueprintDraft } from "../types";

export function assembleVentureBlueprint(input: {
  handoff: LoadedVentureSelectionHandoff;
  simulationOnly: boolean;
  sourceLineage: SourceLineage;
  useComplexMarketplaceCapabilityTest?: boolean;
}): VentureBlueprintDraft {
  const context = buildArchitectureContext(input.handoff);

  let productArchitecture = context.productArchitecture;
  if (input.useComplexMarketplaceCapabilityTest) {
    productArchitecture = generateComplexMarketplaceProductArchitecture();
    context.core.ventureType = "creator_marketplace";
    context.core.secondaryVentureTypes = ["community", "marketplace", "digital_product"];
    context.core.businessSummary =
      "Capability-test blueprint for a multi-sided creator art community marketplace with UGC, commerce, and moderation.";
  }

  const buildGraph = generateBuildGraph({
    productArchitecture,
    technicalArchitecture: context.technicalArchitecture,
  });
  const buildPhases = generateBuildPhases(buildGraph);

  const integrationMonthlyCost = context.integrationPlan.reduce(
    (sum, item) => sum + (item.estimatedCost ?? 0),
    0,
  );

  const economicGuardrails = evaluateEconomicGuardrails({
    buildGraph,
    budgetEnvelope: input.handoff.budgetEnvelope,
    economicTargets: input.handoff.economicTargets,
    integrationMonthlyCost,
  });

  const architectureFeedback = evaluateArchitectureFeedback({
    buildGraph,
    budgetEnvelope: input.handoff.budgetEnvelope,
    economicGuardrails,
    automationCoverageScore: context.automationArchitecture.automationCoverageScore,
    integrationDependencyRiskMax: Math.max(...context.integrationPlan.map((i) => i.dependencyRisk), 0),
  });

  const draft: VentureBlueprintDraft = {
    simulationOnly: input.simulationOnly,
    core: context.core,
    businessArchitecture: context.businessArchitecture,
    revenueArchitecture: context.revenueArchitecture,
    productArchitecture,
    technicalArchitecture: context.technicalArchitecture,
    dataModel: context.dataModel,
    integrationPlan: context.integrationPlan,
    buildVsBuy: context.buildVsBuy,
    automationArchitecture: context.automationArchitecture,
    buildGraph,
    buildPhases,
    mvpDefinition: defineMvp({
      productArchitecture,
      revenueArchitecture: context.revenueArchitecture,
      businessArchitecture: context.businessArchitecture,
    }),
    economicGuardrails,
    architectureFeedback,
    brandArchitecture: context.brandArchitecture,
    contentArchitecture: context.contentArchitecture,
    acquisitionArchitecture: context.acquisitionArchitecture,
    analyticsArchitecture: context.analyticsArchitecture,
    failureCriteria: context.failureCriteria,
    sourceLineage: input.sourceLineage,
  };

  return draft;
}

export function assembleBuildPackage(blueprint: VentureBlueprintDraft, blueprintId: string): import("../types").BuildPackageDraft {
  const readinessReport = evaluateBuildPackageReadiness({
    blueprint,
    buildGraph: blueprint.buildGraph,
    mvpDefinition: blueprint.mvpDefinition,
    sourceLineage: blueprint.sourceLineage,
  });
  return createBuildPackage({ blueprint, blueprintId, readinessReport });
}
