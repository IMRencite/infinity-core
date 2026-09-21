import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreVisualPolishSuccessor } from "@/lib/infinity/venture-website-architecture/cre-visual-polish-successor";
import { reconstructCreVisualQualityRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-visual-quality-successor";
import { evaluateVisibleFooterGutter } from "@/lib/infinity/venture-website-architecture/visual-quality-gates";
import { seoGeoPageRouteManifest } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  isVisualPolishSuccessorPublicActive,
  polishSuccessorActivationMutationsConsumed,
} from "../active-public-artifact";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import {
  VISUAL_POLISH_FOUNDER_AUTHORIZATION_ID,
  evaluateVisualPolishFounderAuthorization,
  visualPolishFounderScope,
} from "../cre-visual-polish-authorization";
import { CRE_VISUAL_POLISH_GOVERNED_DEPLOYMENT_V1 } from "../cre-visual-polish-successor-deploy";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    mode: string;
    lastInboundProcessed: string | null;
  };
}

describe("CRE visual polish homepage footer and compact hero v1 freeze", () => {
  it("locks polish identity without mutating the visual-repair predecessor", async () => {
    const clockBefore = inspectExperimentClock();
    const evidenceBefore = inspectRealMarketEvidence();
    const observerBefore = observerState();
    const predecessor = await reconstructCreVisualQualityRepairSuccessor();
    const successor = await reconstructCreVisualPolishSuccessor();
    expect(predecessor.artifactId).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(predecessor.digest).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("fe647b3db9b57a8c8f216d7256e103b4b6e8bc960d90b2a4c9d9f86f0272e9a3");
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.routes).toBe(33);
    expect(seoGeoPageRouteManifest().pageRoutes).toHaveLength(33);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    const founder = evaluateVisualPolishFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(VISUAL_POLISH_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(visualPolishFounderScope().capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(CRE_VISUAL_POLISH_GOVERNED_DEPLOYMENT_V1).toBe("CRE_VISUAL_POLISH_GOVERNED_DEPLOYMENT_V1");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
  }, 180000);

  it("insets homepage sources/footer and compactifies the photo hero", async () => {
    const successor = await reconstructCreVisualPolishSuccessor();
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const home = pageContent(successor.files, "/");
    const footer = evaluateVisibleFooterGutter(css);
    expect(footer.desktopMarginPx).toBe(32);
    expect(footer.mobileMarginPx).toBe(20);
    expect(footer.backgroundTouchesViewport).toBe(false);
    expect(footer.overall).toBe("PASS");
    expect(css).toContain("pv-hero-photo--compact");
    expect(css).toContain(".pv-authority");
    expect(css).toMatch(/\.pv-authority[\s\S]*margin:\s*2rem 32px/);
    expect(home).toContain("pv-hero-photo--compact");
    expect(home).toMatch(/pv-hero[\s\S]*pv-hero-photo--compact|pv-hero-photo--compact/);
    expect(DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_FdPQ3xeVWvzmTRdiaj95vuG4GUxf");
    expect(DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-r51o3u2eo.vercel.app",
    );
    expect(DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_FdPQ3xeVWvzmTRdiaj95vuG4GUxf");
    expect(isVisualPolishSuccessorPublicActive()).toBe(false);
    expect(polishSuccessorActivationMutationsConsumed()).toBe(1);
  }, 180000);
});
