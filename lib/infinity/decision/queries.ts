import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { OpportunityEvaluation } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function getLatestEvaluationForOpportunity(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<OpportunityEvaluation | null> {
  const { data, error } = await supabase
    .from("opportunity_evaluations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .order("evaluated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load opportunity evaluation: ${error.message}`);
  }

  return data;
}

export async function listRecentEvaluations(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<OpportunityEvaluation[]> {
  const { data, error } = await supabase
    .from("opportunity_evaluations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("evaluated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list opportunity evaluations: ${error.message}`);
  }

  return data ?? [];
}

export async function findOpportunityNeedingEvaluation(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<{ id: string; name: string } | null> {
  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("id, name, status, last_analyzed_at")
    .eq("organization_id", organizationId)
    .in("status", ["discovered", "scored", "recommended"])
    .order("discovered_at", { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Failed to find opportunities for evaluation: ${error.message}`);
  }

  for (const opportunity of opportunities ?? []) {
    const { data: evaluation } = await supabase
      .from("opportunity_evaluations")
      .select("id, evaluated_at")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunity.id)
      .eq("evaluation_status", "completed")
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evaluation) {
      return { id: opportunity.id, name: opportunity.name };
    }
  }

  return null;
}
