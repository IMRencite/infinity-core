import {
  H1_WIDTH_UTILIZATION_GATE,
  H1_WRAP_QUALITY_GATE,
  UNUSED_HERO_SPACE_BALANCE_GATE,
  type NamedDepthGate,
} from "./types";

export type H1LayoutContext = "PHOTO_HERO" | "ARTICLE_INTRO" | "SPLIT" | "PLAIN";

export type H1WidthObservation = {
  viewportWidth: number;
  containerWidth: number;
  h1Width: number;
  h1Height: number;
  availableTitleWidth: number;
  adjacentOccupiedWidth: number;
  unusedHorizontalWidth: number;
  lineCount: number;
  headingLength: number;
  fontSize: number;
  lineHeight: number;
  layout: H1LayoutContext;
  lastLineRatio?: number;
  hyphenatedWrap?: boolean;
};

export function inferH1LayoutContext(html: string): H1LayoutContext {
  if (/onpv-home-hero|onpv-pricing-hero--overlay/i.test(html)) return "PHOTO_HERO";
  if (/pv-hero--split/i.test(html) && !/pv-article-hero/i.test(html)) return "SPLIT";
  if (/pv-article-hero|pv-hero-photo--article/i.test(html)) return "ARTICLE_INTRO";
  return "PLAIN";
}

export function articleHeadingStillChConstrained(html: string, css: string): boolean {
  const article = /pv-article-hero|pv-hero-photo--article/i.test(html);
  if (!article) return false;
  const override = /\.pv-article-hero[^{]*\{[^}]*max-width:\s*min\(4[02]rem/i.test(css)
    || /\.pv-hero-photo--article[^{]*\{[^}]*max-width:\s*min\(4[02]rem/i.test(css)
    || /\.onpv-article-h1/.test(css);
  if (override) return false;
  return /\.pv-display[^{]*\{[^}]*max-width:\s*1[468]ch/i.test(css)
    || /\.pv-hero-photo[^{.\n]*\.pv-display[^{]*\{[^}]*max-width:\s*1[68]ch/i.test(css);
}

export function evaluateH1WidthUtilizationGate(input: {
  html?: string;
  css?: string;
  observation?: H1WidthObservation | null;
}): NamedDepthGate {
  const reasons: string[] = [];
  const html = input.html ?? "";
  const css = input.css ?? "";
  if (articleHeadingStillChConstrained(html, css)) {
    reasons.push("FIXED_CH_WIDTH_CRUSHES_PRIMARY_H1");
  }
  const observation = input.observation;
  if (observation) {
    const available = Math.max(observation.availableTitleWidth, observation.containerWidth, 1);
    const utilization = observation.h1Width / available;
    const unusedRatio = observation.unusedHorizontalWidth / Math.max(observation.viewportWidth, 1);
    const longTitle = observation.headingLength >= 40;
    if (observation.layout === "ARTICLE_INTRO" || observation.layout === "PLAIN") {
      if (observation.viewportWidth >= 1100 && longTitle && utilization < 0.48 && observation.lineCount >= 3) {
        reasons.push("H1_USES_TOO_LITTLE_OF_TITLE_REGION");
      }
      if (observation.viewportWidth >= 1100 && unusedRatio > 0.28 && observation.lineCount >= 4) {
        reasons.push("DESKTOP_H1_WRAPS_LIKE_MOBILE");
      }
    }
    if (observation.layout === "PHOTO_HERO" && observation.viewportWidth >= 1100 && utilization < 0.18 && observation.lineCount >= 5) {
      reasons.push("PHOTO_H1_STILL_ARTIFICIALLY_NARROW");
    }
  } else if (!html && !css) {
    reasons.push("H1_WIDTH_NOT_MEASURED");
  }
  return { gate: H1_WIDTH_UTILIZATION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateH1WrapQualityGate(input: {
  html?: string;
  observation?: H1WidthObservation | null;
}): NamedDepthGate {
  const reasons: string[] = [];
  const observation = input.observation;
  if (observation) {
    const unusedRatio = observation.unusedHorizontalWidth / Math.max(observation.viewportWidth, 1);
    const expectedLines = observation.viewportWidth < 700 ? 5 : observation.headingLength > 70 ? 3 : 2;
    if (observation.viewportWidth >= 1100 && observation.lineCount > expectedLines + 1 && unusedRatio > 0.22) {
      reasons.push("EXCESSIVE_WRAP_WITH_UNUSED_WIDTH");
    }
    if (observation.viewportWidth >= 1100 && observation.lineCount >= 4 && unusedRatio > 0.25) {
      reasons.push("TALL_NARROW_TITLE_COLUMN");
    }
    if ((observation.lastLineRatio ?? 1) < 0.28 && observation.lineCount >= 3 && unusedRatio > 0.2) {
      reasons.push("ORPHANED_FINAL_H1_LINE");
    }
    if (observation.hyphenatedWrap) reasons.push("LAYOUT_CAUSED_HYPHEN_LIKE_BREAK");
    if (observation.viewportWidth < 700 && observation.h1Width > observation.containerWidth + 8) {
      reasons.push("MOBILE_H1_OVERFLOW");
    }
  } else if (!input.html) {
    reasons.push("H1_WRAP_NOT_MEASURED");
  }
  return { gate: H1_WRAP_QUALITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateUnusedHeroSpaceBalanceGate(input: {
  html?: string;
  observation?: H1WidthObservation | null;
}): NamedDepthGate {
  const reasons: string[] = [];
  const observation = input.observation;
  if (observation) {
    const unusedRatio = observation.unusedHorizontalWidth / Math.max(observation.viewportWidth, 1);
    const titleShare = observation.h1Width / Math.max(observation.containerWidth, 1);
    if (
      (observation.layout === "ARTICLE_INTRO" || observation.layout === "PLAIN")
      && observation.viewportWidth >= 1100
      && unusedRatio > 0.32
      && titleShare < 0.5
      && observation.lineCount >= 3
    ) {
      reasons.push("NARROW_TITLE_BESIDE_EMPTY_HORIZONTAL_SPACE");
    }
    if (
      observation.layout === "ARTICLE_INTRO"
      && observation.adjacentOccupiedWidth < 80
      && unusedRatio > 0.35
      && observation.lineCount >= 4
    ) {
      reasons.push("WHITESPACE_FROM_RESTRICTIVE_H1_WIDTH");
    }
  }
  return { gate: UNUSED_HERO_SPACE_BALANCE_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}
