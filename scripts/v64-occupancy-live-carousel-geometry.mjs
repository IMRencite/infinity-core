import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { evaluateCarouselCardGeometry } from "../lib/infinity/organic-growth-engine/continuous/carousel-geometry.ts";

const URL = "https://occupancynpv.com/blog/";
const dir = ".infinity/blog-os";
mkdirSync(dir, { recursive: true });

const cssRes = await fetch("https://occupancynpv.com/_next/static/chunks/1kk23o7boc_co.css?dpl=dpl_6aCgW1Cnb2bVcqVMcGKQUrf24LLn", {
  headers: { "user-agent": "InfinityOS-LiveCarouselEscape/v64" },
});
const css = await cssRes.text();
const cssHits = [...css.matchAll(/\.onpv-blog-featured[^{]*\{[^}]+\}/g)].map((m) => m[0]);
const cssCarousel = [...css.matchAll(/\.onpv-blog-carousel[^{]*\{[^}]+\}/g)].map((m) => m[0]);
const cssDensity = [...css.matchAll(/\[data-carousel-density[^{]*\{[^}]+\}/g)].map((m) => m[0]);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
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
      position: s.position,
    };
  };
  const section = document.querySelector("[data-blog-featured-blogs]");
  const viewport = section?.querySelector(".onpv-blog-carousel") ?? null;
  const track = section?.querySelector("[data-blog-carousel-track]") ?? viewport;
  const scroller = section?.querySelector("[data-blog-carousel-scroller]") ?? null;
  const card = section?.querySelector("[data-blog-featured-card]") ?? null;
  const media = card?.querySelector("a") ?? null;
  const image = card?.querySelector("img") ?? null;
  const title = card?.querySelector("h3") ?? null;
  const excerpt = [...(card?.querySelectorAll("p") ?? [])].find((p) => !p.classList.contains("pv-eyebrow")) ?? null;
  const cta = card?.querySelector("[data-blog-featured-cta]") ?? null;
  const bodyCandidates = [title, excerpt, cta].filter(Boolean);
  const bodyWidth = bodyCandidates.length
    ? Math.max(...bodyCandidates.map((el) => el.getBoundingClientRect().width))
    : 0;
  const titleText = title?.textContent?.trim() ?? "";
  const titleLines = title ? Math.max(1, Math.round(title.getBoundingClientRect().height / (parseFloat(getComputedStyle(title).lineHeight) || 24))) : 0;
  return {
    section: pick(section),
    carousel: pick(viewport),
    track: pick(track),
    scroller: pick(scroller),
    slide: pick(card),
    card: pick(card),
    media: pick(media),
    image: pick(image),
    title: pick(title),
    excerpt: pick(excerpt),
    cta: pick(cta),
    body_width: bodyWidth,
    title_text: titleText,
    title_lines: titleLines,
    title_words: titleText.split(/\s+/).filter(Boolean).length,
    html_card: card?.outerHTML?.slice(0, 1800) ?? null,
    dpl: document.documentElement.getAttribute("data-dpl-id"),
  };
});

await page.locator("[data-blog-featured-blogs]").screenshot({ path: `${dir}/v64-occupancy-featured-live.png` });
await page.screenshot({ path: `${dir}/v64-occupancy-blog-desktop.png`, fullPage: false });
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
const textCollapse = imageW > 0 && bodyW / imageW < 0.5 && (measured.title_lines ?? 0) >= 4;
const report = {
  captured_at: new Date().toISOString(),
  url: URL,
  process: "playwright-chromium against occupancynpv.com:443",
  port: 443,
  status: response?.status() ?? 0,
  cache: headers["x-vercel-cache"] ?? null,
  age: headers["age"] ?? null,
  vercel_id: headers["x-vercel-id"] ?? null,
  deployment_id: measured.dpl,
  serving_repaired_artifact: Boolean(measured.html_card?.includes("onpv-blog-featured-body")),
  measured,
  image_width: imageW,
  body_width: bodyW,
  card_width: cardW,
  slide_width: slideW,
  ratios: {
    body_over_image: imageW ? bodyW / imageW : 0,
    body_over_card: cardW ? bodyW / cardW : 0,
    card_over_slide: slideW ? cardW / slideW : 0,
  },
  geometry,
  text_collapse: textCollapse,
  css_rules: { featured: cssHits, carousel: cssCarousel, density: cssDensity },
  verdict: geometry.result === "PASS" && !textCollapse ? "PASS" : "FAIL",
};

writeFileSync(`${dir}/v64-occupancy-live-carousel-geometry.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  deployment_id: report.deployment_id,
  cache: report.cache,
  serving_repaired_artifact: report.serving_repaired_artifact,
  image_width: imageW,
  body_width: bodyW,
  card_width: cardW,
  slide_width: slideW,
  geometry: geometry.result,
  reasons: geometry.reasons,
  text_collapse: textCollapse,
  verdict: report.verdict,
}, null, 2));
