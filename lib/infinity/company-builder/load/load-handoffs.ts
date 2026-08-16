import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { buildVentureSelectionHandoff } from "@/lib/infinity/venture-selection/explanation/generate";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";
import { loadCandidateBundlesForSelection } from "@/lib/infinity/venture-selection/load/load-candidates";
import type { LoadedVentureSelectionHandoff } from "../types";

function mapHandoffRow(row: Record<string, unknown>, evaluationDecision: string | null): LoadedVentureSelectionHandoff {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    ventureSelectionRunId: row.venture_selection_run_id ? String(row.venture_selection_run_id) : null,
    candidateSelectionEvaluationId: row.candidate_selection_evaluation_id
      ? String(row.candidate_selection_evaluation_id)
      : null,
    opportunityCandidateId: row.opportunity_candidate_id ? String(row.opportunity_candidate_id) : null,
    discoveryRunId: null,
    monetizationRunId: null,
    businessConcept: String(row.business_concept ?? ""),
    targetCustomer: String(row.target_customer ?? ""),
    problem: String(row.problem ?? ""),
    solution: String(row.solution ?? ""),
    primaryMonetizationModel: String(row.primary_monetization_model ?? ""),
    secondaryRevenueStreams: Array.isArray(row.secondary_revenue_streams)
      ? (row.secondary_revenue_streams as string[])
      : [],
    pricingStrategy: String(row.pricing_strategy ?? ""),
    distributionStrategy: String(row.distribution_strategy ?? ""),
    recommendedProductType: String(row.recommended_product_type ?? "hybrid"),
    requiredCapabilities: Array.isArray(row.required_capabilities) ? (row.required_capabilities as string[]) : [],
    mvpRequirements: Array.isArray(row.mvp_requirements) ? (row.mvp_requirements as string[]) : [],
    futureFeatures: Array.isArray(row.future_features) ? (row.future_features as string[]) : [],
    economicTargets: (row.economic_targets as Record<string, number | null>) ?? {},
    budgetEnvelope: (row.budget_envelope as Record<string, number | null>) ?? {},
    riskConstraints: (row.risk_constraints as Record<string, unknown>) ?? {},
    validationState: String(row.validation_state ?? ""),
    sourceEvidenceRefs: Array.isArray(row.source_evidence_refs) ? (row.source_evidence_refs as string[]) : [],
    handoffStatus: String(row.handoff_status ?? "prepared"),
    decision: evaluationDecision,
    simulationOnly: false,
  };
}

export async function loadPreparedBuildHandoffs(
  admin: AdminSupabaseClient,
  organizationId: string,
  handoffIds?: string[],
): Promise<LoadedVentureSelectionHandoff[]> {
  let query = admin
    .from("venture_selection_handovers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("handoff_status", "prepared")
    .order("created_at", { ascending: false });

  if (handoffIds?.length) query = query.in("id", handoffIds);

  const { data: handoffs, error } = await query;
  if (error) throw error;
  if (!handoffs?.length) return [];

  const results: LoadedVentureSelectionHandoff[] = [];
  for (const handoff of handoffs) {
    const { data: evaluation } = await admin
      .from("candidate_selection_evaluations")
      .select("decision, discovery_run_id, monetization_run_id")
      .eq("id", handoff.candidate_selection_evaluation_id)
      .maybeSingle();

    if (evaluation?.decision !== "BUILD") continue;

    const mapped = mapHandoffRow(handoff as Record<string, unknown>, evaluation.decision);
    mapped.discoveryRunId = evaluation.discovery_run_id;
    mapped.monetizationRunId = evaluation.monetization_run_id;

    const { data: candidate } = await admin
      .from("opportunity_candidates")
      .select("title, summary, business_model_candidates, discovery_run_id")
      .eq("id", handoff.opportunity_candidate_id)
      .maybeSingle();

    if (candidate) {
      mapped.candidateTitle = candidate.title ?? undefined;
      mapped.candidateSummary = candidate.summary ?? undefined;
      mapped.businessModelCandidates = Array.isArray(candidate.business_model_candidates)
        ? (candidate.business_model_candidates as string[])
        : [];
      mapped.discoveryRunId = mapped.discoveryRunId ?? candidate.discovery_run_id;
    }

    results.push(mapped);
  }

  return results;
}

function buildEvaluationDraftFromBundle(
  bundle: Awaited<ReturnType<typeof loadCandidateBundlesForSelection>>[number],
): CandidateEvaluationDraft {
  return {
    candidate: bundle,
    assumptions: [],
    fatalAssumptionRiskScore: 0.4,
    assumptionUncertaintyScore: 0.4,
    blockingAssumptions: [],
    validationScore: 65,
    validationDimensions: {},
    buildability: {
      buildabilityScore: 65,
      automationScore: 70,
      operationalAutonomyScore: 65,
      externalDependencyScore: 35,
      canBuildSoftware: true,
      canAutomateAcquisition: true,
      canAutomateFulfillment: true,
      canAutomateSupport: true,
      requiresPhysicalInventory: false,
      requiresSpecializedEmployees: false,
      requiresLicensing: false,
      requiresLargeUpfrontCapital: false,
      dependsOnManualSales: false,
      dependsOnInaccessibleSystems: false,
      canDeliverDigitally: true,
      assessmentNotes: ["Simulation-only evaluation draft"],
      assessmentInputs: {},
    },
    speedToValue: {
      estimatedBuildTimeDays: 60,
      estimatedValidationTimeDays: 21,
      estimatedLaunchTimeDays: 74,
      estimatedTimeToFirstVisitorDays: 81,
      estimatedTimeToFirstLeadDays: 95,
      estimatedTimeToFirstTransactionDays: 90,
      estimatedTimeToFirstRevenueDays: 120,
      estimatedTimeToBreakEvenDays: 240,
      speedToValueScore: 67,
    },
    expectedValueInputs: {
      probabilityOfSuccess: 0.5,
      estimatedCustomersYear1: 50,
      estimatedRevenuePerCustomer: 1000,
      estimatedGrossMarginPercent: 60,
      estimatedFixedCosts: 30000,
      estimatedVariableCosts: 10000,
      startupCapital: bundle.monetization?.primaryPlan?.estimatedCapitalRequired ?? 50000,
    },
    expectedValueDerived: {
      probabilityAdjustedRevenue: 25000,
      probabilityAdjustedGrossProfit: 15000,
      expected12MonthProfit: 10000,
      expectedRoi: 0.2,
      capitalEfficiency: 0.3,
      expectedValuePerDollarDeployed: 0.2,
    },
    capitalEfficiencyMetrics: {},
    selectionScoreInputs: {},
    selectionScore: 65,
    portfolioAdjustedScore: 65,
    dependencyTags: [],
    correlationPenalties: [],
    experimentPriorities: [],
    adversarialReview: null,
    decision: "HOLD",
    recommendedNextAction: "Simulation only",
    queueReason: "Simulation blueprint — selection state unchanged",
    explanation: {
      whyThisOpportunity: bundle.summary,
      whyNow: "Simulation",
      whyInfinityCanBuildIt: "Simulation",
      whyCustomersWillPay: "Simulation",
      whyThisModel: "Simulation",
      whyItRanksAboveAlternatives: "Simulation",
      largestRisks: [],
      fatalAssumptions: [],
      validationNeeded: [],
      expectedEconomics: {},
      resourceRequirements: {},
      confidence: 0.5,
    },
    handoff: null,
    confidence: 0.5,
  };
}

export async function loadSimulationHandoffs(
  admin: AdminSupabaseClient,
  organizationId: string,
  candidateIds: string[],
): Promise<LoadedVentureSelectionHandoff[]> {
  const bundles = await loadCandidateBundlesForSelection(admin, organizationId, {
    candidateIds,
  });

  return bundles.map((bundle) => {
    const evaluation = buildEvaluationDraftFromBundle(bundle);
    const handoffPayload = buildVentureSelectionHandoff(evaluation);
    return {
      id: null,
      organizationId,
      ventureSelectionRunId: null,
      candidateSelectionEvaluationId: null,
      opportunityCandidateId: bundle.candidateId,
      discoveryRunId: bundle.discoveryRunId,
      monetizationRunId: bundle.monetization?.monetizationRunId ?? null,
      ...handoffPayload,
      handoffStatus: null,
      decision: evaluation.decision,
      simulationOnly: true,
      candidateTitle: bundle.title,
      candidateSummary: bundle.summary,
      businessModelCandidates: bundle.businessModelCandidates,
      monetizationScore: bundle.monetization?.monetizationScore ?? null,
    };
  });
}

export function buildComplexityTestSimulationHandoff(organizationId: string): LoadedVentureSelectionHandoff {
  return {
    id: null,
    organizationId,
    ventureSelectionRunId: null,
    candidateSelectionEvaluationId: null,
    opportunityCandidateId: null,
    discoveryRunId: null,
    monetizationRunId: null,
    businessConcept: "Creator Art Community Marketplace (Capability Test)",
    targetCustomer: "Digital artists and art collectors",
    problem: "Artists lack a community-native marketplace that combines discovery, social engagement, and direct sales.",
    solution: "A Reddit-style art community with profiles, feeds, voting, storefronts, and transactions.",
    primaryMonetizationModel: "marketplace_commission",
    secondaryRevenueStreams: ["subscriptions", "promoted_listings", "digital_products"],
    pricingStrategy: "8-12% commission on transactions plus optional creator subscriptions",
    distributionStrategy: "Community-led growth, creator invites, SEO on public galleries",
    recommendedProductType: "creator_marketplace",
    requiredCapabilities: ["software_development", "automated_acquisition", "digital_delivery"],
    mvpRequirements: [
      "Multi-role auth",
      "UGC posts and feeds",
      "Creator storefront checkout",
      "Moderation queue",
    ],
    futureFeatures: ["Print-on-demand", "Live auctions", "Mobile app"],
    economicTargets: { expected12MonthProfit: 120000, expectedRoi: 2.4, estimatedCapitalRequired: 80000 },
    budgetEnvelope: { startupCapital: 80000, monthlyOperatingBudget: 6000 },
    riskConstraints: { blockingAssumptions: ["Creators will list exclusive inventory"] },
    validationState: "simulation_capability_test",
    sourceEvidenceRefs: [],
    handoffStatus: null,
    decision: "SIMULATION",
    simulationOnly: true,
    candidateTitle: "Creator Art Community Marketplace (Capability Test)",
    candidateSummary: "Complex multi-sided application architecture capability test — not a real selected venture.",
    businessModelCandidates: ["creator_marketplace", "community", "digital_product"],
    monetizationScore: null,
  };
}
