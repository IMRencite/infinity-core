import { randomUUID } from "node:crypto";
import { ingestObservations, createIngestState, type IngestState } from "@/lib/infinity/performance-intelligence-engine/ingestion/observation-ingestor";
import { internalInfinityAdapter } from "@/lib/infinity/performance-intelligence-engine/sources/internal-infinity-adapter";
import { aggregateEventsByMetric } from "@/lib/infinity/performance-intelligence-engine/metrics/metric-aggregator";
import { assessExpectedVsActual } from "@/lib/infinity/performance-intelligence-engine/analysis/expected-vs-actual";
import type { NormalizedPerformanceEvent, PerformanceObservation } from "@/lib/infinity/performance-intelligence-engine/types";
import type { ExperimentEventRecord, ExperimentCounts, IntentEvent } from "./types";

const STRENGTH: Record<IntentEvent, "WEAK" | "MODERATE" | "STRONG"> = {
  PAGE_VIEW: "WEAK",
  PRICING_VIEW: "WEAK",
  CTA_CLICK: "MODERATE",
  FORM_START: "MODERATE",
  PRICE_OPTION_SELECTED: "MODERATE",
  EARLY_ACCESS_REQUEST: "STRONG",
  PILOT_REQUEST: "STRONG",
  QUALIFIED_PILOT_APPLICATION: "STRONG",
  STRONG_PURCHASE_INTENT: "STRONG",
  PAID_COMMITMENT: "STRONG",
};

export function intentStrength(type: IntentEvent): "WEAK" | "MODERATE" | "STRONG" {
  return STRENGTH[type];
}

export function toObservation(event: ExperimentEventRecord): PerformanceObservation {
  return {
    observationId: event.eventId,
    sourceId: "internal_infinity",
    ventureId: `candidate:${event.candidateId}`,
    sourceReference: `${event.experimentId}:${event.eventId}`,
    idempotencyKey: `${event.experimentId}:${event.type}:${event.prospectKey ?? event.eventId}`,
    observedAt: event.occurredAt,
    rawMetric: event.type.toLowerCase(),
    rawValue: 1,
    rawUnit: "count",
    description: `Market validation experiment event ${event.type}`,
    artifactId: event.artifactId ?? undefined,
    dimensions: {
      candidateId: event.candidateId,
      experimentId: event.experimentId,
      variant: event.variant,
      synthetic: event.synthetic,
      qualified: event.qualified,
      pricingOptionId: event.pricingOptionId ?? "",
    },
    provenance: {
      engine: "governed_external_market_validation_experiment_v1",
      synthetic: event.synthetic,
    },
  };
}

export function ingestExperimentEvents(input: {
  events: ExperimentEventRecord[];
  state?: IngestState;
}): {
  events: NormalizedPerformanceEvent[];
  productionEvents: NormalizedPerformanceEvent[];
  duplicates: number;
  state: IngestState;
} {
  const observations = input.events.map(toObservation);
  const ingested = ingestObservations({
    observations,
    adapter: internalInfinityAdapter,
    state: input.state ?? createIngestState(),
  });
  const productionEvents = ingested.events.filter((event) => event.dimensions?.synthetic !== true);
  return {
    events: ingested.events,
    productionEvents,
    duplicates: ingested.results.filter((row) => row.duplicate).length,
    state: ingested.state,
  };
}

export function countProductionEvidence(events: NormalizedPerformanceEvent[]): ExperimentCounts {
  const real = events.filter((event) => event.dimensions?.synthetic !== true);
  const qualified = real.filter((event) => event.dimensions?.qualified === true);
  const type = (event: NormalizedPerformanceEvent) => String(event.metric).toUpperCase();
  return {
    qualifiedVisitors: new Set(
      qualified.filter((event) => type(event) === "PAGE_VIEW" || type(event) === "QUALIFIED_PILOT_APPLICATION").map((event) => event.sourceReference),
    ).size,
    strongIntent: qualified.filter((event) => /pilot_request|qualified_pilot|strong_purchase|early_access/.test(event.metric)).length,
    qualifiedSubmissions: qualified.filter((event) => event.metric === "qualified_pilot_application" || event.metric === "pilot_request").length,
    pricingSelections: real.filter((event) => event.metric === "price_option_selected").length,
    pageViews: real.filter((event) => event.metric === "page_view").length,
  };
}

export function performanceAssessments(events: NormalizedPerformanceEvent[], ventureId: string) {
  const window = "launch_to_date" as const;
  const aggregates = aggregateEventsByMetric({ events: events.filter((event) => event.dimensions?.synthetic !== true), ventureId, window });
  return assessExpectedVsActual({
    context: {
      ventureId,
      ventureModelType: "subscription",
      expectedConversionRate: undefined,
      expectedCac: undefined,
      expectedRevenue: undefined,
      expectationProvenance: "market_validation_experiment_v1",
    },
    aggregates,
    window,
  });
}

export function makeEvent(partial: Omit<ExperimentEventRecord, "eventId" | "variant"> & { eventId?: string }): ExperimentEventRecord {
  return {
    eventId: partial.eventId ?? randomUUID(),
    variant: "single_offer",
    ...partial,
  };
}
