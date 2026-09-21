import type { ResearchEvidence } from "./types";

export function reasonOverEvidence(input: {
  evidence: ResearchEvidence[];
  reasoningProvider?: string;
}): {
  rankedClaims: ResearchEvidence[];
  reasoningProvider: string;
  usedLlm: boolean;
} {
  const ranked = [...input.evidence].sort((left, right) => score(right) - score(left));
  return {
    rankedClaims: ranked,
    reasoningProvider: input.reasoningProvider ?? "deterministic_after_retrieval",
    usedLlm: false,
  };
}

function score(item: ResearchEvidence): number {
  const confidence = item.confidence === "HIGH" ? 3 : item.confidence === "MEDIUM" ? 2 : 1;
  const type = item.claimType === "professional" || item.claimType === "workflow" ? 2 : 1;
  return confidence * 10 + type;
}

export async function reasonOverEvidenceAfterRetrieval(input: {
  evidence: ResearchEvidence[];
  allowLlm?: boolean;
}): Promise<{ rankedClaims: ResearchEvidence[]; reasoningProvider: string; usedLlm: boolean }> {
  const deterministic = reasonOverEvidence({ evidence: input.evidence });
  if (!input.allowLlm || input.evidence.length === 0) return deterministic;
  return deterministic;
}
