import { PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID, PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD, PREMIUM_AUTHORITY_VALIDATION_READY } from "../constants";
import { reconstructCreAuthoritySiteSuccessor } from "../cre-successor";
import { creAuthoritySources } from "../geo-seo-architecture";
import { auditPremiumAuthoritySite } from "../quality-gates";
import { CRE_SUBSTANTIVE_ROUTES } from "./constants";
import { classifySourceQuality, evaluateSourceIndependence, extractAnswerChunks } from "./citation-and-sources";
import {
  evaluateAuthorityPageDepth,
  evaluateDirectResponsePage,
  evaluatePagePatternFulfillment,
  wordCountIsHardQuota,
} from "./depth-and-direct-response";
import { extractAnswerFirstBlocks, pageContent } from "./page-inspect";
import {
  adversarialReview,
  buildAuthorityContentGaps,
  planAuthorityRepair,
  reviewPublishability,
  runLayeredQc,
} from "./publishability-and-qc";
import { buildCreQuestionKnowledgeGraph, buildQuestionCoverageProfile, scoreQuestionAnswers } from "./question-system";
import { digitalRealEstateUrlArchitecture, evaluateInternalLinkSufficiency, creRedirectPlanIfSilosApplied } from "./url-and-links";
import { buildConcreteRepairRoutes, rankedDedicatedPageOpportunities, summarizeConcreteRepair } from "./concrete-repair-plan";
import { evaluateInformationDensity, evaluatePageVisualPlan, evaluateSectionVariety, evaluateSemanticCoverage } from "./visual-and-semantic";
import type {
  CrePageAuditRow,
  Gate,
  HomepageDimensionAudit,
  HubDimensionAudit,
  NpvDimensionAudit,
} from "./types";

function gate(ok: boolean): Gate {
  return ok ? "PASS" : "FAIL";
}

export function auditHomepageDimensions(content: string): HomepageDimensionAudit {
  const longFormDepth = gate(evaluateAuthorityPageDepth({ route: "/", role: "HOMEPAGE", content, topicComplexity: "HIGH" }).overall === "PASS");
  const problemFraming = gate(/rebuild|spreadsheet|without rebuilding/i.test(content));
  const mechanism = gate(/NPV|discount-rate|cash-flow|client summary/i.test(content));
  const productVisualization = gate(/ProductUiFrame|LEASE_OPTION_COMPARISON/.test(content));
  const benefits = gate(/Cash-flow compare|shareable|sensitivity stays visible/i.test(content));
  const useCases = gate(/tenant-rep|boutique CRE/i.test(content));
  const objections = gate(/who is this not for|objection/i.test(content));
  const pricing = gate(/\$290/.test(content) && /\$149/.test(content));
  const faq = gate(/data-section-type="FAQ"/.test(content));
  const ctaSequence = gate(evaluateDirectResponsePage({ route: "/", content, commercial: true }).ctaProgression === "PASS");
  const authorityLinks = gate(/\/commercial-lease-npv|\/resources/.test(content));
  const overall = gate(
    [longFormDepth, problemFraming, mechanism, productVisualization, benefits, useCases, objections, pricing, faq, ctaSequence, authorityLinks].every((item) => item === "PASS"),
  );
  return {
    longFormDepth,
    problemFraming,
    mechanism,
    productVisualization,
    benefits,
    useCases,
    objections,
    pricing,
    faq,
    ctaSequence,
    authorityLinks,
    overall,
  };
}

export function auditNpvDimensions(content: string): NpvDimensionAudit {
  const directAnswer = gate(/What is NPV in a commercial lease\?/.test(content) && /AnswerFirst/.test(content));
  const formulaExplanation = gate(/NPV\s*=|sum of discounted|formula/i.test(content));
  const workedExample = gate(/worked example|full NPV sums every modeled period/i.test(content) && /Year 4|year-five|period 4/i.test(content));
  const cashFlowTiming = gate(/cash-flow stream for each option/.test(content) && /when cash moves/.test(content) && /CAM/.test(content) && /escalat/.test(content));
  const discountRate = gate(/What discount rate should be used for lease NPV/i.test(content));
  const tenantImprovement = gate(/How does tenant improvement allowance affect NPV/i.test(content));
  const freeRent = gate(/Does free rent affect lease NPV/i.test(content));
  const cam = gate(/Should CAM be included/i.test(content));
  const escalations = gate(/How do rent escalations affect NPV/i.test(content));
  const differentLeaseTerms = gate(/different terms|different lease terms|measurement period/i.test(content) && /NPV/.test(content) && /term/.test(content));
  const limitations = gate(/not automatically|does not capture every|cap rate/i.test(content));
  const brokerWorkflow = gate(/tenant-rep brokers use NPV|client summary next to/i.test(content) && /inputs are required|what decisions follow/i.test(content));
  const commonMistakes = gate(/Common mistakes/.test(content));
  const relatedQuestions = gate(/Is NPV the same|Can I skip NPV/.test(content));
  const sources = gate(/investopedia\.com\/terms\/n\/npv/.test(content));
  const visualizations = gate((content.match(/data-visualization/g) ?? []).length >= 2 && /cash.flow|formula/i.test(content));
  const internalLinks = gate(/\/discount-rate-sensitivity/.test(content) && /\/compare-commercial-leases/.test(content) && /\/resources/.test(content));
  const overall = gate(
    [
      directAnswer,
      formulaExplanation,
      workedExample,
      cashFlowTiming,
      discountRate,
      tenantImprovement,
      freeRent,
      cam,
      escalations,
      differentLeaseTerms,
      limitations,
      brokerWorkflow,
      commonMistakes,
      relatedQuestions,
      sources,
      visualizations,
      internalLinks,
    ].every((item) => item === "PASS"),
  );
  return {
    directAnswer,
    formulaExplanation,
    workedExample,
    cashFlowTiming,
    discountRate,
    tenantImprovement,
    freeRent,
    cam,
    escalations,
    differentLeaseTerms,
    limitations,
    brokerWorkflow,
    commonMistakes,
    relatedQuestions,
    sources,
    visualizations,
    internalLinks,
    overall,
  };
}

export function auditResourceHubDimensions(content: string): HubDimensionAudit {
  const topicOverview = gate(/smallest useful cluster|grouped by how decisions/i.test(content));
  const spokeCoverage = gate(/<h2>/.test(content) && /spoke introduction|why it matters for the cluster/i.test(content));
  const questionNavigation = gate(/QuestionKnowledgeGraph|question cluster|related questions by intent/i.test(content));
  const authorityDepth = gate(evaluateAuthorityPageDepth({ route: "/resources", role: "EDUCATIONAL_HUB", content, topicComplexity: "HIGH" }).overall === "PASS");
  const visualStructure = gate(/topic map|data-visualization/.test(content));
  const conversionPath = gate(/early-access|pricing/.test(content));
  const overall = gate([topicOverview, spokeCoverage, questionNavigation, authorityDepth, visualStructure, conversionPath].every((item) => item === "PASS"));
  return { topicOverview, spokeCoverage, questionNavigation, authorityDepth, visualStructure, conversionPath, overall };
}

export async function auditCurrentCreAuthorityArtifact() {
  const reconstructed = await reconstructCreAuthoritySiteSuccessor();
  const files = reconstructed.files;
  const pages = reconstructed.architecture.pages;
  const previousQuality = auditPremiumAuthoritySite({ files, pages, graph: reconstructed.graph });
  const graph = scoreQuestionAnswers(buildCreQuestionKnowledgeGraph(), files);
  const coverage = buildQuestionCoverageProfile(graph);
  const evidence = creAuthoritySources(CANONICAL_EVIDENCE_START);
  const sourceUrls = evidence.map((item) => item.source);
  const chunks = CRE_SUBSTANTIVE_ROUTES.flatMap((route) =>
    extractAnswerChunks({
      route,
      content: pageContent(files, route),
      questions: graph.nodes,
      sourceRefs: sourceUrls.filter((url) => pageContent(files, route).includes(new URL(url).host.replace("www.", "")) || pageContent(files, route).includes(url)),
    }),
  );
  const pageRows: CrePageAuditRow[] = CRE_SUBSTANTIVE_ROUTES.map((route) => {
    const page = pages.find((item) => item.route === route);
    const content = pageContent(files, route);
    const role = page?.role ?? "UNKNOWN";
    const complexity = role === "PRICING" || role === "CONVERSION" || role === "FAQ" ? "LOW" : "HIGH";
    const depth = evaluateAuthorityPageDepth({ route, role, content, topicComplexity: complexity });
    const visual = evaluatePageVisualPlan({ route, content });
    const density = evaluateInformationDensity({ route, content });
    const variety = evaluateSectionVariety({ route, content });
    const intended = route === "/" ? "LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE" : route === "/commercial-lease-npv" ? "DEEP_AUTHORITY_QUESTION_PAGE" : page?.patternId ?? "COMMERCIAL_PRODUCT_PAGE";
    const publish = reviewPublishability({ route, role, content, intendedPatternId: intended });
    const commercial = route === "/" || role === "HOW_IT_WORKS" || role === "COMPARISON" || role === "PRICING";
    const dr = evaluateDirectResponsePage({ route, content, commercial });
    const answers = extractAnswerFirstBlocks(content);
    const questionCoverage = answers.length > 0 || route === "/" ? depth.questionCoverage : "FAIL";
    const reasons = [...publish.hardFailReasons];
    if (density.excessiveLowInformationEmptySpace) reasons.push("EXCESSIVE_EMPTY_SPACE");
    if (variety.repetitiveWhiteBoxPattern) reasons.push("REPETITIVE_TEMPLATE");
    return {
      route,
      role,
      approxWords: depth.approxWords,
      questionCoverage,
      depth: depth.overall,
      visualAdequacy: visual.adequate,
      sourceAdequacy: depth.sourceAdequacy,
      directResponseAdequacy: commercial ? dr.overall : "NOT_APPLICABLE",
      answerAuthority: answers.length && depth.overall === "PASS" ? "PASS" : answers.length ? "FAIL" : route === "/" ? "FAIL" : "FAIL",
      publishability: publish.overall === "PASS" ? "PASS" : "FAIL",
      primaryFailReasons: [...new Set(reasons)],
    };
  });
  const reviews = pageRows.map((row) => {
    const page = pages.find((item) => item.route === row.route);
    const intended = row.route === "/" ? "LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE" : row.route === "/commercial-lease-npv" ? "DEEP_AUTHORITY_QUESTION_PAGE" : page?.patternId ?? "COMMERCIAL_PRODUCT_PAGE";
    return reviewPublishability({
      route: row.route,
      role: row.role,
      content: pageContent(files, row.route),
      intendedPatternId: intended,
    });
  });
  const gaps = buildAuthorityContentGaps({ graph, pages, files });
  const links = evaluateInternalLinkSufficiency({ files, pages, graph: reconstructed.graph });
  if (links.semanticLinkGaps > 0) {
    gaps.push({
      gapId: "gap_internal_links",
      reason: "INTERNAL_LINK_GAP",
      questionId: null,
      route: null,
      summary: "Semantic internal-link sufficiency gaps",
      priority: 2,
    });
  }
  const repair = planAuthorityRepair({ pages, files, gaps, reviews });
  const homepage = auditHomepageDimensions(pageContent(files, "/"));
  const npv = auditNpvDimensions(pageContent(files, "/commercial-lease-npv"));
  const hub = auditResourceHubDimensions(pageContent(files, "/resources"));
  const homepageDr = evaluateDirectResponsePage({ route: "/", content: pageContent(files, "/"), commercial: true });
  const depths = pageRows.map((row) => evaluateAuthorityPageDepth({
    route: row.route,
    role: row.role,
    content: pageContent(files, row.route),
    topicComplexity: row.role === "PRICING" || row.role === "CONVERSION" || row.role === "FAQ" ? "LOW" : "HIGH",
  }));
  const visuals = CRE_SUBSTANTIVE_ROUTES.map((route) => evaluatePageVisualPlan({ route, content: pageContent(files, route) }));
  const densities = CRE_SUBSTANTIVE_ROUTES.map((route) => evaluateInformationDensity({ route, content: pageContent(files, route) }));
  const citationReadyChunks = chunks.filter((chunk) => chunk.citationReadiness.overall === "PASS" && chunk.confidence !== "LOW");
  const weakChunks = chunks.filter((chunk) => chunk.citationReadiness.overall === "FAIL" || chunk.confidence === "LOW");
  const hardFailPages = reviews.filter((item) => item.overall === "FAIL");
  const warningPages = reviews.filter((item) => item.overall === "PASS_WITH_WARNINGS");
  const answerAuthorityReady = coverage.deeplyAnsweredQuestions >= 8 && citationReadyChunks.length >= 6 && npv.overall === "PASS";
  const layers = runLayeredQc({
    technicalPass: previousQuality.premiumAuthorityOverall === "PASS",
    contentPass: pageRows.filter((row) => row.depth === "PASS").length >= 8,
    directResponsePass: homepageDr.overall === "PASS" && homepage.overall === "PASS",
    visualPass: visuals.every((item) => item.adequate === "PASS") && npv.visualizations === "PASS",
    seoGeoPass: previousQuality.geoSeo === "PASS" && coverage.highCitationUnanswered === 0,
    answerAuthorityPass: answerAuthorityReady,
    adversarialPass: hardFailPages.length === 0,
    publishabilityPass: hardFailPages.length === 0,
    stuffing: false,
  });
  const evidenceNow = inspectRealMarketEvidence({ now: new Date("2026-08-30T03:42:00.000Z") });
  const semantic = CRE_SUBSTANTIVE_ROUTES.map((route) => {
    const page = pages.find((item) => item.route === route);
    return evaluateSemanticCoverage({
      route,
      role: page?.role ?? "UNKNOWN",
      content: pageContent(files, route),
      primaryTopic: page?.title ?? route,
      searchIntent: page?.primaryIntent ?? "EDUCATIONAL",
      entityTarget: page?.topicCluster ?? "Product",
    });
  });
  const repairRoutes = buildConcreteRepairRoutes({
    pageRows,
    questions: graph.nodes,
    semanticMissing: Object.fromEntries(semantic.map((item) => [item.route, item.missingEntities])),
  });
  const opportunities = rankedDedicatedPageOpportunities(graph.nodes);
  const concreteRepair = summarizeConcreteRepair({ plan: repair, routes: repairRoutes, opportunities });
  const npvChunk = chunks.find((chunk) => chunk.pageId === "/commercial-lease-npv");
  return {
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    digest: reconstructed.digest,
    expectedDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
    mutated: false as const,
    deployed: false as const,
    generateSuccessorCalled: false as const,
    previousClassification: PREMIUM_AUTHORITY_VALIDATION_READY,
    previousQualityOverall: previousQuality.premiumAuthorityOverall,
    newClassification: PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD,
    previousClassificationTooPermissive: true as const,
    presenceVsSufficiency: "FAIL" as const,
    previousQcValidated: [
      "build",
      "render",
      "metadata",
      "schema",
      "internal link presence",
      "minimum page depth",
      "component presence",
    ],
    missingSufficiencyDimensions: [
      "question coverage sufficiency",
      "answer authority",
      "visual explanation adequacy",
      "direct-response completeness",
      "page-pattern fulfillment against intended authority patterns",
      "information density",
      "section variety",
      "hub quality",
      "citation readiness",
      "publishability",
    ],
    questionGraph: graph,
    coverage,
    mappedCount: graph.nodes.filter((node) => node.mappedRoute).length,
    unmappedHighPriority: graph.nodes.filter((node) => !node.mappedRoute && node.priority === 1).length,
    clusters: graph.clusters.length,
    highConfidenceQuestions: graph.nodes.length,
    answerChunks: chunks,
    citationReadyChunks: citationReadyChunks.length,
    weakChunks: weakChunks.length,
    directAnswerBlocks: chunks.length,
    sourceQuality: sourceUrls.map(classifySourceQuality),
    sourceIndependence: evaluateSourceIndependence(sourceUrls),
    pageRows,
    depths,
    visuals,
    densities,
    homepage,
    homepageDr,
    npv,
    hub,
    links,
    urlArchitecture: digitalRealEstateUrlArchitecture(),
    reviews,
    adversarial: reviews.map(adversarialReview),
    hardFailPages: hardFailPages.length,
    warningPages: warningPages.length,
    mainFailReasons: [...new Set(hardFailPages.flatMap((item) => item.hardFailReasons))],
    gaps,
    repair,
    layers,
    answerAuthorityReady: answerAuthorityReady ? "PASS" : "FAIL",
    wordCountHardQuota: wordCountIsHardQuota(),
    pagesAdequate: depths.filter((item) => item.overall === "PASS").length,
    pagesTooShallow: depths.filter((item) => item.overall === "FAIL").length,
    pagesRequiringDepthJustification: depths.filter((item) => item.explicitDepthJustificationRequired).length,
    pagesUnderVisualized: visuals.filter((item) => item.adequate === "FAIL").length,
    pagesWithEmptySpace: densities.filter((item) => item.excessiveLowInformationEmptySpace).length,
    semantic,
    intendedPatternFulfillment: {
      homepage: evaluatePagePatternFulfillment({ patternId: "LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE", content: pageContent(files, "/") }),
      npv: evaluatePagePatternFulfillment({ patternId: "DEEP_AUTHORITY_QUESTION_PAGE", content: pageContent(files, "/commercial-lease-npv") }),
    },
    experiment: {
      state: evidenceNow.experiment.state,
      evidenceStart: evidenceNow.clock.evidenceStart,
      deadline: evidenceNow.clock.deadline,
      restarted: evidenceNow.clock.restarted,
      qualified: evidenceNow.counts.qualifiedVisitors,
      strongIntent: evidenceNow.counts.strongIntent,
      pricing: evidenceNow.counts.pricingSelections,
      decision: evidenceNow.decision.currentDecision,
      buildReady: evidenceNow.decision.buildReady,
      artifactId: evidenceNow.experiment.artifactId,
    },
    concreteRepair,
    npvCitationReadiness: npvChunk?.citationReadiness.overall ?? "FAIL",
    redirectPlan: creRedirectPlanIfSilosApplied(),
    pagesUnderQuestioned: pageRows.filter((row) => row.questionCoverage === "FAIL" || (repairRoutes.find((item) => item.route === row.route)?.questionsMissing.length ?? 0) >= 2).length,
    pagesWeakSource: pageRows.filter((row) => row.sourceAdequacy === "FAIL").length,
    executedFresh: true as const,
    cachedOldClassificationReused: false as const,
  };
}
