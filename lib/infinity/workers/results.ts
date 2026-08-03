import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ReviewStatus, WorkerResultStatus } from "./constants";
import type { PersistedWorkerResultRef } from "./types";

export async function findCompletedWorkerResultByExecutionKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  executionKey: string,
): Promise<PersistedWorkerResultRef | null> {
  const { data, error } = await admin
    .from("worker_results")
    .select("id, status, review_status, structured_output, execution_key, completed_at")
    .eq("organization_id", organizationId)
    .eq("execution_key", executionKey)
    .eq("status", "completed")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status as WorkerResultStatus,
    reviewStatus: data.review_status as ReviewStatus,
    structuredOutput: data.structured_output,
    executionKey: data.execution_key,
    completedAt: data.completed_at ?? null,
  };
}

/** Reusable durable result for the same execution key (no re-execution). */
export async function findReusableWorkerResultByExecutionKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  executionKey: string,
): Promise<PersistedWorkerResultRef | null> {
  const { data, error } = await admin
    .from("worker_results")
    .select("id, status, review_status, structured_output, execution_key, completed_at")
    .eq("organization_id", organizationId)
    .eq("execution_key", executionKey)
    .in("status", ["completed", "needs_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status as WorkerResultStatus,
    reviewStatus: data.review_status as ReviewStatus,
    structuredOutput: data.structured_output,
    executionKey: data.execution_key,
    completedAt: data.completed_at ?? null,
  };
}

export async function insertWorkerResultRunning(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string | null;
    runtimeInstanceId: string | null;
    planId: string | null;
    planStepId: string | null;
    engineJobId: string;
    workerRunId: string;
    capabilityKey: string;
    capabilityVersion: string;
    executionKey: string;
    inputManifest: Json;
    inputHash: string;
    attemptNumber: number;
    reviewStatus: ReviewStatus;
    policyResults: Json;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("worker_results")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      plan_id: input.planId,
      plan_step_id: input.planStepId,
      engine_job_id: input.engineJobId,
      worker_run_id: input.workerRunId,
      capability_key: input.capabilityKey,
      capability_version: input.capabilityVersion,
      execution_key: input.executionKey,
      status: "running",
      input_manifest: input.inputManifest,
      input_hash: input.inputHash,
      attempt_number: input.attemptNumber,
      review_status: input.reviewStatus,
      policy_results: input.policyResults,
      started_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create worker result: ${error?.message ?? "unknown"}`);
  }

  return data.id;
}

export async function completeWorkerResult(
  admin: AdminSupabaseClient,
  organizationId: string,
  workerResultId: string,
  input: {
    structuredOutput: Json;
    validationResults: Json;
    artifactReferences: Json;
    reviewStatus: ReviewStatus;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("worker_results")
    .update({
      status: input.reviewStatus === "pending" ? "needs_review" : "completed",
      structured_output: input.structuredOutput,
      validation_results: input.validationResults,
      artifact_references: input.artifactReferences,
      review_status: input.reviewStatus,
      completed_at: now,
    })
    .eq("id", workerResultId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to complete worker result: ${error.message}`);
  }
}

export async function blockWorkerResult(
  admin: AdminSupabaseClient,
  organizationId: string,
  workerResultId: string,
  error: Json,
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("worker_results")
    .update({
      status: "blocked",
      error,
      failed_at: now,
    })
    .eq("id", workerResultId)
    .eq("organization_id", organizationId);
}

export async function failWorkerResult(
  admin: AdminSupabaseClient,
  organizationId: string,
  workerResultId: string,
  error: Json,
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("worker_results")
    .update({
      status: "failed",
      error,
      failed_at: now,
    })
    .eq("id", workerResultId)
    .eq("organization_id", organizationId);
}

export async function updateTargetResultReview(
  admin: AdminSupabaseClient,
  organizationId: string,
  targetWorkerResultId: string,
  reviewStatus: ReviewStatus,
  validationResults: Json,
): Promise<void> {
  const { error } = await admin
    .from("worker_results")
    .update({
      review_status: reviewStatus,
      validation_results: validationResults,
      status: reviewStatus === "passed" ? "completed" : "needs_review",
    })
    .eq("id", targetWorkerResultId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to update review status: ${error.message}`);
  }
}

export async function insertBlockedWorkerResult(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string | null;
    engineJobId: string;
    workerRunId: string;
    capabilityKey: string;
    capabilityVersion: string;
    executionKey: string;
    inputHash: string;
    policyResults: Json;
    error: Json;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("worker_results")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      engine_job_id: input.engineJobId,
      worker_run_id: input.workerRunId,
      capability_key: input.capabilityKey,
      capability_version: input.capabilityVersion,
      execution_key: input.executionKey,
      status: "blocked",
      input_hash: input.inputHash,
      input_manifest: {},
      policy_results: input.policyResults,
      error: input.error,
      review_status: "not_required",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist blocked worker result: ${error?.message}`);
  }

  return data.id;
}
