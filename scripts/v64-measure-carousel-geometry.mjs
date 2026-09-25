import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import {
  evaluateCarouselCardGeometry,
  evaluateCarouselTextCollapse,
} from "../lib/infinity/organic-growth-engine/continuous/carousel-geometry.ts";

const url = process.argv[2] || "https://occupancynpv.com/blog/";
const label = process.argv[3] || "live";
const dir = ".infinity/blog-os";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const response = await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
const headers = response?.headers() ?? {};

const measured = await page.evaluate(() => {
  const pick = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      className: String(el.className || ""),
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      display: s.display,
      computedWidth: s.width,
      flexBasis: s.flexBasis,
      gridTemplateColumns: s.gridTemplateColumns,
      alignSelf: s.alignSelf,
      justifySelf: s.justifySelf,
      minWidth: s.minWidth,
      maxWidth: s.maxWidth,
      overflow: s.overflow,
      boxSizing: s.boxSizing,
    };
  };
  const section = document.querySelector("[data-blog-featured-blogs]");
  const viewport = section?.querySelector(".onpv-blog-carousel") ?? null;
  const scroller = section?.querySelector("[data-blog-carousel-scroller]") ?? null;
  const card = section?.querySelector("[data-blog-featured-card]") ?? null;
  const media = card?.querySelector("[data-carousel-media], .onpv-blog-featured-media") ?? card?.querySelector("a") ?? null;
  const image = card?.querySelector("img") ?? null;
  const body = card?.querySelector("[data-carousel-body], .onpv-blog-featured-body") ?? null;
  const title = card?.querySelector("h3") ?? null;
  const excerpt = [...(card?.querySelectorAll("p") ?? [])].find((p) => !p.classList.contains("pv-eyebrow")) ?? null;
  const cta = card?.querySelector("[data-blog-featured-cta]") ?? null;
  const bodyEl = body ?? title;
  const titleText = title?.textContent?.trim() ?? "";
  const cssHref = document.querySelector('link[rel="stylesheet"]')?.getAttribute("href") ?? "";
  return {
    section: pick(section),
    carousel: pick(viewport),
    scroller: pick(scroller),
    slide: pick(card),
    card: pick(card),
    media: pick(media),
    image: pick(image),
    body: pick(bodyEl),
    title: pick(title),
    excerpt: pick(excerpt),
    cta: pick(cta),
    body_width: bodyEl?.getBoundingClientRect().width ?? 0,
    title_text: titleText,
    title_lines: title ? Math.max(1, Math.round(title.getBoundingClientRect().height / (parseFloat(getComputedStyle(title).lineHeight) || 24))) : 0,
    title_words: titleText.split(/\s+/).filter(Boolean).length,
    html_card: card?.outerHTML?.slice(0, 2000) ?? null,
    dpl: document.documentElement.getAttribute("data-dpl-id") ?? (cssHref.match(/dpl_[A-Za-z0-9]+/) || [])[0] ?? null,
    contract: section?.getAttribute("data-carousel-geometry-contract") ?? null,
    mode: section?.getAttribute("data-carousel-mode") ?? null,
    label: section?.querySelector("h2")?.textContent?.trim() ?? null,
    has_prev: Boolean(section?.querySelector("[data-blog-carousel-prev]")),
    has_next: Boolean(section?.querySelector("[data-blog-carousel-next]")),
    has_pager: Boolean(section?.querySelector("[data-carousel-pagination]")),
  };
});

const shot = `${dir}/v64-occupancy-featured-${label}.png`;
await page.locator("[data-blog-featured-blogs]").screenshot({ path: shot }).catch(async () => {
  await page.screenshot({ path: shot, fullPage: false });
});
await browser.close();

const imageW = measured.image?.width ?? 0;
const bodyW = measured.body_width ?? 0;
const cardW = measured.card?.width ?? 0;
const slideW = measured.slide?.width ?? cardW;
const geometry = evaluateCarouselCardGeometry({
  slide: { width: slideW },
  card: { width: cardW },
  image: { width: imageW },
  body: { width: bodyW },
});
const collapse = evaluateCarouselTextCollapse({
  image_width: imageW,
  body_width: bodyW,
  card_width: cardW,
  title_lines: measured.title_lines ?? 0,
  title_words: measured.title_words ?? 0,
});
const serving = Boolean(measured.contract === "v2" && measured.html_card?.includes("onpv-blog-featured-body"));
const report = {
  captured_at: new Date().toISOString(),
  url,
  label,
  process: `playwright-chromium against ${url}`,
  status: response?.status() ?? 0,
  cache: headers["x-vercel-cache"] ?? null,
  age: headers["age"] ?? null,
  vercel_id: headers["x-vercel-id"] ?? null,
  deployment_id: measured.dpl,
  serving_expected_artifact: serving,
  measured,
  image_width: imageW,
  body_width: bodyW,
  card_width: cardW,
  slide_width: slideW,
  geometry,
  text_collapse: collapse,
  screenshot: shot,
  verdict: geometry.result === "PASS" && collapse.result === "PASS" ? "PASS" : "FAIL",
};
writeFileSync(`${dir}/v64-occupancy-carousel-${label}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  url,
  label,
  deployment_id: report.deployment_id,
  cache: report.cache,
  serving_expected_artifact: serving,
  image_width: imageW,
  body_width: bodyW,
  card_width: cardW,
  slide_width: slideW,
  geometry: geometry.result,
  text_collapse: collapse.result,
  verdict: report.verdict,
}, null, 2));
