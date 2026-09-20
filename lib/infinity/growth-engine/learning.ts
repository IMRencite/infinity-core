export const GROWTH_OUTCOME_LEARNING_TARGETS = [
  "PerformanceIntelligence",
  "ExpectedVsActual",
  "Diagnosis",
  "Hypothesis",
  "OptimizationOpportunity",
  "LearningDecision",
] as const;

export type GrowthLearningOutcome = {
  ventureId: string;
  metric: string;
  weekday?: string;
  hour?: number;
  timezone?: string;
  segment?: string;
  messageVariant?: string;
  offer?: string;
  synthetic: boolean;
};

export function growthOutcomeLearningTarget(outcome: GrowthLearningOutcome): string | null {
  if (outcome.synthetic) return null;
  return "PerformanceIntelligence";
}

export function responsePacingLearningObjective(): string {
  return "Optimize conversation continuation, qualified progression, and conversion. Do not optimize for appearing human.";
}
