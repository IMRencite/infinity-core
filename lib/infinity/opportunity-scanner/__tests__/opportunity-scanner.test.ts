import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SCORING_WEIGHTS,
  OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION,
} from "@/lib/infinity/opportunity-scanner/constants";
import {
  buildCandidateDedupKey,
  dedupeOpportunityCandidates,
} from "@/lib/infinity/opportunity-scanner/dedupe/dedupe";
import {
  parseProviderExtractionJson,
  providerExtractionJsonSchema,
  validateProviderExtractionOutput,
} from "@/lib/infinity/opportunity-scanner/schema";
import {
  calculateDeterministicScores,
  rankCandidates,
} from "@/lib/infinity/opportunity-scanner/scoring/calculate";
import { resolveDiscoveryStrategies } from "@/lib/infinity/opportunity-scanner/strategies";
import { redactSecrets } from "@/lib/infinity/research/redaction";

function buildMockExtractionPayload() {
  return {
    schemaVersion: OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION,
    strategyId: "market_pain_discovery",
    limitations: ["mock limitation"],
    candidates: [
      {
        candidateId: "c1",
        title: "Automated compliance for SMBs",
        summary: "SMBs lack affordable compliance automation.",
        problem: "Manual compliance is expensive for small businesses.",
        targetCustomer: "US small businesses",
        market: "United States SMB software",
        businessModelCandidates: ["saas"],
        revenueMechanismCandidates: ["subscription"],
        demandEvidence: [
          {
            signalType: "recurring_pain_points",
            claim: "SMBs spend heavily on manual compliance.",
            observedSignal: "Rising compliance software spend",
            relevance: "High recurring pain",
            sourceUrls: [],
            grounded: true,
            limitations: [],
          },
        ],
        marketEvidence: [],
        competitionEvidence: [],
        monetizationEvidence: [],
        distributionEvidence: [],
        buildabilityEvidence: [],
        risks: ["Regulatory complexity"],
        unknowns: ["Exact TAM"],
        scoringAssessment: {
          demandStrength: 0.8,
          marketGrowth: 0.7,
          competitionWeakness: 0.6,
          monetizationPotential: 0.7,
          buildability: 0.65,
          automationPotential: 0.8,
          distributionStrength: 0.55,
          capitalEfficiency: 0.7,
          speedToRevenue: 0.6,
          evidenceConfidence: 0.75,
        },
      },
    ],
  };
}

describe("Opportunity Scanner v1 foundation", () => {
  it("validates extraction schema output", () => {
    const payload = buildMockExtractionPayload();
    const validated = validateProviderExtractionOutput(payload, "market_pain_discovery");
    expect(validated.candidates).toHaveLength(1);
  });

  it("uses Gemini-compatible extraction JSON schema", () => {
    const schema = JSON.stringify(providerExtractionJsonSchema());
    expect(schema).not.toContain('"const"');
    expect(schema).not.toMatch(/"type":\s*\[/);
  });

  it("calculates deterministic scores from assessment inputs", () => {
    const first = calculateDeterministicScores({
      demandStrength: 0.8,
      marketGrowth: 0.7,
      competitionWeakness: 0.6,
      monetizationPotential: 0.7,
      buildability: 0.65,
      automationPotential: 0.8,
      distributionStrength: 0.55,
      capitalEfficiency: 0.7,
      speedToRevenue: 0.6,
      evidenceConfidence: 0.75,
    });
    const second = calculateDeterministicScores({
      demandStrength: 0.8,
      marketGrowth: 0.7,
      competitionWeakness: 0.6,
      monetizationPotential: 0.7,
      buildability: 0.65,
      automationPotential: 0.8,
      distributionStrength: 0.55,
      capitalEfficiency: 0.7,
      speedToRevenue: 0.6,
      evidenceConfidence: 0.75,
    });
    expect(first.opportunityScore).toBe(second.opportunityScore);
    expect(first.opportunityScore).toBeGreaterThan(0);
    expect(first.opportunityScore).toBeLessThanOrEqual(100);
  });

  it("documents configurable scoring weights that sum to 1", () => {
    const total = Object.values(DEFAULT_SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("dedupes exact and near duplicate candidates", () => {
    const base = {
      title: "Automated compliance for SMBs",
      summary: "Summary",
      problem: "Manual compliance is expensive",
      targetCustomer: "SMBs",
      market: "United States",
      businessModelCandidates: ["saas"] as never,
      revenueMechanismCandidates: ["subscription"],
      demandEvidence: [],
      marketEvidence: [],
      competitionEvidence: [],
      monetizationEvidence: [],
      distributionEvidence: [],
      buildabilityEvidence: [],
      risks: [],
      unknowns: [],
      researchSources: [],
      researchRunIds: ["run-1"],
      discoveryStrategies: ["market_pain_discovery"] as never,
      mergeGroupKey: null,
    };

    const a = {
      ...base,
      mergeGroupKey: "shared-group",
      dedupKey: buildCandidateDedupKey({
        title: base.title,
        problem: base.problem,
        market: base.market,
        businessModelCandidates: ["saas"],
      }),
    };
    const b = {
      ...base,
      title: "Automated compliance for small businesses",
      mergeGroupKey: a.mergeGroupKey ?? "shared-group",
      dedupKey: buildCandidateDedupKey({
        title: "Automated compliance for small businesses",
        problem: base.problem,
        market: base.market,
        businessModelCandidates: ["saas"],
      }),
    };

    const result = dedupeOpportunityCandidates([a, b]);
    expect(result.kept).toHaveLength(1);
    expect(result.mergedCount).toBe(1);
  });

  it("ranks candidates by opportunity score", () => {
    const ranked = rankCandidates([
      { id: "a", opportunityScore: 55 },
      { id: "b", opportunityScore: 82 },
      { id: "c", opportunityScore: 67 },
    ]);
    expect(ranked[0]?.id).toBe("b");
    expect(ranked[0]?.rankPosition).toBe(1);
  });

  it("parses provider extraction JSON", () => {
    const payload = buildMockExtractionPayload();
    const parsed = parseProviderExtractionJson(
      JSON.stringify(payload),
      "market_pain_discovery",
    );
    expect(parsed.candidates[0]?.title).toContain("compliance");
  });

  it("resolves discovery strategies", () => {
    const strategies = resolveDiscoveryStrategies([
      "market_pain_discovery",
      "search_demand_discovery",
    ]);
    expect(strategies).toHaveLength(2);
    expect(strategies[0]?.id).toBe("market_pain_discovery");
  });

  it("redacts gemini api key patterns", () => {
    const redacted = redactSecrets("key AIzaSyDUMMYKEY123456789012345678901234");
    expect(redacted).not.toContain("AIzaSy");
  });

  it("does not import launch gateway from opportunity scanner module", () => {
    const root = join(process.cwd(), "lib/infinity/opportunity-scanner");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "__tests__") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".ts")) files.push(full);
      }
    };
    walk(root);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(/launch-gateway/);
      expect(content).not.toMatch(/executeExternalActionViaGateway/);
    }
  });
});
