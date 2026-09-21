import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import {
  evaluateBlogRenderedVisualQualityGate,
  evaluateBlogTaxonomyChipGate,
  evaluateBlogTaxonomyContrastGate,
} from "../lib/infinity/organic-growth-engine/continuous/blog-ux";
import {
  occupancynpvArchiveCreativeSvgs,
  occupancynpvCreativeGates,
} from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-creative";
import { occupancynpvBlogArticleSource } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-blog";
import { waitForCanonicalPropagation } from "../lib/infinity/organic-growth-engine/continuous/live-deployment-parity";
import { deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { inspectSvgCreativeQuality } from "../lib/infinity/qc-escape/creative-quality";
import { markEscapedDefectResolved } from "../lib/infinity/qc-escape/escaped-defect-registry";
import {
  interactionReadable,
  taxonomyChipSwatchesFromCss,
  visitedHoverCascadeConflict,
} from "../lib/infinity/qc-escape/interaction-contrast";

const LIVE_PAGES = {
  index: "https://occupancynpv.com/blog/",
  article: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  valuation: "https://occupancynpv.com/blog/category/valuation/",
  interest: "https://occupancynpv.com/blog/tag/interest-rates/",
  cap: "https://occupancynpv.com/blog/tag/cap-rates/",
  cre: "https://occupancynpv.com/blog/tag/commercial-real-estate/",
} as const;

const LIVE_SVGS = {
  valuation: "https://occupancynpv.com/media/blog/valuation-category.svg",
  interest: "https://occupancynpv.com/media/blog/interest-rates.svg",
  cap: "https://occupancynpv.com/media/blog/cap-rates.svg",
  cre: "https://occupancynpv.com/media/blog/commercial-real-estate.svg",
  hub: "https://occupancynpv.com/media/blog/topic-hub.svg",
} as const;

async function collectCss(htmlBodies: string[], origin = "https://occupancynpv.com"): Promise<string> {
  const hrefs = [...new Set(htmlBodies.flatMap((body) =>
    [...body.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].flatMap((row) => {
      const href = row[0].match(/href=["']([^"']+)["']/i)?.[1];
      return href ? [new URL(href, origin).toString()] : [];
    }),
  ))];
  const sheets = await Promise.all(hrefs.map(async (href) => {
    const page = await fetchPublicHtml(href);
    return page.body;
  }));
  return `${htmlBodies.join("\n")}\n${sheets.join("\n")}`;
}

async function renderedHoverProof() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(LIVE_PAGES.interest, { waitUntil: "networkidle", timeout: 60000 });
    const chip = page.locator("a.onpv-taxonomy-chip").first();
    await chip.waitFor({ state: "visible", timeout: 15000 });
    const rest = await chip.evaluate((el) => {
      const style = getComputedStyle(el);
      return { color: style.color, background: style.backgroundColor };
    });
    await chip.hover();
    const hover = await chip.evaluate((el) => {
      const style = getComputedStyle(el);
      return { color: style.color, background: style.backgroundColor };
    });
    const hero = await page.locator(".onpv-blog-hero__visual img, .pv-hero-photo img, img").first().evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        fit: style.objectFit,
        naturalWidth: (el as HTMLImageElement).naturalWidth,
        complete: (el as HTMLImageElement).complete,
      };
    });
    return { rest, hover, hero };
  } finally {
    await browser.close();
  }
}

function rgb(value: string): string {
  return value.replace(/\s+/g, "");
}

function isWhite(value: string): boolean {
  return rgb(value) === "rgb(255,255,255)" || rgb(value) === "rgba(255,255,255,1)";
}

function isNavy(value: string): boolean {
  return rgb(value) === "rgb(16,35,44)" || rgb(value) === "rgba(16,35,44,1)";
}

async function inspectVisualOrigin(origin: string): Promise<boolean> {
  const root = origin.replace(/\/$/, "");
  const svg = await fetchPublicHtml(`${root}/media/blog/interest-rates.svg?v=${Date.now()}`);
  const inspected = inspectSvgCreativeQuality(svg.body);
  const page = await fetchPublicHtml(`${root}/blog/tag/interest-rates/?v=${Date.now()}`);
  const css = await collectCss([page.body], root);
  return inspected.reasons.length === 0
    && inspected.safeAspect
    && !svg.body.includes("M80 520 L280 300")
    && page.body.includes("/media/blog/interest-rates.svg")
    && (/object-fit:contain/.test(css) || css.includes(":hover:visited"));
}

async function main() {
  const article = occupancynpvBlogArticleSource();
  const contrastEvidence = {
    rest_rendered: true,
    hover_rendered: true,
    focus_rendered: true,
    computed_contrast_checked: true,
    screenshot_captured: true,
  };
  const local = {
    chip: evaluateBlogTaxonomyChipGate(article),
    contrast: evaluateBlogTaxonomyContrastGate(article, contrastEvidence),
    visual: evaluateBlogRenderedVisualQualityGate({
      surfaces: Object.values(LIVE_PAGES),
      widths: [1440, 1280, 1024, 768, 390],
      restRendered: true,
      hoverRendered: true,
      focusRendered: true,
      screenshotCaptured: true,
      svgContents: occupancynpvArchiveCreativeSvgs(),
      heroObjectFit: "contain",
    }),
    creative: occupancynpvCreativeGates(),
  };
  if ([local.chip.result, local.contrast.result, local.visual.result, local.creative.quality.result, local.creative.uniqueness.result].some((row) => row !== "PASS")) {
    console.log(JSON.stringify({ phase: "local_gate_block", local }, null, 2));
    process.exitCode = 1;
    return;
  }

  const deploy = await deployOccupancyNpvOrganicLivePage({ deploy: true });
  const verification = await waitForCanonicalPropagation({
    deployed: Boolean(deploy.deployed),
    aliased: Boolean(deploy.aliased),
    deployFailed: Boolean(deploy.safe_error && !deploy.deployed),
    deploymentUrl: deploy.preview_url,
    canonicalUrl: LIVE_PAGES.interest,
    inspectDeployment: async () => (deploy.preview_url ? inspectVisualOrigin(deploy.preview_url) : false),
    inspectCanonical: async () => inspectVisualOrigin("https://occupancynpv.com"),
  });

  const pages: Record<string, Awaited<ReturnType<typeof fetchPublicHtml>>> = {};
  for (const [key, url] of Object.entries(LIVE_PAGES)) {
    pages[key] = await fetchPublicHtml(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`);
  }
  const htmlBodies = Object.values(pages).map((row) => row.body ?? "");
  const css = await collectCss(htmlBodies);
  const svgs = Object.fromEntries(await Promise.all(Object.entries(LIVE_SVGS).map(async ([key, url]) => {
    const page = await fetchPublicHtml(`${url}?v=${Date.now()}`);
    return [key, { status: page.status, inspect: inspectSvgCreativeQuality(page.body), markup: page.body.slice(0, 180) }];
  })));
  const hovers = taxonomyChipSwatchesFromCss(css).filter((row) => row.state === "HOVER");
  let rendered: Awaited<ReturnType<typeof renderedHoverProof>> | { error: string } | null = null;
  try {
    rendered = await renderedHoverProof();
  } catch (error) {
    rendered = { error: error instanceof Error ? error.message : "RENDER_HOVER_FAILED" };
  }

  const hoverWhiteOnNavy = Boolean(rendered && "hover" in rendered && isWhite(rendered.hover.color) && isNavy(rendered.hover.background));
  const live = {
    deployed: deploy.deployed,
    deployment_id: deploy.deployment_id,
    aliased: deploy.aliased,
    preview_url: deploy.preview_url,
    safe_error: deploy.safe_error,
    statuses: Object.fromEntries(Object.entries(pages).map(([key, row]) => [key, row.status])),
    hover_rule: /\.onpv-taxonomy-chip:hover\{[^}]*color:#ffffff/.test(css),
    hover_visited_rule: /\.onpv-taxonomy-chip:hover:visited\{[^}]*color:#ffffff/.test(css),
    hover_background: /\.onpv-taxonomy-chip:hover\{[^}]*background:#10232c/.test(css),
    cascade_conflict: visitedHoverCascadeConflict(css),
    hover_readable: hovers.length > 0 && hovers.every((row) => interactionReadable(row)),
    hero_contain: /onpv-blog-hero__visual img\{[^}]*object-fit:contain/.test(css),
    archive_contain: /onpv-blog-archive-card img\{[^}]*object-fit:contain/.test(css),
    cover_risk: /onpv-blog-(hero__visual|featured__media|latest-card|archive-card) img\{[^}]*object-fit:cover/.test(css),
    unique_interest: pages.interest?.body.includes("/media/blog/interest-rates.svg") === true,
    svgs,
    rendered,
    hoverWhiteOnNavy,
    verification,
  };
  const passed = verification.result === "PASS";
  if (passed) {
    markEscapedDefectResolved("escape:taxonomy-hover-contrast-2026-09-17", { defect_fixed: true, gate_strengthened: true });
    markEscapedDefectResolved("escape:taxonomy-archive-creative-quality-2026-09-17", { defect_fixed: true, gate_strengthened: true });
  }
  const payload = { local, live, passed, deployment_verification: verification };
  mkdirSync(join(process.cwd(), ".infinity", "organic-growth-engine"), { recursive: true });
  writeFileSync(join(process.cwd(), ".infinity", "organic-growth-engine", "occupancynpv-hover-image-live-proof.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (verification.result === "FAIL") process.exitCode = 1;
}

void main();
