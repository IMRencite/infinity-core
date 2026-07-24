import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { createClaim, linkEvidenceToClaim } from "./claims";
import { recordEvidence } from "./evidence";
import { recordMemory } from "./memory";
import { registerEvidenceSource } from "./sources";
import type { ProvenanceContext, RuntimeValidationIntelligenceResult } from "./types";

export type RecordRuntimeValidationIntelligenceInput = ProvenanceContext & {
  opportunityScanId: string;
  scanType: string;
};

export async function recordRuntimeValidationIntelligence(
  admin: AdminSupabaseClient,
  input: RecordRuntimeValidationIntelligenceInput,
): Promise<RuntimeValidationIntelligenceResult> {
  if (!input.workerRunId) {
    throw new Error("workerRunId is required for runtime validation intelligence");
  }

  const provenance: ProvenanceContext = {
    organizationId: input.organizationId,
    actorType: "system",
    sourceEntityType: "worker_run",
    sourceEntityId: input.workerRunId,
    correlationId: input.correlationId ?? null,
    engineJobId: input.engineJobId ?? null,
    workerRunId: input.workerRunId,
    metadata: {
      validation_scope: "durable_runtime",
      not_market_evidence: true,
      opportunity_scan_id: input.opportunityScanId,
      scan_type: input.scanType,
      ...(input.metadata ?? {}),
    },
  };

  const validationContentHash = `runtime-validation:${input.workerRunId}`;

  const { data: existingMemory, error: memoryLookupError } = await admin
    .from("memory_records")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("source_entity_type", "worker_run")
    .eq("source_entity_id", input.workerRunId)
    .maybeSingle();

  if (memoryLookupError) {
    throw new Error(
      `Failed to check runtime validation memory: ${memoryLookupError.message}`,
    );
  }

  if (existingMemory) {
    const { data: existingClaim } = await admin
      .from("claims")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("subject_type", "worker_run")
      .eq("subject_id", input.workerRunId)
      .eq("predicate", "runtime_execution")
      .maybeSingle();

    const { data: existingEvidence } = await admin
      .from("evidence_records")
      .select("id, source_id")
      .eq("organization_id", input.organizationId)
      .eq("content_hash", validationContentHash)
      .maybeSingle();

    const { data: existingLink } =
      existingClaim?.id && existingEvidence?.id
        ? await admin
            .from("claim_evidence")
            .select("id")
            .eq("organization_id", input.organizationId)
            .eq("claim_id", existingClaim.id)
            .eq("evidence_id", existingEvidence.id)
            .eq("relationship", "supports")
            .maybeSingle()
        : { data: null };

    const { data: existingSource } = await admin
      .from("evidence_sources")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("external_identifier", `worker_run:${input.workerRunId}`)
      .maybeSingle();

    return {
      alreadyRecorded: true,
      evidenceSourceId: existingSource?.id ?? existingEvidence?.source_id ?? "",
      evidenceRecordId: existingEvidence?.id ?? "",
      claimId: existingClaim?.id ?? "",
      claimEvidenceId: existingLink?.id ?? "",
      memoryRecordId: existingMemory.id,
    };
  }

  const { data: existingClaim } = await admin
    .from("claims")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("subject_type", "worker_run")
    .eq("subject_id", input.workerRunId)
    .eq("predicate", "runtime_execution")
    .maybeSingle();

  if (existingClaim) {
    const { data: existingEvidence } = await admin
      .from("evidence_records")
      .select("id, source_id")
      .eq("organization_id", input.organizationId)
      .eq("content_hash", validationContentHash)
      .maybeSingle();

    const { data: existingSource } = await admin
      .from("evidence_sources")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("external_identifier", `worker_run:${input.workerRunId}`)
      .maybeSingle();

    const memory = await recordMemory(admin, {
      ...provenance,
      memoryType: "worker_performance",
      title: "Discovery runtime validation succeeded",
      summary:
        "Durable discovery worker run completed successfully with zero opportunities and validation intelligence recorded.",
      sourceEntityType: "worker_run",
      sourceEntityId: input.workerRunId,
      occurredAt: new Date().toISOString(),
      importanceScore: 50,
      confidenceScore: 100,
      content: {
        opportunity_scan_id: input.opportunityScanId,
        opportunities_discovered: 0,
        validation_scope: "durable_runtime",
      },
    });

    return {
      alreadyRecorded: true,
      evidenceSourceId: existingSource?.id ?? existingEvidence?.source_id ?? "",
      evidenceRecordId: existingEvidence?.id ?? "",
      claimId: existingClaim.id,
      claimEvidenceId: "",
      memoryRecordId: memory.id,
    };
  }

  const source = await registerEvidenceSource(admin, {
    ...provenance,
    sourceType: "worker_output",
    name: "Deterministic Discovery Worker Runtime Validation",
    provider: "infinity.worker_runtime",
    reliabilityStatus: "trusted",
    externalIdentifier: `worker_run:${input.workerRunId}`,
  });

  const evidence = await recordEvidence(admin, {
    ...provenance,
    sourceId: source.id,
    evidenceType: "operational_result",
    title: "Discovery runtime validation scan completed",
    summary:
      "Deterministic discovery scan completed with zero opportunities. This is system-validation evidence, not real market intelligence.",
    structuredData: {
      validation_scope: "durable_runtime",
      not_market_evidence: true,
      opportunities_discovered: 0,
      opportunity_scan_id: input.opportunityScanId,
      scan_type: input.scanType,
    },
    supportsClaim: true,
    confidenceScore: 100,
    contentHash: validationContentHash,
  });

  const claim = await createClaim(admin, {
    ...provenance,
    subjectType: "worker_run",
    subjectId: input.workerRunId,
    predicate: "runtime_execution",
    objectText: "The Discovery runtime completed successfully.",
    claimType: "verified_fact",
    status: "accepted",
    confidenceScore: 100,
    reasoning:
      "Deterministic worker runtime validation completed without error. Not a market claim.",
  });

  const claimEvidence = await linkEvidenceToClaim(admin, {
    ...provenance,
    claimId: claim.id,
    evidenceId: evidence.id,
    relationship: "supports",
    weightScore: 100,
    notes: "System-validation evidence for durable discovery runtime execution.",
  });

  const memory = await recordMemory(admin, {
    ...provenance,
    memoryType: "worker_performance",
    title: "Discovery runtime validation succeeded",
    summary:
      "Durable discovery worker run completed successfully with zero opportunities and validation intelligence recorded.",
    sourceEntityType: "worker_run",
    sourceEntityId: input.workerRunId,
    occurredAt: new Date().toISOString(),
    importanceScore: 50,
    confidenceScore: 100,
    content: {
      opportunity_scan_id: input.opportunityScanId,
      opportunities_discovered: 0,
      validation_scope: "durable_runtime",
    },
  });

  return {
    alreadyRecorded: false,
    evidenceSourceId: source.id,
    evidenceRecordId: evidence.id,
    claimId: claim.id,
    claimEvidenceId: claimEvidence.id,
    memoryRecordId: memory.id,
  };
}
