import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreSearchDepthSuccessor } from "@/lib/infinity/venture-website-architecture/cre-search-depth-successor";
import {
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL,
} from "../constants";
import { GOVERNED_CRE_HUMAN_FIRST_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1 } from "../cre-human-first-contrast-repair-deploy";
import { HUMAN_FIRST_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID } from "../cre-human-first-contrast-repair-authorization";
import { HARD_PUBLISHABILITY_GATES } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import { evaluateHumanFirstPublicLanguageGate, HUMAN_FIRST_BAD_FIXTURES } from "@/lib/infinity/venture-website-architecture/human-first-public-language-gate";
import { evaluateRenderedTextContrastGate, FOUNDER_EMPHASIS_LEAK_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { evaluateSectionSurfaceContrast } from "@/lib/infinity/venture-website-architecture/public-authority-standard/section-surface-system";
import { getCanonicalActivePublicValidationState } from "../active-public-artifact";

describe("GOVERNED CRE HUMAN FIRST RENDERED CONTRAST REPAIR DEPLOYMENT V1", () => {
  it("locks the repaired immutable successor digest and new gates", async () => {
    const successor = await reconstructCreSearchDepthSuccessor();
    expect(successor.artifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.routes).toBe(93);
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedTextContrastGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HumanFirstPublicLanguageGate");
    expect(GOVERNED_CRE_HUMAN_FIRST_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1).toBe(
      "GOVERNED_CRE_HUMAN_FIRST_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1",
    );
    expect(HUMAN_FIRST_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH/);
    expect(evaluateSectionSurfaceContrast({
      variants: ["EMPHASIS"],
      textOnEmphasisLight: true,
      cardsDistinctOnTinted: true,
      linksReadable: true,
    }).overall).toBe("PASS");
    expect(evaluateRenderedTextContrastGate(FOUNDER_EMPHASIS_LEAK_FIXTURE).overall).toBe("FAIL");
    for (const fixture of HUMAN_FIRST_BAD_FIXTURES) {
      expect(evaluateHumanFirstPublicLanguageGate(fixture).overall).toBe("FAIL");
    }
  }, 180000);

  it("records zero provider writes after isolated build failure and leaves the old live URL active", () => {
    const deploy = JSON.parse(readFileSync(".infinity/human-first-contrast-repair-deploy-result.json", "utf8")) as {
      executed: boolean;
      attempted: boolean;
      deployments: number;
      activations: number;
      publiclyLaunched: boolean;
      stopReason: string;
      latestCompleted: string;
    };
    expect(deploy.executed).toBe(false);
    expect(deploy.attempted).toBe(false);
    expect(deploy.deployments).toBe(0);
    expect(deploy.activations).toBe(0);
    expect(deploy.publiclyLaunched).toBe(false);
    expect(deploy.stopReason).toBe("PROVIDER_EQUIVALENT_BUILD_GATE_FAILED");
    expect(deploy.latestCompleted).toBe(GOVERNED_CRE_HUMAN_FIRST_RENDERED_CONTRAST_REPAIR_DEPLOYMENT_V1);
    expect(getCanonicalActivePublicValidationState()).toEqual({
      activeArtifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
      activeDigest: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
      activeDeploymentId: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
      activeUrl: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL,
    });
    expect(DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL).toContain("kd9ktl3qy");
  });
});
