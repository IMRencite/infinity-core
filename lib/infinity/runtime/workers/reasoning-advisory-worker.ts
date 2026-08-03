import type { Json } from "@/lib/supabase/database.types";
import {
  REASONING_ADVISORY_CAPABILITY_KEY,
  REASONING_ENGINE_NAME,
} from "@/lib/infinity/constants";
import { loadGovernedReasoningMode } from "@/lib/infinity/governed-reasoning/modes";
import { runGovernedReasoningSession } from "@/lib/infinity/governed-reasoning/run";
import { emitRuntimeEngineEvent } from "../persistence";
import type {
  WorkerDefinition,
  WorkerExecutionContext,
  WorkerExecutionResult,
} from "../types";

export const reasoningAdvisoryWorker: WorkerDefinition = {
  capabilityKey: REASONING_ADVISORY_CAPABILITY_KEY,
  engineName: REASONING_ENGINE_NAME,
  workerName: "reasoning_execute_advisory",
  version: "1.0.0",
  implementationKey: "reasoning.execute_advisory.v1",
  timeoutSeconds: 300,
  classifyFailure(error) {
    if (error instanceof Error && /validation|schema|policy|not configured|unsupported evidence/i.test(error.message)) {
      return "non_retryable";
    }

    return "retryable";
  },
  async execute(input: Json, context: WorkerExecutionContext): Promise<WorkerExecutionResult> {
    const record =
      typeof input === "object" && input !== null && !Array.isArray(input)
        ? (input as Record<string, Json>)
        : {};

    const organizationId = String(record.organization_id ?? context.organizationId);
    const missionId = String(record.mission_id ?? "");
    const opportunityId = String(record.opportunity_id ?? "");
    const runtimeInstanceId = String(record.runtime_instance_id ?? "");
    const modeRaw = record.mode ? String(record.mode) : loadGovernedReasoningMode();

    if (!missionId || !opportunityId) {
      throw new Error("mission_id and opportunity_id are required.");
    }

    if (organizationId !== context.organizationId) {
      throw new Error("Organization mismatch for reasoning worker.");
    }

    const idempotencyKey = `reasoning-advisory:${context.engineJobId}`;

    const result = await runGovernedReasoningSession(context.admin, {
      organizationId,
      missionId,
      opportunityId,
      runtimeInstanceId: runtimeInstanceId || null,
      correlationId: context.correlationId,
      idempotencyKey,
      modeOverride: modeRaw as ReturnType<typeof loadGovernedReasoningMode>,
    });

    await emitRuntimeEngineEvent(context.admin, {
      organizationId,
      engineName: REASONING_ENGINE_NAME,
      eventType: "reasoning.session_completed",
      entityType: "reasoning_session",
      entityId: result.session.id,
      message: "Governed reasoning worker completed.",
      correlationId: context.correlationId,
      payload: {
        reasoning_session_id: result.session.id,
        mode: result.session.mode,
        recommendation: result.session.recommendation,
        confidence: result.session.confidence,
        already_exists: result.alreadyExists,
      },
    });

    return {
      output: {
        reasoning_session_id: result.session.id,
        status: result.session.status,
        mode: result.session.mode,
        recommendation: result.session.recommendation,
        confidence: result.session.confidence,
        already_run: result.alreadyExists,
        executive_review_required: true,
      },
      metrics: {
        latency_ms: result.session.latencyMs ?? 0,
      },
      confidenceScore: result.session.confidence ?? undefined,
      costAmount: result.session.estimatedCost ?? 0,
      costCurrency: "USD",
    };
  },
};
