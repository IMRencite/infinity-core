import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  NormalizedPerformanceEvent,
  PerformanceObservation,
  PerformanceSource,
  PerformanceSourceAdapter,
  SourceHealth,
} from "../types";

export const internalInfinityAdapter: PerformanceSourceAdapter = {
  providerId: "internal_infinity",
  sourceType: "INTERNAL",
  ingestionMode: "INTERNAL_EVENT",
  capabilities: [
    "provider_cost",
    "build_cost",
    "repair_count",
    "execution_successes",
    "execution_attempts",
    "production_artifact_state",
    "media_artifact_state",
  ],
  async healthCheck(): Promise<SourceHealth> {
    return { status: "healthy", lastCheckedAt: new Date().toISOString() };
  },
  async fetchObservations(input: {
    organizationId: string;
    ventureId?: string;
    since?: string;
  }): Promise<PerformanceObservation[]> {
    const admin = input as unknown as { __admin?: AdminSupabaseClient };
    if (!admin.__admin) return [];
    return fetchInternalObservations(admin.__admin, input.organizationId, input.ventureId);
  },
  normalize(observation: PerformanceObservation): NormalizedPerformanceEvent[] {
    return [
      {
        id: randomUUID(),
        ventureId: observation.ventureId,
        artifactId: observation.artifactId,
        mediaAssetId: observation.mediaAssetId,
        externalActionId: observation.externalActionId,
        eventType: "internal_metric",
        metric: observation.rawMetric,
        value: observation.rawValue,
        unit: observation.rawUnit,
        occurredAt: observation.observedAt,
        observedAt: observation.observedAt,
        sourceId: observation.sourceId,
        sourceReference: observation.sourceReference,
        dimensions: observation.dimensions,
        confidence: observation.corrected ? 0.7 : 0.95,
        provenance: observation.provenance,
      },
    ];
  },
};

export async function fetchInternalObservations(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureId?: string,
): Promise<PerformanceObservation[]> {
  const observations: PerformanceObservation[] = [];
  const sourceId = "internal_infinity";
  const now = new Date().toISOString();

  const { data: mediaRuns } = await admin
    .from("creative_media_runs")
    .select("id, engine_report, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(10);

  for (const run of mediaRuns ?? []) {
    const report = run.engine_report as Record<string, unknown> | null;
    const cost = Number(report?.totalActualCostUsd ?? 0);
    if (cost > 0) {
      observations.push(makeObs({
        sourceId,
        sourceReference: `creative_media_run:${run.id}:provider_cost`,
        idempotencyKey: hashKey(`cm-cost-${run.id}`),
        ventureId,
        rawMetric: "provider_cost",
        rawValue: cost,
        rawUnit: "usd",
        description: `Creative media run provider cost`,
        observedAt: run.created_at ?? now,
        provenance: { creativeMediaRunId: run.id, sourceTable: "creative_media_runs" },
      }));
    }
  }

  const { data: costRecords } = await admin
    .from("creative_media_cost_records")
    .select("record_id, actual_cost_usd, provider, model, asset_id, creative_media_run_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const rec of costRecords ?? []) {
    const cost = Number(rec.actual_cost_usd ?? 0);
    if (cost <= 0) continue;
    observations.push(makeObs({
      sourceId,
      sourceReference: `creative_media_cost:${rec.record_id}`,
      idempotencyKey: hashKey(`cm-rec-${rec.record_id}`),
      ventureId,
      rawMetric: "provider_cost",
      rawValue: cost,
      rawUnit: "usd",
      mediaAssetId: rec.asset_id ?? undefined,
      description: `Media generation cost ${rec.provider}/${rec.model}`,
      observedAt: now,
      provenance: {
        recordId: rec.record_id,
        creativeMediaRunId: rec.creative_media_run_id,
        provider: rec.provider,
        model: rec.model,
      },
    }));
  }

  const { data: mediaArtifacts } = await admin
    .from("creative_media_production_artifacts")
    .select("artifact_id, status, unresolved_high_count, unresolved_critical_count, creative_media_run_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const art of mediaArtifacts ?? []) {
    const repairCount = Number(art.unresolved_high_count ?? 0) + Number(art.unresolved_critical_count ?? 0);
    observations.push(makeObs({
      sourceId,
      sourceReference: `media_artifact:${art.artifact_id}:repair_count`,
      idempotencyKey: hashKey(`media-repair-${art.artifact_id}`),
      ventureId,
      rawMetric: "repair_count",
      rawValue: repairCount,
      rawUnit: "count",
      artifactId: art.artifact_id,
      description: `Media artifact repair findings`,
      observedAt: now,
      provenance: { artifactId: art.artifact_id, status: art.status },
    }));
    const success = art.status === "READY" ? 1 : 0;
    observations.push(makeObs({
      sourceId,
      sourceReference: `media_artifact:${art.artifact_id}:execution_attempt`,
      idempotencyKey: hashKey(`media-attempt-${art.artifact_id}`),
      ventureId,
      rawMetric: "execution_attempts",
      rawValue: 1,
      rawUnit: "count",
      artifactId: art.artifact_id,
      description: `Media artifact production attempt`,
      observedAt: now,
      provenance: { artifactId: art.artifact_id, status: art.status },
    }));
    if (success) {
      observations.push(makeObs({
        sourceId,
        sourceReference: `media_artifact:${art.artifact_id}:execution_success`,
        idempotencyKey: hashKey(`media-success-${art.artifact_id}`),
        ventureId,
        rawMetric: "execution_successes",
        rawValue: 1,
        rawUnit: "count",
        artifactId: art.artifact_id,
        description: `Media artifact production success`,
        observedAt: now,
        provenance: { artifactId: art.artifact_id, status: art.status },
      }));
    }
  }

  const { data: externalActions } = await admin
    .from("external_actions")
    .select("id, execution_status, action_type, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const action of externalActions ?? []) {
    const success =
      action.execution_status === "completed" || action.execution_status === "succeeded" ? 1 : 0;
    observations.push(makeObs({
      sourceId,
      sourceReference: `external_action:${action.id}:execution_attempt`,
      idempotencyKey: hashKey(`ext-attempt-${action.id}`),
      ventureId,
      rawMetric: "execution_attempts",
      rawValue: 1,
      rawUnit: "count",
      externalActionId: action.id,
      description: `External action attempt ${action.action_type}`,
      observedAt: action.created_at ?? now,
      provenance: { externalActionId: action.id, actionType: action.action_type, executionStatus: action.execution_status },
    }));
    if (success) {
      observations.push(makeObs({
        sourceId,
        sourceReference: `external_action:${action.id}:execution_success`,
        idempotencyKey: hashKey(`ext-success-${action.id}`),
        ventureId,
        rawMetric: "execution_successes",
        rawValue: 1,
        rawUnit: "count",
        externalActionId: action.id,
        description: `External action success ${action.action_type}`,
        observedAt: action.created_at ?? now,
        provenance: { externalActionId: action.id, actionType: action.action_type, executionStatus: action.execution_status },
      }));
    }
  }

  const { data: pabRuns } = await admin
    .from("product_asset_builder_runs")
    .select("id, builder_report, cumulative_cost_usd, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(5);

  for (const run of pabRuns ?? []) {
    const report = run.builder_report as Record<string, unknown> | null;
    const buildCost = Number(run.cumulative_cost_usd ?? report?.totalCostUsd ?? report?.totalActualCostUsd ?? 0);
    if (buildCost > 0) {
      observations.push(makeObs({
        sourceId,
        sourceReference: `pab_run:${run.id}:build_cost`,
        idempotencyKey: hashKey(`pab-cost-${run.id}`),
        ventureId,
        rawMetric: "build_cost",
        rawValue: buildCost,
        rawUnit: "usd",
        description: "Product asset builder run cost",
        observedAt: run.created_at ?? now,
        provenance: { pabRunId: run.id, sourceTable: "product_asset_builder_runs" },
      }));
    }
  }

  return observations;
}

export function wrapInternalAdapter(admin: AdminSupabaseClient): PerformanceSourceAdapter {
  return {
    ...internalInfinityAdapter,
    fetchObservations: (input) =>
      internalInfinityAdapter.fetchObservations({ ...input, __admin: admin } as never),
  };
}

export function buildInternalPerformanceSource(ventureId?: string): PerformanceSource {
  return {
    id: "internal_infinity",
    ventureId,
    sourceType: "INTERNAL",
    provider: "internal_infinity",
    ingestionMode: "INTERNAL_EVENT",
    capabilities: internalInfinityAdapter.capabilities,
    status: "active",
    health: "healthy",
    lastSuccessfulSyncAt: new Date().toISOString(),
  };
}

function makeObs(input: Omit<PerformanceObservation, "observationId">): PerformanceObservation {
  return { observationId: randomUUID(), ...input };
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
