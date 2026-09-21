import type { Gate, PublicPageArchetype } from "./types";

export const AUTHORITY_SECTION_WIDTH_GATE = "AuthoritySectionWidthGate" as const;
export const SEMANTIC_NAVIGATION_BREAKOUT_LAYOUT_GATE = "SemanticNavigationBreakoutLayoutGate" as const;
export const BALANCED_CARD_GRID_GATE = "BalancedCardGridGate" as const;
export const AUTHORITY_SOURCE_RENDERED_QUALITY_GATE = "AuthoritySourceRenderedQualityGate" as const;
export const AUTHORITY_SECTION_SHELL_CONSISTENCY_GATE = "AuthoritySectionShellConsistencyGate" as const;

export const WIDE_MODULE_KINDS = [
  "semantic_navigation",
  "trusted_sources",
  "tables",
  "worked_examples",
  "cta",
  "visuals",
  "decision_frameworks",
  "multi_card_blocks",
] as const;

export type WideModuleKind = (typeof WIDE_MODULE_KINDS)[number];
export type FourCardLayout = "4x1" | "2x2" | "3+1_justified";
export type FiveCardLayout = "3+2" | "2+2+1_justified";
export type SixCardLayout = "3x2" | "2x3";

export type AuthorityContentWidthProfile = {
  model: "AuthorityContentWidthProfile";
  pageShellMaxWidth: number;
  authoritySectionMaxWidth: number;
  proseMaxWidth: number;
  wideModuleMaxWidth: number;
  fullBleedAllowed: boolean;
  desktopOuterGutter: number;
  mobileOuterGutter: number;
  minDesktopShellUtilization: number;
  minUsefulCardWidth: number;
  preferredFourCardLayout: FourCardLayout;
  preferredFiveCardLayout: FiveCardLayout;
  preferredSixCardLayout: SixCardLayout;
  proseMinWidth: number;
  proseMaxComfortWidth: number;
  breakoutEligibility: readonly WideModuleKind[];
};

export type RenderedWidthHierarchy = {
  viewportWidth: number;
  pageShellWidth?: number;
  authorityShellWidth: number;
  proseWidth: number;
  semanticNavWidth: number;
  trustedSourcesWidth: number;
  tableWidth?: number;
  ctaWidth?: number;
  relatedWidth?: number;
  archetype?: PublicPageArchetype;
};

export type RenderedCardGrid = {
  cardCount: number;
  columnCount: number;
  rowCount: number;
  lastRowCount: number;
  cardWidths: readonly number[];
  cardHeights: readonly number[];
  titleLineCounts?: readonly number[];
  descriptionLineCounts?: readonly number[];
  justifiedLoneLastCard?: boolean;
  viewportWidth?: number;
};

export type RenderedSourceSection = {
  sectionWidth: number;
  shellWidth: number;
  desktopColumns: number;
  viewportWidth: number;
  hasTitle: boolean;
  hasHierarchy: boolean;
  linkCount: number;
  cramped: boolean;
  mobileStacked?: boolean;
};

export function defaultAuthorityContentWidthProfile(): AuthorityContentWidthProfile {
  return {
    model: "AuthorityContentWidthProfile",
    pageShellMaxWidth: 1280,
    authoritySectionMaxWidth: 1120,
    proseMaxWidth: 800,
    wideModuleMaxWidth: 1120,
    fullBleedAllowed: false,
    desktopOuterGutter: 32,
    mobileOuterGutter: 20,
    minDesktopShellUtilization: 0.68,
    minUsefulCardWidth: 240,
    preferredFourCardLayout: "2x2",
    preferredFiveCardLayout: "3+2",
    preferredSixCardLayout: "3x2",
    proseMinWidth: 720,
    proseMaxComfortWidth: 860,
    breakoutEligibility: WIDE_MODULE_KINDS,
  };
}

export function adaptAuthorityContentWidthProfile(
  overrides: Partial<Omit<AuthorityContentWidthProfile, "model">>,
): AuthorityContentWidthProfile {
  return { ...defaultAuthorityContentWidthProfile(), ...overrides };
}

function desktop(viewport: number): boolean {
  return viewport >= 1200;
}

function tablet(viewport: number): boolean {
  return viewport >= 768 && viewport < 1200;
}

export function evaluateAuthoritySectionWidth(
  input: RenderedWidthHierarchy,
  profile: AuthorityContentWidthProfile = defaultAuthorityContentWidthProfile(),
): {
  gate: typeof AUTHORITY_SECTION_WIDTH_GATE;
  shellUtilization: number;
  proseInComfortRange: boolean;
  modulesTrappedInProse: boolean;
  overall: Gate;
  failures: string[];
} {
  const failures: string[] = [];
  const legal = input.archetype === "LEGAL";
  const shellUtilization = input.viewportWidth > 0 ? input.authorityShellWidth / input.viewportWidth : 0;
  const proseInComfortRange =
    input.proseWidth >= profile.proseMinWidth - 40 && input.proseWidth <= profile.proseMaxComfortWidth + 40;
  const navTrapped =
    desktop(input.viewportWidth) &&
    input.semanticNavWidth > 0 &&
    input.semanticNavWidth <= input.proseWidth + 16 &&
    input.proseWidth < 900;
  const sourcesTrapped =
    desktop(input.viewportWidth) &&
    input.trustedSourcesWidth > 0 &&
    input.trustedSourcesWidth <= input.proseWidth + 16 &&
    input.proseWidth < 900;
  const tableTrapped =
    desktop(input.viewportWidth) &&
    (input.tableWidth ?? 0) > 0 &&
    (input.tableWidth ?? 0) <= input.proseWidth + 16 &&
    input.authorityShellWidth - (input.tableWidth ?? 0) > 80;
  const ctaUndersized =
    desktop(input.viewportWidth) &&
    (input.ctaWidth ?? 0) > 0 &&
    (input.ctaWidth ?? 0) <= input.proseWidth + 16 &&
    input.proseWidth < 900;
  const skinnyShell =
    desktop(input.viewportWidth) && !legal && shellUtilization < profile.minDesktopShellUtilization;
  const proseTooWide = desktop(input.viewportWidth) && input.proseWidth > profile.proseMaxComfortWidth + 80;
  const modulesTrappedInProse = !legal && (navTrapped || sourcesTrapped);
  if (skinnyShell) failures.push("authority_shell_underuses_viewport");
  if (modulesTrappedInProse) failures.push("wide_modules_trapped_in_prose_column");
  if (sourcesTrapped) failures.push("trusted_sources_cramped_in_prose");
  if (tableTrapped) failures.push("table_artificially_narrow");
  if (ctaUndersized) failures.push("cta_band_undersized");
  if (proseTooWide) failures.push("prose_too_wide_for_reading");
  if (desktop(input.viewportWidth) && !legal && !proseInComfortRange && input.proseWidth > 0 && input.proseWidth < profile.proseMinWidth - 40) {
    failures.push("prose_too_narrow");
  }
  return {
    gate: AUTHORITY_SECTION_WIDTH_GATE,
    shellUtilization,
    proseInComfortRange,
    modulesTrappedInProse,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

export function evaluateSemanticNavigationBreakoutLayout(input: {
  viewportWidth: number;
  navWidth: number;
  proseWidth: number;
  cardWidths: readonly number[];
  titleLineCounts?: readonly number[];
  iconContainerPx?: number;
  cardCount?: number;
  css?: string;
  archetype?: PublicPageArchetype;
  profile?: AuthorityContentWidthProfile;
}): {
  gate: typeof SEMANTIC_NAVIGATION_BREAKOUT_LAYOUT_GATE;
  overall: Gate;
  failures: string[];
} {
  const profile = input.profile ?? defaultAuthorityContentWidthProfile();
  const failures: string[] = [];
  if (input.archetype === "LEGAL") {
    return { gate: SEMANTIC_NAVIGATION_BREAKOUT_LAYOUT_GATE, overall: "PASS", failures };
  }
  const trapped =
    desktop(input.viewportWidth) &&
    input.navWidth > 0 &&
    input.navWidth <= input.proseWidth + 16 &&
    input.proseWidth < 900;
  if (trapped) failures.push("semantic_nav_trapped_in_prose");
  const narrowCards = input.cardWidths.filter((width) => width > 0 && width < profile.minUsefulCardWidth);
  if (desktop(input.viewportWidth) && narrowCards.length > 0) failures.push("desktop_cards_below_useful_width");
  const extremeWrap = (input.titleLineCounts ?? []).some((count) => count >= 5);
  if (desktop(input.viewportWidth) && extremeWrap) failures.push("desktop_title_wraps_like_mobile_tile");
  if (
    desktop(input.viewportWidth) &&
    input.iconContainerPx != null &&
    input.iconContainerPx < 44
  ) {
    failures.push("icon_scale_too_small");
  }
  const breakoutCss =
    /pv-wide-module|pv-authority-shell|--pv-authority-shell/.test(input.css ?? "") ||
    (input.navWidth > input.proseWidth + 40 && desktop(input.viewportWidth));
  if (desktop(input.viewportWidth) && input.navWidth > 0 && !breakoutCss && trapped) {
    failures.push("missing_breakout_layout");
  }
  return {
    gate: SEMANTIC_NAVIGATION_BREAKOUT_LAYOUT_GATE,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

export function evaluateBalancedCardGrid(input: RenderedCardGrid): {
  gate: typeof BALANCED_CARD_GRID_GATE;
  layout: string;
  loneLastCard: boolean;
  overall: Gate;
  failures: string[];
} {
  const failures: string[] = [];
  const loneLastCard = input.lastRowCount === 1 && input.rowCount > 1 && !input.justifiedLoneLastCard;
  const fourCardThreePlusOne =
    input.cardCount === 4 && input.columnCount === 3 && input.lastRowCount === 1;
  const fiveCardFourPlusOne =
    input.cardCount === 5 && input.lastRowCount === 1 && input.columnCount >= 4;
  const sixCardLone =
    input.cardCount === 6 && input.lastRowCount === 1;
  if (fourCardThreePlusOne) failures.push("four_card_three_plus_one");
  if (fiveCardFourPlusOne) failures.push("five_card_four_plus_one");
  if (sixCardLone) failures.push("six_card_lone_last");
  if (loneLastCard && !fourCardThreePlusOne && !fiveCardFourPlusOne && !sixCardLone) {
    failures.push("awkward_lone_last_card");
  }
  const heights = input.cardHeights.filter((height) => height > 0);
  if (heights.length >= 2) {
    const spread = Math.max(...heights) - Math.min(...heights);
    if (spread > 48 && (input.viewportWidth ?? 1280) >= 1024) failures.push("uneven_row_heights");
  }
  const layout =
    input.cardCount === 4 && input.columnCount === 4 && input.rowCount === 1
      ? "4x1"
      : input.cardCount === 4 && input.columnCount === 2 && input.rowCount === 2
        ? "2x2"
        : input.cardCount === 5 && input.lastRowCount === 2
          ? "3+2"
          : input.cardCount === 6 && input.columnCount === 3 && input.rowCount === 2
            ? "3x2"
            : input.cardCount === 6 && input.columnCount === 2 && input.rowCount === 3
              ? "2x3"
              : `${input.columnCount}x${input.rowCount}`;
  return {
    gate: BALANCED_CARD_GRID_GATE,
    layout,
    loneLastCard,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

export function evaluateAuthoritySourceRenderedQuality(input: RenderedSourceSection): {
  gate: typeof AUTHORITY_SOURCE_RENDERED_QUALITY_GATE;
  overall: Gate;
  failures: string[];
} {
  const failures: string[] = [];
  if (input.linkCount < 1) failures.push("missing_source_links");
  if (!input.hasTitle) failures.push("missing_source_title");
  if (!input.hasHierarchy) failures.push("missing_source_hierarchy");
  if (desktop(input.viewportWidth) && input.sectionWidth + 24 < input.shellWidth && input.shellWidth - input.sectionWidth > 80) {
    failures.push("sources_not_using_wide_shell");
  }
  if (desktop(input.viewportWidth) && input.desktopColumns < 2 && input.linkCount >= 4) {
    failures.push("sources_single_column_on_desktop");
  }
  if (input.cramped) failures.push("source_text_cramped");
  if (input.viewportWidth <= 480 && input.mobileStacked === false) failures.push("sources_not_stacking_on_mobile");
  return {
    gate: AUTHORITY_SOURCE_RENDERED_QUALITY_GATE,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

export function evaluateAuthoritySectionShellConsistency(input: {
  proseWidth: number;
  moduleWidths: readonly number[];
  shellWidth: number;
  archetype?: PublicPageArchetype;
}): {
  gate: typeof AUTHORITY_SECTION_SHELL_CONSISTENCY_GATE;
  overall: Gate;
  failures: string[];
} {
  const failures: string[] = [];
  if (input.archetype === "LEGAL") {
    return { gate: AUTHORITY_SECTION_SHELL_CONSISTENCY_GATE, overall: "PASS", failures };
  }
  const modules = input.moduleWidths.filter((width) => width > 0);
  if (modules.length >= 2) {
    const spread = Math.max(...modules) - Math.min(...modules);
    if (spread > 48) failures.push("wide_module_width_jump");
  }
  if (modules.some((width) => Math.abs(width - input.shellWidth) > 48)) {
    failures.push("module_not_aligned_to_shell");
  }
  if (input.proseWidth > 0 && modules.some((width) => width + 24 < input.proseWidth)) {
    failures.push("module_narrower_than_prose");
  }
  if (input.proseWidth > 0 && input.shellWidth > 0 && input.proseWidth > input.shellWidth + 8) {
    failures.push("prose_wider_than_shell");
  }
  return {
    gate: AUTHORITY_SECTION_SHELL_CONSISTENCY_GATE,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

export function evaluateCrossRouteWidthConsistency(
  behaviors: Array<{
    archetype: PublicPageArchetype | string;
    shellUtilization: number;
    proseInRange: boolean;
    modulesBreakOut: boolean;
  }>,
): Gate {
  const authority = behaviors.filter((item) => item.archetype !== "LEGAL");
  if (authority.length < 2) return "PASS";
  if (authority.some((item) => !item.proseInRange || !item.modulesBreakOut)) return "FAIL";
  const utils = authority.map((item) => item.shellUtilization);
  return Math.max(...utils) - Math.min(...utils) <= 0.18 ? "PASS" : "FAIL";
}

export const FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE: RenderedWidthHierarchy = {
  viewportWidth: 1440,
  pageShellWidth: 1440,
  authorityShellWidth: 736,
  proseWidth: 736,
  semanticNavWidth: 708,
  trustedSourcesWidth: 708,
  tableWidth: 708,
  ctaWidth: 708,
  relatedWidth: 708,
  archetype: "QUESTION_AUTHORITY",
};

export const FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE: RenderedCardGrid = {
  cardCount: 4,
  columnCount: 3,
  rowCount: 2,
  lastRowCount: 1,
  cardWidths: [220, 220, 220, 220],
  cardHeights: [220, 220, 220, 168],
  titleLineCounts: [6, 3, 4, 2],
  descriptionLineCounts: [4, 3, 3, 2],
  viewportWidth: 1440,
};

export const FOUNDER_NARROW_CARD_WRAP_FIXTURE = {
  viewportWidth: 1440,
  navWidth: 708,
  proseWidth: 736,
  cardWidths: [214, 214, 214],
  titleLineCounts: [7, 5, 6],
  iconContainerPx: 38,
  cardCount: 4,
  css: ".sn-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }",
};

export const GOOD_PROSE_PLUS_BREAKOUT_FIXTURE: RenderedWidthHierarchy = {
  viewportWidth: 1440,
  pageShellWidth: 1376,
  authorityShellWidth: 1120,
  proseWidth: 832,
  semanticNavWidth: 1120,
  trustedSourcesWidth: 1120,
  tableWidth: 1120,
  ctaWidth: 1120,
  relatedWidth: 1120,
  archetype: "QUESTION_AUTHORITY",
};

export const GOOD_FOUR_CARD_BREAKOUT_GRID: RenderedCardGrid = {
  cardCount: 4,
  columnCount: 2,
  rowCount: 2,
  lastRowCount: 2,
  cardWidths: [536, 536, 536, 536],
  cardHeights: [168, 168, 168, 168],
  titleLineCounts: [2, 2, 1, 2],
  descriptionLineCounts: [2, 2, 2, 2],
  viewportWidth: 1440,
};

export const GOOD_SOURCE_SECTION_FIXTURE: RenderedSourceSection = {
  sectionWidth: 1120,
  shellWidth: 1120,
  desktopColumns: 2,
  viewportWidth: 1440,
  hasTitle: true,
  hasHierarchy: true,
  linkCount: 6,
  cramped: false,
  mobileStacked: true,
};
