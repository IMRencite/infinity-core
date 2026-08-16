import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_VIABILITY_THRESHOLDS,
  MONETIZATION_EXTRACTION_SCHEMA_VERSION,
  SCENARIO_MULTIPLIERS,
} from "@/lib/infinity/monetization-engine/constants";
import {
  calculateUnitEconomics,
  applyDerivedEconomicsToPlan,
} from "@/lib/infinity/monetization-engine/economics/calculate";
import { generateRevenueScenarios } from "@/lib/infinity/monetization-engine/economics/scenarios";
import {
  parseProviderMonetizationExtractionJson,
  providerMonetizationExtractionJsonSchema,
} from "@/lib/infinity/monetization-engine/schema";
import {
  calculateDeterministicMonetizationScores,
  selectBestPlanScore,
} from "@/lib/infinity/monetization-engine/scoring/calculate";
import {
  calculateCombinedDecisionScore,
  evaluateEconomicViability,
} from "@/lib/infinity/monetization-engine/viability/evaluate";
import { redactSecrets } from "@/lib/infinity/research/redaction";

function buildMockExtractionPayload() {
  return {
    schemaVersion: MONETIZATION_EXTRACTION_SCHEMA_VERSION,
    opportunityCandidateId: "candidate-1",
    limitations: ["mock limitation"],
    plans: [
      {
        planRole: "primary",
        modelType: "saas_subscription",
        modelName: "Compliance automation SaaS",
        customerType: "SMB",
        customerDescription: "US small businesses",
        payer: "Business owner",
        beneficiary: "Compliance team",
        valueProposition: "Automate compliance workflows",
        purchaseTrigger: "Audit pressure",
        offerDescription: "Monthly compliance automation platform",
        pricingModel: "subscription",
        estimatedPriceLow: 49,
        estimatedPriceBase: 99,
        estimatedPriceHigh: 199,
        billingFrequency: "monthly",
        estimatedCustomersYear1: 120,
        estimatedRevenuePerCustomer: 1188,
        estimatedVariableCosts: 25000,
        estimatedFixedCosts: 40000,
        estimatedCAC: 250,
        estimatedLTV: null,
        estimatedMonthsToFirstRevenue: 2,
        estimatedMonthsToBreakEven: 14,
        estimatedCapitalRequired: 50000,
        automationPotential: 0.85,
        scalabilityScore: 0.8,
        marginScore: 0.75,
        speedToRevenueScore: 0.7,
        customerAcquisitionDifficulty: 0.45,
        technicalComplexity: 0.4,
        operationalComplexity: 0.35,
        regulatoryRisk: 0.3,
        platformDependencyRisk: 0.2,
        monetizationConfidence: 0.72,
        keyAssumptions: ["SMBs pay for compliance tools", "Annual contracts possible"],
        risks: ["Regulatory complexity"],
        evidence: [
          {
            evidenceType: "saas_pricing",
            title: "Compliance SaaS pricing",
            claim: "SMB compliance tools often priced $50-$200/month",
            summary: "Market pricing band",
            sourceUrls: ["https://example.com/pricing"],
            grounded: true,
            limitations: [],
          },
        ],
        sourceUrls: ["https://example.com/pricing"],
        revenueStreams: [
          {
            streamRole: "primary",
            streamName: "Core subscription",
            modelType: "saas_subscription",
            description: "Monthly platform subscription",
            payer: "Business owner",
            pricingModel: "subscription",
            estimatedPriceBase: 99,
            billingFrequency: "monthly",
            estimatedShareOfRevenuePercent: 80,
            estimatedCustomersYear1: 120,
          },
          {
            streamRole: "secondary",
            streamName: "Implementation services",
            modelType: "service_product_hybrid",
            description: "Onboarding/setup fees",
            payer: "Business owner",
            pricingModel: "one_time",
            estimatedPriceBase: 500,
            billingFrequency: "one_time",
            estimatedShareOfRevenuePercent: 20,
            estimatedCustomersYear1: 40,
          },
        ],
        scoringAssessment: {
          revenuePotential: 0.72,
          marginPotential: 0.75,
          speedToRevenue: 0.7,
          recurringRevenuePotential: 0.85,
          automationPotential: 0.85,
          scalability: 0.8,
          customerAcquisitionFeasibility: 0.55,
          capitalEfficiency: 0.65,
          competition: 0.6,
          platformDependency: 0.2,
          operationalComplexity: 0.35,
          technicalComplexity: 0.4,
          evidenceConfidence: 0.7,
        },
      },
    ],
    recommendation: {
      recommendedPrimaryModel: "saas_subscription",
      recommendedSecondaryModels: ["service_product_hybrid"],
      recommendedPricingStrategy: "Tiered monthly subscription with onboarding fee",
      recommendedCustomer: "US SMB compliance teams",
      recommendedAcquisitionStrategy: "SEO + outbound to regulated industries",
      expectedRevenueMechanism: "Recurring subscription",
      expectedTimeToRevenue: "2-3 months",
      estimatedStartupCapital: 50000,
      keyEconomicAssumptions: ["Willingness to pay for compliance automation"],
      largestEconomicRisks: ["Long sales cycles in regulated industries"],
      confidence: 0.72,
    },
    validationExperiments: [
      {
        experimentType: "landing_page_demand_test",
        title: "Compliance automation landing page",
        description: "Test demand with pricing CTA",
        estimatedCostUsd: 150,
        priority: 1,
      },
      {
        experimentType: "pricing_test",
        title: "Price sensitivity survey",
        description: "Test $49 vs $99 vs $199 tiers",
        estimatedCostUsd: 200,
        priority: 2,
      },
    ],
  };
}

describe("Monetization Engine v1", () => {
  it("defines a provider extraction schema with required plan fields", () => {
    const schema = providerMonetizationExtractionJsonSchema();
    expect(schema.required).toContain("plans");
    expect(schema.required).toContain("recommendation");
  });

  it("parses and validates monetization extraction output", () => {
    const payload = buildMockExtractionPayload();
    const parsed = parseProviderMonetizationExtractionJson(
      JSON.stringify(payload),
      "candidate-1",
    );
    expect(parsed.plans).toHaveLength(1);
    expect(parsed.plans[0]?.revenueStreams).toHaveLength(2);
    expect(parsed.validationExperiments.length).toBeGreaterThan(0);
  });

  it("calculates unit economics deterministically", () => {
    const economics = calculateUnitEconomics({
      estimatedCustomersYear1: 100,
      estimatedRevenuePerCustomer: 1200,
      estimatedVariableCosts: 30000,
      estimatedFixedCosts: 50000,
      estimatedCAC: 200,
    });

    expect(economics.estimatedGrossRevenueYear1).toBe(120000);
    expect(economics.estimatedGrossProfitYear1).toBe(90000);
    expect(economics.estimatedGrossMarginPercent).toBe(75);
    expect(economics.contributionMarginPerCustomer).toBe(900);
    expect(economics.breakEvenCustomers).toBeCloseTo(55.56, 1);
    expect(economics.ltvCacRatio).toBeGreaterThan(1);
  });

  it("overwrites derived economics on plans", () => {
    const plan = applyDerivedEconomicsToPlan({
      estimatedCustomersYear1: 50,
      estimatedRevenuePerCustomer: 600,
      estimatedVariableCosts: 10000,
      estimatedFixedCosts: 20000,
      estimatedCAC: 100,
      estimatedLTV: null,
      marginScore: 70,
    });

    expect(plan.estimatedGrossRevenueYear1).toBe(30000);
    expect(plan.estimatedLTV).toBeGreaterThan(0);
    expect(plan.ltvCacRatio).not.toBeNull();
  });

  it("generates conservative/base/aggressive scenarios for all milestones", () => {
    const scenarios = generateRevenueScenarios({
      estimatedCustomersYear1: 120,
      estimatedRevenuePerCustomer: 1188,
      estimatedVariableCosts: 25000,
      estimatedFixedCosts: 40000,
      assumptions: ["Base year-one target"],
    });

    expect(scenarios).toHaveLength(12);
    const conservativeMonth12 = scenarios.find(
      (s) => s.scenarioType === "conservative" && s.milestoneMonth === 12,
    );
    const aggressiveMonth12 = scenarios.find(
      (s) => s.scenarioType === "aggressive" && s.milestoneMonth === 12,
    );
    expect(conservativeMonth12?.estimatedRevenue).toBeLessThan(
      aggressiveMonth12?.estimatedRevenue ?? 0,
    );
  });

  it("uses deterministic scenario multipliers", () => {
    expect(SCENARIO_MULTIPLIERS.conservative.customers).toBe(0.5);
    expect(SCENARIO_MULTIPLIERS.aggressive.price).toBe(1.15);
  });

  it("calculates monetization scores deterministically", () => {
    const scoresA = calculateDeterministicMonetizationScores({
      revenuePotential: 0.8,
      marginPotential: 0.7,
      speedToRevenue: 0.6,
      recurringRevenuePotential: 0.9,
      automationPotential: 0.85,
      scalability: 0.75,
      customerAcquisitionFeasibility: 0.55,
      capitalEfficiency: 0.65,
      competition: 0.6,
      platformDependency: 0.2,
      operationalComplexity: 0.3,
      technicalComplexity: 0.35,
      evidenceConfidence: 0.7,
    });
    const scoresB = calculateDeterministicMonetizationScores({
      revenuePotential: 0.8,
      marginPotential: 0.7,
      speedToRevenue: 0.6,
      recurringRevenuePotential: 0.9,
      automationPotential: 0.85,
      scalability: 0.75,
      customerAcquisitionFeasibility: 0.55,
      capitalEfficiency: 0.65,
      competition: 0.6,
      platformDependency: 0.2,
      operationalComplexity: 0.3,
      technicalComplexity: 0.35,
      evidenceConfidence: 0.7,
    });

    expect(scoresA.monetizationScore).toBe(scoresB.monetizationScore);
    expect(scoresA.monetizationScore).toBeGreaterThan(0);
    expect(scoresA.monetizationScore).toBeLessThanOrEqual(100);
  });

  it("uses configurable scoring weights that sum to 1", () => {
    const sum = Object.values(DEFAULT_SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("evaluates economic viability from combined scores", () => {
    const viability = evaluateEconomicViability({
      opportunityScore: 80,
      monetizationScore: 75,
    });
    expect(viability.state).toBe("STRONG");
    expect(viability.combinedDecisionScore).toBe(calculateCombinedDecisionScore({
      opportunityScore: 80,
      monetizationScore: 75,
    }));
  });

  it("maps viability thresholds to expected states", () => {
    expect(
      evaluateEconomicViability({
        opportunityScore: 50,
        monetizationScore: 50,
        thresholds: DEFAULT_VIABILITY_THRESHOLDS,
      }).state,
    ).toBe("SPECULATIVE");

    expect(
      evaluateEconomicViability({
        opportunityScore: 10,
        monetizationScore: 10,
      }).state,
    ).toBe("REJECT");
  });

  it("selects the best plan by monetization score", () => {
    const best = selectBestPlanScore([
      { monetizationScore: 55 },
      { monetizationScore: 82 },
      { monetizationScore: 61 },
    ]);
    expect(best?.monetizationScore).toBe(82);
  });

  it("redacts secrets from monetization payloads", () => {
    const redacted = redactSecrets("GEMINI_API_KEY=super-secret-key-value-12345");
    expect(redacted).not.toContain("super-secret-key-value-12345");
  });

  it("does not import launch-gateway execution modules", () => {
    const root = join(process.cwd(), "lib/infinity/monetization-engine");
    const files = readdirSync(root, { recursive: true }).filter(
      (file): file is string => typeof file === "string" && file.endsWith(".ts"),
    );
    for (const file of files) {
      const content = readFileSync(join(root, file), "utf8");
      expect(content).not.toMatch(/launch-gateway\/execute-live/);
    }
  });
});
