import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import {
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { reconstructCreVisualQualityRepairSuccessor } from "../cre-visual-quality-successor";
import { reconstructCreSeoGeoDigitalRealEstateSuccessor } from "../cre-digital-real-estate-successor";
import { seoGeoPageRouteManifest, SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "../digital-real-estate-catalog";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import { pageContent } from "../answer-authority/page-inspect";
import { wordCountOf } from "../quality-gates";
import {
  evaluateAuthorityVisualAssetCoverage,
  evaluateLongFormTextWall,
  evaluateRenderedTableQuality,
  evaluateVisibleFooterGutter,
  evaluateVisualDeadSpace,
} from "../visual-quality-gates";
import { VISUAL_ASSET_PLANS } from "../visual-quality-assets";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    cadenceMs: number;
    mode: string;
  };
}

describe("CRE founder visual quality repair successor", () => {
  let successor: Awaited<ReturnType<typeof reconstructCreVisualQualityRepairSuccessor>>;

  beforeAll(async () => {
    successor = await reconstructCreVisualQualityRepairSuccessor();
  }, 180000);

  it("does not mutate the locked SEO/GEO predecessor identity", async () => {
    const locked = await reconstructCreSeoGeoDigitalRealEstateSuccessor();
    expect(locked.artifactId).toBe(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID);
    expect(locked.digest).toBe("92fd5d2db09ae15acec22e9f9a9f3353b756b5ee85cc0dcba845a69442f9927d");
    expect(locked.liveArtifactMutated).toBe(false);
  }, 180000);

  it("builds a new successor artifact with a new contract and digest", async () => {
    expect(successor.artifactId).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).not.toBe(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorArtifactId).toBe("art_ba6e91dc5e569f6c13a9");
    expect(successor.digest).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).not.toBe("92fd5d2db09ae15acec22e9f9a9f3353b756b5ee85cc0dcba845a69442f9927d");
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(successor.routes).toBe(33);
    expect(seoGeoPageRouteManifest().pageRoutes).toHaveLength(33);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.secretScan).toBe("PASS");
  }, 180000);

  it("preserves topic-root URL architecture, hubs, and question pages", async () => {
    expect(SEO_GEO_TOPIC_HUBS).toHaveLength(7);
    expect(SEO_GEO_QUESTION_PAGES).toHaveLength(10);
    for (const page of SEO_GEO_QUESTION_PAGES) {
      expect(pageContent(successor.files, page.route)).toContain(page.hub);
      expect(wordCountOf(pageContent(successor.files, page.route))).toBeGreaterThanOrEqual(2000);
    }
    for (const hub of SEO_GEO_TOPIC_HUBS) {
      expect(wordCountOf(pageContent(successor.files, hub.route))).toBeGreaterThanOrEqual(2000);
    }
  }, 180000);

  it("preserves 4th-grade readability, CTAs, internal links, and authority sources", async () => {
    for (const page of [...SEO_GEO_TOPIC_HUBS, ...SEO_GEO_QUESTION_PAGES]) {
      const content = pageContent(successor.files, page.route);
      expect(evaluateHumanReadabilityGate(content).overall, page.route).toBe("PASS");
      expect(content).toContain("PrimaryCTA");
      expect(content).toMatch(/investopedia|bls\.gov|naiop|boma|fasb/i);
      expect(content).toMatch(/not generally available|validation \/ pilot/i);
    }
  }, 180000);

  it("adds real image assets and does not count CSS-only treatments as images", async () => {
    const media = successor.files.filter((file) => file.path.startsWith("public/media/"));
    expect(media.length).toBeGreaterThanOrEqual(6);
    expect(VISUAL_ASSET_PLANS.every((plan) => media.some((file) => file.path.endsWith(plan.id + ".webp")))).toBe(true);
    expect(successor.visual.homepageImages).toBeGreaterThanOrEqual(1);
    expect(successor.visual.hubImages).toBe(7);
    expect(successor.visual.questionImages).toBe(10);
    const home = pageContent(successor.files, "/");
    expect(evaluateAuthorityVisualAssetCoverage({ html: home, pageClass: "homepage" }).cssOnlyCountedAsImages).toBe(false);
  }, 180000);

  it("redesigns tables, kills oversized dark dead space, and breaks text walls", async () => {
    const sample = pageContent(successor.files, SEO_GEO_QUESTION_PAGES[0].route);
    expect(evaluateRenderedTableQuality(sample).overall).toBe("PASS");
    expect(evaluateVisualDeadSpace(sample).overall).toBe("PASS");
    expect(evaluateLongFormTextWall(sample).overall).toBe("PASS");
    expect(sample).toContain("pv-analysis-board");
    expect(sample).toContain("pv-related-editorial");
    expect(sample).toContain("Trusted sources");
    expect(sample).toContain("pv-cta-panel");
  }, 180000);

  it("insets the footer so the visible card cannot touch the viewport", async () => {
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const footer = evaluateVisibleFooterGutter(css);
    expect(footer.desktopMarginPx).toBeGreaterThanOrEqual(32);
    expect(footer.mobileMarginPx).toBeGreaterThanOrEqual(20);
    expect(footer.backgroundTouchesViewport).toBe(false);
  }, 180000);

  it("preserves the CRE experiment clock and Gmail observer checkpoint", async () => {
    const clockBefore = inspectExperimentClock();
    const evidenceBefore = inspectRealMarketEvidence();
    const observerBefore = observerState();
    expect(successor.artifactId).toBeTruthy();
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectExperimentClock().deadline).toBe(clockBefore.deadline);
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
    expect(observerAfter.cadenceMs).toBe(300000);
  }, 180000);
});
