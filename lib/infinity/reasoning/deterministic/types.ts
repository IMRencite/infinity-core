import type { Tables } from "@/lib/supabase/database.types";
import {
  DEFAULT_REASONING_THRESHOLDS,
  DEFAULT_REASONING_WEIGHTS,
  REASONING_DIMENSIONS,
  REASONING_OUTCOMES,
} from "./constants";

export type ReasoningDimensionKey = (typeof REASONING_DIMENSIONS)[number];

export type ReasoningOutcome = (typeof REASONING_OUTCOMES)[number];

export type DimensionDataStatus = "known" | "unknown" | "insufficient";

export type ReasoningDimensionScore = {
  key: ReasoningDimensionKey;
  label: string;
  score: number | null;
  status: DimensionDataStatus;
  source: string;
  notes?: string;
};

export type ReasoningConfig = {
  weights: Record<ReasoningDimensionKey, number>;
  thresholds: {
    reject_max_score: number;
    research_more_max_score: number;
    research_more_max_confidence: number;
    queue_max_score: number;
    approve_for_build_min_score: number;
    approve_for_build_min_confidence: number;
    max_unknown_dimensions_for_queue: number;
  };
};

export type ReasoningValidationSnapshot = {
  validationRunId: string;
  recommendation: string;
  overallScore: number | null;
  overallConfidence: number | null;
  completedAt: string | null;
};

export type ReasoningContext = {
  organizationId: string;
  opportunityId: string;
  opportunityName: string;
  opportunity: Tables<"opportunities">;
  validation: ReasoningValidationSnapshot;
  latestScore: Tables<"opportunity_scores"> | null;
  evidence: Tables<"opportunity_evidence">[];
  evaluation: Tables<"opportunity_evaluations"> | null;
  allocationAmount: number | null;
};

export type OpportunityScoreResult = {
  organizationId: string;
  opportunityId: string;
  opportunityName: string;
  overallScore: number;
  confidence: number;
  dimensions: ReasoningDimensionScore[];
  unknownDimensionCount: number;
  validation: ReasoningValidationSnapshot;
  scoredAt: string;
};

export type RankedOpportunity = OpportunityScoreResult & {
  rank: number;
  outcome: ReasoningOutcome;
  explanation: string;
};

export type CompareOpportunitiesResult = {
  recommendedOpportunityId: string;
  recommendedOpportunityName: string;
  otherOpportunityId: string;
  otherOpportunityName: string;
  scoreDelta: number;
  rationale: string[];
  deterministic: true;
};

/** Swappable scoring implementation (rule-based today, AI later). */
export type ScoringStrategy = {
  score(context: ReasoningContext, config: ReasoningConfig): OpportunityScoreResult;
};

export class ReasoningGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReasoningGateError";
  }
}

export function assertValidatedForReasoning(validation: ReasoningValidationSnapshot): void {
  if (
    validation.recommendation !== "approved_for_planning" ||
    validation.overallScore === null
  ) {
    throw new ReasoningGateError(
      "Reasoning Engine only evaluates opportunities with validation recommendation approved_for_planning.",
    );
  }
}

export function mergeReasoningConfig(partial?: Partial<ReasoningConfig>): ReasoningConfig {
  return {
    weights: {
      ...DEFAULT_REASONING_WEIGHTS,
      ...(partial?.weights ?? {}),
    },
    thresholds: {
      ...DEFAULT_REASONING_THRESHOLDS,
      ...(partial?.thresholds ?? {}),
    },
  };
}
