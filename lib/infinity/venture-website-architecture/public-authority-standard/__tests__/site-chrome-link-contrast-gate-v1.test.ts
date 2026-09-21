import { describe, expect, it } from "vitest";
import { parseCssColor } from "../rendered-text-contrast-gate";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_LINK_SAME_COLOR_FIXTURE,
  FOUNDER_SITE_CHROME_HIDDEN_DUPLICATE_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE,
  FOUNDER_SITE_CHROME_SRGB_SURFACE_FIXTURE,
  isHiddenOrInertLinkSample,
} from "../rendered-link-contrast-gate";

describe("site-chrome rendered link contrast", () => {
  it("parses color(srgb) 0-1 units instead of treating them as 8-bit RGB", () => {
    const parsed = parseCssColor("color(srgb 1 1 1 / 0.92)");
    expect(parsed).toEqual({ r: 255, g: 255, b: 255, a: 0.92 });
  });

  it("fails the founder near-black nav pair and passes the opaque surface pair", () => {
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE).nearInvisibleFailures).toBe(1);
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE).overall).toBe("PASS");
  });

  it("does not count a hidden duplicate as a visible failure", () => {
    const gate = evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_HIDDEN_DUPLICATE_FIXTURE);
    expect(isHiddenOrInertLinkSample(FOUNDER_SITE_CHROME_HIDDEN_DUPLICATE_FIXTURE.samples[1])).toBe(true);
    expect(gate.nearInvisibleFailures).toBe(0);
    expect(gate.overall).toBe("PASS");
  });

  it("evaluates navy on color(srgb 1 1 1 / 0.92) as a visible high-contrast pair", () => {
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_SRGB_SURFACE_FIXTURE).overall).toBe("PASS");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_SRGB_SURFACE_FIXTURE).nearInvisibleFailures).toBe(0);
  });

  it("still fails same-color visible links", () => {
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_SAME_COLOR_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_SAME_COLOR_FIXTURE).sameColorFailures).toBe(1);
  });

  it("fails closed when visibility evidence is required and missing", () => {
    const gate = evaluateRenderedLinkContrastGate({
      ...FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE,
      samples: FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE.samples.map((sample) => ({
        role: sample.role,
        surfaceRole: sample.surfaceRole,
        componentRole: sample.componentRole,
        color: sample.color,
        background: sample.background,
        contrast: sample.contrast,
      })),
      requireVisibilityEvidence: true,
    });
    expect(gate.overall).toBe("FAIL");
    expect(gate.missingSamples).toBeGreaterThan(0);
  });
});
