import { DEFAULT_QUALITY_THRESHOLDS } from "../constants";
import type {
  CannibalizationAction,
  CannibalizationLevel,
  PageDecision,
} from "../constants";
import type { PageDecisionRecord, PageOpportunity, PageOpportunityScore } from "../types";

export function normalizeTopicKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function assessPairCannibalization(
  a: PageOpportunity,
  b: PageOpportunity,
): { level: CannibalizationLevel; action: CannibalizationAction; reason: string } {
  const topicA = normalizeTopicKey(a.proposedTopic);
  const topicB = normalizeTopicKey(b.proposedTopic);

  if (topicA === topicB && a.primaryIntent === b.primaryIntent) {
    return { level: "DUPLICATE", action: "MERGE", reason: "Same topic and intent" };
  }

  if (
    a.pageType === b.pageType &&
    a.primaryEntity === b.primaryEntity &&
    a.primaryIntent === b.primaryIntent
  ) {
    return { level: "DUPLICATE", action: "MERGE", reason: "Same entity, page type, and intent" };
  }

  const overlap = tokenOverlap(topicA, topicB);
  if (overlap > 0.85 && a.primaryIntent === b.primaryIntent) {
    return { level: "OVERLAPPING", action: "MERGE", reason: "Near-duplicate topic with same intent" };
  }

  if (
    a.geographicContext?.city &&
    b.geographicContext?.city === a.geographicContext.city &&
    a.pageType === "neighborhood" &&
    b.pageType === "city"
  ) {
    if (a.thinContentRisk > 0.6) {
      return { level: "OVERLAPPING", action: "CANONICALIZE", reason: "Weak neighborhood differentiation vs city hub" };
    }
    return { level: "RELATED", action: "CREATE", reason: "Distinct neighborhood spoke under city hub" };
  }

  if (overlap > 0.65 && a.primaryIntent === b.primaryIntent) {
    return { level: "OVERLAPPING", action: "DIFFERENTIATE", reason: "High semantic overlap" };
  }

  if (overlap > 0.4) {
    return { level: "RELATED", action: "CREATE", reason: "Related but distinct topics" };
  }

  return { level: "DISTINCT", action: "CREATE", reason: "Distinct intent/entity/topic" };
}

function tokenOverlap(a: string, b: string): number {
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  return intersection / Math.max(setA.size, setB.size);
}

export function buildCannibalizationMatrix(
  opportunities: PageOpportunity[],
): Map<string, { level: CannibalizationLevel; action: CannibalizationAction; againstId: string; reason: string }[]> {
  const matrix = new Map<string, { level: CannibalizationLevel; action: CannibalizationAction; againstId: string; reason: string }[]>();
  for (let i = 0; i < opportunities.length; i += 1) {
    for (let j = i + 1; j < opportunities.length; j += 1) {
      const a = opportunities[i]!;
      const b = opportunities[j]!;
      const result = assessPairCannibalization(a, b);
      const listA = matrix.get(a.pageOpportunityId) ?? [];
      listA.push({ ...result, againstId: b.pageOpportunityId });
      matrix.set(a.pageOpportunityId, listA);
      const listB = matrix.get(b.pageOpportunityId) ?? [];
      listB.push({ ...result, againstId: a.pageOpportunityId });
      matrix.set(b.pageOpportunityId, listB);
    }
  }
  return matrix;
}

export function decidePages(
  opportunities: PageOpportunity[],
  scores: PageOpportunityScore[],
  options?: {
    viabilityRecommendation?: string;
    minScore?: number;
    maxThinContentRisk?: number;
  },
): PageDecisionRecord[] {
  const minScore = options?.minScore ?? DEFAULT_QUALITY_THRESHOLDS.minPageOpportunityScore;
  const maxThin = options?.maxThinContentRisk ?? DEFAULT_QUALITY_THRESHOLDS.maxThinContentRisk;
  const matrix = buildCannibalizationMatrix(opportunities);
  const scoreMap = new Map(scores.map((s) => [s.pageOpportunityId, s]));
  const decisions: PageDecisionRecord[] = [];
  const rejected = new Set<string>();
  const merged = new Set<string>();

  const sorted = [...opportunities].sort(
    (a, b) => (scoreMap.get(b.pageOpportunityId)?.score ?? 0) - (scoreMap.get(a.pageOpportunityId)?.score ?? 0),
  );

  for (const opp of sorted) {
    if (rejected.has(opp.pageOpportunityId) || merged.has(opp.pageOpportunityId)) continue;

    const score = scoreMap.get(opp.pageOpportunityId)?.score ?? 0;
    const conflicts = matrix.get(opp.pageOpportunityId) ?? [];
    const duplicate = conflicts.find((c) => {
      if (c.level !== "DUPLICATE") return false;
      const againstDecision = decisions.find((d) => d.pageOpportunityId === c.againstId);
      return againstDecision?.decision === "CREATE";
    });
    const overlapping = conflicts.find((c) => c.level === "OVERLAPPING");

    let decision: PageDecision = "CREATE";
    let reason = "Meets quality, differentiation, and economics thresholds";
    let cannibalizationLevel: CannibalizationLevel | undefined;
    let cannibalizationAction: CannibalizationAction | undefined;

    if (options?.viabilityRecommendation === "NONE" && opp.pageType !== "homepage") {
      decision = "REJECT";
      reason = "Organic acquisition not recommended for this venture";
    } else if (duplicate) {
      decision = "MERGE";
      reason = duplicate.reason;
      cannibalizationLevel = "DUPLICATE";
      cannibalizationAction = "MERGE";
      merged.add(opp.pageOpportunityId);
    } else if (opp.thinContentRisk > maxThin) {
      decision = opp.pageType === "neighborhood" ? "MERGE" : "REJECT";
      reason = `Thin content risk ${Math.round(opp.thinContentRisk * 100)} exceeds threshold`;
    } else if (score < minScore * 0.6) {
      decision = "REJECT";
      reason = `Page opportunity score ${score} below minimum`;
    } else if (
      (opp.pageType === "route" || opp.pageType === "category" || opp.pageType === "directory") &&
      score < minScore &&
      score >= minScore * 0.55 &&
      opp.crawlValue >= 0.4
    ) {
      decision = "NOINDEX";
      reason = "Navigationally useful page not appropriate for search indexing";
    } else if (score < minScore) {
      decision = "DEFER";
      reason = `Page opportunity score ${score} below approval threshold — defer to later wave`;
    } else if (overlapping && overlapping.action !== "CREATE") {
      decision = overlapping.action === "CANONICALIZE" ? "SUPPORTING_ONLY" : "MERGE";
      reason = overlapping.reason;
      cannibalizationLevel = "OVERLAPPING";
      cannibalizationAction = overlapping.action;
    } else if (opp.evidenceAvailability < 0.25 && /fact|regulation|statistic/i.test(opp.proposedPurpose)) {
      decision = "DEFER";
      reason = "Insufficient evidence for factual authority page";
    } else if (opp.pageType === "programmatic_page" && opp.uniquenessPotential < 0.35) {
      decision = "REJECT";
      reason = "Programmatic page lacks unique value plan";
    }

    if (decision === "REJECT") rejected.add(opp.pageOpportunityId);
    if (decision === "MERGE") merged.add(opp.pageOpportunityId);

    decisions.push({
      pageOpportunityId: opp.pageOpportunityId,
      decision,
      reason,
      cannibalizationLevel,
      cannibalizationAction,
    });
  }

  return decisions;
}

export function deduplicateOpportunities(opportunities: PageOpportunity[]): {
  deduplicated: PageOpportunity[];
  rawCount: number;
  removed: number;
} {
  const seen = new Set<string>();
  const deduplicated: PageOpportunity[] = [];
  for (const opp of opportunities) {
    const key = `${opp.pageType}|${normalizeTopicKey(opp.proposedTopic)}|${opp.primaryIntent}|${opp.geographicContext?.city ?? ""}|${opp.geographicContext?.neighborhood ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduplicated.push(opp);
  }
  return { deduplicated, rawCount: opportunities.length, removed: opportunities.length - deduplicated.length };
}
