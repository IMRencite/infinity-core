import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  isEvidenceSourceReliabilityStatus,
  isEvidenceSourceType,
} from "./constants";
import {
  buildExternalIdentifier,
  emitIntelligenceEvent,
  mergeProvenanceMetadata,
} from "./provenance";
import type { EvidenceSource, ProvenanceContext } from "./types";

export type RegisterEvidenceSourceInput = ProvenanceContext & {
  sourceType: string;
  name: string;
  externalUrl?: string | null;
  externalIdentifier?: string | null;
  provider?: string | null;
  credibilityScore?: number | null;
  reliabilityStatus?: string;
};

export async function registerEvidenceSource(
  admin: AdminSupabaseClient,
  input: RegisterEvidenceSourceInput,
): Promise<EvidenceSource> {
  if (!isEvidenceSourceType(input.sourceType)) {
    throw new Error(`Invalid evidence source type: ${input.sourceType}`);
  }

  const reliabilityStatus = input.reliabilityStatus ?? "unknown";
  if (!isEvidenceSourceReliabilityStatus(reliabilityStatus)) {
    throw new Error(`Invalid reliability status: ${reliabilityStatus}`);
  }

  const externalIdentifier =
    input.externalIdentifier ??
    (input.sourceEntityType && input.sourceEntityId
      ? buildExternalIdentifier(input.sourceEntityType, input.sourceEntityId)
      : null);

  if (externalIdentifier) {
    const { data: existing, error: existingError } = await admin
      .from("evidence_sources")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("external_identifier", externalIdentifier)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to check evidence source: ${existingError.message}`);
    }

    if (existing) {
      return existing;
    }
  }

  const { data: source, error } = await admin
    .from("evidence_sources")
    .insert({
      organization_id: input.organizationId,
      source_type: input.sourceType,
      name: input.name,
      external_url: input.externalUrl ?? null,
      external_identifier: externalIdentifier,
      provider: input.provider ?? null,
      credibility_score: input.credibilityScore ?? null,
      reliability_status: reliabilityStatus,
      metadata: mergeProvenanceMetadata(input.metadata, input),
    })
    .select("*")
    .single();

  if (error || !source) {
    throw new Error(
      `Failed to register evidence source: ${error?.message ?? "unknown error"}`,
    );
  }

  await emitIntelligenceEvent(admin, input, {
    engineName: "research",
    eventType: "evidence.source_registered",
    entityType: "evidence_source",
    entityId: source.id,
    message: `Evidence source registered: ${source.name}`,
    payload: {
      source_id: source.id,
      source_type: source.source_type,
      reliability_status: source.reliability_status,
    },
  });

  return source;
}
