import type { Json } from "@/lib/supabase/database.types";
import { DISCOVERY_CAPABILITY_KEY, DISCOVERY_ENGINE_NAME } from "../../constants";
import { emitRuntimeEngineEvent } from "../persistence";
import type {
  WorkerDefinition,
  WorkerExecutionContext,
  WorkerExecutionResult,
} from "../types";

export class WorkerTimeoutError extends Error {
  constructor(message = "Worker execution timed out") {
    super(message);
    this.name = "WorkerTimeoutError";
  }
}

export const discoveryScanWorker: WorkerDefinition = {
  capabilityKey: DISCOVERY_CAPABILITY_KEY,
  engineName: DISCOVERY_ENGINE_NAME,
  workerName: "discovery_scan",
  version: "1.0.0",
  implementationKey: "discovery.scan.v1",
  timeoutSeconds: 120,
  classifyFailure(error) {
    if (error instanceof WorkerTimeoutError) {
      return "timeout";
    }

    if (error instanceof Error && /validation/i.test(error.message)) {
      return "non_retryable";
    }

    return "retryable";
  },
  async execute(
    input: Json,
    context: WorkerExecutionContext,
  ): Promise<WorkerExecutionResult> {
    const scanType =
      typeof input === "object" &&
      input !== null &&
      !Array.isArray(input) &&
      "scan_type" in input
        ? String((input as Record<string, Json>).scan_type)
        : "broad_market";

    const startedAt = new Date().toISOString();

    const { data: scan, error: insertError } = await context.admin
      .from("opportunity_scans")
      .insert({
        organization_id: context.organizationId,
        status: "running",
        scan_type: scanType,
        objective:
          "Durable Worker Runtime v1 deterministic discovery scan (no external sources)",
        search_scope: {
          mode: "stub",
          runtime: "durable_worker_runtime_v1",
        },
        constraints: input,
        started_at: startedAt,
        opportunities_discovered: 0,
        metadata: {
          engine_job_id: context.engineJobId,
          worker_run_id: context.workerRunId,
          correlation_id: context.correlationId,
          deterministic: true,
          runtime: "durable_worker_runtime_v1",
        },
      })
      .select("id")
      .single();

    if (insertError || !scan) {
      throw new Error(
        `Failed to create opportunity scan: ${insertError?.message ?? "unknown error"}`,
      );
    }

    await emitRuntimeEngineEvent(context.admin, {
      organizationId: context.organizationId,
      engineName: DISCOVERY_ENGINE_NAME,
      eventType: "discovery.scan_started",
      entityType: "opportunity_scan",
      entityId: scan.id,
      message: "Discovery scan started (durable worker runtime v1)",
      correlationId: context.correlationId,
      payload: {
        engine_job_id: context.engineJobId,
        worker_run_id: context.workerRunId,
        scan_type: scanType,
        runtime: "durable_worker_runtime_v1",
      },
    });

    const completedAt = new Date().toISOString();

    const { error: completeError } = await context.admin
      .from("opportunity_scans")
      .update({
        status: "completed",
        completed_at: completedAt,
        opportunities_discovered: 0,
        metadata: {
          engine_job_id: context.engineJobId,
          worker_run_id: context.workerRunId,
          correlation_id: context.correlationId,
          deterministic: true,
          runtime: "durable_worker_runtime_v1",
        },
      })
      .eq("id", scan.id)
      .eq("organization_id", context.organizationId);

    if (completeError) {
      throw new Error(`Failed to complete opportunity scan: ${completeError.message}`);
    }

    return {
      output: {
        opportunity_scan_id: scan.id,
        opportunities_discovered: 0,
        scan_type: scanType,
        runtime: "durable_worker_runtime_v1",
      },
      metrics: {
        scan_duration_ms: Date.parse(completedAt) - Date.parse(startedAt),
      },
      confidenceScore: 100,
      qualityScore: 100,
      costAmount: 0,
      costCurrency: "USD",
    };
  },
};
