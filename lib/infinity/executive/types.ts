import {
  DEFAULT_EXECUTIVE_POLICY,
  EXECUTIVE_DECISIONS,
} from "./constants";
import type { RankedOpportunity } from "@/lib/infinity/reasoning";

export type ExecutiveDecision = (typeof EXECUTIVE_DECISIONS)[number];

export type ExecutivePolicy = {
  maxConcurrentBuilds: number;
  maxQueueDepth: number;
  minAvailableCapital: number;
  minExpectedRoiScore: number;
  minTimeToValueScore: number;
  minStrategicAlignmentScore: number;
  minEnterpriseValueScore: number;
  maxPortfolioConcentration: number;
  maxRiskScoreForApprove: number;
  deferWhenAtCapacity: boolean;
  rejectBelowReasoningScore: number;
};

export type PortfolioEntry = {
  opportunityId: string;
  industry: string | null;
  category: string | null;
  decision: ExecutiveDecision;
};

export type PortfolioSnapshot = {
  entries: PortfolioEntry[];
  industryCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
};

export type CapitalSnapshot = {
  totalCapacity: number;
  reservedCapacity: number;
  consumedCapacity: number;
  availableCapacity: number;
  requestedAmount: number;
};

export type WorkloadSnapshot = {
  activeBuilds: number;
  queuedBuilds: number;
  totalTracked: number;
};

export type ExecutiveSignals = {
  expectedRoiScore: number | null;
  timeToValueScore: number | null;
  riskScore: number | null;
  strategicAlignmentScore: number | null;
  enterpriseValueScore: number | null;
  portfolioConcentration: number;
  capitalSufficient: boolean;
  capacityAvailable: boolean;
  workloadWithinLimits: boolean;
};

export type ExecutiveDecisionInput = {
  reasoning: RankedOpportunity;
  portfolio: PortfolioSnapshot;
  capital: CapitalSnapshot;
  workload: WorkloadSnapshot;
  industry: string | null;
  category: string | null;
};

export type ExecutiveDecisionRecord = {
  organizationId: string;
  opportunityId: string;
  opportunityName: string;
  decision: ExecutiveDecision;
  reasoningOutcome: string;
  reasoningScore: number;
  reasoningRank: number;
  signals: ExecutiveSignals;
  rationale: string[];
  decidedAt: string;
};

export type EnterpriseBuildQueueItem = ExecutiveDecisionRecord & {
  queuePosition: number;
  queuePriority: number;
};

export type ExecutiveProcessingResult = {
  decisions: ExecutiveDecisionRecord[];
  queue: EnterpriseBuildQueueItem[];
  deferredCount: number;
  rejectedCount: number;
};

/** Swappable executive decision logic (rule-based today, AI later). */
export type ExecutiveDecisionStrategy = {
  decide(input: ExecutiveDecisionInput, policy: ExecutivePolicy): ExecutiveDecisionRecord;
};

export function mergeExecutivePolicy(partial?: Partial<ExecutivePolicy>): ExecutivePolicy {
  return {
    ...DEFAULT_EXECUTIVE_POLICY,
    ...(partial ?? {}),
  };
}

export function extractSignalsFromReasoning(
  reasoning: RankedOpportunity,
  portfolio: PortfolioSnapshot,
  capital: CapitalSnapshot,
  workload: WorkloadSnapshot,
  industry: string | null,
  policy: ExecutivePolicy,
): ExecutiveSignals {
  const dimension = (key: string) =>
    reasoning.dimensions.find((d) => d.key === key)?.score ?? null;

  const revenue = dimension("revenue_potential");
  const timeToValue = dimension("time_to_launch");
  const risk = dimension("risk");
  const strategic = dimension("strategic_fit");
  const demand = dimension("market_demand");

  const enterpriseValueScore =
    revenue !== null && strategic !== null && demand !== null
      ? Math.round((revenue + strategic + demand) / 3)
      : null;

  const industryKey = (industry ?? "unknown").toLowerCase();
  const industryCount = portfolio.industryCounts[industryKey] ?? 0;
  const total = Math.max(1, portfolio.entries.length + 1);
  const portfolioConcentration = industryCount / total;

  return {
    expectedRoiScore: revenue,
    timeToValueScore: timeToValue,
    riskScore: risk,
    strategicAlignmentScore: strategic,
    enterpriseValueScore,
    portfolioConcentration,
    capitalSufficient:
      capital.availableCapacity >= capital.requestedAmount &&
      capital.availableCapacity >= policy.minAvailableCapital,
    capacityAvailable: workload.activeBuilds < policy.maxConcurrentBuilds,
    workloadWithinLimits:
      workload.activeBuilds + workload.queuedBuilds <
      policy.maxConcurrentBuilds + policy.maxQueueDepth,
  };
}
