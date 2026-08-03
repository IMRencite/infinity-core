import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { PENDING_JOB_STATUSES } from "@/lib/infinity/constants";
import { HQ_ROUTES } from "./constants";
import { displayCount } from "./formatters";
import type { HqExecutiveOverview, HqMetricLink } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

async function headCount(
  run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number | null> {
  const { count, error } = await run();
  if (error) {
    return null;
  }
  return count ?? 0;
}

export async function loadExecutiveOverviewMetrics(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqExecutiveOverview> {
  const [
    activeMissions,
    activeRuntimes,
    opportunitiesTotal,
    validationPending,
    validationApproved,
    executivePending,
    enterpriseQueueDepth,
    blueprints,
    blockedRuntimes,
    failedJobs,
    activeWorkers,
    reasoningSessions,
  ] = await Promise.all([
    headCount(() =>
      supabase
        .from("missions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .is("deleted_at", null),
    ),
    headCount(() =>
      supabase
        .from("mission_runtime_instances")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["ready", "running", "waiting", "blocked", "paused"]),
    ),
    headCount(() =>
      supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ),
    headCount(() =>
      supabase
        .from("validation_runs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("run_status", ["pending", "running"]),
    ),
    headCount(() =>
      supabase
        .from("validation_runs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("recommendation", "approved_for_planning"),
    ),
    headCount(() =>
      supabase
        .from("executive_decisions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("decision", ["queue", "defer", "research"]),
    ),
    headCount(() =>
      supabase
        .from("enterprise_queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("entry_status", "queued"),
    ),
    headCount(() =>
      supabase
        .from("venture_blueprints")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ),
    headCount(() =>
      supabase
        .from("mission_runtime_instances")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "blocked"),
    ),
    headCount(() =>
      supabase
        .from("engine_jobs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "failed"),
    ),
    headCount(() =>
      supabase
        .from("worker_runs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "running"),
    ),
    headCount(() =>
      supabase
        .from("reasoning_sessions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ),
  ]);

  const { data: latestEvent } = await supabase
    .from("engine_events")
    .select("event_type, message, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const metrics: HqMetricLink[] = [
    {
      label: "Active missions",
      value: displayCount(activeMissions),
      href: HQ_ROUTES.runtime,
    },
    {
      label: "Active runtimes",
      value: displayCount(activeRuntimes),
      href: HQ_ROUTES.runtime,
    },
    {
      label: "Opportunities",
      value: displayCount(opportunitiesTotal),
      href: HQ_ROUTES.opportunities,
    },
    {
      label: "Awaiting validation",
      value: displayCount(validationPending),
      href: HQ_ROUTES.validation,
    },
    {
      label: "Approved for planning",
      value: displayCount(validationApproved),
      href: HQ_ROUTES.validation,
    },
    {
      label: "Executive queue",
      value: displayCount(executivePending),
      href: HQ_ROUTES.executive,
    },
    {
      label: "Enterprise queue depth",
      value: displayCount(enterpriseQueueDepth),
      href: HQ_ROUTES.executive,
    },
    {
      label: "Venture blueprints",
      value: displayCount(blueprints),
      href: HQ_ROUTES.opportunities,
      hint: "Blueprint only — execution not started",
    },
    {
      label: "Blocked missions",
      value: displayCount(blockedRuntimes),
      href: HQ_ROUTES.runtime,
    },
    {
      label: "Failed jobs",
      value: displayCount(failedJobs),
      href: HQ_ROUTES.runtime,
    },
    {
      label: "Active worker runs",
      value: displayCount(activeWorkers),
      href: HQ_ROUTES.runtime,
    },
    {
      label: "Reasoning sessions",
      value: displayCount(reasoningSessions),
      href: HQ_ROUTES.reasoning,
    },
    {
      label: "Latest system event",
      value: latestEvent?.event_type ?? "No data yet",
      href: HQ_ROUTES.intelligence,
      hint: latestEvent?.message ?? null,
    },
  ];

  return { metrics };
}

export async function countPendingDiscoveryJobs(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .like("capability_key", "discovery.%")
    .in("status", [...PENDING_JOB_STATUSES]);

  if (error) {
    return null;
  }
  return count ?? 0;
}
