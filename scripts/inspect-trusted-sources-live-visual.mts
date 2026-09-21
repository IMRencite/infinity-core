import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { evaluateHeroContentSeparation, type VisibleBox } from "../lib/infinity/venture-website-architecture/public-authority-standard/hero-content-separation.ts";
import {
  evaluateAuthoritySectionWidth,
  evaluateAuthoritySectionShellConsistency,
  evaluateAuthoritySourceRenderedQuality,
  evaluateSemanticNavigationBreakoutLayout,
  type RenderedWidthHierarchy,
} from "../lib/infinity/venture-website-architecture/public-authority-standard/authority-content-width.ts";
import { CRE_PUBLIC_AUTHORITY_REFERENCE } from "../lib/infinity/venture-website-architecture/public-authority-standard/cre-reference.ts";
import { AUTHORITY_WIDTH_CSS } from "../lib/infinity/venture-website-architecture/authority-width-css.ts";
import { AUTHORITY_FINAL_POLISH_CSS } from "../lib/infinity/venture-website-architecture/authority-final-polish-css.ts";
import { FOUNDER_VISUAL_QC_CSS } from "../lib/infinity/venture-website-architecture/founder-visual-qc-css.ts";
import { measureHowItWorksHeroLive } from "../lib/infinity/market-validation-experiment/cre-founder-visual-qc-live-verify.ts";
import { tmpdir } from "node:os";
import path from "node:path";
import { mkdir } from "node:fs/promises";

type MeasuredBox = {
  top: number;
  width: number;
  height: number;
};

type RouteMetrics = {
  overflowX: number;
  gutter: number;
  shell: MeasuredBox | null;
  prose: MeasuredBox | null;
  nav: MeasuredBox | null;
  sources: MeasuredBox | null;
  table: MeasuredBox | null;
  cta: MeasuredBox | null;
  cardCount: number;
  cardWidths: number[];
  iconPx: number;
  titleInk: number;
  titleSelector: string | null;
  sourceHeading: string | null;
  sourceLink: string | null;
  sourceBg: string | null;
};

type RouteRow = {
  route: string;
  width: number;
  height: number;
  name: string;
} & RouteMetrics;

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asMeasuredBox(value: unknown): MeasuredBox | null {
  if (value == null || typeof value !== "object") return null;
  const record = asObject(value);
  if (typeof record.top !== "number" || typeof record.width !== "number" || typeof record.height !== "number") return null;
  return { top: record.top, width: record.width, height: record.height };
}

function readRouteMetrics(value: unknown): RouteMetrics {
  const record = asObject(value);
  const cardWidths = Array.isArray(record.cardWidths)
    ? record.cardWidths.filter((item): item is number => typeof item === "number")
    : [];
  return {
    overflowX: asNumber(record.overflowX),
    gutter: asNumber(record.gutter),
    shell: asMeasuredBox(record.shell),
    prose: asMeasuredBox(record.prose),
    nav: asMeasuredBox(record.nav),
    sources: asMeasuredBox(record.sources),
    table: asMeasuredBox(record.table),
    cta: asMeasuredBox(record.cta),
    cardCount: asNumber(record.cardCount),
    cardWidths,
    iconPx: asNumber(record.iconPx),
    titleInk: asNumber(record.titleInk, 1),
    titleSelector: asString(record.titleSelector),
    sourceHeading: asString(record.sourceHeading),
    sourceLink: asString(record.sourceLink),
    sourceBg: asString(record.sourceBg),
  };
}

function boxWidth(value: MeasuredBox | null | undefined): number {
  return value && typeof value.width === "number" ? value.width : 0;
}

function asVisibleBox(value: unknown): VisibleBox | null {
  if (value == null || typeof value !== "object") return null;
  const record = asObject(value);
  if (typeof record.top !== "number" || typeof record.height !== "number") return null;
  return {
    top: record.top,
    height: record.height,
    left: typeof record.left === "number" ? record.left : undefined,
    width: typeof record.width === "number" ? record.width : undefined,
  };
}

const url = "https://infinity-validation-cre-lease-npv-e72beb7b-pieapww42.vercel.app";
const successor = await reconstructCreSearchDepthSuccessor();
const frozenCss = `${AUTHORITY_FINAL_POLISH_CSS}\n${FOUNDER_VISUAL_QC_CSS}\n${AUTHORITY_WIDTH_CSS}`;
const profile = CRE_PUBLIC_AUTHORITY_REFERENCE.widthProfile;
const screenshotDir = path.join(tmpdir(), `cre-ts-visual-${Date.now()}`);
await mkdir(screenshotDir, { recursive: true });
const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: true });
const measure = `(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, width: r.width, height: r.height };
  };
  const el = document.querySelector(".sn-title, .sn-copy strong, .pv-source-board h2");
  let titleInk = 1;
  if (el) {
    const nums = getComputedStyle(el).color.match(/[0-9.]+/g);
    if (nums && nums.length >= 3) titleInk = (Number(nums[0]) * 299 + Number(nums[1]) * 587 + Number(nums[2]) * 114) / 255000;
  }
  return {
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    gutter: document.querySelector("footer") ? document.querySelector("footer").getBoundingClientRect().left : 0,
    shell: box(document.querySelector(".pv-authority-shell, .vg-container.pv-reading, .vg-container.pv-prose")),
    prose: box([...document.querySelectorAll(".pv-reading > p, .pv-prose > p")].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0]),
    nav: box(document.querySelector(".sn-block")),
    sources: box(document.querySelector(".pv-source-board")),
    table: box(document.querySelector(".pv-table-shell, .pv-analysis-board, table")),
    cta: box(document.querySelector(".pv-cta-panel, .pv-cta-band")),
    cardCount: document.querySelectorAll(".sn-card").length,
    cardWidths: [...document.querySelectorAll(".sn-card")].map((card) => card.getBoundingClientRect().width),
    iconPx: document.querySelector(".sn-icon") ? document.querySelector(".sn-icon").getBoundingClientRect().width : 0,
    titleInk,
    titleSelector: el ? el.className || el.tagName : null,
    sourceHeading: document.querySelector(".pv-source-board h2") ? getComputedStyle(document.querySelector(".pv-source-board h2")).color : null,
    sourceLink: document.querySelector(".pv-source-board a") ? getComputedStyle(document.querySelector(".pv-source-board a")).color : null,
    sourceBg: document.querySelector(".pv-source-board") ? getComputedStyle(document.querySelector(".pv-source-board")).backgroundColor : null,
  };
})()`;
const routes = [
  { route: "/lease-sensitivity-analysis", width: 1440, height: 900, name: "wide" },
  { route: "/commercial-lease-npv/should-cam-be-in-lease-npv", width: 1440, height: 900, name: "wide" },
  { route: "/commercial-lease-npv/should-cam-be-in-lease-npv", width: 390, height: 844, name: "mobile" },
  { route: "/", width: 1440, height: 900, name: "wide" },
  { route: "/how-it-works", width: 1440, height: 900, name: "wide" },
  { route: "/pricing", width: 1440, height: 900, name: "wide" },
];
const rows: RouteRow[] = [];
try {
  for (const item of routes) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.goto(`${url}${item.route}`, { waitUntil: "networkidle", timeout: 45000 });
    const metrics = readRouteMetrics(await page.evaluate(measure));
    rows.push({ ...item, ...metrics });
    await page.close();
  }
} finally {
  await browser.close();
}
const heroLive = await measureHowItWorksHeroLive(url, screenshotDir);
const at1440 = rows.find((row) => row.route === "/lease-sensitivity-analysis");
const live1440: RenderedWidthHierarchy = {
  viewportWidth: 1440,
  authorityShellWidth: boxWidth(at1440?.shell),
  proseWidth: boxWidth(at1440?.prose),
  semanticNavWidth: boxWidth(at1440?.nav),
  trustedSourcesWidth: boxWidth(at1440?.sources),
  tableWidth: boxWidth(at1440?.table),
  ctaWidth: boxWidth(at1440?.cta),
  archetype: "QUESTION_AUTHORITY",
};
const widthGate = evaluateAuthoritySectionWidth(live1440, profile);
const breakout = evaluateSemanticNavigationBreakoutLayout({
  viewportWidth: 1440,
  navWidth: live1440.semanticNavWidth,
  proseWidth: live1440.proseWidth,
  cardWidths: at1440?.cardWidths ?? [],
  titleLineCounts: [],
  iconContainerPx: Number(at1440?.iconPx ?? 0) || undefined,
  cardCount: Number(at1440?.cardCount ?? 0),
  css: frozenCss,
  profile,
});
const sourcesGate = evaluateAuthoritySourceRenderedQuality({
  sectionWidth: live1440.trustedSourcesWidth || live1440.authorityShellWidth,
  shellWidth: live1440.authorityShellWidth,
  desktopColumns: 2,
  viewportWidth: 1440,
  hasTitle: true,
  hasHierarchy: true,
  linkCount: 3,
  cramped: false,
  mobileStacked: true,
});
const shellGate = evaluateAuthoritySectionShellConsistency({
  proseWidth: live1440.proseWidth,
  moduleWidths: [live1440.trustedSourcesWidth, live1440.tableWidth ?? 0, live1440.ctaWidth ?? 0].filter((width) => width > 0),
  shellWidth: live1440.authorityShellWidth,
});
const tall = heroLive.find((row) => row.viewport === "tall");
const heroGate = evaluateHeroContentSeparation({
  hero: asVisibleBox(tall?.hero),
  following: asVisibleBox(tall?.nextSection),
  media: asVisibleBox(tall?.media),
  firstBodyText: asVisibleBox(tall?.firstBody),
  css: frozenCss,
});
process.stdout.write(
  JSON.stringify(
    {
      digest: successor.digest,
      rows,
      live1440,
      width: widthGate.overall,
      widthIssues: widthGate,
      breakout: breakout.overall,
      sources: sourcesGate.overall,
      shell: shellGate.overall,
      hero: heroGate.overall,
      heroIntersection: {
        tall: tall?.mediaNextOverlap ?? null,
        tallHeading: tall?.mediaHeadingOverlap ?? null,
      },
      titleInkFail: rows.filter((row) => Number(row.titleInk) >= 0.62),
      overflowFail: rows.filter((row) => Number(row.overflowX) > 1),
    },
    null,
    2,
  ) + "\n",
);
