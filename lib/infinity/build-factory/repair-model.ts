import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { DEFAULT_MAX_REPAIR_ATTEMPTS } from "./build-job";
import { BUILD_FACTORY_V2_EVENTS } from "./build-job";
import { emitBuildFactoryEvent } from "./events";
import { updateBuildJobStatus } from "./persistence-v2";

export async function requestBoundedRepair(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    buildJobId: string;
    buildId: string;
    correlationId: string;
    failingLifecycleStage: string;
    failureClassification: string;
    currentAttempt: number;
    maxAttempts?: number;
    permittedCapabilities: string[];
    snapshotReference?: string | null;
  },
): Promise<{ status: "repairing" | "exhausted"; attemptId: string | null }> {
  const max = input.maxAttempts ?? DEFAULT_MAX_REPAIR_ATTEMPTS;
  if (input.currentAttempt >= max) {
    await updateBuildJobStatus(admin, input.organizationId, input.buildJobId, "failed", {
      blocking_reason: "repair_exhausted",
      failed_at: new Date().toISOString(),
    });
    await emitBuildFactoryEvent(admin, {
      organizationId: input.organizationId,
      eventType: BUILD_FACTORY_V2_EVENTS.repairExhausted,
      message: "Repair attempts exhausted",
      correlationId: input.correlationId,
      buildId: input.buildId,
      payload: { build_job_id: input.buildJobId, attempts: input.currentAttempt },
    });
    return { status: "exhausted", attemptId: null };
  }

  const attemptNumber = input.currentAttempt + 1;
  const { data, error } = await admin
    .from("build_repair_attempts")
    .insert({
      organization_id: input.organizationId,
      build_job_id: input.buildJobId,
      build_id: input.buildId,
      attempt_number: attemptNumber,
      failing_lifecycle_stage: input.failingLifecycleStage,
      failure_classification: input.failureClassification,
      permitted_capabilities: input.permittedCapabilities,
      snapshot_reference: input.snapshotReference ?? null,
      status: "requested",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await updateBuildJobStatus(admin, input.organizationId, input.buildJobId, "repairing", {
    repair_attempt_count: attemptNumber,
    lifecycle_stage: "repairing",
  });

  await emitBuildFactoryEvent(admin, {
    organizationId: input.organizationId,
    eventType: BUILD_FACTORY_V2_EVENTS.repairRequested,
    message: "Bounded repair requested",
    correlationId: input.correlationId,
    buildId: input.buildId,
    payload: {
      build_job_id: input.buildJobId,
      attempt_number: attemptNumber,
      stage: input.failingLifecycleStage,
    },
  });

  return { status: "repairing", attemptId: data?.id ? String(data.id) : null };
}
