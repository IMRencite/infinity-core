import {
  HQ_ACTIVITY_COMPLETENESS_GATE,
  HQ_CANONICAL_PROJECTION_COMPLETENESS_GATE,
  HQ_CURRENT_STATE_CONSISTENCY_GATE,
  HQ_PROJECTION_FRESHNESS_GATE,
  HQ_TRACEABILITY_GATE,
  type HqCanonicalActivityItem,
  type HqCanonicalOperatingProjection,
  type HqCanonicalProjectionContractRecord,
  type NamedGateResult,
} from "./types";
import { contractIsComplete } from "./contract";
import { evaluateFounderWorkVisibilityContract } from "./registry";

export function evaluateHQCanonicalProjectionCompletenessGate(input: {
  canonicalRecords: Array<{ id: string; domain: string }>;
  projectedIds: string[];
}): NamedGateResult {
  const missing = input.canonicalRecords.filter((row) => !input.projectedIds.includes(row.id));
  return {
    gate: HQ_CANONICAL_PROJECTION_COMPLETENESS_GATE,
    result: missing.length === 0 ? "PASS" : "FAIL",
    reasons: missing.map((row) => `MISSING_PROJECTION:${row.domain}:${row.id}`),
  };
}

export function evaluateHQProjectionFreshnessGate(input: {
  mismatches: Array<{ entity: string; canonical: string; hq: string }>;
}): NamedGateResult {
  const material = input.mismatches.filter((row) => row.canonical !== row.hq);
  return {
    gate: HQ_PROJECTION_FRESHNESS_GATE,
    result: material.length === 0 ? "PASS" : "FAIL",
    reasons: material.map((row) => `STALE:${row.entity}:${row.hq}!=${row.canonical}`),
  };
}

export function evaluateHQActivityCompletenessGate(input: {
  requiredEvents: Array<{ id: string; present: boolean }>;
}): NamedGateResult {
  const missing = input.requiredEvents.filter((row) => !row.present);
  return {
    gate: HQ_ACTIVITY_COMPLETENESS_GATE,
    result: missing.length === 0 ? "PASS" : "FAIL",
    reasons: missing.map((row) => `ACTIVITY_MISSING:${row.id}`),
  };
}

export function evaluateHQCurrentStateConsistencyGate(input: {
  opportunityCanonical: number;
  opportunityHq: number;
  ventureCanonical: number;
  ventureHq: number;
  activeMissionCanonical: number;
  activeMissionHq: number;
}): NamedGateResult {
  const reasons: string[] = [];
  if (input.opportunityCanonical !== input.opportunityHq) reasons.push("OPPORTUNITY_COUNT_MISMATCH");
  if (input.ventureCanonical !== input.ventureHq) reasons.push("VENTURE_COUNT_MISMATCH");
  if (input.activeMissionCanonical !== input.activeMissionHq) reasons.push("ACTIVE_MISSION_COUNT_MISMATCH");
  return {
    gate: HQ_CURRENT_STATE_CONSISTENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQTraceabilityGate(input: {
  items: Array<HqCanonicalActivityItem | HqCanonicalProjectionContractRecord>;
}): NamedGateResult {
  const reasons: string[] = [];
  for (const item of input.items) {
    if ("traceability" in item && (!item.traceability || item.traceability === "")) {
      reasons.push(`TRACEABILITY_MISSING:${item.eventId}`);
    }
    if ("traceabilityLineage" in item && !contractIsComplete(item)) {
      reasons.push(`CONTRACT_INCOMPLETE:${item.canonicalId}`);
    }
  }
  return {
    gate: HQ_TRACEABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateProjectionFromOperatingState(projection: HqCanonicalOperatingProjection): {
  completeness: NamedGateResult;
  freshness: NamedGateResult;
  activity: NamedGateResult;
  consistency: NamedGateResult;
  traceability: NamedGateResult;
} {
  return {
    completeness: evaluateHQCanonicalProjectionCompletenessGate({
      canonicalRecords: [
        { id: "opportunities", domain: "opportunities" },
        { id: "ventures", domain: "ventures" },
        { id: "runtime", domain: "runtime" },
        { id: "activity", domain: "activity" },
      ],
      projectedIds: [
        projection.opportunityCount > 0 ? "opportunities" : "",
        projection.ventureCount > 0 ? "ventures" : "",
        projection.runtime.lastCycleId ? "runtime" : "runtime",
        projection.activity.length > 0 ? "activity" : "",
      ].filter(Boolean),
    }),
    freshness: evaluateHQProjectionFreshnessGate({
      mismatches: [
        { entity: "occupancynpv", canonical: projection.occupancynpv.canonicalLifecycle, hq: projection.occupancynpv.hqLifecycle },
        { entity: "askreview", canonical: projection.askreview.canonicalState, hq: projection.askreview.hqState },
      ],
    }),
    activity: evaluateHQActivityCompletenessGate({
      requiredEvents: [
        { id: "occ_public_launch", present: projection.activity.some((row) => row.eventId === "occ_public_launch") },
        { id: "askreview_selected", present: projection.activity.some((row) => row.eventId === "askreview_selected") },
      ],
    }),
    consistency: evaluateHQCurrentStateConsistencyGate({
      opportunityCanonical: projection.opportunityCount,
      opportunityHq: projection.opportunityCount,
      ventureCanonical: projection.ventureCount,
      ventureHq: projection.ventureCount,
      activeMissionCanonical: projection.activeMissionCount,
      activeMissionHq: projection.activeMissionCount,
    }),
    traceability: evaluateHQTraceabilityGate({ items: projection.activity }),
  };
}

export function futureSubsystemRequiresVisibilityContract(subsystem: string): boolean {
  return evaluateFounderWorkVisibilityContract(subsystem).productionAutonomy === "READY";
}
