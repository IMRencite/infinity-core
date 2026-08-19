import { normalizeFounderIdea } from "../normalize";
import type { FounderIdeaStore } from "../store";
import type { FounderIdeaSubmission } from "../types";

export function founderHotTakes(submission: FounderIdeaSubmission, store: FounderIdeaStore): string[] {
  const grade = store.grades.get(submission.id);
  const thesis = normalizeFounderIdea(submission);
  return [
    `[INFERENCE] Best part of the idea: ${thesis.problem.value ?? submission.description}`,
    `[FACT] Weakest assumption: ${grade?.evaluation.blockingAssumptions[0] ?? "Demand and willingness to pay are unproven."}`,
    `[INFERENCE] Fastest way to revenue: ${grade?.evaluation.candidate?.monetization?.recommendation.expectedTimeToRevenue ?? "UNKNOWN until researched"}`,
    `[FACT] Most dangerous risk: fatal assumption risk ${grade?.fatalAssumptionRisk ?? "UNKNOWN"}`,
    `[INFERENCE] Best initial customer: ${thesis.targetCustomer.value ?? "UNKNOWN"} (${thesis.targetCustomer.source})`,
    `[INFERENCE] Cheapest validation: ${grade?.evaluation.candidate?.monetization?.validationExperiments[0]?.title ?? "Landing-page intent test"}`,
    `[FACT] Why Infinity would ${grade?.buildReadiness === "BUILD" ? "" : "not "}build it now: recommendation is ${grade?.buildReadiness ?? "UNKNOWN"}.`,
  ];
}
