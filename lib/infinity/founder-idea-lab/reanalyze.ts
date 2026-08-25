import { analyzeFounderIdea, type AnalyzeOptions } from "./analyze";
import type { FounderIdeaStore } from "./store";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import { nowIso } from "./store";

export function preserveHistoricalGrade(store: FounderIdeaStore, submission: FounderIdeaSubmission): void {
  const current = store.grades.get(submission.id);
  if (!current) return;
  const history = store.gradeHistory.get(submission.id) ?? [];
  history.push(current);
  store.gradeHistory.set(submission.id, history);
}

export function markNeedsReanalysis(store: FounderIdeaStore, submission: FounderIdeaSubmission): FounderIdeaSubmission {
  submission.needsReanalysis = true;
  if (submission.status === "READY_FOR_DECISION" || submission.status === "GRADED") {
    submission.status = "NEEDS_REANALYSIS";
  }
  submission.failureCode = submission.failureCode ?? "NEEDS_REANALYSIS";
  submission.updatedAt = nowIso();
  store.submissions.set(submission.id, submission);
  return submission;
}

export function reanalyzeFounderIdea(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  options: AnalyzeOptions = {},
): {
  submission: FounderIdeaSubmission;
  previousGrade: FounderIdeaGrade | null;
  grade: FounderIdeaGrade | null;
} {
  const previousGrade = store.grades.get(submission.id) ?? null;
  preserveHistoricalGrade(store, submission);
  submission.needsReanalysis = false;
  submission.failureCode = null;
  const result = analyzeFounderIdea(store, submission, options);
  return { submission: result.submission, previousGrade, grade: result.grade };
}
