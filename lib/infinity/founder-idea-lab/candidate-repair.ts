import { convertFounderIdeaToCandidate } from "./convert";
import type { FounderIdeaStore } from "./store";
import type { FounderIdeaSubmission } from "./types";
import type { ScoringAssessmentInput } from "@/lib/infinity/opportunity-scanner/types";

export function markDanglingCandidate(store: FounderIdeaStore, submissionId: string): void {
  store.candidateRepair.set(submissionId, "dangling");
}

export function resolveFounderCandidate(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  input?: { scores?: ScoringAssessmentInput; researchGrounded?: boolean },
) {
  return convertFounderIdeaToCandidate(store, submission, input);
}
