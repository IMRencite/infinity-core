import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ValidationRun } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export type ValidationRunWithDetails = ValidationRun & {
  opportunityName: string | null;
  dimensionCount: number;
  blockingFindingCount: number;
};

export async function findOpportunityNeedingValidation(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<{ id: string; name: string } | null> {
  const { data: evaluations, error } = await supabase
    .from("opportunity_evaluations")
    .select("opportunity_id, recommendation, evaluated_at")
    .eq("organization_id", organizationId)
    .eq("evaluation_status", "completed")
    .in("recommendation", ["validate", "approve_initiative"])
    .order("evaluated_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to find opportunities for validation: ${error.message}`);
  }

  for (const evaluation of evaluations ?? []) {
    const { data: existingRun } = await supabase
      .from("validation_runs")
      .select("id, completed_at")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", evaluation.opportunity_id)
      .in("run_status", ["completed", "blocked"])
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingRun) {
      const { data: opportunity } = await supabase
        .from("opportunities")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("id", evaluation.opportunity_id)
        .maybeSingle();

      if (opportunity) {
        return { id: opportunity.id, name: opportunity.name };
      }
    }
  }

  return null;
}

export async function getLatestValidationRunForOpportunity(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<ValidationRun | null> {
  const { data, error } = await supabase
    .from("validation_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load validation run: ${error.message}`);
  }

  return data;
}

export async function isOpportunityApprovedForPlanning(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<boolean> {
  const latest = await getLatestValidationRunForOpportunity(
    supabase,
    organizationId,
    opportunityId,
  );

  return (
    latest?.run_status === "completed" &&
    latest.recommendation === "approved_for_planning"
  );
}

export async function listValidationRuns(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<ValidationRunWithDetails[]> {
  const { data: runs, error } = await supabase
    .from("validation_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list validation runs: ${error.message}`);
  }

  const enriched = await Promise.all(
    (runs ?? []).map(async (run) => {
      const [{ data: opportunity }, { count: dimensionCount }, { count: blockingCount }] =
        await Promise.all([
          supabase
            .from("opportunities")
            .select("name")
            .eq("organization_id", organizationId)
            .eq("id", run.opportunity_id)
            .maybeSingle(),
          supabase
            .from("validation_dimension_results")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("validation_run_id", run.id),
          supabase
            .from("validation_findings")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("validation_run_id", run.id)
            .eq("is_blocking", true),
        ]);

      return {
        ...run,
        opportunityName: opportunity?.name ?? null,
        dimensionCount: dimensionCount ?? 0,
        blockingFindingCount: blockingCount ?? 0,
      };
    }),
  );

  return enriched;
}

export async function getValidationRunDetails(
  supabase: InfinitySupabase,
  organizationId: string,
  validationRunId: string,
) {
  const [{ data: run }, { data: dimensions }, { data: findings }, { data: requirements }] =
    await Promise.all([
      supabase
        .from("validation_runs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", validationRunId)
        .maybeSingle(),
      supabase
        .from("validation_dimension_results")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("validation_run_id", validationRunId),
      supabase
        .from("validation_findings")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("validation_run_id", validationRunId),
      supabase
        .from("validation_requirements")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("validation_run_id", validationRunId),
    ]);

  return { run, dimensions: dimensions ?? [], findings: findings ?? [], requirements: requirements ?? [] };
}

export async function selectOpportunityForInitiativePlanning(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<{ id: string; name: string } | null> {
  const { data: approvedRuns, error } = await supabase
    .from("validation_runs")
    .select("opportunity_id, completed_at")
    .eq("organization_id", organizationId)
    .eq("run_status", "completed")
    .eq("recommendation", "approved_for_planning")
    .order("completed_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(
      `Failed to find opportunities for initiative planning: ${error.message}`,
    );
  }

  for (const run of approvedRuns ?? []) {
    const { data: existingPlans, error: planError } = await supabase
      .from("plans")
      .select("id, metadata")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (planError) {
      throw new Error(`Failed to check initiative planning records: ${planError.message}`);
    }

    const alreadyRecorded = (existingPlans ?? []).some((plan) => {
      if (typeof plan.metadata !== "object" || plan.metadata === null || Array.isArray(plan.metadata)) {
        return false;
      }

      const metadata = plan.metadata as Record<string, unknown>;
      return (
        metadata.opportunity_id === run.opportunity_id &&
        metadata.planner_gate === "approved_for_planning"
      );
    });

    if (alreadyRecorded) {
      continue;
    }

    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("id", run.opportunity_id)
      .maybeSingle();

    if (opportunity) {
      return { id: opportunity.id, name: opportunity.name };
    }
  }

  return null;
}

export async function calculateValidationSummary(
  supabase: InfinitySupabase,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("validation_runs")
    .select("run_status, recommendation")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to calculate validation summary: ${error.message}`);
  }

  const summary = {
    totalRuns: data?.length ?? 0,
    pendingCount: 0,
    completedCount: 0,
    approvedForPlanningCount: 0,
    blockedCount: 0,
  };

  for (const row of data ?? []) {
    if (row.run_status === "pending" || row.run_status === "running") {
      summary.pendingCount += 1;
    }
    if (row.run_status === "completed" || row.run_status === "blocked") {
      summary.completedCount += 1;
    }
    if (row.recommendation === "approved_for_planning") {
      summary.approvedForPlanningCount += 1;
    }
    if (row.run_status === "blocked") {
      summary.blockedCount += 1;
    }
  }

  return summary;
}
