export {
  CLAIM_EVIDENCE_RELATIONSHIPS,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  EVIDENCE_SOURCE_RELIABILITY_STATUSES,
  EVIDENCE_SOURCE_TYPES,
  EVIDENCE_TYPES,
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TYPES,
  LESSON_STATUSES,
  LESSON_TYPES,
  MEMORY_TYPES,
  PROCEDURE_STATUSES,
  isClaimEvidenceRelationship,
  isClaimStatus,
  isClaimType,
  isEvidenceSourceReliabilityStatus,
  isEvidenceSourceType,
  isEvidenceType,
  isKnowledgeStatus,
  isKnowledgeType,
  isLessonStatus,
  isLessonType,
  isMemoryType,
  isProcedureStatus,
} from "./constants";
export { createClaim, linkEvidenceToClaim } from "./claims";
export { recordEvidence } from "./evidence";
export { createKnowledgeRecord } from "./knowledge";
export { createLesson } from "./lessons";
export { recordMemory } from "./memory";
export { createProcedure } from "./procedures";
export {
  calculateIntelligenceSummary,
  listActiveKnowledge,
  listRecentEvidence,
  listRecentLessons,
} from "./queries";
export { registerEvidenceSource } from "./sources";
export { recordRuntimeValidationIntelligence } from "./validation";
export type {
  Claim,
  ClaimEvidence,
  EvidenceRecord,
  EvidenceSource,
  IntelligenceSummary,
  KnowledgeRecord,
  Lesson,
  MemoryRecord,
  Procedure,
  ProvenanceContext,
  RuntimeValidationIntelligenceResult,
} from "./types";
