import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { EngineJob, WorkerRun } from "@/lib/infinity/runtime/types";
import type { WorkerExecutionResult } from "@/lib/infinity/runtime/types";
import { getWorkerCapabilityContract } from "./capability";
import { buildWorkerExecutionContext } from "./execution-context";
import { dispatchWorkerHandler } from "./handlers/safe-v1-handlers";
import { initialReviewStatusForCapability } from "./lifecycle";
import { evaluateWorkerPolicyGates } from "./policy";
import { resolveRegisteredCapabilityVersion } from "./registry";
import { persistInternalWorkerArtifact } from "./artifacts";
import { emitWorkerCapabilityEvent } from "./events";
import { validateStructuredOutput } from "./validation";
import {
  completeWorkerResult,
  findReusableWorkerResultByExecutionKey,
  insertBlockedWorkerResult,
  insertWorkerResultRunning,
  updateTargetResultReview,
} from "./results";
import {
  returnIdempotentWorkerResultIfReusable,
} from "./idempotent-reuse";
import { createPermissionEnforcer } from "./permissions";

export type GovernedDispatchInput = {
  job: EngineJob;
  workerRun: WorkerRun;
};

export async function dispatchGovernedWorkerJob(
  admin: AdminSupabaseClient,
  input: GovernedDispatchInput,
): Promise<WorkerExecutionResult> {
  const { job, workerRun } = input;
  const contract = getWorkerCapabilityContract(job.capability_key);
  if (!contract) {
    throw new Error(`Capability ${job.capability_key} is not a governed worker capability`);
  }

  const capabilityVersion = resolveRegisteredCapabilityVersion(
    job.capability_key,
    job.resolved_version,
  );

  const context = await buildWorkerExecutionContext(
    admin,
    job,
    workerRun,
    capabilityVersion,
  );

  const reusable = await findReusableWorkerResultByExecutionKey(
    admin,
    job.organization_id,
    context.executionKey,
  );

  if (reusable) {
    const reused = await returnIdempotentWorkerResultIfReusable(admin, {
      job,
      workerRun,
      existing: reusable,
      capabilityVersion,
      executionKey: context.executionKey,
    });
    if (reused) {
      return reused;
    }
  }

  await emitWorkerCapabilityEvent(admin, {
    organizationId: job.organization_id,
    eventType: "worker.execution_requested",
    message: `Governed worker execution requested for ${job.capability_key}`,
    correlationId: job.correlation_id,
    payload: {
      mission_id: job.mission_id,
      runtime_instance_id: context.runtimeInstanceId,
      plan_id: job.plan_id,
      plan_step_id: job.plan_step_id,
      engine_job_id: job.id,
      worker_run_id: workerRun.id,
      capability_key: job.capability_key,
      capability_version: capabilityVersion,
      execution_key: context.executionKey,
      attempt: workerRun.attempt_number,
    },
  });

  const gate = await evaluateWorkerPolicyGates(admin, job);
  if (!gate.allowed) {
    const blockedId = await insertBlockedWorkerResult(admin, {
      organizationId: job.organization_id,
      missionId: job.mission_id,
      engineJobId: job.id,
      workerRunId: workerRun.id,
      capabilityKey: job.capability_key,
      capabilityVersion,
      executionKey: context.executionKey,
      inputHash: context.executionKey.split(":").at(-1) ?? "",
      policyResults: { gate: gate.classification, reason: gate.reason },
      error: { classification: gate.classification, message: gate.reason },
    });

    await emitWorkerCapabilityEvent(admin, {
      organizationId: job.organization_id,
      eventType: "worker.execution_blocked",
      message: gate.reason,
      correlationId: job.correlation_id,
      severity: "warning",
      payload: {
        worker_result_id: blockedId,
        policy_outcome: gate.classification,
        engine_job_id: job.id,
      },
    });

    throw new Error(`Worker execution blocked: ${gate.reason}`);
  }

  const reviewStatus = initialReviewStatusForCapability(job.capability_key);
  const workerResultId = await insertWorkerResultRunning(admin, {
    organizationId: job.organization_id,
    missionId: job.mission_id,
    runtimeInstanceId: context.runtimeInstanceId,
    planId: job.plan_id,
    planStepId: job.plan_step_id,
    engineJobId: job.id,
    workerRunId: workerRun.id,
    capabilityKey: job.capability_key,
    capabilityVersion,
    executionKey: context.executionKey,
    inputManifest: job.payload,
    inputHash: context.executionKey.split(":").pop() ?? "",
    attemptNumber: workerRun.attempt_number,
    reviewStatus,
    policyResults: { allowed: true },
  });

  await emitWorkerCapabilityEvent(admin, {
    organizationId: job.organization_id,
    eventType: "worker.execution_started",
    message: `Worker execution started for ${job.capability_key}`,
    correlationId: job.correlation_id,
    payload: {
      worker_result_id: workerResultId,
      engine_job_id: job.id,
      worker_run_id: workerRun.id,
      attempt: workerRun.attempt_number,
    },
  });

  const permissions = createPermissionEnforcer(context);
  permissions.require("event.emit");

  const handlerResult = await dispatchWorkerHandler(admin, context);

  const validation = validateStructuredOutput(contract, handlerResult.structuredOutput);
  if (!validation.valid) {
    await emitWorkerCapabilityEvent(admin, {
      organizationId: job.organization_id,
      eventType: "worker.output_rejected",
      message: validation.errors.join("; "),
      correlationId: job.correlation_id,
      severity: "error",
      payload: { worker_result_id: workerResultId, errors: validation.errors },
    });
    throw new Error(`Output schema validation failed: ${validation.errors.join("; ")}`);
  }

  await emitWorkerCapabilityEvent(admin, {
    organizationId: job.organization_id,
    eventType: "worker.output_validated",
    message: "Structured output validated",
    correlationId: job.correlation_id,
    payload: { worker_result_id: workerResultId },
  });

  const artifactIds: string[] = [];
  if (handlerResult.artifactType && handlerResult.artifactPayload) {
    permissions.require("internal_artifact.write");
    const artifactId = await persistInternalWorkerArtifact(admin, {
      organizationId: job.organization_id,
      missionId: job.mission_id,
      workerResultId,
      artifactType: handlerResult.artifactType,
      schemaVersion: contract.version,
      capabilityKey: job.capability_key,
      capabilityVersion,
      payload: handlerResult.artifactPayload,
      provenance: {
        engine_job_id: job.id,
        worker_run_id: workerRun.id,
        plan_step_id: job.plan_step_id,
      },
    });
    artifactIds.push(artifactId);
    await emitWorkerCapabilityEvent(admin, {
      organizationId: job.organization_id,
      eventType: "worker.artifact_created",
      message: `Internal artifact ${handlerResult.artifactType} created`,
      correlationId: job.correlation_id,
      payload: {
        worker_result_id: workerResultId,
        worker_artifact_id: artifactId,
        artifact_type: handlerResult.artifactType,
      },
    });
  }

  if (job.capability_key === "qa.verify_plan_step_output") {
    const verdict = String(handlerResult.structuredOutput.verdict ?? "fail");
    const targetId = String(
      (handlerResult.artifactPayload?.reviewed_worker_result_id as string | undefined) ??
        (handlerResult.metrics?.reviewed_worker_result_id as string | undefined) ??
        "",
    );
    if (targetId) {
      const mappedReview =
        verdict === "pass" ? "passed" : verdict === "needs_review" ? "needs_human_review" : "failed";
      await updateTargetResultReview(admin, job.organization_id, targetId, mappedReview, {
        qa_worker_result_id: workerResultId,
        verdict,
      });
      await emitWorkerCapabilityEvent(admin, {
        organizationId: job.organization_id,
        eventType: "worker.review_completed",
        message: `QA review ${verdict} for worker result ${targetId}`,
        correlationId: job.correlation_id,
        payload: {
          worker_result_id: workerResultId,
          reviewed_worker_result_id: targetId,
          verdict,
        },
      });
    }
  } else if (reviewStatus === "pending") {
    await emitWorkerCapabilityEvent(admin, {
      organizationId: job.organization_id,
      eventType: "worker.review_requested",
      message: "Independent QA review required before plan step completion",
      correlationId: job.correlation_id,
      payload: { worker_result_id: workerResultId },
    });
  }

  await completeWorkerResult(admin, job.organization_id, workerResultId, {
    structuredOutput: handlerResult.structuredOutput as Json,
    validationResults: { schema: "ok" },
    artifactReferences: artifactIds,
    reviewStatus,
  });

  await emitWorkerCapabilityEvent(admin, {
    organizationId: job.organization_id,
    eventType: "worker.result_created",
    message: "Worker result persisted",
    correlationId: job.correlation_id,
    payload: { worker_result_id: workerResultId },
  });

  await emitWorkerCapabilityEvent(admin, {
    organizationId: job.organization_id,
    eventType: "worker.execution_completed",
    message: `Worker ${job.capability_key} completed`,
    correlationId: job.correlation_id,
    payload: {
      worker_result_id: workerResultId,
      engine_job_id: job.id,
      worker_run_id: workerRun.id,
      review_status: reviewStatus,
    },
  });

  return {
    output: {
      worker_result_id: workerResultId,
      review_status: reviewStatus,
      ...handlerResult.structuredOutput,
    } as Json,
    metrics: (handlerResult.metrics ?? {}) as Json,
  };
}

export function shouldMarkGovernedPlanStepComplete(output: Json): boolean {
  if (typeof output !== "object" || output === null || Array.isArray(output)) {
    return false;
  }
  const review = (output as Record<string, unknown>).review_status;
  if (review === "pending") {
    return false;
  }
  if (review === "not_required" || review === "passed") {
    return true;
  }
  return false;
}
