import { randomUUID } from "node:crypto";
import type {
  IngestResult,
  NormalizedPerformanceEvent,
  PerformanceObservation,
  PerformanceSourceAdapter,
} from "../types";

export type IngestState = {
  ingestedKeys: Set<string>;
  eventsByReference: Map<string, NormalizedPerformanceEvent>;
};

export function createIngestState(): IngestState {
  return { ingestedKeys: new Set(), eventsByReference: new Map() };
}

export function ingestObservation(input: {
  observation: PerformanceObservation;
  adapter: PerformanceSourceAdapter;
  state: IngestState;
}): IngestResult {
  if (input.state.ingestedKeys.has(input.observation.idempotencyKey) && !input.observation.corrected) {
    return {
      observation: input.observation,
      events: [],
      duplicate: true,
      corrected: false,
    };
  }

  const normalized = input.adapter.normalize(input.observation);
  const events: NormalizedPerformanceEvent[] = [];

  for (const event of normalized) {
    const refKey = `${event.sourceId}:${event.sourceReference}:${event.metric}`;
    if (input.observation.corrected || input.observation.supersedesReference) {
      input.state.eventsByReference.set(refKey, event);
      events.push(event);
      input.state.ingestedKeys.add(input.observation.idempotencyKey);
      continue;
    }
    if (input.state.eventsByReference.has(refKey)) {
      continue;
    }
    input.state.eventsByReference.set(refKey, event);
    events.push(event);
  }

  if (!input.observation.corrected) {
    input.state.ingestedKeys.add(input.observation.idempotencyKey);
  } else {
    input.state.ingestedKeys.add(input.observation.idempotencyKey);
  }

  return {
    observation: input.observation,
    events,
    duplicate: events.length === 0 && !input.observation.corrected,
    corrected: Boolean(input.observation.corrected),
  };
}

export function ingestObservations(input: {
  observations: PerformanceObservation[];
  adapter: PerformanceSourceAdapter;
  state?: IngestState;
}): { results: IngestResult[]; events: NormalizedPerformanceEvent[]; state: IngestState } {
  const state = input.state ?? createIngestState();
  const results: IngestResult[] = [];
  const events: NormalizedPerformanceEvent[] = [];

  for (const observation of input.observations) {
    const result = ingestObservation({ observation, adapter: input.adapter, state });
    results.push(result);
    events.push(...result.events);
  }

  return { results, events, state };
}

export function allIngestedEvents(state: IngestState): NormalizedPerformanceEvent[] {
  return [...state.eventsByReference.values()];
}

export function makeObservation(
  overrides: Partial<PerformanceObservation> & Pick<PerformanceObservation, "sourceId" | "sourceReference" | "idempotencyKey" | "rawMetric" | "rawValue" | "rawUnit" | "description">,
): PerformanceObservation {
  return {
    observationId: randomUUID(),
    observedAt: new Date().toISOString(),
    provenance: {},
    ...overrides,
  };
}
