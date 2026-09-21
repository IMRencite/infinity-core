import {
  AUTHORITY_VISUAL_ASSET_COVERAGE_GATE,
  LONG_FORM_TEXT_WALL_GATE,
  RENDERED_COMPOSITION_QUALITY_GATE,
  RENDERED_TABLE_QUALITY_GATE,
  VISUAL_DEAD_SPACE_GATE,
} from "./constants";
import { inspectFooterLayout } from "@/lib/infinity/public-venture-design/rendered-layout/geometry";
import { SEO_GEO_AUTHORITY_CSS } from "./digital-real-estate-css";
import { founderDefectHtml, founderDefectCss } from "./visual-quality-founder-fixtures";

export type Gate = "PASS" | "FAIL";

function consecutiveProseRun(html: string): number {
  const blocks = html.split(/<(?:table|ul|ol|aside|figure|header|nav|div className="pv-)/i);
  return Math.max(0, ...blocks.map((block) => (block.match(/<p[>\s]/g) ?? []).length));
}

function realImageSrcs(html: string): string[] {
  return [...html.matchAll(/<(?:img|Image)\b[^>]*src=\{?["']([^"']+)["']/g)].map((match) => match[1]);
}

function cssOnlyVisuals(html: string): boolean {
  const images = realImageSrcs(html);
  return images.length === 0 && /linear-gradient|radial-gradient|pv-hero-authority/.test(html);
}

export function evaluateVisibleFooterGutter(css: string): {
  desktopMarginPx: number;
  mobileMarginPx: number;
  backgroundTouchesViewport: boolean;
  overall: Gate;
} {
  const desktopCss = css.replace(/@media[^{]+\{[\s\S]*?\n\}/g, "");
  const blocks = [...desktopCss.matchAll(/\.vg-legal-footer,\s*footer\[data-infinity-footer\][\s\S]*?\}/g)].map((match) => match[0]);
  const fallback = [...desktopCss.matchAll(/\.vg-legal-footer \{[\s\S]*?\}/g)].map((match) => match[0]);
  const block = blocks.at(-1) ?? fallback.at(-1) ?? "";
  const mobiles = [...css.matchAll(/@media \(max-width: 640px\)[\s\S]*?\.vg-legal-footer,\s*footer\[data-infinity-footer\][\s\S]*?\}/g)].map((match) => match[0]);
  const mobile = mobiles.at(-1) ?? "";
  const desktopMargin = Number(block.match(/margin:[^;]*?\s(\d+)px/)?.[1] ?? 0);
  const mobileMargin = Number(mobile.match(/margin:[^;]*?\s(\d+)px/)?.[1] ?? desktopMargin);
  const backgroundTouchesViewport = desktopMargin < 24;
  return {
    desktopMarginPx: desktopMargin,
    mobileMarginPx: mobileMargin,
    backgroundTouchesViewport,
    overall: desktopMargin >= 32 && mobileMargin >= 20 && !backgroundTouchesViewport ? "PASS" : "FAIL",
  };
}

export function clarifyAuthorityTableCounts(html: string): {
  semanticTables: number;
  tableShells: number;
  styledFinancialComponents: number;
  visibleTableInstances: number;
  priorThreeVsSix: string;
} {
  const semanticTables = (html.match(/<table\b/g) ?? []).length;
  const tableShells = (html.match(/pv-table-shell/g) ?? []).length;
  const styledFinancialComponents = (html.match(/pv-fin-table|pv-table-shell/g) ?? []).length;
  return {
    semanticTables,
    tableShells,
    styledFinancialComponents,
    visibleTableInstances: semanticTables,
    priorThreeVsSix:
      "3 was semantic <table> count on the representative question page. 6 was regex matches of pv-fin-table plus pv-table-shell on those same three tables.",
  };
}

export function evaluateRenderedTableQuality(html: string): {
  gate: typeof RENDERED_TABLE_QUALITY_GATE;
  tables: number;
  styled: number;
  outerMargin: Gate;
  innerPadding: Gate;
  utilization: Gate;
  headerContrast: Gate;
  rowReadability: Gate;
  caption: Gate;
  mobile: Gate;
  overall: Gate;
  failures: string[];
} {
  const tables = (html.match(/<table/g) ?? []).length;
  const styled = (html.match(/pv-fin-table|pv-table-shell/g) ?? []).length;
  const failures: string[] = [];
  if (tables === 0) failures.push("NO_TABLE");
  if (styled < 2) failures.push("UNSTYLED_TABLE");
  if (!/pv-table-shell/.test(html)) failures.push("MISSING_OUTER_SHELL");
  if (!/pv-analysis-board/.test(html) && /pv-data-panel/.test(html) && !/pv-table-shell/.test(html)) {
    failures.push("OVERSIZED_DARK_PANEL");
  }
  if (!/caption/.test(html)) failures.push("CAPTION");
  if (!/thead/.test(html)) failures.push("HEADER");
  return {
    gate: RENDERED_TABLE_QUALITY_GATE,
    tables,
    styled,
    outerMargin: /pv-table-shell|pv-analysis-board/.test(html) ? "PASS" : "FAIL",
    innerPadding: /pv-fin-table th|pv-table-shell/.test(html) ? "PASS" : "FAIL",
    utilization: /width: fit-content|pv-table-shell/.test(html) ? "PASS" : "FAIL",
    headerContrast: /thead/.test(html) ? "PASS" : "FAIL",
    rowReadability: /nth-child\(even\)|pv-fin-table/.test(html) ? "PASS" : "FAIL",
    caption: /caption/.test(html) ? "PASS" : "FAIL",
    mobile: /overflow-x:\s*auto/.test(html) || /pv-table-shell/.test(html) ? "PASS" : "FAIL",
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

export function evaluateVisualDeadSpace(html: string): {
  gate: typeof VISUAL_DEAD_SPACE_GATE;
  oversizedDarkPanel: boolean;
  overall: Gate;
} {
  const oversized =
    /pv-data-panel/.test(html) &&
    !/pv-table-shell/.test(html) &&
    /width:\s*100%|min-height:\s*[3-9]\d{2}/.test(html);
  const emptyDark = /pv-formula/.test(html) && !/pv-analysis-board/.test(html) && oversized;
  return {
    gate: VISUAL_DEAD_SPACE_GATE,
    oversizedDarkPanel: oversized || emptyDark,
    overall: oversized || emptyDark ? "FAIL" : /pv-table-shell/.test(html) || !/<table/.test(html) ? "PASS" : "FAIL",
  };
}

export function evaluateLongFormTextWall(html: string): {
  gate: typeof LONG_FORM_TEXT_WALL_GATE;
  longestProseRun: number;
  overall: Gate;
} {
  const longestProseRun = consecutiveProseRun(html);
  return {
    gate: LONG_FORM_TEXT_WALL_GATE,
    longestProseRun,
    overall:
      longestProseRun > 8 && !/pv-analysis-board|pv-callout|<ul|<ol|<figure/.test(html)
        ? "FAIL"
        : longestProseRun > 16
          ? "FAIL"
          : "PASS",
  };
}

export function evaluateAuthorityVisualAssetCoverage(input: {
  html: string;
  pageClass: "homepage" | "topic_hub" | "question" | "other";
}): {
  gate: typeof AUTHORITY_VISUAL_ASSET_COVERAGE_GATE;
  realImages: number;
  cssOnlyCountedAsImages: false;
  overall: Gate;
} {
  const realImages = realImageSrcs(input.html).filter((src) => /\.(webp|jpe?g|png|svg)(\?|$)/i.test(src) || src.startsWith("/media/")).length;
  const needsHero = input.pageClass !== "other";
  const fail = needsHero && (realImages < 1 || cssOnlyVisuals(input.html));
  const questionFail = input.pageClass === "question" && realImages < 2;
  return {
    gate: AUTHORITY_VISUAL_ASSET_COVERAGE_GATE,
    realImages,
    cssOnlyCountedAsImages: false,
    overall: fail || questionFail ? "FAIL" : "PASS",
  };
}

export function evaluateRelatedContentDesign(html: string): Gate {
  return /pv-related-editorial/.test(html) && /pv-related-card/.test(html) && !/<p className="pv-surface"><Link/.test(html)
    ? "PASS"
    : "FAIL";
}

export function evaluateSourceReferenceDesign(html: string): Gate {
  return /pv-source-board/.test(html) && /Trusted sources|Sources & Further Reading/i.test(html) ? "PASS" : "FAIL";
}

export function evaluateCtaVisualHierarchy(html: string): Gate {
  return /pv-cta-panel/.test(html) && /PrimaryCTA/.test(html) ? "PASS" : "FAIL";
}

export function evaluateRenderedCompositionQuality(input: {
  html: string;
  css: string;
  screenshots?: Array<{ route: string; viewport: string; path: string }>;
  widthHierarchy?: {
    viewportWidth: number;
    authorityShellWidth: number;
    proseWidth: number;
    semanticNavWidth: number;
    trustedSourcesWidth: number;
    tableWidth?: number;
    ctaWidth?: number;
  };
  cardGrid?: {
    cardCount: number;
    columnCount: number;
    rowCount: number;
    lastRowCount: number;
    cardWidths: readonly number[];
    cardHeights: readonly number[];
  };
  sourceSection?: {
    sectionWidth: number;
    shellWidth: number;
    desktopColumns: number;
    viewportWidth: number;
    hasTitle: boolean;
    hasHierarchy: boolean;
    linkCount: number;
    cramped: boolean;
  };
}): {
  gate: typeof RENDERED_COMPOSITION_QUALITY_GATE;
  footer: ReturnType<typeof evaluateVisibleFooterGutter>;
  table: ReturnType<typeof evaluateRenderedTableQuality>;
  deadSpace: ReturnType<typeof evaluateVisualDeadSpace>;
  textWall: ReturnType<typeof evaluateLongFormTextWall>;
  imagery: ReturnType<typeof evaluateAuthorityVisualAssetCoverage>;
  screenshotEvidence: number;
  widthSystem: Gate;
  overall: Gate;
} {
  const footer = evaluateVisibleFooterGutter(input.css);
  const table = evaluateRenderedTableQuality(input.html);
  const deadSpace = evaluateVisualDeadSpace(input.html);
  const textWall = evaluateLongFormTextWall(input.html);
  const imagery = evaluateAuthorityVisualAssetCoverage({ html: input.html, pageClass: "question" });
  const cssWidthSystem =
    /--pv-authority-shell/.test(input.css) &&
    /--pv-prose-measure/.test(input.css) &&
    /pv-wide-module|sn-block/.test(input.css + input.html);
  const widthSystem: Gate = input.widthHierarchy
    ? input.widthHierarchy.semanticNavWidth > input.widthHierarchy.proseWidth + 24 &&
      input.widthHierarchy.authorityShellWidth / input.widthHierarchy.viewportWidth >= 0.68
      ? "PASS"
      : "FAIL"
    : cssWidthSystem || !/--pv-authority-shell/.test(input.css)
      ? "PASS"
      : "FAIL";
  const gridFail =
    input.cardGrid &&
    input.cardGrid.cardCount === 4 &&
    input.cardGrid.columnCount === 3 &&
    input.cardGrid.lastRowCount === 1;
  const sourceFail =
    input.sourceSection &&
    input.sourceSection.viewportWidth >= 1280 &&
    input.sourceSection.sectionWidth + 80 < input.sourceSection.shellWidth;
  const baseFailures = [footer, table, deadSpace, textWall, imagery].filter((row) => row.overall === "FAIL").length;
  const widthFailures = widthSystem === "FAIL" || Boolean(gridFail) || Boolean(sourceFail) ? 1 : 0;
  return {
    gate: RENDERED_COMPOSITION_QUALITY_GATE,
    footer,
    table,
    deadSpace,
    textWall,
    imagery,
    screenshotEvidence: input.screenshots?.length ?? 0,
    widthSystem,
    overall: baseFailures + widthFailures === 0 ? "PASS" : "FAIL",
  };
}

export function proveFounderFalsePositive(): {
  oldFooterPaddingPass: true;
  oldVisibleBackgroundFail: true;
  oldTablePresencePass: true;
  newTableDeadSpaceFail: true;
  oldVisualizationAttrPass: true;
  newImageCoverageFail: true;
  oldSectionVarietyPass: true;
  newTextWallFail: true;
} {
  const oldFooter = inspectFooterLayout(founderDefectCss(), founderDefectHtml());
  const visible = evaluateVisibleFooterGutter(founderDefectCss());
  const html = founderDefectHtml();
  const table = evaluateRenderedTableQuality(html);
  const dead = evaluateVisualDeadSpace(html);
  const images = evaluateAuthorityVisualAssetCoverage({ html, pageClass: "question" });
  const wall = evaluateLongFormTextWall(html);
  if (oldFooter.overall !== "PASS") throw new Error("old_footer_gate_should_pass_padding");
  if (visible.overall !== "FAIL") throw new Error("visible_footer_should_fail_founder_defect");
  if (!(table.overall === "FAIL" && dead.overall === "FAIL")) throw new Error("new_table_dead_space_should_fail");
  if (!/<table/.test(html)) throw new Error("old_table_presence_should_pass");
  if (!/data-visualization/.test(html)) throw new Error("old_visualization_attr_should_pass");
  if (images.overall !== "FAIL") throw new Error("new_image_coverage_should_fail");
  if ((html.match(/<section/g) ?? []).length < 4) throw new Error("old_section_variety_should_pass");
  if (wall.overall !== "FAIL") throw new Error("new_text_wall_should_fail");
  return {
    oldFooterPaddingPass: true,
    oldVisibleBackgroundFail: true,
    oldTablePresencePass: true,
    newTableDeadSpaceFail: true,
    oldVisualizationAttrPass: true,
    newImageCoverageFail: true,
    oldSectionVarietyPass: true,
    newTextWallFail: true,
  };
}

export function founderRegressionScenarios(): Array<{ id: string; html: string; css: string; mustFail: string }> {
  const css = founderDefectCss();
  const html = founderDefectHtml();
  return [
    { id: "footer_visible_box_touches_viewport", html, css, mustFail: "footer" },
    { id: "related_link_grid_escapes_gutter", html, css, mustFail: "related" },
    { id: "oversized_table_unused_area", html, css, mustFail: "dead-space" },
    { id: "authority_article_no_image_asset", html, css, mustFail: "imagery" },
    { id: "long_prose_run_no_break", html, css, mustFail: "text-wall" },
    { id: "generic_unstyled_related_boxes", html, css, mustFail: "related" },
    { id: "table_missing_outer_margin", html, css, mustFail: "table" },
    { id: "visual_component_excessive_width", html, css, mustFail: "dead-space" },
  ];
}

void SEO_GEO_AUTHORITY_CSS;
