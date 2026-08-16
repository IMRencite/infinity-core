import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { OperatorVentureContext } from "./types";

function readJsonString(obj: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val;
  }
  return null;
}

export async function loadVentureContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureAssemblyId: string,
): Promise<OperatorVentureContext | null> {
  const { data } = await admin
    .from("venture_assemblies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", ventureAssemblyId)
    .maybeSingle();

  if (!data) return null;

  const identity = data.identity_package as Record<string, unknown> | null;
  const manifest = data.manifest as Record<string, unknown> | null;
  const ventureIdentity = manifest?.ventureIdentity as Record<string, unknown> | undefined;

  const correlationIds = [
    data.id,
    data.mission_id,
    data.opportunity_id,
    data.company_id,
    data.venture_blueprint_id,
    data.build_id,
    data.production_artifact_id,
    data.plan_execution_id,
  ].filter((v): v is string => Boolean(v));

  return {
    ventureAssemblyId: data.id,
    organizationId: data.organization_id,
    missionId: data.mission_id,
    opportunityId: data.opportunity_id,
    companyId: data.company_id,
    ventureBlueprintId: data.venture_blueprint_id,
    buildId: data.build_id,
    productionArtifactId: data.production_artifact_id,
    ventureName:
      readJsonString(identity, "workingName", "name") ??
      readJsonString(ventureIdentity ?? null, "workingName", "name") ??
      `Venture ${data.id.slice(0, 8)}`,
    ventureType: readJsonString(ventureIdentity ?? null, "ventureType", "type"),
    assemblyStatus: data.status,
    readinessStatus: data.readiness_status,
    launchStage: data.launch_stage,
    correlationIds,
  };
}

export type RawEngineData = {
  opportunity: Record<string, unknown> | null;
  opportunityCandidates: Record<string, unknown>[];
  researchRuns: Record<string, unknown>[];
  aiBrainRuns: Record<string, unknown>[];
  monetizationRuns: Record<string, unknown>[];
  monetizationPlans: Record<string, unknown>[];
  ventureSelectionRuns: Record<string, unknown>[];
  companyBuilderRuns: Record<string, unknown>[];
  companyBuilderBlueprints: Record<string, unknown>[];
  organicGrowthRuns: Record<string, unknown>[];
  organicGrowthPackages: Record<string, unknown>[];
  creativeMediaRuns: Record<string, unknown>[];
  creativeMediaPackages: Record<string, unknown>[];
  creativeMediaJobs: Record<string, unknown>[];
  creativeMediaAssets: Record<string, unknown>[];
  creativeMediaReviews: Record<string, unknown>[];
  pabRuns: Record<string, unknown>[];
  pabTasks: Record<string, unknown>[];
  pabProviderCalls: Record<string, unknown>[];
  pabChangeSets: Record<string, unknown>[];
  pabProductionArtifacts: Record<string, unknown>[];
  productionArtifacts: Record<string, unknown>[];
  externalActions: Record<string, unknown>[];
  launchPlans: Record<string, unknown>[];
  performanceRuns: Record<string, unknown>[];
  performancePackages: Record<string, unknown>[];
  performanceDecisions: Record<string, unknown>[];
  performanceAggregates: Record<string, unknown>[];
  missions: Record<string, unknown>[];
};

const LIMIT = 25;

export async function loadRawEngineData(
  admin: AdminSupabaseClient,
  ctx: OperatorVentureContext,
): Promise<RawEngineData> {
  const orgId = ctx.organizationId;
  const ventureIds = [...new Set(ctx.correlationIds)];

  const [
    opportunityRes,
    opportunityCandidatesRes,
    researchRunsRes,
    aiBrainRes,
    monetizationRunsRes,
    monetizationPlansRes,
    ventureSelectionRes,
    companyBuilderRunsRes,
    companyBlueprintsRes,
    organicRunsRes,
    organicPackagesRes,
    creativeRunsRes,
    creativePackagesRes,
    creativeJobsRes,
    creativeAssetsRes,
    creativeReviewsRes,
    pabRunsRes,
    pabTasksRes,
    pabCallsRes,
    pabChangeSetsRes,
    pabArtifactsRes,
    productionArtifactsRes,
    externalActionsRes,
    launchPlansRes,
    performanceRunsRes,
    performancePackagesRes,
    performanceDecisionsRes,
    performanceAggregatesRes,
    missionsRes,
  ] = await Promise.all([
    ctx.opportunityId
      ? admin.from("opportunities").select("*").eq("organization_id", orgId).eq("id", ctx.opportunityId).maybeSingle()
      : Promise.resolve({ data: null }),
    ctx.opportunityId
      ? admin.from("opportunity_candidates").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT)
      : Promise.resolve({ data: [] }),
    admin.from("research_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("ai_brain_reasoning_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("monetization_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("monetization_plans").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("venture_selection_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("company_builder_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    ctx.ventureBlueprintId
      ? admin.from("company_builder_blueprints").select("*").eq("organization_id", orgId).eq("id", ctx.ventureBlueprintId).limit(LIMIT)
      : admin.from("company_builder_blueprints").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("organic_growth_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("organic_growth_build_packages").select("*").eq("organization_id", orgId).in("venture_id", ventureIds.length ? ventureIds : ["__none__"]).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("creative_media_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("creative_media_build_packages").select("*").eq("organization_id", orgId).in("venture_id", ventureIds.length ? ventureIds : ["__none__"]).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("creative_media_generation_jobs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("creative_media_assets").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("creative_media_quality_reviews").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("product_asset_builder_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("product_asset_coding_tasks").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("product_asset_provider_calls").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("product_asset_code_change_sets").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("product_asset_production_artifacts").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    ctx.productionArtifactId
      ? admin.from("production_artifacts").select("*").eq("organization_id", orgId).eq("id", ctx.productionArtifactId).limit(LIMIT)
      : admin.from("production_artifacts").select("*").eq("organization_id", orgId).eq("venture_assembly_id", ctx.ventureAssemblyId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("external_actions").select("*").eq("organization_id", orgId).or(`venture_assembly_id.eq.${ctx.ventureAssemblyId},mission_id.eq.${ctx.missionId}`).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("launch_plans").select("*").eq("organization_id", orgId).eq("venture_assembly_id", ctx.ventureAssemblyId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("performance_intelligence_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("performance_intelligence_build_packages").select("*").eq("organization_id", orgId).in("venture_id", ventureIds.length ? ventureIds : ["__none__"]).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("performance_learning_decisions").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("performance_metric_aggregates").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("missions").select("*").eq("organization_id", orgId).eq("id", ctx.missionId).limit(5),
  ]);

  const filterByMissionOrVenture = <T extends Record<string, unknown>>(rows: T[]): T[] =>
    rows.filter((row) => {
      const missionId = row.mission_id as string | undefined;
      const ventureId = row.venture_id as string | undefined;
      const oppId = row.opportunity_id as string | undefined;
      const blueprintId = row.company_builder_blueprint_id as string | undefined;
      if (missionId && missionId === ctx.missionId) return true;
      if (ventureId && ventureIds.includes(ventureId)) return true;
      if (oppId && oppId === ctx.opportunityId) return true;
      if (blueprintId && blueprintId === ctx.ventureBlueprintId) return true;
      return false;
    });

  return {
    opportunity: (opportunityRes.data as Record<string, unknown> | null) ?? null,
    opportunityCandidates: (opportunityCandidatesRes.data ?? []) as Record<string, unknown>[],
    researchRuns: filterByMissionOrVenture((researchRunsRes.data ?? []) as Record<string, unknown>[]),
    aiBrainRuns: filterByMissionOrVenture((aiBrainRes.data ?? []) as Record<string, unknown>[]),
    monetizationRuns: (monetizationRunsRes.data ?? []) as Record<string, unknown>[],
    monetizationPlans: (monetizationPlansRes.data ?? []) as Record<string, unknown>[],
    ventureSelectionRuns: (ventureSelectionRes.data ?? []) as Record<string, unknown>[],
    companyBuilderRuns: (companyBuilderRunsRes.data ?? []) as Record<string, unknown>[],
    companyBuilderBlueprints: (companyBlueprintsRes.data ?? []) as Record<string, unknown>[],
    organicGrowthRuns: (organicRunsRes.data ?? []) as Record<string, unknown>[],
    organicGrowthPackages: (organicPackagesRes.data ?? []) as Record<string, unknown>[],
    creativeMediaRuns: (creativeRunsRes.data ?? []) as Record<string, unknown>[],
    creativeMediaPackages: (creativePackagesRes.data ?? []) as Record<string, unknown>[],
    creativeMediaJobs: (creativeJobsRes.data ?? []) as Record<string, unknown>[],
    creativeMediaAssets: (creativeAssetsRes.data ?? []) as Record<string, unknown>[],
    creativeMediaReviews: (creativeReviewsRes.data ?? []) as Record<string, unknown>[],
    pabRuns: filterByMissionOrVenture((pabRunsRes.data ?? []) as Record<string, unknown>[]),
    pabTasks: (pabTasksRes.data ?? []) as Record<string, unknown>[],
    pabProviderCalls: (pabCallsRes.data ?? []) as Record<string, unknown>[],
    pabChangeSets: (pabChangeSetsRes.data ?? []) as Record<string, unknown>[],
    pabProductionArtifacts: (pabArtifactsRes.data ?? []) as Record<string, unknown>[],
    productionArtifacts: (productionArtifactsRes.data ?? []) as Record<string, unknown>[],
    externalActions: (externalActionsRes.data ?? []) as Record<string, unknown>[],
    launchPlans: (launchPlansRes.data ?? []) as Record<string, unknown>[],
    performanceRuns: (performanceRunsRes.data ?? []) as Record<string, unknown>[],
    performancePackages: (performancePackagesRes.data ?? []) as Record<string, unknown>[],
    performanceDecisions: filterByMissionOrVenture((performanceDecisionsRes.data ?? []) as Record<string, unknown>[]),
    performanceAggregates: (performanceAggregatesRes.data ?? []) as Record<string, unknown>[],
    missions: (missionsRes.data ?? []) as Record<string, unknown>[],
  };
}

export function rowTimestamp(row: Record<string, unknown>): string | null {
  for (const key of ["updated_at", "started_at", "created_at", "completed_at", "observed_at"]) {
    const val = row[key];
    if (typeof val === "string" && val) return val;
  }
  return null;
}

export function rowStatus(row: Record<string, unknown>): string | null {
  for (const key of ["status", "execution_status", "readiness_status", "quality_outcome"]) {
    const val = row[key];
    if (typeof val === "string" && val) return val;
  }
  return null;
}

export function parseCostUsd(row: Record<string, unknown>): { amount: number | null; known: boolean } {
  for (const key of ["cumulative_cost_usd", "cost_usd", "total_cost_usd", "amount_usd"]) {
    const val = row[key];
    if (typeof val === "number" && Number.isFinite(val)) return { amount: val, known: true };
    if (typeof val === "string" && val.trim() && !Number.isNaN(Number(val))) return { amount: Number(val), known: true };
  }
  return { amount: null, known: false };
}
