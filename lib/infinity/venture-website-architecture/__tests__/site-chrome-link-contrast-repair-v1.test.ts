import { describe, expect, it } from "vitest";
import { reconstructCreSiteChromeLinkContrastSuccessor } from "../cre-site-chrome-link-contrast-successor";
import {
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { SITE_CHROME_LINK_CONTRAST_MARKER } from "../site-chrome-link-contrast-css";
import { evaluateRenderedLinkContrastGate, FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE, FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE } from "../public-authority-standard/rendered-link-contrast-gate";
import { pageContent } from "../answer-authority/page-inspect";
import {
  CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1,
  GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
  runCreSiteChromeLinkContrastRepairMission,
} from "../answer-authority/site-chrome-link-contrast-repair-mission";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";

describe("CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1", () => {
  it("locks a new immutable successor on the hub-layout predecessor", async () => {
    const successor = await reconstructCreSiteChromeLinkContrastSuccessor();
    expect(successor.artifactId).toBe(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.predecessorArtifactId).toBe(CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.pageLoop.finalFailed).toBe(0);
    expect(successor.hubLayout.overall).toBe("PASS");
    expect(successor.hookBoundary.overall).toBe("PASS");
    expect(successor.humanFirst.overall).toBe("PASS");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain(SITE_CHROME_LINK_CONTRAST_MARKER);
    expect(css).toContain("background: var(--pv-nav-surface)");
    expect(pageContent(successor.files, "/commercial-lease-npv")).toContain("pv-discovery-band");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE).overall).toBe("PASS");
  }, 180000);

  it("projects the repair mission and ends READY_BLOCKED for a new deploy authorization", async () => {
    const ran = await runCreSiteChromeLinkContrastRepairMission({
      organizationId: "org_site_chrome_link_contrast_repair_v1",
      runIsolatedBuild: false,
    });
    expect(CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1).toBe("CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1");
    expect(instrumentedRuntimeRegistry().runtimes.CreSiteChromeLinkContrastRepairRuntime.usesMissionWrapper).toBe(true);
    expect(ran.command).toBe("ACTIVE_WORK");
    expect(ran.systemsArchitect).toBe("ACTIVE_WORK");
    expect(ran.creationLab).toBe("ACTIVE_WORK");
    expect(ran.validationStation).toBe("ACTIVE_WORK");
    expect(ran.deploymentDepot).toBe("PRESENT_IDLE");
    expect(ran.growthNexus).toBe("PRESENT_IDLE");
    expect(ran.view.nowInspecting.status).toBe("READY_BLOCKED");
    expect(ran.view.nowInspecting.authorizationRequired).toBe(GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED);
    expect(ran.view.nowInspecting.currentMission).toBe(CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1);
    expect(ran.result.successor.artifactId).toBe(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
  }, 180000);
});
