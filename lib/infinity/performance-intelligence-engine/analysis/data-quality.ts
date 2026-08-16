import type { DataQualityStatus } from "../constants";
import type { KPIAssessment, NormalizedPerformanceEvent, PerformanceObservation } from "../types";

export function assessObservationDataQuality(observation: PerformanceObservation): DataQualityStatus {
  if (!observation.rawMetric || !Number.isFinite(observation.rawValue)) return "MISSING";
  if (observation.corrected) return "PARTIAL";
  return "COMPLETE";
}

export function assessEventFreshness(
  event: NormalizedPerformanceEvent,
  staleThresholdHours = 168,
): DataQualityStatus {
  const ageMs = Date.now() - new Date(event.observedAt).getTime();
  if (ageMs > staleThresholdHours * 3600_000) return "STALE";
  return "COMPLETE";
}

export function assessAggregateConfidence(input: {
  events: NormalizedPerformanceEvent[];
  assessments: KPIAssessment[];
}): DataQualityStatus {
  if (input.events.length === 0) return "MISSING";
  if (input.assessments.every((a) => a.status === "insufficient_data")) return "LOW_CONFIDENCE";
  if (input.events.length < 3) return "PARTIAL";
  return "COMPLETE";
}

export function hasSufficientEvidence(
  dataQuality: DataQualityStatus,
  sampleSize: number,
  minSample = 3,
): boolean {
  if (dataQuality === "MISSING" || dataQuality === "LOW_CONFIDENCE") return false;
  if (sampleSize < minSample) return false;
  return true;
}

export function detectConflictingValues(values: number[], tolerance = 0.01): boolean {
  if (values.length < 2) return false;
  const first = values[0]!;
  return values.some((v) => Math.abs(v - first) / Math.max(Math.abs(first), 1) > tolerance);
}
