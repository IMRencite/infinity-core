import type { Json } from "@/lib/supabase/database.types";
import { evaluateOpportunity } from "../../decision";
import { proposeAllocation } from "../../allocation";
import {
  DECISION_EVALUATE_CAPABILITY_KEY,
  DECISION_ENGINE_NAME,
} from "../../constants";
import { emitRuntimeEngineEvent } from "../persistence";
import type {
  WorkerDefinition,
  WorkerExecutionContext,
  WorkerExecutionResult,
} from "../types";

export const opportunityEvaluationWorker: WorkerDefinition = {
  capabilityKey: DECISION_EVALUATE_CAPABILITY_KEY,
  engineName: DECISION_ENGINE_NAME,
  workerName: "opportunity_evaluation",
  version: "1.0.0",
  implementationKey: "decision.evaluate_opportunity.v1",
  timeoutSeconds: 120,
  classifyFailure(error) {
    if (error instanceof Error && /validation|policy|not found/i.test(error.message)) {
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
      throw new Error("opportunity_id is required for opportunity evaluation worker");
    }

    const missionId =
      typeof input === "object" &&
      input !== null &&
      !Array.isArray(input) &&
      "mission_id" in input
        ? String((input as Record<string, Json>).mission_id)
        : null;

    const evaluationKey = `eval:${opportunityId}:job:${context.engineJobId}`;

    const evaluationResult = await evaluateOpportunity(context.admin, {
      organizationId: context.organizationId,
      opportunityId,
      missionId,
      correlationId: context.correlationId,
      evaluationKey,
    });

    let allocationProposalId: string | null = null;
    let allocationStatus: string | null = null;

    if (
      evaluationResult.recommendation === "validate" ||
      evaluationResult.recommendation === "approve_initiative"
    ) {
      const allocationType =
        evaluationResult.recommendation === "validate" ? "validation" : "initiative";

      const allocation = await proposeAllocation(context.admin, {
        organizationId: context.organizationId,
        opportunityId,
        evaluationId: evaluationResult.evaluation.id,
        allocationType,
        missionId,
        correlationId: context.correlationId,
        proposalKey: `allocation:${evaluationResult.evaluation.id}:${allocationType}:${context.workerRunId}`,
      });

      allocationProposalId = allocation.proposal.id;
      allocationStatus = allocation.status;
    }

    await emitRuntimeEngineEvent(context.admin, {
      organizationId: context.organizationId,
      engineName: DECISION_ENGINE_NAME,
      eventType: "decision.evaluation_completed",
      entityType: "opportunity_evaluation",
      entityId: evaluationResult.evaluation.id,
      message: `Worker evaluation completed: ${evaluationResult.recommendation}`,
      correlationId: context.correlationId,
      payload: {
        evaluation_id: evaluationResult.evaluation.id,
        opportunity_id: opportunityId,
        recommendation: evaluationResult.recommendation,
        confidence_score: evaluationResult.confidenceScore,
        overall_score: evaluationResult.overallScore,
        allocation_proposal_id: allocationProposalId,
        allocation_status: allocationStatus,
      },
    });

    return {
      output: {
        opportunity_id: opportunityId,
        evaluation_id: evaluationResult.evaluation.id,
        recommendation: evaluationResult.recommendation,
        confidence_score: evaluationResult.confidenceScore,
        overall_score: evaluationResult.overallScore,
        allocation_proposal_id: allocationProposalId,
        allocation_status: allocationStatus,
        already_evaluated: evaluationResult.alreadyEvaluated,
      },
      metrics: {
        missing_dimensions: evaluationResult.missingDimensions.length,
      },
      confidenceScore: evaluationResult.confidenceScore ?? undefined,
      qualityScore: evaluationResult.overallScore ?? undefined,
      costAmount: 0,
      costCurrency: "USD",
    };
  },
};
