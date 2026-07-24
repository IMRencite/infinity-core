import type { Tables } from "@/lib/supabase/database.types";

export type EvidenceSource = Tables<"evidence_sources">;
export type EvidenceRecord = Tables<"evidence_records">;
export type Claim = Tables<"claims">;
export type ClaimEvidence = Tables<"claim_evidence">;
export type KnowledgeRecord = Tables<"knowledge_records">;
export type MemoryRecord = Tables<"memory_records">;
export type Lesson = Tables<"lessons">;
export type Procedure = Tables<"procedures">;

export type ProvenanceContext = {
  organizationId: string;
  actorType?: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  correlationId?: string | null;
  engineJobId?: string | null;
  workerRunId?: string | null;
  metadata?: Record<string, unknown>;
};

export type IntelligenceSummary = {
  evidenceCount: number;
  claimCount: number;
  supportedClaims: number;
  contradictedClaims: number;
  activeKnowledgeCount: number;
  memoryCount: number;
  activeLessonCount: number;
  activeProcedureCount: number;
};

export type RuntimeValidationIntelligenceResult = {
  alreadyRecorded: boolean;
  evidenceSourceId: string;
  evidenceRecordId: string;
  claimId: string;
  claimEvidenceId: string;
  memoryRecordId: string;
};
