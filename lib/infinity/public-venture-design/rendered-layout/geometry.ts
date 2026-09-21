import {
  HUMAN_DESIGNER_ADVERSARIAL_QUESTION,
  MIN_FOOTER_PADDING_PX,
  MIN_SAFE_GUTTER_PX,
  REPRESENTATIVE_VIEWPORTS,
} from "./constants";
import type {
  ContainerGeometryProfile,
  FooterLayoutProfile,
  LayoutGate,
  RenderedLayoutFailReason,
  RenderedLayoutQualityResult,
  RenderedPageVisualAudit,
  ResponsiveSpacingProfile,
  SectionCompositionProfile,
  SectionRhythmProfile,
  ViewportName,
} from "./types";
import { inspectSectionComposition } from "./composition";

const REM = 16;

export type LayoutSource = {
  css: string;
  pages: Array<{ route: string; html: string }>;
  footerHtml?: string;
  headerHtml?: string;
};

function remToPx(value: string | undefined, fallbackRem: number): number {
  if (!value) return fallbackRem * REM;
  const rem = value.match(/^([\d.]+)rem$/);
  if (rem) return Number(rem[1]) * REM;
  const px = value.match(/^([\d.]+)px$/);
  if (px) return Number(px[1]);
  const clamp = value.match(/clamp\(([\d.]+)rem/);
  if (clamp) return Number(clamp[1]) * REM;
  return fallbackRem * REM;
}

function cssVar(css: string, name: string): string | undefined {
  const match = css.match(new RegExp(`${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

function lastRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, "g"))];
  return matches.at(-1)?.[1] ?? "";
}

function resolveLength(css: string, value: string, fallbackRem: number): number {
  const trimmed = value.trim();
  const referenced = trimmed.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (referenced) return remToPx(cssVar(css, referenced[1]), fallbackRem);
  return remToPx(trimmed, fallbackRem);
}

function paddingParts(rule: string, css = ""): { y: number; x: number } {
  const pad = rule.match(/padding\s*:\s*([^;]+);/);
  if (!pad) {
    const py = rule.match(/padding-block\s*:\s*([^;]+);/);
    const px = rule.match(/padding-inline\s*:\s*([^;]+);/);
    return {
      y: py ? resolveLength(css, py[1].trim().split(/\s+/)[0], 0) : 0,
      x: px ? resolveLength(css, px[1].trim().split(/\s+/)[0], 0) : 0,
    };
  }
  const parts = pad[1].trim().split(/\s+/);
  if (parts.length === 1) {
    const value = resolveLength(css, parts[0], 0);
    return { y: value, x: value };
  }
  return { y: resolveLength(css, parts[0], 0), x: resolveLength(css, parts[1] ?? parts[0], 0) };
}

function usesPageGutterToken(css: string): boolean {
  return /--pv-gutter-page/.test(css) && /2\s*\*\s*var\(--pv-gutter-page\)|2\s*\*\s*var\(--pv-space-gutter\)/.test(css);
}

function gutterPxForViewport(css: string, viewport: ViewportName): number {
  if (usesPageGutterToken(css)) {
    const desktop = remToPx(cssVar(css, "--pv-gutter-page") ?? cssVar(css, "--pv-space-gutter"), 1.5);
    const tablet = remToPx(cssVar(css, "--pv-gutter-tablet"), 1.25);
    const mobile = remToPx(cssVar(css, "--pv-gutter-mobile"), 1.25);
    if (viewport === "mobile") return mobile;
    if (viewport === "tablet") return tablet;
    return desktop;
  }
  const container = lastRule(css, ".vg-container, .pv-container") || lastRule(css, ".vg-container");
  const formula = container.match(/100%\s*-\s*([\d.]+)rem/);
  if (formula) return (Number(formula[1]) / 2) * REM;
  const tokenUnused = cssVar(css, "--pv-space-gutter");
  if (tokenUnused && /100%\s*-\s*2rem/.test(css)) return REM;
  return 0;
}

function footerPadding(css: string): { y: number; x: number; present: boolean } {
  const rule = lastRule(css, ".vg-legal-footer");
  if (!rule.trim()) return { y: 0, x: 0, present: false };
  return { ...paddingParts(rule, css), present: true };
}

function headerGutter(css: string, viewport: ViewportName): number {
  const nav = lastRule(css, ".pv-nav-inner");
  if (usesPageGutterToken(css) && /--pv-gutter-page/.test(nav + css)) return gutterPxForViewport(css, viewport);
  const formula = nav.match(/100%\s*-\s*([\d.]+)rem/);
  if (formula) return (Number(formula[1]) / 2) * REM;
  return gutterPxForViewport(css, viewport);
}

function sectionHasHorizontalPadding(css: string): boolean {
  const rule = lastRule(css, ".vg-hero, .vg-section, .pv-section, .pv-hero") || lastRule(css, ".pv-section");
  const pad = paddingParts(rule, css);
  if (pad.x >= MIN_SAFE_GUTTER_PX.desktop) return true;
  if (/padding:\s*var\(--pv-space-section\)\s+var\(--pv-gutter-page\)/.test(rule)) return true;
  if (/padding-inline:\s*var\(--pv-gutter-page\)/.test(rule) || /padding-inline:\s*var\(--pv-gutter-page\)/.test(css)) {
    return true;
  }
  return false;
}

function maxWidthPx(css: string, viewportWidth: number): number {
  const max = remToPx(cssVar(css, "--pv-max") ?? cssVar(css, "--vg-max"), 72);
  const gutter = gutterPxForViewport(css, viewportWidth >= 960 ? "desktop" : viewportWidth >= 640 ? "tablet" : "mobile");
  return Math.min(viewportWidth - 2 * gutter, max);
}

export function inspectResponsiveSpacing(css: string): ResponsiveSpacingProfile {
  const gutterUsed = usesPageGutterToken(css);
  const magic = /padding-left:\s*\d{2,}px|margin-right:\s*\d{2,}px/.test(css);
  const footer = footerPadding(css);
  const overall: LayoutGate =
    gutterUsed && footer.present && footer.y >= MIN_FOOTER_PADDING_PX.y && !magic ? "PASS" : "FAIL";
  return {
    model: "ResponsiveSpacingProfile",
    pageGutterDesktop: cssVar(css, "--pv-gutter-page") ?? cssVar(css, "--pv-space-gutter") ?? "0",
    pageGutterTablet: cssVar(css, "--pv-gutter-tablet") ?? "0",
    pageGutterMobile: cssVar(css, "--pv-gutter-mobile") ?? "0",
    contentMaxWidth: cssVar(css, "--pv-max") ?? "0",
    wideContentMaxWidth: cssVar(css, "--pv-max-wide") ?? cssVar(css, "--pv-max") ?? "0",
    articleMeasure: cssVar(css, "--pv-measure") ?? cssVar(css, "--pv-content") ?? "0",
    sectionVerticalSpacing: cssVar(css, "--pv-space-section") ?? "0",
    cardGap: cssVar(css, "--pv-space-card-gap") ?? "1rem",
    visualGap: cssVar(css, "--pv-space-visual-gap") ?? "1.5rem",
    footerPaddingY: cssVar(css, "--pv-space-footer-y") ?? (footer.present ? `${footer.y / REM}rem` : "0"),
    footerPaddingX: gutterUsed ? "var(--pv-gutter-page)" : "0",
    headerPaddingY: cssVar(css, "--pv-space-header-y") ?? "0",
    tokensUsedInCss: gutterUsed,
    hardcodedMagicNumbers: magic,
    overall,
  };
}

export function inspectContainerGeometry(css: string, viewport: ViewportName = "desktop"): ContainerGeometryProfile {
  const width = REPRESENTATIVE_VIEWPORTS[viewport];
  const gutter = gutterPxForViewport(css, viewport);
  const max = maxWidthPx(css, width);
  const aligned = gutter >= MIN_SAFE_GUTTER_PX[viewport];
  const navGutter = headerGutter(css, viewport);
  return {
    model: "ContainerGeometryProfile",
    viewportWidth: width,
    containerMaxWidthPx: max,
    leftGutterPx: gutter,
    rightGutterPx: gutter,
    alignedToCanonicalGrid: aligned,
    heroAlignedWithBody: Math.abs(navGutter - gutter) <= 2,
    footerAlignedWithGrid: footerPadding(css).present && aligned,
    overall: aligned && Math.abs(navGutter - gutter) <= 2 ? "PASS" : "FAIL",
  };
}

export function inspectFooterLayout(css: string, footerHtml: string): FooterLayoutProfile {
  const pad = footerPadding(css);
  const contract =
    /Privacy Policy/.test(footerHtml) &&
    /Terms of Service/.test(footerHtml) &&
    /Sitemap/.test(footerHtml) &&
    /An Infinity OS Venture/.test(footerHtml) &&
    /By IMR/.test(footerHtml);
  const inner = /vg-legal-footer-inner|vg-container/.test(footerHtml);
  const insufficient = !pad.present || pad.x < MIN_SAFE_GUTTER_PX.desktop || pad.y < MIN_FOOTER_PADDING_PX.y;
  return {
    model: "FooterLayoutProfile",
    horizontalPaddingPx: pad.x,
    verticalPaddingPx: pad.y,
    innerContainer: inner,
    contractVisible: contract,
    wraps: /flex-wrap/.test(css),
    edgeCollision: insufficient,
    unstyledStrip: !pad.present,
    overall: !insufficient && contract && inner ? "PASS" : "FAIL",
  };
}

export function inspectSectionRhythm(css: string, html: string): SectionRhythmProfile {
  const section = paddingParts(lastRule(css, ".vg-hero, .vg-section, .pv-section, .pv-hero") || lastRule(css, ".pv-section"), css);
  const sectionY = section.y > 0 ? section.y : remToPx(cssVar(css, "--pv-space-section"), 5);
  const heading = lastRule(css, ".vg-section h2, .pv-section h2");
  const headingMargin = heading.match(/margin:\s*([^;]+);/)?.[1] ?? "0 0 1rem";
  const after = remToPx(headingMargin.trim().split(/\s+/).at(-1), 1);
  const giant = sectionY > 160 && inspectSectionComposition(html).headingParagraphRun >= 6;
  return {
    model: "SectionRhythmProfile",
    headingBeforePx: sectionY,
    headingAfterPx: after,
    paragraphSpacingCompressed: false,
    giantLowInformationGaps: giant,
    sectionToSectionOk: sectionY >= 32 && sectionY <= 140,
    overall: !giant && sectionY >= 32 ? "PASS" : "FAIL",
  };
}

function pageType(route: string): "commercial" | "authority" | "utility" {
  if (route === "/" || route === "/how-it-works" || route === "/pricing" || route === "/early-access" || route === "/for/tenant-rep-brokers") {
    return "commercial";
  }
  if (
    route === "/privacy" ||
    route === "/privacy-policy" ||
    route === "/terms" ||
    route === "/terms-of-service" ||
    route === "/sitemap"
  ) {
    return "utility";
  }
  return "authority";
}

export function inspectPageAudit(input: {
  route: string;
  html: string;
  css: string;
  footerHtml: string;
  headerHtml: string;
}): RenderedPageVisualAudit {
  const failReasons: RenderedLayoutFailReason[] = [];
  const composition = inspectSectionComposition(input.html);
  const type = pageType(input.route);
  const compositionOverall = type === "utility" || composition.overall === "PASS" ? "PASS" : "FAIL";
  const rhythm = inspectSectionRhythm(input.css, input.html);
  const footer = inspectFooterLayout(input.css, input.footerHtml);
  const desktop = inspectContainerGeometry(input.css, "desktop");
  const tablet = inspectContainerGeometry(input.css, "tablet");
  const mobile = inspectContainerGeometry(input.css, "mobile");
  const innerPad = sectionHasHorizontalPadding(input.css) && desktop.leftGutterPx >= MIN_SAFE_GUTTER_PX.desktop;
  const headerPad = headerGutter(input.css, "desktop") >= MIN_SAFE_GUTTER_PX.desktop;
  const measure =
    /--pv-measure|--pv-content|pv-prose/.test(input.css + input.html) &&
    remToPx(cssVar(input.css, "--pv-measure") ?? cssVar(input.css, "--pv-content"), 40) <= 48 * REM;
  const tablesBare = /<table/.test(input.html) && !/pv-table-wrap|overflow-x:\s*auto/.test(input.css + input.html);
  const overflow = /overflow-x:\s*hidden/.test(input.css) && !tablesBare ? 0 : tablesBare ? 1 : /overflow-x:\s*auto/.test(input.css) ? 0 : 0;
  const premiumNeeded = type !== "utility";
  const premium =
    !premiumNeeded ||
    (compositionOverall === "PASS" &&
      desktop.overall === "PASS" &&
      footer.overall === "PASS" &&
      innerPad &&
      headerPad);

  if (desktop.leftGutterPx < MIN_SAFE_GUTTER_PX.desktop) failReasons.push("BODY_GUTTER_INSUFFICIENT");
  if (!innerPad) failReasons.push("FULL_BLEED_INNER_PADDING_MISSING");
  if (footer.overall === "FAIL") failReasons.push("FOOTER_INNER_PADDING_INSUFFICIENT");
  if (footer.edgeCollision || desktop.leftGutterPx < 12) failReasons.push("EDGE_COLLISION");
  if (!desktop.alignedToCanonicalGrid || !desktop.heroAlignedWithBody) failReasons.push("INCONSISTENT_CONTAINER_GRID");
  if (rhythm.overall === "FAIL") failReasons.push("WEAK_VERTICAL_RHYTHM");
  if (type !== "utility" && composition.monotonousLongForm) failReasons.push("MONOTONOUS_LONG_FORM_COMPOSITION");
  if (type !== "utility" && composition.underDesignedSections > 0) failReasons.push("UNDER_DESIGNED_SECTION");
  if (type !== "utility" && composition.visualHierarchyWeak) failReasons.push("VISUAL_HIERARCHY_WEAK");
  if (tablesBare) failReasons.push("TABLE_OVERFLOW");
  if (mobile.leftGutterPx < MIN_SAFE_GUTTER_PX.mobile || tablet.leftGutterPx < MIN_SAFE_GUTTER_PX.tablet) {
    failReasons.push("MOBILE_LAYOUT_DEFECT");
  }
  if (rhythm.giantLowInformationGaps) failReasons.push("EXCESSIVE_LOW_INFORMATION_SPACE");
  if (!headerPad) failReasons.push("HEADER_GUTTER_INSUFFICIENT");
  if (overflow > 0) failReasons.push("HORIZONTAL_OVERFLOW");

  const unique = [...new Set(failReasons)];
  const overall: LayoutGate = unique.length === 0 ? "PASS" : "FAIL";
  return {
    model: "RenderedPageVisualAudit",
    route: input.route,
    viewport: "desktop",
    bodyGutter: desktop.leftGutterPx >= MIN_SAFE_GUTTER_PX.desktop ? "PASS" : "FAIL",
    fullBleedInnerPadding: innerPad ? "PASS" : "FAIL",
    footerPadding: footer.overall,
    headerPadding: headerPad ? "PASS" : "FAIL",
    containerAlignment: desktop.overall,
    textMeasure: measure ? "PASS" : "FAIL",
    verticalRhythm: rhythm.overall,
    sectionComposition: compositionOverall,
    horizontalOverflow: overflow,
    mobile: mobile.leftGutterPx >= MIN_SAFE_GUTTER_PX.mobile ? "PASS" : "FAIL",
    premiumComposition: premium ? "PASS" : "FAIL",
    failReasons: unique,
    designerWouldCallPremium: overall === "PASS",
    overall,
  };
}

export function auditRenderedLayoutQuality(source: LayoutSource): RenderedLayoutQualityResult {
  const footerHtml = source.footerHtml ?? source.pages.map((page) => page.html).join("\n");
  const headerHtml = source.headerHtml ?? source.pages.map((page) => page.html).join("\n");
  const pages = source.pages.map((page) =>
    inspectPageAudit({
      route: page.route,
      html: page.html,
      css: source.css,
      footerHtml,
      headerHtml,
    }),
  );
  const failReasons = [...new Set(pages.flatMap((page) => page.failReasons))];
  const spacing = inspectResponsiveSpacing(source.css);
  const container = inspectContainerGeometry(source.css, "desktop");
  const composition = inspectSectionComposition(source.pages.map((page) => page.html).join("\n"));
  const rhythm = inspectSectionRhythm(source.css, source.pages.map((page) => page.html).join("\n"));
  const footer = inspectFooterLayout(source.css, footerHtml);
  const any = (key: keyof Pick<RenderedPageVisualAudit, "bodyGutter" | "fullBleedInnerPadding" | "footerPadding" | "headerPadding" | "containerAlignment" | "textMeasure" | "verticalRhythm" | "sectionComposition" | "mobile" | "premiumComposition">) =>
    pages.length === 0 || pages.every((page) => page[key] === "PASS") ? "PASS" : "FAIL";
  const overflow = pages.reduce((sum, page) => sum + page.horizontalOverflow, 0);
  const overall: LayoutGate = failReasons.length === 0 && spacing.overall === "PASS" && footer.overall === "PASS" ? "PASS" : "FAIL";
  return {
    gate: "RenderedLayoutQualityGate",
    global: true,
    creOnly: false,
    spacing,
    container,
    composition,
    rhythm,
    footer,
    pages,
    failReasons,
    bodyGutter: any("bodyGutter"),
    fullBleedInnerPadding: any("fullBleedInnerPadding"),
    footerPadding: any("footerPadding"),
    headerPadding: any("headerPadding"),
    containerAlignment: any("containerAlignment"),
    textMeasure: any("textMeasure"),
    verticalRhythm: any("verticalRhythm"),
    sectionComposition: any("sectionComposition"),
    horizontalOverflow: overflow,
    mobile: any("mobile"),
    premiumComposition: any("premiumComposition"),
    designerQuestion: HUMAN_DESIGNER_ADVERSARIAL_QUESTION,
    designerWouldCallPremium: overall === "PASS",
    overall,
  };
}

export function layoutSourceFromArtifactFiles(files: Array<{ path: string; content: string }>): LayoutSource {
  const css = files.find((item) => item.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
  const footerHtml = files.find((item) => /venture-footer|footer/.test(item.path))?.content ?? "";
  const headerHtml = files.find((item) => /site-chrome/.test(item.path))?.content ?? "";
  const pages = files
    .filter((item) => /app\/.*page\.tsx$/.test(item.path.replace(/\\/g, "/")) || item.path.replace(/\\/g, "/") === "app/page.tsx")
    .map((item) => ({
      route: routeFromPath(item.path.replace(/\\/g, "/")),
      html: item.content,
    }));
  return { css, pages, footerHtml, headerHtml };
}

function routeFromPath(path: string): string {
  if (path === "app/page.tsx") return "/";
  return path.replace(/^app/, "").replace(/\/page\.tsx$/, "") || "/";
}

export { gutterPxForViewport, footerPadding, usesPageGutterToken };
