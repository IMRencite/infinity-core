export const REASONING_DIMENSIONS = [
  "market_demand",
  "competition",
  "revenue_potential",
  "build_complexity",
  "time_to_launch",
  "strategic_fit",
  "confidence",
  "evidence_quality",
  "capital_required",
  "risk",
] as const;

export const REASONING_OUTCOMES = [
  "REJECT",
  "RESEARCH_MORE",
  "QUEUE",
  "APPROVE_FOR_BUILD",
] as const;

export const DEFAULT_REASONING_WEIGHTS: Record<
  (typeof REASONING_DIMENSIONS)[number],
  number
> = {
  market_demand: 0.12,
  competition: 0.1,
  revenue_potential: 0.14,
  build_complexity: 0.08,
  time_to_launch: 0.06,
  strategic_fit: 0.12,
  confidence: 0.12,
  evidence_quality: 0.1,
  capital_required: 0.08,
  risk: 0.08,
};

export const DEFAULT_REASONING_THRESHOLDS = {
  reject_max_score: 35,
  research_more_max_score: 55,
  research_more_max_confidence: 58,
  queue_max_score: 72,
  approve_for_build_min_score: 73,
  approve_for_build_min_confidence: 70,
  max_unknown_dimensions_for_queue: 2,
} as const;

export function isReasoningOutcome(value: string): value is (typeof REASONING_OUTCOMES)[number] {
  return (REASONING_OUTCOMES as readonly string[]).includes(value);
}
