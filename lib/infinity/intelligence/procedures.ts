import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { isProcedureStatus } from "./constants";
import { emitIntelligenceEvent, mergeProvenanceMetadata } from "./provenance";
import type { Procedure, ProvenanceContext } from "./types";

export type CreateProcedureInput = ProvenanceContext & {
  name: string;
  description: string;
  capabilityKey?: string | null;
  version: string;
  status?: string;
  steps?: unknown[];
  preconditions?: Record<string, unknown>;
  expectedOutputs?: Record<string, unknown>;
  successMetrics?: Record<string, unknown>;
  confidenceScore?: number | null;
  sourceLessonIds?: string[];
};

export async function createProcedure(
  admin: AdminSupabaseClient,
  input: CreateProcedureInput,
): Promise<Procedure> {
  const status = input.status ?? "draft";
  if (!isProcedureStatus(status)) {
    throw new Error(`Invalid procedure status: ${status}`);
  }

  const { data: procedure, error } = await admin
    .from("procedures")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      description: input.description,
      capability_key: input.capabilityKey ?? null,
      version: input.version,
      status,
      steps: (input.steps ?? []) as Json,
      preconditions: (input.preconditions ?? {}) as Json,
      expected_outputs: (input.expectedOutputs ?? {}) as Json,
      success_metrics: (input.successMetrics ?? {}) as Json,
      confidence_score: input.confidenceScore ?? null,
      source_lesson_ids: (input.sourceLessonIds ?? []) as Json,
      metadata: mergeProvenanceMetadata(input.metadata, input),
    })
    .select("*")
    .single();

  if (error || !procedure) {
    throw new Error(`Failed to create procedure: ${error?.message ?? "unknown error"}`);
  }

  await emitIntelligenceEvent(admin, input, {
    engineName: "research",
    eventType: "procedure.created",
    entityType: "procedure",
    entityId: procedure.id,
    message: `Procedure created: ${procedure.name}`,
    payload: {
      procedure_id: procedure.id,
      version: procedure.version,
      status: procedure.status,
      capability_key: procedure.capability_key,
    },
  });

  return procedure;
}
