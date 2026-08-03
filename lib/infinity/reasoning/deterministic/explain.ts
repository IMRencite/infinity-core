import type { OpportunityScoreResult, ReasoningOutcome } from "./types";
import { prioritizeOpportunity } from "./prioritize";
import type { ReasoningConfig } from "./types";
import { mergeReasoningConfig } from "./types";

export function explainOpportunityScore(
  result: OpportunityScoreResult,
  config?: Partial<ReasoningConfig>,
): string {
  const merged = mergeReasoningConfig(config);
  const outcome = prioritizeOpportunity(result, merged);

  const knownDimensions = result.dimensions
    .filter((d) => d.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const unknownDimensions = result.dimensions.filter((d) => d.status === "unknown");

  const lines: string[] = [
    `Opportunity "${result.opportunityName}" received an overall reasoning score of ${result.overallScore} with confidence ${result.confidence}.`,
    `Validation snapshot: recommendation ${result.validation.recommendation}, validation score ${result.validation.overallScore ?? "n/a"}, validation confidence ${result.validation.overallConfidence ?? "n/a"}.`,
    `Deterministic reasoning outcome: ${outcome}.`,
    "",
    "Top contributing dimensions:",
  ];

  for (const dimension of knownDimensions.slice(0, 5)) {
    lines.push(
      `- ${dimension.label}: ${dimension.score} (${dimension.source}${dimension.notes ? `; ${dimension.notes}` : ""})`,
    );
  }

  if (unknownDimensions.length > 0) {
    lines.push("", "Missing or unknown dimensions:");
    for (const dimension of unknownDimensions) {
      lines.push(`- ${dimension.label}: unknown (${dimension.source})`);
    }
  }

  lines.push(
    "",
    "This explanation is rule-based and reproducible; no AI or LLM was used.",
  );

  return lines.join("\n");
}

export function explainOutcome(outcome: ReasoningOutcome): string {
  switch (outcome) {
    case "REJECT":
      return "Score and confidence are too low to queue for build consideration.";
    case "RESEARCH_MORE":
      return "Material gaps or low confidence require more research before build queueing.";
    case "QUEUE":
      return "Opportunity meets minimum validated thresholds and should wait in the build queue.";
    case "APPROVE_FOR_BUILD":
      return "Opportunity exceeds build approval thresholds with sufficient confidence.";
    default:
      return "Unknown outcome.";
  }
}
