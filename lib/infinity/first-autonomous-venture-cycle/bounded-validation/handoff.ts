import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildVentureSelectionHandoff,
  generateSelectionExplanation,
} from "@/lib/infinity/venture-selection/explanation/generate";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";

export async function ensurePreparedHandoffForEvaluation(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    ventureSelectionRunId: string;
    evaluation: CandidateEvaluationDraft;
    rank?: number;
    totalCandidates?: number;
  },
): Promise<string> {
  const { data: existing } = await admin
    .from("venture_selection_handovers")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("venture_selection_run_id", input.ventureSelectionRunId)
    .eq("opportunity_candidate_id", input.evaluation.candidate.candidateId)
    .eq("handoff_status", "prepared")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const explanation = generateSelectionExplanation({
    evaluation: input.evaluation,
    rank: input.rank ?? 1,
    totalCandidates: input.totalCandidates ?? 1,
    higherRankedTitles: [],
  });
  const handoff = buildVentureSelectionHandoff({ ...input.evaluation, explanation });

  const { data: evaluationRow } = await admin
    .from("candidate_selection_evaluations")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("venture_selection_run_id", input.ventureSelectionRunId)
    .eq("opportunity_candidate_id", input.evaluation.candidate.candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error } = await admin
    .from("venture_selection_handovers")
    .insert({
      organization_id: input.organizationId,
      venture_selection_run_id: input.ventureSelectionRunId,
      candidate_selection_evaluation_id: evaluationRow?.id ?? randomUUID(),
      opportunity_candidate_id: input.evaluation.candidate.candidateId,
      business_concept: handoff.businessConcept,
      target_customer: handoff.targetCustomer,
      problem: handoff.problem,
      solution: handoff.solution,
      primary_monetization_model: handoff.primaryMonetizationModel,
      secondary_revenue_streams: handoff.secondaryRevenueStreams as never,
      pricing_strategy: handoff.pricingStrategy,
      distribution_strategy: handoff.distributionStrategy,
      recommended_product_type: handoff.recommendedProductType,
      required_capabilities: handoff.requiredCapabilities as never,
      mvp_requirements: handoff.mvpRequirements as never,
      future_features: handoff.futureFeatures as never,
      economic_targets: handoff.economicTargets as never,
      budget_envelope: handoff.budgetEnvelope as never,
      risk_constraints: handoff.riskConstraints as never,
      validation_state: "post_bounded_validation_build",
      source_evidence_refs: handoff.sourceEvidenceRefs as never,
      handoff_status: "prepared",
    })
    .select("id")
    .single();

  if (error) throw error;
  return inserted.id;
}
