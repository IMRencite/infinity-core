import type { AdminSupabaseClient } from "@/lib/supabase/admin";

export type AutonomousSpendSnapshot = {
  spendTodayUsd: number;
  spendByVentureUsd: number;
  pendingEstimatedUsd: number;
};

function startOfUtcDayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function loadAutonomousSpendSnapshot(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    ventureId?: string | null;
  },
): Promise<AutonomousSpendSnapshot> {
  const since = startOfUtcDayIso();

  const { data: approvals } = await admin
    .from("external_action_approvals")
    .select("max_authorized_cost, cost_evaluation, venture_id, external_action_id, status")
    .eq("organization_id", input.organizationId)
    .eq("authorization_source", "autonomous_policy")
    .eq("status", "approved")
    .gte("authorized_at", since);

  let spendTodayUsd = 0;
  let spendByVentureUsd = 0;
  for (const row of approvals ?? []) {
    const costEval = row.cost_evaluation as { estimatedCostUsd?: number } | null;
    const cost = Number(row.max_authorized_cost ?? costEval?.estimatedCostUsd ?? 0);
    spendTodayUsd += cost;
    if (input.ventureId && row.venture_id === input.ventureId) {
      spendByVentureUsd += cost;
    }
  }

  const { data: pendingActions } = await admin
    .from("external_actions")
    .select("estimated_cost, execution_status, venture_id")
    .eq("organization_id", input.organizationId)
    .in("execution_status", ["awaiting_approval", "execution_ready", "simulation_ready"]);

  let pendingEstimatedUsd = 0;
  for (const action of pendingActions ?? []) {
    if (input.ventureId && action.venture_id !== input.ventureId) continue;
    pendingEstimatedUsd += Number(action.estimated_cost ?? 0);
  }

  return { spendTodayUsd, spendByVentureUsd, pendingEstimatedUsd };
}

export function wouldExceedAutonomousBudget(input: {
  spendTodayUsd: number;
  spendVentureUsd: number;
  pendingEstimatedUsd: number;
  actionCostUsd: number;
  maxDailyCostUsd: number;
  maxVentureCostUsd: number;
}): boolean {
  if (input.actionCostUsd > 0 && input.maxDailyCostUsd === 0) {
    return true;
  }
  const projectedDaily = input.spendTodayUsd + input.pendingEstimatedUsd + input.actionCostUsd;
  const projectedVenture = input.spendVentureUsd + input.actionCostUsd;
  if (projectedDaily > input.maxDailyCostUsd) return true;
  if (projectedVenture > input.maxVentureCostUsd) return true;
  return false;
}
