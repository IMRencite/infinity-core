import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import type { OpportunityScore } from "../opportunities";
import { DISCOVERY_SCORING_VERSION } from "./constants";
import type { DiscoveryContext } from "./types";

export type RecordOpportunityScoreInput = DiscoveryContext & {
  opportunityId: string;
  scoringVersion?: string;
  demandScore?: number | null;
  competitionScore?: number | null;
  profitabilityScore?: number | null;
  startupCostScore?: number | null;
  timeToRevenueScore?: number | null;
  automationScore?: number | null;
  overallScore?: number | null;
  confidenceScore?: number | null;
  reasoning?: string | null;
  weightedBreakdown?: Record<string, unknown>;
};

export async function recordOpportunityScore(
  admin: AdminSupabaseClient,
  input: RecordOpportunityScoreInput,
): Promise<OpportunityScore> {
  const scoringVersion = input.scoringVersion ?? DISCOVERY_SCORING_VERSION;

  const { data: existing, error: existingError } = await admin
    .from("opportunity_scores")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId)
    .eq("scoring_version", scoringVersion)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check opportunity score: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: score, error } = await admin
    .from("opportunity_scores")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      scoring_version: scoringVersion,
      demand_score: input.demandScore ?? null,
      competition_score: input.competitionScore ?? null,
      profitability_score: input.profitabilityScore ?? null,
      startup_cost_score: input.startupCostScore ?? null,
      time_to_revenue_score: input.timeToRevenueScore ?? null,
      automation_score: input.automationScore ?? null,
      overall_score: input.overallScore ?? null,
      confidence_score: input.confidenceScore ?? null,
      weighted_breakdown: (input.weightedBreakdown ?? {}) as Json,
      reasoning: input.reasoning ?? null,
    })
    .select("*")
    .single();

  if (error || !score) {
    throw new Error(
      `Failed to record opportunity score: ${error?.message ?? "unknown error"}`,
    );
  }

  await admin
    .from("opportunities")
    .update({
      overall_score: score.overall_score,
      confidence_score: score.confidence_score,
      status: "scored",
      last_analyzed_at: score.scored_at,
    })
    .eq("id", input.opportunityId)
    .eq("organization_id", input.organizationId);

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "discovery_engine",
    eventType: "discovery.opportunity_scored",
    entityType: "opportunity_score",
    entityId: score.id,
    message: `Opportunity scored (${scoringVersion})`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      score_id: score.id,
      scoring_version: scoringVersion,
      overall_score: score.overall_score,
      confidence_score: score.confidence_score,
    },
  });

  return score;
}
