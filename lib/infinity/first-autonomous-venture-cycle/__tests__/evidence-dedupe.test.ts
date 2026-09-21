import { describe, expect, it } from "vitest";
import {
  canonicalValidationSourceKey,
  dedupeValidationClaims,
  dedupeValidationSourceUrls,
} from "@/lib/infinity/first-autonomous-venture-cycle/bounded-validation/evidence-dedupe";
import { classifySourceNovelty, deriveValidationCredit } from "@/lib/infinity/first-autonomous-venture-cycle/bounded-validation/evidence-relevance";
import { classifyEvidenceRelevance } from "@/lib/infinity/first-autonomous-venture-cycle/bounded-validation/evidence-relevance";

const redirectA =
  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AU4P1abc123";
const redirectB =
  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AU4P1abc123?query=1";

describe("validation evidence dedupe", () => {
  it("counts duplicate vertex redirect URLs once", () => {
    const deduped = dedupeValidationSourceUrls([redirectA, redirectB, redirectA]);
    expect(deduped.rawCount).toBe(3);
    expect(deduped.uniqueCount).toBe(1);
    expect(deduped.duplicateCount).toBe(2);
    expect(canonicalValidationSourceKey(redirectA)).toBe(canonicalValidationSourceKey(redirectB));
  });

  it("counts duplicate claims once", () => {
    const claim = "Customer acquisition cost for SaaS tools averages $500-$700.";
    const deduped = dedupeValidationClaims([claim, `  ${claim}  `, claim.toUpperCase()]);
    expect(deduped.rawCount).toBe(3);
    expect(deduped.uniqueCount).toBe(1);
    expect(deduped.duplicateCount).toBe(2);
  });

  it("does not inflate diversity with duplicate sources", () => {
    const prior = new Set<string>();
    const novelty = classifySourceNovelty([redirectA, redirectB, redirectA], prior);
    expect(novelty.newSourceCount).toBe(1);

    const inflatedNovelty = classifySourceNovelty([redirectA, redirectB, redirectA], prior);
    expect(inflatedNovelty.newSourceCount).toBeLessThan(3);
  });

  it("still credits unique direct sources", () => {
    const urlA = "https://example.com/report-a";
    const urlB = "https://example.com/report-b";
    const novelty = classifySourceNovelty([urlA, urlB], new Set());
    expect(novelty.newSourceCount).toBe(2);
    const relevance = classifyEvidenceRelevance({
      assumption: {
        assumption: "Customer acquisition cost can be kept near $518.",
        category: "distribution",
        assumptionType: "estimated",
        value: "518",
        confidence: 0.6,
        evidence: [],
        sourceUrls: [],
        impactIfWrong: "Unit economics fail",
        validationMethod: "comparable_benchmark_research",
        validationCostEstimate: null,
        validationTimeEstimate: null,
        impactScore: 0.8,
        uncertaintyScore: 0.7,
        fatalRiskContribution: 0.3,
        fallbackUsed: false,
        fallbackReason: null,
        evidenceSources: [],
      },
      evidenceText: "Average CAC for comparable SaaS is $518 per customer.",
      experimentType: "comparable_benchmark_research",
    });
    const credit = deriveValidationCredit({
      relevance,
      newSourceCount: novelty.newSourceCount,
      reusedSourceCount: 0,
      hasQuantitativeClaim: true,
    });
    expect(credit.validationResult).not.toBe("IRRELEVANT");
    expect(credit.uncertaintyReduction).toBeGreaterThan(0);
  });
});
