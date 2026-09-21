import type { Entity, ResolutionResult } from "./types";

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

export function resolveEntities(left: Entity, right: Entity): ResolutionResult {
  if (left.kind !== right.kind) {
    return {
      decision: "NOT_MATCHED",
      left_entity_id: left.entity_id,
      right_entity_id: right.entity_id,
      confidence: 1,
      evidence: ["KIND_MISMATCH"],
    };
  }
  const leftIds = new Set(left.identifiers.map((row) => `${row.scheme}:${normalizeToken(row.value)}`));
  const shared = right.identifiers.filter((row) => leftIds.has(`${row.scheme}:${normalizeToken(row.value)}`));
  const sharedSupport = shared.filter((row) => row.scheme !== "name");
  if (sharedSupport.some((row) =>
    row.scheme === "email"
    || row.scheme === "domain"
    || row.scheme === "license"
    || row.scheme === "cik"
    || row.scheme === "phone"
    || row.scheme === "source_record"
  )) {
    return {
      decision: "MATCHED",
      left_entity_id: left.entity_id,
      right_entity_id: right.entity_id,
      confidence: 0.97,
      evidence: sharedSupport.map((row) => `IDENTIFIER:${row.scheme}`),
      merged_entity_id: left.entity_id,
    };
  }
  const leftNames = left.identifiers.filter((row) => row.scheme === "name").map((row) => normalizeToken(row.value));
  const rightNames = right.identifiers.filter((row) => row.scheme === "name").map((row) => normalizeToken(row.value));
  const nameHit = leftNames.some((name) => rightNames.includes(name));
  if (nameHit && sharedSupport.length > 0) {
    return {
      decision: "LIKELY_MATCH",
      left_entity_id: left.entity_id,
      right_entity_id: right.entity_id,
      confidence: 0.72,
      evidence: ["SHARED_NAME", ...sharedSupport.map((row) => `IDENTIFIER:${row.scheme}`)],
    };
  }
  if (nameHit) {
    return {
      decision: "AMBIGUOUS",
      left_entity_id: left.entity_id,
      right_entity_id: right.entity_id,
      confidence: 0.48,
      evidence: ["NAME_ONLY"],
    };
  }
  return {
    decision: "NOT_MATCHED",
    left_entity_id: left.entity_id,
    right_entity_id: right.entity_id,
    confidence: 0.9,
    evidence: ["NO_SHARED_IDENTIFIER"],
  };
}

export function applyMerge(survivor: Entity, absorbed: Entity): Entity {
  return {
    ...survivor,
    identifiers: [...survivor.identifiers, ...absorbed.identifiers.filter((row) => !survivor.identifiers.some((existing) => existing.scheme === row.scheme && existing.value === row.value))],
    merge_history: [...survivor.merge_history, absorbed.entity_id],
  };
}
