import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadGovernedReasoningMode } from "@/lib/infinity/governed-reasoning/modes";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { PENDING_JOB_STATUSES } from "@/lib/infinity/constants";
import type { HealthStatus } from "./constants";
import type { HqSystemHealth } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function loadSystemHealth(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqSystemHealth> {
  const mode = loadGovernedReasoningMode();
  const openAi = loadOpenAiReasoningConfig();
  const aiConfigured: HealthStatus = openAi.apiKey ? "healthy" : "not_configured";

  const [
    { count: failedJobs },
    { count: retryJobs },
    { count: blockedRuntimes },
    { count: lockedRuntimes },
    { count: pendingJobs },
  ] = await Promise.all([
    supabase
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "failed"),
    supabase
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["retrying", "queued"])
      .gt("attempt_count", 0),
    supabase
      .from("mission_runtime_instances")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "blocked"),
    supabase
      .from("mission_runtime_instances")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .not("locked_by", "is", null),
    supabase
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", [...PENDING_JOB_STATUSES]),
  ]);

  let supabaseStatus: HealthStatus = "healthy";
  const probe = await supabase.from("organizations").select("id").eq("id", organizationId).maybeSingle();
  if (probe.error) {
    supabaseStatus = "offline";
  }

  let missionRuntime: HealthStatus = "healthy";
  if ((blockedRuntimes ?? 0) > 0) {
    missionRuntime = "blocked";
  } else if ((lockedRuntimes ?? 0) > 0) {
    missionRuntime = "degraded";
  }

  let queueHealth: HealthStatus = "healthy";
  if ((failedJobs ?? 0) > 0) {
    queueHealth = "degraded";
  }
  if ((pendingJobs ?? 0) > 50) {
    queueHealth = "degraded";
  }

  const { data: tickEvents } = await supabase
    .from("engine_events")
    .select("event_type, created_at")
    .eq("organization_id", organizationId)
    .like("event_type", "mission.runtime_%")
    .order("created_at", { ascending: false })
    .limit(20);

  const lastSuccess =
    tickEvents?.find((e) => e.event_type.includes("advanced") || e.event_type.includes("completed"))
      ?.created_at ?? null;
  const lastFailed =
    tickEvents?.find((e) => e.event_type.includes("failed") || e.event_type.includes("blocked"))
      ?.created_at ?? null;

  return {
    supabase: supabaseStatus,
    missionRuntime,
    aiProviderMode: mode,
    aiProviderConfigured: aiConfigured,
    aiModel: openAi.model,
    queueHealth,
    failedJobCount: failedJobs ?? null,
    retryingJobCount: retryJobs ?? null,
    blockedRuntimeCount: blockedRuntimes ?? null,
    lockedRuntimeCount: lockedRuntimes ?? null,
    lastSuccessfulTickAt: lastSuccess,
    lastFailedTickAt: lastFailed,
  };
}
