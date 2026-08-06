import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { updateBuildJobStatus } from "./persistence-v2";
import { BUILD_FACTORY_V2_EVENTS } from "./build-job";
import { emitBuildFactoryEvent } from "./events";
import { loadBuildJobByBuildId } from "./persistence-v2";

/**
 * Observes v2 BuildJob completion after v1 build + QA — does not advance Mission Runtime.
 */
export async function observeBuildFactoryJobs(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<number> {
  const { data: builds } = await admin
    .from("builds")
    .select("id, status, review_status, correlation_id")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("status", "internally_complete");

  if (!builds?.length) {
    return 0;
  }

  let updated = 0;
  for (const build of builds) {
    const job = await loadBuildJobByBuildId(admin, organizationId, build.id);
    if (!job || job.status === "internally_complete") {
      continue;
    }
    if (job.genericQaStatus !== "passed" || job.productQaStatus !== "passed") {
      continue;
    }
    if (job.reproducibilityStatus === "mismatch" || job.reproducibilityStatus === "mismatched") {
      continue;
    }

    await updateBuildJobStatus(admin, organizationId, job.id, "internally_complete", {
      lifecycle_stage: "internally_complete",
      completed_at: new Date().toISOString(),
    });

    const correlationId = build.correlation_id ?? job.correlationId ?? crypto.randomUUID();
    await emitBuildFactoryEvent(admin, {
      organizationId,
      eventType: BUILD_FACTORY_V2_EVENTS.internallyCompleted,
      message: "BuildJob internally complete — not deployed or published",
      correlationId,
      buildId: build.id,
      payload: { build_job_id: job.id, builder_key: job.builderKey },
    });
    updated += 1;
  }

  return updated;
}
