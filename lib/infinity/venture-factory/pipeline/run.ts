import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { persistVentureBlueprint } from "../blueprints/persist";
import { emitBlueprintCreatedEvent } from "../events/emit";
import { VentureFactoryError } from "../errors";
import {
  generateVentureBlueprint,
  stampBlueprintCreatedAt,
} from "../generators/generate-blueprint";
import { selectVentureBlueprintTemplate } from "../generators/select-template";
import { getVentureBlueprintTemplate } from "../registry/template-registry";
import { validateVentureBlueprint } from "../validation/validate-blueprint";
import {
  assertOpportunityApprovedForBlueprint,
  mapOpportunityRow,
} from "../validation/validate-opportunity";
import type { VentureFactoryPipelineContext, VentureFactoryPipelineResult } from "../types/pipeline";

export async function runVentureFactoryPipeline(
  admin: AdminSupabaseClient,
  context: VentureFactoryPipelineContext,
): Promise<VentureFactoryPipelineResult> {
  const { data: row, error } = await admin
    .from("opportunities")
    .select("*")
    .eq("id", context.opportunityId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (error || !row) {
    throw new VentureFactoryError("Opportunity not found for organization.", "invalid_opportunity");
  }

  const opportunity = mapOpportunityRow(row as Record<string, unknown>);
  assertOpportunityApprovedForBlueprint(opportunity);

  const templateKey = selectVentureBlueprintTemplate(opportunity, context.templateOverride);
  const template = getVentureBlueprintTemplate(templateKey);

  let blueprint = generateVentureBlueprint(opportunity, template);
  validateVentureBlueprint(blueprint);

  const createdAt = new Date().toISOString();
  blueprint = stampBlueprintCreatedAt(blueprint, createdAt);

  const { record, created } = await persistVentureBlueprint(admin, {
    organizationId: context.organizationId,
    opportunityId: context.opportunityId,
    blueprint,
    templateKey: template.key,
    templateVersion: template.version,
  });

  await emitBlueprintCreatedEvent(admin, {
    organizationId: context.organizationId,
    blueprint: record,
    correlationId: context.correlationId,
    created,
  });

  return {
    alreadyExists: !created,
    blueprint: record,
  };
}
