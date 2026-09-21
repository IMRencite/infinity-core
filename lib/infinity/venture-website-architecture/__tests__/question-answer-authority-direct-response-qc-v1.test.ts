import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_WEB_RESEARCH_RUNTIME } from "@/lib/infinity/research/public-web/capabilities";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { activatePremiumAuthoritySuccessorPublicArtifact } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectCollectingHqPresence } from "@/lib/infinity/market-validation-experiment/collecting-hq";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { defaultPublicValidationQualityTarget } from "@/lib/infinity/public-venture-design";
import { VALIDATION_QUALITY_STATES } from "@/lib/infinity/public-venture-template";
import { MARKET_VALIDATION_ACQUISITION_RUNTIME } from "@/lib/infinity/market-validation-acquisition-runtime/constants";
import { buildFounderMoneyView } from "@/lib/infinity/founder-idea-lab/explainability/money-view";
import {
  ADVERSARIAL_FAIL_REASONS,
  ANSWER_AUTHORITY_READY,
  CRE_SUBSTANTIVE_ROUTES,
  KNOWN_HIGH_CONFIDENCE_QUESTION_COVERAGE,
  MAX_AUTHORITY_REPAIR_LOOPS,
  PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD,
  PREMIUM_AUTHORITY_VALIDATION_READY,
  QUESTION_CLASSES,
  QUESTION_KNOWLEDGE_GRAPH,
  adversarialReview,
  answerAuthorityPerformanceContract,
  auditCurrentCreAuthorityArtifact,
  boundedRepairLoop,
  buildCreQuestionKnowledgeGraph,
  buildObjectionKnowledgeGraph,
  buildQuestionCoverageProfile,
  buildSiteKnowledgeGraph,
  classifySourceQuality,
  clusterOverlappingQuestions,
  competitiveCoverageProfile,
  creRedirectPlanIfSilosApplied,
  creSiteArchitectureInput,
  digitalRealEstateUrlArchitecture,
  directResponsePagePatternRegistry,
  disposeQuestion,
  educationalVisualizationRequirement,
  evaluateCitationReadiness,
  evaluateDirectResponsePage,
  evaluateInformationDensity,
  evaluatePagePatternFulfillment,
  evaluatePageVisualPlan,
  evaluateSectionVariety,
  evaluateSemanticCoverage,
  evaluateSourceIndependence,
  pagePatternRegistry,
  planSiteExpansion,
  planVentureSiteArchitecture,
  plagiarismPolicy,
  questionDiscoveryRuntime,
  reconstructCreAuthoritySiteSuccessor,
  reviewPublishability,
  runLayeredQc,
  scoreQuestionAnswers,
  searchPerformanceAdapterContracts,
  siteAiRoleContracts,
  wordCountIsHardQuota,
} from "../index";

const ROOT = join(process.cwd());

describe("QUESTION KNOWLEDGE GRAPH + ANSWER AUTHORITY + DIRECT-RESPONSE QC ENFORCEMENT V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetCurrentCreValidationArtifactIdCache();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("keeps the default quality target and adds a truthful below-standard classification", () => {
    expect(defaultPublicValidationQualityTarget()).toBe(PREMIUM_AUTHORITY_VALIDATION_READY);
    expect(VALIDATION_QUALITY_STATES).toContain(PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD);
    expect(ANSWER_AUTHORITY_READY).toBe("ANSWER_AUTHORITY_READY");
    expect(QUESTION_KNOWLEDGE_GRAPH).toBe("QuestionKnowledgeGraph");
    expect(QUESTION_CLASSES).toEqual(expect.arrayContaining(["DEFINITION", "CALCULATION", "OBJECTION", "LIMITATION", "PROFESSIONAL_WORKFLOW"]));
    expect(pagePatternRegistry().LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE.requiredBlocks.length).toBeGreaterThanOrEqual(15);
    expect(pagePatternRegistry().DEEP_AUTHORITY_QUESTION_PAGE.requiredBlocks).toEqual(expect.arrayContaining(["direct answer", "worked example", "limitations"]));
    expect(siteAiRoleContracts().every((item) => item.providerBound === false)).toBe(true);
    expect(siteAiRoleContracts().map((item) => item.role)).toEqual(expect.arrayContaining([
      "QUESTION_RESEARCHER",
      "DIRECT_RESPONSE_REVIEWER",
      "SEO_GEO_REVIEWER",
      "ADVERSARIAL_REVIEWER",
    ]));
  });

  it("discovers, clusters, and disposes CRE questions without fabricating demand", () => {
    const discovery = questionDiscoveryRuntime();
    expect(discovery.runtime).toBe(PUBLIC_WEB_RESEARCH_RUNTIME);
    expect(discovery.fabricatedSearchDemand).toBe(false);
    expect(discovery.gscLive).toBe(false);
    const graph = buildCreQuestionKnowledgeGraph();
    expect(graph.model).toBe("QuestionKnowledgeGraph");
    expect(graph.fabricatedSearchDemand).toBe(false);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(30);
    expect(graph.clusters.length).toBeGreaterThanOrEqual(8);
    expect(graph.nodes.every((node) => node.searchOpportunity !== "ACTUAL" || node.observedSources.length > 0)).toBe(true);
    const npvCluster = clusterOverlappingQuestions([
      "What is lease NPV?",
      "How does NPV work in a commercial lease?",
      "What does NPV mean for lease comparison?",
    ]);
    expect(npvCluster).toHaveLength(1);
    expect(npvCluster[0]).toHaveLength(3);
    expect(disposeQuestion({ overlappingCount: 3, uniqueIntent: false, commercial: "HIGH" })).toBe("NOT_WORTH_SEPARATE_CONTENT");
    expect(graph.nodes.some((node) => node.recommendedContentDisposition === "FAQ_ITEM")).toBe(true);
    expect(graph.nodes.some((node) => node.recommendedContentDisposition === "DEDICATED_PAGE")).toBe(true);
    expect(graph.nodes.some((node) => node.recommendedContentDisposition === "NOT_WORTH_SEPARATE_CONTENT")).toBe(true);
    const coverage = buildQuestionCoverageProfile(graph);
    expect(coverage.coverageClaim).toBe(KNOWN_HIGH_CONFIDENCE_QUESTION_COVERAGE);
    expect(coverage.completeUniverseClaimed).toBe(false);
    expect(coverage.gscLive).toBe(false);
    expect(coverage.knownRelevantQuestions).toBe(graph.nodes.length);
  });

  it("evaluates citation readiness, source quality, and independence without false corroboration", () => {
    expect(classifySourceQuality("https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm")).toBe("GOVERNMENT");
    expect(classifySourceQuality("https://www.naiop.org/")).toBe("PROFESSIONAL_ORGANIZATION");
    expect(classifySourceQuality("https://www.investopedia.com/terms/n/npv.asp")).toBe("RECOGNIZED_REFERENCE");
    const sameOrigin = evaluateSourceIndependence([
      "https://www.investopedia.com/terms/n/npv.asp",
      "https://www.investopedia.com/terms/d/discountrate.asp",
    ]);
    expect(sameOrigin.independentCorroboration).toBe(false);
    expect(sameOrigin.falselyClaimedCorroboration).toBe(false);
    expect(evaluateSourceIndependence([
      "https://www.investopedia.com/terms/n/npv.asp",
      "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm",
    ]).independentCorroboration).toBe(true);
    const ready = evaluateCitationReadiness({
      question: "What is NPV in a commercial lease?",
      answer: "A commercial lease NPV calculation converts future lease costs into today’s dollars using a discount rate so options can be compared.",
      entityRefs: ["npv"],
      sourceRefs: ["https://www.investopedia.com/terms/n/npv.asp"],
    });
    expect(ready.model).toBe("CitationReadinessProfile");
    expect(ready.marketingFluffInAnswer).toBe(false);
    expect(ready.overall).toBe("PASS");
    const fluff = evaluateCitationReadiness({
      question: "What is NPV?",
      answer: "This is a guaranteed game-changer trusted by everyone.",
      entityRefs: [],
      sourceRefs: [],
    });
    expect(fluff.overall).toBe("FAIL");
    expect(fluff.marketingFluffInAnswer).toBe(true);
  });

  it("treats word count as a signal and requires sufficiency on depth, DR, visual, and semantic gates", () => {
    expect(wordCountIsHardQuota()).toBe(false);
    const thin = evaluatePageVisualPlan({
      route: "/commercial-lease-npv",
      content: `<h1>NPV</h1><p>${"lease ".repeat(400)}</p>`,
    });
    expect(educationalVisualizationRequirement("/commercial-lease-npv")).toBe("REQUIRED");
    expect(thin.adequate).toBe("FAIL");
    expect(evaluateSectionVariety({
      route: "/commercial-lease-npv",
      content: `<section className="pv-prose" data-section-type="EDUCATION" data-pattern-id="DATA_DENSITY_WITH_CLARITY"><h2>A</h2><p>b</p></section>`,
    }).overall).toBe("FAIL");
    expect(evaluateInformationDensity({
      route: "/commercial-lease-npv",
      content: `<header className="pv-hero pv-article-hero"></header><p>short</p>`,
    }).excessiveLowInformationEmptySpace).toBe(true);
    const semantic = evaluateSemanticCoverage({
      route: "/commercial-lease-npv",
      role: "QUESTION_PAGE",
      content: "NPV converts future lease costs.",
      primaryTopic: "NPV",
      searchIntent: "DEFINITIONAL",
      entityTarget: "npv",
    });
    expect(semantic.keywordStuffing).toBe(false);
    expect(semantic.overall).toBe("FAIL");
    const registry = directResponsePagePatternRegistry();
    expect(registry.copiedBrandedFrameworks).toBe(false);
    expect(registry.longFormProduct.requiredBlocks.length).toBeGreaterThanOrEqual(15);
    const dr = evaluateDirectResponsePage({
      route: "/",
      commercial: true,
      content: `<h1>Compare leases</h1><p>Request Pilot Access</p><p>$290</p>`,
    });
    expect(dr.overall).toBe("FAIL");
    expect(dr.genericSaasOnly).toBe(false);
    const fulfillment = evaluatePagePatternFulfillment({
      patternId: "LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE",
      content: "<h1>Hello</h1><p>Four sections only.</p>",
    });
    expect(fulfillment.present).toBeLessThan(fulfillment.required);
    expect(fulfillment.overall).toBe("FAIL");
    expect(buildObjectionKnowledgeGraph().nodes.some((node) => node.addressedOn.length === 0)).toBe(true);
  });

  it("defines URL architecture, competitive coverage, layered QC, and a bounded repair loop", () => {
    const urls = digitalRealEstateUrlArchitecture();
    expect(urls.model).toBe("DigitalRealEstateURLArchitecture");
    expect(urls.executed).toBe(false);
    expect(urls.redirectPlanRequiredIfApplied).toBe(true);
    expect(creRedirectPlanIfSilosApplied().executed).toBe(false);
    expect(competitiveCoverageProfile("commercial lease NPV").plagiarism).toBe(false);
    expect(plagiarismPolicy().copyCompetitorText).toBe(false);
    const review = reviewPublishability({
      route: "/commercial-lease-npv",
      role: "QUESTION_PAGE",
      intendedPatternId: "DEEP_AUTHORITY_QUESTION_PAGE",
      content: "<h1>NPV</h1><p>Short generic copy.</p>",
    });
    expect(review.overall).toBe("FAIL");
    expect(adversarialReview(review).rubberStamp).toBe(false);
    expect(ADVERSARIAL_FAIL_REASONS).toEqual(expect.arrayContaining(["TOO_THIN", "INSUFFICIENT_VISUAL_EXPLANATION", "INSUFFICIENT_DIRECT_RESPONSE"]));
    const layers = runLayeredQc({
      technicalPass: true,
      contentPass: false,
      directResponsePass: false,
      visualPass: false,
      seoGeoPass: false,
      answerAuthorityPass: false,
      adversarialPass: false,
      publishabilityPass: false,
      stuffing: false,
    });
    expect(layers).toHaveLength(10);
    expect(layers.find((item) => item.layer === "TECHNICAL_QC")?.state).toBe("PASS");
    expect(layers.find((item) => item.layer === "PUBLISHABILITY_QC")?.state).toBe("FAIL");
    const loop = boundedRepairLoop(["visual", "sources"], 2);
    expect(loop.max).toBe(MAX_AUTHORITY_REPAIR_LOOPS);
    expect(loop.regenerateEntireSite).toBe(false);
    expect(loop.unresolvedQualityBlocker).toBe(true);
    expect(answerAuthorityPerformanceContract().gscLive).toBe(false);
    expect(answerAuthorityPerformanceContract().geoCitationMeasured).toBe(false);
    expect(searchPerformanceAdapterContracts().every((item) => item.live === false)).toBe(true);
    const architecture = planVentureSiteArchitecture(creSiteArchitectureInput(`candidate:${CRE_CANDIDATE_ID}`));
    const expansion = planSiteExpansion(architecture, {
      gaps: [{ gapId: "g1", reason: "DEDICATED_PAGE_NEEDED", questionId: "q1", route: null, summary: "What is CAM in a commercial lease?", priority: 1 }],
      coverage: buildQuestionCoverageProfile(buildCreQuestionKnowledgeGraph()),
      performanceIntelligence: { live: false, gscLive: false },
    });
    expect(expansion.autoPublishThousands).toBe(false);
    expect(expansion.autoPublish).toBe(false);
    expect(expansion.consumesAuthorityGaps).toBe(true);
    expect(expansion.opportunities.some((item) => /CAM/i.test(item.topic))).toBe(true);
    expect(buildSiteKnowledgeGraph(architecture).orphans).toEqual([]);
  });

  it("audits the current live CRE artifact as below the new sufficiency standard without mutating or deploying it", async () => {
    const reconstructed = await reconstructCreAuthoritySiteSuccessor();
    expect(reconstructed.digest).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST);
    expect(reconstructed.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const scored = scoreQuestionAnswers(buildCreQuestionKnowledgeGraph(), reconstructed.files);
    expect(scored.nodes.some((node) => node.answerState === "UNANSWERED")).toBe(true);
    const audit = await auditCurrentCreAuthorityArtifact();
    expect(audit.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(audit.digest).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST);
    expect(audit.mutated).toBe(false);
    expect(audit.deployed).toBe(false);
    expect(audit.generateSuccessorCalled).toBe(false);
    expect(audit.previousClassification).toBe(PREMIUM_AUTHORITY_VALIDATION_READY);
    expect(audit.previousQualityOverall).toBe("PASS");
    expect(audit.newClassification).toBe(PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD);
    expect(audit.previousClassificationTooPermissive).toBe(true);
    expect(audit.presenceVsSufficiency).toBe("FAIL");
    expect(audit.answerAuthorityReady).toBe("FAIL");
    expect(audit.wordCountHardQuota).toBe(false);
    expect(audit.coverage.completeUniverseClaimed).toBe(false);
    expect(audit.coverage.highCommercialUnanswered).toBeGreaterThan(0);
    expect(audit.unmappedHighPriority).toBeGreaterThan(0);
    expect(audit.hardFailPages).toBeGreaterThan(0);
    expect(audit.pagesTooShallow).toBeGreaterThan(0);
    expect(audit.pagesUnderVisualized).toBeGreaterThan(0);
    expect(audit.homepage.overall).toBe("FAIL");
    expect(audit.homepage.longFormDepth).toBe("FAIL");
    expect(audit.homepage.objections).toBe("FAIL");
    expect(audit.homepage.faq).toBe("FAIL");
    expect(audit.homepage.productVisualization).toBe("PASS");
    expect(audit.homepage.pricing).toBe("PASS");
    expect(audit.homepageDr.genericSaasOnly).toBe(false);
    expect(audit.npv.directAnswer).toBe("PASS");
    expect(audit.npv.commonMistakes).toBe("PASS");
    expect(audit.npv.sources).toBe("PASS");
    expect(audit.npv.formulaExplanation).toBe("FAIL");
    expect(audit.npv.visualizations).toBe("FAIL");
    expect(audit.npv.overall).toBe("FAIL");
    expect(audit.hub.spokeCoverage).toBe("FAIL");
    expect(audit.hub.authorityDepth).toBe("FAIL");
    expect(audit.hub.overall).toBe("FAIL");
    expect(audit.repair.successorRequired).toBe(true);
    expect(audit.repair.deployed).toBe(false);
    expect(audit.repair.regenerateEntireSite).toBe(false);
    expect(audit.repair.pagesToExpand).toEqual(expect.arrayContaining(["/", "/commercial-lease-npv", "/resources"]));
    expect(audit.urlArchitecture.executed).toBe(false);
    expect(CRE_SUBSTANTIVE_ROUTES.every((route) => audit.pageRows.some((row) => row.route === route))).toBe(true);
    expect(audit.layers.find((item) => item.layer === "TECHNICAL_QC")?.state).toBe("PASS");
    expect(audit.layers.find((item) => item.layer === "VISUAL_QC")?.state).toBe("FAIL");
    expect(audit.layers.find((item) => item.layer === "PUBLISHABILITY_QC")?.state).toBe("FAIL");
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T03:42:00.000Z") });
    expect(evidence.experiment.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(evidence.experiment.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.counts.qualifiedVisitors).toBe(0);
    expect(evidence.counts.strongIntent).toBe(0);
    expect(evidence.counts.pricingSelections).toBe(0);
    expect(evidence.decision.currentDecision).toBe("VALIDATE");
    expect(evidence.decision.buildReady).toBe(false);
    expect(MARKET_VALIDATION_ACQUISITION_RUNTIME).toBe("MarketValidationAcquisitionRuntime");
    const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
    expect(hq.fakeActiveWork).toBe(false);
    expect(hq.validationStation).toBe("COLLECTING");
    expect(buildFounderMoneyView(null).pricing.length).toBeGreaterThan(0);
    const dashboard = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
  }, 180_000);
});
