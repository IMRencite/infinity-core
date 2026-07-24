import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CompareOpportunitiesResult } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function compareRecentOpportunityEvaluations(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 10,
): Promise<CompareOpportunitiesResult> {
  const { data, error } = await supabase
    .from("opportunity_evaluations")
    .select("opportunity_id, overall_score, confidence_score, recommendation, evaluated_at")
    .eq("organization_id", organizationId)
    .eq("evaluation_status", "completed")
    .order("evaluated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to compare opportunity evaluations: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    opportunityId: row.opportunity_id,
    overallScore: row.overall_score !== null ? Number(row.overall_score) : null,
    confidenceScore:
      row.confidence_score !== null ? Number(row.confidence_score) : null,
    recommendation: row.recommendation,
    evaluatedAt: row.evaluated_at,
  }));
}
