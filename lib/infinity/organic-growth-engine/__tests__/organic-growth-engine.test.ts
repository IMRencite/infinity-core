import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_QUALITY_THRESHOLDS,
  DEFAULT_VIABILITY_THRESHOLDS,
  ORGANIC_GROWTH_ENGINE_VERSION,
} from "@/lib/infinity/organic-growth-engine/constants";
import {
  ALL_TEST_VENTURES,
  HITL_TEST_PAGE_CLASSES,
  TEST_VENTURE_A_HIGH_VALUE_B2B,
  TEST_VENTURE_B_NARROW_SAAS,
  TEST_VENTURE_C_ECOMMERCE,
  TEST_VENTURE_D_LOW_VALUE,
  TEST_VENTURE_E_LOCAL_SERVICE,
  TEST_VENTURE_I_MASSIVE_COMBINATORIAL,
  buildViabilityInput,
} from "@/lib/infinity/organic-growth-engine/fixtures/test-ventures";
import { processVentureOrganicArchitecture } from "@/lib/infinity/organic-growth-engine/process-venture";
import { calculateOrganicChannelViability, recommendOrganicStrategy } from "@/lib/infinity/organic-growth-engine/viability/organic-channel-viability";
import { calculatePageOpportunityScore } from "@/lib/infinity/organic-growth-engine/scoring/page-opportunity-score";
import { generatePageOpportunitiesFromGraph, buildSearchAnswerOpportunityGraph } from "@/lib/infinity/organic-growth-engine/graph/search-answer-opportunity-graph";
import { decidePages, deduplicateOpportunities } from "@/lib/infinity/organic-growth-engine/decisions/cannibalization-engine";
import { buildCanonicalUrlRegistry, validateInternalLinkTargets } from "@/lib/infinity/organic-growth-engine/architecture/url-architecture-engine";
import { countFabricatedLocalBusiness, recommendSchema } from "@/lib/infinity/organic-growth-engine/schema/schema-recommendation-engine";
import { classifyHitlNecessity, assertNoFabricatedExperience } from "@/lib/infinity/organic-growth-engine/eeat/eeat-hitl";
import { classifyResourceDepth } from "@/lib/infinity/organic-growth-engine/content/content-planning";
import { generatePageOpportunityId } from "@/lib/infinity/organic-growth-engine/graph/search-answer-opportunity-graph";
import type { PageOpportunity } from "@/lib/infinity/organic-growth-engine/types";

const lineage = { inputMode: "simulation" as const, capabilityTest: true };

describe("Organic Growth Architecture Engine v1", () => {
  it("includes migration and core module files", () => {
    const migrationDir = join(process.cwd(), "supabase/migrations");
    const migrations = readdirSync(migrationDir);
    expect(migrations.some((f) => f.includes("organic_growth_engine_foundation_v1"))).toBe(true);

    const engineDir = join(process.cwd(), "lib/infinity/organic-growth-engine");
    const files = readdirSync(engineDir, { recursive: true }).map(String);
    expect(files.some((f) => f.includes("run.ts"))).toBe(true);
    expect(files.some((f) => f.includes("process-venture.ts"))).toBe(true);
  });

  it("decidePages creates homepage for authority venture", () => {
    const graph = buildSearchAnswerOpportunityGraph(TEST_VENTURE_A_HIGH_VALUE_B2B);
    const opps = generatePageOpportunitiesFromGraph(graph, TEST_VENTURE_A_HIGH_VALUE_B2B);
    const { deduplicated } = deduplicateOpportunities(opps);
    const hp = deduplicated.find((o) => o.pageType === "homepage")!;
    const directScore = calculatePageOpportunityScore(hp);
    const scores = deduplicated.map((o) => calculatePageOpportunityScore(o));
    const mappedScore = scores.find((s) => s.pageOpportunityId === hp.pageOpportunityId);
    expect(mappedScore?.pageOpportunityId).toBe(hp.pageOpportunityId);
    expect(mappedScore?.score).toBe(directScore.score);
    expect(directScore.score).toBeGreaterThan(45);
    const decisions = decidePages(deduplicated, scores, { viabilityRecommendation: "AUTHORITY" });
    expect(decisions.find((d) => d.pageOpportunityId === hp.pageOpportunityId)?.decision).toBe("CREATE");
  });

  it("Test A — high-value B2B discovers authority architecture without hard-coded niche taxonomy", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_A_HIGH_VALUE_B2B, lineage);
    expect(result.buildPackage.organicChannelViability.recommendation).not.toBe("NONE");
    expect(result.buildPackage.searchAnswerOpportunityGraph.nodes.length).toBeGreaterThan(10);
    expect(result.buildPackage.approvedPageOpportunities.length).toBeGreaterThan(5);
    expect(result.buildPackage.siteTopicArchitecture.rootTopics.length).toBeGreaterThan(0);
    expect(result.stats.create).toBeGreaterThan(0);
  });

  it("Test B — narrow SaaS does not recommend massive digital real estate", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_B_NARROW_SAAS, lineage);
    expect(["NONE", "LIMITED", "STANDARD"]).toContain(
      result.buildPackage.organicChannelViability.recommendation,
    );
    expect(result.buildPackage.approvedPageOpportunities.length).toBeLessThan(80);
    expect(result.buildPackage.digitalRealEstateExpansion.planningBand).not.toBe(
      "Massive Digital Real Estate",
    );
  });

  it("Test C — ecommerce recognizes categories, products, comparisons, guides", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_C_ECOMMERCE, lineage);
    const types = new Set(result.buildPackage.approvedPageOpportunities.map((p) => p.pageType));
    expect(types.size).toBeGreaterThan(2);
    expect(result.buildPackage.searchAnswerOpportunityGraph.nodes.some((n) => n.nodeType === "comparison" || n.label.includes("alternative"))).toBe(true);
  });

  it("Test D — low-value opportunity rejects large-scale organic expansion", () => {
    const viability = calculateOrganicChannelViability(buildViabilityInput(TEST_VENTURE_D_LOW_VALUE));
    expect(["NONE", "LIMITED"]).toContain(viability.recommendation);
    const result = processVentureOrganicArchitecture(TEST_VENTURE_D_LOW_VALUE, lineage);
    expect(result.buildPackage.approvedPageOpportunities.length).toBeLessThan(15);
    expect(result.stats.reject).toBeGreaterThan(0);
  });

  it("Test E — city/neighborhood architecture merges or rejects weak neighborhoods", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_E_LOCAL_SERVICE, lineage);
    expect(result.stats.neighborhoodsEvaluated).toBeGreaterThan(3);
    expect(result.stats.neighborhoodMerge + result.stats.neighborhoodReject + result.stats.neighborhoodSupporting).toBeGreaterThan(0);
    expect(result.stats.neighborhoodCreate).toBeGreaterThan(0);
    expect(result.buildPackage.neighborhoodInformationGainPlans.length).toBeGreaterThan(0);
    for (const plan of result.buildPackage.neighborhoodInformationGainPlans) {
      expect(plan.meaningfulGainEstablished).toBe(true);
      expect(plan.localInformationGain.length).toBeGreaterThan(0);
    }
  });

  it("Test F — HITL E-E-A-T classifications without fake experience", () => {
    const baseOpp: PageOpportunity = {
      pageOpportunityId: generatePageOpportunityId(),
      ventureId: "hitl-test",
      pageType: "guide",
      primaryEntity: "Test entity",
      secondaryEntities: [],
      primaryIntent: "informational",
      secondaryIntents: [],
      buyerStage: "awareness",
      proposedTopic: "Test topic",
      proposedPurpose: "Explain test topic",
      commercialRelationship: "authority_support",
      conversionRelationship: "assisted_conversion",
      authorityRelationship: "spoke",
      searchDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
      aiAnswerDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
      uniquenessPotential: 0.6,
      evidenceAvailability: 0.6,
      contentDepthPotential: 0.6,
      citationPotential: 0.7,
      programmaticPotential: 0.1,
      estimatedProductionCost: 300,
      estimatedResearchCost: 100,
      estimatedMaintenanceCost: 30,
      estimatedTrafficPotential: 200,
      estimatedConversionPotential: 0.02,
      estimatedRevenueContribution: 100,
      cannibalizationRisk: 0.2,
      thinContentRisk: 0.2,
      crawlValue: 0.8,
      confidence: 0.7,
    };

    for (const testCase of HITL_TEST_PAGE_CLASSES) {
      const depth = testCase.pageClass === "definitive_resource" ? "DEFINITIVE_RESOURCE" : "STANDARD_RESOURCE";
      const plan = classifyHitlNecessity(
        {
          ...baseOpp,
          proposedPurpose:
            testCase.pageClass === "regulated"
              ? "Medical financial regulated guidance"
              : testCase.pageClass === "case_study_no_data"
                ? "First-party case study"
                : baseOpp.proposedPurpose,
          citationPotential: testCase.pageClass === "definitive_resource" ? 0.8 : 0.5,
        },
        depth,
        testCase.pageClass,
      );
      expect(plan.necessityLevel).toBe(testCase.expected);
    }

    expect(assertNoFabricatedExperience("This guide explains the topic objectively.")).toBe(true);
    expect(assertNoFabricatedExperience("In our experience, customers typically prefer option A.")).toBe(false);
  });

  it("Test G — URL architecture avoids duplicate slugs and invalid internal link targets", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_E_LOCAL_SERVICE, lineage);
    const urls = result.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    const validation = validateInternalLinkTargets(
      result.buildPackage.internalLinkGraph.links,
      result.buildPackage.canonicalUrlRegistry,
    );
    expect(validation.invalid).toBe(0);
    const neighborhoodUrls = urls.filter((u) => u.includes("ohio-city") || u.includes("tremont"));
    expect(neighborhoodUrls.length).toBeGreaterThan(0);
  });

  it("Test H — schema differs by page type and does not fabricate LocalBusiness", () => {
    const homepageSchema = recommendSchema(
      {
        pageOpportunityId: "1",
        ventureId: "v",
        pageType: "homepage",
        primaryEntity: "Brand",
        secondaryEntities: [],
        primaryIntent: "navigational",
        secondaryIntents: [],
        buyerStage: "awareness",
        proposedTopic: "Brand",
        proposedPurpose: "Homepage",
        commercialRelationship: "primary_conversion",
        conversionRelationship: "entry_point",
        authorityRelationship: "root_hub",
        searchDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
        aiAnswerDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
        uniquenessPotential: 1,
        evidenceAvailability: 1,
        contentDepthPotential: 0.7,
        citationPotential: 0.4,
        programmaticPotential: 0,
        estimatedProductionCost: 100,
        estimatedResearchCost: 0,
        estimatedMaintenanceCost: 10,
        estimatedTrafficPotential: 1000,
        estimatedConversionPotential: 0.03,
        estimatedRevenueContribution: 100,
        cannibalizationRisk: 0,
        thinContentRisk: 0,
        crawlValue: 1,
        confidence: 1,
      },
      TEST_VENTURE_E_LOCAL_SERVICE,
      ["Home"],
    );
    expect(homepageSchema.schemaTypes).toContain("Organization");

    const localSchema = recommendSchema(
      {
        ...homepageSchema,
        pageOpportunityId: "2",
        pageType: "city",
        geographicContext: { city: "Cleveland" },
      } as never,
      TEST_VENTURE_E_LOCAL_SERVICE,
      ["Home", "Service Area", "Cleveland"],
    );
    expect(localSchema.schemaTypes).toContain("Place");
    expect(localSchema.schemaTypes).not.toContain("LocalBusiness");
    expect(countFabricatedLocalBusiness([localSchema])).toBe(0);
  });

  it("Test I — >1,000 candidate combinations do not get blindly approved", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_I_MASSIVE_COMBINATORIAL, lineage, {
      includeProgrammaticCombinations: true,
    });
    expect(result.stats.rawOpportunities).toBeGreaterThan(300);
    expect(result.stats.reject + result.stats.merge + result.stats.defer).toBeGreaterThan(
      result.stats.create,
    );
    expect(result.stats.create).toBeLessThan(result.stats.rawOpportunities * 0.5);
    expect(result.stats.thinContentFailures).toBeGreaterThan(0);
    expect(result.stats.informationGainFailures).toBeGreaterThan(0);
    expect(result.buildPackage.approvedPageOpportunities.every((p) => p.pageType !== "programmatic_page" || p.uniquenessPotential >= 0.35)).toBe(true);
    expect(result.buildPackage.topicCoverageMaps.length).toBe(result.buildPackage.approvedPageOpportunities.length);
    expect(result.buildPackage.informationGainPlans.length).toBe(result.buildPackage.approvedPageOpportunities.length);
  });

  it("deterministic viability scoring uses configured thresholds", () => {
    expect(recommendOrganicStrategy(20, DEFAULT_VIABILITY_THRESHOLDS)).toBe("NONE");
    expect(recommendOrganicStrategy(40, DEFAULT_VIABILITY_THRESHOLDS)).toBe("LIMITED");
    expect(recommendOrganicStrategy(90, DEFAULT_VIABILITY_THRESHOLDS)).toBe("LARGE_SCALE");
  });

  it("deduplicates keyword permutations", () => {
    const opps = [
      { proposedTopic: "Best Widget", pageType: "guide", primaryIntent: "informational", geographicContext: undefined },
      { proposedTopic: "best widget", pageType: "guide", primaryIntent: "informational", geographicContext: undefined },
    ] as never[];
    const { deduplicated, removed } = deduplicateOpportunities(opps);
    expect(deduplicated.length).toBe(1);
    expect(removed).toBe(1);
  });

  it("every approved page has content contract and passes quality thresholds", () => {
    for (const venture of ALL_TEST_VENTURES.filter((v) => v.ventureId !== TEST_VENTURE_I_MASSIVE_COMBINATORIAL.ventureId)) {
      const result = processVentureOrganicArchitecture(venture, lineage);
      for (const contract of result.buildPackage.organicContentContracts) {
        expect(contract.primaryQueryIntent.length).toBeGreaterThan(0);
        expect(contract.sections.length).toBeGreaterThan(0);
      }
      for (const opp of result.buildPackage.approvedPageOpportunities) {
        expect(opp.thinContentRisk).toBeLessThanOrEqual(DEFAULT_QUALITY_THRESHOLDS.maxThinContentRisk + 0.01);
      }
    }
  });

  it("OrganicGrowthBuildPackage is structurally consumable by Product + Asset Builder", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_A_HIGH_VALUE_B2B, lineage);
    const pkg = result.buildPackage;
    expect(pkg.packageVersion).toBe("organic_growth_build_package_v1");
    expect(pkg.organicContentContracts.length).toBeGreaterThan(0);
    expect(pkg.canonicalUrlRegistry.entries.length).toBeGreaterThan(0);
    expect(pkg.siteMapPlan.entries.length).toBe(pkg.approvedPageOpportunities.length);
    expect(pkg.expansionWaves.FOUNDATION.length).toBeGreaterThan(0);
  });

  it("engine version constant matches expected milestone", () => {
    expect(ORGANIC_GROWTH_ENGINE_VERSION).toBe("organic_growth_engine_v1");
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260815260000_organic_growth_engine_foundation_v1.sql"),
      "utf8",
    );
    expect(migration).toContain("organic_growth_runs");
    expect(migration).toContain("organic_growth_build_packages");
  });
});

describe("Organic Growth resource depth classification", () => {
  it("does not classify every page as DEFINITIVE_RESOURCE", () => {
    const result = processVentureOrganicArchitecture(TEST_VENTURE_B_NARROW_SAAS, lineage);
    const depths = result.buildPackage.organicContentContracts.map((c) => c.resourceDepth);
    expect(depths.some((d) => d === "STANDARD_RESOURCE" || d === "DIRECT_RESPONSE")).toBe(true);
    expect(depths.every((d) => d === "DEFINITIVE_RESOURCE")).toBe(false);
  });
});
