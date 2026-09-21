import { PUBLIC_AUTHORITY_PUBLISHABILITY_GATE, PREMIUM_AUTHORITY_VALIDATION_READY } from "./constants";
import { evaluateAuthorityPageDepth } from "./answer-authority/depth-and-direct-response";
import { evaluateCitationReadiness, extractAnswerChunks } from "./answer-authority/citation-and-sources";
import { extractAnswerFirstBlocks } from "./answer-authority/page-inspect";
import { evaluateSectionVariety, evaluateSemanticCoverage, keywordStuffingDetected } from "./answer-authority/visual-and-semantic";
import { evaluateHumanReadabilityGate } from "./human-readability-gate";
import { evaluateHumanFirstPublicLanguageAcrossFiles } from "./human-first-public-language-gate";
import { evaluateRenderedTextContrastFromFiles } from "./public-authority-standard/rendered-text-contrast-gate";
import { allSeoGeoPlannedPages, SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS, seoGeoTopicRootUrlArchitecture } from "./digital-real-estate-catalog";
import { pageContent } from "./answer-authority/page-inspect";
import type { Gate } from "./types";

export type PublicAuthorityPublishability = {
  model: typeof PUBLIC_AUTHORITY_PUBLISHABILITY_GATE;
  overall: "PASS" | "FAIL";
  ready: typeof PREMIUM_AUTHORITY_VALIDATION_READY | "NOT_READY";
  semanticQuestionCoverage: Gate;
  depth: Gate;
  humanReadability: Gate;
  directAnswerQuality: Gate;
  citationReadiness: Gate;
  internalLinkGraph: Gate;
  authorityReferences: Gate;
  metadata: Gate;
  schema: Gate;
  ctaRelevance: Gate;
  sectionVariety: Gate;
  visualUsefulness: Gate;
  truthfulClaims: Gate;
  failures: string[];
};

function fileFor(files: Array<{ path: string; content: string }>, route: string) {
  return pageContent(files, route);
}

export function evaluatePublicAuthorityPublishability(files: Array<{ path: string; content: string }>): PublicAuthorityPublishability {
  const pages = allSeoGeoPlannedPages();
  const failures: string[] = [];
  const depths = pages.map((page) =>
    evaluateAuthorityPageDepth({
      route: page.route,
      role: page.role,
      content: fileFor(files, page.route),
      topicComplexity: "HIGH",
    }),
  );
  const readability = pages.map((page) => evaluateHumanReadabilityGate(fileFor(files, page.route)));
  const chunks = pages.flatMap((page) =>
    extractAnswerChunks({
      route: page.route,
      content: fileFor(files, page.route),
      questions: [],
      sourceRefs: ["https://www.investopedia.com/terms/n/npv.asp"],
    }),
  );
  const citation = pages
    .flatMap((page) => extractAnswerFirstBlocks(fileFor(files, page.route)))
    .map((block) =>
      evaluateCitationReadiness({
        question: block.question,
        answer: block.answer,
        entityRefs: ["npv", "commercial_lease"],
        sourceRefs: ["https://www.investopedia.com/terms/n/npv.asp", "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm"],
      }),
    );
  const citationOk = citation.length >= pages.length && citation.every((row) => row.overall === "PASS");
  const titles = pages.map((page) => page.title);
  const descriptions = pages.map((page) => page.metaDescription);
  const uniqueTitles = new Set(titles).size === titles.length;
  const uniqueDesc = new Set(descriptions).size === descriptions.length;
  const urls = seoGeoTopicRootUrlArchitecture();
  const patternOk = urls.questionPages.every((route) => /^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(route));
  const hubLinks = SEO_GEO_TOPIC_HUBS.every((hub) => {
    const content = fileFor(files, hub.route);
    return SEO_GEO_QUESTION_PAGES.filter((page) => page.hub === hub.route).every((page) => content.includes(page.route));
  });
  const spokeLinks = SEO_GEO_QUESTION_PAGES.every((page) => fileFor(files, page.route).includes(page.hub));
  const ctaOk = pages.every((page) => /PrimaryCTA/.test(fileFor(files, page.route)));
  const claims = pages.every((page) => {
    const content = fileFor(files, page.route);
    return /not generally available|validation \/ pilot|Payment is not collected/i.test(content) && !/market leader|customers already|generally available product/i.test(content);
  });
  const variety = pages.every((page) => evaluateSectionVariety({ route: page.route, content: fileFor(files, page.route) }).overall === "PASS");
  const semantic = evaluateSemanticCoverage({
    route: pages[0]?.route ?? "/commercial-lease-npv",
    role: "EDUCATIONAL_HUB",
    content: pages.map((page) => fileFor(files, page.route)).join("\n"),
    primaryTopic: "commercial lease NPV",
    searchIntent: "what is NPV in a commercial lease",
    entityTarget: "npv",
  });
  const stuffing = pages.some((page) => keywordStuffingDetected(fileFor(files, page.route)));
  const depthOk = depths.every((row) => row.overall === "PASS" && row.approxWords >= (row.role === "EDUCATIONAL_HUB" || row.role === "QUESTION_PAGE" ? 2000 : 800));
  const readOk = readability.every((row) => row.overall === "PASS");
  if (!patternOk) failures.push("URL_PATTERN");
  if (!depthOk) failures.push("DEPTH");
  if (!readOk) failures.push("READABILITY");
  if (chunks.length < pages.length) failures.push("ANSWER_CHUNKS");
  if (!citationOk) failures.push("CITATION");
  if (!hubLinks || !spokeLinks) failures.push("INTERNAL_LINKS");
  if (!uniqueTitles || !uniqueDesc) failures.push("METADATA");
  if (!ctaOk) failures.push("CTA");
  if (!variety) failures.push("VARIETY");
  if (!claims) failures.push("CLAIMS");
  if (stuffing) failures.push("STUFFING");
  if (semantic.overall === "FAIL") failures.push("SEMANTIC");
  const humanFirst = evaluateHumanFirstPublicLanguageAcrossFiles(files);
  const renderedContrast = evaluateRenderedTextContrastFromFiles(files);
  if (humanFirst.overall === "FAIL") failures.push("HUMAN_FIRST");
  if (renderedContrast.overall === "FAIL") failures.push("RENDERED_TEXT_CONTRAST");
  const overall = failures.length ? "FAIL" : "PASS";
  return {
    model: PUBLIC_AUTHORITY_PUBLISHABILITY_GATE,
    overall,
    ready: overall === "PASS" ? PREMIUM_AUTHORITY_VALIDATION_READY : "NOT_READY",
    semanticQuestionCoverage: semantic.overall,
    depth: depthOk ? "PASS" : "FAIL",
    humanReadability: readOk ? "PASS" : "FAIL",
    directAnswerQuality: chunks.length >= pages.length ? "PASS" : "FAIL",
    citationReadiness: citationOk ? "PASS" : "FAIL",
    internalLinkGraph: hubLinks && spokeLinks ? "PASS" : "FAIL",
    authorityReferences: /investopedia|bls\.gov|naiop|boma|fasb/.test(pages.map((page) => fileFor(files, page.route)).join("\n"))
      ? "PASS"
      : "FAIL",
    metadata: uniqueTitles && uniqueDesc ? "PASS" : "FAIL",
    schema: pages.every((page) => page.schemaTypes.includes("BreadcrumbList")) ? "PASS" : "FAIL",
    ctaRelevance: ctaOk ? "PASS" : "FAIL",
    sectionVariety: variety ? "PASS" : "FAIL",
    visualUsefulness: pages.every((page) => /data-visualization/.test(fileFor(files, page.route))) ? "PASS" : "FAIL",
    truthfulClaims: claims ? "PASS" : "FAIL",
    failures,
  };
}
