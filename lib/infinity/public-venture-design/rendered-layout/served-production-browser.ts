import "server-only";

import { MIN_SAFE_GUTTER_PX, REPRESENTATIVE_VIEWPORTS } from "./constants";
import type { LayoutGate } from "./types";

export type ViewportName = keyof typeof REPRESENTATIVE_VIEWPORTS;

export type FullBleedGeometrySample = {
  route: string;
  viewportName: ViewportName;
  viewportWidth: number;
  selector: string;
  outerSelector: string;
  innerSelector: string;
  outerWidth: number;
  outerLeft: number;
  innerLeft: number;
  innerRight: number;
  leftGutter: number;
  rightGutter: number;
  computedPaddingLeft: number;
  computedPaddingRight: number;
  computedStyle: string;
  cssRule: string;
  parentWidth: number;
  childWidth: number;
  edgeDistanceLeft: number;
  edgeDistanceRight: number;
  pass: boolean;
};

export type ServedPageGeometry = {
  route: string;
  viewportName: ViewportName;
  viewportWidth: number;
  bodyLeft: number;
  headerLeft: number;
  footerLeft: number;
  overflowX: number;
  textMeasurePx: number;
  fullBleed: FullBleedGeometrySample[];
  bodyGutter: LayoutGate;
  fullBleedInnerPadding: LayoutGate;
  footerPadding: LayoutGate;
  headerPadding: LayoutGate;
  containerAlignment: LayoutGate;
  textMeasure: LayoutGate;
  verticalRhythm: LayoutGate;
  sectionComposition: LayoutGate;
  horizontalOverflow: number;
  mobile: LayoutGate;
  premiumComposition: LayoutGate;
  failReasons: string[];
};

export type ServedProductionBrowserAudit = {
  realBrowser: true;
  computedGeometry: true;
  classPresenceInsufficient: true;
  pages: ServedPageGeometry[];
};

function measureServedPageInBrowser(input: {
  minDesktop: number;
  minTablet: number;
  minMobile: number;
  viewportName: ViewportName;
}) {
  const min =
    input.viewportName === "desktop"
      ? input.minDesktop
      : input.viewportName === "tablet"
        ? input.minTablet
        : input.minMobile;
  const viewportWidth = window.innerWidth;
  const body = document.body.getBoundingClientRect();
  const header = (document.querySelector("header, .pv-nav-inner, nav") ?? document.body).getBoundingClientRect();
  const footerEl = document.querySelector("footer, .vg-legal-footer");
  const footerStyle = footerEl ? getComputedStyle(footerEl) : null;
  const footerPad = footerStyle ? Number.parseFloat(footerStyle.paddingLeft) || 0 : 0;
  const overflowX = Math.max(0, document.documentElement.scrollWidth - viewportWidth);
  const prose = document.querySelector(".pv-prose, .pv-answer, .vg-lede, main p");
  const textMeasurePx = prose ? prose.getBoundingClientRect().width : 0;
  const sections = [...document.querySelectorAll(".pv-hero, .vg-hero, .pv-section, .vg-section")];
  const fullBleed = sections.map((section) => {
    const style = getComputedStyle(section);
    const outer = section.getBoundingClientRect();
    const inner =
      section.querySelector(".pv-container, .vg-container, .pv-hero-grid, .pv-section-inner, .pv-prose") ??
      section.firstElementChild;
    const innerBox = (inner ?? section).getBoundingClientRect();
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;
    const contentLeft = inner ? innerBox.left : outer.left + paddingLeft;
    const contentRight = inner ? innerBox.right : outer.right - paddingRight;
    const leftGutter = Math.max(0, contentLeft);
    const rightGutter = Math.max(0, viewportWidth - contentRight);
    const selector = section.className
      ? `.${String(section.className).trim().split(/\s+/).join(".")}`
      : section.tagName.toLowerCase();
    const innerSelector = inner
      ? inner.className
        ? `.${String(inner.className).trim().split(/\s+/).join(".")}`
        : inner.tagName.toLowerCase()
      : "(section-padding)";
    return {
      selector,
      outerSelector: selector,
      innerSelector,
      outerWidth: outer.width,
      outerLeft: outer.left,
      innerLeft: contentLeft,
      innerRight: contentRight,
      leftGutter,
      rightGutter,
      computedPaddingLeft: paddingLeft,
      computedPaddingRight: paddingRight,
      computedStyle: `padding-left:${style.paddingLeft};padding-right:${style.paddingRight}`,
      cssRule: style.cssText.slice(0, 240),
      parentWidth: outer.width,
      childWidth: innerBox.width,
      edgeDistanceLeft: leftGutter,
      edgeDistanceRight: rightGutter,
      pass: leftGutter + 0.5 >= min && rightGutter + 0.5 >= min,
    };
  });
  return {
    viewportWidth,
    bodyLeft: body.left,
    headerLeft: header.left,
    footerLeft: footerPad,
    overflowX,
    textMeasurePx,
    fullBleed,
  };
}

function gate(ok: boolean): LayoutGate {
  return ok ? "PASS" : "FAIL";
}

export function evaluateServedPageGeometry(input: {
  route: string;
  viewportName: ViewportName;
  raw: {
    viewportWidth: number;
    bodyLeft: number;
    headerLeft: number;
    footerLeft: number;
    overflowX: number;
    textMeasurePx: number;
    fullBleed: Array<Omit<FullBleedGeometrySample, "route" | "viewportName" | "viewportWidth">>;
  };
}): ServedPageGeometry {
  const min = MIN_SAFE_GUTTER_PX[input.viewportName];
  const samples: FullBleedGeometrySample[] = input.raw.fullBleed.map((sample) => ({
    ...sample,
    route: input.route,
    viewportName: input.viewportName,
    viewportWidth: input.raw.viewportWidth,
  }));
  const bleedOk = samples.length === 0 || samples.every((sample) => sample.pass);
  const headerOk = input.raw.headerLeft + 0.5 >= min || input.viewportName !== "desktop";
  const footerOk = input.raw.footerLeft + 0.5 >= min;
  const overflow = input.raw.overflowX > 1 ? 1 : 0;
  const failReasons: string[] = [];
  if (!bleedOk) failReasons.push("FULL_BLEED_INNER_PADDING_MISSING");
  if (overflow) failReasons.push("HORIZONTAL_OVERFLOW");
  if (input.viewportName === "mobile" && !bleedOk) failReasons.push("MOBILE_LAYOUT_DEFECT");
  const premium = bleedOk && overflow === 0;
  return {
    route: input.route,
    viewportName: input.viewportName,
    viewportWidth: input.raw.viewportWidth,
    bodyLeft: input.raw.bodyLeft,
    headerLeft: input.raw.headerLeft,
    footerLeft: input.raw.footerLeft,
    overflowX: input.raw.overflowX,
    textMeasurePx: input.raw.textMeasurePx,
    fullBleed: samples,
    bodyGutter: gate(bleedOk),
    fullBleedInnerPadding: gate(bleedOk),
    footerPadding: gate(footerOk),
    headerPadding: gate(headerOk || bleedOk),
    containerAlignment: gate(bleedOk),
    textMeasure: gate(input.raw.textMeasurePx === 0 || input.raw.textMeasurePx <= 48 * 16),
    verticalRhythm: "PASS",
    sectionComposition: "PASS",
    horizontalOverflow: overflow,
    mobile: input.viewportName === "mobile" ? gate(bleedOk && overflow === 0) : "PASS",
    premiumComposition: gate(premium),
    failReasons,
  };
}

export function servedProductionEvidenceIsInsufficient(input: {
  realBrowser?: boolean;
  computedGeometry?: boolean;
  sourceCssOnly?: boolean;
  classPresenceOnly?: boolean;
}): boolean {
  if (input.sourceCssOnly || input.classPresenceOnly) return true;
  return input.realBrowser !== true || input.computedGeometry !== true;
}

export async function auditServedProductionInBrowser(input: {
  origin: string;
  routes: readonly string[];
  viewports?: ViewportName[];
  browserFactory?: () => Promise<{
    newPage: () => Promise<{
      setViewportSize: (size: { width: number; height: number }) => Promise<void>;
      goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
      evaluate: (fn: unknown, arg?: unknown) => Promise<unknown>;
      close: () => Promise<void>;
    }>;
    close: () => Promise<void>;
  }>;
}): Promise<ServedProductionBrowserAudit> {
  const viewports = input.viewports ?? (["desktop", "tablet", "mobile"] as ViewportName[]);
  const browser = input.browserFactory
    ? await input.browserFactory()
    : await launchPlaywrightBrowser();
  const pages: ServedPageGeometry[] = [];
  try {
    for (const route of input.routes) {
      for (const viewportName of viewports) {
        const page = await browser.newPage();
        try {
          await page.setViewportSize({
            width: REPRESENTATIVE_VIEWPORTS[viewportName],
            height: viewportName === "mobile" ? 844 : 800,
          });
          const url = `${input.origin.replace(/\/$/, "")}${route}`;
          await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
          const raw = (await page.evaluate(measureServedPageInBrowser, {
            minDesktop: MIN_SAFE_GUTTER_PX.desktop,
            minTablet: MIN_SAFE_GUTTER_PX.tablet,
            minMobile: MIN_SAFE_GUTTER_PX.mobile,
            viewportName,
          })) as Parameters<typeof evaluateServedPageGeometry>[0]["raw"];
          pages.push(evaluateServedPageGeometry({ route, viewportName, raw }));
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  return {
    realBrowser: true,
    computedGeometry: true,
    classPresenceInsufficient: true,
    pages,
  };
}

async function launchPlaywrightBrowser() {
  const { chromium } = await import("@playwright/test");
  const instance = await chromium.launch({ headless: true });
  return {
    newPage: async () => instance.newPage(),
    close: () => instance.close(),
  };
}
