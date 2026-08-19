import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { HqWorkArtifact } from "./types";
import type { ArtifactDetailPayload } from "./build-inspector-model";

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export async function loadExtendedArtifactDetail(
  admin: AdminSupabaseClient,
  organizationId: string,
  artifact: HqWorkArtifact,
  payload: ArtifactDetailPayload,
): Promise<ArtifactDetailPayload> {
  const id = artifact.sourceRecordId;
  const type = artifact.artifactType;

  if (type === "production_artifact" || type === "code_change" || type === "company_blueprint") {
    const [prodRes, changeRes, blueprintRes, taskRes] = await Promise.all([
      type === "production_artifact" || artifact.metadata.productionArtifactId
        ? admin
            .from("production_artifacts")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("id", type === "production_artifact" ? id : String(artifact.metadata.productionArtifactId ?? id))
            .maybeSingle()
        : Promise.resolve({ data: null }),
      type === "code_change"
        ? admin
            .from("product_asset_code_change_sets")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("id", id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      type === "company_blueprint"
        ? admin
            .from("company_builder_blueprints")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("id", id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("product_asset_coding_tasks")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", str(artifact.metadata.taskId) ?? "__none__")
        .maybeSingle(),
    ]);

    const prod = prodRes.data as Record<string, unknown> | null;
    const change = changeRes.data as Record<string, unknown> | null;
    const blueprint = blueprintRes.data as Record<string, unknown> | null;
    const task = taskRes.data as Record<string, unknown> | null;

    payload.build = {
      artifactKind: type,
      status:
        str(prod?.vercel_readiness_status) ??
        (change?.validation_passed === true
          ? "VALIDATED"
          : change?.validation_passed === false
            ? "FAILED"
            : str(blueprint?.status)) ??
        artifact.state,
      provider: str(task?.provider ?? artifact.metadata.provider),
      model: str(task?.model_id ?? task?.model ?? artifact.metadata.model),
      taskTitle: str(task?.title ?? task?.task_name ?? artifact.title),
      qualityGate: str(prod?.vercel_readiness_status ?? artifact.metadata.qualityGate),
      reviewResult: str(change?.reasoning_summary ?? artifact.metadata.reviewResult),
      fileCount: num(prod?.file_count ?? artifact.metadata.fileCount),
      contentHash: str(prod?.content_hash),
      vercelReadiness: str(prod?.vercel_readiness_status),
      knownCostUsd: num(task?.total_cost_usd ?? task?.build_cost_usd),
      costKnown: task?.total_cost_usd != null || task?.build_cost_usd != null,
      workspaceMutation: str(change?.reasoning_summary),
      mvpScope: str(blueprint?.summary ?? blueprint?.title),
      implementationResult: str(prod?.output_summary ?? change?.reasoning_summary),
    };
  }

  if (type === "creative_asset" || type === "content_artifact") {
    const [assetRes, reviewRes, jobRes] = await Promise.all([
      type === "creative_asset"
        ? admin.from("creative_media_assets").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("creative_media_quality_reviews")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("asset_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("creative_media_generation_jobs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", str(artifact.metadata.jobId) ?? "__none__")
        .maybeSingle(),
    ]);

    const asset = assetRes.data as Record<string, unknown> | null;
    const review = reviewRes.data as Record<string, unknown> | null;
    const job = jobRes.data as Record<string, unknown> | null;

    payload.creative = {
      purpose: str(asset?.purpose ?? artifact.metadata.purpose ?? artifact.title),
      channel: str(asset?.channel ?? artifact.metadata.channel),
      provider: str(job?.provider ?? asset?.provider ?? artifact.metadata.provider),
      model: str(job?.model ?? artifact.metadata.model),
      qualityState: str(review?.review_status ?? asset?.quality_status ?? artifact.metadata.qualityState),
      reviewSummary: str(review?.summary),
      dimensions: str(asset?.dimensions),
      provenance: str(asset?.provenance_summary),
      previewUrl: null,
      knownCostUsd: num(job?.cost_usd),
      costKnown: job?.cost_usd != null,
    };
  }

  if (type === "content_artifact") {
    const pkgRes = await admin
      .from("organic_growth_build_packages")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    const pkg = pkgRes.data as Record<string, unknown> | null;

    payload.growth = {
      channel: str(pkg?.primary_channel ?? artifact.metadata.channel),
      audience: str(pkg?.target_audience ?? artifact.metadata.audience),
      contentIntent: str(pkg?.content_intent ?? artifact.title),
      distributionStatus: str(pkg?.distribution_status ?? artifact.metadata.distributionStatus),
      published: pkg?.published === true,
      generated: pkg != null,
      provider: str(pkg?.provider ?? artifact.metadata.provider),
      model: str(pkg?.model ?? artifact.metadata.model),
      knownCostUsd: num(pkg?.total_cost_usd),
      costKnown: pkg?.total_cost_usd != null,
    };
  }

  if (type === "deployment") {
    const { data: actionRaw } = await admin
      .from("external_actions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    const action = actionRaw as Record<string, unknown> | null;

    payload.deployment = {
      target: str(action?.target ?? artifact.metadata.target),
      authorityState: str(action?.approval_status ?? artifact.metadata.authorityState),
      reversibility: str(action?.reversibility_class ?? artifact.metadata.reversibility),
      actionType: str(action?.action_type ?? artifact.metadata.actionType),
      endpoint: str(action?.verified_url ?? artifact.metadata.endpoint),
      deploymentStatus: str(action?.execution_status ?? artifact.state),
      launchStatus: str(action?.launch_stage ?? artifact.metadata.launchStatus),
      blockingReason: str(action?.blocking_reason ?? artifact.metadata.blockingReason),
      productionReady: action?.production_artifact_id != null,
      deployed: action?.execution_status === "SUCCEEDED" || action?.execution_status === "COMPLETE",
      publiclyLaunched: Boolean(action?.verified_url),
      knownCostUsd: num(action?.estimated_cost),
      costKnown: action?.estimated_cost != null,
    };
  }

  if (type === "performance_signal" || type === "learning_decision") {
    const [obsRes, decisionRes, aggRes] = await Promise.all([
      type === "performance_signal"
        ? admin.from("performance_observations").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle()
        : Promise.resolve({ data: null }),
      type === "learning_decision"
        ? admin.from("performance_learning_decisions").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("performance_metric_aggregates")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", str(artifact.metadata.aggregateId) ?? "__none__")
        .maybeSingle(),
    ]);

    const obs = obsRes.data as Record<string, unknown> | null;
    const decision = decisionRes.data as Record<string, unknown> | null;
    const agg = aggRes.data as Record<string, unknown> | null;

    payload.performance = {
      metricName: str(obs?.metric_name ?? agg?.metric_name ?? artifact.title),
      actualValue: str(obs?.observed_value ?? agg?.value),
      measurementPeriod: str(obs?.measurement_period ?? agg?.period_label),
      isActual: obs?.value_type === "ACTUAL" || agg?.value_type === "ACTUAL",
      isEstimate: obs?.value_type === "ESTIMATE" || agg?.value_type === "ESTIMATE",
      technicalDiagnosis: str(decision?.technical_diagnosis ?? obs?.technical_interpretation),
      marketDiagnosis: str(decision?.market_diagnosis ?? obs?.market_interpretation),
      recommendation: str(decision?.recommended_action ?? decision?.decision_summary),
      confidence: num(decision?.confidence_score),
      learningDecision: str(decision?.decision_type ?? artifact.metadata.decision),
      nextMission: str(decision?.next_mission_id ?? artifact.metadata.nextMissionId),
      executionSuccess: str(obs?.execution_success ?? artifact.metadata.executionSuccess),
    };
  }

  if (type === "mission") {
    const { data: missionRaw } = await admin
      .from("missions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    const mission = missionRaw as Record<string, unknown> | null;

    payload.mission = {
      objective: str(mission?.objective ?? mission?.title ?? artifact.title),
      currentStage: str(mission?.status ?? artifact.state),
      cycleKey: str(mission?.cycle_key ?? artifact.metadata.cycleKey),
      terminalReason: str(mission?.terminal_reason ?? artifact.metadata.terminalReason),
      nextDecision: str(mission?.next_decision ?? artifact.metadata.nextDecision),
      nextMissionId: str(mission?.next_mission_id ?? artifact.metadata.nextMissionId),
      knownSpendUsd: num(mission?.budget_usd),
      spendKnown: mission?.budget_usd != null,
    };
  }

  return payload;
}