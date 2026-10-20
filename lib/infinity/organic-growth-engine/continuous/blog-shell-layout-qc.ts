import type { OrganicNamedGate } from "./types";

export const BLOG_SIDEBAR_REQUIREMENT_QC = "BlogSidebarRequirementQc" as const;
export const BLOG_GRID_BALANCE_QC = "BlogGridBalanceQc" as const;
export const BLOG_CONTENT_MEASURE_QC = "BlogContentMeasureQc" as const;
export const BLOG_SHELL_RESPONSIVE_QC = "BlogShellResponsiveQc" as const;

export type BlogShellVenture = "club-throttle" | "occupancynpv";

export type BlogShellLayoutProof = {
  venture: BlogShellVenture;
  viewport: "desktop" | "wide_desktop" | "tablet" | "mobile";
  viewport_width: number;
  container_width: number;
  main_width: number;
  sidebar_width: number;
  sidebar_display: string;
  sidebar_visible: boolean;
  sidebar_has_categories: boolean;
  sidebar_has_tags: boolean;
  sidebar_offscreen: boolean;
  sidebar_overlaps_main: boolean;
  unused_horizontal: number;
  first_card_width: number;
  first_card_text_width: number;
  first_headline_line_count: number;
  document_scroll_width: number;
  horizontal_overflow: boolean;
};

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function ventureShellProfile(venture: BlogShellVenture): {
  sidebar_required_desktop: boolean;
  main_content_dominance_required: boolean;
} {
  return {
    sidebar_required_desktop: true,
    main_content_dominance_required: venture === "occupancynpv",
  };
}

export function evaluateBlogSidebarRequirementQc(proof: BlogShellLayoutProof): OrganicNamedGate {
  const profile = ventureShellProfile(proof.venture);
  const reasons: string[] = [];
  const desktop = proof.viewport === "desktop" || proof.viewport === "wide_desktop";
  if (profile.sidebar_required_desktop && desktop) {
    if (!proof.sidebar_visible) reasons.push("SIDEBAR_MISSING");
    if (proof.sidebar_display === "none") reasons.push("SIDEBAR_DISPLAY_NONE_DESKTOP");
    if (proof.sidebar_width <= 8) reasons.push("SIDEBAR_ZERO_WIDTH");
    if (proof.sidebar_offscreen) reasons.push("SIDEBAR_OFFSCREEN");
    if (!proof.sidebar_has_categories && !proof.sidebar_has_tags) reasons.push("SIDEBAR_EMPTY");
    if (proof.sidebar_overlaps_main) reasons.push("SIDEBAR_OVERLAPS_MAIN");
  }
  if ((proof.viewport === "tablet" || proof.viewport === "mobile") && !proof.sidebar_visible) {
    if (!proof.sidebar_has_categories && !proof.sidebar_has_tags) reasons.push("MOBILE_DISCOVERY_MISSING");
  }
  return named(BLOG_SIDEBAR_REQUIREMENT_QC, reasons);
}

export function evaluateBlogGridBalanceQc(proof: BlogShellLayoutProof): OrganicNamedGate {
  const profile = ventureShellProfile(proof.venture);
  const reasons: string[] = [];
  const desktop = proof.viewport === "desktop" || proof.viewport === "wide_desktop";
  if (!desktop) return named(BLOG_GRID_BALANCE_QC, reasons);

  const editorialWidth = Math.max(proof.container_width, proof.main_width + proof.sidebar_width + 24);
  if (proof.main_width > 0 && proof.sidebar_width > 0 && proof.main_width < proof.sidebar_width * 0.95) {
    reasons.push("MAIN_CRUSHED_BY_SIDEBAR");
  }
  if (profile.main_content_dominance_required && proof.main_width > 0 && proof.sidebar_width > 0) {
    const mainShare = proof.main_width / (proof.main_width + proof.sidebar_width);
    if (mainShare < 0.58) reasons.push("MAIN_NOT_DOMINANT");
  }
  if (proof.unused_horizontal > 180 && proof.main_width > 0 && proof.main_width < editorialWidth * 0.48) {
    reasons.push("UNUSED_CANVAS_WITH_CRAMPED_MAIN");
  }
  if (proof.viewport_width >= 1280 && proof.main_width > 0 && proof.main_width < 520 && proof.container_width >= 900) {
    reasons.push("DESKTOP_TABLET_GRID_ACCIDENT");
  }
  return named(BLOG_GRID_BALANCE_QC, reasons);
}

export function evaluateBlogContentMeasureQc(proof: BlogShellLayoutProof): OrganicNamedGate {
  const reasons: string[] = [];
  const desktop = proof.viewport === "desktop" || proof.viewport === "wide_desktop";
  if (!desktop || proof.first_card_width <= 0) return named(BLOG_CONTENT_MEASURE_QC, reasons);

  const wideCanvas = proof.container_width >= 960 || proof.viewport_width >= 1440;
  const copyShare =
    proof.first_card_width > 0 && proof.first_card_text_width > 0
      ? proof.first_card_text_width / proof.first_card_width
      : 0;
  const splitRowCard = proof.first_card_width >= 560 && copyShare > 0.12 && copyShare < 0.58;
  const crampedMeasure = proof.first_card_text_width > 0 && proof.first_card_text_width < 420;
  if (wideCanvas && !splitRowCard && crampedMeasure && proof.unused_horizontal > 120 && proof.main_width < 720) {
    reasons.push("CARD_TEXT_CRAMPED_WITH_UNUSED_WIDTH");
  }
  if (
    proof.first_headline_line_count >= 5
    && proof.first_card_text_width > 0
    && (splitRowCard ? copyShare < 0.28 : proof.first_card_text_width < 480)
  ) {
    reasons.push("HEADLINE_EXCESSIVELY_COMPRESSED");
  }
  if (
    proof.main_width >= 720
    && proof.first_card_width > 0
    && proof.first_card_width < proof.main_width * 0.55
    && proof.unused_horizontal > 160
  ) {
    reasons.push("CARD_NARROWER_THAN_MAIN_COLUMN");
  }
  return named(BLOG_CONTENT_MEASURE_QC, reasons);
}

export function evaluateBlogShellResponsiveQc(proof: BlogShellLayoutProof): OrganicNamedGate {
  const reasons: string[] = [];
  if (proof.horizontal_overflow) reasons.push("HORIZONTAL_OVERFLOW");
  if (proof.viewport === "mobile" && proof.document_scroll_width > proof.viewport_width + 12) {
    reasons.push("MOBILE_OVERFLOW");
  }
  if ((proof.viewport === "mobile" || proof.viewport === "tablet") && proof.main_width > 0) {
    const minShare = proof.viewport === "mobile" ? 0.58 : 0.48;
    if (proof.main_width < proof.viewport_width * minShare) {
      reasons.push("MOBILE_MAIN_COLUMN_TOO_NARROW");
    }
  }
  if ((proof.viewport === "mobile" || proof.viewport === "tablet") && proof.sidebar_overlaps_main) {
    reasons.push("SIDEBAR_OVERLAPS_MAIN");
  }
  return named(BLOG_SHELL_RESPONSIVE_QC, reasons);
}

export function evaluateBlogShellLayoutQc(proof: BlogShellLayoutProof): {
  sidebar: OrganicNamedGate;
  grid: OrganicNamedGate;
  measure: OrganicNamedGate;
  responsive: OrganicNamedGate;
  pass: boolean;
} {
  const sidebar = evaluateBlogSidebarRequirementQc(proof);
  const grid = evaluateBlogGridBalanceQc(proof);
  const measure = evaluateBlogContentMeasureQc(proof);
  const responsive = evaluateBlogShellResponsiveQc(proof);
  const pass =
    sidebar.result === "PASS"
    && grid.result === "PASS"
    && measure.result === "PASS"
    && responsive.result === "PASS";
  return { sidebar, grid, measure, responsive, pass };
}
