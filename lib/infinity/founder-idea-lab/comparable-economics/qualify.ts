import type { FounderResearchFinding, FounderResearchPacket } from "../research-packet";
import {
  COMPARABLE_SIMILARITY_FACTORS,
  type ComparableBusiness,
  type ComparableConfidenceBand,
  type ComparableSimilarityFactor,
} from "./types";
import { confidenceFromSupport } from "./provenance";

const FACTOR_PATTERNS: Record<ComparableSimilarityFactor, RegExp> = {
  same_target_customer: /\b(smb|small business|local business|dealer|owner|operator)\b/i,
  similar_delivery_model: /\b(website|cms|platform|saas|hosted|managed site|web package)\b/i,
  similar_recurring_revenue_model: /\b(monthly|subscription|retainer|recurring|per month|\/mo)\b/i,
  similar_customer_value_proposition: /\b(leads?|seo|aeo|rank|content|marketing)\b/i,
  similar_acquisition_model: /\b(paid search|seo|agency|outbound|partner|reseller|referral)\b/i,
  similar_pricing_structure: /\b(setup|onboarding|package|tier|seat|location fee)\b/i,
  similar_service_intensity: /\b(managed|done-for-you|agency|full.?service|self-serve)\b/i,
};

const WEAK_EXCLUSION = /\b(hyperscale|enterprise erp|global cloud iaas|unrelated crm giant)\b/i;

export type VentureContext = {
  title: string;
  description: string;
  targetCustomer: string | null;
  problem: string | null;
  proposedSolution: string | null;
  businessModelHypothesis: string | null;
  pricingHypothesis: string | null;
};

function contextText(context: VentureContext): string {
  return [
    context.title,
    context.description,
    context.targetCustomer,
    context.problem,
    context.proposedSolution,
    context.businessModelHypothesis,
    context.pricingHypothesis,
  ]
    .filter(Boolean)
    .join(" ");
}

export function similarityForClaim(claim: string, context: VentureContext): Partial<Record<ComparableSimilarityFactor, boolean>> {
  const haystack = `${claim} ${contextText(context)}`;
  const similarity: Partial<Record<ComparableSimilarityFactor, boolean>> = {};
  for (const factor of COMPARABLE_SIMILARITY_FACTORS) {
    similarity[factor] = FACTOR_PATTERNS[factor].test(haystack);
  }
  return similarity;
}

export function similarityScore(similarity: Partial<Record<ComparableSimilarityFactor, boolean>>): number {
  const hits = COMPARABLE_SIMILARITY_FACTORS.filter((factor) => similarity[factor]).length;
  return Math.round((hits / COMPARABLE_SIMILARITY_FACTORS.length) * 100) / 100;
}

export function confidenceBand(score: number, excluded: boolean): ComparableConfidenceBand {
  if (excluded || score < 0.29) return "WEAK_EXCLUDED";
  if (score >= 0.58) return "HIGH";
  return "MEDIUM";
}

function nameFromFinding(finding: FounderResearchFinding, packet: FounderResearchPacket): string {
  if (finding.verifiesFounderCompetitor?.trim()) return finding.verifiesFounderCompetitor.trim();
  const named = finding.claim.match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/);
  if (named && !["The", "A", "An", "SMB", "CMS", "SEO", "AEO"].includes(named[1]!)) return named[1]!;
  return packet.verifiedCompetitors[0] ?? packet.competitorLeads[0] ?? "Unnamed category comparable";
}

export function qualifyComparables(input: {
  packet: FounderResearchPacket;
  context: VentureContext;
}): { included: ComparableBusiness[]; excluded: ComparableBusiness[] } {
  const included: ComparableBusiness[] = [];
  const excluded: ComparableBusiness[] = [];
  const seen = new Set<string>();

  const economicFindings = input.packet.findings.filter((finding) =>
    ["monetization", "pricing", "competition", "distribution", "capital_efficiency"].includes(finding.dimension),
  );

  const named = [
    ...input.packet.verifiedCompetitors,
    ...input.packet.competitorLeads,
  ].filter((name, index, all) => name.trim() && all.indexOf(name) === index);

  const seeds: Array<{ name: string; findings: FounderResearchFinding[] }> = named.length
    ? named.map((name) => ({
        name,
        findings: economicFindings.filter(
          (finding) =>
            finding.verifiesFounderCompetitor === name ||
            finding.claim.toLowerCase().includes(name.toLowerCase()),
        ),
      }))
    : economicFindings.length
      ? [{ name: "Category comparable set", findings: economicFindings }]
      : [];

  for (const seed of seeds) {
    const key = seed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const claims = seed.findings.map((item) => item.claim).join(" ");
    const similarity = similarityForClaim(claims || seed.name, input.context);
    const score = similarityScore(similarity);
    const weak = WEAK_EXCLUSION.test(claims) || score < 0.29;
    const sourceRefs = [...new Set(seed.findings.flatMap((item) => item.sourceUrls))];
    const band = confidenceBand(score, weak);
    const row: ComparableBusiness = {
      id: `comparable:${key.replace(/\s+/g, "-")}`,
      name: seed.name,
      category: "discovered_from_research",
      whyComparable: claims
        ? claims.slice(0, 240)
        : "Named in research packet without detailed economic evidence.",
      similarity,
      similarityScore: score,
      confidenceBand: band,
      sourceRefs,
      pricingEvidence: seed.findings.filter((item) => item.dimension === "pricing").map((item) => item.claim),
      businessModelEvidence: seed.findings.filter((item) => item.dimension === "monetization").map((item) => item.claim),
      customerEvidence: seed.findings.filter((item) => /customer|smb|business/i.test(item.claim)).map((item) => item.claim),
      distributionEvidence: seed.findings.filter((item) => item.dimension === "distribution").map((item) => item.claim),
      economicBenchmarkEvidence: seed.findings
        .filter((item) => item.dimension === "capital_efficiency" || /cac|ltv|churn|margin/i.test(item.claim))
        .map((item) => item.claim),
      confidence: confidenceFromSupport({
        sourceCount: sourceRefs.length,
        comparableCount: 1,
        grounded: seed.findings.some((item) => item.grounded),
      }),
    };
    if (band === "WEAK_EXCLUDED") excluded.push(row);
    else included.push(row);
  }

  return { included, excluded };
}
