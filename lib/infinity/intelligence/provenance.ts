import { createHash } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import type { ProvenanceContext } from "./types";

export function buildExternalIdentifier(
  entityType: string,
  entityId: string,
): string {
  return `${entityType}:${entityId}`;
}

export function buildContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function mergeProvenanceMetadata(
  metadata: Record<string, unknown> | undefined,
  context: ProvenanceContext,
): Json {
  const merged: Record<string, Json> = {
    ...(metadata as Record<string, Json> | undefined),
  };

  if (context.sourceEntityType && context.sourceEntityId) {
    merged.source_entity = {
      type: context.sourceEntityType,
      id: context.sourceEntityId,
    };
  }

  if (context.engineJobId) {
    merged.engine_job_id = context.engineJobId;
  }

  if (context.workerRunId) {
    merged.worker_run_id = context.workerRunId;
  }

  if (context.actorType) {
    merged.actor_type = context.actorType;
  }

  return merged;
}

export function buildEventPayload(
  context: ProvenanceContext,
  payload: Record<string, Json | string | number | boolean | null> = {},
): Json {
  return {
    ...payload,
    actor_type: context.actorType ?? "system",
    source_entity_type: context.sourceEntityType ?? null,
    source_entity_id: context.sourceEntityId ?? null,
    engine_job_id: context.engineJobId ?? null,
    worker_run_id: context.workerRunId ?? null,
  };
}

export async function emitIntelligenceEvent(
  admin: AdminSupabaseClient,
  context: ProvenanceContext,
  input: {
    engineName: string;
    eventType: string;
    entityType: string;
    entityId: string;
    message: string;
    payload?: Record<string, Json | string | number | boolean | null>;
  },
) {
  return recordEngineEvent(admin, {
    organizationId: context.organizationId,
    engineName: input.engineName,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    message: input.message,
    correlationId: context.correlationId ?? undefined,
    payload: buildEventPayload(context, input.payload),
  });
}
