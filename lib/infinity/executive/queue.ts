import type {
  EnterpriseBuildQueueItem,
  ExecutiveDecision,
  ExecutiveDecisionRecord,
} from "./types";

const QUEUE_ELIGIBLE: ExecutiveDecision[] = ["APPROVE", "QUEUE", "DEFER"];

function queuePriority(record: ExecutiveDecisionRecord): number {
  let priority = record.reasoningScore;

  if (record.decision === "APPROVE") {
    priority += 15;
  } else if (record.decision === "QUEUE") {
    priority += 5;
  } else if (record.decision === "DEFER") {
    priority -= 10;
  }

  if (record.signals.enterpriseValueScore !== null) {
    priority += record.signals.enterpriseValueScore * 0.1;
  }

  return Math.round(priority * 100) / 100;
}

export function buildEnterpriseBuildQueue(
  decisions: ExecutiveDecisionRecord[],
): EnterpriseBuildQueueItem[] {
  const eligible = decisions.filter((d) => QUEUE_ELIGIBLE.includes(d.decision));

  const sorted = [...eligible].sort((a, b) => {
    const priorityDelta = queuePriority(b) - queuePriority(a);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    if (a.reasoningRank !== b.reasoningRank) {
      return a.reasoningRank - b.reasoningRank;
    }

    return a.opportunityName.localeCompare(b.opportunityName);
  });

  return sorted.map((record, index) => ({
    ...record,
    queuePosition: index + 1,
    queuePriority: queuePriority(record),
  }));
}

export function mergeQueueWithExisting(
  existing: EnterpriseBuildQueueItem[],
  incoming: EnterpriseBuildQueueItem[],
  maxDepth: number,
): EnterpriseBuildQueueItem[] {
  const byId = new Map<string, EnterpriseBuildQueueItem>();

  for (const item of existing) {
    byId.set(item.opportunityId, item);
  }

  for (const item of incoming) {
    byId.set(item.opportunityId, item);
  }

  const merged = [...byId.values()].sort(
    (a, b) => a.queuePosition - b.queuePosition || b.queuePriority - a.queuePriority,
  );

  return merged.slice(0, maxDepth).map((item, index) => ({
    ...item,
    queuePosition: index + 1,
  }));
}
