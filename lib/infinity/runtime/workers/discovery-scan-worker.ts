import type { Json } from "@/lib/supabase/database.types";
import { runDiscoveryEnginePipelineForScan } from "../../discovery/pipeline";
import { recordRuntimeValidationIntelligence } from "../../intelligence/validation";
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
          "Opportunity Discovery Engine v1 scan (multi-provider pipeline, no ventures)",
        search_scope: {
          mode: "discovery_engine_v1",
          pipeline: "fetch_normalize_dedupe_score_persist",
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
          validation_scope: "discovery_engine_v1",
          creates_ventures: false,
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
      message: "Discovery scan started (Discovery Engine v1)",
      correlationId: context.correlationId,
      payload: {
        engine_job_id: context.engineJobId,
        worker_run_id: context.workerRunId,
        scan_type: scanType,
        validation_scope: "discovery_engine_v1",
        runtime: "durable_worker_runtime_v1",
      },
    });

    const pipelineResult = await runDiscoveryEnginePipelineForScan(context.admin, {
      organizationId: context.organizationId,
      scanId: scan.id,
      correlationId: context.correlationId,
      engineJobId: context.engineJobId,
      workerRunId: context.workerRunId,
      providerIds: ["manual"],
      manualItems: [
        {
          externalId: `scan-${scan.id}-foundation`,
          title: "Discovery Engine v1 validation opportunity",
          description:
            "Labeled manual provider item for Discovery Engine v1 pipeline validation. Not a live market claim.",
          url: `https://infinity.local/discovery/scans/${scan.id}`,
          category: "market_signal",
          market: "b2b",
          keywords: ["discovery_engine_v1", "manual", "validation"],
          payload: { validation_scope: "discovery_engine_v1", creates_ventures: false },
        },
      ],
    });

    const opportunitiesDiscovered = Math.max(pipelineResult.persistedCount, pipelineResult.opportunityIds.length > 0 ? 1 : 0);

    const primaryOpportunityId = pipelineResult.opportunityIds[0] ?? null;

    const completedAt = new Date().toISOString();

    const { error: completeError } = await context.admin
      .from("opportunity_scans")
      .update({
        status: "completed",
        completed_at: completedAt,
        opportunities_discovered: opportunitiesDiscovered,
        metadata: {
          engine_job_id: context.engineJobId,
          worker_run_id: context.workerRunId,
          correlation_id: context.correlationId,
          discovery_engine_v1: true,
          pipeline_persisted: pipelineResult.persistedCount,
          validation_scope: "discovery_engine_v1",
          creates_ventures: false,
          opportunity_id: primaryOpportunityId,
          runtime: "durable_worker_runtime_v1",
        },
      })
      .eq("id", scan.id)
      .eq("organization_id", context.organizationId);

    if (completeError) {
      throw new Error(`Failed to complete opportunity scan: ${completeError.message}`);
    }

    await recordRuntimeValidationIntelligence(context.admin, {
      organizationId: context.organizationId,
      actorType: "system",
      sourceEntityType: "worker_run",
      sourceEntityId: context.workerRunId,
      correlationId: context.correlationId,
      engineJobId: context.engineJobId,
      workerRunId: context.workerRunId,
      opportunityScanId: scan.id,
      scanType,
    });

    return {
      output: {
        opportunity_scan_id: scan.id,
        opportunities_discovered: opportunitiesDiscovered,
        opportunity_id: primaryOpportunityId,
        scan_type: scanType,
        validation_scope: "discovery_engine_v1",
        pipeline_persisted: pipelineResult.persistedCount,
        creates_ventures: false,
        runtime: "durable_worker_runtime_v1",
      },
      metrics: {
        scan_duration_ms: Date.parse(completedAt) - Date.parse(startedAt),
        discovery_pipeline_events: pipelineResult.eventsEmitted,
      },
      confidenceScore: 100,
      qualityScore: 100,
      costAmount: 0,
      costCurrency: "USD",
    };
  },
};
