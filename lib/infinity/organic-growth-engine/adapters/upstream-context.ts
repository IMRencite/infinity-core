import type { VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { LoadedMonetizationPlan } from "@/lib/infinity/venture-selection/types";
import type { LoadedVentureSelectionHandoff } from "@/lib/infinity/company-builder/types";
import { resolveMonetizationEconomics } from "../economics/monetization-economics";
import type {
  ExistingSiteInventory,
  SourceLineage,
  UpstreamOrganicInput,
  VentureOrganicContext,
} from "../types";

export function buildVentureOrganicContextFromBlueprint(
  blueprint: VentureBlueprintDraft,
  options?: {
    ventureId?: string;
    domain?: string;
    existingSite?: ExistingSiteInventory | null;
  },
): VentureOrganicContext {
  const core = blueprint.core;
  const contentArchitecture = blueprint.contentArchitecture as Record<string, unknown> | null;
  const acquisitionArchitecture = blueprint.acquisitionArchitecture as VentureOrganicContext["acquisitionArchitecture"];
  const guardrails = blueprint.economicGuardrails as Record<string, unknown> | undefined;

  return {
    ventureId: options?.ventureId ?? core.ventureNameWorking.toLowerCase().replace(/\s+/g, "-"),
    ventureName: core.ventureNameWorking,
    domain: options?.domain,
    businessSummary: core.businessSummary,
    targetCustomer: core.targetCustomer,
    problem: core.problem,
    solution: core.solution,
    primaryMonetizationModel: core.primaryMonetizationModel,
    distributionStrategy: core.customerAcquisitionStrategy ?? core.distributionChannels?.join(", ") ?? "",
    ventureType: core.ventureType,
    secondaryVentureTypes: core.secondaryVentureTypes,
    economicTargets: (guardrails?.economicTargets as Record<string, number | null>) ?? {},
    budgetEnvelope: (guardrails?.budgetEnvelope as Record<string, number | null>) ?? {},
    acquisitionArchitecture,
    contentArchitecture,
    existingSite: options?.existingSite ?? null,
  };
}

export function buildVentureOrganicContextFromHandoff(
  handoff: LoadedVentureSelectionHandoff,
  blueprint?: VentureBlueprintDraft | null,
): VentureOrganicContext {
  if (blueprint) {
    return buildVentureOrganicContextFromBlueprint(blueprint, {
      ventureId: handoff.opportunityCandidateId ?? handoff.id ?? undefined,
    });
  }

  return {
    ventureId: handoff.opportunityCandidateId ?? handoff.id ?? "venture",
    ventureName: handoff.businessConcept,
    businessSummary: handoff.candidateSummary ?? handoff.businessConcept,
    targetCustomer: handoff.targetCustomer,
    problem: handoff.problem,
    solution: handoff.solution,
    primaryMonetizationModel: handoff.primaryMonetizationModel,
    distributionStrategy: handoff.distributionStrategy,
    ventureType: handoff.recommendedProductType,
    economicTargets: handoff.economicTargets,
    budgetEnvelope: handoff.budgetEnvelope,
    acquisitionArchitecture: {
      primaryChannel: handoff.distributionStrategy,
      channels: [{ channel: handoff.distributionStrategy, role: "primary" }],
    },
    contentArchitecture: null,
    existingSite: null,
  };
}

export function buildUpstreamOrganicInput(input: {
  context: VentureOrganicContext;
  handoff?: LoadedVentureSelectionHandoff | null;
  monetizationPlan?: LoadedMonetizationPlan | null;
  sourceLineage?: Partial<SourceLineage>;
  companyBuilderRunId?: string | null;
  ventureBlueprintId?: string | null;
  companyBuilderBuildPackageId?: string | null;
}): UpstreamOrganicInput {
  const economics = resolveMonetizationEconomics(input.context, input.monetizationPlan ?? null);

  const sourceLineage: SourceLineage = {
    inputMode: input.sourceLineage?.inputMode ?? (input.handoff ? "blueprint" : "simulation"),
    capabilityTest: input.sourceLineage?.capabilityTest ?? false,
    opportunityCandidateId:
      input.sourceLineage?.opportunityCandidateId ?? input.handoff?.opportunityCandidateId ?? null,
    monetizationRunId: input.sourceLineage?.monetizationRunId ?? input.handoff?.monetizationRunId ?? null,
    ventureSelectionHandoffId: input.sourceLineage?.ventureSelectionHandoffId ?? input.handoff?.id ?? null,
    companyBuilderRunId: input.companyBuilderRunId ?? input.sourceLineage?.companyBuilderRunId ?? null,
    ventureBlueprintId: input.ventureBlueprintId ?? input.sourceLineage?.ventureBlueprintId ?? null,
    companyBuilderBuildPackageId:
      input.companyBuilderBuildPackageId ?? input.sourceLineage?.companyBuilderBuildPackageId ?? null,
    organicGrowthRunId: input.sourceLineage?.organicGrowthRunId ?? null,
  };

  return {
    context: {
      ...input.context,
      customerLifetimeValue: economics.customerLifetimeValue,
      averageOrderValue: economics.averageOrderValue,
      conversionRateEstimate: economics.conversionRateEstimate,
    },
    sourceLineage,
    economics,
  };
}
