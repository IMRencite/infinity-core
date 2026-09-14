import type { HqCanonicalProjectionContractRecord } from "./types";

export function hqCanonicalProjectionContract(input: {
  sourceType: string;
  canonicalId: string;
  entityType: string;
  ventureRelation?: string | null;
  missionRelation?: string | null;
  status: string;
  timestamp?: string | null;
  projectionDestination: string;
  detailRoute: string;
  traceabilityLineage?: string | null;
}): HqCanonicalProjectionContractRecord {
  return {
    sourceType: input.sourceType,
    canonicalId: input.canonicalId,
    entityType: input.entityType,
    ventureRelation: input.ventureRelation?.trim() || "UNKNOWN",
    missionRelation: input.missionRelation?.trim() || "UNKNOWN",
    status: input.status,
    timestamp: input.timestamp ?? null,
    projectionDestination: input.projectionDestination,
    detailRoute: input.detailRoute,
    traceabilityLineage: input.traceabilityLineage?.trim() || "UNKNOWN",
  };
}

export function contractIsComplete(record: HqCanonicalProjectionContractRecord): boolean {
  return Boolean(
    record.sourceType &&
    record.canonicalId &&
    record.entityType &&
    record.status &&
    record.projectionDestination &&
    record.detailRoute &&
    record.ventureRelation &&
    record.missionRelation &&
    record.traceabilityLineage,
  );
}
