import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreFounderVisualQcSuccessor } from "@/lib/infinity/venture-website-architecture/cre-founder-visual-qc-successor";
import {
  evaluateHeroContentSeparation,
  FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE,
  FOUNDER_LEARN_NEXT_NAV_FIXTURE,
  GOOD_SEMANTIC_NAV_RENDERED_FIXTURE,
  evaluateSemanticNavigationRenderedQuality,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/hero-content-separation";
import { evaluateRenderedRouteClassCoverage } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-route-class-coverage";
import { evaluateSemanticNavigationQuality } from "@/lib/infinity/venture-website-architecture/public-authority-standard/semantic-navigation-quality";
import { CANONICAL_PUBLIC_FOOTER_ATTRIBUTION } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import { AUTHORITY_FINAL_POLISH_CSS } from "@/lib/infinity/venture-website-architecture/authority-final-polish-css";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  activateFounderVisualQcSuccessorPublicArtifact,
  founderVisualQcSuccessorActivationMutationsConsumed,
  getCanonicalActivePublicValidationState,
  isFounderVisualQcSuccessorPublicActive,
} from "../active-public-artifact";
import { FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES, authorityExpansionRouteManifest } from "../cre-authority-expansion-routes";
import { GOVERNED_CRE_FOUNDER_VISUAL_QC_DEPLOYMENT_V1 } from "../cre-founder-visual-qc-successor-deploy";
import { FOUNDER_VISUAL_QC_FOUNDER_AUTHORIZATION_ID } from "../cre-founder-visual-qc-authorization";
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

describe("GOVERNED CRE FOUNDER VISUAL QC DEPLOYMENT V1", () => {
  it("locks exact frozen successor identity, digest, 57 routes, and founder QC repairs", async () => {
    const successor = await reconstructCreFounderVisualQcSuccessor();
    const how = pageContent(successor.files, "/how-it-works");
    expect(successor.artifactId).toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).toBe("art_89ea8156769a0286a700");
    expect(successor.digest).toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("0ac50a86b86140f197de6fff90477944de22eba6fa89496fcadf070210b3a7ec");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(authorityExpansionRouteManifest().intendedCount).toBe(57);
    expect(successor.routes).toBe(57);
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(how).toContain("pv-hero-photo--article");
    expect(how).toContain("improvement");
    expect(how).toContain("ranked");
    expect(how).toContain("adding");
    expect(how).toContain("number");
    expect(how).not.toMatch(/LEARN NEXT[\s\S]{0,160}Learn /);
    expect(CANONICAL_PUBLIC_FOOTER_ATTRIBUTION).toBe("An Infinity OS Venture");
    expect(successor.hero.overall).toBe("PASS");
    expect(successor.navigation.rendered.overall).toBe("PASS");
    expect(successor.routeCoverage.overall).toBe("PASS");
    expect(FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES).toContain("/how-it-works");
    expect(
      evaluateRenderedRouteClassCoverage({
        sampledRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
        requiredRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
      }).missingClasses,
    ).toEqual([]);
  }, 180000);

  it("keeps founder regression fixtures and presence-only vs rendered distinction", () => {
    expect(evaluateHeroContentSeparation(FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE).overall).toBe("FAIL");
    const presence = evaluateSemanticNavigationQuality({
      blocks: [
        {
          variant: "LEARN_NEXT",
          title: "Learn the ideas behind the steps",
          pageRoute: "/how-it-works",
          pageArchetype: "HOW_TO",
          cards: [
            { title: "Compare two leases", description: "Use one method on both offers.", href: "/compare-commercial-leases/", icon: "compare", relationship: "related" },
            { title: "What is NPV", description: "NPV turns later costs into today's dollars.", href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", icon: "question", relationship: "related" },
            { title: "Discount rate", description: "The discount rate is the price of waiting.", href: "/commercial-lease-npv/what-discount-rate-should-you-use/", icon: "question", relationship: "related" },
          ],
        },
      ],
      pageArchetype: "HOW_TO",
    });
    expect(presence.overall).toBe("PASS");
    expect(
      evaluateSemanticNavigationRenderedQuality({
        ...FOUNDER_LEARN_NEXT_NAV_FIXTURE,
        css: `${AUTHORITY_FINAL_POLISH_CSS}\n${FOUNDER_LEARN_NEXT_NAV_FIXTURE.css}`,
      }).overall,
    ).toBe("FAIL");
    expect(evaluateSemanticNavigationRenderedQuality(GOOD_SEMANTIC_NAV_RENDERED_FIXTURE).overall).toBe("PASS");
  });

  it("records exactly one deployment and one activation with polish predecessor lineage", () => {
    expect(DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID).toMatch(/^dpl_/);
    expect(DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_URL).toMatch(/^https:\/\/infinity-validation-cre-lease-npv-e72beb7b-/);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
    );
    expect(isFounderVisualQcSuccessorPublicActive()).toBe(false);
    expect(founderVisualQcSuccessorActivationMutationsConsumed()).toBe(1);
    expect(DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_5cFWWuPZYkJcUfmwSqGCMG8zS8hY");
    expect(GOVERNED_CRE_FOUNDER_VISUAL_QC_DEPLOYMENT_V1).toBe("GOVERNED_CRE_FOUNDER_VISUAL_QC_DEPLOYMENT_V1");
    expect(GOVERNED_CRE_FOUNDER_VISUAL_QC_DEPLOYMENT_V1).not.toMatch(/WAVE_2|OUTREACH|COLD/);
    expect(FOUNDER_VISUAL_QC_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH/);
    expect(() =>
      activateFounderVisualQcSuccessorPublicArtifact({
        artifactId: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
        digest: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
        deploymentId: DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID,
        url: DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_URL,
      }),
    ).toThrow(/activation_authorization_already_consumed/);
    expect(founderVisualQcSuccessorActivationMutationsConsumed()).toBe(1);
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
  });
});
