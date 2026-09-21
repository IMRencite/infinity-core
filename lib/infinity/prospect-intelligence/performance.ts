import type { ProspectOutcome } from "./types";

export function prospectOutcomeToPerformanceObservation(outcome: ProspectOutcome) {
  return {
    observationId: outcome.outcome_id,
    sourceId: "internal_infinity",
    ventureId: outcome.venture_id,
    sourceReference: outcome.entity_id,
    idempotencyKey: `prospect-outcome:${outcome.outcome_id}`,
    observedAt: outcome.at,
    rawMetric: outcome.kind,
    rawValue: 1,
    rawUnit: "count",
    dimensions: { outcome: outcome.kind, engine: "prospect_intelligence" },
    provenance: { engine: "prospect_intelligence_foundation_v1" },
    synthetic: false,
  };
}
