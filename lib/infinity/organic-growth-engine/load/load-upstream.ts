import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import { loadPreparedBuildHandoffs } from "@/lib/infinity/company-builder/load/load-handoffs";
import { mapPlanRow } from "@/lib/infinity/venture-selection/load/load-candidates";
import type { LoadedMonetizationPlan } from "@/lib/infinity/venture-selection/types";
import {
  buildUpstreamOrganicInput,
  buildVentureOrganicContextFromBlueprint,
  buildVentureOrganicContextFromHandoff,
} from "../adapters/upstream-context";
import type { UpstreamOrganicInput } from "../types";

type BlueprintRow = {
  id: string;
  organization_id: string;
  company_builder_run_id: string | null;
  venture_name_working: string;
  venture_type: string;
  secondary_venture_types: unknown;
  primary_monetization_model: string;
  business_summary: string;
  blueprint_payload: unknown;
  content_architecture: unknown;
  acquisition_architecture: unknown;
  economic_guardrails: unknown;
  simulation_only: boolean;
};

type BuildPackageRow = {
  id: string;
  company_builder_blueprint_id: string;
  source_lineage: unknown;
};

async function loadBlueprintRow(
  admin: AdminSupabaseClient,
  organizationId: string,
  blueprintId: string,
): Promise<BlueprintRow | null> {
  const { data, error } = await admin
    .from("company_builder_blueprints")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", blueprintId)
    .maybeSingle();
  if (error) throw error;
  return data as BlueprintRow | null;
}

function assembleBlueprintDraft(row: BlueprintRow): VentureBlueprintDraft {
  const core = row.blueprint_payload as VentureBlueprintDraft["core"];
  return {
    simulationOnly: row.simulation_only,
    core: {
      ...core,
      ventureNameWorking: row.venture_name_working,
      ventureType: row.venture_type as VentureBlueprintDraft["core"]["ventureType"],
      secondaryVentureTypes:
        (row.secondary_venture_types as VentureBlueprintDraft["core"]["secondaryVentureTypes"]) ?? [],
      primaryMonetizationModel: row.primary_monetization_model,
      businessSummary: row.business_summary,
    },
    contentArchitecture: row.content_architecture as VentureBlueprintDraft["contentArchitecture"],
    acquisitionArchitecture: row.acquisition_architecture as VentureBlueprintDraft["acquisitionArchitecture"],
    economicGuardrails: row.economic_guardrails as VentureBlueprintDraft["economicGuardrails"],
  } as VentureBlueprintDraft;
}

async function loadMonetizationPlanForCandidate(
  admin: AdminSupabaseClient,
  organizationId: string,
  opportunityCandidateId: string,
  monetizationRunId?: string | null,
): Promise<LoadedMonetizationPlan | null> {
  let query = admin
    .from("monetization_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("opportunity_candidate_id", opportunityCandidateId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (monetizationRunId) {
    query = query.eq("monetization_run_id", monetizationRunId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapPlanRow(data as Record<string, unknown>);
}

export async function loadUpstreamOrganicInputs(
  admin: AdminSupabaseClient,
  organizationId: string,
  input: {
    blueprintIds?: string[];
    buildPackageIds?: string[];
    handoffIds?: string[];
  },
): Promise<UpstreamOrganicInput[]> {
  const results: UpstreamOrganicInput[] = [];

  if (input.handoffIds?.length) {
    const handoffs = await loadPreparedBuildHandoffs(admin, organizationId, input.handoffIds);
    for (const handoff of handoffs) {
      const plan = handoff.opportunityCandidateId
        ? await loadMonetizationPlanForCandidate(
            admin,
            organizationId,
            handoff.opportunityCandidateId,
            handoff.monetizationRunId,
          )
        : null;
      const context = buildVentureOrganicContextFromHandoff(handoff);
      results.push(
        buildUpstreamOrganicInput({
          context,
          handoff,
          monetizationPlan: plan,
          sourceLineage: { inputMode: "blueprint" },
        }),
      );
    }
  }

  if (input.blueprintIds?.length) {
    for (const blueprintId of input.blueprintIds) {
      const row = await loadBlueprintRow(admin, organizationId, blueprintId);
      if (!row) continue;
      const blueprint = assembleBlueprintDraft(row);
      const lineage = { inputMode: "blueprint" as const, ventureBlueprintId: blueprintId };
      results.push(
        buildUpstreamOrganicInput({
          context: buildVentureOrganicContextFromBlueprint(blueprint, { ventureId: blueprintId }),
          sourceLineage: lineage,
          companyBuilderRunId: row.company_builder_run_id,
          ventureBlueprintId: blueprintId,
        }),
      );
    }
  }

  if (input.buildPackageIds?.length) {
    for (const packageId of input.buildPackageIds) {
      const { data: pkg, error: pkgError } = await admin
        .from("company_builder_packages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", packageId)
        .maybeSingle();
      if (pkgError) throw pkgError;
      if (!pkg) continue;

      const pkgRow = pkg as BuildPackageRow;
      const blueprintRow = await loadBlueprintRow(
        admin,
        organizationId,
        pkgRow.company_builder_blueprint_id,
      );
      if (!blueprintRow) continue;

      const blueprint = assembleBlueprintDraft(blueprintRow);
      const sourceLineage = (pkgRow.source_lineage ?? {}) as Record<string, unknown>;
      const candidateId =
        typeof sourceLineage.opportunityCandidateId === "string"
          ? sourceLineage.opportunityCandidateId
          : null;
      const monetizationRunId =
        typeof sourceLineage.monetizationRunId === "string" ? sourceLineage.monetizationRunId : null;

      const plan = candidateId
        ? await loadMonetizationPlanForCandidate(admin, organizationId, candidateId, monetizationRunId)
        : null;

      results.push(
        buildUpstreamOrganicInput({
          context: buildVentureOrganicContextFromBlueprint(blueprint, {
            ventureId: pkgRow.company_builder_blueprint_id,
          }),
          monetizationPlan: plan,
          sourceLineage: {
            inputMode: "blueprint",
            ventureBlueprintId: blueprintRow.id,
            companyBuilderBuildPackageId: packageId,
            opportunityCandidateId: candidateId,
            monetizationRunId,
          },
          companyBuilderRunId: blueprintRow.company_builder_run_id,
          ventureBlueprintId: blueprintRow.id,
          companyBuilderBuildPackageId: packageId,
        }),
      );
    }
  }

  return results;
}
