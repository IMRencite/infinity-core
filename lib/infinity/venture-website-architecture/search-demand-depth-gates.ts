import type { Gate } from "./types";
import {
  HUB_QUESTION_DISCOVERY_COVERAGE_GATE,
  SEARCH_DEMAND_AUTHORITY_SURFACE_GATE,
  SEARCH_INTENT_CANNIBALIZATION_GATE,
} from "./constants";
import { TOPIC_IDS, uniqueCanonicalQuestions, type TopicId } from "./search-validated-question-graph";
import { DEPTH_QUESTION_PAGES } from "./search-demand-depth-catalog";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import { previousStandaloneCount, currentStandaloneRoutesForTopic } from "./search-demand-depth-research";
import { pageContent } from "./answer-authority/page-inspect";
import { evaluateHubQuestionBoardLayout } from "./public-authority-standard/hub-discovery-rendered-quality";

function clean(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

function allStandalonePages() {
  return [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES, ...DEPTH_QUESTION_PAGES];
}

export function evaluateSearchDemandAuthoritySurface(files?: Array<{ path: string; content: string }>): {
  gate: typeof SEARCH_DEMAND_AUTHORITY_SURFACE_GATE;
  byTopic: Record<TopicId, { validated: number; standalone: number; chunkOnlyHighValue: number; targetMet: boolean }>;
  thinPages: number;
  overall: Gate;
} {
  const canonical = uniqueCanonicalQuestions();
  const byTopic = {} as Record<TopicId, { validated: number; standalone: number; chunkOnlyHighValue: number; targetMet: boolean }>;
  let buried = 0;
  for (const topic of TOPIC_IDS) {
    const rows = canonical.filter((row) => row.primaryTopic === topic);
    const standalone = currentStandaloneRoutesForTopic(topic);
    const qualifiedStillHubOnly = DEPTH_QUESTION_PAGES.filter((page) => {
      if (page.topic !== topic) return false;
      if (!files) return false;
      const html = pageContent(files, page.route);
      return html.length === 0 || !/pv-display|<h1/.test(html);
    }).length;
    buried += qualifiedStillHubOnly;
    byTopic[topic] = {
      validated: rows.length,
      standalone: standalone.length,
      chunkOnlyHighValue: rows.filter((row) => row.decision === "ADD_ANSWER_CHUNK" && row.commercialRelevance === "HIGH").length,
      targetMet: standalone.length >= 10,
    };
    void previousStandaloneCount;
  }
  const thinPages = DEPTH_QUESTION_PAGES.filter((page) => page.description.split(/\s+/).length < 8).length;
  const overall = TOPIC_IDS.every((topic) => byTopic[topic].standalone >= 10) && buried === 0 && thinPages === 0 ? "PASS" : "FAIL";
  return { gate: SEARCH_DEMAND_AUTHORITY_SURFACE_GATE, byTopic, thinPages, overall };
}

export function evaluateHubQuestionDiscoveryCoverage(files: Array<{ path: string; content: string }>): {
  gate: typeof HUB_QUESTION_DISCOVERY_COVERAGE_GATE;
  visibleByTopic: Record<TopicId, number>;
  overall: Gate;
} {
  const visibleByTopic = {} as Record<TopicId, number>;
  let fail = false;
  const css = files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  for (const hub of SEO_GEO_TOPIC_HUBS) {
    const topic = hub.cluster as TopicId;
    const owned = allStandalonePages().filter((page) => clean(page.hub) === clean(hub.route));
    const html = pageContent(files, hub.route);
    const visible = owned.filter((page) => html.includes(page.route) || html.includes(`${page.route}/`)).length;
    visibleByTopic[topic] = visible;
    const grouped = /data-hub-question-discovery/.test(html);
    if (owned.length >= 10 && (visible < Math.min(10, owned.length) || !grouped)) fail = true;
    if (owned.length >= 10 && visible <= 5) fail = true;
    const layoutContracted = /--pv-discovery-layout/.test(css) || /pv-discovery-grid--balanced/.test(html);
    if (grouped && layoutContracted && evaluateHubQuestionBoardLayout({ html, css }).overall === "FAIL") fail = true;
  }
  return {
    gate: HUB_QUESTION_DISCOVERY_COVERAGE_GATE,
    visibleByTopic,
    overall: fail ? "FAIL" : "PASS",
  };
}

export function evaluateSearchIntentCannibalization(files: Array<{ path: string; content: string }>): {
  gate: typeof SEARCH_INTENT_CANNIBALIZATION_GATE;
  cannibalizingPages: number;
  overall: Gate;
} {
  const pages = allStandalonePages();
  const titles = pages.map((page) => page.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const uniqueTitles = new Set(titles);
  let cannibalizingPages = titles.length - uniqueTitles.size;
  const h1s = pages.map((page) => {
    const html = pageContent(files, page.route);
    return (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? page.title).toLowerCase().replace(/<[^>]+>/g, "").trim();
  });
  if (new Set(h1s).size !== h1s.length) cannibalizingPages += 1;
  const clusters = DEPTH_QUESTION_PAGES.map((page) => page.clusterId);
  if (new Set(clusters).size !== clusters.length) cannibalizingPages += 1;
  return {
    gate: SEARCH_INTENT_CANNIBALIZATION_GATE,
    cannibalizingPages,
    overall: cannibalizingPages === 0 ? "PASS" : "FAIL",
  };
}
