import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AllocationProposal, AllocationSummary, ResourcePool } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function listAllocationProposals(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<AllocationProposal[]> {
  const { data, error } = await supabase
    .from("allocation_proposals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list allocation proposals: ${error.message}`);
  }

  return data ?? [];
}

export async function listResourcePools(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<ResourcePool[]> {
  const { data, error } = await supabase
    .from("resource_pools")
    .select("*")
    .eq("organization_id", organizationId)
    .order("resource_type", { ascending: true });

  if (error) {
    throw new Error(`Failed to list resource pools: ${error.message}`);
  }

  return data ?? [];
}

export async function calculateAllocationSummary(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<AllocationSummary> {
  const [{ data: proposals }, { data: pools }] = await Promise.all([
    supabase
      .from("allocation_proposals")
      .select("status")
      .eq("organization_id", organizationId),
    supabase
      .from("resource_pools")
      .select("total_capacity, reserved_capacity, consumed_capacity")
      .eq("organization_id", organizationId),
  ]);

  const summary: AllocationSummary = {
    proposedCount: 0,
    policyBlockedCount: 0,
    awaitingApprovalCount: 0,
    approvedOrReservedCount: 0,
    poolCount: pools?.length ?? 0,
    totalAvailableCapacity: 0,
  };

  for (const proposal of proposals ?? []) {
    if (proposal.status === "proposed") summary.proposedCount += 1;
    if (proposal.status === "policy_blocked") summary.policyBlockedCount += 1;
    if (proposal.status === "awaiting_approval") summary.awaitingApprovalCount += 1;
    if (proposal.status === "approved" || proposal.status === "reserved") {
      summary.approvedOrReservedCount += 1;
    }
  }

  for (const pool of pools ?? []) {
    summary.totalAvailableCapacity +=
      Number(pool.total_capacity) -
      Number(pool.reserved_capacity) -
      Number(pool.consumed_capacity);
  }

  return summary;
}

export async function getLatestAllocationForOpportunity(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<AllocationProposal | null> {
  const { data, error } = await supabase
    .from("allocation_proposals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load allocation proposal: ${error.message}`);
  }

  return data;
}
