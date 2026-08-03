import type { Json } from "@/lib/supabase/database.types";
import { runValidation } from "../../validation";
import {
  VALIDATION_CAPABILITY_KEY,
  VALIDATION_ENGINE_NAME,
} from "../../constants";
import { emitRuntimeEngineEvent } from "../persistence";
import type {
  WorkerDefinition,
  WorkerExecutionContext,
  WorkerExecutionResult,
} from "../types";

export const validationRunWorker: WorkerDefinition = {
  capabilityKey: VALIDATION_CAPABILITY_KEY,
  engineName: VALIDATION_ENGINE_NAME,
  workerName: "validation_run",
  version: "1.0.0",
  implementationKey: "validation.run.v1",
  timeoutSeconds: 120,
  classifyFailure(error) {
    if (error instanceof Error && /validation|policy|not found|requires/i.test(error.message)) {
      return "non_retryable";
    }

    return "retryable";
  },
  async execute(
    input: Json,
    context: WorkerExecutionContext,
  ): Promise<WorkerExecutionResult> {
    const opportunityId =
      typeof input === "object" &&
      input !== null &&
      !Array.isArray(input) &&
      "opportunity_id" in input
        ? String((input as Record<string, Json>).opportunity_id)
        : null;

    if (!opportunityId) {
      throw new Error("opportunity_id is required for validation worker");
    }

    const missionId =
      typeof input === "object" &&
      input !== null &&
      !Array.isArray(input) &&
      "mission_id" in input
        ? String((input as Record<string, Json>).mission_id)
        : null;

    const runKey = `validation:${opportunityId}:job:${context.engineJobId}`;

    const result = await runValidation(context.admin, {
      organizationId: context.organizationId,
      opportunityId,
      missionId,
      correlationId: context.correlationId,
      runKey,
    });

    await emitRuntimeEngineEvent(context.admin, {
      organizationId: context.organizationId,
      engineName: VALIDATION_ENGINE_NAME,
      eventType: "validation.completed",
      entityType: "validation_run",
      entityId: result.run.id,
      message: `Worker validation completed: ${result.recommendation}`,
      correlationId: context.correlationId,
      payload: {
        validation_run_id: result.run.id,
        opportunity_id: opportunityId,
        recommendation: result.recommendation,
        overall_confidence: result.overallConfidence,
        planner_eligible: result.plannerEligible,
        already_run: result.alreadyRun,
      },
    });

    return {
      output: {
        opportunity_id: opportunityId,
        validation_run_id: result.run.id,
        recommendation: result.recommendation,
        overall_confidence: result.overallConfidence,
        overall_score: result.overallScore,
        planner_eligible: result.plannerEligible,
        blocking_finding_count: result.blockingFindings.length,
        already_run: result.alreadyRun,
      },
      metrics: {
        missing_information: result.missingInformation.length,
        blocking_findings: result.blockingFindings.length,
      },
      confidenceScore: result.overallConfidence ?? undefined,
      qualityScore: result.overallScore ?? undefined,
      costAmount: 0,
      costCurrency: "USD",
    };
  },
};
