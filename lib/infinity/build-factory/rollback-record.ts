import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { RollbackMode } from "./build-job";

export async function recordBuildRollback(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    buildJobId: string;
    buildId: string;
    snapshotId: string;
    rollbackMode: RollbackMode;
  },
): Promise<RollbackMode> {
  await admin.from("build_rollbacks").insert({
    organization_id: input.organizationId,
    build_job_id: input.buildJobId,
    build_id: input.buildId,
    snapshot_id: input.snapshotId,
    rollback_mode: input.rollbackMode,
    status: "completed",
    audit: { internal_only: true, byte_perfect: input.rollbackMode === "byte_perfect" },
  });

  await admin
    .from("build_jobs")
    .update({ rollback_mode: input.rollbackMode })
    .eq("id", input.buildJobId)
    .eq("organization_id", input.organizationId);

  return input.rollbackMode;
}
