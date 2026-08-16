import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { buildActivityFeed } from "./activity-feed";
import {
  buildCostSummary,
  buildCurrentActivity,
  buildDepartments,
  buildLineage,
  buildProviderSessions,
  resolveNextMissionTarget,
} from "./build-snapshot";
import { loadRawEngineData, loadVentureContext } from "./load-raw-data";
import { enrichOperatorSnapshot } from "./enrich-snapshot";
import { sanitizeOperatorSnapshot } from "./sanitize";
import {
  countCompletedStages,
  deriveActiveDepartments,
  deriveOverallVentureStatus,
} from "./status-derivation";
import { listDepartmentsInLifecycleOrder } from "./department-registry";
import type { DepartmentId, OperatorVentureListItem, OperatorVentureSnapshot } from "./types";

export async function loadOperatorVentureSnapshot(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureAssemblyId: string,
): Promise<OperatorVentureSnapshot | null> {
  const venture = await loadVentureContext(admin, organizationId, ventureAssemblyId);
  if (!venture) return null;

  const raw = await loadRawEngineData(admin, venture);
  const nextMissionTargetDept = resolveNextMissionTarget(raw);
  const departments = buildDepartments(raw, nextMissionTargetDept);
  const activityFeed = buildActivityFeed(raw);
  const currentActivity = buildCurrentActivity(
    departments,
    activityFeed.map((e) => ({ summary: e.summary, timestamp: e.timestamp })),
  );
  const costs = buildCostSummary(raw);
  const providers = buildProviderSessions(raw);
  const lineage = buildLineage(raw);
  const overallStatus = deriveOverallVentureStatus(departments);
  const currentDepartments = deriveActiveDepartments(departments) as DepartmentId[];
  const stageStates = listDepartmentsInLifecycleOrder().map(
    (d) => departments.find((x) => x.id === d.id)?.state ?? "NOT_STARTED",
  );
  const pipelineCounts = countCompletedStages(stageStates);

  const latestDecision = raw.performanceDecisions[0];
  const decisionPayload = latestDecision?.decision_payload as Record<string, unknown> | null;

  const snapshot: OperatorVentureSnapshot = {
    generatedAt: new Date().toISOString(),
    venture,
    overallStatus,
    currentDepartments,
    currentActivity,
    departments,
    pipeline: {
      stagesCompleted: pipelineCounts.completed,
      stagesTotal: pipelineCounts.total,
      stageLabels: listDepartmentsInLifecycleOrder().map((d) => d.label),
    },
    activityFeed,
    providers,
    costs,
    lineage,
    closedLoopRoute: {
      active: Boolean(nextMissionTargetDept && latestDecision),
      fromDepartmentId: latestDecision ? "intelligence_center" : null,
      viaDepartmentId: latestDecision ? "executive_office" : null,
      toDepartmentId: nextMissionTargetDept,
      decisionType: latestDecision ? String(latestDecision.decision_type ?? decisionPayload?.decisionType ?? null) : null,
      missionId: latestDecision?.mission_id ? String(latestDecision.mission_id) : null,
      missionStatus: latestDecision ? String(latestDecision.status ?? null) : null,
    },
    system: {
      engineRuns: {
        organicGrowth: raw.organicGrowthRuns,
        creativeMedia: raw.creativeMediaRuns,
        pab: raw.pabRuns,
        performanceIntelligence: raw.performanceRuns,
        externalActions: raw.externalActions,
      },
      artifacts: {
        production: raw.productionArtifacts,
        pab: raw.pabProductionArtifacts,
        creativeMedia: raw.creativeMediaAssets,
      },
      performance: {
        packages: raw.performancePackages,
        aggregates: raw.performanceAggregates,
        decisions: raw.performanceDecisions,
      },
      learning: {
        decisions: raw.performanceDecisions,
        missions: raw.missions,
      },
    },
  };

  return enrichOperatorSnapshot(sanitizeOperatorSnapshot(snapshot));
}

export async function loadOperatorVentureList(
  admin: AdminSupabaseClient,
  organizationId: string,
  limit = 40,
): Promise<OperatorVentureListItem[]> {
  const { data } = await admin
    .from("venture_assemblies")
    .select("id, mission_id, status, readiness_status, launch_stage, identity_package, manifest, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  const { data: decisions } = await admin
    .from("performance_learning_decisions")
    .select("decision_type, venture_id, created_at, status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => {
    const identity = row.identity_package as Record<string, unknown> | null;
    const manifest = row.manifest as Record<string, unknown> | null;
    const ventureIdentity = manifest?.ventureIdentity as Record<string, unknown> | undefined;
    const latestDecision = (decisions ?? []).find(
      (d) => d.venture_id === row.id || d.venture_id === row.mission_id,
    );
    return {
      ventureAssemblyId: row.id,
      ventureName:
        (typeof identity?.workingName === "string" ? identity.workingName : null) ??
        (typeof ventureIdentity?.workingName === "string" ? ventureIdentity.workingName : null) ??
        row.id.slice(0, 8),
      status: row.status,
      activeDepartment: null,
      latestActivity: latestDecision ? `LearningDecision: ${latestDecision.decision_type}` : row.status,
      latestActivityAt: latestDecision?.created_at ?? row.updated_at,
      launchState: row.launch_stage,
      knownSpendUsd: null,
      latestDecision: latestDecision?.decision_type ?? null,
      missionId: row.mission_id,
    };
  });
}

export { sanitizeOperatorSnapshot } from "./sanitize";
export * from "./types";
export * from "./department-registry";
export * from "./status-derivation";
