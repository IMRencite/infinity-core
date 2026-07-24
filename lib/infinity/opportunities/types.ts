import type { Tables } from "@/lib/supabase/database.types";

export type Opportunity = Tables<"opportunities">;
export type OpportunityEvidence = Tables<"opportunity_evidence">;
export type OpportunityScore = Tables<"opportunity_scores">;

export type OpportunitySummary = {
  totalCount: number;
  discoveredCount: number;
  recommendedCount: number;
  pendingDecisionCount: number;
  averageOverallScore: number;
  averageConfidenceScore: number;
};

export type RegisterOpportunityInput = {
  organizationId: string;
  scanId: string;
  discoveryDedupKey: string;
  name: string;
  summary?: string | null;
  problem?: string | null;
  targetCustomer?: string | null;
  industry?: string | null;
  category?: string | null;
  businessModel?: string | null;
  recommendedBuilder?: string | null;
  status?: string;
  decision?: string;
  confidenceScore?: number | null;
  overallScore?: number | null;
  sourceSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string | null;
  engineJobId?: string | null;
  workerRunId?: string | null;
};
