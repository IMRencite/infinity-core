import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reconstructCreHomepageHeroLinkContrastSuccessor } from "../cre-homepage-hero-link-contrast-successor";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { HOMEPAGE_HERO_LINK_CONTRAST_MARKER } from "../homepage-hero-link-contrast-css";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE,
  FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE,
} from "../public-authority-standard/rendered-link-contrast-gate";
import { parseCssColor } from "../public-authority-standard/rendered-text-contrast-gate";
import { evaluateHubQuestionBoardLayout, FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE } from "../public-authority-standard/hub-discovery-rendered-quality";
import { pageContent } from "../answer-authority/page-inspect";
import {
  CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1,
  GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
  runCreHomepageHeroLinkAndHqInfinityCoreRepairMission,
} from "../answer-authority/homepage-hero-link-and-hq-infinity-core-repair-mission";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { deriveInfinityDecisionCoreState } from "@/components/dashboard/operator-console/infinity-decision-core";
import { proveHomepageHeroAndAllRoutesRendered } from "../homepage-hero-rendered-proof";

describe("CRE homepage hero-link and HQ Infinity core repair", () => {
  it("reproduces the pale-on-wash hero pair and keeps nav thresholds closed", () => {
    const fail = evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE);
    expect(fail.overall).toBe("FAIL");
    expect(fail.samples).toHaveLength(4);
    expect(evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE).overall).toBe("PASS");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE).overall).toBe("PASS");
    expect(parseCssColor("color(srgb 1 1 1 / 0.92)")).toEqual({ r: 255, g: 255, b: 255, a: 0.92 });
    expect(evaluateHubQuestionBoardLayout(FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE).overall).toBe("FAIL");
  });

  it("locks a new immutable successor on the chrome-contrast predecessor", async () => {
    const successor = await reconstructCreHomepageHeroLinkContrastSuccessor();
    expect(successor.artifactId).toBe(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST);
    expect(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST.includes(",")).toBe(false);
    expect(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST).not.toContain("art_");
    expect(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID).not.toContain("pending");
    expect(successor.predecessorArtifactId).toBe(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.heroLinks.overall).toBe("PASS");
    expect(successor.hubLayout.overall).toBe("PASS");
    expect(successor.humanFirst.overall).toBe("PASS");
    expect(successor.hookBoundary.overall).toBe("PASS");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain(HOMEPAGE_HERO_LINK_CONTRAST_MARKER);
    expect(css).toContain("background: var(--pv-hero-secondary-surface)");
    expect(pageContent(successor.files, "/")).toContain("Compare two leases");
    expect(pageContent(successor.files, "/")).toContain("See the workflow");
    expect(pageContent(successor.files, "/commercial-lease-npv")).toContain("pv-discovery-band");
    expect(successor.files.some((file) => file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore"))).toBe(false);
    const proof = await proveHomepageHeroAndAllRoutesRendered({ files: successor.files });
    expect(proof.heroOverall).toBe("PASS");
    expect(proof.heroRequired).toBe(6);
    expect(proof.heroPassing).toBe(6);
    expect(proof.routesChecked).toBe(93);
    expect(proof.sameColor).toBe(0);
    expect(proof.nearInvisible).toBe(0);
    expect(proof.wcag).toBe(0);
    expect(proof.hoverFocus).toBe(0);
    expect(proof.missing).toBe(0);
    expect(proof.renderedLinkContrast).toBe("PASS");
  }, 240000);

  it("binds HQ Infinity Decision Core to Mission Runtime states and keeps SVG geometry", () => {
    const core = readFileSync(join(process.cwd(), "components/dashboard/operator-console/infinity-decision-core.tsx"), "utf8");
    const chamber = readFileSync(join(process.cwd(), "components/dashboard/operator-console/command-chamber.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(core).toContain("hq-infinity-svg");
    expect(core).toContain("INFINITY_PATH");
    expect(core).not.toContain("<span>∞</span>");
    expect(chamber).toContain("InfinityDecisionCore");
    expect(chamber).toContain("Decision core");
    expect(chamber).not.toContain("CommandAgentOrb");
    expect(css).toContain("hq-infinity-active-scale");
    expect(css).toContain("width: 13.75rem");
    expect(css).toContain("width: 11.75rem");
    expect(css).toContain("scale(0.82)");
    expect(css).toContain("scale(1.22)");
    expect(css).toContain("hq-infinity-energy-travel");
    expect(css).toContain("hq-infinity-idle-scale");
    expect(css).toContain("hq-infinity-blocked-scale");
    expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.hq-infinity-scale[\s\S]*animation:\s*none/);
    expect(css).toContain("scale(0.97)");
    expect(css).toContain("scale(1.03)");
    expect(core).toContain('data-hq-decision-shape="INFINITY_SYMBOL"');
    expect(core).not.toContain("<circle");
    expect(deriveInfinityDecisionCoreState({ commandRoomStatus: "ACTIVE_WORK" })).toBe("ACTIVE_WORK");
    expect(deriveInfinityDecisionCoreState({ commandRoomStatus: "READY_BLOCKED" })).toBe("READY_BLOCKED");
    expect(deriveInfinityDecisionCoreState({ commandRoomStatus: "PRESENT_IDLE" })).toBe("PRESENT_IDLE");
    expect(deriveInfinityDecisionCoreState({ commandRoomStatus: "FAILED" })).toBe("FAILED");
    expect(instrumentedRuntimeRegistry().runtimes.CreHomepageHeroLinkAndHqInfinityCoreRepairRuntime.usesMissionWrapper).toBe(true);
  });

  it("projects the repair mission and ends READY_BLOCKED for a new deploy authorization", async () => {
    const ran = await runCreHomepageHeroLinkAndHqInfinityCoreRepairMission({
      organizationId: "org_homepage_hero_and_hq_core_repair_v1",
      runIsolatedBuild: false,
    });
    expect(CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1).toBe(
      "CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1",
    );
    expect(ran.command).toBe("ACTIVE_WORK");
    expect(ran.systemsArchitect).toBe("ACTIVE_WORK");
    expect(ran.creationLab).toBe("ACTIVE_WORK");
    expect(ran.validationStation).toBe("ACTIVE_WORK");
    expect(ran.deploymentDepot).toBe("PRESENT_IDLE");
    expect(ran.growthNexus).toBe("PRESENT_IDLE");
    expect(ran.view.nowInspecting.status).toBe("READY_BLOCKED");
    expect(ran.view.nowInspecting.authorizationRequired).toBe(GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED);
    expect(ran.view.nowInspecting.currentMission).toBe(CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1);
    expect(ran.result.successor.artifactId).toBe(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
  }, 180000);
});
