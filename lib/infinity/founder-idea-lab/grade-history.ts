import { FOUNDER_IDEA_LAB_VERSION } from "./constants";
import { nowIso } from "./store";
import type { FounderIdeaStore } from "./store";
import type { FounderIdeaGrade, FounderIdeaSubmission, HistoricalGradeSnapshot } from "./types";

export function snapshotFromGrade(
  submission: FounderIdeaSubmission,
  grade: FounderIdeaGrade,
  reason: HistoricalGradeSnapshot["reason"] = "REANALYSIS",
  pointer?: { candidateId?: string | null },
): HistoricalGradeSnapshot {
  return {
    archivedAt: nowIso(),
    evaluationVersion: FOUNDER_IDEA_LAB_VERSION,
    opportunityScore: grade.opportunityQuality,
    selectionScore: grade.selectionScore,
    validationScore: grade.validationScore,
    monetizationScore: grade.monetizationScore,
    decision: submission.infinityDecision,
    status: submission.status,
    scoreIntegrity: grade.scoreIntegrity,
    provenance: grade.provenance,
    candidateId: pointer?.candidateId !== undefined ? pointer.candidateId : submission.opportunityCandidateId,
    researchRunId: grade.researchRunId ?? submission.researchRunId,
    reason,
  };
}

export function sameHistoricalSnapshot(left: HistoricalGradeSnapshot, right: HistoricalGradeSnapshot): boolean {
  return (
    left.opportunityScore === right.opportunityScore &&
    left.selectionScore === right.selectionScore &&
    left.validationScore === right.validationScore &&
    left.monetizationScore === right.monetizationScore &&
    left.decision === right.decision &&
    left.scoreIntegrity === right.scoreIntegrity &&
    left.candidateId === right.candidateId &&
    left.researchRunId === right.researchRunId &&
    left.reason === right.reason
  );
}

export function archiveHistoricalGrade(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  pointer?: { candidateId?: string | null },
): HistoricalGradeSnapshot | null {
  const current = store.grades.get(submission.id);
  if (!current) return null;
  const snapshot = snapshotFromGrade(submission, current, "REANALYSIS", pointer);
  const history = store.evaluationHistory.get(submission.id) ?? [];
  const existing = history.find((item) => sameHistoricalSnapshot(item, snapshot));
  if (existing) {
    return existing;
  }
  history.push(snapshot);
  store.evaluationHistory.set(submission.id, history);
  const grades = store.gradeHistory.get(submission.id) ?? [];
  grades.push(current);
  store.gradeHistory.set(submission.id, grades);
  return snapshot;
}

export function historicalSnapshotsFor(store: FounderIdeaStore, submissionId: string): HistoricalGradeSnapshot[] {
  return store.evaluationHistory.get(submissionId) ?? [];
}
