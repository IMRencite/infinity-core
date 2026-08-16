import { createHash } from "node:crypto";
import type { OpportunityCandidateDraft } from "../types";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCandidateDedupKey(input: {
  title: string;
  problem: string;
  market: string;
  businessModelCandidates: string[];
}): string {
  const payload = [
    normalizeText(input.title),
    normalizeText(input.problem).slice(0, 120),
    normalizeText(input.market).slice(0, 80),
    [...input.businessModelCandidates].sort().join(","),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function buildMergeGroupKey(input: {
  problem: string;
  market: string;
  businessModelCandidates: string[];
}): string {
  const payload = [
    normalizeText(input.problem).slice(0, 160),
    normalizeText(input.market).slice(0, 80),
    [...input.businessModelCandidates].sort().join(","),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  return overlap / Math.max(tokensA.size, tokensB.size);
}

export type DedupeResult = {
  kept: OpportunityCandidateDraft[];
  mergedCount: number;
};

export function dedupeOpportunityCandidates(
  candidates: OpportunityCandidateDraft[],
): DedupeResult {
  const kept: OpportunityCandidateDraft[] = [];
  let mergedCount = 0;

  for (const candidate of candidates) {
    const exact = kept.find((existing) => existing.dedupKey === candidate.dedupKey);
    if (exact) {
      mergeCandidateEvidence(exact, candidate);
      mergedCount += 1;
      continue;
    }

    const near = kept.find((existing) => {
      if (existing.mergeGroupKey && existing.mergeGroupKey === candidate.mergeGroupKey) {
        return true;
      }
      return tokenOverlap(existing.title, candidate.title) >= 0.72;
    });

    if (near) {
      mergeCandidateEvidence(near, candidate);
      mergedCount += 1;
      continue;
    }

    kept.push(candidate);
  }

  return { kept, mergedCount };
}

function mergeCandidateEvidence(
  target: OpportunityCandidateDraft,
  incoming: OpportunityCandidateDraft,
): void {
  target.demandEvidence.push(...incoming.demandEvidence);
  target.marketEvidence.push(...incoming.marketEvidence);
  target.competitionEvidence.push(...incoming.competitionEvidence);
  target.monetizationEvidence.push(...incoming.monetizationEvidence);
  target.distributionEvidence.push(...incoming.distributionEvidence);
  target.buildabilityEvidence.push(...incoming.buildabilityEvidence);
  target.risks = [...new Set([...target.risks, ...incoming.risks])];
  target.unknowns = [...new Set([...target.unknowns, ...incoming.unknowns])];
  target.researchRunIds = [...new Set([...target.researchRunIds, ...incoming.researchRunIds])];
  target.discoveryStrategies = [
    ...new Set([...target.discoveryStrategies, ...incoming.discoveryStrategies]),
  ];

  const sourceKeys = new Set(target.researchSources.map((s) => s.url));
  for (const source of incoming.researchSources) {
    if (!sourceKeys.has(source.url)) {
      target.researchSources.push(source);
      sourceKeys.add(source.url);
    }
  }
}
