import type { Tables } from "@/lib/supabase/database.types";

export type DecisionModel = Tables<"decision_models">;
export type OpportunityEvaluation = Tables<"opportunity_evaluations">;

export type DimensionScore = {
  score: number | null;
  status: "known" | "unknown";
  source?: string;
  transform?: string;
};

export type EvaluationDimensionScores = Record<string, DimensionScore>;

export type PolicyEvaluationResult = {
  passed: boolean;
  blocked: boolean;
  requiresApproval: boolean;
  reasons: string[];
  checks: Record<string, boolean>;
};

export type EvaluateOpportunityInput = {
  organizationId: string;
  opportunityId: string;
  missionId?: string | null;
  decisionModelId?: string | null;
  correlationId?: string | null;
  evaluationKey?: string | null;
};

export type EvaluateOpportunityResult = {
  alreadyEvaluated: boolean;
  evaluation: OpportunityEvaluation;
  recommendation: string;
  confidenceScore: number | null;
  overallScore: number | null;
  policyResults: PolicyEvaluationResult;
  missingDimensions: string[];
  topPositiveDimensions: string[];
  topRisks: string[];
};

export type CompareOpportunitiesResult = {
  opportunityId: string;
  overallScore: number | null;
  confidenceScore: number | null;
  recommendation: string;
  evaluatedAt: string;
}[];
