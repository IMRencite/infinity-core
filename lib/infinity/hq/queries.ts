import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { calculateAllocationSummary } from "@/lib/infinity/allocation/queries";
import { loadGovernedReasoningMode } from "@/lib/infinity/governed-reasoning/modes";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { loadRecentActivity } from "./activity";
import { buildHqAlerts, applyDashboardFilters } from "./alerts";
import {
  HQ_BLUEPRINT_LIMIT,
  HQ_EXECUTIVE_QUEUE_LIMIT,
  HQ_MISSION_LIMIT,
  HQ_ROUTES,
} from "./constants";
import { parseContextBlockingReason, redactSecrets } from "./formatters";
import { loadSystemHealth } from "./health";
import { loadExecutiveOverviewMetrics } from "./metrics";
import { loadOpportunityPipeline } from "./pipelines";
import type {
  HqBlueprintRow,
  HqDashboardFilters,
  HqDashboardSnapshot,
  HqExecutiveQueueItem,
  HqMissionRow,
  HqPortfolioSummary,
  HqReasoningStatus,
  HqWorkerHealth,
} from "./types";

type InfinitySupabase = SupabaseClient<Database>;

function readRationale(rationale: unknown): string | null {
  if (typeof rationale === "string") {
    return rationale;
  }
  if (Array.isArray(rationale) && rationale.length > 0) {
    return String(rationale[0]);
  }
  if (typeof rationale === "object" && rationale !== null) {
    const summary = (rationale as Record<string, unknown>).summary;
    if (typeof summary === "string") {
      return summary;
    }
  }
  return null;
}

function readBlueprintFields(blueprint: unknown): {
  name: string;
  businessModel: string;
  estimatedTimeline: string | null;
  estimatedBudget: string | null;
  expectedRoi: string | null;
  requiredAssetsCount: number;
  requiredWorkersCount: number;
} {
  if (typeof blueprint !== "object" || blueprint === null || Array.isArray(blueprint)) {
    return {
      name: "Blueprint",
      businessModel: "No data yet",
      estimatedTimeline: null,
      estimatedBudget: null,
      expectedRoi: null,
      requiredAssetsCount: 0,
      requiredWorkersCount: 0,
    };
  }
  const b = blueprint as Record<string, unknown>;
  const assets = b.requiredAssets;
  const workers = b.requiredWorkers;
  return {
    name: typeof b.name === "string" ? b.name : "Blueprint",
    businessModel: typeof b.businessModel === "string" ? b.businessModel : "No data yet",
    estimatedTimeline: typeof b.estimatedTimeline === "string" ? b.estimatedTimeline : null,
    estimatedBudget: typeof b.estimatedBudget === "string" ? b.estimatedBudget : null,
    expectedRoi: typeof b.expectedRoi === "string" ? b.expectedRoi : null,
    requiredAssetsCount: Array.isArray(assets) ? assets.length : 0,
    requiredWorkersCount: Array.isArray(workers) ? workers.length : 0,
  };
}

export type ExecutiveQueueSort =
  | "priority"
  | "oldest"
  | "newest"
  | "blocked"
  | "planning_eligible";

export function sortExecutiveQueue(
  items: HqExecutiveQueueItem[],
  sort: ExecutiveQueueSort,
): HqExecutiveQueueItem[] {
  const copy = [...items];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "newest":
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "blocked":
      return copy.sort((a, b) => {
        const ab = a.queueStatus === "blocked" ? 0 : 1;
        const bb = b.queueStatus === "blocked" ? 0 : 1;
        return ab - bb;
      });
    case "planning_eligible":
      return copy.sort((a, b) => {
        const ap = a.planningEligible ? 0 : 1;
        const bp = b.planningEligible ? 0 : 1;
        return ap - bp;
      });
    case "priority":
    default:
      return copy.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
}

async function countJobsByStatus(
  supabase: InfinitySupabase,
  organizationId: string,
  status: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", status);
  if (error) {
    return null;
  }
  return count ?? 0;
}

export async function loadWorkerHealth(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqWorkerHealth> {
  const [
    queued,
    running,
    completed,
    failed,
    retrying,
    deadLetter,
    activeWorkers,
    { data: latestFailedRun },
    { data: recentRuns },
    { data: capabilities },
  ] = await Promise.all([
    countJobsByStatus(supabase, organizationId, "queued"),
    countJobsByStatus(supabase, organizationId, "running"),
    countJobsByStatus(supabase, organizationId, "completed"),
    countJobsByStatus(supabase, organizationId, "failed"),
    countJobsByStatus(supabase, organizationId, "retrying"),
    countJobsByStatus(supabase, organizationId, "dead_letter"),
    supabase
      .from("worker_runs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "running"),
    supabase
      .from("worker_runs")
      .select("error")
      .eq("organization_id", organizationId)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("worker_runs")
      .select("duration_ms")
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .not("duration_ms", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("capability_registry")
      .select("status, health_status")
      .or(`organization_id.eq.${organizationId},organization_id.is.null`),
  ]);

  let latestWorkerFailure: string | null = null;
  if (latestFailedRun?.error) {
    if (typeof latestFailedRun.error === "object" && latestFailedRun.error !== null) {
      const msg = (latestFailedRun.error as Record<string, unknown>).message;
      latestWorkerFailure = typeof msg === "string" ? redactSecrets(msg) : null;
    }
  }

  const durations = (recentRuns ?? [])
    .map((r) => r.duration_ms)
    .filter((d): d is number => typeof d === "number");
  const averageRecentDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  let idleRegisteredCapabilities: number | null = 0;
  let unavailableCapabilities: number | null = 0;
  if (!capabilities) {
    idleRegisteredCapabilities = null;
    unavailableCapabilities = null;
  } else {
    for (const cap of capabilities) {
      if (cap.health_status === "unavailable" || cap.status === "disabled") {
        unavailableCapabilities += 1;
      } else if (cap.status === "active") {
        idleRegisteredCapabilities += 1;
      }
    }
  }

  return {
    queuedJobs: queued,
    runningJobs: running,
    completedJobs: completed,
    failedJobs: failed,
    retryingJobs: retrying,
    deadLetterJobs: deadLetter,
    activeWorkerRuns: activeWorkers.count ?? null,
    idleRegisteredCapabilities,
    unavailableCapabilities,
    latestWorkerFailure,
    averageRecentDurationMs,
  };
}

export async function loadReasoningStatus(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqReasoningStatus> {
  const mode = loadGovernedReasoningMode();
  const openAi = loadOpenAiReasoningConfig();

  const { data: session } = await supabase
    .from("reasoning_sessions")
    .select(
      "id, status, recommendation, confidence, latency_ms, estimated_cost, usage, error, model, provider, mode, executive_decision_id",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  if (session?.usage && typeof session.usage === "object" && !Array.isArray(session.usage)) {
    const usage = session.usage as Record<string, unknown>;
    if (typeof usage.input_tokens === "number") {
      inputTokens = usage.input_tokens;
    }
    if (typeof usage.output_tokens === "number") {
      outputTokens = usage.output_tokens;
    }
  }

  let failureReason: string | null = null;
  if (session?.error && typeof session.error === "object" && !Array.isArray(session.error)) {
    const msg = (session.error as Record<string, unknown>).message;
    failureReason = typeof msg === "string" ? redactSecrets(msg) : null;
  }

  let executiveReviewStatus = "No data yet";
  if (session?.executive_decision_id) {
    executiveReviewStatus = "Linked to executive decision";
  } else if (session) {
    executiveReviewStatus = "Advisory only — no executive link";
  }

  return {
    mode,
    provider: session?.provider ?? "openai",
    model: session?.model ?? openAi.model,
    latestSessionId: session?.id ?? null,
    sessionStatus: session?.status ?? null,
    recommendation: session?.recommendation ?? null,
    confidence: session?.confidence ?? null,
    latencyMs: session?.latency_ms ?? null,
    inputTokens,
    outputTokens,
    estimatedCost: session?.estimated_cost ?? null,
    executiveReviewStatus,
    failureReason,
  };
}

export async function loadMissionPipeline(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqMissionRow[]> {
  const { data: runtimes, error } = await supabase
    .from("mission_runtime_instances")
    .select(
      `
        id,
        mission_id,
        organization_id,
        status,
        current_stage,
        runtime_version,
        last_advanced_at,
        wake_at,
        context,
        state_version,
        missions (
          title
        )
      `,
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(HQ_MISSION_LIMIT);

  if (error || !runtimes?.length) {
    return [];
  }

  const runtimeIds = runtimes.map((r) => r.id);

  const [{ data: transitions }, { data: checkpoints }] = await Promise.all([
    supabase
      .from("mission_runtime_transitions")
      .select("runtime_instance_id, to_stage, occurred_at")
      .eq("organization_id", organizationId)
      .in("runtime_instance_id", runtimeIds)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("mission_runtime_checkpoints")
      .select("runtime_instance_id, checkpoint_key, created_at")
      .eq("organization_id", organizationId)
      .in("runtime_instance_id", runtimeIds)
      .order("created_at", { ascending: false }),
  ]);

  const latestTransition = new Map<string, string>();
  for (const row of transitions ?? []) {
    if (!latestTransition.has(row.runtime_instance_id)) {
      latestTransition.set(row.runtime_instance_id, row.to_stage ?? "—");
    }
  }

  const latestCheckpoint = new Map<string, string>();
  for (const row of checkpoints ?? []) {
    if (!latestCheckpoint.has(row.runtime_instance_id)) {
      latestCheckpoint.set(row.runtime_instance_id, row.checkpoint_key);
    }
  }

  return runtimes.map((runtime) => {
    const missionJoin = runtime.missions as { title: string } | null;
    return {
      missionId: runtime.mission_id,
      title: missionJoin?.title ?? runtime.mission_id.slice(0, 8),
      organizationId: runtime.organization_id,
      runtimeInstanceId: runtime.id,
      runtimeStatus: runtime.status,
      currentStage: runtime.current_stage,
      lifecycleVersion: runtime.runtime_version,
      lastAdvancedAt: runtime.last_advanced_at,
      wakeAt: runtime.wake_at,
      blockingReason: parseContextBlockingReason(runtime.context),
      stateVersion: runtime.state_version,
      latestTransition: latestTransition.get(runtime.id) ?? null,
      latestCheckpoint: latestCheckpoint.get(runtime.id) ?? null,
      inspectorHref: HQ_ROUTES.missions(runtime.mission_id),
    };
  });
}

export async function loadExecutiveQueue(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqExecutiveQueueItem[]> {
  const { data: queueRows, error } = await supabase
    .from("enterprise_queue_entries")
    .select(
      `
        id,
        queue_priority,
        entry_status,
        planning_eligible,
        created_at,
        opportunity_id,
        opportunities (
          name
        ),
        executive_decisions (
          decision,
          rationale,
          validation_run_id
        )
      `,
    )
    .eq("organization_id", organizationId)
    .order("queue_priority", { ascending: false })
    .limit(HQ_EXECUTIVE_QUEUE_LIMIT);

  if (error || !queueRows?.length) {
    const { data: fallbackDecisions } = await supabase
      .from("executive_decisions")
      .select(
        `
          id,
          opportunity_id,
          decision,
          priority_score,
          planning_eligible,
          rationale,
          validation_run_id,
          created_at,
          opportunities ( name )
        `,
      )
      .eq("organization_id", organizationId)
      .in("decision", ["queue", "defer", "research"])
      .order("priority_score", { ascending: false })
      .limit(HQ_EXECUTIVE_QUEUE_LIMIT);

    if (!fallbackDecisions?.length) {
      return [];
    }

    const oppIds = fallbackDecisions.map((d) => d.opportunity_id);
    const { data: sessions } = await supabase
      .from("reasoning_sessions")
      .select("opportunity_id, recommendation, created_at")
      .eq("organization_id", organizationId)
      .in("opportunity_id", oppIds)
      .order("created_at", { ascending: false });

    const latestReasoning = new Map<string, string>();
    for (const s of sessions ?? []) {
      if (s.opportunity_id && !latestReasoning.has(s.opportunity_id) && s.recommendation) {
        latestReasoning.set(s.opportunity_id, s.recommendation);
      }
    }

    const validationIds = fallbackDecisions
      .map((d) => d.validation_run_id)
      .filter(Boolean);
    const { data: validations } = validationIds.length
      ? await supabase
          .from("validation_runs")
          .select("id, run_status, recommendation")
          .eq("organization_id", organizationId)
          .in("id", validationIds)
      : { data: [] as { id: string; run_status: string; recommendation: string }[] };

    const validationById = new Map((validations ?? []).map((v) => [v.id, v]));

    return fallbackDecisions.map((row) => {
      const opp = row.opportunities as { name: string } | null;
      const validation = validationById.get(row.validation_run_id);
      return {
        id: row.id,
        opportunityId: row.opportunity_id,
        opportunityName: opp?.name ?? row.opportunity_id.slice(0, 8),
        decision: row.decision,
        queueStatus: row.decision,
        priority: row.priority_score,
        rationale: readRationale(row.rationale),
        planningEligible: row.planning_eligible,
        validationStatus: validation?.run_status ?? null,
        reasoningRecommendation: latestReasoning.get(row.opportunity_id) ?? null,
        createdAt: row.created_at,
      };
    });
  }

  const oppIds = queueRows.map((q) => q.opportunity_id);
  const [{ data: sessions }, { data: validations }] = await Promise.all([
    supabase
      .from("reasoning_sessions")
      .select("opportunity_id, recommendation, created_at")
      .eq("organization_id", organizationId)
      .in("opportunity_id", oppIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("validation_runs")
      .select("opportunity_id, run_status, recommendation, created_at")
      .eq("organization_id", organizationId)
      .in("opportunity_id", oppIds)
      .order("created_at", { ascending: false }),
  ]);

  const latestReasoning = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (s.opportunity_id && !latestReasoning.has(s.opportunity_id) && s.recommendation) {
      latestReasoning.set(s.opportunity_id, s.recommendation);
    }
  }

  const latestValidation = new Map<string, string>();
  for (const v of validations ?? []) {
    if (!latestValidation.has(v.opportunity_id)) {
      latestValidation.set(v.opportunity_id, v.run_status);
    }
  }

  return queueRows.map((row) => {
    const opp = row.opportunities as { name: string } | null;
    const decision = row.executive_decisions as {
      decision: string;
      rationale: unknown;
    } | null;
    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      opportunityName: opp?.name ?? row.opportunity_id.slice(0, 8),
      decision: decision?.decision ?? "queue",
      queueStatus: row.entry_status,
      priority: row.queue_priority,
      rationale: readRationale(decision?.rationale),
      planningEligible: row.planning_eligible,
      validationStatus: latestValidation.get(row.opportunity_id) ?? null,
      reasoningRecommendation: latestReasoning.get(row.opportunity_id) ?? null,
      createdAt: row.created_at,
    };
  });
}

export async function loadBlueprintRows(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqBlueprintRow[]> {
  const { data, error } = await supabase
    .from("venture_blueprints")
    .select("id, venture_type, status, opportunity_id, blueprint, created_at, template_key")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(HQ_BLUEPRINT_LIMIT);

  if (error || !data?.length) {
    return [];
  }

  return data.map((row) => {
    const fields = readBlueprintFields(row.blueprint);
    return {
      id: row.id,
      name: fields.name,
      ventureType: row.venture_type,
      businessModel: fields.businessModel,
      opportunityId: row.opportunity_id,
      status: row.status,
      estimatedTimeline: fields.estimatedTimeline,
      estimatedBudget: fields.estimatedBudget,
      expectedRoi: fields.expectedRoi,
      requiredAssetsCount: fields.requiredAssetsCount,
      requiredWorkersCount: fields.requiredWorkersCount,
      createdAt: row.created_at,
    };
  });
}

export async function loadPortfolioSummary(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqPortfolioSummary> {
  let allocationSummary;
  try {
    allocationSummary = await calculateAllocationSummary(supabase, organizationId);
  } catch {
    allocationSummary = null;
  }

  const blueprints = await loadBlueprintRows(supabase, organizationId);
  const budgetParts = blueprints
    .map((b) => b.estimatedBudget)
    .filter((b): b is string => Boolean(b));

  const { data: oppScores } = await supabase
    .from("opportunity_evaluations")
    .select("expected_value_score, overall_score")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(10);

  const roiValues = (oppScores ?? [])
    .map((o) => o.expected_value_score ?? o.overall_score)
    .filter((r): r is number => typeof r === "number");

  return {
    reservedCapital:
      allocationSummary === null
        ? "No data yet"
        : `${allocationSummary.approvedOrReservedCount} approved/reserved proposal(s) · ${allocationSummary.totalAvailableCapacity.toFixed(0)} available pool capacity`,
    approvedAllocation:
      allocationSummary === null
        ? "No data yet"
        : `${allocationSummary.awaitingApprovalCount} awaiting approval · ${allocationSummary.policyBlockedCount} policy blocked`,
    estimatedBlueprintBudgetTotal:
      budgetParts.length > 0 ? budgetParts.join("; ") : "No data yet",
    estimatedOpportunityRoi:
      roiValues.length > 0
        ? `Latest ROI estimates: ${roiValues.slice(0, 3).join(", ")}`
        : "No data yet",
    activeAllocationProposals: allocationSummary?.proposedCount ?? null,
    revenueTracking: "Revenue tracking not implemented.",
  };
}

export async function loadInfinityHqSnapshot(
  supabase: InfinitySupabase,
  organizationId: string,
  organizationName: string,
  filters: HqDashboardFilters = {},
): Promise<HqDashboardSnapshot> {
  const [
    executiveOverview,
    systemHealth,
    opportunityPipeline,
    missions,
    executiveQueue,
    blueprints,
    workerHealth,
    reasoningStatus,
    activity,
    portfolio,
    { data: activeMission },
  ] = await Promise.all([
    loadExecutiveOverviewMetrics(supabase, organizationId),
    loadSystemHealth(supabase, organizationId),
    loadOpportunityPipeline(supabase, organizationId),
    loadMissionPipeline(supabase, organizationId),
    loadExecutiveQueue(supabase, organizationId),
    loadBlueprintRows(supabase, organizationId),
    loadWorkerHealth(supabase, organizationId),
    loadReasoningStatus(supabase, organizationId),
    loadRecentActivity(supabase, organizationId),
    loadPortfolioSummary(supabase, organizationId),
    supabase
      .from("missions")
      .select("title")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const alerts = buildHqAlerts({
    health: systemHealth,
    workerHealth,
    blockedMissionCount: systemHealth.blockedRuntimeCount,
  });

  const snapshot: HqDashboardSnapshot = {
    organizationId,
    organizationName,
    activeMissionTitle: activeMission?.title ?? null,
    executiveOverview,
    systemHealth,
    opportunityPipeline,
    missions,
    executiveQueue,
    blueprints,
    workerHealth,
    reasoningStatus,
    activity,
    alerts,
    portfolio,
    generatedAt: new Date().toISOString(),
  };

  return applyDashboardFilters(snapshot, filters);
}
