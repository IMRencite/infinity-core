import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { MonetizationRunStatus } from "./constants";
import type {
  BusinessModelRecommendation,
  EconomicViabilityResult,
  LoadedOpportunityCandidate,
  MonetizationCandidateAnalysis,
  MonetizationCostSummary,
  MonetizationEngineReport,
  MonetizationPlan,
  NormalizedMonetizationScores,
  ValidationExperimentDraft,
} from "./types";

export async function findMonetizationRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data, error } = await admin
    .from("monetization_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertMonetizationRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    correlationId: string;
    idempotencyKey: string;
    opportunityCandidateIds: string[];
    discoveryRunIds: string[];
  },
) {
  const { data, error } = await admin
    .from("monetization_runs")
    .insert({
      organization_id: input.organizationId,
      status: "requested",
      engine_version: "monetization_engine_v1",
      scoring_version: "monetization_scoring_v1",
      opportunity_candidate_ids: input.opportunityCandidateIds as never,
      discovery_run_ids: input.discoveryRunIds as never,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateMonetizationRun(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  patch: Database["public"]["Tables"]["monetization_runs"]["Update"],
) {
  const { error } = await admin
    .from("monetization_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);

  if (error) throw error;
}

export async function loadOpportunityCandidatesForMonetization(
  admin: AdminSupabaseClient,
  organizationId: string,
  candidateIds?: string[],
  maxCandidates = 5,
): Promise<LoadedOpportunityCandidate[]> {
  let query = admin
    .from("opportunity_candidates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("opportunity_score", { ascending: false, nullsFirst: false });

  if (candidateIds && candidateIds.length > 0) {
    query = query.in("id", candidateIds);
  } else {
    query = query.limit(maxCandidates);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).slice(0, maxCandidates).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    discoveryRunId: row.discovery_run_id,
    title: row.title,
    summary: row.summary,
    problem: row.problem,
    targetCustomer: row.target_customer,
    market: row.market,
    businessModelCandidates: Array.isArray(row.business_model_candidates)
      ? (row.business_model_candidates as string[])
      : [],
    revenueMechanismCandidates: Array.isArray(row.revenue_mechanism_candidates)
      ? (row.revenue_mechanism_candidates as string[])
      : [],
    monetizationEvidence: (row.monetization_evidence ?? []) as unknown[],
    demandEvidence: (row.demand_evidence ?? []) as unknown[],
    competitionEvidence: (row.competition_evidence ?? []) as unknown[],
    distributionEvidence: (row.distribution_evidence ?? []) as unknown[],
    buildabilityEvidence: (row.buildability_evidence ?? []) as unknown[],
    marketEvidence: (row.market_evidence ?? []) as unknown[],
    risks: (row.risks ?? []) as unknown[],
    unknowns: (row.unknowns ?? []) as unknown[],
    researchSources: (row.research_sources ?? []) as unknown[],
    researchRunIds: Array.isArray(row.research_run_ids) ? (row.research_run_ids as string[]) : [],
    opportunityScore: row.opportunity_score,
  }));
}

export async function selectDiverseCandidatesForTest(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<LoadedOpportunityCandidate[]> {
  const all = await loadOpportunityCandidatesForMonetization(admin, organizationId, undefined, 20);
  if (all.length === 0) return [];

  const selected: LoadedOpportunityCandidate[] = [];
  const usedIds = new Set<string>();

  const pick = (predicate: (c: LoadedOpportunityCandidate) => boolean) => {
    const match = all.find((c) => !usedIds.has(c.id) && predicate(c));
    if (match) {
      selected.push(match);
      usedIds.add(match.id);
    }
  };

  pick((c) =>
    c.businessModelCandidates.some((m) => /saas|software|api|workflow/i.test(m)) ||
    /saas|software|automation|platform|api/i.test(c.title),
  );
  pick((c) =>
    c.businessModelCandidates.some((m) => /content|seo|directory|publishing/i.test(m)) ||
    /content|seo|analytics|directory|newsletter/i.test(c.title),
  );
  pick((c) =>
    c.businessModelCandidates.some((m) => /marketplace/i.test(m)) ||
    /marketplace|platform|matching|b2b/i.test(c.title),
  );

  for (const candidate of all) {
    if (selected.length >= 3) break;
    if (!usedIds.has(candidate.id)) {
      selected.push(candidate);
      usedIds.add(candidate.id);
    }
  }

  return selected.slice(0, 3);
}

export async function persistMonetizationPlanBundle(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    monetizationRunId: string;
    plan: MonetizationPlan;
    scores: NormalizedMonetizationScores;
  },
): Promise<string> {
  const plan = input.plan;
  const { data: planRow, error: planError } = await admin
    .from("monetization_plans")
    .insert({
      organization_id: input.organizationId,
      monetization_run_id: input.monetizationRunId,
      opportunity_candidate_id: plan.opportunityCandidateId,
      discovery_run_id: plan.discoveryRunId,
      plan_role: plan.planRole,
      model_type: plan.modelType,
      model_name: plan.modelName,
      customer_type: plan.customerType,
      customer_description: plan.customerDescription,
      payer: plan.payer,
      beneficiary: plan.beneficiary,
      value_proposition: plan.valueProposition,
      purchase_trigger: plan.purchaseTrigger,
      offer_description: plan.offerDescription,
      pricing_model: plan.pricingModel,
      estimated_price_low: plan.estimatedPriceLow,
      estimated_price_base: plan.estimatedPriceBase,
      estimated_price_high: plan.estimatedPriceHigh,
      billing_frequency: plan.billingFrequency,
      estimated_customers_year1: plan.estimatedCustomersYear1,
      estimated_revenue_per_customer: plan.estimatedRevenuePerCustomer,
      estimated_gross_revenue_year1: plan.economicsDerived.estimatedGrossRevenueYear1,
      estimated_gross_margin_percent: plan.economicsDerived.estimatedGrossMarginPercent,
      estimated_variable_costs: plan.estimatedVariableCosts,
      estimated_fixed_costs: plan.estimatedFixedCosts,
      estimated_cac: plan.estimatedCAC,
      estimated_ltv: plan.economicsDerived.estimatedLTV,
      ltv_cac_ratio: plan.economicsDerived.ltvCacRatio,
      contribution_margin_per_customer: plan.economicsDerived.contributionMarginPerCustomer,
      break_even_customers: plan.economicsDerived.breakEvenCustomers,
      estimated_months_to_first_revenue: plan.estimatedMonthsToFirstRevenue,
      estimated_months_to_break_even: plan.estimatedMonthsToBreakEven,
      estimated_capital_required: plan.estimatedCapitalRequired,
      automation_potential: plan.automationPotential,
      scalability_score: plan.scalabilityScore,
      margin_score: plan.marginScore,
      speed_to_revenue_score: plan.speedToRevenueScore,
      customer_acquisition_difficulty: plan.customerAcquisitionDifficulty,
      technical_complexity: plan.technicalComplexity,
      operational_complexity: plan.operationalComplexity,
      regulatory_risk: plan.regulatoryRisk,
      platform_dependency_risk: plan.platformDependencyRisk,
      monetization_confidence: plan.monetizationConfidence,
      monetization_score: input.scores.monetizationScore,
      key_assumptions: plan.keyAssumptions as never,
      risks: plan.risks as never,
      source_urls: plan.sourceUrls as never,
      research_run_ids: plan.researchRunIds as never,
      economics_inputs: {
        estimatedCustomersYear1: plan.estimatedCustomersYear1,
        estimatedRevenuePerCustomer: plan.estimatedRevenuePerCustomer,
        estimatedVariableCosts: plan.estimatedVariableCosts,
        estimatedFixedCosts: plan.estimatedFixedCosts,
        estimatedCAC: plan.estimatedCAC,
      } as never,
      economics_derived: plan.economicsDerived as never,
    })
    .select("id")
    .single();

  if (planError) throw planError;

  if (plan.revenueStreams.length > 0) {
    const { error: streamError } = await admin.from("monetization_revenue_streams").insert(
      plan.revenueStreams.map((stream) => ({
        organization_id: input.organizationId,
        monetization_plan_id: planRow.id,
        monetization_run_id: input.monetizationRunId,
        stream_role: stream.streamRole,
        stream_name: stream.streamName,
        model_type: stream.modelType,
        description: stream.description,
        payer: stream.payer,
        pricing_model: stream.pricingModel,
        estimated_price_base: stream.estimatedPriceBase,
        billing_frequency: stream.billingFrequency,
        estimated_share_of_revenue_percent: stream.estimatedShareOfRevenuePercent,
        estimated_customers_year1: stream.estimatedCustomersYear1,
        estimated_revenue_year1:
          stream.estimatedCustomersYear1 != null && stream.estimatedPriceBase != null
            ? stream.estimatedCustomersYear1 * stream.estimatedPriceBase
            : null,
        automation_potential: plan.automationPotential,
      })),
    );
    if (streamError) throw streamError;
  }

  for (const assumption of plan.keyAssumptions) {
    await admin.from("monetization_assumptions").insert({
      organization_id: input.organizationId,
      monetization_plan_id: planRow.id,
      monetization_run_id: input.monetizationRunId,
      assumption_key: assumption.slice(0, 120),
      assumption_value: assumption,
      assumption_category: "economic",
      confidence: plan.monetizationConfidence,
      source_type: "model_inference",
    });
  }

  if (plan.evidence.length > 0) {
    const { error: evidenceError } = await admin.from("monetization_evidence").insert(
      plan.evidence.map((item) => ({
        organization_id: input.organizationId,
        monetization_plan_id: planRow.id,
        monetization_run_id: input.monetizationRunId,
        opportunity_candidate_id: plan.opportunityCandidateId,
        research_run_id: plan.researchRunIds[0] ?? null,
        evidence_type: item.evidenceType,
        title: item.title,
        claim: item.claim,
        summary: item.summary,
        source_url: item.sourceUrls[0] ?? null,
        grounded: item.grounded,
        extracted_data: {
          sourceUrls: item.sourceUrls,
          limitations: item.limitations,
        } as never,
      })),
    );
    if (evidenceError) throw evidenceError;
  }

  if (plan.scenarios.length > 0) {
    const { error: scenarioError } = await admin.from("monetization_scenarios").insert(
      plan.scenarios.map((scenario) => ({
        organization_id: input.organizationId,
        monetization_plan_id: planRow.id,
        monetization_run_id: input.monetizationRunId,
        scenario_type: scenario.scenarioType,
        milestone_month: scenario.milestoneMonth,
        estimated_customers: scenario.estimatedCustomers,
        estimated_revenue: scenario.estimatedRevenue,
        estimated_cost: scenario.estimatedCost,
        estimated_gross_profit: scenario.estimatedGrossProfit,
        assumptions: scenario.assumptions as never,
      })),
    );
    if (scenarioError) throw scenarioError;
  }

  const { error: scoreError } = await admin.from("monetization_plan_scores").insert({
    organization_id: input.organizationId,
    monetization_plan_id: planRow.id,
    monetization_run_id: input.monetizationRunId,
    scoring_version: input.scores.scoringVersion,
    revenue_potential_score: input.scores.revenuePotentialScore,
    margin_potential_score: input.scores.marginPotentialScore,
    speed_to_revenue_score: input.scores.speedToRevenueScore,
    recurring_revenue_potential_score: input.scores.recurringRevenuePotentialScore,
    automation_potential_score: input.scores.automationPotentialScore,
    scalability_score: input.scores.scalabilityScore,
    customer_acquisition_feasibility_score: input.scores.customerAcquisitionFeasibilityScore,
    capital_efficiency_score: input.scores.capitalEfficiencyScore,
    competition_score: input.scores.competitionScore,
    platform_dependency_score: input.scores.platformDependencyScore,
    operational_complexity_score: input.scores.operationalComplexityScore,
    technical_complexity_score: input.scores.technicalComplexityScore,
    evidence_confidence_score: input.scores.evidenceConfidenceScore,
    monetization_score: input.scores.monetizationScore,
    weighted_breakdown: input.scores.weightedBreakdown as never,
    scoring_inputs: input.scores.scoringInputs as never,
  });

  if (scoreError) throw scoreError;
  return planRow.id;
}

export async function persistCandidateAnalysis(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    monetizationRunId: string;
    candidate: LoadedOpportunityCandidate;
    primaryPlanId: string | null;
    viability: EconomicViabilityResult;
    recommendation: BusinessModelRecommendation;
    researchRunIds: string[];
    plans: MonetizationPlan[];
    validationExperiments: ValidationExperimentDraft[];
  },
): Promise<MonetizationCandidateAnalysis> {
  const bestScore = input.plans.reduce(
    (max, plan) => Math.max(max, plan.monetizationScore),
    0,
  );

  const { data: analysisRow, error: analysisError } = await admin
    .from("monetization_candidate_analyses")
    .insert({
      organization_id: input.organizationId,
      monetization_run_id: input.monetizationRunId,
      opportunity_candidate_id: input.candidate.id,
      discovery_run_id: input.candidate.discoveryRunId,
      primary_plan_id: input.primaryPlanId,
      opportunity_score: input.viability.opportunityScore,
      monetization_score: bestScore,
      combined_decision_score: input.viability.combinedDecisionScore,
      economic_viability: input.viability.state,
      recommended_primary_model: input.recommendation.recommendedPrimaryModel,
      recommended_secondary_models: input.recommendation.recommendedSecondaryModels as never,
      recommended_pricing_strategy: input.recommendation.recommendedPricingStrategy,
      recommended_customer: input.recommendation.recommendedCustomer,
      recommended_acquisition_strategy: input.recommendation.recommendedAcquisitionStrategy,
      expected_revenue_mechanism: input.recommendation.expectedRevenueMechanism,
      expected_time_to_revenue: input.recommendation.expectedTimeToRevenue,
      estimated_startup_capital: input.recommendation.estimatedStartupCapital,
      key_economic_assumptions: input.recommendation.keyEconomicAssumptions as never,
      largest_economic_risks: input.recommendation.largestEconomicRisks as never,
      recommendation_confidence: input.recommendation.confidence,
      research_run_ids: input.researchRunIds as never,
    })
    .select("*")
    .single();

  if (analysisError) throw analysisError;

  if (input.validationExperiments.length > 0) {
    const { error: experimentError } = await admin
      .from("monetization_validation_experiments")
      .insert(
        input.validationExperiments.map((experiment) => ({
          organization_id: input.organizationId,
          monetization_run_id: input.monetizationRunId,
          opportunity_candidate_id: input.candidate.id,
          monetization_plan_id: input.primaryPlanId,
          experiment_type: experiment.experimentType,
          title: experiment.title,
          description: experiment.description,
          estimated_cost_usd: experiment.estimatedCostUsd,
          priority: experiment.priority,
          execution_status: "recommended",
        })),
      );
    if (experimentError) throw experimentError;
  }

  return {
    id: analysisRow.id,
    opportunityCandidateId: input.candidate.id,
    candidateTitle: input.candidate.title,
    opportunityScore: input.viability.opportunityScore,
    monetizationScore: bestScore,
    combinedDecisionScore: input.viability.combinedDecisionScore,
    economicViability: input.viability.state,
    primaryPlanId: input.primaryPlanId,
    recommendation: input.recommendation,
    researchRunIds: input.researchRunIds,
    plans: input.plans,
  };
}

export function buildMonetizationEngineReport(input: {
  analyses: MonetizationCandidateAnalysis[];
  researchRunIds: string[];
  plansGenerated: number;
  revenueStreamsGenerated: number;
  costSummary: MonetizationCostSummary;
}): MonetizationEngineReport {
  return {
    engineVersion: "monetization_engine_v1",
    scoringVersion: "monetization_scoring_v1",
    candidatesAnalyzed: input.analyses.length,
    plansGenerated: input.plansGenerated,
    revenueStreamsGenerated: input.revenueStreamsGenerated,
    researchRunIds: input.researchRunIds,
    analyses: input.analyses.map((analysis) => ({
      candidateId: analysis.opportunityCandidateId,
      candidateTitle: analysis.candidateTitle,
      economicViability: analysis.economicViability,
      monetizationScore: analysis.monetizationScore,
      combinedDecisionScore: analysis.combinedDecisionScore,
      primaryModel: analysis.recommendation.recommendedPrimaryModel,
      planCount: analysis.plans.length,
      revenueStreamCount: analysis.plans.reduce(
        (sum, plan) => sum + plan.revenueStreams.length,
        0,
      ),
      validationExperimentCount: analysis.recommendation.validationExperiments.length,
    })),
    costSummary: input.costSummary,
    completedAt: new Date().toISOString(),
  };
}

export async function markMonetizationRunFailed(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  input: { classification: string; message: string; status?: MonetizationRunStatus },
) {
  await updateMonetizationRun(admin, organizationId, runId, {
    status: input.status ?? "failed",
    failure_classification: input.classification,
    error_message: input.message,
    failed_at: new Date().toISOString(),
  });
}
