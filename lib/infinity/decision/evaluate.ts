import type { Json } from "@/lib/supabase/database.types";
import type { Tables } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import {
  aggregateWeightedScore,
  calculateConfidenceScore,
  calculateDeterministicDimensionScores,
  extractTopPositiveDimensions,
  extractTopRisks,
  type ScoringContext,
} from "./scoring";
import {
  buildEvaluationKey,
  selectActiveDecisionModel,
} from "./models";
import {
  deriveCompositeScores,
  evaluateMissionPolicies,
  generateRecommendation,
} from "./recommend";
import type {
  EvaluateOpportunityInput,
  EvaluateOpportunityResult,
  EvaluationDimensionScores,
  PolicyEvaluationResult,
} from "./types";

function readJsonFlag(value: unknown, key: string): boolean {
  if (typeof value === "object" && value !== null && !Array.isArray(value) && key in value) {
    return Boolean((value as Record<string, unknown>)[key]);
  }

  return false;
}

async function loadScoringContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  opportunityId: string,
): Promise<ScoringContext> {
  const { data: opportunity, error: opportunityError } = await admin
    .from("opportunities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", opportunityId)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    throw new Error(`Opportunity not found: ${opportunityError?.message ?? opportunityId}`);
  }

  const signalsQuery = opportunity.scan_id
    ? admin
        .from("discovery_signals")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("scan_id", opportunity.scan_id)
    : Promise.resolve({
        data: [] as Tables<"discovery_signals">[],
        error: null,
      });

  const [
    { data: scores },
    { data: evidence },
    { data: signals },
    { data: reviews },
  ] = await Promise.all([
    admin
      .from("opportunity_scores")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId)
      .order("scored_at", { ascending: false })
      .limit(1),
    admin
      .from("opportunity_evidence")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId),
    signalsQuery,
    admin
      .from("opportunity_reviews")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId),
  ]);

  if (!scores?.[0] && evidence?.length === 0) {
    throw new Error("Evaluation requires at least one stored score or evidence record");
  }

  return {
    opportunity,
    latestScore: scores?.[0] ?? null,
    evidence: evidence ?? [],
    signals: signals ?? [],
    reviews: reviews ?? [],
  };
}

export async function evaluateOpportunity(
  admin: AdminSupabaseClient,
  input: EvaluateOpportunityInput,
): Promise<EvaluateOpportunityResult> {
  const model = await selectActiveDecisionModel(
    admin,
    input.organizationId,
    input.decisionModelId,
  );

  const evaluationKey =
    input.evaluationKey ??
    buildEvaluationKey(input.opportunityId, model.id, input.correlationId);

  const { data: existing, error: existingError } = await admin
    .from("opportunity_evaluations")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("evaluation_key", evaluationKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing evaluation: ${existingError.message}`);
  }

  if (existing) {
    const dimensionScores = existing.dimension_scores as EvaluationDimensionScores;
    const missingDimensions = Object.entries(dimensionScores)
      .filter(([, value]) => value?.status === "unknown")
      .map(([key]) => key);

    return {
      alreadyEvaluated: true,
      evaluation: existing,
      recommendation: existing.recommendation,
      confidenceScore:
        existing.confidence_score !== null ? Number(existing.confidence_score) : null,
      overallScore: existing.overall_score !== null ? Number(existing.overall_score) : null,
      policyResults: existing.policy_results as unknown as PolicyEvaluationResult,
      missingDimensions,
      topPositiveDimensions: extractTopPositiveDimensions(dimensionScores),
      topRisks: extractTopRisks(dimensionScores, missingDimensions),
    };
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "decision_engine",
    eventType: "decision.evaluation_started",
    entityType: "opportunity",
    entityId: input.opportunityId,
    message: "Opportunity evaluation started",
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      decision_model_id: model.id,
      model_version: model.version,
      evaluation_key: evaluationKey,
    },
  });

  const context = await loadScoringContext(
    admin,
    input.organizationId,
    input.opportunityId,
  );

  const dimensionScores = calculateDeterministicDimensionScores(model, context);
  const { overallScore, missingDimensions } = aggregateWeightedScore(model, dimensionScores);
  const confidenceScore = calculateConfidenceScore(dimensionScores, missingDimensions);
  const compositeScores = deriveCompositeScores(dimensionScores);

  const isSparseValidation =
    readJsonFlag(context.opportunity.source_snapshot, "not_market_opportunity") ||
    readJsonFlag(context.opportunity.source_snapshot, "validation_scope") ||
    context.opportunity.industry === "system_validation";

  let policies: Tables<"mission_policies">[] = [];

  if (input.missionId) {
    const { data } = await admin
      .from("mission_policies")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("mission_id", input.missionId)
      .eq("is_active", true);
    policies = data ?? [];
  } else {
    const { data } = await admin
      .from("mission_policies")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("is_active", true);
    policies = data ?? [];
  }

  const preliminaryRecommendation = generateRecommendation({
    model,
    overallScore,
    confidenceScore,
    missingDimensions,
    isSparseValidation,
    policyResults: { passed: true, blocked: false, requiresApproval: false, reasons: [], checks: {} },
  });

  const policyResults = evaluateMissionPolicies(model, policies, {
    isSparseValidation,
    recommendation: preliminaryRecommendation,
  });

  const recommendation = generateRecommendation({
    model,
    overallScore,
    confidenceScore,
    missingDimensions,
    isSparseValidation,
    policyResults,
  });

  const reasoning = [
    `Deterministic evaluation using ${model.name}@${model.version}.`,
    isSparseValidation
      ? "Sparse or system-validation data detected; conservative recommendation applied."
      : "Evaluation uses stored scores and evidence only.",
    `Missing dimensions: ${missingDimensions.length > 0 ? missingDimensions.join(", ") : "none"}.`,
    `Recommendation: ${recommendation}.`,
  ].join(" ");

  const { data: evaluation, error } = await admin
    .from("opportunity_evaluations")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      decision_model_id: model.id,
      mission_id: input.missionId ?? null,
      evaluation_status: policyResults.blocked ? "blocked" : "completed",
      recommendation,
      evaluation_key: evaluationKey,
      overall_score: overallScore,
      confidence_score: confidenceScore,
      expected_value_score: compositeScores.expectedValueScore,
      strategic_fit_score: compositeScores.strategicFitScore,
      capital_efficiency_score: compositeScores.capitalEfficiencyScore,
      compounding_score: compositeScores.compoundingScore,
      risk_adjusted_score: compositeScores.riskAdjustedScore,
      dimension_scores: dimensionScores as Json,
      policy_results: policyResults as unknown as Json,
      assumptions: {
        uses_stored_values_only: true,
        no_external_inference: true,
      } as Json,
      uncertainty: {
        missing_dimensions: missingDimensions,
      } as Json,
      reasoning,
    })
    .select("*")
    .single();

  if (error || !evaluation) {
    throw new Error(`Failed to persist evaluation: ${error?.message ?? "unknown error"}`);
  }

  await admin
    .from("opportunities")
    .update({
      overall_score: overallScore,
      confidence_score: confidenceScore,
      status: recommendation === "approve_initiative" ? "recommended" : "scored",
      last_analyzed_at: evaluation.evaluated_at,
    })
    .eq("id", input.opportunityId)
    .eq("organization_id", input.organizationId);

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "decision_engine",
    eventType: "decision.evaluation_completed",
    entityType: "opportunity_evaluation",
    entityId: evaluation.id,
    message: `Opportunity evaluation completed: ${recommendation}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      evaluation_id: evaluation.id,
      opportunity_id: input.opportunityId,
      mission_id: input.missionId ?? null,
      decision_model_id: model.id,
      model_version: model.version,
      recommendation,
      confidence_score: confidenceScore,
      overall_score: overallScore,
      policy_results: policyResults as unknown as Json,
    },
  });

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "decision_engine",
    eventType: "decision.recommendation_created",
    entityType: "opportunity_evaluation",
    entityId: evaluation.id,
    message: `Recommendation created: ${recommendation}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      evaluation_id: evaluation.id,
      recommendation,
      reasoning,
    },
  });

  if (policyResults.blocked) {
    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "decision_engine",
      eventType: "decision.policy_blocked",
      entityType: "opportunity_evaluation",
      entityId: evaluation.id,
      message: "Evaluation recommendation blocked by policy",
      correlationId: input.correlationId ?? undefined,
      payload: {
        evaluation_id: evaluation.id,
        recommendation,
        policy_results: policyResults as unknown as Json,
      },
    });
  }

  return {
    alreadyEvaluated: false,
    evaluation,
    recommendation,
    confidenceScore,
    overallScore,
    policyResults,
    missingDimensions,
    topPositiveDimensions: extractTopPositiveDimensions(dimensionScores),
    topRisks: extractTopRisks(dimensionScores, missingDimensions),
  };
}
