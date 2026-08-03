import type { RankedOpportunity } from "@/lib/infinity/reasoning";
import { ruleBasedExecutiveDecisionStrategy } from "./decision";
import { buildCapitalSnapshot } from "./capital";
import { buildPortfolioSnapshot } from "./portfolio";
import { buildEnterpriseBuildQueue, mergeQueueWithExisting } from "./queue";
import { validateExecutivePolicy, mergeExecutivePolicy } from "./policy";
import type {
  CapitalSnapshot,
  EnterpriseBuildQueueItem,
  ExecutiveDecisionStrategy,
  ExecutivePolicy,
  ExecutiveProcessingResult,
  PortfolioEntry,
  PortfolioSnapshot,
  WorkloadSnapshot,
} from "./types";

export type ExecutiveProcessingContext = {
  organizationId: string;
  policy?: Partial<ExecutivePolicy>;
  portfolioEntries?: PortfolioEntry[];
  capital: {
    totalCapacity: number;
    reservedCapacity: number;
    consumedCapacity: number;
  };
  workload: {
    activeBuilds: number;
    queuedBuilds: number;
  };
  /** Per-opportunity metadata aligned with reasoning outputs. */
  opportunityMeta?: Record<
    string,
    {
      industry: string | null;
      category: string | null;
      requestedAmount: number;
    }
  >;
  existingQueue?: EnterpriseBuildQueueItem[];
  strategy?: ExecutiveDecisionStrategy;
};

function defaultRequestedAmount(reasoning: RankedOpportunity): number {
  const capitalDim = reasoning.dimensions.find((d) => d.key === "capital_required");
  if (capitalDim?.score !== null && capitalDim?.score !== undefined) {
    return Math.max(1_000, Math.round((100 - capitalDim.score) * 500));
  }
  return 10_000;
}

export function processReasoningOutputs(
  ranked: RankedOpportunity[],
  context: ExecutiveProcessingContext,
): ExecutiveProcessingResult {
  const policy = mergeExecutivePolicy(context.policy);
  validateExecutivePolicy(policy);

  const strategy = context.strategy ?? ruleBasedExecutiveDecisionStrategy;
  let portfolio: PortfolioSnapshot = buildPortfolioSnapshot(context.portfolioEntries ?? []);

  const decisions = ranked.map((reasoning) => {
    const meta = context.opportunityMeta?.[reasoning.opportunityId];
    const industry = meta?.industry ?? null;
    const category = meta?.category ?? null;
    const requestedAmount = meta?.requestedAmount ?? defaultRequestedAmount(reasoning);

    const capital: CapitalSnapshot = buildCapitalSnapshot({
      ...context.capital,
      requestedAmount,
    });

    const workload: WorkloadSnapshot = {
      activeBuilds: context.workload.activeBuilds,
      queuedBuilds: context.workload.queuedBuilds,
      totalTracked: context.workload.activeBuilds + context.workload.queuedBuilds,
    };

    const record = strategy.decide(
      {
        reasoning,
        portfolio,
        capital,
        workload,
        industry,
        category,
      },
      policy,
    );

    if (record.decision === "APPROVE") {
      portfolio = buildPortfolioSnapshot([
        ...portfolio.entries,
        {
          opportunityId: record.opportunityId,
          industry,
          category,
          decision: record.decision,
        },
      ]);
    }

    return record;
  });

  const incomingQueue = buildEnterpriseBuildQueue(decisions);
  const queue = mergeQueueWithExisting(
    context.existingQueue ?? [],
    incomingQueue,
    policy.maxQueueDepth,
  );

  return {
    decisions,
    queue,
    deferredCount: decisions.filter((d) => d.decision === "DEFER").length,
    rejectedCount: decisions.filter((d) => d.decision === "REJECT").length,
  };
}

export function executiveDecisionForOpportunity(
  reasoning: RankedOpportunity,
  context: Omit<ExecutiveProcessingContext, "existingQueue">,
): ExecutiveProcessingResult {
  return processReasoningOutputs([reasoning], context);
}
