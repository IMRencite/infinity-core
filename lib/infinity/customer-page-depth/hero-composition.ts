import {
  HERO_COMPOSITION_GATE,
  INTERACTIVE_TEXT_CONTRAST_GATE,
  type NamedDepthGate,
} from "./types";
import {
  articleHeadingStillChConstrained,
  evaluateH1WidthUtilizationGate,
  evaluateH1WrapQualityGate,
  evaluateUnusedHeroSpaceBalanceGate,
  inferH1LayoutContext,
  type H1WidthObservation,
} from "./h1-width";

export type HeroCompositionObservation = {
  heroHeight: number;
  heroWidth: number;
  h1Top: number;
  h1Height: number;
  h1Width: number;
  gapEyebrowToH1: number;
  gapH1ToOffer: number;
  stackedHeroBlocks: number;
  audienceInsideHero: boolean;
  offerInsideHeroAsFullSection: boolean;
  overflowX: boolean;
  h1LineCount?: number;
  containerWidth?: number;
  availableTitleWidth?: number;
  unusedHorizontalWidth?: number;
  headingLength?: number;
  fontSize?: number;
  lineHeight?: number;
  lastLineRatio?: number;
  hyphenatedWrap?: boolean;
};

export type ContrastSample = {
  selector: string;
  foreground: { r: number; g: number; b: number };
  background: { r: number; g: number; b: number };
  onImageBackground?: boolean;
};

function channel(value: number): number {
  const next = value / 255;
  return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(
  foreground: ContrastSample["foreground"],
  background: ContrastSample["background"],
): number {
  const l1 = 0.2126 * channel(foreground.r) + 0.7152 * channel(foreground.g) + 0.0722 * channel(foreground.b);
  const l2 = 0.2126 * channel(background.r) + 0.7152 * channel(background.g) + 0.0722 * channel(background.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function firstHeroHeaderHtml(html: string): string {
  return html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? "";
}

export function evaluateHeroCompositionGate(input: {
  html?: string;
  css?: string;
  observation?: HeroCompositionObservation | null;
}): NamedDepthGate {
  const reasons: string[] = [];
  const html = input.html ?? "";
  const header = firstHeroHeaderHtml(html);
  const homepagePhoto = /onpv-home-hero/i.test(header) || (/pv-hero-photo/i.test(header) && /Compare commercial lease economics without rebuilding/i.test(header) && !/pv-article-hero/i.test(header));
  if (homepagePhoto && /data-depth="offer"/i.test(header)) {
    reasons.push("FULL_OFFER_SECTION_STACKED_IN_HERO");
  }
  if (homepagePhoto && /AnswerFirst/i.test(header)) {
    reasons.push("AUDIENCE_CARD_STACKED_IN_HERO");
  }
  if (homepagePhoto && />Request Pilot Access</i.test(header) && />Start Free Trial</i.test(header)) {
    reasons.push("COMPETING_PRIMARY_ACTIONS_IN_HERO");
  }
  if (homepagePhoto && /vg-cta--secondary[\s\S]*See pricing/i.test(header)) {
    reasons.push("LOW_CONTRAST_SECONDARY_CTA_ON_PHOTO");
  }
  const observation = input.observation;
  if (observation) {
    if (observation.audienceInsideHero) reasons.push("AUDIENCE_STILL_INSIDE_HERO");
    if (observation.offerInsideHeroAsFullSection) reasons.push("OFFER_SECTION_STILL_INSIDE_HERO");
    if (observation.stackedHeroBlocks > 5) reasons.push("HERO_OVERSTACKED");
    if (observation.gapEyebrowToH1 < 8) reasons.push("H1_CROWDED_AGAINST_EYEBROW");
    if (observation.gapH1ToOffer < 12) reasons.push("H1_LACKS_BREATHING_ROOM");
    if (observation.h1Top < 12) reasons.push("HERO_CONTENT_PINNED_TO_TOP");
    if (observation.h1Width > 0 && observation.heroWidth > 0 && observation.h1Width / observation.heroWidth > 0.92) {
      reasons.push("H1_SPANNING_FULL_HERO_WITHOUT_WRAP_CONTROL");
    }
    if ((observation.h1LineCount ?? 0) > 4 && (observation.unusedHorizontalWidth ?? 0) > 180) {
      reasons.push("H1_WRAPS_TOO_MANY_LINES");
    }
    if (observation.overflowX) reasons.push("HERO_HORIZONTAL_OVERFLOW");
    if (observation.availableTitleWidth && observation.containerWidth) {
      const widthObs: H1WidthObservation = {
        viewportWidth: observation.heroWidth,
        containerWidth: observation.containerWidth,
        h1Width: observation.h1Width,
        h1Height: observation.h1Height,
        availableTitleWidth: observation.availableTitleWidth,
        adjacentOccupiedWidth: 0,
        unusedHorizontalWidth: observation.unusedHorizontalWidth ?? Math.max(0, observation.availableTitleWidth - observation.h1Width),
        lineCount: observation.h1LineCount ?? 0,
        headingLength: observation.headingLength ?? 0,
        fontSize: observation.fontSize ?? 0,
        lineHeight: observation.lineHeight ?? 0,
        layout: inferH1LayoutContext(html),
        lastLineRatio: observation.lastLineRatio,
        hyphenatedWrap: observation.hyphenatedWrap,
      };
      reasons.push(
        ...evaluateH1WidthUtilizationGate({ html, css: input.css, observation: widthObs }).reasons,
        ...evaluateH1WrapQualityGate({ html, observation: widthObs }).reasons,
        ...evaluateUnusedHeroSpaceBalanceGate({ html, observation: widthObs }).reasons,
      );
    }
  } else if (!html) {
    reasons.push("HERO_COMPOSITION_NOT_MEASURED");
  }
  if (articleHeadingStillChConstrained(html, input.css ?? "")) {
    reasons.push("FIXED_CH_WIDTH_CRUSHES_PRIMARY_H1");
  }
  return { gate: HERO_COMPOSITION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateInteractiveTextContrastGate(input: {
  html?: string;
  samples?: ContrastSample[];
}): NamedDepthGate {
  const reasons: string[] = [];
  const html = input.html ?? "";
  const header = firstHeroHeaderHtml(html);
  if (/className="vg-cta vg-cta--secondary"[\s\S]{0,80}See pricing/i.test(header)
    || /See pricing[\s\S]{0,40}vg-cta--secondary/i.test(header)) {
    reasons.push("SEE_PRICING_USES_TRANSPARENT_SECONDARY_ON_PHOTO");
  }
  if (/See pricing/i.test(html) && !/onpv-see-pricing/.test(html) && /pv-hero-photo/.test(html)) {
    reasons.push("SEE_PRICING_MISSING_READABLE_TREATMENT");
  }
  for (const sample of input.samples ?? []) {
    const ratio = contrastRatio(sample.foreground, sample.background);
    const minimum = sample.onImageBackground ? 4.5 : 4.5;
    if (ratio < minimum) {
      reasons.push(`CONTRAST_BELOW_AA:${sample.selector}:${ratio.toFixed(2)}`);
    }
  }
  if ((input.samples?.length ?? 0) === 0 && /See pricing/i.test(html) && !/onpv-see-pricing/.test(html)) {
    reasons.push("INTERACTIVE_CONTRAST_NOT_MEASURED");
  }
  return { gate: INTERACTIVE_TEXT_CONTRAST_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHomepageInitialViewportCommercialActionGate(input: {
  scrollY: number;
  viewportHeight: number;
  h1?: { top: number; bottom: number };
  trial?: { top: number; bottom: number };
  startFreeTrial?: { top: number; bottom: number };
  secondaryAction?: { top: number; bottom: number };
}): NamedDepthGate {
  const visible = (rect?: { top: number; bottom: number }) =>
    Boolean(rect && rect.top >= 0 && rect.bottom <= input.viewportHeight && input.scrollY === 0);
  const reasons: string[] = [];
  if (input.scrollY !== 0) reasons.push("SCROLL_Y_NOT_ZERO");
  if (!visible(input.h1)) reasons.push("H1_NOT_IN_INITIAL_VIEWPORT");
  if (!visible(input.trial)) reasons.push("TRIAL_NOT_IN_INITIAL_VIEWPORT");
  if (!visible(input.startFreeTrial)) reasons.push("START_FREE_TRIAL_NOT_IN_INITIAL_VIEWPORT");
  if (!visible(input.secondaryAction)) reasons.push("SECONDARY_PRODUCT_ACTION_NOT_IN_INITIAL_VIEWPORT");
  return { gate: "InitialViewportCommercialActionGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}
