import { describe, expect, it } from "vitest";
import { reconstructCreSemanticNavWidthAndMutedTextSuccessor } from "../cre-semantic-nav-width-and-muted-text-successor";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { DARK_SURFACE_MUTED_TEXT_MARKER } from "../dark-surface-muted-text-css";
import { SEMANTIC_NAV_WIDTH_UTILIZATION_MARKER } from "../semantic-nav-width-utilization-css";
import {
  evaluateRenderedMutedTextContrastGate,
  FOUNDER_DARK_NAVY_LOW_OPACITY_CAPTION_FIXTURE,
  FOUNDER_DARK_NAVY_READABLE_MUTED_CAPTION_FIXTURE,
} from "../public-authority-standard/rendered-muted-text-contrast-gate";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE,
  FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE,
} from "../public-authority-standard/rendered-link-contrast-gate";
import { CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1 } from "../constants";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { pageContent } from "../answer-authority/page-inspect";

describe("CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1", () => {
  it("keeps the dark-navy muted caption fixture failing and the repaired fixture passing", () => {
    expect(evaluateRenderedMutedTextContrastGate(FOUNDER_DARK_NAVY_LOW_OPACITY_CAPTION_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedMutedTextContrastGate(FOUNDER_DARK_NAVY_READABLE_MUTED_CAPTION_FIXTURE).overall).toBe("PASS");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE).overall).toBe("PASS");
    expect(CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1).toBe("CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1");
    expect(instrumentedRuntimeRegistry().contracts.CreSemanticNavWidthUtilizationRepairRuntime.missionType).toBe(
      "CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1",
    );
  });

  it("locks the width + muted-text successor on the homepage-hero predecessor", async () => {
    const successor = await reconstructCreSemanticNavWidthAndMutedTextSuccessor();
    expect(successor.predecessorArtifactId).toBe(CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(successor.immutable).toBe(true);
    expect(successor.routes).toBe(93);
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.muted.overall).toBe("PASS");
    expect(successor.muted.darkSurfaceFailures).toBe(0);
    expect(successor.muted.lightSurfaceFailures).toBe(0);
    expect(successor.muted.missingMutedSamples).toBe(0);
    expect(successor.muted.failed).toBe(0);
    expect(successor.muted.samples.some((sample) => sample.role === "workflow_kicker")).toBe(true);
    expect(successor.muted.samples.some((sample) => sample.role === "bottom_caption")).toBe(true);
    expect(successor.hubLayout.overall).toBe("PASS");
    expect(successor.humanFirst.overall).toBe("PASS");
    expect(successor.heroLinks.overall).toBe("PASS");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(successor.files.some((file) => file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore"))).toBe(false);
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain(DARK_SURFACE_MUTED_TEXT_MARKER);
    expect(css).toContain(SEMANTIC_NAV_WIDTH_UTILIZATION_MARKER);
    const how = pageContent(successor.files, "/how-it-works");
    expect(how).toMatch(/sn-block pv-wide-module|sn-block/);
    expect(how).toContain("ProductUiFrame");
    expect(css).toContain(".pv-product-frame > figcaption");
    expect(css).toContain(".pv-product-frame > .pv-caption");
  }, 180000);
});
