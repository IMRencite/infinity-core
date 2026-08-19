import { applyCanonicalResearchFixture, saasWorkflowMonetizationFixture, saasWorkflowResearchFixture, weakMonetizationFixture } from "./fixtures";
import { gradeFounderIdea } from "./grade";
import { convertFounderIdeaToCandidate } from "./convert";
import type { FounderIdeaStore } from "./store";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import type { ScoringAssessmentInput } from "@/lib/infinity/opportunity-scanner/types";
import type { LoadedMonetizationBundle } from "@/lib/infinity/venture-selection/types";

export type AnalyzeOptions = {
  researchFixture?: "saas_workflow" | "none" | "failed";
  monetizationFixture?: "saas_workflow" | "weak" | "none";
  scores?: ScoringAssessmentInput;
  monetization?: LoadedMonetizationBundle | null;
};

export function analyzeFounderIdea(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  options: AnalyzeOptions = {},
): { submission: FounderIdeaSubmission; grade: FounderIdeaGrade | null; researchPipeline: string } {
  if (options.researchFixture === "failed") {
    submission.status = "FAILED";
    submission.failureCode = "RESEARCH_FAILED";
    store.submissions.set(submission.id, submission);
    return { submission, grade: null, researchPipeline: "grounded_research" };
  }

  submission.status = "RESEARCHING";
  store.submissions.set(submission.id, submission);
  const research = applyCanonicalResearchFixture(options.researchFixture === "saas_workflow");

  const monetization =
    options.monetization ??
    (options.monetizationFixture === "weak"
      ? weakMonetizationFixture()
      : options.monetizationFixture === "saas_workflow" || options.researchFixture === "saas_workflow"
        ? saasWorkflowMonetizationFixture()
        : null);

  const scores =
    options.scores ??
    (options.researchFixture === "saas_workflow" ? saasWorkflowResearchFixture() : undefined);

  convertFounderIdeaToCandidate(store, submission, {
    scores,
    researchGrounded: options.researchFixture === "saas_workflow",
  });
  submission.status = "GRADED";
  const grade = gradeFounderIdea(store, submission, {
    scores,
    monetization,
    researchGrounded: options.researchFixture === "saas_workflow",
  });
  void research;
  return { submission, grade, researchPipeline: "grounded_research" };
}
