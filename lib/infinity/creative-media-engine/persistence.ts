import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { CreativeMediaBuildPackage, CreativeMediaEngineReport } from "./types";

export async function findCreativeMediaRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data, error } = await admin
    .from("creative_media_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertCreativeMediaRun(
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
    .from("creative_media_runs")
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

export async function updateCreativeMediaRun(
  admin: AdminSupabaseClient,
  runId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin.from("creative_media_runs").update(patch as never).eq("id", runId);
  if (error) throw error;
}

export async function persistCreativeMediaBuildPackage(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    creativeMediaRunId: string;
    buildPackage: CreativeMediaBuildPackage;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("creative_media_build_packages")
    .insert({
      organization_id: input.organizationId,
      creative_media_run_id: input.creativeMediaRunId,
      venture_id: input.buildPackage.ventureId,
      build_package: input.buildPackage as never,
      source_lineage: input.buildPackage.sourceLineage as never,
      blocked_reasons: input.buildPackage.blockedReasons as never,
      assets_generated: input.buildPackage.generatedAssets.length,
      production_ready_count: input.buildPackage.productionArtifacts.filter((p) => p.status === "READY").length,
    })
    .select("id")
    .single();
  if (error) throw error;

  for (const asset of input.buildPackage.generatedAssets) {
    await admin.from("creative_media_assets").insert({
      organization_id: input.organizationId,
      creative_media_run_id: input.creativeMediaRunId,
      build_package_id: data.id,
      asset_id: asset.assetId,
      media_type: asset.mediaType,
      mime_type: asset.mimeType,
      file_path: asset.filePath,
      width: asset.width,
      height: asset.height,
      duration_sec: asset.durationSec,
      file_size_bytes: asset.fileSizeBytes,
      checksum: asset.checksum,
      provider: asset.provider,
      model: asset.model,
      provider_job_id: asset.providerJobId,
      creative_brief_id: asset.creativeBriefId,
      generation_task_id: asset.generationTaskId,
      routing_decision_id: asset.routingDecisionId,
      estimated_cost: asset.estimatedCost,
      actual_cost: asset.actualCost,
      quality_status: asset.qualityStatus,
      production_status: asset.productionStatus,
      usage_rights: asset.usageRights,
      asset_payload: asset as never,
    });
  }

  for (const job of input.buildPackage.generationJobs) {
    await admin.from("creative_media_generation_jobs").insert({
      organization_id: input.organizationId,
      creative_media_run_id: input.creativeMediaRunId,
      build_package_id: data.id,
      job_id: job.id,
      task_id: job.taskId,
      provider: job.provider,
      model: job.model,
      provider_job_id: job.providerJobId,
      status: job.status,
      estimated_cost: job.estimatedCost,
      actual_cost: job.actualCost,
      job_payload: job as never,
    });
  }

  for (const review of input.buildPackage.qualityReviews) {
    await admin.from("creative_media_quality_reviews").insert({
      organization_id: input.organizationId,
      creative_media_run_id: input.creativeMediaRunId,
      build_package_id: data.id,
      review_id: review.reviewId,
      asset_id: review.assetId,
      outcome: review.outcome,
      findings: review.findings as never,
      gate_scores: review.gateScores as never,
    });
  }

  for (const link of input.buildPackage.traceabilityLinks) {
    await admin.from("creative_media_traceability_links").insert({
      organization_id: input.organizationId,
      creative_media_run_id: input.creativeMediaRunId,
      build_package_id: data.id,
      link_type: link.linkType,
      source_ref: link.sourceRef,
      target_ref: link.targetRef,
    });
  }

  for (const cost of input.buildPackage.costRecords) {
    await admin.from("creative_media_cost_records").insert({
      organization_id: input.organizationId,
      creative_media_run_id: input.creativeMediaRunId,
      build_package_id: data.id,
      record_id: cost.recordId,
      asset_id: cost.assetId,
      task_id: cost.taskId,
      job_id: cost.jobId,
      provider: cost.provider,
      model: cost.model,
      estimated_cost_usd: cost.estimatedCostUsd,
      actual_cost_usd: cost.actualCostUsd,
      usage_source: cost.usageSource,
    });
  }

  for (const artifact of input.buildPackage.productionArtifacts) {
    await admin.from("creative_media_production_artifacts").insert({
      organization_id: input.organizationId,
      creative_media_run_id: input.creativeMediaRunId,
      build_package_id: data.id,
      artifact_id: artifact.artifactId,
      venture_id: artifact.ventureId,
      brief_id: artifact.briefId,
      asset_ids: artifact.assetIds as never,
      status: artifact.status,
      media_type: artifact.mediaType,
      quality_review_id: artifact.qualityReviewId,
      unresolved_high_count: artifact.unresolvedHighCount,
      unresolved_critical_count: artifact.unresolvedCriticalCount,
      artifact_payload: artifact as never,
    });
  }

  return data.id;
}

export function buildCreativeMediaEngineReport(input: {
  results: Array<{ stats: Record<string, number> }>;
}): CreativeMediaEngineReport {
  const totals = input.results.reduce(
    (acc, r) => {
      for (const [k, v] of Object.entries(r.stats)) acc[k] = (acc[k] ?? 0) + v;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    engineVersion: "creative_media_engine_v1",
    venturesProcessed: input.results.length,
    buildPackagesCreated: input.results.length,
    opportunitiesEvaluated: totals.opportunitiesEvaluated ?? 0,
    opportunitiesApproved: totals.opportunitiesApproved ?? 0,
    tasksCreated: totals.tasksCreated ?? 0,
    jobsCompleted: totals.jobsCompleted ?? 0,
    assetsGenerated: totals.assetsGenerated ?? 0,
    productionReady: totals.productionReady ?? 0,
    totalEstimatedCostUsd: 0,
    totalActualCostUsd: 0,
    autonomyBoundary: { publicPublishing: 0, externalDeployments: 0 },
  };
}
