import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { VENTURE_SELECTION_LIMITS } from "./constants";
import type {
  CandidateEvaluationDraft,
  ResourceAllocationSnapshot,
  VentureSelectionReport,
} from "./types";

export async function findVentureSelectionRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data, error } = await admin
    .from("venture_selection_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertVentureSelectionRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    correlationId: string;
    idempotencyKey: string;
    opportunityCandidateIds: string[];
    discoveryRunIds: string[];
    monetizationRunIds: string[];
    monetizationRunId?: string | null;
  },
) {
  const { data, error } = await admin
    .from("venture_selection_runs")
    .insert({
      organization_id: input.organizationId,
      status: "requested",
      engine_version: "venture_selection_v1",
      scoring_version: "venture_selection_scoring_v1",
      monetization_run_id: input.monetizationRunId ?? null,
      opportunity_candidate_ids: input.opportunityCandidateIds as never,
      discovery_run_ids: input.discoveryRunIds as never,
      monetization_run_ids: input.monetizationRunIds as never,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateVentureSelectionRun(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  patch: Database["public"]["Tables"]["venture_selection_runs"]["Update"],
) {
  const { error } = await admin
    .from("venture_selection_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);
  if (error) throw error;
}

function clampScore(value: number | null | undefined, max = 100): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(Math.max(0, Math.min(max, value)) * 100) / 100;
}

function clampRatio(value: number | null | undefined, max = 9999.9999): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(Math.max(0, Math.min(max, value)) * 10000) / 10000;
}

function clampMoney(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(Math.max(-999999999999, Math.min(999999999999, value)) * 100) / 100;
}

function addDays(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString();
}

export async function persistCandidateEvaluationBundle(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    ventureSelectionRunId: string;
    evaluation: CandidateEvaluationDraft;
    queueRank: number;
  },
): Promise<string> {
  const evaluation = input.evaluation;
  const candidate = evaluation.candidate;
  const now = new Date();

  const { data: evaluationRow, error: evaluationError } = await admin
    .from("candidate_selection_evaluations")
    .insert({
      organization_id: input.organizationId,
      venture_selection_run_id: input.ventureSelectionRunId,
      opportunity_candidate_id: candidate.candidateId,
      monetization_run_id: candidate.monetization?.monetizationRunId ?? null,
      monetization_analysis_id: candidate.monetization?.analysisId ?? null,
      primary_plan_id: candidate.monetization?.primaryPlanId ?? null,
      discovery_run_id: candidate.discoveryRunId,
      opportunity_score: clampScore(candidate.opportunityScore),
      monetization_score: clampScore(candidate.monetization?.monetizationScore ?? null),
      validation_score: clampScore(evaluation.validationScore),
      buildability_score: clampScore(evaluation.buildability.buildabilityScore),
      selection_score: clampScore(evaluation.selectionScore),
      portfolio_adjusted_score: clampScore(evaluation.portfolioAdjustedScore),
      decision: input.evaluation.decision,
      recommended_next_action: input.evaluation.recommendedNextAction,
      estimated_capital_required:
        candidate.monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
      expected_12_month_revenue: clampMoney(evaluation.expectedValueDerived.probabilityAdjustedRevenue),
      expected_12_month_profit: clampMoney(evaluation.expectedValueDerived.expected12MonthProfit),
      expected_roi: clampRatio(evaluation.expectedValueDerived.expectedRoi),
      estimated_time_to_revenue: clampScore(
        input.evaluation.speedToValue.estimatedTimeToFirstRevenueDays,
        999.99,
      ),
      primary_monetization_model:
        candidate.monetization?.recommendation.recommendedPrimaryModel ?? null,
      confidence: clampRatio(input.evaluation.confidence),
      fatal_assumption_risk_score: clampRatio(input.evaluation.fatalAssumptionRiskScore, 1),
      assumption_uncertainty_score: clampRatio(input.evaluation.assumptionUncertaintyScore, 1),
      blocking_assumptions: input.evaluation.blockingAssumptions as never,
      dependency_tags: input.evaluation.dependencyTags as never,
      correlation_penalties: input.evaluation.correlationPenalties as never,
      validation_dimensions: input.evaluation.validationDimensions as never,
      expected_value_inputs: input.evaluation.expectedValueInputs as never,
      expected_value_derived: input.evaluation.expectedValueDerived as never,
      speed_to_value: input.evaluation.speedToValue as never,
      capital_efficiency: input.evaluation.capitalEfficiencyMetrics as never,
      evaluated_at: now.toISOString(),
      evidence_freshness: now.toISOString(),
      recheck_after: addDays(now, VENTURE_SELECTION_LIMITS.recheckAfterDays),
      stale_after: addDays(now, VENTURE_SELECTION_LIMITS.staleAfterDays),
      queue_rank: input.queueRank,
      queue_reason: input.evaluation.queueReason,
    })
    .select("id")
    .single();

  if (evaluationError) throw evaluationError;

  if (input.evaluation.assumptions.length > 0) {
    await admin.from("candidate_assumptions").insert(
      input.evaluation.assumptions.map((assumption) => ({
        organization_id: input.organizationId,
        venture_selection_run_id: input.ventureSelectionRunId,
        candidate_selection_evaluation_id: evaluationRow.id,
        opportunity_candidate_id: candidate.candidateId,
        assumption: assumption.assumption,
        category: assumption.category,
        assumption_type: assumption.assumptionType,
        value: assumption.value,
        confidence: clampRatio(assumption.confidence, 1),
        evidence: assumption.evidence as never,
        source_urls: assumption.sourceUrls as never,
        impact_if_wrong: assumption.impactIfWrong,
        validation_method: assumption.validationMethod,
        validation_cost_estimate: clampMoney(assumption.validationCostEstimate),
        validation_time_estimate: clampScore(assumption.validationTimeEstimate, 999.99),
        impact_score: clampRatio(assumption.impactScore, 1),
        uncertainty_score: clampRatio(assumption.uncertaintyScore, 1),
        fatal_risk_contribution: clampRatio(assumption.fatalRiskContribution, 1),
      })),
    );
  }

  await admin.from("buildability_assessments").insert({
    organization_id: input.organizationId,
    venture_selection_run_id: input.ventureSelectionRunId,
    candidate_selection_evaluation_id: evaluationRow.id,
    opportunity_candidate_id: candidate.candidateId,
    buildability_score: clampScore(input.evaluation.buildability.buildabilityScore) ?? 0,
    automation_score: clampScore(input.evaluation.buildability.automationScore),
    operational_autonomy_score: clampScore(input.evaluation.buildability.operationalAutonomyScore),
    external_dependency_score: clampScore(input.evaluation.buildability.externalDependencyScore),
    can_build_software: input.evaluation.buildability.canBuildSoftware,
    can_automate_acquisition: input.evaluation.buildability.canAutomateAcquisition,
    can_automate_fulfillment: input.evaluation.buildability.canAutomateFulfillment,
    can_automate_support: input.evaluation.buildability.canAutomateSupport,
    requires_physical_inventory: input.evaluation.buildability.requiresPhysicalInventory,
    requires_specialized_employees: input.evaluation.buildability.requiresSpecializedEmployees,
    requires_licensing: input.evaluation.buildability.requiresLicensing,
    requires_large_upfront_capital: input.evaluation.buildability.requiresLargeUpfrontCapital,
    depends_on_manual_sales: input.evaluation.buildability.dependsOnManualSales,
    depends_on_inaccessible_systems: input.evaluation.buildability.dependsOnInaccessibleSystems,
    can_deliver_digitally: input.evaluation.buildability.canDeliverDigitally,
    assessment_inputs: input.evaluation.buildability.assessmentInputs as never,
    assessment_notes: input.evaluation.buildability.assessmentNotes as never,
  });

  if (input.evaluation.experimentPriorities.length > 0) {
    await admin.from("validation_experiment_priorities").insert(
      input.evaluation.experimentPriorities.map((experiment) => ({
        organization_id: input.organizationId,
        venture_selection_run_id: input.ventureSelectionRunId,
        candidate_selection_evaluation_id: evaluationRow.id,
        opportunity_candidate_id: candidate.candidateId,
        monetization_experiment_id: experiment.monetizationExperimentId ?? null,
        experiment_type: experiment.experimentType,
        title: experiment.title,
        description: experiment.description,
        priority_rank: experiment.priorityRank,
        priority_score: clampRatio(experiment.priorityScore, 9999.9999),
        information_gain_score: clampRatio(experiment.informationGainScore, 1),
        assumption_impact_score: clampRatio(experiment.assumptionImpactScore, 1),
        uncertainty_score: clampRatio(experiment.uncertaintyScore, 1),
        estimated_cost_usd: clampMoney(experiment.estimatedCostUsd),
        estimated_time_days: clampScore(experiment.estimatedTimeDays, 999.99),
      })),
    );
  }

  if (input.evaluation.adversarialReview) {
    await admin.from("adversarial_reviews").insert({
      organization_id: input.organizationId,
      venture_selection_run_id: input.ventureSelectionRunId,
      candidate_selection_evaluation_id: evaluationRow.id,
      opportunity_candidate_id: candidate.candidateId,
      provider: input.evaluation.adversarialReview.provider,
      model: input.evaluation.adversarialReview.model,
      findings: input.evaluation.adversarialReview.findings as never,
      risk_inputs: input.evaluation.adversarialReview.riskInputs as never,
      summary: input.evaluation.adversarialReview.summary,
      confidence: clampRatio(input.evaluation.adversarialReview.confidence, 1),
      token_usage: input.evaluation.adversarialReview.tokenUsage as never,
      estimated_cost_usd: input.evaluation.adversarialReview.estimatedCostUsd,
    });
  }

  await admin.from("selection_explanations").insert({
    organization_id: input.organizationId,
    venture_selection_run_id: input.ventureSelectionRunId,
    candidate_selection_evaluation_id: evaluationRow.id,
    opportunity_candidate_id: candidate.candidateId,
    why_this_opportunity: input.evaluation.explanation.whyThisOpportunity,
    why_now: input.evaluation.explanation.whyNow,
    why_infinity_can_build_it: input.evaluation.explanation.whyInfinityCanBuildIt,
    why_customers_will_pay: input.evaluation.explanation.whyCustomersWillPay,
    why_this_model: input.evaluation.explanation.whyThisModel,
    why_it_ranks_above_alternatives: input.evaluation.explanation.whyItRanksAboveAlternatives,
    largest_risks: input.evaluation.explanation.largestRisks as never,
    fatal_assumptions: input.evaluation.explanation.fatalAssumptions as never,
    validation_needed: input.evaluation.explanation.validationNeeded as never,
    expected_economics: input.evaluation.explanation.expectedEconomics as never,
    resource_requirements: input.evaluation.explanation.resourceRequirements as never,
    confidence: clampRatio(input.evaluation.explanation.confidence, 1),
  });

  await admin.from("venture_queue_items").insert({
    organization_id: input.organizationId,
    venture_selection_run_id: input.ventureSelectionRunId,
    candidate_selection_evaluation_id: evaluationRow.id,
    opportunity_candidate_id: candidate.candidateId,
    queue_rank: input.queueRank,
    decision: input.evaluation.decision,
    recommended_next_action: input.evaluation.recommendedNextAction,
    selection_score: clampScore(input.evaluation.selectionScore) ?? 0,
    portfolio_adjusted_score: clampScore(input.evaluation.portfolioAdjustedScore) ?? 0,
    opportunity_score: clampScore(candidate.opportunityScore),
    monetization_score: clampScore(candidate.monetization?.monetizationScore ?? null),
    validation_score: clampScore(input.evaluation.validationScore),
    buildability_score: clampScore(input.evaluation.buildability.buildabilityScore),
    estimated_capital_required:
      candidate.monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
    expected_12_month_revenue: clampMoney(input.evaluation.expectedValueDerived.probabilityAdjustedRevenue),
    expected_12_month_profit: clampMoney(input.evaluation.expectedValueDerived.expected12MonthProfit),
    expected_roi: clampRatio(input.evaluation.expectedValueDerived.expectedRoi),
    estimated_time_to_revenue: clampScore(
      input.evaluation.speedToValue.estimatedTimeToFirstRevenueDays,
      999.99,
    ),
    primary_monetization_model:
      candidate.monetization?.recommendation.recommendedPrimaryModel ?? null,
    confidence: clampRatio(input.evaluation.confidence, 1),
    blocking_assumptions: input.evaluation.blockingAssumptions as never,
    recommended_validation_experiments: input.evaluation.experimentPriorities.slice(0, 5) as never,
    queue_reason: input.evaluation.queueReason,
    evaluated_at: now.toISOString(),
    recheck_after: addDays(now, VENTURE_SELECTION_LIMITS.recheckAfterDays),
    stale_after: addDays(now, VENTURE_SELECTION_LIMITS.staleAfterDays),
  });

  if (input.evaluation.handoff) {
    await admin.from("venture_selection_handovers").insert({
      organization_id: input.organizationId,
      venture_selection_run_id: input.ventureSelectionRunId,
      candidate_selection_evaluation_id: evaluationRow.id,
      opportunity_candidate_id: candidate.candidateId,
      business_concept: input.evaluation.handoff.businessConcept,
      target_customer: input.evaluation.handoff.targetCustomer,
      problem: input.evaluation.handoff.problem,
      solution: input.evaluation.handoff.solution,
      primary_monetization_model: input.evaluation.handoff.primaryMonetizationModel,
      secondary_revenue_streams: input.evaluation.handoff.secondaryRevenueStreams as never,
      pricing_strategy: input.evaluation.handoff.pricingStrategy,
      distribution_strategy: input.evaluation.handoff.distributionStrategy,
      recommended_product_type: input.evaluation.handoff.recommendedProductType,
      required_capabilities: input.evaluation.handoff.requiredCapabilities as never,
      mvp_requirements: input.evaluation.handoff.mvpRequirements as never,
      future_features: input.evaluation.handoff.futureFeatures as never,
      economic_targets: input.evaluation.handoff.economicTargets as never,
      budget_envelope: input.evaluation.handoff.budgetEnvelope as never,
      risk_constraints: input.evaluation.handoff.riskConstraints as never,
      validation_state: input.evaluation.handoff.validationState,
      source_evidence_refs: input.evaluation.handoff.sourceEvidenceRefs as never,
      handoff_status: "prepared",
    });
  }

  return evaluationRow.id;
}

export async function persistResourceAllocationSnapshot(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    ventureSelectionRunId: string;
    snapshot: ResourceAllocationSnapshot;
  },
) {
  await admin.from("resource_allocation_snapshots").insert({
    organization_id: input.organizationId,
    venture_selection_run_id: input.ventureSelectionRunId,
    constraints: input.snapshot.constraints as never,
    allocations: input.snapshot.allocations as never,
    unallocated_candidates: input.snapshot.unallocatedCandidates as never,
    summary: input.snapshot.summary as never,
  });
}

export function buildVentureSelectionReport(input: {
  evaluations: CandidateEvaluationDraft[];
  reasoningRunIds: string[];
  costSummary: VentureSelectionReport["costSummary"];
}): VentureSelectionReport {
  const counts = { BUILD: 0, VALIDATE: 0, HOLD: 0, REJECT: 0 };
  for (const evaluation of input.evaluations) {
    counts[evaluation.decision] += 1;
  }

  return {
    engineVersion: "venture_selection_v1",
    scoringVersion: "venture_selection_scoring_v1",
    candidatesEvaluated: input.evaluations.length,
    buildCount: counts.BUILD,
    validateCount: counts.VALIDATE,
    holdCount: counts.HOLD,
    rejectCount: counts.REJECT,
    handoffsCreated: input.evaluations.filter((item) => item.handoff != null).length,
    queue: input.evaluations.map((evaluation, index) => ({
      rank: index + 1,
      candidateId: evaluation.candidate.candidateId,
      candidateTitle: evaluation.candidate.title,
      decision: evaluation.decision,
      selectionScore: evaluation.selectionScore,
      portfolioAdjustedScore: evaluation.portfolioAdjustedScore,
      opportunityScore: evaluation.candidate.opportunityScore ?? 0,
      monetizationScore: evaluation.candidate.monetization?.monetizationScore ?? 0,
      validationScore: evaluation.validationScore,
      buildabilityScore: evaluation.buildability.buildabilityScore,
    })),
    reasoningRunIds: input.reasoningRunIds,
    costSummary: input.costSummary,
    completedAt: new Date().toISOString(),
  };
}

export async function markVentureSelectionRunFailed(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  input: { classification: string; message: string; status?: string },
) {
  await updateVentureSelectionRun(admin, organizationId, runId, {
    status: input.status ?? "failed",
    failure_classification: input.classification,
    error_message: input.message,
    failed_at: new Date().toISOString(),
  });
}
