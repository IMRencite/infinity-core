import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { insertVentureSelectionRun, updateVentureSelectionRun } from "@/lib/infinity/venture-selection/persistence";
import type { ValidationExecutionResult } from "./types";

export async function persistValidationLineage(
  admin: AdminSupabaseClient,
  result: ValidationExecutionResult,
): Promise<{ selectionRunId: string; monetizationPlanId: string | null }> {
  const selection = await insertVentureSelectionRun(admin, {
    organizationId: result.plan.organizationId,
    correlationId: result.validationRunId,
    idempotencyKey: `gavve-v1:${result.plan.candidateId}:${result.validationRunId}`,
    opportunityCandidateIds: [result.plan.candidateId],
    discoveryRunIds: [],
    monetizationRunIds: [],
  });
  await updateVentureSelectionRun(admin, result.plan.organizationId, selection.id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    selection_report: {
      engine: "governed_autonomous_venture_validation_execution_v1",
      validationRunId: result.validationRunId,
      outcome: result.outcome,
      queue: [
        {
          candidateId: result.plan.candidateId,
          decision: result.decision,
          selectionScore: result.preRun.selectionScore,
          opportunityScore: result.preRun.opportunityScore,
          rank: 1,
          reason: result.nextMove,
          counterfactual: result.nextMove,
          monetizationPlanId: result.plan.traceability.monetizationPlanId,
        },
      ],
      economicsAfter: result.economicsAfter,
      businessModelChallenge: result.businessModelChallenge,
      readyForBuildHandoff: result.readyForBuildHandoff,
    } as never,
  });

  if (result.live.researchRunIds.length) {
    const { data: candidate } = await admin
      .from("opportunity_candidates")
      .select("research_run_ids")
      .eq("organization_id", result.plan.organizationId)
      .eq("id", result.plan.candidateId)
      .maybeSingle();
    const existing = Array.isArray(candidate?.research_run_ids) ? candidate.research_run_ids : [];
    const merged = [...new Set([...existing.map(String), ...result.live.researchRunIds])];
    await admin
      .from("opportunity_candidates")
      .update({ research_run_ids: merged as never })
      .eq("organization_id", result.plan.organizationId)
      .eq("id", result.plan.candidateId);
  }

  return { selectionRunId: selection.id, monetizationPlanId: result.plan.traceability.monetizationPlanId };
}
