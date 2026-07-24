import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { isKnowledgeStatus, isKnowledgeType } from "./constants";
import { emitIntelligenceEvent, mergeProvenanceMetadata } from "./provenance";
import type { KnowledgeRecord, ProvenanceContext } from "./types";

export type CreateKnowledgeRecordInput = ProvenanceContext & {
  knowledgeType: string;
  title: string;
  summary: string;
  status?: string;
  confidenceScore?: number | null;
  sourceClaimIds?: string[];
  sourceEvidenceIds?: string[];
  scope?: Record<string, unknown>;
  validityStart?: string | null;
  validityEnd?: string | null;
  version: string;
};

export async function createKnowledgeRecord(
  admin: AdminSupabaseClient,
  input: CreateKnowledgeRecordInput,
): Promise<KnowledgeRecord> {
  if (!isKnowledgeType(input.knowledgeType)) {
    throw new Error(`Invalid knowledge type: ${input.knowledgeType}`);
  }

  const status = input.status ?? "draft";
  if (!isKnowledgeStatus(status)) {
    throw new Error(`Invalid knowledge status: ${status}`);
  }

  const { data: knowledge, error } = await admin
    .from("knowledge_records")
    .insert({
      organization_id: input.organizationId,
      knowledge_type: input.knowledgeType,
      title: input.title,
      summary: input.summary,
      status,
      confidence_score: input.confidenceScore ?? null,
      source_claim_ids: (input.sourceClaimIds ?? []) as Json,
      source_evidence_ids: (input.sourceEvidenceIds ?? []) as Json,
      scope: (input.scope ?? {}) as Json,
      validity_start: input.validityStart ?? null,
      validity_end: input.validityEnd ?? null,
      version: input.version,
      metadata: mergeProvenanceMetadata(input.metadata, input),
    })
    .select("*")
    .single();

  if (error || !knowledge) {
    throw new Error(
      `Failed to create knowledge record: ${error?.message ?? "unknown error"}`,
    );
  }

  await emitIntelligenceEvent(admin, input, {
    engineName: "research",
    eventType: "knowledge.created",
    entityType: "knowledge_record",
    entityId: knowledge.id,
    message: `Knowledge created: ${knowledge.title}`,
    payload: {
      knowledge_id: knowledge.id,
      knowledge_type: knowledge.knowledge_type,
      version: knowledge.version,
      status: knowledge.status,
    },
  });

  return knowledge;
}
