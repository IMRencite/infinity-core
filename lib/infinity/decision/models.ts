import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import {
  DEFAULT_DECISION_MODEL_NAME,
  DEFAULT_DECISION_MODEL_VERSION,
  DEFAULT_MODEL_THRESHOLDS,
  DEFAULT_MODEL_WEIGHTS,
  V1_SCORING_DIMENSIONS,
} from "./constants";
import type { DecisionModel } from "./types";

export async function ensureDefaultDecisionModel(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<DecisionModel> {
  const { data: existing, error: existingError } = await admin
    .from("decision_models")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("name", DEFAULT_DECISION_MODEL_NAME)
    .eq("version", DEFAULT_DECISION_MODEL_VERSION)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check decision model: ${existingError.message}`);
  }

  if (existing) {
    if (existing.status !== "active") {
      const { data: activated, error: activateError } = await admin
        .from("decision_models")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("organization_id", organizationId)
        .select("*")
        .single();

      if (activateError || !activated) {
        throw new Error(
          `Failed to activate decision model: ${activateError?.message ?? "unknown error"}`,
        );
      }

      await recordEngineEvent(admin, {
        organizationId,
        engineName: "decision_engine",
        eventType: "decision.model_activated",
        entityType: "decision_model",
        entityId: activated.id,
        message: `Decision model activated: ${activated.name}@${activated.version}`,
        payload: {
          decision_model_id: activated.id,
          name: activated.name,
          version: activated.version,
        },
      });

      return activated;
    }

    return existing;
  }

  const { data: model, error } = await admin
    .from("decision_models")
    .insert({
      organization_id: organizationId,
      name: DEFAULT_DECISION_MODEL_NAME,
      version: DEFAULT_DECISION_MODEL_VERSION,
      status: "active",
      description:
        "Conservative v1 model favoring strong evidence, capital efficiency, compounding potential, strategic fit, defensibility, bounded risk, and realistic time to value.",
      scoring_dimensions: V1_SCORING_DIMENSIONS as unknown as Json,
      weights: DEFAULT_MODEL_WEIGHTS as Json,
      decision_thresholds: DEFAULT_MODEL_THRESHOLDS as unknown as Json,
      policy_requirements: {
        creates_ventures: false,
        sparse_validation_blocks_approve_build: true,
        requires_human_approval_for_build: true,
      } as Json,
      activated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !model) {
    throw new Error(`Failed to create decision model: ${error?.message ?? "unknown error"}`);
  }

  await recordEngineEvent(admin, {
    organizationId,
    engineName: "decision_engine",
    eventType: "decision.model_created",
    entityType: "decision_model",
    entityId: model.id,
    message: `Decision model created: ${model.name}@${model.version}`,
    payload: {
      decision_model_id: model.id,
      name: model.name,
      version: model.version,
    },
  });

  await recordEngineEvent(admin, {
    organizationId,
    engineName: "decision_engine",
    eventType: "decision.model_activated",
    entityType: "decision_model",
    entityId: model.id,
    message: `Decision model activated: ${model.name}@${model.version}`,
    payload: {
      decision_model_id: model.id,
      name: model.name,
      version: model.version,
    },
  });

  return model;
}

export async function selectActiveDecisionModel(
  admin: AdminSupabaseClient,
  organizationId: string,
  decisionModelId?: string | null,
): Promise<DecisionModel> {
  if (decisionModelId) {
    const { data, error } = await admin
      .from("decision_models")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", decisionModelId)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Decision model not found: ${error?.message ?? decisionModelId}`);
    }

    return data;
  }

  const { data: active, error: activeError } = await admin
    .from("decision_models")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw new Error(`Failed to load active decision model: ${activeError.message}`);
  }

  if (active) {
    return active;
  }

  return ensureDefaultDecisionModel(admin, organizationId);
}

export function buildEvaluationKey(
  opportunityId: string,
  modelId: string,
  correlationId?: string | null,
): string {
  if (correlationId) {
    return `eval:${opportunityId}:${modelId}:${correlationId}`;
  }

  return `eval:${opportunityId}:${modelId}:latest`;
}
