import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { BUILD_INTERNAL_LABEL } from "./constants";
import { loadBuildJobByBuildId } from "./persistence-v2";
import type { GenericBuildJob } from "./build-job";

export type BuildJobRuntimeDiagnostics = {
  buildJobId: string;
  buildId: string | null;
  builderKey: string;
  builderVersion: string;
  projectType: string;
  lifecycleStage: string | null;
  status: string;
  workspaceId: string;
  repairAttempts: number;
  genericQaStatus: string;
  productQaStatus: string;
  reproducibilityStatus: string | null;
  rollbackMode: string | null;
  blockingReason: string | null;
  label: string;
};

export async function loadBuildJobRuntimeDiagnostics(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<BuildJobRuntimeDiagnostics | null> {
  const job: GenericBuildJob | null = await loadBuildJobByBuildId(admin, organizationId, buildId);
  if (!job) {
    return null;
  }

  return {
    buildJobId: job.id,
    buildId: job.buildId,
    builderKey: job.builderKey,
    builderVersion: job.builderVersion,
    projectType: job.projectType,
    lifecycleStage: job.lifecycleStage,
    status: job.status,
    workspaceId: job.workspaceId,
    repairAttempts: job.repairAttemptCount,
    genericQaStatus: job.genericQaStatus,
    productQaStatus: job.productQaStatus,
    reproducibilityStatus: job.reproducibilityStatus,
    rollbackMode: job.rollbackMode,
    blockingReason: job.blockingReason,
    label: BUILD_INTERNAL_LABEL,
  };
}
