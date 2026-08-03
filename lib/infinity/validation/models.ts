import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import {
  DEFAULT_VALIDATION_MODEL_NAME,
  DEFAULT_VALIDATION_MODEL_VERSION,
  DEFAULT_VALIDATION_THRESHOLDS,
  VALIDATION_CATEGORIES,
} from "./constants";
import type { ValidationModel } from "./types";

export async function ensureDefaultValidationModel(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<ValidationModel> {
  const { data: existing, error: existingError } = await admin
    .from("validation_models")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("name", DEFAULT_VALIDATION_MODEL_NAME)
    .eq("version", DEFAULT_VALIDATION_MODEL_VERSION)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check validation model: ${existingError.message}`);
  }

  if (existing) {
    if (existing.status !== "active") {
      const { data: activated, error: activateError } = await admin
        .from("validation_models")
        .update({ status: "active", activated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("organization_id", organizationId)
        .select("*")
        .single();

      if (activateError || !activated) {
        throw new Error(
          `Failed to activate validation model: ${activateError?.message ?? "unknown"}`,
        );
      }

      return activated;
    }

    return existing;
  }

  const { data: model, error } = await admin
    .from("validation_models")
    .insert({
      organization_id: organizationId,
      name: DEFAULT_VALIDATION_MODEL_NAME,
      version: DEFAULT_VALIDATION_MODEL_VERSION,
      status: "active",
      description:
        "Deterministic v1 validation model. Proves assumptions before planning. No LLM or external research.",
      categories: VALIDATION_CATEGORIES as unknown as Json,
      thresholds: DEFAULT_VALIDATION_THRESHOLDS as unknown as Json,
      requirements: {
        requires_market_evidence_for_planning: true,
        system_validation_alone_blocks_planning: true,
        never_approves_building: true,
      } as Json,
      activated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !model) {
    throw new Error(`Failed to create validation model: ${error?.message ?? "unknown"}`);
  }

  await recordEngineEvent(admin, {
    organizationId,
    engineName: "validation_engine",
    eventType: "validation.model_created",
    entityType: "validation_model",
    entityId: model.id,
    message: `Validation model created: ${model.name}@${model.version}`,
    payload: {
      validation_model_id: model.id,
      name: model.name,
      version: model.version,
    },
  });

  return model;
}

export async function selectActiveValidationModel(
  admin: AdminSupabaseClient,
  organizationId: string,
  validationModelId?: string | null,
): Promise<ValidationModel> {
  if (validationModelId) {
    const { data, error } = await admin
      .from("validation_models")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", validationModelId)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Validation model not found: ${error?.message ?? validationModelId}`);
    }

    return data;
  }

  const { data: active, error: activeError } = await admin
    .from("validation_models")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw new Error(`Failed to load active validation model: ${activeError.message}`);
  }

  if (active) {
    return active;
  }

  return ensureDefaultValidationModel(admin, organizationId);
}

export function buildValidationRunKey(
  opportunityId: string,
  correlationOrJob: string,
): string {
  return `validation:${opportunityId}:job:${correlationOrJob}`;
}
