import type { BuildPackageDraft, VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { LoadedBuildPackage } from "../types";

type PackageRow = {
  id: string;
  organization_id: string;
  company_builder_blueprint_id: string;
  status: string;
  simulation_only: boolean;
  package_version: number;
  build_graph_reference: unknown;
  mvp_reference: unknown;
  technical_architecture_reference: unknown;
  economic_constraints_reference: unknown;
  verification_requirements: unknown;
  source_lineage: unknown;
  readiness_report: unknown;
  blocked_reasons: unknown;
};

type BlueprintRow = {
  id: string;
  organization_id: string;
  simulation_only: boolean;
  venture_name_working: string;
  venture_type: string;
  secondary_venture_types: unknown;
  primary_monetization_model: string;
  business_summary: string;
  blueprint_payload: unknown;
  business_architecture: unknown;
  revenue_architecture: unknown;
  product_architecture: unknown;
  technical_architecture: unknown;
  data_model: unknown;
  integration_plan: unknown;
  build_vs_buy: unknown;
  automation_architecture: unknown;
  build_graph: unknown;
  build_phases: unknown;
  mvp_definition: unknown;
  economic_guardrails: unknown;
  architecture_feedback: unknown;
  brand_architecture: unknown;
  content_architecture: unknown;
  acquisition_architecture: unknown;
  analytics_architecture: unknown;
  failure_criteria: unknown;
};

export function assembleVentureBlueprintFromPersisted(
  pkg: PackageRow,
  blueprint: BlueprintRow,
): LoadedBuildPackage {
  const core = blueprint.blueprint_payload as VentureBlueprintDraft["core"];
  const ventureBlueprint: VentureBlueprintDraft = {
    simulationOnly: blueprint.simulation_only,
    core: {
      ...core,
      ventureNameWorking: blueprint.venture_name_working,
      ventureType: blueprint.venture_type as VentureBlueprintDraft["core"]["ventureType"],
      secondaryVentureTypes: (blueprint.secondary_venture_types as VentureBlueprintDraft["core"]["secondaryVentureTypes"]) ?? [],
      primaryMonetizationModel: blueprint.primary_monetization_model,
      businessSummary: blueprint.business_summary,
    },
    businessArchitecture: blueprint.business_architecture as VentureBlueprintDraft["businessArchitecture"],
    revenueArchitecture: blueprint.revenue_architecture as VentureBlueprintDraft["revenueArchitecture"],
    productArchitecture: blueprint.product_architecture as VentureBlueprintDraft["productArchitecture"],
    technicalArchitecture: blueprint.technical_architecture as VentureBlueprintDraft["technicalArchitecture"],
    dataModel: blueprint.data_model as VentureBlueprintDraft["dataModel"],
    integrationPlan: blueprint.integration_plan as VentureBlueprintDraft["integrationPlan"],
    buildVsBuy: blueprint.build_vs_buy as VentureBlueprintDraft["buildVsBuy"],
    automationArchitecture: blueprint.automation_architecture as VentureBlueprintDraft["automationArchitecture"],
    buildGraph: blueprint.build_graph as VentureBlueprintDraft["buildGraph"],
    buildPhases: blueprint.build_phases as VentureBlueprintDraft["buildPhases"],
    mvpDefinition: blueprint.mvp_definition as VentureBlueprintDraft["mvpDefinition"],
    economicGuardrails: blueprint.economic_guardrails as VentureBlueprintDraft["economicGuardrails"],
    architectureFeedback: blueprint.architecture_feedback as VentureBlueprintDraft["architectureFeedback"],
    brandArchitecture: blueprint.brand_architecture as VentureBlueprintDraft["brandArchitecture"],
    contentArchitecture: blueprint.content_architecture as VentureBlueprintDraft["contentArchitecture"],
    acquisitionArchitecture: blueprint.acquisition_architecture as VentureBlueprintDraft["acquisitionArchitecture"],
    analyticsArchitecture: blueprint.analytics_architecture as VentureBlueprintDraft["analyticsArchitecture"],
    failureCriteria: blueprint.failure_criteria as VentureBlueprintDraft["failureCriteria"],
    sourceLineage: (pkg.source_lineage as VentureBlueprintDraft["sourceLineage"]) ?? {},
  };

  const buildPackage: BuildPackageDraft = {
    simulationOnly: pkg.simulation_only,
    packageVersion: pkg.package_version,
    status: pkg.status as BuildPackageDraft["status"],
    buildGraphReference: pkg.build_graph_reference as BuildPackageDraft["buildGraphReference"],
    mvpReference: pkg.mvp_reference as BuildPackageDraft["mvpReference"],
    technicalArchitectureReference: pkg.technical_architecture_reference as BuildPackageDraft["technicalArchitectureReference"],
    economicConstraintsReference: pkg.economic_constraints_reference as BuildPackageDraft["economicConstraintsReference"],
    verificationRequirements: pkg.verification_requirements as BuildPackageDraft["verificationRequirements"],
    sourceLineage: (pkg.source_lineage as BuildPackageDraft["sourceLineage"]) ?? {},
    readinessReport: pkg.readiness_report as BuildPackageDraft["readinessReport"],
    blockedReasons: pkg.blocked_reasons as BuildPackageDraft["blockedReasons"],
  };

  return {
    packageId: pkg.id,
    blueprintId: blueprint.id,
    organizationId: pkg.organization_id,
    buildPackage,
    blueprint: ventureBlueprint,
    buildGraph: ventureBlueprint.buildGraph,
    simulationOnly: pkg.simulation_only,
  };
}
