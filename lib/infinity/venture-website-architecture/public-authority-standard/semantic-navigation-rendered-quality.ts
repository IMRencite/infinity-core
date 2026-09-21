import type { Gate } from "./types";
import { evaluateCardTextRhythm } from "./card-text-rhythm";
import { evaluateVisualDeadSpace } from "../visual-quality-gates";

export const SEMANTIC_NAVIGATION_RENDERED_QUALITY_GATE = "SemanticNavigationRenderedQualityGate" as const;

const CIRCLE_ONLY_ICON = /M12 3a9 9 0 1 0 9 9(?: 9 9 0 0 0-9-9z)?$/;
const CIRCLE_ONLY_LOOSE = /M12 3a9 9 0 1 0 9 9/;
const PAUSE_BAR_ICON = /M7 4h3v16H7zm7 4h3v12h-3z/;
const HEAD_ONLY_ROLE = /^M12 12a3\.5 3\.5 0 1 0-3\.5-3\.5/;

function rootWord(value: string): string {
  return (value.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasReadableGlyph(path: string): boolean {
  const compact = path.replace(/\s+/g, " ").trim();
  if (!compact) return false;
  if (CIRCLE_ONLY_ICON.test(compact)) return false;
  if (CIRCLE_ONLY_LOOSE.test(compact) && compact.length < 48) return false;
  if (PAUSE_BAR_ICON.test(compact)) return false;
  if (HEAD_ONLY_ROLE.test(compact) && !/V21|h16|shoulders|4\.5/.test(compact)) return false;
  return /[A-Za-z]/.test(compact) && compact.length >= 18;
}

export function evaluateKickerTitleRedundancy(kicker?: string, title?: string, description?: string): Gate {
  const kick = rootWord(kicker ?? "");
  const head = rootWord(title ?? "");
  if (kick && head && kick === head) return "FAIL";
  const desc = rootWord(description ?? "");
  if (kick && desc && kick === head && kick === desc) return "FAIL";
  return "PASS";
}

export function evaluateSemanticNavigationRenderedQuality(input: {
  css: string;
  html?: string;
  kicker?: string;
  title?: string;
  description?: string;
  iconPaths?: readonly string[];
  cardHeights?: readonly number[];
  lastLineWordCounts?: readonly number[];
  titles?: readonly string[];
  descriptions?: readonly string[];
  iconBounds?: readonly { width: number; height: number }[];
  cardCount?: number;
  danglingLastRow?: number;
}): {
  gate: typeof SEMANTIC_NAVIGATION_RENDERED_QUALITY_GATE;
  iconDistinctness: Gate;
  equalRowHeight: Gate;
  lastLineOrphan: Gate;
  kickerTitleRedundancy: Gate;
  iconFamily: Gate;
  deadSpace: Gate;
  gridBalance: Gate;
  focus: Gate;
  rhythm: ReturnType<typeof evaluateCardTextRhythm>;
  overall: Gate;
  failures: string[];
} {
  const failures: string[] = [];
  const paths = input.iconPaths ?? [];
  const circleOnly = paths.some((path) => !hasReadableGlyph(path) || CIRCLE_ONLY_LOOSE.test(path) && path.length < 60 && !/zm\.|question|m12 8|h-1\.5/.test(path));
  const emptyOrMissing = paths.some((path) => !path || path.length < 12);
  const pauseBars = paths.some((path) => PAUSE_BAR_ICON.test(path));
  const mixedAmbiguous = (circleOnly || paths.some((path) => CIRCLE_ONLY_LOOSE.test(path) && path.length < 48)) && pauseBars;
  const uniquePaths = new Set(paths);
  const sameGeneric = paths.length >= 3 && uniquePaths.size === 1 && circleOnly;
  const iconDistinctness = circleOnly || emptyOrMissing || mixedAmbiguous || sameGeneric ? "FAIL" : "PASS";
  if (circleOnly || emptyOrMissing) failures.push("undifferentiated_circle_icon");
  if (emptyOrMissing) failures.push("missing_icon_glyph");
  if (mixedAmbiguous) failures.push("inconsistent_pause_vs_dot_icons");
  if (sameGeneric) failures.push("identical_generic_icons");
  const familyConsistent =
    /currentColor/.test(input.css) ||
    /\.sn-icon svg/.test(input.css);
  const mixedFamily = mixedAmbiguous || (pauseBars && paths.some((path) => CIRCLE_ONLY_LOOSE.test(path)));
  const iconFamily = !mixedFamily && familyConsistent ? "PASS" : "FAIL";
  if (iconFamily === "FAIL") failures.push("incoherent_icon_family");
  const clipped = (input.iconBounds ?? []).some((box) => box.width < 8 || box.height < 8);
  if (clipped) failures.push("icon_clipped_or_undersized");
  const stretch =
    /\.sn-grid[\s\S]{0,160}align-items:\s*stretch/.test(input.css) ||
    (/\.sn-card[\s\S]{0,200}height:\s*100%/.test(input.css) && /\.sn-grid[\s\S]{0,80}grid/.test(input.css));
  const heights = input.cardHeights ?? [];
  const rowSpread = heights.length >= 2 ? Math.max(...heights) - Math.min(...heights) : 0;
  const equalRowHeight = stretch && rowSpread <= 8 ? "PASS" : "FAIL";
  if (equalRowHeight === "FAIL") failures.push("uneven_semantic_nav_card_heights");
  const rhythm = evaluateCardTextRhythm({
    titles: input.titles,
    descriptions: input.descriptions,
    lastLineWordCounts: input.lastLineWordCounts,
    css: input.css,
  });
  const lastLineOrphan = rhythm.orphanCount > 0 ? "FAIL" : "PASS";
  if (lastLineOrphan === "FAIL") failures.push("semantic_nav_last_line_orphan");
  const kickerTitleRedundancy = evaluateKickerTitleRedundancy(input.kicker, input.title, input.description);
  if (kickerTitleRedundancy === "FAIL") failures.push("kicker_repeats_title");
  const html = input.html ?? "";
  const deadSpace = html
    ? evaluateVisualDeadSpace(html).overall
    : /sn-icon[\s\S]{0,80}(2\.4rem|2\.6rem|2\.5rem)/.test(input.css) && /sn-desc/.test(input.css)
      ? "PASS"
      : "FAIL";
  if (deadSpace === "FAIL") failures.push("semantic_nav_visual_dead_space");
  const count = input.cardCount ?? paths.length;
  const fiveCardBalance = count !== 5 || /\.sn-grid--count-5/.test(input.css) || input.danglingLastRow === 0;
  const gridBalance = fiveCardBalance && !/overflow-x:\s*scroll/.test(input.css) ? "PASS" : "FAIL";
  if (gridBalance === "FAIL") failures.push("unbalanced_semantic_nav_grid");
  const focus = /\.sn-card:focus-visible[\s\S]{0,160}outline:\s*2px/.test(input.css) ? "PASS" : "FAIL";
  if (focus === "FAIL") failures.push("semantic_nav_focus_not_visible");
  const overall =
    iconDistinctness === "PASS" &&
    equalRowHeight === "PASS" &&
    lastLineOrphan === "PASS" &&
    kickerTitleRedundancy === "PASS" &&
    iconFamily === "PASS" &&
    deadSpace === "PASS" &&
    gridBalance === "PASS" &&
    focus === "PASS" &&
    rhythm.overall === "PASS"
      ? "PASS"
      : "FAIL";
  return {
    gate: SEMANTIC_NAVIGATION_RENDERED_QUALITY_GATE,
    iconDistinctness,
    equalRowHeight,
    lastLineOrphan,
    kickerTitleRedundancy,
    iconFamily,
    deadSpace,
    gridBalance,
    focus,
    rhythm,
    overall,
    failures,
  };
}

export const FOUNDER_LEARN_NEXT_NAV_FIXTURE = {
  kicker: "LEARN NEXT",
  title: "Learn the ideas behind the steps",
  description: "Learn more about the steps.",
  iconPaths: [
    "M7 4h3v16H7zm7 4h3v12h-3z",
    "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z",
    "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z",
    "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z",
    "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z",
  ],
  cardHeights: [168, 188, 142, 170, 164],
  lastLineWordCounts: [1, 1, 1, 2, 1],
  cardCount: 5,
  danglingLastRow: 1,
  css: `.sn-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sn-card { display: flex; align-items: flex-start; min-height: 0; }
.sn-card:focus-visible { outline: none; }`,
} as const;

export const GOOD_SEMANTIC_NAV_RENDERED_FIXTURE = {
  kicker: "LEARN NEXT",
  title: "Explore related ideas",
  description: "See the ideas that change how you compare options.",
  iconPaths: [
    "M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z",
    "M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z",
    "M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z",
    "M12 3.2A8.8 8.8 0 1 0 20.8 12 8.8 8.8 0 0 0 12 3.2zm.7 13.3h-1.4v-1a3.8 3.8 0 0 1-2.4-1.1l1-1.2a2.6 2.6 0 0 0 1.9.9c.7 0 1.2-.3 1.2-.9s-.6-.8-1.9-1.2-2.6-.8-2.6-2.3 1-2.3 2.4-2.5V6.8h1.4v1a3.4 3.4 0 0 1 2 1l-1 1.2a2.2 2.2 0 0 0-1.6-.7c-.6 0-1 .3-1 1s.6.7 2 1.2 2.6 1 2.6 2.4-1.1 2.4-2.6 2.6z",
    "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z",
  ],
  cardHeights: [176, 176, 176, 176, 176],
  lastLineWordCounts: [3, 4, 3, 3, 4],
  titles: [
    "Weigh two options",
    "See the money path",
    "Read the topic map",
    "Open the cost stack",
    "Walk the workflow",
  ],
  descriptions: [
    "See both offers on one shared timeline.",
    "See why later cash is not the same as cash today.",
    "Jump to the idea that changes the comparison.",
    "Add the extras that sit beside face rent.",
    "Follow the steps before you pick a number.",
  ],
  cardCount: 5,
  danglingLastRow: 0,
  html: `<nav class="sn-block"><div class="sn-grid sn-grid--count-5"></div></nav>`,
  css: `.sn-grid { display: grid; align-items: stretch; }
.sn-grid--count-5 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.sn-card { height: 100%; }
.sn-icon { width: 2.6rem; height: 2.6rem; color: #1d4e89; }
.sn-icon svg { fill: currentColor; }
.sn-desc, .sn-copy strong { text-wrap: balance; }
.sn-card:focus-visible { outline: 2px solid #1d4e89; outline-offset: 3px; }`,
} as const;
