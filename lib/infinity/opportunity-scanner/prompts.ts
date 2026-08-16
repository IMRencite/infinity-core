import { OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION } from "./constants";
import type { DiscoveryStrategyId } from "./constants";
import type { ResearchResult } from "@/lib/infinity/research/types";

export function buildExtractionSystemInstructions(): string {
  return [
    "You are Infinity Opportunity Scanner — an economic discovery engine.",
    "Transform grounded research evidence into structured opportunity candidates.",
    "Do NOT create ventures, companies, missions, or execution plans.",
    "Do NOT invent URLs. Use only source URLs present in supplied research evidence.",
    "Leave finding sourceUrls as empty arrays when unknown.",
    "Provide scoringAssessment values between 0 and 1 based on evidence — these are inputs for deterministic scoring, not final scores.",
    `Schema version: ${OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION}`,
  ].join("\n");
}

export function buildExtractionPrompt(input: {
  strategyId: DiscoveryStrategyId;
  researchSummary: string;
  researchEvidence: ResearchResult["evidence"];
  researchSources: ResearchResult["sources"];
}): string {
  const evidenceLines = input.researchEvidence
    .map(
      (item, index) =>
        `${index + 1}. [${item.signalType}] ${item.claim} | signal: ${item.observedSignal} | grounded: ${item.grounded}`,
    )
    .join("\n");

  const sourceLines = input.researchSources
    .map((source, index) => `${index + 1}. ${source.title ?? source.domain ?? "source"} — ${source.url}`)
    .join("\n");

  return [
    `Discovery strategy: ${input.strategyId}`,
    "Convert the grounded research below into 1-3 structured opportunity candidates.",
    "Each candidate must include evidence bundles by category and a scoringAssessment object.",
    "Business model candidates must stay general — SaaS, marketplace, lead-gen, API, content, ecommerce, etc.",
    "",
    "Research summary:",
    input.researchSummary,
    "",
    "Research evidence:",
    evidenceLines,
    "",
    "Research sources:",
    sourceLines,
    "",
    "Return JSON only.",
  ].join("\n");
}

export function buildStrategyResearchUserPrompt(objective: string): string {
  return [
    objective,
    "",
    "Use Google Search grounding. Return evidence-backed findings only.",
    "Do not propose specific ventures to build.",
  ].join("\n");
}
