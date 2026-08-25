import {
  analyzeFounderIdea,
  analyzeFounderIdeaWithCanonicalResearch,
  type AnalyzeOptions,
  type CanonicalResearchExecutor,
} from "./analyze";
import { archiveHistoricalGrade } from "./grade-history";
import type { FounderIdeaStore } from "./store";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import { nowIso } from "./store";

export function preserveHistoricalGrade(store: FounderIdeaStore, submission: FounderIdeaSubmission): void {
  archiveHistoricalGrade(store, submission);
}

export function markNeedsReanalysis(store: FounderIdeaStore, submission: FounderIdeaSubmission): FounderIdeaSubmission {
  submission.needsReanalysis = true;
  if (
    submission.status === "READY_FOR_DECISION" ||
    submission.status === "GRADED" ||
    submission.status === "HELD"
  ) {
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
  archiveHistoricalGrade(store, submission);
  submission.needsReanalysis = false;
  submission.failureCode = null;
  const result = analyzeFounderIdea(store, submission, options);
  return { submission: result.submission, previousGrade, grade: result.grade };
}

export async function reanalyzeFounderIdeaWithCanonicalResearch(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  runResearch: CanonicalResearchExecutor,
  options: AnalyzeOptions = {},
): Promise<{
  submission: FounderIdeaSubmission;
  previousGrade: FounderIdeaGrade | null;
  grade: FounderIdeaGrade | null;
}> {
  const previousGrade = store.grades.get(submission.id) ?? null;
  archiveHistoricalGrade(store, submission);
  submission.needsReanalysis = false;
  submission.failureCode = null;
  const result = await analyzeFounderIdeaWithCanonicalResearch(store, submission, runResearch, options);
  return { submission: result.submission, previousGrade, grade: result.grade };
}
