import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "@/lib/infinity/events";
import { VENTURE_FACTORY_ENGINE_NAME, VENTURE_BLUEPRINT_SCHEMA_VERSION } from "../constants";
import type { PersistedVentureBlueprint } from "../types/blueprint";

export async function emitBlueprintCreatedEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    blueprint: PersistedVentureBlueprint;
    correlationId?: string | null;
    created: boolean;
  },
): Promise<void> {
  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: VENTURE_FACTORY_ENGINE_NAME,
    eventType: "venture_factory.blueprint_created",
    entityType: "venture_blueprint",
    entityId: input.blueprint.id,
    message: input.created
      ? `Venture blueprint created for opportunity ${input.blueprint.opportunityId}.`
      : `Venture blueprint already exists for opportunity ${input.blueprint.opportunityId}.`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      venture_blueprint_id: input.blueprint.id,
      opportunity_id: input.blueprint.opportunityId,
      venture_type: input.blueprint.ventureType,
      template_key: input.blueprint.templateKey,
      schema_version: VENTURE_BLUEPRINT_SCHEMA_VERSION,
      created: input.created,
      execution_scheduled: false,
    },
  });
}
