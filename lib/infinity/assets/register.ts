import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import {
  isAssetLifecycleStage,
  isAssetOwnershipType,
  isAssetStatus,
  isAssetType,
} from "./constants";
import { mergeAssetMetadata } from "./queries";
import {
  buildSourceEntityReference,
  buildUniqueAssetSlug,
  slugifyAssetName,
} from "./slug";
import type { Asset, RegisterAssetInput } from "./types";

async function loadExistingSlugs(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("assets")
    .select("slug")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to load asset slugs: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.slug));
}

export async function registerAsset(
  admin: AdminSupabaseClient,
  input: RegisterAssetInput,
): Promise<Asset> {
  if (!isAssetType(input.assetType)) {
    throw new Error(`Invalid asset type: ${input.assetType}`);
  }

  const status = input.status ?? "planned";
  const lifecycleStage = input.lifecycleStage ?? "planned";
  const ownershipType = input.ownershipType ?? "owned";

  if (!isAssetStatus(status)) {
    throw new Error(`Invalid asset status: ${status}`);
  }

  if (!isAssetLifecycleStage(lifecycleStage)) {
    throw new Error(`Invalid asset lifecycle stage: ${lifecycleStage}`);
  }

  if (!isAssetOwnershipType(ownershipType)) {
    throw new Error(`Invalid asset ownership type: ${ownershipType}`);
  }

  const sourceReference = buildSourceEntityReference(
    input.sourceEntityType,
    input.sourceEntityId,
  );

  if (sourceReference) {
    const { data: existing, error: existingError } = await admin
      .from("assets")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("external_identifier", sourceReference)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to check existing asset: ${existingError.message}`);
    }

    if (existing) {
      return existing;
    }
  }

  const existingSlugs = await loadExistingSlugs(admin, input.organizationId);
  const slug = await buildUniqueAssetSlug(existingSlugs, input.name);
  const metadata = mergeAssetMetadata(
    input.metadata,
    input.sourceEntityType,
    input.sourceEntityId,
  );

  const { data: asset, error } = await admin
    .from("assets")
    .insert({
      organization_id: input.organizationId,
      venture_id: input.ventureId ?? null,
      initiative_id: input.initiativeId ?? null,
      parent_asset_id: input.parentAssetId ?? null,
      name: input.name,
      slug,
      asset_type: input.assetType,
      status,
      lifecycle_stage: lifecycleStage,
      ownership_type: ownershipType,
      description: input.description ?? null,
      external_identifier: sourceReference,
      metadata,
    })
    .select("*")
    .single();

  if (error || !asset) {
    throw new Error(`Failed to register asset: ${error?.message ?? "unknown error"}`);
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "portfolio",
    eventType: "asset.created",
    entityType: "asset",
    entityId: asset.id,
    message: `Asset registered: ${asset.name}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      asset_id: asset.id,
      asset_type: asset.asset_type,
      status: asset.status,
      lifecycle_stage: asset.lifecycle_stage,
      slug: asset.slug,
      actor_type: input.executorId ? "system" : "engine",
      executor_id: input.executorId ?? null,
      source_entity_type: input.sourceEntityType ?? null,
      source_entity_id: input.sourceEntityId ?? null,
    } satisfies Record<string, Json>,
  });

  return asset;
}

export { slugifyAssetName };
