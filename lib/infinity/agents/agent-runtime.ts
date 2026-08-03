import { buildExecutionPlan, runCoordinator, type BuildExecutionPlanInput } from "./coordinator";
import { runCritique } from "./critique";
import { runReflectionStage } from "./reflection";
import type { ConsensusStrategy } from "./agent-types";
import { seedSpecialistAgentTemplates } from "./registry";

export type MultiAgentOrchestrationInput = BuildExecutionPlanInput & {
  consensusStrategy: ConsensusStrategy;
  critiqueKinds?: Parameters<typeof runCritique>[0]["kinds"];
  executiveDecisionSummary?: string | null;
};

export type MultiAgentOrchestrationResult = ReturnType<typeof runCoordinator> & {
  reflection: ReturnType<typeof runReflectionStage>;
  critique: ReturnType<typeof runCritique>;
};

/** High-level deterministic orchestrator entry — no workers, no providers, no network. */
export function runMultiAgentOrchestration(
  input: MultiAgentOrchestrationInput,
): MultiAgentOrchestrationResult {
  const plan = buildExecutionPlan(input);
  const coordinated = runCoordinator({
    plan,
    context: input.context,
    consensusStrategy: input.consensusStrategy,
    executiveDecisionSummary: input.executiveDecisionSummary,
  });

  const reflection = runReflectionStage({
    organizationId: input.organizationId,
    runId: coordinated.run.id,
    correlationId: input.correlationId,
    results: coordinated.results,
  });

  const critique = runCritique({
    kinds: input.critiqueKinds ?? [
      "reflection",
      "contradiction_detection",
      "missing_evidence_detection",
      "policy_conflict_detection",
    ],
    results: coordinated.results,
    context: input.context,
  });

  return {
    ...coordinated,
    events: [...coordinated.events, ...reflection.events],
    reflection,
    critique,
  };
}

export function ensureDefaultSpecialistRegistry(): void {
  seedSpecialistAgentTemplates();
}
