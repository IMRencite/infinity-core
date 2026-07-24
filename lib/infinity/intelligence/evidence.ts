import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { isEvidenceType } from "./constants";
import {
  buildContentHash,
  emitIntelligenceEvent,
  mergeProvenanceMetadata,
} from "./provenance";
import type { EvidenceRecord, ProvenanceContext } from "./types";

export type RecordEvidenceInput = ProvenanceContext & {
  sourceId: string;
  evidenceType: string;
  title?: string | null;
  summary?: string | null;
  rawContent?: string | null;
  structuredData?: Record<string, unknown>;
  capturedAt?: string;
  sourcePublishedAt?: string | null;
  relevanceScore?: number | null;
  credibilityScore?: number | null;
  confidenceScore?: number | null;
  freshnessScore?: number | null;
  supportsClaim?: boolean | null;
  contentHash?: string | null;
  language?: string | null;
};

export async function recordEvidence(
  admin: AdminSupabaseClient,
  input: RecordEvidenceInput,
): Promise<EvidenceRecord> {
  if (!isEvidenceType(input.evidenceType)) {
    throw new Error(`Invalid evidence type: ${input.evidenceType}`);
  }

  const structuredData = input.structuredData ?? {};
  const hasContent =
    Boolean(input.title?.trim()) ||
    Boolean(input.summary?.trim()) ||
    Boolean(input.rawContent?.trim()) ||
    Object.keys(structuredData).length > 0;

  if (!hasContent) {
    throw new Error("Evidence must include title, summary, raw content, or structured data");
  }

  const contentHash =
    input.contentHash ??
    buildContentHash(
      JSON.stringify({
        sourceId: input.sourceId,
        evidenceType: input.evidenceType,
        title: input.title ?? null,
        summary: input.summary ?? null,
        rawContent: input.rawContent ?? null,
        structuredData,
      }),
    );

  const { data: existing, error: existingError } = await admin
    .from("evidence_records")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check evidence record: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: evidence, error } = await admin
    .from("evidence_records")
    .insert({
      organization_id: input.organizationId,
      source_id: input.sourceId,
      evidence_type: input.evidenceType,
      title: input.title ?? null,
      summary: input.summary ?? null,
      raw_content: input.rawContent ?? null,
      structured_data: structuredData as Json,
      captured_at: input.capturedAt ?? new Date().toISOString(),
      source_published_at: input.sourcePublishedAt ?? null,
      relevance_score: input.relevanceScore ?? null,
      credibility_score: input.credibilityScore ?? null,
      confidence_score: input.confidenceScore ?? null,
      freshness_score: input.freshnessScore ?? null,
      supports_claim: input.supportsClaim ?? null,
      content_hash: contentHash,
      language: input.language ?? null,
      metadata: mergeProvenanceMetadata(input.metadata, input),
    })
    .select("*")
    .single();

  if (error || !evidence) {
    throw new Error(`Failed to record evidence: ${error?.message ?? "unknown error"}`);
  }

  await emitIntelligenceEvent(admin, input, {
    engineName: "research",
    eventType: "evidence.recorded",
    entityType: "evidence_record",
    entityId: evidence.id,
    message: `Evidence recorded: ${evidence.title ?? evidence.evidence_type}`,
    payload: {
      evidence_id: evidence.id,
      source_id: evidence.source_id,
      evidence_type: evidence.evidence_type,
      content_hash: evidence.content_hash,
    },
  });

  return evidence;
}
