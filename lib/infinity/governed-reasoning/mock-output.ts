import {
  GOVERNED_REASONING_SCHEMA_VERSION,
  type GovernedReasoningMode,
} from "./constants";
import type { GovernedReasoningStructuredOutput } from "./schema";

export function buildMockGovernedReasoningOutput(input: {
  evidenceReferenceIds: string[];
}): GovernedReasoningStructuredOutput {
  const ref = input.evidenceReferenceIds[0] ?? "validation_run:mock";

  return {
    schemaVersion: GOVERNED_REASONING_SCHEMA_VERSION,
    summary: "Mock governed advisory reasoning (offline).",
    findings: [
      {
        title: "Bounded context processed",
        statement: "Deterministic mock provider executed without network.",
        confidence: 70,
        evidenceReferenceIds: [ref],
        assumptions: ["Supplied records are complete for mock mode."],
        unknowns: ["External market validation not performed in mock mode."],
      },
    ],
    risks: [
      {
        title: "Incomplete evidence",
        severity: "medium",
        confidence: 65,
        rationale: "Mock mode cannot validate external claims.",
      },
    ],
    opportunities: [
      {
        title: "Executive review",
        potential: "medium",
        confidence: 60,
        rationale: "Proceed only through Executive gate.",
      },
    ],
    recommendation: "proceed_to_executive_review",
    recommendationConfidence: 62,
    missingInformation: ["Live provider evidence not collected in mock mode."],
    contradictions: [],
    executiveQuestions: ["Does Executive accept advisory-only reasoning?"],
  };
}

export function providerLabel(mode: GovernedReasoningMode, providerId: string | null): string {
  if (mode === "mock" || providerId === "mock") {
    return "mock";
  }

  return providerId ?? "unknown";
}
