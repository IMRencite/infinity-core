import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { wordCountOf } from "../quality-gates";
import { reconstructCreSeoGeoDigitalRealEstateSuccessor } from "../cre-digital-real-estate-successor";
import { allSeoGeoPlannedPages, SEO_GEO_MERGED_QUESTIONS, SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS, seoGeoTopicRootUrlArchitecture } from "../digital-real-estate-catalog";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import { evaluatePublicAuthorityPublishability } from "../public-authority-publishability-gate";
import { buildCreQuestionKnowledgeGraph, applySeoGeoQuestionMapping, buildQuestionCoverageProfile, scoreQuestionAnswers } from "../answer-authority/question-system";
import { extractAnswerChunks } from "../answer-authority/citation-and-sources";
import { pageContent } from "../answer-authority/page-inspect";
import { evaluateAuthorityPageDepth } from "../answer-authority/depth-and-direct-response";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    cadenceMs: number;
  };
}

describe("CRE SEO/GEO digital real estate rebuild v1", () => {
  it("builds topic-rooted hubs and 2000-word question pages with gates", async () => {
    const clockBefore = inspectExperimentClock();
    const evidenceBefore = inspectRealMarketEvidence();
    const observerBefore = observerState();
    const successor = await reconstructCreSeoGeoDigitalRealEstateSuccessor();
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(successor.secretScan).toBe("PASS");
    const urls = seoGeoTopicRootUrlArchitecture();
    expect(urls.pattern).toBe("/{topic}/{question-slug}/");
    expect(SEO_GEO_TOPIC_HUBS).toHaveLength(7);
    expect(SEO_GEO_QUESTION_PAGES).toHaveLength(10);
    expect(urls.flatQuestionPages).toBe(0);
    for (const page of SEO_GEO_QUESTION_PAGES) {
      expect(page.route).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+$/);
      expect(allSeoGeoPlannedPages().find((item) => item.route === page.route)?.canonical).toMatch(/\/$/);
    }
    const thin: string[] = [];
    const deep = SEO_GEO_QUESTION_PAGES.filter((page) => {
      const words = wordCountOf(pageContent(successor.files, page.route));
      if (words < 2000) thin.push(`${page.route}:${words}`);
      return words >= 2000;
    });
    expect(thin).toEqual([]);
    expect(deep).toHaveLength(10);
    const hubThin = SEO_GEO_TOPIC_HUBS.filter((hub) => wordCountOf(pageContent(successor.files, hub.route)) < 2000);
    expect(hubThin.map((hub) => hub.route)).toEqual([]);
    expect(SEO_GEO_MERGED_QUESTIONS.length).toBeGreaterThan(8);
    for (const page of allSeoGeoPlannedPages()) {
      const content = pageContent(successor.files, page.route);
      const read = evaluateHumanReadabilityGate(content);
      expect(read.overall, `${page.route}:${read.failures.join(",")}`).toBe("PASS");
      expect(read.keywordStuffing).toBe(false);
      expect(content).toContain("AnswerFirst");
      expect(content).toContain("PrimaryCTA");
      expect(content).toMatch(/not generally available|validation \/ pilot/i);
      expect(evaluateAuthorityPageDepth({ route: page.route, role: page.role, content, topicComplexity: "HIGH" }).overall).toBe("PASS");
    }
    const chunks = allSeoGeoPlannedPages().flatMap((page) =>
      extractAnswerChunks({
        route: page.route,
        content: pageContent(successor.files, page.route),
        questions: [],
        sourceRefs: ["https://www.investopedia.com/terms/n/npv.asp"],
      }),
    );
    expect(chunks.length).toBeGreaterThanOrEqual(17);
    const graph = scoreQuestionAnswers(applySeoGeoQuestionMapping(buildCreQuestionKnowledgeGraph()), successor.files, {
      matchAnyAnswerFirst: true,
    });
    const coverage = buildQuestionCoverageProfile(graph);
    expect(coverage.knownRelevantQuestions).toBeGreaterThan(20);
    const pub = evaluatePublicAuthorityPublishability(successor.files);
    expect(pub.failures, pub.failures.join(",")).toEqual([]);
    expect(pub.overall).toBe("PASS");
    const sitemap = successor.files.find((file) => file.path === "app/sitemap.ts")?.content ?? "";
    expect(sitemap).toContain("/commercial-lease-npv/");
    expect(sitemap).not.toContain("/api/");
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain(".vg-legal-footer {\n  padding: 2.5rem 24px;");
    expect(css).toContain("footer[data-infinity-footer] { padding-left: 16px; padding-right: 16px; }");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
    expect(observerAfter.cadenceMs).toBe(300000);
  }, 180000);
});
