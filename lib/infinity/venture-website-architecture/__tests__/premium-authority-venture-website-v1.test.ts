import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { activateValidationGradeSuccessorPublicArtifact } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { executeMarketValidationExperiment } from "@/lib/infinity/market-validation-experiment/execute";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { defaultPublicValidationQualityTarget, publicVentureSectionRegistry, publicVentureVisualizationRegistry } from "@/lib/infinity/public-venture-design";
import { VALIDATION_QUALITY_STATES } from "@/lib/infinity/public-venture-template";
import {
  AUTONOMOUS_VENTURE_WEBSITE_BUILD_RUNTIME,
  GEO_SEO_CONTENT_ARCHITECTURE_V1,
  MASS_LOW_VALUE_GENERATION_PERMITTED,
  PAGE_ROLES,
  PREMIUM_AUTHORITY_SITE_REPAIR_REASON,
  PREMIUM_AUTHORITY_VALIDATION_READY,
  applyCannibalization,
  assessThinPageOpportunity,
  auditPremiumAuthoritySite,
  autonomousVentureWebsiteBuildRuntime,
  buildSiteKnowledgeGraph,
  creSiteArchitectureInput,
  detectCannibalization,
  generateCreAuthoritySiteSuccessor,
  geoSeoContentArchitecture,
  historicalEvidenceSufficientForPatternSuperiority,
  multiProviderEconomicallyGated,
  pagePatternRegistry,
  planSiteExpansion,
  planVentureSiteArchitecture,
  roleIsNotProvider,
  schemaPatternRegistry,
  searchPerformanceAdapterContracts,
  seedPageOpportunities,
  siteAiRoleContracts,
  validateCreAuthoritySiteSuccessorIsolated,
} from "../index";

const ROOT = join(process.cwd());

describe("AUTONOMOUS PREMIUM VENTURE WEBSITE ARCHITECTURE V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetCurrentCreValidationArtifactIdCache();
    activateValidationGradeSuccessorPublicArtifact();
  });

  it("defines a global site-level quality target and reusable architecture", () => {
    expect(AUTONOMOUS_VENTURE_WEBSITE_BUILD_RUNTIME).toBe("AutonomousVentureWebsiteBuildRuntime");
    expect(VALIDATION_QUALITY_STATES).toEqual(expect.arrayContaining([
      "FUNCTIONALLY_INVALID",
      "FUNCTIONALLY_VALID",
      "VALIDATION_GRADE_READY",
      "PREMIUM_VALIDATION_READY",
      "PREMIUM_AUTHORITY_VALIDATION_READY",
      "PRODUCTION_GRADE",
    ]));
    expect(defaultPublicValidationQualityTarget()).toBe(PREMIUM_AUTHORITY_VALIDATION_READY);
    expect(defaultPublicValidationQualityTarget(true)).toBe("VALIDATION_GRADE_READY");
    expect(PAGE_ROLES).toEqual(expect.arrayContaining(["HOMEPAGE", "EDUCATIONAL_HUB", "QUESTION_PAGE", "PRICING", "LEGAL"]));
    expect(pagePatternRegistry().EDUCATIONAL_QUESTION_PAGE.requiredBlocks).toEqual(expect.arrayContaining(["direct answer", "authority sources"]));
    expect(pagePatternRegistry().EDUCATIONAL_HUB.requiredBlocks).toContain("spoke links");
    expect(schemaPatternRegistry().FAQPage.forbiddenUnless).toMatch(/fabricated/i);
    expect(schemaPatternRegistry().Offer.forbiddenUnless).toMatch(/Validation pricing/i);
    expect(geoSeoContentArchitecture().contract).toBe(GEO_SEO_CONTENT_ARCHITECTURE_V1);
    expect(MASS_LOW_VALUE_GENERATION_PERMITTED).toBe(false);
    expect(publicVentureSectionRegistry().RELATED_CONTENT.reusable).toBe(true);
    expect(publicVentureVisualizationRegistry().CALCULATION_EXAMPLE.preferredMedium).toBe("DETERMINISTIC_UI");
    expect(autonomousVentureWebsiteBuildRuntime().searchCapability).toBe("web.search");
    expect(autonomousVentureWebsiteBuildRuntime().replacesExistingSystems).toBe(false);
    expect(roleIsNotProvider()).toBe(true);
    expect(multiProviderEconomicallyGated().gated).toBe(true);
    expect(siteAiRoleContracts().map((item) => item.role)).toEqual(expect.arrayContaining(["RESEARCHER", "WRITER", "ADVERSARIAL_REVIEWER", "REPAIRER"]));
    expect(historicalEvidenceSufficientForPatternSuperiority()).toBe(false);
    expect(searchPerformanceAdapterContracts().every((item) => item.live === false)).toBe(true);
  });

  it("plans a bounded CRE authority cluster without mass thin pages", () => {
    const input = creSiteArchitectureInput(`candidate:${CRE_CANDIDATE_ID}`);
    const opportunities = seedPageOpportunities(input);
    expect(opportunities.some((item) => item.status === "FUTURE_EXPANSION" && item.route === "/cam-costs")).toBe(true);
    expect(opportunities.some((item) => item.status === "REJECTED_LOW_VALUE")).toBe(true);
    expect(opportunities.every((item) => item.searchOpportunity.volumeState === "UNKNOWN")).toBe(true);
    expect(opportunities.every((item) => item.searchOpportunity.volume === null)).toBe(true);
    const thinCity = opportunities.find((item) => item.route === "/free-rent-in-every-city");
    expect(thinCity && assessThinPageOpportunity(thinCity).decision).toBe("REJECT");
    const duplicate = detectCannibalization(opportunities).some((item) => item.action === "MERGE" || item.action === "REJECT_DUPLICATE");
    expect(duplicate).toBe(true);
    expect(applyCannibalization(opportunities).some((item) => item.status === "REJECTED_CANNIBALIZATION")).toBe(true);
    const architecture = planVentureSiteArchitecture(input);
    const substantive = architecture.pages.filter((page) => page.role !== "LEGAL");
    expect(substantive.length).toBeGreaterThanOrEqual(6);
    expect(substantive.length).toBeLessThanOrEqual(12);
    expect(architecture.massLowValueGenerationPermitted).toBe(false);
    expect(architecture.pages.map((page) => page.title).length).toBe(new Set(architecture.pages.map((page) => page.title)).size);
    expect(architecture.pages.some((page) => page.schemaTypes.includes("Offer"))).toBe(false);
    expect(architecture.pages.some((page) => page.schemaTypes.includes("SoftwareApplication"))).toBe(false);
    const graph = buildSiteKnowledgeGraph(architecture);
    expect(graph.orphans).toEqual([]);
    expect(graph.brokenEdges).toEqual([]);
    expect(graph.nodes.length).toBeGreaterThan(architecture.pages.length);
    expect(graph.edges.length).toBeGreaterThan(architecture.pages.length);
    expect(planSiteExpansion(architecture).autoPublishThousands).toBe(false);
    expect(planSiteExpansion(architecture).opportunities.some((item) => item.topic === "CAM costs")).toBe(true);
  });

  it("fails the live single-page CRE artifact on premium authority and does not mutate it", async () => {
    const current = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(current.artifact?.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    const architecture = planVentureSiteArchitecture(creSiteArchitectureInput(`candidate:${CRE_CANDIDATE_ID}`));
    const graph = buildSiteKnowledgeGraph(architecture);
    const audit = auditPremiumAuthoritySite({ files: current.artifact?.files ?? [], pages: architecture.pages, graph });
    expect(audit.premiumAuthorityOverall).toBe("FAIL");
    expect((current.artifact?.files ?? []).some((file) => file.path.startsWith("app/commercial-lease-npv/"))).toBe(false);
  });

  it("generates an immutable multi-page CRE authority successor without changing the experiment", async () => {
    const successor = await generateCreAuthoritySiteSuccessor();
    expect(successor.artifactId).not.toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorArtifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.repairReason).toBe(PREMIUM_AUTHORITY_SITE_REPAIR_REASON);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.oldArtifact.mutated).toBe(false);
    expect(successor.oldArtifact.premiumAuthorityReady).toBe("FAIL");
    expect(successor.quality.premiumAuthorityOverall).toBe("PASS");
    expect(successor.quality.classification).toBe(PREMIUM_AUTHORITY_VALIDATION_READY);
    expect(successor.quality.thinPages).toBe(0);
    expect(successor.quality.duplicateIntentPages).toBe(0);
    expect(successor.quality.indexableOrphans).toBe(0);
    expect(successor.quality.brokenInternalLinks).toBe(0);
    expect(successor.quality.invalidSchemaBlocks).toBe(0);
    expect(successor.quality.fakeRatingsReviews).toBe("NO");
    expect(successor.quality.fakeOffers).toBe("NO");
    expect(successor.graph.orphans).toEqual([]);
    const routes = successor.files.map((file) => file.path.replace(/\\/g, "/"));
    expect(routes).toEqual(expect.arrayContaining([
      "app/page.tsx",
      "app/how-it-works/page.tsx",
      "app/commercial-lease-npv/page.tsx",
      "app/compare-commercial-leases/page.tsx",
      "app/tenant-improvement-allowance/page.tsx",
      "app/discount-rate-sensitivity/page.tsx",
      "app/pricing/page.tsx",
      "app/resources/page.tsx",
      "app/faq/page.tsx",
      "app/robots.ts",
      "app/sitemap.ts",
      "app/early-access/page.tsx",
    ]));
    const homepage = successor.files.find((file) => file.path === "app/page.tsx")?.content ?? "";
    expect(homepage).toContain("$290 / year");
    expect(homepage).toContain("$149 / deal");
    expect(homepage).toContain("Request Pilot Access");
    expect(homepage).toContain("Illustrative sample");
    expect(homepage).not.toMatch(/testimonial|trusted by|customers already/i);
    const npv = successor.files.find((file) => file.path === "app/commercial-lease-npv/page.tsx")?.content ?? "";
    expect(npv).toContain("What is NPV in a commercial lease?");
    expect(npv).toContain("converts future lease costs into today’s dollars");
    expect(npv).toContain("data-answer-first");
    const sitemap = successor.files.find((file) => file.path === "app/sitemap.ts")?.content ?? "";
    expect(sitemap).toContain("/commercial-lease-npv");
    expect(sitemap).not.toContain("/api/");
    const robots = successor.files.find((file) => file.path === "app/robots.ts")?.content ?? "";
    expect(robots).toContain('allow: "/"');
    expect(robots).toContain("/api/");
    expect(successor.files.some((file) => file.path === "app/early-access/page.tsx" && file.content.includes("workEmail"))).toBe(true);
    expect(evaluateSecretSafety(successor.files).status).toBe("PASS");
    expect(successor.secretScan).toBe("PASS");
    expect(successor.creative.assetsGenerated).toBe(0);
    expect(successor.nextExternalRequirement).toBe("NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED");
    expect(successor.command.recentEvents.some((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1")).toBe(true);
    expect(successor.command.recentEvents.some((event) => event.stepType === "PLAN_SITE_ARCHITECTURE")).toBe(true);
    expect(successor.command.recentEvents.some((event) => event.stepType === "GENERATE_CONTENT")).toBe(true);
    expect(successor.command.recentEvents.every((event) => event.executionClass === "VENTURE_EXECUTION")).toBe(true);
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-29T16:00:00.000Z") });
    expect(evidence.experiment.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.decision.currentDecision).toBe("VALIDATE");
    expect(evidence.decision.buildReady).toBe(false);
    expect(evidence.experiment.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    const dashboard = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
  }, 120_000);

  it("runs isolated install and production build for the authority site successor", async () => {
    const isolated = await validateCreAuthoritySiteSuccessorIsolated();
    expect(isolated.npmCi).toBe("PASS");
    expect(isolated.typescript === "PASS" || isolated.typescript === "NOT_APPLICABLE").toBe(true);
    expect(isolated.productionBuild).toBe("PASS");
    expect(isolated.successor.quality.premiumAuthorityOverall).toBe("PASS");
  }, 180_000);
});
