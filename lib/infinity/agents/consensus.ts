import type { AgentResult } from "./agent-results";
import type { ConsensusStrategy } from "./agent-types";

export type ConsensusInput = {
  strategy: ConsensusStrategy;
  results: AgentResult[];
  weights?: Record<string, number>;
  executiveDecisionSummary?: string | null;
  policyFirstAligned?: boolean;
};

export type ConsensusResult = {
  strategy: ConsensusStrategy;
  summary: string;
  winningAgentIds: string[];
  confidenceScore: number;
  executiveOverrideApplied: boolean;
  policyFirstApplied: boolean;
  advisoryOnly: true;
  binding: false;
};

function majorityWinners(results: AgentResult[]): string[] {
  const aligned = results.filter((result) => result.policyAligned);
  if (aligned.length >= Math.ceil(results.length / 2)) {
    return aligned.map((result) => result.agentId);
  }
  return results.map((result) => result.agentId);
}

function weightedWinners(results: AgentResult[], weights: Record<string, number>): string[] {
  const scored = results
    .map((result) => ({
      agentId: result.agentId,
      score: (weights[result.agentId] ?? 1) * result.confidenceScore,
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  return top ? [top.agentId] : [];
}

export function runConsensus(input: ConsensusInput): ConsensusResult {
  const { results, strategy } = input;

  if (strategy === "executive_override" && input.executiveDecisionSummary) {
    return {
      strategy,
      summary: `Executive override applied: ${input.executiveDecisionSummary}`,
      winningAgentIds: results.map((result) => result.agentId),
      confidenceScore: 100,
      executiveOverrideApplied: true,
      policyFirstApplied: false,
      advisoryOnly: true,
      binding: false,
    };
  }

  if (results.length === 0) {
    return {
      strategy,
      summary: "No agent results available for consensus.",
      winningAgentIds: [],
      confidenceScore: 0,
      executiveOverrideApplied: false,
      policyFirstApplied: false,
      advisoryOnly: true,
      binding: false,
    };
  }

  if (strategy === "policy_first" && input.policyFirstAligned === false) {
    const aligned = results.filter((result) => result.policyAligned);
    return {
      strategy,
      summary: "Policy-first consensus filtered to policy-aligned agents.",
      winningAgentIds: aligned.map((result) => result.agentId),
      confidenceScore: aligned.length > 0 ? 70 : 30,
      executiveOverrideApplied: false,
      policyFirstApplied: true,
      advisoryOnly: true,
      binding: false,
    };
  }

  if (strategy === "unanimous") {
    const allAligned = results.every((result) => result.policyAligned);
    return {
      strategy,
      summary: allAligned
        ? "Unanimous policy-aligned consensus."
        : "Unanimous consensus not achieved.",
      winningAgentIds: allAligned ? results.map((result) => result.agentId) : [],
      confidenceScore: allAligned ? 95 : 20,
      executiveOverrideApplied: false,
      policyFirstApplied: false,
      advisoryOnly: true,
      binding: false,
    };
  }

  if (strategy === "best_confidence") {
    const winner = [...results].sort((a, b) => b.confidenceScore - a.confidenceScore)[0]!;
    return {
      strategy,
      summary: `Best confidence agent: ${winner.agentId}.`,
      winningAgentIds: [winner.agentId],
      confidenceScore: winner.confidenceScore,
      executiveOverrideApplied: false,
      policyFirstApplied: false,
      advisoryOnly: true,
      binding: false,
    };
  }

  if (strategy === "weighted") {
    const winners = weightedWinners(results, input.weights ?? {});
    const winner = results.find((result) => result.agentId === winners[0]);
    return {
      strategy,
      summary: "Weighted consensus selected highest weighted confidence agent.",
      winningAgentIds: winners,
      confidenceScore: winner?.confidenceScore ?? 0,
      executiveOverrideApplied: false,
      policyFirstApplied: false,
      advisoryOnly: true,
      binding: false,
    };
  }

  const winners = majorityWinners(results);
  const avg =
    results.reduce((sum, result) => sum + result.confidenceScore, 0) / results.length;

  return {
    strategy: "majority",
    summary: "Majority consensus across policy-aligned agents.",
    winningAgentIds: winners,
    confidenceScore: Math.round(avg * 100) / 100,
    executiveOverrideApplied: false,
    policyFirstApplied: false,
    advisoryOnly: true,
    binding: false,
  };
}
