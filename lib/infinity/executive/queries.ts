import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { PENDING_JOB_STATUSES } from "@/lib/infinity/constants";
import {
  buildExecutiveDedupKey,
  DEFAULT_EXECUTIVE_POLICY_VERSION,
  DEFAULT_REASONING_VERSION,
} from "./constants-db";

type InfinitySupabase = SupabaseClient<Database>;

export type ExecutiveDecisionRow = Tables<"executive_decisions">;
export type EnterpriseQueueEntryRow = Tables<"enterprise_queue_entries">;

export type ExecutiveDecisionWithOpportunity = ExecutiveDecisionRow & {
  opportunityName: string | null;
};

export async function getActiveExecutiveDecisionForOpportunity(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<ExecutiveDecisionRow | null> {
  const { data, error } = await supabase
    .from("executive_decisions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .eq("record_status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load executive decision: ${error.message}`);
  }

  return data;
}

export async function getExecutiveDecisionByDedupKey(
  supabase: InfinitySupabase,
  organizationId: string,
  dedupKey: string,
): Promise<ExecutiveDecisionRow | null> {
  const { data, error } = await supabase
    .from("executive_decisions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("dedup_key", dedupKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load executive decision by dedup key: ${error.message}`);
  }

  return data;
}

export async function hasPendingExecutiveJobsForOpportunity(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<boolean> {
  const { data: jobs, error } = await supabase
    .from("engine_jobs")
    .select("id, payload")
    .eq("organization_id", organizationId)
    .like("capability_key", "executive.%")
    .in("status", [...PENDING_JOB_STATUSES])
    .limit(20);

  if (error) {
    throw new Error(`Failed to check executive jobs: ${error.message}`);
  }

  return (jobs ?? []).some((job) => {
    if (typeof job.payload !== "object" || job.payload === null || Array.isArray(job.payload)) {
      return false;
    }

    return (job.payload as Record<string, unknown>).opportunity_id === opportunityId;
  });
}

export async function findOpportunityNeedingExecutiveEvaluation(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<{ id: string; name: string; validationRunId: string } | null> {
  const { data: approvedRuns, error } = await supabase
    .from("validation_runs")
    .select("id, opportunity_id, completed_at")
    .eq("organization_id", organizationId)
    .eq("run_status", "completed")
    .eq("recommendation", "approved_for_planning")
    .order("completed_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`Failed to find validation-approved opportunities: ${error.message}`);
  }

  for (const run of approvedRuns ?? []) {
    const dedupKey = buildExecutiveDedupKey({
      opportunityId: run.opportunity_id,
      validationRunId: run.id,
      reasoningVersion: DEFAULT_REASONING_VERSION,
      policyVersion: DEFAULT_EXECUTIVE_POLICY_VERSION,
    });

    const existing = await getExecutiveDecisionByDedupKey(supabase, organizationId, dedupKey);
    if (existing) {
      continue;
    }

    const pendingJob = await hasPendingExecutiveJobsForOpportunity(
      supabase,
      organizationId,
      run.opportunity_id,
    );
    if (pendingJob) {
      continue;
    }

    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("id", run.opportunity_id)
      .maybeSingle();

    if (opportunity) {
      return {
        id: opportunity.id,
        name: opportunity.name,
        validationRunId: run.id,
      };
    }
  }

  return null;
}

export async function listExecutiveDecisions(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<ExecutiveDecisionWithOpportunity[]> {
  const { data: decisions, error } = await supabase
    .from("executive_decisions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list executive decisions: ${error.message}`);
  }

  const enriched = await Promise.all(
    (decisions ?? []).map(async (decision) => {
      const { data: opportunity } = await supabase
        .from("opportunities")
        .select("name")
        .eq("organization_id", organizationId)
        .eq("id", decision.opportunity_id)
        .maybeSingle();

      return {
        ...decision,
        opportunityName: opportunity?.name ?? null,
      };
    }),
  );

  return enriched;
}

export async function listEnterpriseQueueEntries(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 25,
): Promise<EnterpriseQueueEntryRow[]> {
  const { data, error } = await supabase
    .from("enterprise_queue_entries")
    .select("*")
    .eq("organization_id", organizationId)
    .in("entry_status", ["queued", "deferred", "approved"])
    .order("queue_priority", { ascending: false })
    .order("queue_position", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list enterprise queue entries: ${error.message}`);
  }

  return data ?? [];
}

export async function countActiveExecutiveApprovals(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("executive_decisions")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("record_status", "active")
    .eq("decision", "approve");

  if (error) {
    throw new Error(`Failed to count executive approvals: ${error.message}`);
  }

  return count ?? 0;
}

export async function countQueuedEnterpriseEntries(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("enterprise_queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("entry_status", ["queued", "deferred"]);

  if (error) {
    throw new Error(`Failed to count queue entries: ${error.message}`);
  }

  return count ?? 0;
}

export async function loadPortfolioEntriesForExecutive(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<
  Array<{
    opportunityId: string;
    industry: string | null;
    category: string | null;
    decision: "APPROVE" | "DEFER" | "REJECT" | "QUEUE" | "RESEARCH_MORE";
  }>
> {
  const { data: decisions, error } = await supabase
    .from("executive_decisions")
    .select("opportunity_id, decision")
    .eq("organization_id", organizationId)
    .eq("record_status", "active")
    .eq("decision", "approve");

  if (error) {
    throw new Error(`Failed to load executive portfolio: ${error.message}`);
  }

  const entries = [];

  for (const row of decisions ?? []) {
    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("industry, category")
      .eq("organization_id", organizationId)
      .eq("id", row.opportunity_id)
      .maybeSingle();

    entries.push({
      opportunityId: row.opportunity_id,
      industry: opportunity?.industry ?? null,
      category: opportunity?.category ?? null,
      decision: "APPROVE" as const,
    });
  }

  return entries;
}
