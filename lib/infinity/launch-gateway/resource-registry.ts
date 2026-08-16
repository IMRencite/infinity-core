import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { stablePayloadHash } from "./idempotency";

export type ExternalResourceRecord = {
  id: string;
  organizationId: string;
  resourceType: string;
  provider: string;
  providerResourceId: string;
  canonicalName: string;
  externalUrl: string | null;
  executionMode: string;
  reconciliationState: string;
};

export async function findResourceByIdempotency(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<ExternalResourceRecord | null> {
  const { data } = await admin
    .from("external_resources")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    resourceType: data.resource_type,
    provider: data.provider,
    providerResourceId: data.provider_resource_id,
    canonicalName: data.canonical_name,
    externalUrl: data.external_url,
    executionMode: data.execution_mode,
    reconciliationState: data.reconciliation_state,
  };
}

export async function upsertExternalResource(
  admin: AdminSupabaseClient,
  row: {
    organizationId: string;
    ventureId: string | null;
    launchPlanId: string | null;
    externalActionId: string;
    resourceType: string;
    provider: string;
    providerResourceId: string;
    canonicalName: string;
    externalUrl: string | null;
    executionMode: string;
    createdByActionId: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  const existing = await findResourceByIdempotency(
    admin,
    row.organizationId,
    row.idempotencyKey,
  );
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("external_resources")
    .insert({
      organization_id: row.organizationId,
      venture_id: row.ventureId,
      launch_plan_id: row.launchPlanId,
      external_action_id: row.externalActionId,
      resource_type: row.resourceType,
      provider: row.provider,
      provider_resource_id: row.providerResourceId,
      canonical_name: row.canonicalName,
      external_url: row.externalUrl,
      execution_mode: row.executionMode,
      status: "active",
      created_by_action_id: row.createdByActionId,
      idempotency_key: row.idempotencyKey,
      verified_at: new Date().toISOString(),
      reconciliation_state: "in_sync",
      metadata: (row.metadata ?? {}) as Json,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "resource registry insert failed");
  return data.id;
}

export function resourceIdempotencyKey(input: {
  organizationId: string;
  ventureId: string;
  resourceType: string;
  provider: string;
  canonicalName: string;
}): string {
  return [
    "external_resource",
    input.organizationId,
    input.ventureId,
    input.resourceType,
    input.provider,
    input.canonicalName,
  ].join(":");
}

export function hashPayloadManifest(manifest: Record<string, unknown>): string {
  return stablePayloadHash(manifest);
}
