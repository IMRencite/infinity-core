import { describe, it, expect } from "vitest";
import { buildUpstreamOrganicInput, buildVentureOrganicContextFromBlueprint } from "../adapters/upstream-context";
import { decidePages } from "../decisions/cannibalization-engine";
import { resolveMonetizationEconomics, economicsInfluenceApproval } from "../economics/monetization-economics";
import {
  calculateMarginalPageEconomics,
  filterByMarginalEconomics,
} from "../economics/marginal-page-economics";
import { runOrganicPabHandoff, simulateOrganicPageGeneration } from "../integration/pab-handoff";
import { executeOrganicPipelineForPackage } from "../pipeline/run-pipeline";
import { applyPostGenerationRepair } from "../quality/post-generation-repair";
import {
  buildNeighborhoodInformationGainPlan,
  evaluateNeighborhoodViability,
} from "../local/neighborhood-viability";
import { assessThinContentRisk } from "../quality/quality-gates";
import { validateGeneratedOrganicArtifact } from "../quality/post-generation-gate";
import { enrichContextWithGroundedResearch } from "../research/grounded-evidence";
import { processVentureOrganicArchitecture } from "../process-venture";
import {
  TEST_VENTURE_A_HIGH_VALUE_B2B,
  TEST_VENTURE_D_LOW_VALUE,
  TEST_VENTURE_E_LOCAL_SERVICE,
} from "../fixtures/test-ventures";
import type { LoadedMonetizationPlan } from "@/lib/infinity/venture-selection/types";
import type { VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { PageOpportunity } from "../types";
import { generatePageOpportunityId } from "../graph/search-answer-opportunity-graph";
import { calculatePageOpportunityScore } from "../scoring/page-opportunity-score";
import { runOrganicGrowthPabVerification } from "../run";

const lineage = { inputMode: "simulation" as const, capabilityTest: true };

function lowValueMonetizationPlan(): LoadedMonetizationPlan {
  return {
    id: "plan-low",
    modelType: "subscription",
    modelName: "Low value",
    monetizationScore: 20,
    estimatedCapitalRequired: 5000,
    estimatedPriceBase: 10,
    estimatedCustomersYear1: 50,
    estimatedMonthsToFirstRevenue: 12,
    estimatedGrossRevenueYear1: 5000,
    estimatedGrossMarginPercent: 40,
    estimatedFixedCosts: 2000,
    estimatedVariableCosts: 500,
    estimatedCAC: 200,
    estimatedLTV: 100,
    ltvCacRatio: 0.5,
    automationPotential: 0.5,
    technicalComplexity: 0.3,
    operationalComplexity: 0.3,
    regulatoryRisk: 0.2,
    platformDependencyRisk: 0.2,
    customerAcquisitionDifficulty: 0.7,
    keyAssumptions: [],
    risks: [],
    sourceUrls: [],
    revenueStreams: [],
  };
}

function highValueMonetizationPlan(): LoadedMonetizationPlan {
  return {
    ...lowValueMonetizationPlan(),
    id: "plan-high",
    estimatedLTV: 5000,
    estimatedPriceBase: 500,
    estimatedGrossRevenueYear1: 500_000,
    estimatedGrossMarginPercent: 75,
    ltvCacRatio: 4,
    estimatedCustomersYear1: 500,
  };
}

describe("Organic Growth v1.1 verification closure", () => {
  it("monetization economics change marginal page value and approval thresholds", () => {
    const opp: PageOpportunity = {
      pageOpportunityId: generatePageOpportunityId(),
      ventureId: "econ-test",
      pageType: "guide",
      primaryEntity: "Widget",
      secondaryEntities: [],
      primaryIntent: "informational",
      secondaryIntents: [],
      buyerStage: "awareness",
      proposedTopic: "Widget guide",
      proposedPurpose: "Explain widgets",
      commercialRelationship: "authority_support",
      conversionRelationship: "assisted_conversion",
      authorityRelationship: "spoke",
      searchDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
      aiAnswerDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
      uniquenessPotential: 0.6,
      evidenceAvailability: 0.6,
      contentDepthPotential: 0.6,
      citationPotential: 0.5,
      programmaticPotential: 0.1,
      estimatedProductionCost: 300,
      estimatedResearchCost: 50,
      estimatedMaintenanceCost: 20,
      estimatedTrafficPotential: 500,
      estimatedConversionPotential: 0.02,
      estimatedRevenueContribution: 200,
      cannibalizationRisk: 0.2,
      thinContentRisk: 0.2,
      crawlValue: 0.5,
      confidence: 0.7,
    };

    const lowEcon = resolveMonetizationEconomics(TEST_VENTURE_D_LOW_VALUE, lowValueMonetizationPlan());
    const highEcon = resolveMonetizationEconomics(TEST_VENTURE_A_HIGH_VALUE_B2B, highValueMonetizationPlan());

    const lowMarginal = calculateMarginalPageEconomics(opp, TEST_VENTURE_D_LOW_VALUE, lowEcon);
    const highMarginal = calculateMarginalPageEconomics(opp, TEST_VENTURE_A_HIGH_VALUE_B2B, highEcon);

    expect(highMarginal.expectedRevenue).toBeGreaterThan(lowMarginal.expectedRevenue);
    expect(lowEcon.minMarginalPageValue).toBeGreaterThan(highEcon.minMarginalPageValue);
    expect(economicsInfluenceApproval(lowEcon, lowMarginal.marginalExpansionValue)).not.toBe("APPROVE");
    expect(economicsInfluenceApproval(highEcon, highMarginal.marginalExpansionValue)).toBe("APPROVE");
  });

  it("upstream adapter builds context from venture blueprint draft", () => {
    const blueprint = {
      simulationOnly: true,
      core: {
        ventureNameWorking: "Acme SEO",
        ventureType: "b2b_saas",
        secondaryVentureTypes: [],
        businessSummary: "B2B SaaS for teams",
        problem: "Manual workflows",
        solution: "Automation platform",
        targetCustomer: "Operations teams",
        customerSegments: [],
        payer: "company",
        beneficiary: "teams",
        primaryValueProposition: "Save time",
        primaryMonetizationModel: "subscription",
        secondaryRevenueStreams: [],
        pricingStrategy: "tiered",
        customerAcquisitionStrategy: "SEO + content",
        distributionChannels: ["organic"],
        competitivePositioning: "leader",
        differentiation: "automation",
        brandRequirements: [],
        productRequirements: [],
        technicalRequirements: [],
      },
      contentArchitecture: { urlRoot: "platform" },
      acquisitionArchitecture: { primaryChannel: "SEO" },
      economicGuardrails: { economicTargets: { revenueY1: 100000 } },
    } as unknown as VentureBlueprintDraft;

    const context = buildVentureOrganicContextFromBlueprint(blueprint);
    const upstream = buildUpstreamOrganicInput({ context, sourceLineage: { inputMode: "blueprint" } });

    expect(upstream.context.ventureName).toBe("Acme SEO");
    expect(upstream.sourceLineage.inputMode).toBe("blueprint");
    expect(upstream.economics.sources.customerLifetimeValue).toBe("DERIVED_ESTIMATE");
  });

  it("NOINDEX decision path is emitted for navigationally useful low-score routes", () => {
    const opp: PageOpportunity = {
      pageOpportunityId: generatePageOpportunityId(),
      ventureId: "noindex-test",
      pageType: "route",
      primaryEntity: "pricing-route",
      secondaryEntities: [],
      primaryIntent: "navigational",
      secondaryIntents: [],
      buyerStage: "decision",
      proposedTopic: "Pricing route",
      proposedPurpose: "Internal route index",
      commercialRelationship: "authority_support",
      conversionRelationship: "assisted_conversion",
      authorityRelationship: "spoke",
      searchDemandSignal: { level: 0.3, evidenceConfidence: "DERIVED" },
      aiAnswerDemandSignal: { level: 0.2, evidenceConfidence: "DERIVED" },
      uniquenessPotential: 0.4,
      evidenceAvailability: 0.5,
      contentDepthPotential: 0.4,
      citationPotential: 0.3,
      programmaticPotential: 0.5,
      estimatedProductionCost: 100,
      estimatedResearchCost: 0,
      estimatedMaintenanceCost: 10,
      estimatedTrafficPotential: 50,
      estimatedConversionPotential: 0.01,
      estimatedRevenueContribution: 20,
      cannibalizationRisk: 0.2,
      thinContentRisk: 0.3,
      crawlValue: 0.55,
      confidence: 0.6,
    };

    const decisions = decidePages(
      [opp],
      [
        {
          pageOpportunityId: opp.pageOpportunityId,
          score: 42,
          weightedBreakdown: {},
          scoringVersion: "organic_growth_scoring_v1",
        },
      ],
      { minScore: 55 },
    );
    expect(decisions[0]?.decision).toBe("NOINDEX");
  });

  it("thin content assessment can emit NOINDEX for low standalone value with crawl utility", () => {
    const opp: PageOpportunity = {
      pageOpportunityId: generatePageOpportunityId(),
      ventureId: "thin-noindex",
      pageType: "guide",
      primaryEntity: "Utility",
      secondaryEntities: [],
      primaryIntent: "informational",
      secondaryIntents: [],
      buyerStage: "awareness",
      proposedTopic: "Utility page",
      proposedPurpose: "Utility navigation",
      commercialRelationship: "authority_support",
      conversionRelationship: "assisted_conversion",
      authorityRelationship: "spoke",
      searchDemandSignal: { level: 0.4, evidenceConfidence: "DERIVED" },
      aiAnswerDemandSignal: { level: 0.3, evidenceConfidence: "DERIVED" },
      uniquenessPotential: 0.73,
      evidenceAvailability: 0.66,
      contentDepthPotential: 0.32,
      citationPotential: 0.2,
      programmaticPotential: 0.05,
      estimatedProductionCost: 80,
      estimatedResearchCost: 0,
      estimatedMaintenanceCost: 5,
      estimatedTrafficPotential: 60,
      estimatedConversionPotential: 0.01,
      estimatedRevenueContribution: 0,
      cannibalizationRisk: 0.08,
      thinContentRisk: 0.12,
      crawlValue: 0.62,
      confidence: 0.6,
    };

    const thin = assessThinContentRisk(opp);
    expect(thin.decision).toBe("NOINDEX");
  });

  it("existing-site inventory merges published URLs and prevents duplicate slugs", () => {
    const existingSite = {
      domain: "example.com",
      publishedUrls: [
        { url: "https://example.com/service-area/cleveland", status: "PUBLISHED" as const, pageType: "city" },
      ],
      reservedRoutes: ["/admin"],
    };

    const result = processVentureOrganicArchitecture(
      {
        ...TEST_VENTURE_E_LOCAL_SERVICE,
        existingSite,
        domain: "example.com",
      },
      lineage,
    );

    const urls = result.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url);
    expect(urls.some((u) => u.includes("cleveland"))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
    expect(result.buildPackage.canonicalUrlRegistry.entries.some((e) => e.pageOpportunityId.startsWith("existing:"))).toBe(
      true,
    );
  });

  it("PAB handoff creates feature contracts, coding tasks, and post-generation validation", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_A_HIGH_VALUE_B2B, lineage);
    const handoff = runOrganicGrowthPabVerification(result.buildPackage);

    expect(handoff.featureContracts.length).toBeGreaterThan(0);
    expect(handoff.codingTasks.length).toBeGreaterThan(0);
    expect(handoff.traceabilityLinks.some((l) => l.linkType === "organic_page_to_feature_contract")).toBe(true);
    expect(handoff.postGenerationResults.length).toBeGreaterThan(0);
    expect(handoff.postGenerationResults.some((r) => r.outcome === "PASS")).toBe(true);
    expect(handoff.postGenerationResults.every((r) => r.outcome !== "BLOCK_ARTIFACT")).toBe(true);
  });

  it("post-generation gate blocks fabricated expertise in generated artifact", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_A_HIGH_VALUE_B2B, lineage);
    const contract = result.buildPackage.organicContentContracts[0]!;
    const pageId = contract.pageOpportunityId;
    const artifact = simulateOrganicPageGeneration({ buildPackage: result.buildPackage, pageOpportunityId: pageId });
    artifact.bodyText = "In our experience, customers typically prefer this option.";

    const url = result.buildPackage.canonicalUrlRegistry.entries.find((e) => e.pageOpportunityId === pageId)!.url;
    const gate = validateGeneratedOrganicArtifact({
      artifact,
      contentContract: contract,
      canonicalUrl: url,
      schemaTypes: artifact.schemaTypes,
      registryUrls: new Set(result.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url)),
    });

    expect(gate.outcome).toBe("BLOCK_ARTIFACT");
    expect(gate.failures.some((f) => /Fabricated/i.test(f))).toBe(true);
  });

  it("build package includes feedback-ready metric slots without fake performance data", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_A_HIGH_VALUE_B2B, lineage);
    expect(result.buildPackage.feedbackReadyMetrics?.length).toBeGreaterThan(0);
    for (const slot of result.buildPackage.feedbackReadyMetrics ?? []) {
      expect(slot.baselineRecorded).toBe(false);
      expect(slot.metricSlots).toContain("indexation");
      expect(slot.canonicalUrl.length).toBeGreaterThan(0);
    }
  });

  it("marginal economics filter rejects low-value pages and defers high-cost pages", () => {
    const highValue: PageOpportunity = {
      pageOpportunityId: generatePageOpportunityId(),
      ventureId: "econ-filter-high",
      pageType: "guide",
      primaryEntity: "Enterprise HVAC",
      secondaryEntities: [],
      primaryIntent: "commercial",
      secondaryIntents: [],
      buyerStage: "decision",
      proposedTopic: "Enterprise HVAC ROI",
      proposedPurpose: "High-value commercial guide",
      commercialRelationship: "direct_conversion",
      conversionRelationship: "direct_conversion",
      authorityRelationship: "hub",
      searchDemandSignal: { level: 0.8, evidenceConfidence: "SOURCE_BACKED" },
      aiAnswerDemandSignal: { level: 0.7, evidenceConfidence: "SOURCE_BACKED" },
      uniquenessPotential: 0.8,
      evidenceAvailability: 0.75,
      contentDepthPotential: 0.8,
      citationPotential: 0.7,
      programmaticPotential: 0.05,
      estimatedProductionCost: 200,
      estimatedResearchCost: 50,
      estimatedMaintenanceCost: 20,
      estimatedTrafficPotential: 2000,
      estimatedConversionPotential: 0.08,
      estimatedRevenueContribution: 2500,
      cannibalizationRisk: 0.1,
      thinContentRisk: 0.1,
      crawlValue: 0.8,
      confidence: 0.85,
    };

    const lowValue: PageOpportunity = {
      ...highValue,
      pageOpportunityId: generatePageOpportunityId(),
      estimatedProductionCost: 900,
      estimatedResearchCost: 200,
      estimatedTrafficPotential: 40,
      estimatedConversionPotential: 0.005,
      estimatedRevenueContribution: 15,
      evidenceAvailability: 0.25,
      uniquenessPotential: 0.2,
    };

    const econ = resolveMonetizationEconomics(TEST_VENTURE_D_LOW_VALUE, lowValueMonetizationPlan());
    const highEcon = resolveMonetizationEconomics(TEST_VENTURE_A_HIGH_VALUE_B2B, highValueMonetizationPlan());
    const highMarginal = calculateMarginalPageEconomics(highValue, TEST_VENTURE_A_HIGH_VALUE_B2B, highEcon);
    const lowMarginal = calculateMarginalPageEconomics(lowValue, TEST_VENTURE_D_LOW_VALUE, econ);

    const approvedHigh = filterByMarginalEconomics([highValue], [highMarginal], highEcon.minMarginalPageValue);
    const approvedLow = filterByMarginalEconomics([lowValue], [lowMarginal], econ.minMarginalPageValue);

    expect(approvedHigh.length).toBe(1);
    expect(approvedLow.length).toBe(0);
    expect(highMarginal.marginalExpansionValue).toBeGreaterThan(lowMarginal.marginalExpansionValue);
  });

  it("neighborhood CREATE requires verified evidence — template swap alone fails", () => {
    const baseNeighborhood = {
      pageOpportunityId: generatePageOpportunityId(),
      ventureId: "neighborhood-strict",
      pageType: "neighborhood",
      primaryEntity: "Tremont",
      secondaryEntities: [],
      primaryIntent: "local",
      secondaryIntents: [],
      buyerStage: "consideration",
      proposedTopic: "HVAC in Tremont",
      proposedPurpose: "Neighborhood service page",
      commercialRelationship: "direct_conversion",
      conversionRelationship: "direct_conversion",
      authorityRelationship: "spoke",
      geographicContext: { city: "Cleveland", neighborhood: "Tremont", state: "OH" },
      searchDemandSignal: { level: 0.68, evidenceConfidence: "SOURCE_BACKED" },
      aiAnswerDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
      uniquenessPotential: 0.62,
      evidenceAvailability: 0.55,
      contentDepthPotential: 0.6,
      citationPotential: 0.45,
      programmaticPotential: 0.1,
      estimatedProductionCost: 180,
      estimatedResearchCost: 40,
      estimatedMaintenanceCost: 15,
      estimatedTrafficPotential: 300,
      estimatedConversionPotential: 0.04,
      estimatedRevenueContribution: 400,
      cannibalizationRisk: 0.15,
      thinContentRisk: 0.2,
      crawlValue: 0.5,
      confidence: 0.7,
      metadata: {
        neighborhoodSearchIntent: 0.68,
        localCharacteristics: ["Historic district with older housing stock requiring specialized ductwork"],
        verifiedEvidence: ["City of Cleveland neighborhood profile"],
      },
    } as unknown as PageOpportunity;

    const renamedOnly = {
      ...baseNeighborhood,
      pageOpportunityId: generatePageOpportunityId(),
      primaryEntity: "Ohio City",
      geographicContext: { city: "Cleveland", neighborhood: "Ohio City", state: "OH" },
      metadata: {
        neighborhoodSearchIntent: 0.55,
        localCharacteristics: ["Historic district with older housing stock requiring specialized ductwork"],
        verifiedEvidence: [],
      },
    } as unknown as PageOpportunity;

    const strong = buildNeighborhoodInformationGainPlan(
      baseNeighborhood,
      evaluateNeighborhoodViability(baseNeighborhood),
    );
    const weak = buildNeighborhoodInformationGainPlan(
      renamedOnly,
      evaluateNeighborhoodViability(renamedOnly),
    );

    expect(strong.meaningfulGainEstablished).toBe(true);
    expect(weak.meaningfulGainEstablished).toBe(false);
    expect(["MERGE_INTO_CITY_PAGE", "DEFER", "REJECT", "SUPPORTING_SECTION"]).toContain(
      evaluateNeighborhoodViability(renamedOnly).decision,
    );
  });

  it("post-generation repair path can recover thin content within budget", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_A_HIGH_VALUE_B2B, lineage);
    const contract = result.buildPackage.organicContentContracts[0]!;
    const pageId = contract.pageOpportunityId;
    const artifact = simulateOrganicPageGeneration({ buildPackage: result.buildPackage, pageOpportunityId: pageId });
    artifact.bodyText = "Too short.";
    const url = result.buildPackage.canonicalUrlRegistry.entries.find((e) => e.pageOpportunityId === pageId)!.url;

    const gate = validateGeneratedOrganicArtifact({
      artifact,
      contentContract: contract,
      canonicalUrl: url,
      schemaTypes: artifact.schemaTypes,
      registryUrls: new Set(result.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url)),
    });
    expect(gate.outcome).not.toBe("PASS");

    const repaired = applyPostGenerationRepair({
      artifact,
      contentContract: contract,
      canonicalUrl: url,
      schemaTypes: artifact.schemaTypes,
      registryUrls: new Set(result.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url)),
      gateResult: gate,
    });

    expect(repaired.repairsAttempted).toBeGreaterThan(0);
    expect(repaired.actions.length).toBeGreaterThan(0);
    expect(repaired.finalOutcome).toBe("PASS");
  });

  it("post-generation gate blocks multiple unsupported fabrication patterns", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_E_LOCAL_SERVICE, lineage);
    const contract = result.buildPackage.organicContentContracts[0]!;
    const pageId = contract.pageOpportunityId;
    const url = result.buildPackage.canonicalUrlRegistry.entries.find((e) => e.pageOpportunityId === pageId)!.url;
    const registryUrls = new Set(result.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url));

    for (const fabricated of [
      "Our customers say this is the best service in town.",
      "Rated 4.9 stars by verified reviewers.",
      "Prices start at $99 for basic service.",
      "Located at 123 Main Street in downtown Cleveland.",
      "We have served the area for 20 years.",
    ]) {
      const artifact = simulateOrganicPageGeneration({ buildPackage: result.buildPackage, pageOpportunityId: pageId });
      artifact.bodyText = `${fabricated} ${artifact.bodyText}`;
      const gate = validateGeneratedOrganicArtifact({
        artifact,
        contentContract: contract,
        canonicalUrl: url,
        schemaTypes: artifact.schemaTypes,
        registryUrls,
      });
      expect(gate.outcome).toBe("BLOCK_ARTIFACT");
    }
  });

  it("pipeline orchestrator wires PAB handoff, repair, and traceability", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_A_HIGH_VALUE_B2B, lineage);
    const pipeline = executeOrganicPipelineForPackage({
      buildPackage: result.buildPackage,
      organicGrowthRunId: "run-test",
      organicGrowthBuildPackageId: "pkg-test",
      inputMode: "SIMULATION",
      maxPages: 2,
    });

    expect(pipeline.pabHandoff.codingTasks.length).toBeGreaterThan(0);
    expect(pipeline.repairResults.length).toBe(pipeline.pabHandoff.postGenerationResults.length);
    expect(pipeline.pabHandoff.traceabilityLinks.some((l) => l.linkType === "organic_run_to_build_package")).toBe(
      true,
    );
    expect(result.buildPackage.organicAuthorityGraph?.nodes.length).toBeGreaterThan(0);
  });

  it("grounded research reports SKIPPED_MISSING_CREDENTIALS when no API keys", async () => {
    const prevGemini = process.env.GEMINI_API_KEY;
    const prevGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    process.env.RESEARCH_PROVIDER = "gemini";

    const result = await enrichContextWithGroundedResearch(
      null as never,
      "org",
      TEST_VENTURE_E_LOCAL_SERVICE,
      {
        enabled: true,
        engineVersion: "organic_growth_engine_v1",
        simulationOnly: true,
        maxVenturesPerRun: 5,
        enableGroundedResearch: true,
        maxResearchCallsPerRun: 1,
      },
      "test-suffix",
    );

    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGoogle) process.env.GOOGLE_API_KEY = prevGoogle;

    expect(result.status).toBe("SKIPPED_MISSING_CREDENTIALS");
  });
});
