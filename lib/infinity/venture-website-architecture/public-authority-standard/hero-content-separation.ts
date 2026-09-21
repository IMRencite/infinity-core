import type { Gate } from "./types";

export const HERO_CONTENT_SEPARATION_GATE = "HeroContentSeparationGate" as const;

export type VisibleBox = {
  top: number;
  height: number;
  left?: number;
  width?: number;
};

const DEFAULT_STACKED_SEPARATION_PX = 24;

function bottom(box: VisibleBox | null | undefined): number | null {
  if (!box) return null;
  return box.top + box.height;
}

function overlapPx(upper: VisibleBox | null | undefined, lower: VisibleBox | null | undefined): number {
  const upperBottom = bottom(upper);
  if (upperBottom == null || !lower) return 0;
  return Math.max(0, upperBottom - lower.top);
}

function separationPx(upper: VisibleBox | null | undefined, lower: VisibleBox | null | undefined): number | null {
  const upperBottom = bottom(upper);
  if (upperBottom == null || !lower) return null;
  return lower.top - upperBottom;
}

export function evaluateHeroContentSeparation(input: {
  hero: VisibleBox | null;
  following: VisibleBox | null;
  media?: VisibleBox | null;
  overlay?: VisibleBox | null;
  firstBodyText?: VisibleBox | null;
  css?: string;
  documentedTransition?: boolean;
  minSeparationPx?: number;
}): {
  gate: typeof HERO_CONTENT_SEPARATION_GATE;
  overlapPx: number;
  mediaOverlapPx: number;
  overlayOverlapPx: number;
  visualSeparationPx: number | null;
  cssSpillRisk: boolean;
  initialContainingBlockRisk: boolean;
  overall: Gate;
  failures: string[];
} {
  const failures: string[] = [];
  const firstContent = input.firstBodyText ?? input.following;
  const heroOverlap = overlapPx(input.hero, input.following);
  const mediaOverlap = overlapPx(input.media, firstContent);
  const overlayOverlap = overlapPx(input.overlay, input.following);
  const visualOverlap = Math.max(heroOverlap, mediaOverlap, overlayOverlap);
  if (heroOverlap > 2) failures.push("hero_overlaps_following_content");
  if (mediaOverlap > 2) failures.push("hero_media_intersects_body");
  if (overlayOverlap > 2) failures.push("hero_overlay_extends_into_body");
  if (input.media && input.following && input.following.top < (bottom(input.media) ?? 0) - 2) {
    if (!failures.includes("next_section_begins_inside_hero_visual")) {
      failures.push("next_section_begins_inside_hero_visual");
    }
  }
  const css = input.css ?? "";
  const mediaAbsolute = /\.pv-hero-media[\s\S]{0,200}position:\s*absolute/.test(css);
  const heroRelative =
    /header\.pv-hero[\s\S]{0,220}position:\s*relative/.test(css) ||
    /\.pv-hero-photo[\s\S]{0,220}position:\s*relative/.test(css) ||
    /\.pv-article-hero[\s\S]{0,220}position:\s*relative/.test(css);
  const overflowHidden =
    /\.pv-hero-photo[\s\S]{0,220}overflow:\s*hidden/.test(css) ||
    /\.pv-article-hero[\s\S]{0,220}overflow:\s*hidden/.test(css);
  const stackedMedia =
    /\.pv-hero-photo--article[\s\S]{0,280}position:\s*relative/.test(css) &&
    /\.pv-hero-photo--article[\s\S]{0,400}\.pv-hero-media[\s\S]{0,200}position:\s*relative/.test(css);
  const negativeFollow = /\.pv-section[\s\S]{0,80}margin-top:\s*-/.test(css);
  const initialContainingBlockRisk = mediaAbsolute && !heroRelative && !stackedMedia;
  const cssSpillRisk = ((mediaAbsolute && !overflowHidden && !stackedMedia) || negativeFollow || initialContainingBlockRisk) && !input.documentedTransition;
  if (cssSpillRisk) failures.push("hero_css_can_spill_into_body");
  if (initialContainingBlockRisk) failures.push("hero_media_uses_initial_containing_block");
  const visualBottomCandidates = [bottom(input.media), bottom(input.overlay), bottom(input.hero)].filter(
    (value): value is number => value != null,
  );
  const visualSeparationPx = firstContent && visualBottomCandidates.length
    ? firstContent.top - Math.max(...visualBottomCandidates)
    : separationPx(input.hero, input.following);
  const minSeparation = input.minSeparationPx ?? DEFAULT_STACKED_SEPARATION_PX;
  if (!input.documentedTransition && visualSeparationPx != null && visualSeparationPx < minSeparation && visualOverlap <= 2) {
    failures.push("hero_missing_breathing_room");
  }
  return {
    gate: HERO_CONTENT_SEPARATION_GATE,
    overlapPx: visualOverlap,
    mediaOverlapPx: mediaOverlap,
    overlayOverlapPx: overlayOverlap,
    visualSeparationPx,
    cssSpillRisk,
    initialContainingBlockRisk,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

export { evaluateCardTextRhythm } from "./card-text-rhythm";
export {
  evaluateSemanticNavigationRenderedQuality,
  FOUNDER_LEARN_NEXT_NAV_FIXTURE,
  GOOD_SEMANTIC_NAV_RENDERED_FIXTURE,
} from "./semantic-navigation-rendered-quality";

export const FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE = {
  hero: { top: 108, height: 810, left: 0, width: 1440 },
  media: { top: 0, height: 1600, left: 0, width: 1440 },
  overlay: null,
  following: { top: 918, height: 8214, left: 0, width: 1440 },
  firstBodyText: { top: 1438, height: 75, left: 367, width: 374 },
  css: `.pv-hero-media { position: absolute; inset: 0; }
header.pv-hero { position: static; overflow: visible; }`,
} as const;
