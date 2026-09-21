import { writeFile } from "node:fs/promises";
import { SEO_GEO_REDIRECTS } from "../lib/infinity/venture-website-architecture/digital-real-estate-catalog.ts";
import { searchDepthRouteManifest } from "../lib/infinity/market-validation-experiment/cre-authority-expansion-routes.ts";
import {
  contrastRatio,
  parseCssColor,
  relativeLuminance,
} from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate.ts";

const ORIGIN = "https://infinity-validation-cre-lease-npv-e72beb7b-obljtrsif.vercel.app";
const REPRESENTATIVE = "/commercial-lease-npv";

const SAMPLE_SCRIPT = `(() => {
  const parse = (value) => {
    const nums = String(value).match(/[0-9.]+/g);
    if (!nums || nums.length < 3) return null;
    return { r: Number(nums[0]), g: Number(nums[1]), b: Number(nums[2]), a: nums[3] != null ? Number(nums[3]) : 1 };
  };
  const lum = (c) => {
    const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  };
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)); const lo = Math.min(lum(a), lum(b));
    return (hi + 0.05) / (lo + 0.05);
  };
  const effectiveBg = (el) => {
    let node = el;
    const chain = [];
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      chain.push({ tag: node.tagName, className: String(node.className || "").slice(0, 80), backgroundColor: style.backgroundColor });
      const color = parse(style.backgroundColor);
      if (color && style.backgroundColor !== "rgba(0, 0, 0, 0)" && (color.a == null || color.a > 0.08)) {
        return { background: style.backgroundColor, chain };
      }
      node = node.parentElement;
    }
    return { background: "rgb(255, 255, 255)", chain };
  };
  const roleFor = (el) => {
    if (el.closest(".pv-source-board")) return "trusted_sources_link";
    if (el.closest(".pv-nav")) return el.classList.contains("pv-nav-brand") ? "nav_brand" : "nav_link";
    if (el.closest(".pv-breadcrumb")) return "breadcrumb_link";
    if (el.closest(".pv-spoke-index")) return "emphasis_spoke_link";
    if (el.closest(".pv-cta-panel")) return "cta_link";
    if (el.closest(".sn-card, .sn-block")) return "card_link";
    if (el.closest("footer")) return "footer_link";
    if (el.closest(".disclosure")) return "disclosure_link";
    return "inline_link";
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return [...document.querySelectorAll("a")].slice(0, 80).map((el, index) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const fg = parse(style.color);
    const resolved = effectiveBg(el);
    const bg = parse(resolved.background);
    const contrast = fg && bg ? Number(ratio(fg, bg).toFixed(2)) : null;
    const delta = fg && bg ? Number(Math.abs(lum(fg) - lum(bg)).toFixed(4)) : null;
    const intersecting = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
    return {
      index,
      role: roleFor(el),
      text: (el.innerText || el.textContent || "").trim().slice(0, 80),
      href: el.getAttribute("href"),
      className: String(el.className || ""),
      selector: el.className ? ("a." + String(el.className).trim().split(/\\s+/).join(".")) : ("a[href='" + (el.getAttribute("href") || "") + "']"),
      color: style.color,
      background: resolved.background,
      backgroundChain: resolved.chain.slice(0, 6),
      contrast,
      luminanceDelta: delta,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      ariaHidden: el.getAttribute("aria-hidden") || el.closest("[aria-hidden]")?.getAttribute("aria-hidden") || null,
      inert: Boolean(el.inert || el.closest("[inert]")),
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
      intersecting,
      clipped: intersecting === false && (rect.width === 0 || rect.height === 0 || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0),
    };
  });
})()`;

function nearInvisible(fg: string, bg: string): boolean {
  const a = parseCssColor(fg);
  const b = parseCssColor(bg);
  if (!a || !b) return false;
  return contrastRatio(a, b) < 1.4 || Math.abs(relativeLuminance(a) - relativeLuminance(b)) < 0.04;
}

function classify(sample: {
  display: string;
  visibility: string;
  opacity: string;
  width: number;
  height: number;
  intersecting: boolean;
  ariaHidden: string | null;
  inert: boolean;
}): "REAL_VISIBLE_CONTRAST_FAILURE" | "INVALID_SAMPLE" {
  if (sample.display === "none") return "INVALID_SAMPLE";
  if (sample.visibility === "hidden") return "INVALID_SAMPLE";
  if (Number(sample.opacity) === 0) return "INVALID_SAMPLE";
  if (sample.width < 1 || sample.height < 1) return "INVALID_SAMPLE";
  if (sample.ariaHidden === "true") return "INVALID_SAMPLE";
  if (sample.inert) return "INVALID_SAMPLE";
  if (!sample.intersecting && (sample.width < 1 || sample.height < 1)) return "INVALID_SAMPLE";
  return "REAL_VISIBLE_CONTRAST_FAILURE";
}

const redirects = new Set(SEO_GEO_REDIRECTS.map((item) => item.from));
const pageRoutes = searchDepthRouteManifest().pageRoutes.filter((route) => !redirects.has(route));

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

const representativeSamples = await (async () => {
  await page.goto(`${ORIGIN}${REPRESENTATIVE}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  return (await page.evaluate(SAMPLE_SCRIPT)) as Array<Record<string, unknown>>;
})();

const representativeFailing = representativeSamples.filter((sample) =>
  nearInvisible(String(sample.color), String(sample.background)),
);

const perRoute: Array<{ route: string; failing: number; hrefs: string[] }> = [];
for (const route of pageRoutes) {
  await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const samples = (await page.evaluate(SAMPLE_SCRIPT)) as Array<Record<string, unknown>>;
  const failing = samples.filter((sample) => nearInvisible(String(sample.color), String(sample.background)));
  perRoute.push({
    route,
    failing: failing.length,
    hrefs: failing.map((sample) => `${sample.role}:${sample.href}:${sample.text}`),
  });
}

await browser.close();

const totalNear = perRoute.reduce((sum, row) => sum + row.failing, 0);
const result = {
  origin: ORIGIN,
  representativeRoute: REPRESENTATIVE,
  pageRoutes: pageRoutes.length,
  totalNearInvisible: totalNear,
  repeatingPerPage: Object.fromEntries(
    [...new Set(perRoute.map((row) => row.failing))].map((count) => [
      count,
      perRoute.filter((row) => row.failing === count).length,
    ]),
  ),
  seven: representativeFailing.map((sample) => ({
    component: sample.role,
    selector: sample.selector,
    text: sample.text,
    href: sample.href,
    foreground: sample.color,
    background: sample.background,
    contrast: sample.contrast,
    luminanceDelta: sample.luminanceDelta,
    display: sample.display,
    visibilityCss: sample.visibility,
    opacity: sample.opacity,
    width: sample.width,
    height: sample.height,
    intersecting: sample.intersecting,
    ariaHidden: sample.ariaHidden,
    inert: sample.inert,
    backgroundChain: sample.backgroundChain,
    classification: classify(sample as never),
  })),
};
await writeFile(".infinity/site-chrome-link-contrast-repro.json", `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ totalNearInvisible: result.totalNearInvisible, pageRoutes: result.pageRoutes, repeatingPerPage: result.repeatingPerPage, seven: result.seven }, null, 2)}\n`);
