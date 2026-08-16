import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { LoadedCandidateBundle, LoadedMonetizationBundle, LoadedMonetizationPlan } from "../types";

export function mapPlanRow(row: Record<string, unknown>): LoadedMonetizationPlan {
  return {
    id: String(row.id),
    modelType: String(row.model_type ?? "other"),
    modelName: String(row.model_name ?? ""),
    monetizationScore: row.monetization_score != null ? Number(row.monetization_score) : null,
    estimatedCapitalRequired:
      row.estimated_capital_required != null ? Number(row.estimated_capital_required) : null,
    estimatedPriceBase:
      row.estimated_price_base != null ? Number(row.estimated_price_base) : null,
    estimatedCustomersYear1:
      row.estimated_customers_year1 != null ? Number(row.estimated_customers_year1) : null,
    estimatedMonthsToFirstRevenue:
      row.estimated_months_to_first_revenue != null
        ? Number(row.estimated_months_to_first_revenue)
        : null,
    estimatedGrossRevenueYear1:
      row.estimated_gross_revenue_year1 != null ? Number(row.estimated_gross_revenue_year1) : null,
    estimatedGrossMarginPercent:
      row.estimated_gross_margin_percent != null ? Number(row.estimated_gross_margin_percent) : null,
    estimatedFixedCosts:
      row.estimated_fixed_costs != null ? Number(row.estimated_fixed_costs) : null,
    estimatedVariableCosts:
      row.estimated_variable_costs != null ? Number(row.estimated_variable_costs) : null,
    estimatedCAC: row.estimated_cac != null ? Number(row.estimated_cac) : null,
    estimatedLTV: row.estimated_ltv != null ? Number(row.estimated_ltv) : null,
    ltvCacRatio: row.ltv_cac_ratio != null ? Number(row.ltv_cac_ratio) : null,
    automationPotential:
      row.automation_potential != null ? Number(row.automation_potential) : null,
    technicalComplexity:
      row.technical_complexity != null ? Number(row.technical_complexity) : null,
    operationalComplexity:
      row.operational_complexity != null ? Number(row.operational_complexity) : null,
    regulatoryRisk: row.regulatory_risk != null ? Number(row.regulatory_risk) : null,
    platformDependencyRisk:
      row.platform_dependency_risk != null ? Number(row.platform_dependency_risk) : null,
    customerAcquisitionDifficulty:
      row.customer_acquisition_difficulty != null
        ? Number(row.customer_acquisition_difficulty)
        : null,
    keyAssumptions: Array.isArray(row.key_assumptions) ? (row.key_assumptions as string[]) : [],
    risks: Array.isArray(row.risks) ? (row.risks as string[]) : [],
    sourceUrls: Array.isArray(row.source_urls) ? (row.source_urls as string[]) : [],
    revenueStreams: [],
  };
}

export async function loadCandidateBundlesForSelection(
  admin: AdminSupabaseClient,
  organizationId: string,
  input?: { candidateIds?: string[]; monetizationRunId?: string; maxCandidates?: number },
): Promise<LoadedCandidateBundle[]> {
  let candidateQuery = admin
    .from("opportunity_candidates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("opportunity_score", { ascending: false, nullsFirst: false });

  if (input?.candidateIds?.length) {
    candidateQuery = candidateQuery.in("id", input.candidateIds);
  } else {
    candidateQuery = candidateQuery.limit(input?.maxCandidates ?? 10);
  }

  const { data: candidates, error: candidateError } = await candidateQuery;
  if (candidateError) throw candidateError;
  if (!candidates?.length) return [];

  const bundles: LoadedCandidateBundle[] = [];

  for (const candidate of candidates.slice(0, input?.maxCandidates ?? 10)) {
    let analysisQuery = admin
      .from("monetization_candidate_analyses")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_candidate_id", candidate.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (input?.monetizationRunId) {
      analysisQuery = analysisQuery.eq("monetization_run_id", input.monetizationRunId);
    }

    const { data: analyses } = await analysisQuery;
    const analysis = analyses?.[0] ?? null;

    let monetization: LoadedMonetizationBundle | null = null;

    if (analysis) {
      const { data: plans } = await admin
        .from("monetization_plans")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("monetization_run_id", analysis.monetization_run_id)
        .eq("opportunity_candidate_id", candidate.id);

      const { data: streams } = await admin
        .from("monetization_revenue_streams")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("monetization_run_id", analysis.monetization_run_id);

      const { data: experiments } = await admin
        .from("monetization_validation_experiments")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("opportunity_candidate_id", candidate.id)
        .eq("monetization_run_id", analysis.monetization_run_id);

      const mappedPlans = (plans ?? []).map((plan) => {
        const mapped = mapPlanRow(plan as Record<string, unknown>);
        mapped.revenueStreams = (streams ?? [])
          .filter((stream) => stream.monetization_plan_id === plan.id)
          .map((stream) => ({
            streamName: stream.stream_name,
            modelType: stream.model_type,
            streamRole: stream.stream_role,
          }));
        return mapped;
      });

      const primaryPlan =
        mappedPlans.find((plan) => plan.id === analysis.primary_plan_id) ??
        mappedPlans.sort((a, b) => (b.monetizationScore ?? 0) - (a.monetizationScore ?? 0))[0] ??
        null;

      monetization = {
        monetizationRunId: analysis.monetization_run_id,
        analysisId: analysis.id,
        primaryPlanId: analysis.primary_plan_id,
        monetizationScore: Number(analysis.monetization_score ?? 0),
        combinedDecisionScore: Number(analysis.combined_decision_score ?? 0),
        economicViability: analysis.economic_viability,
        recommendation: {
          recommendedPrimaryModel: analysis.recommended_primary_model ?? "",
          recommendedSecondaryModels: Array.isArray(analysis.recommended_secondary_models)
            ? (analysis.recommended_secondary_models as string[])
            : [],
          recommendedPricingStrategy: analysis.recommended_pricing_strategy ?? "",
          recommendedCustomer: analysis.recommended_customer ?? "",
          recommendedAcquisitionStrategy: analysis.recommended_acquisition_strategy ?? "",
          expectedRevenueMechanism: analysis.expected_revenue_mechanism ?? "",
          expectedTimeToRevenue: analysis.expected_time_to_revenue ?? "",
          estimatedStartupCapital:
            analysis.estimated_startup_capital != null
              ? Number(analysis.estimated_startup_capital)
              : null,
          keyEconomicAssumptions: Array.isArray(analysis.key_economic_assumptions)
            ? (analysis.key_economic_assumptions as string[])
            : [],
          largestEconomicRisks: Array.isArray(analysis.largest_economic_risks)
            ? (analysis.largest_economic_risks as string[])
            : [],
          confidence: Number(analysis.recommendation_confidence ?? 0.5),
        },
        primaryPlan,
        allPlans: mappedPlans,
        validationExperiments: (experiments ?? []).map((experiment) => ({
          id: experiment.id,
          experimentType: experiment.experiment_type,
          title: experiment.title,
          description: experiment.description,
          estimatedCostUsd:
            experiment.estimated_cost_usd != null ? Number(experiment.estimated_cost_usd) : null,
          priority: experiment.priority,
        })),
      };
    }

    bundles.push({
      candidateId: candidate.id,
      discoveryRunId: candidate.discovery_run_id,
      title: candidate.title,
      summary: candidate.summary,
      problem: candidate.problem,
      targetCustomer: candidate.target_customer,
      market: candidate.market,
      businessModelCandidates: Array.isArray(candidate.business_model_candidates)
        ? (candidate.business_model_candidates as string[])
        : [],
      revenueMechanismCandidates: Array.isArray(candidate.revenue_mechanism_candidates)
        ? (candidate.revenue_mechanism_candidates as string[])
        : [],
      opportunityScore: candidate.opportunity_score != null ? Number(candidate.opportunity_score) : null,
      demandEvidence: (candidate.demand_evidence ?? []) as unknown[],
      monetizationEvidence: (candidate.monetization_evidence ?? []) as unknown[],
      competitionEvidence: (candidate.competition_evidence ?? []) as unknown[],
      distributionEvidence: (candidate.distribution_evidence ?? []) as unknown[],
      buildabilityEvidence: (candidate.buildability_evidence ?? []) as unknown[],
      risks: (candidate.risks ?? []) as unknown[],
      researchSources: (candidate.research_sources ?? []) as unknown[],
      researchRunIds: Array.isArray(candidate.research_run_ids)
        ? (candidate.research_run_ids as string[])
        : [],
      monetization,
    });
  }

  return bundles.filter((bundle) => bundle.monetization != null);
}
