import { createIngestState, ingestObservations } from "@/lib/infinity/performance-intelligence-engine/ingestion/observation-ingestor";
import { internalInfinityAdapter } from "@/lib/infinity/performance-intelligence-engine/sources/internal-infinity-adapter";
import type { PerformanceObservation } from "@/lib/infinity/performance-intelligence-engine/types";
import { countProductionEvidence } from "@/lib/infinity/market-validation-experiment/events";

export function recordAcquisitionRuntimeObservation(input: {
  experimentId: string;
  candidateId: string;
  missionId: string;
  channelType: string;
  stepType: string;
}): {
  countsAsMarketEvidence: false;
  realSyntheticSeparated: true;
  channelAttribution: "PARTIAL";
  missionLineage: true;
  productionQualified: number;
} {
  const observation: PerformanceObservation = {
    observationId: `obs_mva_${input.missionId}_${input.stepType}`,
    sourceId: "internal_infinity",
    ventureId: `candidate:${input.candidateId}`,
    sourceReference: `${input.experimentId}:${input.missionId}:${input.stepType}`,
    idempotencyKey: `${input.experimentId}:${input.missionId}:${input.stepType}`,
    observedAt: new Date().toISOString(),
    rawMetric: "acquisition_runtime_step",
    rawValue: 1,
    rawUnit: "count",
    description: "Internal acquisition-runtime step. Not market evidence.",
    dimensions: {
      candidateId: input.candidateId,
      experimentId: input.experimentId,
      missionId: input.missionId,
      channel: input.channelType,
      synthetic: true,
      qualified: false,
    },
    provenance: {
      engine: "market_validation_acquisition_runtime_v1",
      synthetic: true,
    },
  };
  const ingested = ingestObservations({
    observations: [observation],
    adapter: internalInfinityAdapter,
    state: createIngestState(),
  });
  const production = countProductionEvidence(ingested.events.filter((event) => event.dimensions?.synthetic !== true));
  return {
    countsAsMarketEvidence: false,
    realSyntheticSeparated: true,
    channelAttribution: "PARTIAL",
    missionLineage: true,
    productionQualified: production.qualifiedSubmissions,
  };
}
