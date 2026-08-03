import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  VENTURE_BLUEPRINT_SCHEMA_VERSION,
  VENTURE_BLUEPRINT_TEMPLATE_VERSION,
} from "../constants";
import type { VentureBlueprint, PersistedVentureBlueprint } from "../types/blueprint";
import { buildBlueprintIdempotencyKey } from "../generators/select-template";

function mapRow(row: Record<string, unknown>): PersistedVentureBlueprint {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    opportunityId: String(row.opportunity_id),
    ventureType: String(row.venture_type) as PersistedVentureBlueprint["ventureType"],
    templateKey: String(row.template_key),
    templateVersion: String(row.template_version),
    schemaVersion: String(row.schema_version),
    status: String(row.status) as PersistedVentureBlueprint["status"],
    blueprint: row.blueprint as VentureBlueprint,
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at),
  };
}

export async function findVentureBlueprintByIdempotency(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<PersistedVentureBlueprint | null> {
  const { data, error } = await admin
    .from("venture_blueprints")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}

export async function persistVentureBlueprint(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    opportunityId: string;
    blueprint: VentureBlueprint;
    templateKey: string;
    templateVersion?: string;
  },
): Promise<{ record: PersistedVentureBlueprint; created: boolean }> {
  const idempotencyKey = buildBlueprintIdempotencyKey(input.opportunityId);

  const existing = await findVentureBlueprintByIdempotency(
    admin,
    input.organizationId,
    idempotencyKey,
  );
  if (existing) {
    return { record: existing, created: false };
  }

  const { data, error } = await admin
    .from("venture_blueprints")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      venture_type: input.blueprint.ventureType,
      template_key: input.templateKey,
      template_version: input.templateVersion ?? VENTURE_BLUEPRINT_TEMPLATE_VERSION,
      schema_version: VENTURE_BLUEPRINT_SCHEMA_VERSION,
      status: input.blueprint.status,
      blueprint: input.blueprint as unknown as Json,
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      const retry = await findVentureBlueprintByIdempotency(
        admin,
        input.organizationId,
        idempotencyKey,
      );
      if (retry) {
        return { record: retry, created: false };
      }
    }
    throw new Error(error?.message ?? "Failed to persist venture blueprint.");
  }

  return { record: mapRow(data as Record<string, unknown>), created: true };
}
