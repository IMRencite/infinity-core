import { sourceIdentityKey } from "../normalization/dedupe";
import type {
  NormalizedEvidenceItem,
  NormalizedSource,
  ResearchFinding,
  ResearchResult,
} from "../types";

function findingIdentity(item: NormalizedEvidenceItem): string {
  return `${item.signalType}:${item.claim.trim().toLowerCase()}`;
}

export function mergeNormalizedResearch(initial: ResearchResult, gapFill: ResearchResult): ResearchResult {
  const sources: NormalizedSource[] = [];
  const sourceIdByIdentity = new Map<string, string>();
  const remap = new Map<string, string>();

  for (const source of [...initial.sources, ...gapFill.sources]) {
    const identity = sourceIdentityKey(source.canonicalUrl || source.url);
    const existingId = sourceIdByIdentity.get(identity);
    if (existingId) {
      remap.set(source.sourceId, existingId);
      continue;
    }
    const nextId = `src_${sources.length + 1}`;
    sourceIdByIdentity.set(identity, nextId);
    remap.set(source.sourceId, nextId);
    sources.push({ ...source, sourceId: nextId, providerChunkIndex: sources.length });
  }

  const evidence: NormalizedEvidenceItem[] = [];
  const seenFinding = new Set<string>();
  const seenIdentity = new Set<string>();
  for (const item of [...initial.evidence, ...gapFill.evidence]) {
    if (seenFinding.has(item.findingId) || seenIdentity.has(findingIdentity(item))) continue;
    seenFinding.add(item.findingId);
    seenIdentity.add(findingIdentity(item));
    evidence.push({
      ...item,
      sourceIds: [...new Set(item.sourceIds.map((id) => remap.get(id) ?? id))],
    });
  }

  const findings: ResearchFinding[] = evidence.map((item) => ({
    findingId: item.findingId,
    summary: item.claim,
    signalType: item.signalType,
    evidenceIds: [item.evidenceId],
  }));

  return {
    ...initial,
    findings,
    evidence,
    sources,
    summary: [initial.summary, gapFill.summary].filter(Boolean).join(" ").slice(0, 800),
    limitations: [...new Set([...initial.limitations, ...gapFill.limitations])].slice(0, 12),
    requiresMoreResearch: initial.requiresMoreResearch || gapFill.requiresMoreResearch,
    tokenUsage: {
      inputTokens: initial.tokenUsage.inputTokens + gapFill.tokenUsage.inputTokens,
      outputTokens: initial.tokenUsage.outputTokens + gapFill.tokenUsage.outputTokens,
      totalTokens: initial.tokenUsage.totalTokens + gapFill.tokenUsage.totalTokens,
    },
    groundingUsage: {
      webSearchQueries: [...initial.groundingUsage.webSearchQueries, ...gapFill.groundingUsage.webSearchQueries],
      searchQueryCount:
        initial.groundingUsage.searchQueryCount + gapFill.groundingUsage.searchQueryCount,
      groundingChunkCount:
        initial.groundingUsage.groundingChunkCount + gapFill.groundingUsage.groundingChunkCount,
      groundingSupportCount:
        initial.groundingUsage.groundingSupportCount + gapFill.groundingUsage.groundingSupportCount,
      groundingInvoked: initial.groundingUsage.groundingInvoked || gapFill.groundingUsage.groundingInvoked,
      searchCostKnown: initial.groundingUsage.searchCostKnown && gapFill.groundingUsage.searchCostKnown,
    },
    estimatedCostUsd:
      initial.estimatedCostUsd == null || gapFill.estimatedCostUsd == null
        ? null
        : initial.estimatedCostUsd + gapFill.estimatedCostUsd,
    costUncertainty: [initial.costUncertainty, gapFill.costUncertainty].filter(Boolean).join(" | ") || null,
    latencyMs: initial.latencyMs + gapFill.latencyMs,
  };
}
