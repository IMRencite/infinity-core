import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { assessExpectedVsActual } from "./analysis/expected-vs-actual";
import { diagnosePerformance } from "./diagnosis/diagnosis-engine";
import {
  buildCreativeFeedbackContract,
  buildOrganicFeedbackContract,
  buildPabFeedbackContract,
} from "./feedback/engine-feedback";
import { createIngestState, ingestObservations } from "./ingestion/observation-ingestor";
import { buildLearningDecisions, buildExperimentFromOpportunity } from "./learning/learning-decision-engine";
import { aggregateEventsByDimension, aggregateEventsByMetric, deriveRatioAggregates } from "./metrics/metric-aggregator";
import { buildOptimizationOpportunities } from "./optimization/opportunity-engine";
import { buildVentureKPIModel } from "./kpi/venture-kpi-model";
import { mockWebAnalyticsAdapter } from "./sources/mock-web-analytics-adapter";
import {
  buildInternalPerformanceSource,
  wrapInternalAdapter,
} from "./sources/internal-infinity-adapter";
import { buildMockWebAnalyticsSource } from "./sources/mock-web-analytics-adapter";
import type {
  PerformanceIntelligenceBuildPackage,
  PerformanceIntelligenceEngineConfig,
  ProcessVentureResult,
  SourceLineage,
  TraceabilityLink,
  VenturePerformanceContext,
} from "./types";
import { handoffLearningDecisions } from "./handoff/mission-handoff";

type InfinitySupabase = SupabaseClient<Database>;

export async function processVenturePerformance(input: {
  admin: AdminSupabaseClient;
  supabase: InfinitySupabase;
  context: VenturePerformanceContext;
  config: PerformanceIntelligenceEngineConfig;
  organizationId: string;
  sourceLineage: SourceLineage;
  liveMode: boolean;
}): Promise<ProcessVentureResult> {
  const traceabilityLinks: TraceabilityLink[] = [];
  const internalAdapter = wrapInternalAdapter(input.admin);
  const sources = [
    buildInternalPerformanceSource(input.context.ventureId),
    ...(input.config.simulationOnly || !input.liveMode ? [buildMockWebAnalyticsSource(input.context.ventureId)] : []),
  ];

  const internalObs = await internalAdapter.fetchObservations({
    organizationId: input.organizationId,
    ventureId: input.context.ventureId,
  });
  const mockObs =
    input.config.simulationOnly || !input.liveMode
      ? await mockWebAnalyticsAdapter.fetchObservations({
          organizationId: input.organizationId,
          ventureId: input.context.ventureId,
        })
      : [];

  const ingestState = createIngestState();
  const internalIngest = ingestObservations({
    observations: internalObs,
    adapter: internalAdapter,
    state: ingestState,
  });
  const mockIngest =
    mockObs.length > 0
      ? ingestObservations({
          observations: mockObs,
          adapter: mockWebAnalyticsAdapter,
          state: ingestState,
        })
      : { results: [], events: [], state: ingestState };

  const observations = [...internalObs, ...mockObs];
  const events = [...internalIngest.events, ...mockIngest.events];

  for (const obs of observations) {
    traceabilityLinks.push({
      linkType: "source_to_observation",
      sourceRef: obs.sourceId,
      targetRef: obs.observationId,
    });
  }
  for (const event of events) {
    traceabilityLinks.push({
      linkType: "observation_to_event",
      sourceRef: event.sourceReference,
      targetRef: event.id,
    });
  }

  const baseAggregates = aggregateEventsByMetric({
    events,
    ventureId: input.context.ventureId,
    window: "week",
  });
  const derivedAggregates = deriveRatioAggregates({ aggregates: baseAggregates, window: "week" });
  const channelAggregates = aggregateEventsByDimension({
    events,
    dimensionKey: "channel",
    metric: "clicks",
    window: "week",
  });
  const metricAggregates = [...baseAggregates, ...derivedAggregates, ...channelAggregates];

  for (const agg of metricAggregates) {
    traceabilityLinks.push({
      linkType: "event_to_aggregate",
      sourceRef: input.context.ventureId,
      targetRef: agg.aggregateId,
    });
  }

  const kpiModel = buildVentureKPIModel(input.context);
  const kpiAssessments = assessExpectedVsActual({
    context: input.context,
    aggregates: metricAggregates,
    window: "week",
  });

  const diagnoses = diagnosePerformance({
    ventureId: input.context.ventureId,
    aggregates: metricAggregates,
    assessments: kpiAssessments,
    events,
  });

  for (const diagnosis of diagnoses) {
    traceabilityLinks.push({
      linkType: "aggregate_to_diagnosis",
      sourceRef: input.context.ventureId,
      targetRef: diagnosis.diagnosisId,
    });
  }

  const opportunities = buildOptimizationOpportunities({
    diagnoses,
    minOpportunityValueUsd: input.config.minOpportunityValueUsd,
  });

  for (const opp of opportunities) {
    traceabilityLinks.push({
      linkType: "diagnosis_to_opportunity",
      sourceRef: opp.diagnosisId,
      targetRef: opp.opportunityId,
    });
  }

  const intelligenceCostUsd = 0;
  const learningDecisions = buildLearningDecisions({
    opportunities,
    intelligenceCostUsd,
  });

  const experiments = opportunities
    .filter((o) => o.economicDecision === "TEST_FIRST")
    .map(buildExperimentFromOpportunity);

  const handoffs = await handoffLearningDecisions({
    supabase: input.supabase,
    organizationId: input.organizationId,
    decisions: learningDecisions,
    executeMissions: input.config.executeMissions,
    enableHandoff: input.config.enableMissionHandoff,
  });

  for (const decision of learningDecisions) {
    traceabilityLinks.push({
      linkType: "opportunity_to_decision",
      sourceRef: decision.opportunityId ?? decision.diagnosisId ?? "",
      targetRef: decision.decisionId,
    });
    const handoff = handoffs.find((h) => h.decisionId === decision.decisionId);
    if (handoff?.missionId) {
      decision.missionId = handoff.missionId;
      decision.missionTargetEngine = handoff.targetEngine ?? undefined;
      traceabilityLinks.push({
        linkType: "decision_to_mission",
        sourceRef: decision.decisionId,
        targetRef: handoff.missionId,
      });
    }
  }

  const buildPackage: PerformanceIntelligenceBuildPackage = {
    ventureId: input.context.ventureId,
    performanceSources: sources,
    observations,
    normalizedEvents: events,
    metricAggregates,
    kpiModel,
    kpiAssessments,
    diagnoses,
    optimizationOpportunities: opportunities,
    experiments,
    learningDecisions,
    traceabilityLinks,
    sourceLineage: input.sourceLineage,
    feedbackContracts: {
      organic: buildOrganicFeedbackContract({ ventureId: input.context.ventureId, opportunities }),
      creative: buildCreativeFeedbackContract({
        ventureId: input.context.ventureId,
        opportunities,
        mediaAssetIds: input.context.mediaAssetIds,
      }),
      pab: buildPabFeedbackContract({ ventureId: input.context.ventureId, opportunities }),
    },
  };

  return {
    buildPackage,
    stats: {
      observationsIngested: observations.length,
      eventsNormalized: events.length,
      aggregatesComputed: metricAggregates.length,
      diagnosesCreated: diagnoses.length,
      opportunitiesCreated: opportunities.length,
      learningDecisionsCreated: learningDecisions.length,
      missionsHandedOff: handoffs.filter((h) => h.missionId).length,
    },
  };
}
