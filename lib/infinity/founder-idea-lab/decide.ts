import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import type { FounderAction } from "./constants";
import { newId, nowIso, type FounderIdeaStore } from "./store";
import type { FounderDecisionOverride, FounderIdeaSubmission, FounderValidationPlan } from "./types";

const ACTION_TO_DECISION: Partial<Record<FounderAction, SelectionDecision>> = {
  BUILD_THIS_BUSINESS: "BUILD",
  BUILD_ANYWAY: "BUILD",
  VALIDATE_MORE: "VALIDATE",
  HOLD: "HOLD",
  REJECT: "REJECT",
  ACCEPT_REJECT: "REJECT",
  REASSESS: "HOLD",
  REVIEW_REASONS: "REJECT",
};

export function founderActionsFor(infinityDecision: SelectionDecision): FounderAction[] {
  switch (infinityDecision) {
    case "BUILD":
      return ["BUILD_THIS_BUSINESS", "VALIDATE_MORE", "HOLD", "REJECT"];
    case "VALIDATE":
      return ["VALIDATE_MORE", "BUILD_ANYWAY", "HOLD", "REJECT"];
    case "HOLD":
      return ["REASSESS", "BUILD_ANYWAY", "REJECT"];
    case "REJECT":
      return ["REVIEW_REASONS", "ACCEPT_REJECT", "BUILD_ANYWAY"];
  }
}

export function applyFounderDecision(
  store: FounderIdeaStore,
  input: {
    submissionId: string;
    action: FounderAction;
    actorUserId: string;
    actorOrganizationId?: string;
    reason?: string | null;
    riskAcknowledged?: boolean;
  },
): {
  submission: FounderIdeaSubmission;
  override: FounderDecisionOverride | null;
  originalInfinityDecision: SelectionDecision;
} {
  const submission = store.submissions.get(input.submissionId);
  if (!submission) throw new Error("FOUNDER_IDEA_NOT_FOUND");
  if (input.actorOrganizationId && input.actorOrganizationId !== submission.organizationId) {
    throw new Error("ORG_SCOPE_VIOLATION");
  }
  if (submission.infinityDecision == null) throw new Error("NOT_GRADED");
  const originalInfinityDecision = submission.infinityDecision;

  const allowed = founderActionsFor(submission.infinityDecision);
  if (!allowed.includes(input.action)) throw new Error("ACTION_NOT_ALLOWED");

  const founderDecision = ACTION_TO_DECISION[input.action] ?? submission.infinityDecision;
  const isOverride = founderDecision !== submission.infinityDecision;
  if (isOverride && input.action === "BUILD_ANYWAY" && !input.riskAcknowledged) {
    throw new Error("RISK_ACKNOWLEDGEMENT_REQUIRED");
  }

  let override: FounderDecisionOverride | null = null;
  if (isOverride) {
    override = {
      id: newId(),
      organizationId: submission.organizationId,
      founderIdeaSubmissionId: submission.id,
      candidateId: submission.opportunityCandidateId ?? "",
      infinityDecision: submission.infinityDecision,
      founderDecision,
      founderAction: input.action,
      reason: input.reason ?? null,
      riskAcknowledged: Boolean(input.riskAcknowledged),
      createdBy: input.actorUserId,
      createdAt: nowIso(),
    };
    store.overrides.set(override.id, override);
    submission.origin = "FOUNDER_OVERRIDE";
  }

  submission.founderDecision = founderDecision;
  submission.approvedByUserId = input.actorUserId;
  if (founderDecision === "REJECT") {
    submission.status = "REJECTED";
    submission.failureCode = "BUSINESS_REJECTED";
  } else if (founderDecision === "HOLD") {
    submission.status = "HELD";
  } else if (founderDecision === "VALIDATE") {
    submission.status = "VALIDATING";
  } else if (founderDecision === "BUILD") {
    submission.status = "BUILD_APPROVED";
  }
  submission.updatedAt = nowIso();
  store.submissions.set(submission.id, submission);

  return { submission, override, originalInfinityDecision };
}

export function validationPlanFor(store: FounderIdeaStore, submissionId: string): FounderValidationPlan {
  const grade = store.grades.get(submissionId);
  return {
    blockingAssumptions: grade?.evaluation.blockingAssumptions ?? ["Demand and willingness to pay remain unproven."],
    plannedValidation: grade?.evaluation.candidate?.monetization?.validationExperiments.map((e) => e.title) ?? [
      "Landing-page intent test",
      "Pricing interview",
    ],
    expectedCostUsd: grade?.evaluation.candidate?.monetization?.validationExperiments[0]?.estimatedCostUsd ?? 40,
    expectedInformationGain: ["Demand signal", "Price sensitivity", "Channel feasibility"],
    treasuryRequired: true,
  };
}
