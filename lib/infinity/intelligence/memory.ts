import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { isMemoryType } from "./constants";
import { emitIntelligenceEvent, mergeProvenanceMetadata } from "./provenance";
import type { MemoryRecord, ProvenanceContext } from "./types";

export type RecordMemoryInput = ProvenanceContext & {
  memoryType: string;
  title: string;
  summary: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  importanceScore?: number | null;
  confidenceScore?: number | null;
  occurredAt?: string | null;
  appliesTo?: Record<string, unknown>;
  content?: Record<string, unknown>;
};

export async function recordMemory(
  admin: AdminSupabaseClient,
  input: RecordMemoryInput,
): Promise<MemoryRecord> {
  if (!isMemoryType(input.memoryType)) {
    throw new Error(`Invalid memory type: ${input.memoryType}`);
  }

  const sourceEntityType = input.sourceEntityType ?? null;
  const sourceEntityId = input.sourceEntityId ?? null;

  if (sourceEntityType && sourceEntityId) {
    const { data: existing, error: existingError } = await admin
      .from("memory_records")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("source_entity_type", sourceEntityType)
      .eq("source_entity_id", sourceEntityId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to check memory record: ${existingError.message}`);
    }

    if (existing) {
      return existing;
    }
  }

  const { data: memory, error } = await admin
    .from("memory_records")
    .insert({
      organization_id: input.organizationId,
      memory_type: input.memoryType,
      title: input.title,
      summary: input.summary,
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId,
      importance_score: input.importanceScore ?? null,
      confidence_score: input.confidenceScore ?? null,
      occurred_at: input.occurredAt ?? null,
      applies_to: (input.appliesTo ?? {}) as Json,
      content: (input.content ?? {}) as Json,
      metadata: mergeProvenanceMetadata(input.metadata, input),
    })
    .select("*")
    .single();

  if (error || !memory) {
    throw new Error(`Failed to record memory: ${error?.message ?? "unknown error"}`);
  }

  await emitIntelligenceEvent(admin, input, {
    engineName: "research",
    eventType: "memory.recorded",
    entityType: "memory_record",
    entityId: memory.id,
    message: `Memory recorded: ${memory.title}`,
    payload: {
      memory_id: memory.id,
      memory_type: memory.memory_type,
      source_entity_type: memory.source_entity_type,
      source_entity_id: memory.source_entity_id,
    },
  });

  return memory;
}
