import { writeFile } from "node:fs/promises";
import path from "node:path";
import { REPRESENTATIVE_VIEWPORTS } from "@/lib/infinity/public-venture-design/rendered-layout/constants";

export const VISUAL_COMPOSITION_VIEWPORTS = {
  desktop: 1280,
  wide: 1440,
  mobile: 390,
} as const;

export type VisualCompositionViewport = keyof typeof VISUAL_COMPOSITION_VIEWPORTS;

export type VisibleBox = {
  left: number;
  right: number;
  width: number;
  top: number;
  height: number;
};

export type VisualCompositionMeasurement = {
  route: string;
  viewportName: VisualCompositionViewport;
  viewportWidth: number;
  article: VisibleBox | null;
  hero: VisibleBox | null;
  table: VisibleBox | null;
  tableUtilization: number;
  related: VisibleBox | null;
  footer: VisibleBox | null;
  footerLeft: number;
  footerRight: number;
  footerTouchesViewport: boolean;
  cta: VisibleBox | null;
  overflowX: number;
  realImages: number;
  heroOverlapsFollowing: boolean;
  heroOverlapPx: number;
  heroMedia: VisibleBox | null;
  heroOverlay: VisibleBox | null;
  firstBodyText: VisibleBox | null;
  heroMediaOverlapPx: number;
  visualSeparationPx: number;
  semanticNavCardCount: number;
  semanticNavRowHeightSpread: number;
  semanticNavLastLineOrphans: number;
};

const MEASURE_VISUAL_COMPOSITION = `(() => {
  const box = (el) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, top: rect.top, height: rect.height };
  };
  const viewportWidth = window.innerWidth;
  const footer = document.querySelector("footer, .vg-legal-footer");
  const footerBox = box(footer);
  const tableShell = document.querySelector(".pv-table-shell, .pv-analysis-board");
  const table = tableShell ? tableShell.querySelector("table") : document.querySelector("table");
  const tableBox = box(tableShell || table);
  const tableInner = box(table);
  const utilization = tableBox && tableInner && tableBox.width > 0 ? Math.min(1, tableInner.width / tableBox.width) : 1;
  const heroEl = document.querySelector(".pv-hero, .vg-hero");
  const followingEl = heroEl ? heroEl.nextElementSibling : null;
  const mediaEl = document.querySelector(".pv-hero-media, header.pv-hero figure");
  const overlayEl = document.querySelector(".pv-hero-overlay");
  const firstBodyEl = followingEl ? followingEl.querySelector("h2, h1, p, .pv-prose") : null;
  const heroBox = box(heroEl);
  const followingBox = box(followingEl);
  const mediaBox = box(mediaEl);
  const overlayBox = box(overlayEl);
  const firstBodyBox = box(firstBodyEl);
  const heroOverlapPx = heroBox && followingBox ? Math.max(0, heroBox.top + heroBox.height - followingBox.top) : 0;
  const heroMediaOverlapPx = mediaBox && firstBodyBox ? Math.max(0, mediaBox.top + mediaBox.height - firstBodyBox.top) : 0;
  const visualBottom = Math.max(heroBox ? heroBox.top + heroBox.height : 0, mediaBox ? mediaBox.top + mediaBox.height : 0);
  const visualSeparationPx = firstBodyBox ? firstBodyBox.top - visualBottom : (followingBox ? followingBox.top - visualBottom : 0);
  const navCards = [...document.querySelectorAll(".sn-card")];
  const firstRowTop = navCards[0] ? navCards[0].getBoundingClientRect().top : 0;
  const firstRow = navCards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstRowTop) < 8);
  const rowHeights = firstRow.map((card) => card.getBoundingClientRect().height);
  const rowSpread = rowHeights.length ? Math.max(...rowHeights) - Math.min(...rowHeights) : 0;
  const lastLineOrphans = navCards.filter((card) => {
    const text = card.querySelector(".sn-desc, .sn-copy span:last-child");
    if (!text) return false;
    const value = (text.textContent || "").trim();
    const words = value.split(/\\s+/);
    return words.length >= 6 && words[words.length - 1].length <= 8 && value.endsWith(words[words.length - 1]);
  }).length;
  return {
    viewportWidth,
    article: box(document.querySelector(".pv-reading, .pv-prose, main")),
    hero: heroBox,
    table: tableBox,
    tableUtilization: utilization,
    related: box(document.querySelector(".pv-related-editorial, .pv-related")),
    footer: footerBox,
    footerLeft: footerBox ? footerBox.left : 0,
    footerRight: footerBox ? viewportWidth - footerBox.right : 0,
    footerTouchesViewport: Boolean(footerBox && (footerBox.left < 8 || footerBox.right > viewportWidth - 8)),
    cta: box(document.querySelector(".pv-cta-panel, .vg-cta")),
    overflowX: Math.max(0, document.documentElement.scrollWidth - viewportWidth),
    realImages: document.querySelectorAll('img[src*="/media/"], img[src*=".webp"], img[src*=".svg"]').length,
    heroOverlapsFollowing: heroOverlapPx > 2 || heroMediaOverlapPx > 2,
    heroOverlapPx,
    heroMedia: mediaBox,
    heroOverlay: overlayBox,
    firstBodyText: firstBodyBox,
    heroMediaOverlapPx,
    visualSeparationPx,
    semanticNavCardCount: navCards.length,
    semanticNavRowHeightSpread: rowSpread,
    semanticNavLastLineOrphans: lastLineOrphans,
  };
})()`;

export function evaluateVisualCompositionMeasurement(
  route: string,
  viewportName: VisualCompositionViewport,
  raw: Omit<VisualCompositionMeasurement, "route" | "viewportName">,
): VisualCompositionMeasurement {
  return { route, viewportName, ...raw };
}

export async function auditVisualCompositionInBrowser(input: {
  origin: string;
  routes: readonly string[];
  viewports?: VisualCompositionViewport[];
  screenshotDir?: string;
}): Promise<{
  pages: VisualCompositionMeasurement[];
  screenshots: Array<{ route: string; viewport: string; path: string }>;
  overflowX: number;
  footerTouches: number;
}> {
  const viewports = input.viewports ?? (["desktop", "wide", "mobile"] as VisualCompositionViewport[]);
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const pages: VisualCompositionMeasurement[] = [];
  const screenshots: Array<{ route: string; viewport: string; path: string }> = [];
  try {
    for (const route of input.routes) {
      for (const viewportName of viewports) {
        const page = await browser.newPage();
        try {
          await page.setViewportSize({
            width: VISUAL_COMPOSITION_VIEWPORTS[viewportName],
            height: viewportName === "mobile" ? 844 : 900,
          });
          await page.goto(`${input.origin.replace(/\/$/, "")}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
          const raw = (await page.evaluate(MEASURE_VISUAL_COMPOSITION)) as Omit<
            VisualCompositionMeasurement,
            "route" | "viewportName"
          >;
          pages.push(evaluateVisualCompositionMeasurement(route, viewportName, raw));
          if (input.screenshotDir) {
            const file = path.join(
              input.screenshotDir,
              `${route.replace(/[^\w]+/g, "_") || "home"}_${viewportName}.png`,
            );
            await page.screenshot({ path: file, fullPage: false });
            screenshots.push({ route, viewport: viewportName, path: file });
            await writeFile(
              file.replace(/\.png$/, ".json"),
              `${JSON.stringify({ route, viewportName, ...raw }, null, 2)}\n`,
            );
          }
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  return {
    pages,
    screenshots,
    overflowX: pages.reduce((sum, page) => sum + (page.overflowX > 1 ? 1 : 0), 0),
    footerTouches: pages.filter((page) => page.footerTouchesViewport).length,
  };
}

void REPRESENTATIVE_VIEWPORTS;
