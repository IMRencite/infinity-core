import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { BuildPackageDraft, CompanyBuilderReport, VentureBlueprintDraft } from "./types";

export async function findCompanyBuilderRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data, error } = await admin
    .from("company_builder_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertCompanyBuilderRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    correlationId: string;
    idempotencyKey: string;
    simulationOnly: boolean;
    inputMode: "handoff" | "simulation";
    sourceLineage: Record<string, unknown>;
  },
) {
  const { data, error } = await admin
    .from("company_builder_runs")
    .insert({
      organization_id: input.organizationId,
      status: "requested",
      engine_version: "company_builder_v1",
      blueprint_version: "venture_blueprint_v1",
      simulation_only: input.simulationOnly,
      input_mode: input.inputMode,
      source_lineage: input.sourceLineage as never,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompanyBuilderRun(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  patch: Database["public"]["Tables"]["company_builder_runs"]["Update"],
) {
  const { error } = await admin
    .from("company_builder_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);
  if (error) throw error;
}

export async function persistVentureBlueprint(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    companyBuilderRunId: string;
    handoffId: string | null;
    candidateId: string | null;
    blueprint: VentureBlueprintDraft;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("company_builder_blueprints")
    .insert({
      organization_id: input.organizationId,
      company_builder_run_id: input.companyBuilderRunId,
      venture_selection_handoff_id: input.handoffId,
      opportunity_candidate_id: input.candidateId,
      simulation_only: input.blueprint.simulationOnly,
      blueprint_version: "venture_blueprint_v1",
      venture_name_working: input.blueprint.core.ventureNameWorking,
      venture_type: input.blueprint.core.ventureType,
      secondary_venture_types: input.blueprint.core.secondaryVentureTypes as never,
      primary_monetization_model: input.blueprint.core.primaryMonetizationModel,
      business_summary: input.blueprint.core.businessSummary,
      economics_compliance: input.blueprint.economicGuardrails.complianceResult,
      architecture_feedback_action:
        input.blueprint.architectureFeedback[0]?.recommendedAction ?? "CONTINUE",
      blueprint_payload: input.blueprint.core as never,
      business_architecture: input.blueprint.businessArchitecture as never,
      revenue_architecture: input.blueprint.revenueArchitecture as never,
      product_architecture: input.blueprint.productArchitecture as never,
      technical_architecture: input.blueprint.technicalArchitecture as never,
      data_model: input.blueprint.dataModel as never,
      integration_plan: input.blueprint.integrationPlan as never,
      build_vs_buy: input.blueprint.buildVsBuy as never,
      automation_architecture: input.blueprint.automationArchitecture as never,
      build_graph: input.blueprint.buildGraph as never,
      build_phases: input.blueprint.buildPhases as never,
      mvp_definition: input.blueprint.mvpDefinition as never,
      economic_guardrails: input.blueprint.economicGuardrails as never,
      architecture_feedback: input.blueprint.architectureFeedback as never,
      brand_architecture: input.blueprint.brandArchitecture as never,
      content_architecture: input.blueprint.contentArchitecture as never,
      acquisition_architecture: input.blueprint.acquisitionArchitecture as never,
      analytics_architecture: input.blueprint.analyticsArchitecture as never,
      failure_criteria: input.blueprint.failureCriteria as never,
      source_lineage: input.blueprint.sourceLineage as never,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function persistBuildPackage(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    companyBuilderRunId: string;
    ventureBlueprintId: string;
    buildPackage: BuildPackageDraft;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("company_builder_packages")
    .insert({
      organization_id: input.organizationId,
      company_builder_run_id: input.companyBuilderRunId,
      company_builder_blueprint_id: input.ventureBlueprintId,
      simulation_only: input.buildPackage.simulationOnly,
      package_version: input.buildPackage.packageVersion,
      status: input.buildPackage.status,
      build_graph_reference: input.buildPackage.buildGraphReference as never,
      mvp_reference: input.buildPackage.mvpReference as never,
      technical_architecture_reference: input.buildPackage.technicalArchitectureReference as never,
      economic_constraints_reference: input.buildPackage.economicConstraintsReference as never,
      verification_requirements: input.buildPackage.verificationRequirements as never,
      source_lineage: input.buildPackage.sourceLineage as never,
      readiness_report: input.buildPackage.readinessReport as never,
      blocked_reasons: input.buildPackage.blockedReasons as never,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function markHandoffConsumed(
  admin: AdminSupabaseClient,
  organizationId: string,
  handoffId: string,
) {
  await admin
    .from("venture_selection_handovers")
    .update({ handoff_status: "consumed" })
    .eq("organization_id", organizationId)
    .eq("id", handoffId)
    .eq("handoff_status", "prepared");
}

export function buildCompanyBuilderReport(input: {
  simulationOnly: boolean;
  handoffsConsumed: number;
  blueprints: VentureBlueprintDraft[];
  buildPackages: BuildPackageDraft[];
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
}): CompanyBuilderReport {
  return {
    engineVersion: "company_builder_v1",
    blueprintVersion: "venture_blueprint_v1",
    simulationOnly: input.simulationOnly,
    handoffsConsumed: input.handoffsConsumed,
    blueprintsCreated: input.blueprints.length,
    buildPackagesCreated: input.buildPackages.length,
    readyPackages: input.buildPackages.filter((pkg) => pkg.status === "READY").length,
    blockedPackages: input.buildPackages.filter((pkg) => pkg.status === "BLOCKED").length,
    ventureTypes: [...new Set(input.blueprints.map((bp) => bp.core.ventureType))],
    economicsCompliance: Object.fromEntries(
      input.blueprints.map((bp) => [bp.core.ventureNameWorking, bp.economicGuardrails.complianceResult]),
    ),
    architectureFeedbackSummary: input.blueprints.flatMap((bp) =>
      bp.architectureFeedback.map((f) => `${bp.core.ventureNameWorking}: ${f.finding}`),
    ),
    costSummary: {
      aiEnrichmentCount: 0,
      tokenUsage: input.tokenUsage,
      estimatedCostUsd: null,
    },
    completedAt: new Date().toISOString(),
  };
}

export async function markCompanyBuilderRunFailed(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  input: { classification: string; message: string; status?: string },
) {
  await updateCompanyBuilderRun(admin, organizationId, runId, {
    status: input.status ?? "failed",
    failure_classification: input.classification,
    error_message: input.message,
    failed_at: new Date().toISOString(),
  });
}
