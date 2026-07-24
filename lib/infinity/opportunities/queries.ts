import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AllocationProposal } from "../allocation/types";
import type { OpportunityEvaluation } from "../decision/types";
import type { Opportunity, OpportunitySummary } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export type OpportunityWithEvaluation = Opportunity & {
  latestEvaluation: OpportunityEvaluation | null;
  latestAllocation: AllocationProposal | null;
};

function readNumeric(value: number | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function listOpportunitiesForOrganization(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("organization_id", organizationId)
    .order("discovered_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list opportunities: ${error.message}`);
  }

  return data ?? [];
}

export async function getOpportunityById(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", opportunityId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load opportunity: ${error.message}`);
  }

  return data;
}

export async function calculateOpportunitySummary(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<OpportunitySummary> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("status, decision, overall_score, confidence_score")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to calculate opportunity summary: ${error.message}`);
  }

  const summary: OpportunitySummary = {
    totalCount: data?.length ?? 0,
    discoveredCount: 0,
    recommendedCount: 0,
    pendingDecisionCount: 0,
    averageOverallScore: 0,
    averageConfidenceScore: 0,
  };

  let overallTotal = 0;
  let overallCount = 0;
  let confidenceTotal = 0;
  let confidenceCount = 0;

  for (const row of data ?? []) {
    if (row.status === "discovered" || row.status === "scored") {
      summary.discoveredCount += 1;
    }

    if (row.status === "recommended") {
      summary.recommendedCount += 1;
    }

    if (row.decision === "pending") {
      summary.pendingDecisionCount += 1;
    }

    if (row.overall_score !== null) {
      overallTotal += readNumeric(row.overall_score);
      overallCount += 1;
    }

    if (row.confidence_score !== null) {
      confidenceTotal += readNumeric(row.confidence_score);
      confidenceCount += 1;
    }
  }

  summary.averageOverallScore =
    overallCount > 0 ? Math.round((overallTotal / overallCount) * 100) / 100 : 0;
  summary.averageConfidenceScore =
    confidenceCount > 0
      ? Math.round((confidenceTotal / confidenceCount) * 100) / 100
      : 0;

  return summary;
}

export async function listOpportunitiesWithEvaluations(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<OpportunityWithEvaluation[]> {
  const opportunities = await listOpportunitiesForOrganization(
    supabase,
    organizationId,
    limit,
  );

  const enriched = await Promise.all(
    opportunities.map(async (opportunity) => {
      const [{ data: evaluation }, { data: allocation }] = await Promise.all([
        supabase
          .from("opportunity_evaluations")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("opportunity_id", opportunity.id)
          .order("evaluated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("allocation_proposals")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("opportunity_id", opportunity.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        ...opportunity,
        latestEvaluation: evaluation,
        latestAllocation: allocation,
      };
    }),
  );

  return enriched;
}
