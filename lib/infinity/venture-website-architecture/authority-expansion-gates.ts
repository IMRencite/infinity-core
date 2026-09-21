import {
  ABOVE_FOLD_VISUAL_COVERAGE_GATE,
  ANSWER_SURFACE_COVERAGE_GATE,
  PREMIUM_AUTHORITY_VALIDATION_READY,
  SEARCH_INTENT_CONVERSION_PATH_GATE,
  SEMANTIC_INTERNAL_LINK_DENSITY_GATE,
  TOPIC_GRAPH_CONNECTIVITY_GATE,
  TOPICAL_COMPLETENESS_GATE,
} from "./constants";
import { evaluatePublicAuthorityPublishability, type PublicAuthorityPublishability } from "./public-authority-publishability-gate";
import { evaluateHumanReadabilityGate } from "./human-readability-gate";
import { evaluateHumanFirstPublicLanguageAcrossFiles } from "./human-first-public-language-gate";
import { evaluateRenderedTextContrastFromFiles } from "./public-authority-standard/rendered-text-contrast-gate";
import { evaluateAuthorityPageDepth } from "./answer-authority/depth-and-direct-response";
import { extractAnswerFirstBlocks, extractInternalHrefsInBody, pageContent } from "./answer-authority/page-inspect";
import { SEO_GEO_PRODUCT_ROUTES, SEO_GEO_TOPIC_HUBS, SEO_GEO_QUESTION_PAGES } from "./digital-real-estate-catalog";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { DEPTH_QUESTION_PAGES } from "./search-demand-depth-catalog";
import { TOPIC_IDS, topicCoverageReport, type TopicId } from "./search-validated-question-graph";
import type { Gate } from "./types";

export type ExpansionPublishability = PublicAuthorityPublishability & {
  aboveFoldVisualCoverage: Gate;
  semanticInternalLinkDensity: Gate;
  topicGraphConnectivity: Gate;
  answerSurfaceCoverage: Gate;
  searchIntentConversionPath: Gate;
  topicalCompleteness: Gate;
  graph: InternalLinkGraphReport;
  expansionDepth: Gate;
  expansionReadability: Gate;
  renderedTextContrast: Gate;
  humanFirstPublicLanguage: Gate;
};

export type InternalLinkGraphReport = {
  authorityNodes: number;
  contextualInternalEdges: number;
  hubToSpoke: number;
  spokeToHub: number;
  sameTopicLateral: number;
  crossTopic: number;
  commercialPath: number;
  orphans: number;
  deadEnds: number;
};

const COMMERCIAL = new Set(["/compare-commercial-leases", "/how-it-works", "/pricing", "/early-access", "/for/tenant-rep-brokers"]);

function fileHasRoute(files: Array<{ path: string; content?: string }> | undefined, route: string): boolean {
  if (!files) return false;
  const clean = route.replace(/\/+$/, "") || "/";
  const path = clean === "/" ? "app/page.tsx" : `app${clean}/page.tsx`;
  return files.some((file) => file.path.replace(/\\/g, "/") === path);
}

function depthRoutesPresent(files?: Array<{ path: string }>): typeof DEPTH_QUESTION_PAGES {
  return DEPTH_QUESTION_PAGES.filter((page) => fileHasRoute(files, page.route));
}

function allAuthorityRoutes(files?: Array<{ path: string }>): string[] {
  return [
    ...SEO_GEO_TOPIC_HUBS.map((hub) => hub.route),
    ...SEO_GEO_QUESTION_PAGES.map((page) => page.route),
    ...EXPANSION_QUESTION_PAGES.map((page) => page.route),
    ...depthRoutesPresent(files).map((page) => page.route),
  ];
}

function clean(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

function topicOf(route: string): string {
  return clean(route).split("/").filter(Boolean)[0] ?? "";
}

function hrefs(content: string): string[] {
  return extractInternalHrefsInBody(content).map((item) => clean(item));
}

function hasAboveFoldVisual(content: string): boolean {
  const header = content.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? content.slice(0, 3500);
  return /<img\b[^>]+src=/.test(header) && !/linear-gradient/.test(header) && !cssOnlyHero(header);
}

function cssOnlyHero(html: string): boolean {
  return !/<img\b/.test(html) && /linear-gradient|background-color/.test(html);
}

export function evaluateAboveFoldVisualCoverage(files: Array<{ path: string; content: string }>): {
  gate: typeof ABOVE_FOLD_VISUAL_COVERAGE_GATE;
  homepage: Gate;
  hubs: number;
  questions: { pass: number; total: number };
  commercial: { pass: number; total: number };
  cssOnlyCounted: false;
  overall: Gate;
} {
  const home = hasAboveFoldVisual(pageContent(files, "/")) ? "PASS" : "FAIL";
  const hubPass = SEO_GEO_TOPIC_HUBS.filter((hub) => hasAboveFoldVisual(pageContent(files, hub.route))).length;
  const questionRoutes = [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES, ...depthRoutesPresent(files)].map(
    (page) => page.route,
  );
  const questionPass = questionRoutes.filter((route) => hasAboveFoldVisual(pageContent(files, route))).length;
  const commercialRoutes = ["/pricing", "/for/tenant-rep-brokers", "/compare-commercial-leases", "/how-it-works"];
  const commercialPass = commercialRoutes.filter((route) => hasAboveFoldVisual(pageContent(files, route)) || /<img\b/.test(pageContent(files, route))).length;
  const overall =
    home === "PASS" && hubPass === 7 && questionPass === questionRoutes.length && commercialPass === commercialRoutes.length
      ? "PASS"
      : "FAIL";
  return {
    gate: ABOVE_FOLD_VISUAL_COVERAGE_GATE,
    homepage: home,
    hubs: hubPass,
    questions: { pass: questionPass, total: questionRoutes.length },
    commercial: { pass: commercialPass, total: commercialRoutes.length },
    cssOnlyCounted: false,
    overall,
  };
}

export function evaluateTopicGraphConnectivity(files: Array<{ path: string; content: string }>): {
  gate: typeof TOPIC_GRAPH_CONNECTIVITY_GATE;
  report: InternalLinkGraphReport;
  overall: Gate;
} {
  const routes = allAuthorityRoutes(files);
  const nodes = new Set(routes.map(clean));
  let hubToSpoke = 0;
  let spokeToHub = 0;
  let sameTopicLateral = 0;
  let crossTopic = 0;
  let commercialPath = 0;
  let contextual = 0;
  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  for (const route of routes) inbound.set(clean(route), 0);
  for (const route of routes) {
    const from = clean(route);
    const links = hrefs(pageContent(files, route));
    const unique = [...new Set(links.filter((item) => item !== from))];
    outbound.set(from, unique.filter((item) => nodes.has(item) || COMMERCIAL.has(item)).length);
    for (const to of unique) {
      if (nodes.has(to) || COMMERCIAL.has(to)) contextual += 1;
      if (nodes.has(to)) inbound.set(to, (inbound.get(to) ?? 0) + 1);
      const spokes = [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES, ...depthRoutesPresent(files)];
      if (
        SEO_GEO_TOPIC_HUBS.some((hub) => clean(hub.route) === from) &&
        spokes.some((page) => clean(page.route) === to && clean(page.hub) === from)
      ) {
        hubToSpoke += 1;
      }
      if (from.split("/").length > 2 && SEO_GEO_TOPIC_HUBS.some((hub) => clean(hub.route) === to)) spokeToHub += 1;
      if (nodes.has(to) && topicOf(from) === topicOf(to) && from !== to) sameTopicLateral += 1;
      if (nodes.has(to) && topicOf(from) !== topicOf(to)) crossTopic += 1;
      if (COMMERCIAL.has(to)) commercialPath += 1;
    }
  }
  const orphanNodes = [...nodes].filter((route) => (inbound.get(route) ?? 0) === 0 && !SEO_GEO_TOPIC_HUBS.some((hub) => clean(hub.route) === route)).length;
  const deadEnds = [...nodes].filter((route) => (outbound.get(route) ?? 0) === 0).length;
  const report: InternalLinkGraphReport = {
    authorityNodes: nodes.size,
    contextualInternalEdges: contextual,
    hubToSpoke,
    spokeToHub,
    sameTopicLateral,
    crossTopic,
    commercialPath,
    orphans: orphanNodes,
    deadEnds,
  };
  return {
    gate: TOPIC_GRAPH_CONNECTIVITY_GATE,
    report,
    overall: report.orphans === 0 && report.deadEnds === 0 && report.hubToSpoke >= 20 && report.spokeToHub >= 20 ? "PASS" : "FAIL",
  };
}

export function evaluateSemanticInternalLinkDensity(files: Array<{ path: string; content: string }>): {
  gate: typeof SEMANTIC_INTERNAL_LINK_DENSITY_GATE;
  bodyContext: Gate;
  stuffing: boolean;
  overall: Gate;
} {
  const pages = [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES, ...depthRoutesPresent(files)];
  let bodyOk = true;
  let stuffing = false;
  for (const page of pages) {
    const content = pageContent(files, page.route);
    const body = content
      .replace(/SiteBreadcrumb[\s\S]*?\/>/g, " ")
      .replace(/VentureFooter[\s\S]*?\/>/g, " ")
      .replace(/pv-related-editorial[\s\S]*?<\/div>/g, " ");
    const links = [...body.matchAll(/<a href="(\/[^"]+)"/g)].map((item) => item[1]);
    if (links.length < 4) bodyOk = false;
    const anchors = [...body.matchAll(/<a href="\/[^"]+">([^<]+)<\/a>/g)].map((item) => item[1].toLowerCase());
    const counts = new Map<string, number>();
    for (const anchor of anchors) counts.set(anchor, (counts.get(anchor) ?? 0) + 1);
    if ([...counts.values()].some((count) => count >= 8)) stuffing = true;
  }
  const overall = bodyOk && !stuffing ? "PASS" : "FAIL";
  return { gate: SEMANTIC_INTERNAL_LINK_DENSITY_GATE, bodyContext: bodyOk ? "PASS" : "FAIL", stuffing, overall };
}

export function evaluateAnswerSurfaceCoverage(files: Array<{ path: string; content: string }>): {
  gate: typeof ANSWER_SURFACE_COVERAGE_GATE;
  totalChunks: number;
  average: number;
  singleSurfacePages: number;
  overall: Gate;
} {
  const pages = [...SEO_GEO_TOPIC_HUBS, ...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES, ...depthRoutesPresent(files)];
  const counts = pages.map((page) => extractAnswerFirstBlocks(pageContent(files, page.route)).length);
  const total = counts.reduce((sum, item) => sum + item, 0);
  const single = counts.filter((item) => item < 2).length;
  return {
    gate: ANSWER_SURFACE_COVERAGE_GATE,
    totalChunks: total,
    average: pages.length ? Number((total / pages.length).toFixed(2)) : 0,
    singleSurfacePages: single,
    overall: single === 0 && total >= pages.length * 2 ? "PASS" : "FAIL",
  };
}

export function evaluateSearchIntentConversionPath(files: Array<{ path: string; content: string }>): {
  gate: typeof SEARCH_INTENT_CONVERSION_PATH_GATE;
  informational: Gate;
  commercial: Gate;
  transactional: Gate;
  misleading: number;
  overall: Gate;
} {
  const depthPresent = depthRoutesPresent(files);
  const informationalOk = [...EXPANSION_QUESTION_PAGES, ...depthPresent].filter((page) => page.searchIntent === "INFORMATIONAL").every((page) => {
    const content = pageContent(files, page.route);
    return /\/compare-commercial-leases|\/how-it-works|\/lease-comparison|\/commercial-lease-npv/.test(content);
  });
  const commercialOk = [...EXPANSION_QUESTION_PAGES, ...depthPresent].filter((page) => page.searchIntent === "COMMERCIAL_INVESTIGATION").every((page) => {
    const content = pageContent(files, page.route);
    return /\/how-it-works|\/pricing|\/for\/tenant-rep-brokers|\/compare-commercial-leases/.test(content);
  });
  const transactionalOk = [...EXPANSION_QUESTION_PAGES, ...SEO_GEO_QUESTION_PAGES, ...depthPresent].every((page) =>
    /early-access|Request Pilot Access/.test(pageContent(files, page.route)),
  );
  const blob = files.map((file) => file.content).join("\n");
  const misleading = (blob.match(/generally available product|customers already|buy now|add to cart/gi) ?? []).length;
  const overall = informationalOk && commercialOk && transactionalOk && misleading === 0 ? "PASS" : "FAIL";
  return {
    gate: SEARCH_INTENT_CONVERSION_PATH_GATE,
    informational: informationalOk ? "PASS" : "FAIL",
    commercial: commercialOk ? "PASS" : "FAIL",
    transactional: transactionalOk ? "PASS" : "FAIL",
    misleading,
    overall,
  };
}

const COMPLETENESS_NEEDLES: Record<TopicId, RegExp[]> = {
  "commercial-lease-npv": [/what is npv|npv means/i, /calculat/i, /discount rate/i, /cost/i, /wrong metric|limit/i, /explain/i],
  "lease-comparison": [/compare two|two commercial/i, /normalize/i, /gross|net/i, /free rent|ti /i, /belongs/i, /broker/i],
  "effective-rent": [/effective rent/i, /calculat/i, /face rent/i, /npv/i, /mistake/i, /square foot/i],
  "occupancy-costs": [/occupancy cost/i, /cam/i, /hidden/i, /square foot/i, /tax|insurance/i],
  "lease-sensitivity-analysis": [/sensitivity/i, /discount rate/i, /scenario|cfo/i, /why/i],
  "tenant-rep-analysis": [/explain/i, /loi/i, /memo/i, /renewal|reloc/i, /broker/i],
  "lease-financial-modeling": [/input/i, /cash.flow|cash flow/i, /mistake/i, /model/i],
};

export function evaluateTopicalCompleteness(files: Array<{ path: string; content: string }>): {
  gate: typeof TOPICAL_COMPLETENESS_GATE;
  byTopic: Record<TopicId, Gate>;
  coverage: ReturnType<typeof topicCoverageReport>;
  overall: Gate;
} {
  const coverage = topicCoverageReport();
  const blob = files.map((file) => file.content).join("\n");
  const byTopic = {} as Record<TopicId, Gate>;
  for (const topic of TOPIC_IDS) {
    const row = coverage.find((item) => item.topic === topic);
    const needles = COMPLETENESS_NEEDLES[topic].every((pattern) => pattern.test(blob));
    byTopic[topic] = row && row.meaningfulRelationships >= 20 && needles ? "PASS" : "FAIL";
  }
  const overall = TOPIC_IDS.every((topic) => byTopic[topic] === "PASS") ? "PASS" : "FAIL";
  return { gate: TOPICAL_COMPLETENESS_GATE, byTopic, coverage, overall };
}

export function evaluateExpandedPublicAuthorityPublishability(
  files: Array<{ path: string; content: string }>,
): ExpansionPublishability {
  const base = evaluatePublicAuthorityPublishability(files);
  const above = evaluateAboveFoldVisualCoverage(files);
  const graph = evaluateTopicGraphConnectivity(files);
  const density = evaluateSemanticInternalLinkDensity(files);
  const surfaces = evaluateAnswerSurfaceCoverage(files);
  const conversion = evaluateSearchIntentConversionPath(files);
  const topical = evaluateTopicalCompleteness(files);
  const expansionPages = EXPANSION_QUESTION_PAGES.map((page) => page.route);
  const depths = expansionPages.map((route) =>
    evaluateAuthorityPageDepth({
      route,
      role: "QUESTION_PAGE",
      content: pageContent(files, route),
      topicComplexity: "HIGH",
    }),
  );
  const reads = expansionPages.map((route) => evaluateHumanReadabilityGate(pageContent(files, route)));
  const expansionDepth = depths.every((row) => row.overall === "PASS" && row.approxWords >= 2000) ? "PASS" : "FAIL";
  const expansionReadability = reads.every((row) => row.overall === "PASS") ? "PASS" : "FAIL";
  const humanFirst = evaluateHumanFirstPublicLanguageAcrossFiles(files);
  const rendered = evaluateRenderedTextContrastFromFiles(files);
  const failures = [
    ...base.failures,
    above.overall === "FAIL" ? "ABOVE_FOLD" : "",
    graph.overall === "FAIL" ? "TOPIC_GRAPH" : "",
    density.overall === "FAIL" ? "LINK_DENSITY" : "",
    surfaces.overall === "FAIL" ? "ANSWER_SURFACES" : "",
    conversion.overall === "FAIL" ? "CONVERSION_PATH" : "",
    topical.overall === "FAIL" ? "TOPICAL" : "",
    expansionDepth === "FAIL" ? "EXPANSION_DEPTH" : "",
    expansionReadability === "FAIL" ? "EXPANSION_READABILITY" : "",
    humanFirst.overall === "FAIL" ? "HUMAN_FIRST" : "",
    rendered.overall === "FAIL" ? "RENDERED_TEXT_CONTRAST" : "",
  ].filter(Boolean);
  const overall = failures.length ? "FAIL" : "PASS";
  return {
    ...base,
    overall,
    ready: overall === "PASS" ? PREMIUM_AUTHORITY_VALIDATION_READY : "NOT_READY",
    failures,
    aboveFoldVisualCoverage: above.overall,
    semanticInternalLinkDensity: density.overall,
    topicGraphConnectivity: graph.overall,
    answerSurfaceCoverage: surfaces.overall,
    searchIntentConversionPath: conversion.overall,
    topicalCompleteness: topical.overall,
    graph: graph.report,
    expansionDepth,
    expansionReadability,
    renderedTextContrast: rendered.overall,
    humanFirstPublicLanguage: humanFirst.overall,
  };
}

void SEO_GEO_PRODUCT_ROUTES;
