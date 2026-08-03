import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { HQ_ACTIVITY_LIMIT } from "./constants";
import { redactSecrets } from "./formatters";
import type { HqActivityItem } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function loadRecentActivity(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = HQ_ACTIVITY_LIMIT,
): Promise<HqActivityItem[]> {
  const { data, error } = await supabase
    .from("engine_events")
    .select("id, event_type, severity, message, payload, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const payload =
      typeof row.payload === "object" && row.payload !== null && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      occurredAt: row.created_at,
      eventType: row.event_type,
      severity: row.severity,
      message: redactSecrets(row.message),
      missionId: typeof payload.mission_id === "string" ? payload.mission_id : null,
      opportunityId: typeof payload.opportunity_id === "string" ? payload.opportunity_id : null,
      runtimeInstanceId:
        typeof payload.runtime_instance_id === "string" ? payload.runtime_instance_id : null,
      engineJobId: typeof payload.engine_job_id === "string" ? payload.engine_job_id : null,
    };
  });
}
