import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { markBuildInternallyComplete } from "./lifecycle";

type InfinitySupabase = SupabaseClient<Database>;

/**
 * Mission Runtime observation: marks builds internally_complete after independent QA passes.
 * Does not advance runtime stage directly.
 */
export async function observeBuildFactoryBuilds(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<number> {
  const { data: builds } = await supabase
    .from("builds")
    .select("id, status, review_status, correlation_id")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("review_status", "passed")
    .in("status", ["review_pending", "validating", "scaffolding", "manifest_ready"]);

  if (!builds?.length) {
    return 0;
  }

  let updated = 0;
  for (const build of builds) {
    if (build.status === "internally_complete") {
      continue;
    }
    await markBuildInternallyComplete(
      supabase,
      organizationId,
      build.id,
      undefined,
    );
    if (build.correlation_id) {
      const { emitBuildFactoryEvent } = await import("./events");
      const adminClient = supabase as unknown as import("@/lib/supabase/admin").AdminSupabaseClient;
      await emitBuildFactoryEvent(adminClient, {
        organizationId,
        eventType: "build.internally_completed",
        message: "Internal build complete — not deployed or published",
        correlationId: build.correlation_id,
        buildId: build.id,
      }).catch(() => undefined);
    }
    updated += 1;
  }

  return updated;
}
