export const EXECUTIVE_DECISIONS = [
  "APPROVE",
  "DEFER",
  "REJECT",
  "QUEUE",
  "RESEARCH_MORE",
] as const;

export const DEFAULT_EXECUTIVE_POLICY = {
  maxConcurrentBuilds: 3,
  maxQueueDepth: 25,
  minAvailableCapital: 10_000,
  minExpectedRoiScore: 55,
  minTimeToValueScore: 45,
  minStrategicAlignmentScore: 50,
  minEnterpriseValueScore: 52,
  maxPortfolioConcentration: 0.45,
  maxRiskScoreForApprove: 65,
  deferWhenAtCapacity: true,
  rejectBelowReasoningScore: 30,
} as const;

export function isExecutiveDecision(value: string): value is (typeof EXECUTIVE_DECISIONS)[number] {
  return (EXECUTIVE_DECISIONS as readonly string[]).includes(value);
}

/** Maps Reasoning Engine build outcomes into Executive inputs. */
export const REASONING_TO_EXECUTIVE_HINT: Record<
  string,
  (typeof EXECUTIVE_DECISIONS)[number] | null
> = {
  REJECT: "REJECT",
  RESEARCH_MORE: "RESEARCH_MORE",
  QUEUE: "QUEUE",
  APPROVE_FOR_BUILD: null,
};
