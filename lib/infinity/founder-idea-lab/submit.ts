import type { FounderIdeaSubmissionInput } from "./types";
import type { FounderIdeaSubmission } from "./types";
import { newId, nowIso, type FounderIdeaStore } from "./store";

export function submitFounderIdea(store: FounderIdeaStore, input: FounderIdeaSubmissionInput): FounderIdeaSubmission {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) throw new Error("TITLE_REQUIRED");
  if (!description) throw new Error("DESCRIPTION_REQUIRED");

  const existing = store.findByIdempotency(input.organizationId, input.idempotencyKey);
  if (existing) return existing;

  const now = nowIso();
  const submission: FounderIdeaSubmission = {
    id: newId(),
    organizationId: input.organizationId,
    submittedByUserId: input.submittedByUserId,
    title,
    description,
    targetCustomer: input.targetCustomer?.trim() || null,
    problem: input.problem?.trim() || null,
    proposedSolution: input.proposedSolution?.trim() || null,
    businessModelHypothesis: input.businessModelHypothesis?.trim() || null,
    pricingHypothesis: input.pricingHypothesis?.trim() || null,
    competitors: input.competitors?.trim() || null,
    notes: input.notes?.trim() || null,
    desiredMode: input.desiredMode ?? "GRADE_ONLY",
    status: "SUBMITTED",
    opportunityCandidateId: null,
    infinityDecision: null,
    founderDecision: null,
    origin: "FOUNDER_SUBMITTED",
    failureCode: null,
    needsReanalysis: false,
    researchRunId: null,
    analyzedByUserId: input.submittedByUserId,
    approvedByUserId: null,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
  store.submissions.set(submission.id, submission);
  store.registerIdempotency(input.organizationId, input.idempotencyKey, submission.id);
  return submission;
}
