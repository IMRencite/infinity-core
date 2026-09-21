import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreAuthorityWidthSuccessor } from "@/lib/infinity/venture-website-architecture/cre-authority-width-successor";
import {
  evaluateAuthoritySectionWidth,
  evaluateBalancedCardGrid,
  evaluateSemanticNavigationBreakoutLayout,
  FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE,
  FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE,
  FOUNDER_NARROW_CARD_WRAP_FIXTURE,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/authority-content-width";
import { CANONICAL_PUBLIC_FOOTER_ATTRIBUTION } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_URL,
  DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import {
  activateAuthorityWidthSuccessorPublicArtifact,
  authorityWidthSuccessorActivationMutationsConsumed,
  getCanonicalActivePublicValidationState,
  isAuthorityWidthSuccessorPublicActive,
  isFounderVisualQcSuccessorPublicActive,
} from "../active-public-artifact";
import { AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES, authorityExpansionRouteManifest } from "../cre-authority-expansion-routes";
import { GOVERNED_CRE_AUTHORITY_WIDTH_AND_NAV_DEPLOYMENT_V1 } from "../cre-authority-width-successor-deploy";
import { AUTHORITY_WIDTH_FOUNDER_AUTHORIZATION_ID } from "../cre-authority-width-authorization";
import { isCreValidationArtifactId } from "../current-cre-artifact";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    mode: string;
    lastInboundProcessed: string | null;
  };
}

describe("GOVERNED CRE AUTHORITY WIDTH AND NAV DEPLOYMENT V1", () => {
  it("locks exact frozen successor identity, digest, 57 routes, and width gates", async () => {
    const successor = await reconstructCreAuthorityWidthSuccessor();
    expect(successor.artifactId).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).toBe("art_b0b778956b7d29327dab");
    expect(successor.digest).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("15c8dd5bd24e7af20eb694edde9e3c45a5d414847310fa680ab2072543a030db");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(authorityExpansionRouteManifest().intendedCount).toBe(57);
    expect(successor.routes).toBe(57);
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.width.overall).toBe("PASS");
    expect(successor.navigation.breakout.overall).toBe("PASS");
    expect(successor.navigation.grid.overall).toBe("PASS");
    expect(successor.sources.overall).toBe("PASS");
    expect(successor.shell.overall).toBe("PASS");
    expect(successor.hero.overall).toBe("PASS");
    expect(CANONICAL_PUBLIC_FOOTER_ATTRIBUTION).toBe("An Infinity OS Venture");
    expect(AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES).toContain("/lease-sensitivity-analysis");
    expect(AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES).toContain("/how-it-works");
    expect(evaluateAuthoritySectionWidth(FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE).overall).toBe("FAIL");
    expect(evaluateBalancedCardGrid(FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE).overall).toBe("FAIL");
    expect(evaluateSemanticNavigationBreakoutLayout(FOUNDER_NARROW_CARD_WRAP_FIXTURE).overall).toBe("FAIL");
  }, 180000);

  it("records exactly one deployment and one activation with QC predecessor lineage", () => {
    expect(DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_2qx97rjBqkHMnFEiwyRWM9EA4ohe");
    expect(DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-nnkal6y65.vercel.app",
    );
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
    );
    expect(isAuthorityWidthSuccessorPublicActive()).toBe(false);
    expect(isFounderVisualQcSuccessorPublicActive()).toBe(false);
    expect(authorityWidthSuccessorActivationMutationsConsumed()).toBe(1);
    expect(DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_A8G5ewhPBnefUySdwWUdnnvzGWN5");
    expect(GOVERNED_CRE_AUTHORITY_WIDTH_AND_NAV_DEPLOYMENT_V1).toBe(
      "GOVERNED_CRE_AUTHORITY_WIDTH_AND_NAV_DEPLOYMENT_V1",
    );
    expect(GOVERNED_CRE_AUTHORITY_WIDTH_AND_NAV_DEPLOYMENT_V1).not.toMatch(/WAVE_2|OUTREACH|COLD/);
    expect(AUTHORITY_WIDTH_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH/);
    expect(() =>
      activateAuthorityWidthSuccessorPublicArtifact({
        artifactId: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
        digest: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
        deploymentId: DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID,
        url: DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_URL,
      }),
    ).toThrow(/activation_authorization_already_consumed/);
    expect(authorityWidthSuccessorActivationMutationsConsumed()).toBe(1);
  });

  it("preserves experiment clock, observer, no Wave 2, and PUBLICLY_LAUNCHED = NO", () => {
    const clock = inspectExperimentClock();
    const evidence = inspectRealMarketEvidence();
    const observer = observerState();
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(clock.restarted).toBe(false);
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(observer.status).toBe("RUNNING");
    expect(observer.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observer.trackedConversationIds).toEqual(["cnv_ff749bc4cff5d045", "cnv_c0e5bd3a282977c0"]);
    expect(observer.lastInboundProcessed).toBe(null);
  });
});
