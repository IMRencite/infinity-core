import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { markBuildInternallyComplete, updateBuildStatus } from "./lifecycle";
import { loadBuildById } from "./workspace";
import { verifyAiWebsiteBuildReproducibility } from "@/lib/infinity/ai-website-generation/reproducibility";
import { emitBuildFactoryEvent } from "./events";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";

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
    const full = await loadBuildById(
      supabase as unknown as AdminSupabaseClient,
      organizationId,
      build.id,
    );
    if (full?.specification.aiWebsiteGeneration?.enabled) {
      const repro = await verifyAiWebsiteBuildReproducibility(
        supabase as unknown as AdminSupabaseClient,
        full,
      );
      if (repro.status === "mismatched") {
        await updateBuildStatus(
          supabase as unknown as AdminSupabaseClient,
          organizationId,
          build.id,
          "blocked",
          { error: { reproducibility_mismatch: repro.issues } },
        );
        await emitBuildFactoryEvent(supabase as unknown as AdminSupabaseClient, {
          organizationId,
          eventType: "build.reproducibility_mismatch",
          message: "Build blocked — reproducibility mismatch",
          correlationId: build.correlation_id ?? crypto.randomUUID(),
          buildId: build.id,
          payload: { issues: repro.issues },
        });
        continue;
      }
    }
    await markBuildInternallyComplete(
      supabase,
      organizationId,
      build.id,
      undefined,
    );
    if (build.correlation_id) {
      const adminClient = supabase as unknown as AdminSupabaseClient;
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
