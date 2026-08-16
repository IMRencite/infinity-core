import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type {
  NormalizedPerformanceEvent,
  PerformanceObservation,
  PerformanceSource,
  PerformanceSourceAdapter,
  SourceHealth,
} from "../types";

export const mockWebAnalyticsAdapter: PerformanceSourceAdapter = {
  providerId: "mock_web_analytics",
  sourceType: "WEB_ANALYTICS",
  ingestionMode: "PULL",
  capabilities: ["impressions", "clicks", "sessions", "ctr"],
  async healthCheck(): Promise<SourceHealth> {
    return { status: "healthy", lastCheckedAt: new Date().toISOString() };
  },
  async fetchObservations(input: {
    organizationId: string;
    ventureId?: string;
  }): Promise<PerformanceObservation[]> {
    const now = new Date().toISOString();
    const ventureId = input.ventureId ?? "venture-test";
    return [
      obs({
        sourceId: "mock_web_analytics",
        sourceReference: `mock:page:home:impressions:2026-08-16`,
        idempotencyKey: hash("mock-home-impressions"),
        ventureId,
        rawMetric: "impressions",
        rawValue: 1000,
        rawUnit: "count",
        pageId: "page-home",
        description: "Mock page impressions",
        observedAt: now,
        provenance: { provider: "mock_web_analytics", simulated: true },
      }),
      obs({
        sourceId: "mock_web_analytics",
        sourceReference: `mock:page:home:clicks:2026-08-16`,
        idempotencyKey: hash("mock-home-clicks"),
        ventureId,
        rawMetric: "clicks",
        rawValue: 42,
        rawUnit: "count",
        pageId: "page-home",
        description: "Mock page clicks",
        observedAt: now,
        provenance: { provider: "mock_web_analytics", simulated: true },
      }),
      obs({
        sourceId: "mock_web_analytics",
        sourceReference: `mock:page:home:sessions:2026-08-16`,
        idempotencyKey: hash("mock-home-sessions"),
        ventureId,
        rawMetric: "sessions",
        rawValue: 38,
        rawUnit: "count",
        pageId: "page-home",
        description: "Mock sessions",
        observedAt: now,
        provenance: { provider: "mock_web_analytics", simulated: true },
      }),
    ];
  },
  normalize(observation: PerformanceObservation): NormalizedPerformanceEvent[] {
    return [
      {
        id: randomUUID(),
        ventureId: observation.ventureId,
        pageId: observation.pageId,
        eventType: "web_analytics",
        channel: "web",
        metric: observation.rawMetric,
        value: observation.rawValue,
        unit: observation.rawUnit,
        occurredAt: observation.observedAt,
        observedAt: observation.observedAt,
        sourceId: observation.sourceId,
        sourceReference: observation.sourceReference,
        dimensions: observation.dimensions,
        confidence: 0.8,
        provenance: observation.provenance,
      },
    ];
  },
};

export function buildMockWebAnalyticsSource(ventureId?: string): PerformanceSource {
  return {
    id: "mock_web_analytics",
    ventureId,
    sourceType: "WEB_ANALYTICS",
    provider: "mock_web_analytics",
    ingestionMode: "PULL",
    capabilities: mockWebAnalyticsAdapter.capabilities,
    status: "active",
    health: "healthy",
  };
}

function obs(input: Omit<PerformanceObservation, "observationId">): PerformanceObservation {
  return { observationId: randomUUID(), ...input };
}

function hash(v: string): string {
  return createHash("sha256").update(v).digest("hex").slice(0, 32);
}

export function createCorrectedObservation(
  original: PerformanceObservation,
  correctedValue: number,
): PerformanceObservation {
  return {
    ...original,
    observationId: randomUUID(),
    rawValue: correctedValue,
    corrected: true,
    supersedesReference: original.sourceReference,
    sourceReference: `${original.sourceReference}:corrected`,
    idempotencyKey: hash(`${original.idempotencyKey}:corrected:${correctedValue}`),
    provenance: { ...original.provenance, corrected: true, previousValue: original.rawValue },
  };
}

export function createLateObservation(
  base: Omit<PerformanceObservation, "observationId">,
): PerformanceObservation {
  return {
    observationId: randomUUID(),
    ...base,
    provenance: { ...base.provenance, lateArrival: true },
  };
}
