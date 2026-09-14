import { evaluateCrossSurfaceCanonicalConsistencyGate } from "@/lib/infinity/capability-truth/gates";
import { isGenericImplementationText } from "@/lib/infinity/room-work";
import type { CanonicalHQLiveProjection, LiveHQDatum } from "./types";

function fail<T extends string>(gate: T, reasons: string[]): { gate: T; result: "PASS" | "FAIL"; reasons: string[] } {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["PASS"] };
}

export function evaluateHQAllDataLiveGate(projection: CanonicalHQLiveProjection): {
  gate: "HQAllDataLiveGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const row of projection.datums) {
    if (!row.source || !row.canonical_reference) reasons.push(`UNSOURCED:${row.datum_id}`);
    if (!row.freshness_state) reasons.push(`NO_FRESHNESS:${row.datum_id}`);
    if (row.freshness_state === "STALE" && row.verification_status !== "STALE") {
      reasons.push(`STALE_MASQUERADING_CURRENT:${row.datum_id}`);
    }
    if (row.value === "NOT_CONFIGURED" && row.datum_id === "external_implementation_agent") {
      reasons.push("CURSOR_STATIC_NOT_CONFIGURED");
    }
    if (row.value === "UNCONFIGURED" && (row.datum_id === "revenue_state" || row.datum_id === "latest_learning")) {
      reasons.push(`STATIC_UNCONFIGURED:${row.datum_id}`);
    }
  }
  return fail("HQAllDataLiveGate", reasons);
}

export function evaluateHQLiveCanonicalTruthGate(input: {
  projection: CanonicalHQLiveProjection;
  staticOperationalSnapshots: number;
}): {
  gate: "HQLiveCanonicalTruthGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const live = evaluateHQAllDataLiveGate(input.projection);
  const reasons = [...live.reasons.filter((row) => row !== "PASS")];
  if (input.staticOperationalSnapshots > 0) reasons.push(`STATIC_SNAPSHOTS:${input.staticOperationalSnapshots}`);
  if (input.projection.contract !== "CanonicalHQLiveProjection") reasons.push("MISSING_CANONICAL_PROJECTION");
  return fail("HQLiveCanonicalTruthGate", reasons);
}

export function evaluateHqLiveDatumSet(datums: LiveHQDatum[]): { unsourced: number; missingFreshness: number } {
  return {
    unsourced: datums.filter((row) => !row.source || !row.canonical_reference).length,
    missingFreshness: datums.filter((row) => !row.freshness_state).length,
  };
}

export function evaluateGenericWorkTextGate(values: string[]): { remains: boolean } {
  return { remains: values.some((row) => isGenericImplementationText(row)) };
}

export { evaluateCrossSurfaceCanonicalConsistencyGate };
