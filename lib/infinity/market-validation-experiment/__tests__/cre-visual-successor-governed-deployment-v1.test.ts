import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreVisualQualityRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-visual-quality-successor";
import { seoGeoPageRouteManifest, SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import { evaluateHumanReadabilityGate } from "@/lib/infinity/venture-website-architecture/human-readability-gate";
import {
  clarifyAuthorityTableCounts,
  evaluateAuthorityVisualAssetCoverage,
  evaluateCtaVisualHierarchy,
  evaluateLongFormTextWall,
  evaluateRelatedContentDesign,
  evaluateRenderedCompositionQuality,
  evaluateRenderedTableQuality,
  evaluateSourceReferenceDesign,
  evaluateVisibleFooterGutter,
  evaluateVisualDeadSpace,
  founderRegressionScenarios,
  proveFounderFalsePositive,
} from "@/lib/infinity/venture-website-architecture/visual-quality-gates";
import { VISUAL_ASSET_PLANS } from "@/lib/infinity/venture-website-architecture/visual-quality-assets";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL,
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL,
  DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  getCanonicalActivePublicValidationState,
  isVisualPolishSuccessorPublicActive,
  isVisualQualitySuccessorPublicActive,
  isVisualHomepageFoldSuccessorPublicActive,
  isVisualTableDesignSuccessorPublicActive,
  polishSuccessorActivationMutationsConsumed,
  tableDesignSuccessorActivationMutationsConsumed,
  visualSuccessorActivationMutationsConsumed,
} from "../active-public-artifact";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import {
  VISUAL_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  evaluateVisualSuccessorFounderAuthorization,
  priorVisualSuccessorDeploymentAuthorizationsAreNotReusable,
  visualSuccessorFounderScope,
} from "../cre-visual-successor-authorization";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { CRE_VISUAL_SUCCESSOR_GOVERNED_DEPLOYMENT_V1 } from "../cre-visual-successor-deploy";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    mode: string;
    lastInboundProcessed: string | null;
  };
}

describe("CRE visual successor governed deployment v1 freeze", () => {
  it("locks exact successor identity, digest parity, and a new single-use authorization", async () => {
    const clockBefore = inspectExperimentClock();
    const evidenceBefore = inspectRealMarketEvidence();
    const observerBefore = observerState();
    const successor = await reconstructCreVisualQualityRepairSuccessor();
    expect(successor.artifactId).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("3c9851a01a0eafb53a61d95c3ac4b9c6e09c8552e42ca65658a7ef37ba0a40f7");
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID);
    expect(seoGeoPageRouteManifest().pageRoutes).toHaveLength(33);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    const founder = evaluateVisualSuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(VISUAL_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
    const scope = visualSuccessorFounderScope();
    expect(scope.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(scope.artifactId).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(priorVisualSuccessorDeploymentAuthorizationsAreNotReusable().reusedPriorId).toBe(false);
    expect(priorVisualSuccessorDeploymentAuthorizationsAreNotReusable().priorIds).toContain(
      "founder_ceiling_cre_seo_geo_authority_surface_staging_v1",
    );
    expect(DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_9ZHwftxcxH3K6dVM6oYREb4vqrJj");
    expect(CRE_VISUAL_SUCCESSOR_GOVERNED_DEPLOYMENT_V1).toBe("CRE_VISUAL_SUCCESSOR_GOVERNED_DEPLOYMENT_V1");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
  }, 180000);

  it("readbacks persisted visual QC and reproduces the prior false positive", async () => {
    const successor = await reconstructCreVisualQualityRepairSuccessor();
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const sample = pageContent(successor.files, SEO_GEO_QUESTION_PAGES[0].route);
    const home = pageContent(successor.files, "/");
    expect(evaluateVisibleFooterGutter(css).desktopMarginPx).toBe(32);
    expect(evaluateVisibleFooterGutter(css).mobileMarginPx).toBe(20);
    expect(evaluateVisibleFooterGutter(css).backgroundTouchesViewport).toBe(false);
    expect(evaluateRenderedCompositionQuality({ html: sample, css }).overall).toBe("PASS");
    expect(evaluateRenderedTableQuality(sample).overall).toBe("PASS");
    expect(evaluateVisualDeadSpace(sample).overall).toBe("PASS");
    expect(evaluateLongFormTextWall(sample).overall).toBe("PASS");
    expect(evaluateAuthorityVisualAssetCoverage({ html: home, pageClass: "homepage" }).overall).toBe("PASS");
    expect(successor.visual.related).toBe("PASS");
    expect(successor.visual.sources).toBe("PASS");
    expect(successor.visual.cta).toBe("PASS");
    expect(evaluateRelatedContentDesign(`${sample}\n${successor.files.find((file) => file.path.includes("site-chrome"))?.content ?? ""}`)).toBe("PASS");
    expect(evaluateSourceReferenceDesign(sample)).toBe("PASS");
    expect(evaluateCtaVisualHierarchy(sample)).toBe("PASS");
    const proof = proveFounderFalsePositive();
    expect(proof.oldFooterPaddingPass).toBe(true);
    expect(proof.oldVisibleBackgroundFail).toBe(true);
    expect(founderRegressionScenarios()).toHaveLength(8);
    const counts = clarifyAuthorityTableCounts(sample);
    expect(counts.semanticTables).toBe(3);
    expect(counts.styledFinancialComponents).toBe(6);
    expect(counts.visibleTableInstances).toBe(3);
  }, 180000);

  it("verifies six real image assets and does not count CSS-only treatments", async () => {
    const successor = await reconstructCreVisualQualityRepairSuccessor();
    const media = successor.files.filter((file) => file.path.replace(/\\/g, "/").startsWith("public/media/"));
    expect(media).toHaveLength(6);
    expect(media.filter((file) => file.path.endsWith(".webp"))).toHaveLength(4);
    expect(media.filter((file) => file.path.endsWith(".svg"))).toHaveLength(2);
    expect(VISUAL_ASSET_PLANS).toHaveLength(4);
    expect(successor.visual.homepageImages).toBeGreaterThanOrEqual(1);
    expect(successor.visual.hubImages).toBe(7);
    expect(successor.visual.questionImages).toBe(10);
    expect(SEO_GEO_TOPIC_HUBS).toHaveLength(7);
    expect(SEO_GEO_QUESTION_PAGES).toHaveLength(10);
    const home = pageContent(successor.files, "/");
    expect(evaluateAuthorityVisualAssetCoverage({ html: home, pageClass: "homepage" }).cssOnlyCountedAsImages).toBe(false);
    expect(seoGeoPageRouteManifest().pageRoutes.some((route) => /admin|synthetic|\/api\//.test(route))).toBe(false);
  }, 180000);

  it("preserves 4th-grade readability and SEO/GEO on the frozen successor", async () => {
    const successor = await reconstructCreVisualQualityRepairSuccessor();
    for (const page of [...SEO_GEO_TOPIC_HUBS, ...SEO_GEO_QUESTION_PAGES]) {
      const content = pageContent(successor.files, page.route);
      expect(evaluateHumanReadabilityGate(content).overall, page.route).toBe("PASS");
      expect(content).toContain("PrimaryCTA");
      expect(content).toMatch(/investopedia|bls\.gov|naiop|boma|fasb/i);
    }
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      successor.artifactId,
    );
  }, 180000);

  it("records exactly one deployment and one activation with predecessor lineage", () => {
    expect(DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_8ZFTygu8ofyziGYNHkE7b6Uw6DTS");
    expect(DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-r8m6k8ne1.vercel.app",
    );
    expect(DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_FdPQ3xeVWvzmTRdiaj95vuG4GUxf");
    expect(DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-r51o3u2eo.vercel.app",
    );
    expect(DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_A5wSKzhESxDc9LsPn488DRfPyzNV");
    expect(DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-qkhlts7nc.vercel.app",
    );
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
    );
    expect(isVisualQualitySuccessorPublicActive()).toBe(false);
    expect(isVisualPolishSuccessorPublicActive()).toBe(false);
    expect(isVisualTableDesignSuccessorPublicActive()).toBe(false);
    expect(isVisualHomepageFoldSuccessorPublicActive()).toBe(false);
    expect(visualSuccessorActivationMutationsConsumed()).toBe(1);
    expect(polishSuccessorActivationMutationsConsumed()).toBe(1);
    expect(tableDesignSuccessorActivationMutationsConsumed()).toBe(1);
    expect(DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_9ZHwftxcxH3K6dVM6oYREb4vqrJj");
    expect(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID).toBe("art_ba6e91dc5e569f6c13a9");
    expect(CRE_VISUAL_SUCCESSOR_GOVERNED_DEPLOYMENT_V1).not.toMatch(/WAVE_2|OUTREACH/);
    expect(observerState().lastInboundProcessed ?? null).toBeNull();
  });
});
