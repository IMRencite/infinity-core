import type { FounderResearchPacket } from "../research-packet";
import type { MonetizationEvidenceLayers } from "../monetization-levels";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "../types";
import type { FounderIdeaStore } from "../store";
import { composeFounderExplainability } from "./compose";

export function attachFounderIntelligence(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  grade: FounderIdeaGrade,
  packet: FounderResearchPacket | null,
  layers: MonetizationEvidenceLayers | null,
): FounderIdeaGrade {
  const explainability = composeFounderExplainability({
    submission,
    grade,
    packet,
    layers,
  });
  grade.explainability = explainability;
  grade.comparableEconomics = explainability.comparables;
  store.grades.set(submission.id, grade);
  return grade;
}
