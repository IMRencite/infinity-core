import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  isClaimEvidenceRelationship,
  isClaimStatus,
  isClaimType,
} from "./constants";
import { emitIntelligenceEvent, mergeProvenanceMetadata } from "./provenance";
import type { Claim, ClaimEvidence, ProvenanceContext } from "./types";

export type CreateClaimInput = ProvenanceContext & {
  subjectType: string;
  subjectId?: string | null;
  predicate: string;
  objectText?: string | null;
  objectEntityType?: string | null;
  objectEntityId?: string | null;
  claimType: string;
  status?: string;
  confidenceScore?: number | null;
  validityStart?: string | null;
  validityEnd?: string | null;
  reasoning?: string | null;
};

export async function createClaim(
  admin: AdminSupabaseClient,
  input: CreateClaimInput,
): Promise<Claim> {
  if (!isClaimType(input.claimType)) {
    throw new Error(`Invalid claim type: ${input.claimType}`);
  }

  const status = input.status ?? "unverified";
  if (!isClaimStatus(status)) {
    throw new Error(`Invalid claim status: ${status}`);
  }

  const { data: claim, error } = await admin
    .from("claims")
    .insert({
      organization_id: input.organizationId,
      subject_type: input.subjectType,
      subject_id: input.subjectId ?? null,
      predicate: input.predicate,
      object_text: input.objectText ?? null,
      object_entity_type: input.objectEntityType ?? null,
      object_entity_id: input.objectEntityId ?? null,
      claim_type: input.claimType,
      status,
      confidence_score: input.confidenceScore ?? null,
      validity_start: input.validityStart ?? null,
      validity_end: input.validityEnd ?? null,
      reasoning: input.reasoning ?? null,
      metadata: mergeProvenanceMetadata(input.metadata, input),
    })
    .select("*")
    .single();

  if (error || !claim) {
    throw new Error(`Failed to create claim: ${error?.message ?? "unknown error"}`);
  }

  const eventType =
    status === "supported"
      ? "claim.supported"
      : status === "contradicted"
        ? "claim.contradicted"
        : "claim.created";

  await emitIntelligenceEvent(admin, input, {
    engineName: "research",
    eventType,
    entityType: "claim",
    entityId: claim.id,
    message: `Claim created: ${claim.predicate}`,
    payload: {
      claim_id: claim.id,
      claim_type: claim.claim_type,
      status: claim.status,
      subject_type: claim.subject_type,
      subject_id: claim.subject_id,
    },
  });

  return claim;
}

export type LinkEvidenceToClaimInput = ProvenanceContext & {
  claimId: string;
  evidenceId: string;
  relationship: string;
  weightScore?: number | null;
  notes?: string | null;
};

export async function linkEvidenceToClaim(
  admin: AdminSupabaseClient,
  input: LinkEvidenceToClaimInput,
): Promise<ClaimEvidence> {
  if (!isClaimEvidenceRelationship(input.relationship)) {
    throw new Error(`Invalid claim-evidence relationship: ${input.relationship}`);
  }

  const { data: existing, error: existingError } = await admin
    .from("claim_evidence")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("claim_id", input.claimId)
    .eq("evidence_id", input.evidenceId)
    .eq("relationship", input.relationship)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check claim evidence link: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: link, error } = await admin
    .from("claim_evidence")
    .insert({
      organization_id: input.organizationId,
      claim_id: input.claimId,
      evidence_id: input.evidenceId,
      relationship: input.relationship,
      weight_score: input.weightScore ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !link) {
    throw new Error(
      `Failed to link evidence to claim: ${error?.message ?? "unknown error"}`,
    );
  }

  if (input.relationship === "supports") {
    await admin
      .from("claims")
      .update({ status: "supported" })
      .eq("id", input.claimId)
      .eq("organization_id", input.organizationId);
  } else if (input.relationship === "contradicts") {
    await admin
      .from("claims")
      .update({ status: "contradicted" })
      .eq("id", input.claimId)
      .eq("organization_id", input.organizationId);
  }

  return link;
}
