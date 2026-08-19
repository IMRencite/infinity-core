import type { FounderDecisionOverride, FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import type { FounderIdeaStore } from "./store";
import { nowIso } from "./store";
import type { FounderFailureCode, FounderIdeaDesiredMode, FounderIdeaStatus, VentureOrigin } from "./constants";
import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import type { FounderAction } from "./constants";

export type FounderIdeaSubmissionRow = {
  id: string;
  organization_id: string;
  submitted_by_user_id: string;
  title: string;
  description: string;
  target_customer: string | null;
  problem: string | null;
  proposed_solution: string | null;
  business_model_hypothesis: string | null;
  pricing_hypothesis: string | null;
  competitors: string | null;
  notes: string | null;
  desired_mode: FounderIdeaDesiredMode;
  status: FounderIdeaStatus;
  opportunity_candidate_id: string | null;
  infinity_decision: SelectionDecision | null;
  founder_decision: string | null;
  origin: VentureOrigin;
  failure_code: FounderFailureCode | null;
  analyzed_by_user_id: string | null;
  approved_by_user_id: string | null;
  idempotency_key: string;
  opportunity_quality: number | null;
  selection_score: number | null;
  validation_score: number | null;
  monetization_score: number | null;
  fatal_assumption_risk: number | null;
  expected_roi: number | null;
  estimated_capital_required: number | null;
  scores_json: unknown;
  blocking_assumptions: string[];
  created_at: string;
  updated_at: string;
};

export type FounderDecisionOverrideRow = {
  id: string;
  organization_id: string;
  founder_idea_submission_id: string;
  candidate_id: string;
  infinity_decision: SelectionDecision;
  founder_decision: SelectionDecision;
  founder_action: FounderAction;
  reason: string | null;
  risk_acknowledged: boolean;
  created_by: string;
  created_at: string;
};

export function submissionToRow(submission: FounderIdeaSubmission, grade?: FounderIdeaGrade | null): FounderIdeaSubmissionRow {
  return {
    id: submission.id,
    organization_id: submission.organizationId,
    submitted_by_user_id: submission.submittedByUserId,
    title: submission.title,
    description: submission.description,
    target_customer: submission.targetCustomer,
    problem: submission.problem,
    proposed_solution: submission.proposedSolution,
    business_model_hypothesis: submission.businessModelHypothesis,
    pricing_hypothesis: submission.pricingHypothesis,
    competitors: submission.competitors,
    notes: submission.notes,
    desired_mode: submission.desiredMode,
    status: submission.status,
    opportunity_candidate_id: submission.opportunityCandidateId,
    infinity_decision: submission.infinityDecision,
    founder_decision: submission.founderDecision ? String(submission.founderDecision) : null,
    origin: submission.origin,
    failure_code: submission.failureCode,
    analyzed_by_user_id: submission.analyzedByUserId,
    approved_by_user_id: submission.approvedByUserId,
    idempotency_key: submission.idempotencyKey,
    opportunity_quality: grade?.opportunityQuality ?? null,
    selection_score: grade?.selectionScore ?? null,
    validation_score: grade?.validationScore ?? null,
    monetization_score: grade?.monetizationScore ?? null,
    fatal_assumption_risk: grade?.fatalAssumptionRisk ?? null,
    expected_roi: grade?.expectedRoi ?? null,
    estimated_capital_required: grade?.estimatedCapitalRequired ?? null,
    scores_json: grade?.opportunityScores ?? null,
    blocking_assumptions: grade?.evaluation.blockingAssumptions ?? [],
    created_at: submission.createdAt,
    updated_at: submission.updatedAt,
  };
}

export function rowToSubmission(row: FounderIdeaSubmissionRow): FounderIdeaSubmission {
  return {
    id: row.id,
    organizationId: row.organization_id,
    submittedByUserId: row.submitted_by_user_id,
    title: row.title,
    description: row.description,
    targetCustomer: row.target_customer,
    problem: row.problem,
    proposedSolution: row.proposed_solution,
    businessModelHypothesis: row.business_model_hypothesis,
    pricingHypothesis: row.pricing_hypothesis,
    competitors: row.competitors,
    notes: row.notes,
    desiredMode: row.desired_mode,
    status: row.status,
    opportunityCandidateId: row.opportunity_candidate_id,
    infinityDecision: row.infinity_decision,
    founderDecision: row.founder_decision as FounderIdeaSubmission["founderDecision"],
    origin: row.origin,
    failureCode: row.failure_code,
    analyzedByUserId: row.analyzed_by_user_id,
    approvedByUserId: row.approved_by_user_id,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at || nowIso(),
  };
}

export function overrideToRow(override: FounderDecisionOverride): FounderDecisionOverrideRow {
  return {
    id: override.id,
    organization_id: override.organizationId,
    founder_idea_submission_id: override.founderIdeaSubmissionId,
    candidate_id: override.candidateId,
    infinity_decision: override.infinityDecision,
    founder_decision: override.founderDecision,
    founder_action: override.founderAction,
    reason: override.reason,
    risk_acknowledged: override.riskAcknowledged,
    created_by: override.createdBy,
    created_at: override.createdAt,
  };
}

export function hydrateFounderStore(
  store: FounderIdeaStore,
  rows: FounderIdeaSubmissionRow[],
  overrides: FounderDecisionOverrideRow[] = [],
): FounderIdeaStore {
  for (const row of rows) {
    const submission = rowToSubmission(row);
    store.submissions.set(submission.id, submission);
    store.registerIdempotency(submission.organizationId, submission.idempotencyKey, submission.id);
    if (row.opportunity_quality != null) {
      store.grades.set(submission.id, {
        opportunityScores: (row.scores_json as FounderIdeaGrade["opportunityScores"]) ?? {
          scoringVersion: "persisted",
          demandScore: 0,
          marketGrowthScore: 0,
          competitionOpportunityScore: 0,
          monetizationPotentialScore: 0,
          buildabilityScore: 0,
          automationScore: 0,
          distributionScore: 0,
          capitalEfficiencyScore: 0,
          speedToRevenueScore: 0,
          evidenceConfidenceScore: 0,
          opportunityScore: row.opportunity_quality,
          weightedBreakdown: {},
          scoringInputs: {
            demandStrength: 0,
            marketGrowth: 0,
            competitionWeakness: 0,
            monetizationPotential: 0,
            buildability: 0,
            automationPotential: 0,
            distributionStrength: 0,
            capitalEfficiency: 0,
            speedToRevenue: 0,
            evidenceConfidence: 0,
          },
        },
        selectionScore: row.selection_score ?? 0,
        validationScore: row.validation_score ?? 0,
        monetizationScore: row.monetization_score ?? 0,
        fatalAssumptionRisk: row.fatal_assumption_risk ?? 0,
        expectedRoi: row.expected_roi,
        estimatedCapitalRequired: row.estimated_capital_required,
        buildReadiness: row.infinity_decision ?? "HOLD",
        opportunityQuality: row.opportunity_quality,
        evaluation: {
          blockingAssumptions: row.blocking_assumptions ?? [],
        } as FounderIdeaGrade["evaluation"],
      });
    }
  }
  for (const row of overrides) {
    store.overrides.set(row.id, {
      id: row.id,
      organizationId: row.organization_id,
      founderIdeaSubmissionId: row.founder_idea_submission_id,
      candidateId: row.candidate_id,
      infinityDecision: row.infinity_decision,
      founderDecision: row.founder_decision,
      founderAction: row.founder_action,
      reason: row.reason,
      riskAcknowledged: row.risk_acknowledged,
      createdBy: row.created_by,
      createdAt: row.created_at,
    });
  }
  return store;
}
