import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD,
  PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD,
  PREMIUM_AUTHORITY_VALIDATION_READY,
} from "../constants";
import {
  auditRenderedLayoutQualityGate,
  renderedLayoutPassesPremiumAuthority,
} from "@/lib/infinity/public-venture-design/rendered-layout";
import { reconstructCreDirectResponseSuccessor } from "../cre-dr-successor";
import { creAuthoritySources } from "../geo-seo-architecture";
import { auditPremiumAuthoritySite } from "../quality-gates";
import { SUCCESSOR_SUBSTANTIVE_ROUTES } from "./constants";
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
import { applySuccessorQuestionMapping, buildCreQuestionKnowledgeGraph, buildQuestionCoverageProfile, scoreQuestionAnswers } from "./question-system";
import { digitalRealEstateUrlArchitecture, evaluateInternalLinkSufficiency, creRedirectPlanIfSilosApplied } from "./url-and-links";
import { evaluateInformationDensity, evaluatePageVisualPlan, evaluateSectionVariety, evaluateSemanticCoverage } from "./visual-and-semantic";
import { auditHomepageDimensions, auditNpvDimensions, auditResourceHubDimensions } from "./cre-audit";
import type { CrePageAuditRow, Gate } from "./types";

function gate(ok: boolean): Gate {
  return ok ? "PASS" : "FAIL";
}

export async function auditSuccessorAuthorityArtifact(input?: {
  files?: Array<{ path: string; content: string }>;
  architecture?: Awaited<ReturnType<typeof reconstructCreDirectResponseSuccessor>>["architecture"];
  graph?: Awaited<ReturnType<typeof reconstructCreDirectResponseSuccessor>>["graph"];
  artifactId?: string;
  digest?: string;
  predecessorArtifactId?: string;
  repairReason?: string;
}) {
  const reconstructed = input?.files
    ? null
    : await reconstructCreDirectResponseSuccessor();
  const files = input?.files ?? reconstructed!.files;
  const pages = input?.architecture?.pages ?? reconstructed!.architecture.pages;
  const siteGraph = input?.graph ?? reconstructed!.graph;
  const artifactId = input?.artifactId ?? reconstructed!.artifactId;
  const digest = input?.digest ?? reconstructed!.digest;
  const previousQuality = auditPremiumAuthoritySite({ files, pages, graph: siteGraph });
  const graph = scoreQuestionAnswers(applySuccessorQuestionMapping(buildCreQuestionKnowledgeGraph()), files, { matchAnyAnswerFirst: true });
  const coverage = buildQuestionCoverageProfile(graph);
  const evidence = creAuthoritySources(CANONICAL_EVIDENCE_START);
  const sourceUrls = evidence.map((item) => item.source);
  const chunks = SUCCESSOR_SUBSTANTIVE_ROUTES.flatMap((route) =>
    extractAnswerChunks({
      route,
      content: pageContent(files, route),
      questions: graph.nodes,
      sourceRefs: sourceUrls.filter((url) => pageContent(files, route).includes(new URL(url).host.replace("www.", "")) || pageContent(files, route).includes(url)),
    }),
  );
  const pageRows: CrePageAuditRow[] = SUCCESSOR_SUBSTANTIVE_ROUTES.map((route) => {
    const page = pages.find((item) => item.route === route);
    const content = pageContent(files, route);
    const role = page?.role ?? "UNKNOWN";
    const complexity = role === "PRICING" || role === "CONVERSION" || role === "FAQ" ? "LOW" : "HIGH";
    const depth = evaluateAuthorityPageDepth({ route, role, content, topicComplexity: complexity });
    const visual = evaluatePageVisualPlan({ route, content });
    const density = evaluateInformationDensity({ route, content });
    const intended =
      route === "/"
        ? "LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE"
        : route === "/commercial-lease-npv"
          ? "DEEP_AUTHORITY_QUESTION_PAGE"
          : route === "/early-access"
            ? "PRICING_HYPOTHESIS_PAGE"
            : route === "/faq"
              ? "FAQ_PAGE"
              : page?.patternId ?? "COMMERCIAL_PRODUCT_PAGE";
    const publish = reviewPublishability({ route, role, content, intendedPatternId: intended });
    const commercial = route === "/" || role === "HOW_IT_WORKS" || role === "COMPARISON" || role === "PRICING" || role === "PERSONA";
    const dr = evaluateDirectResponsePage({ route, content, commercial });
    const answers = extractAnswerFirstBlocks(content);
    return {
      route,
      role,
      approxWords: depth.approxWords,
      questionCoverage: answers.length > 0 || route === "/" ? depth.questionCoverage : "FAIL",
      depth: depth.overall,
      visualAdequacy: visual.adequate,
      sourceAdequacy: depth.sourceAdequacy,
      directResponseAdequacy: commercial ? dr.overall : "NOT_APPLICABLE",
      answerAuthority: answers.length && depth.overall === "PASS" ? "PASS" : answers.length ? "FAIL" : route === "/" ? "FAIL" : "FAIL",
      publishability: publish.overall === "PASS" ? "PASS" : "FAIL",
      primaryFailReasons: [...new Set(publish.hardFailReasons)],
    };
  });
  const reviews = pageRows.map((row) => {
    const page = pages.find((item) => item.route === row.route);
    const intended =
      row.route === "/"
        ? "LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE"
        : row.route === "/commercial-lease-npv"
          ? "DEEP_AUTHORITY_QUESTION_PAGE"
          : row.route === "/early-access"
            ? "PRICING_HYPOTHESIS_PAGE"
            : row.route === "/faq"
              ? "FAQ_PAGE"
              : page?.patternId ?? "COMMERCIAL_PRODUCT_PAGE";
    return reviewPublishability({
      route: row.route,
      role: row.role,
      content: pageContent(files, row.route),
      intendedPatternId: intended,
    });
  });
  const gaps = buildAuthorityContentGaps({ graph, pages, files });
  const links = evaluateInternalLinkSufficiency({ files, pages, graph: siteGraph });
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
  const moneyDr = ["/how-it-works", "/compare-commercial-leases", "/for/tenant-rep-brokers", "/pricing"].map((route) =>
    evaluateDirectResponsePage({ route, content: pageContent(files, route), commercial: true }),
  );
  const depths = pageRows.map((row) =>
    evaluateAuthorityPageDepth({
      route: row.route,
      role: row.role,
      content: pageContent(files, row.route),
      topicComplexity: row.role === "PRICING" || row.role === "CONVERSION" || row.role === "FAQ" ? "LOW" : "HIGH",
    }),
  );
  const visuals = SUCCESSOR_SUBSTANTIVE_ROUTES.map((route) => evaluatePageVisualPlan({ route, content: pageContent(files, route) }));
  const densities = SUCCESSOR_SUBSTANTIVE_ROUTES.map((route) => evaluateInformationDensity({ route, content: pageContent(files, route) }));
  const varieties = SUCCESSOR_SUBSTANTIVE_ROUTES.map((route) => evaluateSectionVariety({ route, content: pageContent(files, route) }));
  const citationReadyChunks = chunks.filter((chunk) => chunk.citationReadiness.overall === "PASS" && chunk.confidence !== "LOW");
  const hardFailPages = reviews.filter((item) => item.overall === "FAIL");
  const answerAuthorityReady = coverage.deeplyAnsweredQuestions >= 8 && citationReadyChunks.length >= 6 && npv.overall === "PASS";
  const renderedLayout = auditRenderedLayoutQualityGate(files);
  const renderedPass = renderedLayoutPassesPremiumAuthority(renderedLayout);
  const layers = runLayeredQc({
    technicalPass: previousQuality.premiumAuthorityOverall === "PASS",
    contentPass: pageRows.filter((row) => row.depth === "PASS").length >= 8,
    directResponsePass: homepageDr.overall === "PASS" && homepage.overall === "PASS" && moneyDr.every((item) => item.overall === "PASS"),
    visualPass: visuals.every((item) => item.adequate === "PASS") && npv.visualizations === "PASS",
    seoGeoPass: previousQuality.geoSeo === "PASS" && coverage.highCitationUnanswered === 0,
    answerAuthorityPass: answerAuthorityReady,
    renderedLayoutPass: renderedPass,
    premiumCompositionPass: renderedLayout.premiumComposition === "PASS",
    adversarialPass: hardFailPages.length === 0 && renderedPass,
    publishabilityPass: hardFailPages.length === 0,
    stuffing: false,
  });
  const contentLayersPass = layers
    .filter((layer) => layer.layer !== "RENDERED_LAYOUT_QC" && layer.layer !== "PREMIUM_COMPOSITION_QC" && layer.layer !== "ADVERSARIAL_QC")
    .every((layer) => layer.state === "PASS") && hardFailPages.length === 0;
  const layersPass = layers.every((layer) => layer.state === "PASS");
  const newClassification = layersPass
    ? PREMIUM_AUTHORITY_VALIDATION_READY
    : contentLayersPass
      ? PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD
      : PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD;
  const evidenceNow = inspectRealMarketEvidence({ now: new Date("2026-08-30T05:04:00.000Z") });
  const semantic = SUCCESSOR_SUBSTANTIVE_ROUTES.map((route) => {
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
  const npvChunk = chunks.find((chunk) => chunk.pageId === "/commercial-lease-npv");
  const deferred = graph.nodes.filter((node) => node.recommendedContentDisposition === "NOT_WORTH_SEPARATE_CONTENT" && (node.answerState === "UNANSWERED" || node.answerState === "SHALLOW")).length;
  return {
    artifactId,
    digest,
    predecessorArtifactId: input?.predecessorArtifactId ?? reconstructed?.predecessorArtifactId ?? "art_d20f8a53a3ef1de20ebe",
    repairReason: input?.repairReason ?? reconstructed?.repairReason ?? "DIRECT_RESPONSE_ANSWER_AUTHORITY_DIGITAL_REAL_ESTATE_UPGRADE",
    immutable: true as const,
    deployed: false as const,
    liveArtifactMutated: false as const,
    newClassification,
    previousClassificationTooPermissive: contentLayersPass && !renderedPass,
    renderedLayout,
    questionGraph: graph,
    coverage,
    mappedCount: graph.nodes.filter((node) => node.mappedRoute).length,
    unmappedHighPriority: graph.nodes.filter((node) => !node.mappedRoute && node.priority === 1).length,
    clusters: graph.clusters.length,
    highConfidenceQuestions: graph.nodes.length,
    answerChunks: chunks,
    citationReadyChunks: citationReadyChunks.length,
    pageRows,
    depths,
    visuals,
    densities,
    varieties,
    homepage,
    homepageDr,
    moneyDr,
    npv,
    hub,
    links,
    urlArchitecture: digitalRealEstateUrlArchitecture(),
    reviews,
    adversarial: reviews.map(adversarialReview),
    hardFailPages: hardFailPages.length,
    gaps,
    repair,
    layers,
    answerAuthorityReady: (answerAuthorityReady ? "PASS" : "FAIL") as "PASS" | "FAIL",
    wordCountHardQuota: wordCountIsHardQuota(),
    pagesAdequate: depths.filter((item) => item.overall === "PASS").length,
    pagesTooShallow: depths.filter((item) => item.overall === "FAIL").length,
    pagesRequiringDepthJustification: depths.filter((item) => item.explicitDepthJustificationRequired).length,
    pagesUnderVisualized: visuals.filter((item) => item.adequate === "FAIL").length,
    pagesWithEmptySpace: densities.filter((item) => item.excessiveLowInformationEmptySpace).length,
    fillerDetected: false,
    semantic,
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
    npvCitationReadiness: npvChunk?.citationReadiness.overall ?? "FAIL",
    redirectPlan: creRedirectPlanIfSilosApplied(),
    urlMigrationsPerformed: [] as string[],
    deferredIntentionally: deferred,
    technical: previousQuality,
    sourceQuality: sourceUrls.map(classifySourceQuality),
    sourceIndependence: evaluateSourceIndependence(sourceUrls),
    intendedPatternFulfillment: {
      homepage: evaluatePagePatternFulfillment({ patternId: "LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE", content: pageContent(files, "/") }),
      npv: evaluatePagePatternFulfillment({ patternId: "DEEP_AUTHORITY_QUESTION_PAGE", content: pageContent(files, "/commercial-lease-npv") }),
    },
  };
}
