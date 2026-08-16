import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  PerformanceIntelligenceBuildPackage,
  PerformanceIntelligenceEngineReport,
} from "./types";

export async function findPerformanceIntelligenceRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data, error } = await admin
    .from("performance_intelligence_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertPerformanceIntelligenceRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    idempotencyKey: string;
    correlationId: string;
    simulationOnly: boolean;
    capabilityTest: boolean;
  },
) {
  const { data, error } = await admin
    .from("performance_intelligence_runs")
    .insert({
      organization_id: input.organizationId,
      idempotency_key: input.idempotencyKey,
      correlation_id: input.correlationId,
      simulation_only: input.simulationOnly,
      capability_test: input.capabilityTest,
      status: "running",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePerformanceIntelligenceRun(
  admin: AdminSupabaseClient,
  runId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from("performance_intelligence_runs")
    .update(patch as never)
    .eq("id", runId);
  if (error) throw error;
}

export async function persistPerformanceIntelligenceBuildPackage(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    performanceIntelligenceRunId: string;
    buildPackage: PerformanceIntelligenceBuildPackage;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("performance_intelligence_build_packages")
    .insert({
      organization_id: input.organizationId,
      performance_intelligence_run_id: input.performanceIntelligenceRunId,
      venture_id: input.buildPackage.ventureId,
      build_package: input.buildPackage as never,
      source_lineage: input.buildPackage.sourceLineage as never,
      observations_ingested: input.buildPackage.observations.length,
      events_normalized: input.buildPackage.normalizedEvents.length,
      decisions_created: input.buildPackage.learningDecisions.length,
    })
    .select("id")
    .single();
  if (error) throw error;

  for (const source of input.buildPackage.performanceSources) {
    await admin.from("performance_sources").insert({
      organization_id: input.organizationId,
      performance_intelligence_run_id: input.performanceIntelligenceRunId,
      source_id: source.id,
      venture_id: source.ventureId,
      source_type: source.sourceType,
      provider: source.provider,
      ingestion_mode: source.ingestionMode,
      status: source.status,
      health: source.health,
      source_payload: source as never,
    });
  }

  for (const obs of input.buildPackage.observations) {
    await admin.from("performance_observations").insert({
      organization_id: input.organizationId,
      performance_intelligence_run_id: input.performanceIntelligenceRunId,
      build_package_id: data.id,
      observation_id: obs.observationId,
      source_id: obs.sourceId,
      venture_id: obs.ventureId,
      source_reference: obs.sourceReference,
      idempotency_key: obs.idempotencyKey,
      observation_payload: obs as never,
    });
  }

  for (const event of input.buildPackage.normalizedEvents) {
    await admin.from("performance_events").upsert(
      {
        organization_id: input.organizationId,
        performance_intelligence_run_id: input.performanceIntelligenceRunId,
        build_package_id: data.id,
        event_id: event.id,
        source_id: event.sourceId,
        source_reference: event.sourceReference,
        venture_id: event.ventureId,
        metric: event.metric,
        value: event.value,
        unit: event.unit,
        event_payload: event as never,
      },
      { onConflict: "organization_id,source_id,source_reference,metric" },
    );
  }

  for (const agg of input.buildPackage.metricAggregates) {
    await admin.from("performance_metric_aggregates").insert({
      organization_id: input.organizationId,
      performance_intelligence_run_id: input.performanceIntelligenceRunId,
      build_package_id: data.id,
      aggregate_id: agg.aggregateId,
      venture_id: agg.ventureId,
      metric: agg.metric,
      time_window: agg.window,
      value: agg.value,
      unit: agg.unit,
      aggregate_payload: agg as never,
    });
  }

  for (const decision of input.buildPackage.learningDecisions) {
    await admin.from("performance_learning_decisions").insert({
      organization_id: input.organizationId,
      performance_intelligence_run_id: input.performanceIntelligenceRunId,
      build_package_id: data.id,
      decision_id: decision.decisionId,
      venture_id: decision.ventureId,
      decision_type: decision.decisionType,
      status: decision.status,
      mission_id: decision.missionId ?? null,
      decision_payload: decision as never,
    });
  }

  for (const link of input.buildPackage.traceabilityLinks) {
    await admin.from("performance_traceability_links").insert({
      organization_id: input.organizationId,
      performance_intelligence_run_id: input.performanceIntelligenceRunId,
      build_package_id: data.id,
      link_type: link.linkType,
      source_ref: link.sourceRef,
      target_ref: link.targetRef,
    });
  }

  return data.id;
}

export function buildPerformanceIntelligenceReport(input: {
  results: Array<{ stats: Record<string, number> }>;
}): PerformanceIntelligenceEngineReport {
  const totals = input.results.reduce(
    (acc, r) => {
      for (const [k, v] of Object.entries(r.stats)) acc[k] = (acc[k] ?? 0) + v;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    engineVersion: "performance_intelligence_engine_v1",
    venturesProcessed: input.results.length,
    buildPackagesCreated: input.results.length,
    observationsIngested: totals.observationsIngested ?? 0,
    eventsNormalized: totals.eventsNormalized ?? 0,
    aggregatesComputed: totals.aggregatesComputed ?? 0,
    diagnosesCreated: totals.diagnosesCreated ?? 0,
    opportunitiesCreated: totals.opportunitiesCreated ?? 0,
    learningDecisionsCreated: totals.learningDecisionsCreated ?? 0,
    missionsHandedOff: totals.missionsHandedOff ?? 0,
    totalIntelligenceCostUsd: 0,
  };
}
