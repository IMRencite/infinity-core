import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreSearchDepthSuccessor } from "@/lib/infinity/venture-website-architecture/cre-search-depth-successor";
import {
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import { GOVERNED_CRE_TRUSTED_SOURCES_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1 } from "../cre-trusted-sources-contrast-repair-deploy";
import { TRUSTED_SOURCES_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID } from "../cre-trusted-sources-contrast-repair-authorization";
import { HARD_PUBLISHABILITY_GATES } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import { evaluateHumanFirstPublicLanguageGate, HUMAN_FIRST_BAD_FIXTURES } from "@/lib/infinity/venture-website-architecture/human-first-public-language-gate";
import {
  evaluateRenderedTextContrastGate,
  FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { evaluateSectionSurfaceContrast } from "@/lib/infinity/venture-website-architecture/public-authority-standard/section-surface-system";
import { SEARCH_DEPTH_LIVE_SAMPLE_ROUTES } from "../cre-authority-expansion-routes";

describe("GOVERNED CRE TRUSTED SOURCES RENDERED CONTRAST REPAIR DEPLOYMENT V1", () => {
  it("locks the repaired immutable successor, CAM route, and fail-closed samples", async () => {
    const successor = await reconstructCreSearchDepthSuccessor();
    expect(successor.artifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.routes).toBe(93);
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedTextContrastGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HumanFirstPublicLanguageGate");
    expect(SEARCH_DEPTH_LIVE_SAMPLE_ROUTES).toContain("/commercial-lease-npv/should-cam-be-in-lease-npv");
    expect(GOVERNED_CRE_TRUSTED_SOURCES_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1).toBe(
      "GOVERNED_CRE_TRUSTED_SOURCES_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1",
    );
    expect(TRUSTED_SOURCES_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH/);
    expect(
      evaluateSectionSurfaceContrast({
        variants: ["EMPHASIS"],
        textOnEmphasisLight: true,
        cardsDistinctOnTinted: true,
        linksReadable: true,
      }).overall,
    ).toBe("PASS");
    expect(evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE).overall).toBe("PASS");
    for (const fixture of HUMAN_FIRST_BAD_FIXTURES) {
      expect(evaluateHumanFirstPublicLanguageGate(fixture).overall).toBe("FAIL");
    }
  }, 180000);

  it("records exactly one provider write and withholds activation after shell-width fail", () => {
    const deploy = JSON.parse(readFileSync(".infinity/trusted-sources-contrast-repair-deploy-result.json", "utf8")) as {
      deployments: number;
      activations: number;
      publiclyLaunched: boolean;
      latestCompleted: string;
      deploymentId: string;
      publicUrl: string;
      providerFinalState: string;
      activated: boolean;
      live: { visualPassed: boolean; renderedTextContrast: string; trustedSources: string };
    };
    expect(deploy.publiclyLaunched).toBe(false);
    expect(deploy.latestCompleted).toBe(GOVERNED_CRE_TRUSTED_SOURCES_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1);
    expect(deploy.deployments).toBe(1);
    expect(deploy.activations).toBe(0);
    expect(deploy.activated).toBe(false);
    expect(deploy.providerFinalState).toBe("READY");
    expect(deploy.deploymentId).toBe("dpl_8DfVyBPCWwPHsFFk1s3kxctM6Fxw");
    expect(deploy.publicUrl).toBe("https://infinity-validation-cre-lease-npv-e72beb7b-pieapww42.vercel.app");
    expect(deploy.live.renderedTextContrast).toBe("PASS");
    expect(deploy.live.trustedSources).toBe("PASS");
    expect(deploy.live.visualPassed).toBe(false);
  });
});
