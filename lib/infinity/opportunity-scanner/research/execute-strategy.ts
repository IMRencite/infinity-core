import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runGroundedResearch } from "@/lib/infinity/research/run";
import { buildStrategyResearchUserPrompt } from "../prompts";
import { runStrategyExtractionResearch } from "./strategy-extraction";
import { mapExtractionToCandidateDrafts } from "../extraction/map-candidates";
import { mergeCostSummaries, emptyCostSummary } from "../cost-governance";
import type { DiscoveryStrategyId } from "../constants";
import type { OpportunityCandidateDraft, ScannerCostSummary } from "../types";
import type { DiscoveryStrategyDefinition } from "../strategies";
import { isEvidenceValidationFailure } from "../pool-adequacy";
import { extractThrownMessage } from "@/lib/infinity/shared/extract-thrown-message";

export type StrategyExecutionOutcome =
  | {
      ok: true;
      strategyId: DiscoveryStrategyId;
      researchRunId: string;
      candidates: Array<
        OpportunityCandidateDraft & {
          scoringAssessment: import("../types").ScoringAssessmentInput;
        }
      >;
      costDelta: ScannerCostSummary;
    }
  | {
      ok: false;
      strategyId: DiscoveryStrategyId;
      degraded: boolean;
      message: string;
      classification: string | null;
      costDelta: ScannerCostSummary;
      researchRunId?: string;
    };

const MAX_STRATEGY_ATTEMPTS = 2;

function emptyCostDelta(): ScannerCostSummary {
  return emptyCostSummary();
}

function costFromResearchResult(result: {
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  groundingUsage: { searchQueryCount: number; groundingChunkCount: number };
  estimatedCostUsd: number | null;
  costUncertainty: string | null;
}): ScannerCostSummary {
  return mergeCostSummaries(emptyCostDelta(), {
    tokenUsage: result.tokenUsage,
    groundingUsage: {
      searchQueryCount: result.groundingUsage.searchQueryCount,
      groundingChunkCount: result.groundingUsage.groundingChunkCount,
    },
    estimatedCostUsd: result.estimatedCostUsd,
    costUncertainty: result.costUncertainty,
  });
}

function costFromResearchFailure(failure: {
  tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
  estimatedCostUsd?: number | null;
}): ScannerCostSummary {
  if (!failure.tokenUsage && failure.estimatedCostUsd == null) {
    return emptyCostDelta();
  }
  return mergeCostSummaries(emptyCostDelta(), {
    tokenUsage: failure.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    groundingUsage: { searchQueryCount: 0, groundingChunkCount: 0 },
    estimatedCostUsd: failure.estimatedCostUsd ?? null,
    costUncertainty: null,
  });
}

export async function executeDiscoveryStrategy(input: {
  admin: AdminSupabaseClient;
  organizationId: string;
  idempotencyKey: string;
  runPurpose?: string;
  strategy: DiscoveryStrategyDefinition;
  searchScope: Record<string, unknown>;
  attemptSuffix?: string;
  requireSourceBackedFindings?: boolean;
}): Promise<StrategyExecutionOutcome> {
  const strategyId = input.strategy.id;
  const idempotencyKey = input.attemptSuffix
    ? `${input.idempotencyKey}:research:${strategyId}:${input.attemptSuffix}`
    : `${input.idempotencyKey}:research:${strategyId}`;

  let accumulatedCost = emptyCostDelta();

  for (let attempt = 1; attempt <= MAX_STRATEGY_ATTEMPTS; attempt += 1) {
    const attemptKey =
      attempt === 1
        ? idempotencyKey
        : `${input.idempotencyKey}:research:${strategyId}:retry:${attempt - 1}`;

    const researchObjective = input.strategy.buildResearchObjective(input.searchScope);
    const researchOutput = await runGroundedResearch(input.admin, {
      organizationId: input.organizationId,
      researchObjective: buildStrategyResearchUserPrompt(researchObjective, {
        requireSourceBackedFindings: input.requireSourceBackedFindings || attempt > 1,
      }),
      idempotencyKey: attemptKey,
      providerId: "gemini",
      runPurpose: input.runPurpose ?? "opportunity_scanner",
      requireSourceBackedFindings: input.requireSourceBackedFindings || attempt > 1,
    });

    if (!researchOutput.ok) {
      accumulatedCost = mergeCostSummaries(
        accumulatedCost,
        costFromResearchFailure(researchOutput.failure),
      );
      const retryable = isEvidenceValidationFailure(
        researchOutput.failure.message,
        researchOutput.failure.failureClassification,
      );
      if (retryable && attempt < MAX_STRATEGY_ATTEMPTS) {
        console.warn("[FAVC1] venture radar strategy evidence validation failed — retrying", {
          strategyId,
          attempt,
          message: researchOutput.failure.message,
        });
        continue;
      }

      return {
        ok: false,
        strategyId,
        degraded: true,
        message: researchOutput.failure.message,
        classification: researchOutput.failure.failureClassification,
        costDelta: accumulatedCost,
        researchRunId: researchOutput.failure.researchRunId,
      };
    }

    accumulatedCost = mergeCostSummaries(
      accumulatedCost,
      costFromResearchResult(researchOutput.result),
    );

    try {
      const extraction = await runStrategyExtractionResearch({
        strategyId,
        researchSummary: researchOutput.result.summary,
        researchEvidence: researchOutput.result.evidence,
        researchSources: researchOutput.result.sources,
        parentResearchGrounded: researchOutput.result.groundedStatus,
      });

      return {
        ok: true,
        strategyId,
        researchRunId: researchOutput.result.researchRunId,
        candidates: mapExtractionToCandidateDrafts(extraction, researchOutput.result),
        costDelta: accumulatedCost,
      };
    } catch (error) {
      const message = extractThrownMessage(error);
      if (isEvidenceValidationFailure(message) && attempt < MAX_STRATEGY_ATTEMPTS) {
        console.warn("[FAVC1] venture radar strategy extraction evidence failure — retrying", {
          strategyId,
          attempt,
          message,
        });
        continue;
      }
      return {
        ok: false,
        strategyId,
        degraded: true,
        message,
        classification: "evidence_validation_failure",
        costDelta: accumulatedCost,
        researchRunId: researchOutput.result.researchRunId,
      };
    }
  }

  return {
    ok: false,
    strategyId,
    degraded: true,
    message: "Strategy attempts exhausted",
    classification: "evidence_validation_failure",
    costDelta: accumulatedCost,
  };
}
