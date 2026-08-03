import type { Json } from "@/lib/supabase/database.types";
import {
  EXECUTIVE_EVALUATE_CAPABILITY_KEY,
  EXECUTIVE_ENGINE_NAME,
} from "../../constants";
import { runExecutiveEvaluation } from "../../executive/run";
import { emitRuntimeEngineEvent } from "../persistence";
import type {
  WorkerDefinition,
  WorkerExecutionContext,
  WorkerExecutionResult,
} from "../types";

export const executiveEvaluateWorker: WorkerDefinition = {
  capabilityKey: EXECUTIVE_EVALUATE_CAPABILITY_KEY,
  engineName: EXECUTIVE_ENGINE_NAME,
  workerName: "executive_evaluate_opportunity",
  version: "1.0.0",
  implementationKey: "executive.evaluate_opportunity.v1",
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
      throw new Error("opportunity_id is required for executive evaluation worker");
    }

    const missionId =
      typeof input === "object" &&
      input !== null &&
      !Array.isArray(input) &&
      "mission_id" in input
        ? String((input as Record<string, Json>).mission_id)
        : null;

    const validationRunId =
      typeof input === "object" &&
      input !== null &&
      !Array.isArray(input) &&
      "validation_run_id" in input
        ? String((input as Record<string, Json>).validation_run_id)
        : null;

    const dedupKey = `executive:${opportunityId}:job:${context.engineJobId}`;

    try {
      const result = await runExecutiveEvaluation(context.admin, {
        organizationId: context.organizationId,
        opportunityId,
        missionId,
        validationRunId,
        correlationId: context.correlationId,
        dedupKey: undefined,
      });

      await emitRuntimeEngineEvent(context.admin, {
        organizationId: context.organizationId,
        engineName: EXECUTIVE_ENGINE_NAME,
        eventType: result.alreadyRun
          ? "executive.evaluation_started"
          : "executive.decision_created",
        entityType: "executive_decision",
        entityId: result.decisionId,
        message: result.alreadyRun
          ? "Executive evaluation idempotent replay"
          : `Executive decision persisted: ${result.decision}`,
        correlationId: context.correlationId,
        payload: {
          opportunity_id: opportunityId,
          executive_decision_id: result.decisionId,
          decision: result.decision,
          planning_eligible: result.planningEligible,
          queue_entry_id: result.queueEntryId,
          already_run: result.alreadyRun,
        },
      });

      return {
        output: {
          opportunity_id: opportunityId,
          executive_decision_id: result.decisionId,
          decision: result.decision,
          planning_eligible: result.planningEligible,
          queue_entry_id: result.queueEntryId,
          priority_score: result.priorityScore,
          already_run: result.alreadyRun,
        },
        metrics: {
          rationale_lines: result.executiveRecord.rationale.length,
        },
        confidenceScore: result.executiveRecord.reasoningScore,
        qualityScore: result.priorityScore,
        costAmount: 0,
        costCurrency: "USD",
      };
    } catch (error) {
      await emitRuntimeEngineEvent(context.admin, {
        organizationId: context.organizationId,
        engineName: EXECUTIVE_ENGINE_NAME,
        eventType: "executive.evaluation_failed",
        entityType: "opportunity",
        entityId: opportunityId,
        message:
          error instanceof Error ? error.message : "Executive evaluation failed unexpectedly",
        correlationId: context.correlationId,
        severity: "error",
        payload: {
          opportunity_id: opportunityId,
          dedup_key: dedupKey,
        },
      });

      throw error;
    }
  },
};
