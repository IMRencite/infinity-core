import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreHomepageHeroLinkContrastSuccessor } from "@/lib/infinity/venture-website-architecture/cre-homepage-hero-link-contrast-successor";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import {
  executeHomepageHeroLinkContrastAuthorizedDeploy,
  GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
  GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1,
  GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
  HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING,
} from "../cre-homepage-hero-link-contrast-deploy";
import { HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID } from "../cre-homepage-hero-link-contrast-deploy-authorization";
import { readHomepageHeroLinkContrastDeployAttemptState } from "../cre-homepage-hero-link-contrast-deploy-attempt-state";
import {
  HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS,
  resolveFrozenHomepageHeroLinkContrastDeploymentBundle,
} from "../resolve-frozen-homepage-hero-link-contrast-bundle";
import { HOMEPAGE_HERO_LIVE_PROOF_LINKS } from "../cre-homepage-hero-link-contrast-live-verify";
import { SITE_CHROME_CANONICAL_NAV_LINKS } from "../cre-site-chrome-link-contrast-live-verify";
import { parseCssColor } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE,
  FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-link-contrast-gate";
import { evaluateHubQuestionBoardLayout, FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/hub-discovery-rendered-quality";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { deriveInfinityDecisionCoreState } from "@/components/dashboard/operator-console/infinity-decision-core";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import { HOMEPAGE_HERO_LINK_CONTRAST_MARKER } from "@/lib/infinity/venture-website-architecture/homepage-hero-link-contrast-css";

describe("GOVERNED CRE HOMEPAGE LINK CONTRAST DEPLOYMENT V1", () => {
  it("locks the homepage hero-link successor, scope separation, and keep-fail thresholds", async () => {
    const successor = await reconstructCreHomepageHeroLinkContrastSuccessor();
    expect(GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1).toBe("GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1");
    expect(GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID).toBe("msn_cre_homepage_hero_link_contrast_deploy_v1");
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID).toBe(
      "founder_ceiling_cre_homepage_hero_link_contrast_deployment_v1",
    );
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH|DNS|DOMAIN/);
    expect(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST.includes(",")).toBe(false);
    expect(successor.artifactId).toBe(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.predecessorArtifactId).toBe(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(successor.heroLinks.overall).toBe("PASS");
    expect(successor.hubLayout.overall).toBe("PASS");
    expect(successor.humanFirst.overall).toBe("PASS");
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(isCreValidationArtifactId(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    expect(successor.files.some((file) => file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore"))).toBe(false);
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain(HOMEPAGE_HERO_LINK_CONTRAST_MARKER);
    expect(parseCssColor("color(srgb 1 1 1 / 0.92)")).toEqual({ r: 255, g: 255, b: 255, a: 0.92 });
    expect(evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE).overall).toBe("PASS");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE).overall).toBe("PASS");
    expect(evaluateHubQuestionBoardLayout(FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE).overall).toBe("FAIL");
    expect(HOMEPAGE_HERO_LIVE_PROOF_LINKS).toHaveLength(2);
    expect(SITE_CHROME_CANONICAL_NAV_LINKS).toHaveLength(7);
    expect(deriveInfinityDecisionCoreState({ commandRoomStatus: "ACTIVE_WORK" })).toBe("ACTIVE_WORK");
    expect(deriveInfinityDecisionCoreState({ commandRoomStatus: "PRESENT_IDLE" })).toBe("PRESENT_IDLE");
    expect(instrumentedRuntimeRegistry().runtimes.CreHomepageHeroLinkContrastDeployRuntime.usesMissionWrapper).toBe(true);
    expect(instrumentedRuntimeRegistry().contracts.CreHomepageHeroLinkContrastDeployRuntime.missionType).toBe(
      "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
    );
    expect(
      evaluateMissionRoomActivityProjectionGate({
        openSteps: [{ stepType: "PUBLIC_ARTIFACT_QUALITY_GATE", engine: "market_validation" }],
        rooms: { quality_control: "ACTIVE_WORK", executive_office: "ACTIVE_WORK", launch_operations: "ACTIVE_WORK" },
        command: "ACTIVE_WORK",
        deploymentWriteCompleted: true,
        liveValidationOpen: true,
      }).overall,
    ).toBe("PASS");
  }, 180000);

  it("binds the first-class homepage deploy function to the exact frozen artifact and consumed write ceiling", async () => {
    const source = readFileSync("lib/infinity/market-validation-experiment/cre-homepage-hero-link-contrast-deploy.ts", "utf8");
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.functionName).toBe("executeHomepageHeroLinkContrastAuthorizedDeploy");
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.mission).toBe("GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1");
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.authorization).toBe(GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED);
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.artifactId).toBe("art_dbf624e41599420891e2");
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.digest).toBe(
      "a8ca8bfa544da21a96c11bab4d0abb0e3926271ab989d2f1924c68c7deba1f97",
    );
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.liveVerifier).toBe("verifyHomepageHeroLinkContrastLivePublic");
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.maximumDeployments).toBe(1);
    expect(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.maximumActivations).toBe(1);
    expect(source).not.toContain("executeSiteChromeLinkContrastAuthorizedDeploy");
    expect(source).not.toContain("composeHomepageHeroLinkContrastRepair");
    expect(source).not.toContain("reconstructCreHomepageHeroLinkContrastSuccessor");
    expect(source).not.toContain("runProviderEquivalentArtifactBuildGate");
    expect(HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS).toEqual([
      CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
      CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
      CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
      SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    ]);
    const frozen = resolveFrozenHomepageHeroLinkContrastDeploymentBundle();
    expect(frozen.ok).toBe(true);
    expect(frozen.composed).toBe(false);
    expect(frozen.composeInvoked).toBe(false);
    expect(frozen.artifactExactMatch).toBe("PASS");
    expect(frozen.digestExactMatch).toBe("PASS");
    expect(frozen.hqFiles).toBe(0);
    expect(frozen.scopeSeparation).toBe("PASS");
    expect(frozen.peBuildFrozen).toBe("PASS");
    const attempts = readHomepageHeroLinkContrastDeployAttemptState();
    expect(attempts.deployments).toBe(1);
    expect(attempts.activations).toBe(1);
    expect(attempts.maximumDeployments).toBe(1);
    expect(attempts.deploymentId).toBe("dpl_Ehsc274qjUrZTfyCkQ4n3NCBXZV8");
    expect(attempts.terminalState).toBe("CRE_HOMEPAGE_LINK_CONTRAST_ACTIVE");
    expect(GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID).toBe("msn_cre_homepage_hero_link_contrast_deploy_v1");
    const stopped = await executeHomepageHeroLinkContrastAuthorizedDeploy();
    expect(stopped.stopReason).toBe("DEPLOYMENT_AUTHORIZATION_ALREADY_CONSUMED");
    expect(stopped.executed).toBe(false);
    expect(stopped.deployments).toBe(1);
    expect(stopped.activations).toBe(1);
    expect(readHomepageHeroLinkContrastDeployAttemptState().deployments).toBe(1);
  });
});
