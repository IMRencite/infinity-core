import type { AgentResult, AggregatedAgentOutput, ConflictRecord } from "./agent-results";

export function detectConflicts(results: AgentResult[]): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];

  const lowPolicy = results.filter((result) => !result.policyAligned);
  const highPolicy = results.filter((result) => result.policyAligned);

  if (lowPolicy.length > 0 && highPolicy.length > 0) {
    conflicts.push({
      id: crypto.randomUUID(),
      topic: "policy_alignment",
      agentIds: results.map((result) => result.agentId),
      descriptions: [
        `${lowPolicy.length} agent(s) flagged policy misalignment.`,
        `${highPolicy.length} agent(s) remain policy aligned.`,
      ],
      resolution: "unresolved",
      resolvedSummary: null,
    });
  }

  const confidenceSpread =
    results.length > 1
      ? Math.max(...results.map((r) => r.confidenceScore)) -
        Math.min(...results.map((r) => r.confidenceScore))
      : 0;

  if (confidenceSpread >= 25) {
    conflicts.push({
      id: crypto.randomUUID(),
      topic: "confidence_divergence",
      agentIds: results.map((result) => result.agentId),
      descriptions: [`Confidence spread ${confidenceSpread.toFixed(1)} exceeds threshold.`],
      resolution: "unresolved",
      resolvedSummary: null,
    });
  }

  return conflicts;
}

export function resolveConflicts(results: AgentResult[]): ConflictRecord[] {
  const conflicts = detectConflicts(results);

  return conflicts.map((conflict) => {
    if (conflict.topic !== "confidence_divergence") {
      return conflict;
    }

    const winner = [...results].sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
    return {
      ...conflict,
      resolution: "highest_confidence",
      resolvedSummary: winner
        ? `Highest confidence agent ${winner.agentId} selected for merge weighting.`
        : null,
    };
  });
}

export function mergeAgentResults(
  results: AgentResult[],
  conflicts: ConflictRecord[] = resolveConflicts(results),
): AggregatedAgentOutput {
  const mergedFindings = results.flatMap((result) => result.findings);
  const averageConfidence =
    results.length === 0
      ? 0
      : results.reduce((sum, result) => sum + result.confidenceScore, 0) / results.length;

  return {
    mergedSummary:
      results.length === 0
        ? "No agent results to aggregate."
        : `Aggregated ${results.length} deterministic agent result(s).`,
    mergedFindings,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    conflicts,
    provenance: results.map((result) => result.provenance),
    advisoryOnly: true,
    binding: false,
  };
}

export function scoreAggregateConfidence(results: AgentResult[]): number {
  if (results.length === 0) return 0;
  return mergeAgentResults(results).averageConfidence;
}
