import { writeFile } from "node:fs/promises";

const url = "https://infinity-validation-cre-lease-npv-e72beb7b-ofqh1savv.vercel.app/how-it-works";
const SCRIPT = `(() => {
  const parse = (value) => {
    const raw = String(value).trim();
    const srgb = raw.match(/^color\\(srgb\\s+([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)(?:\\s*\\/\\s*([0-9.]+))?\\)$/i);
    if (srgb) return { r: Math.round(Number(srgb[1]) * 255), g: Math.round(Number(srgb[2]) * 255), b: Math.round(Number(srgb[3]) * 255), a: srgb[4] != null ? Number(srgb[4]) : 1 };
    const nums = raw.match(/[0-9.]+/g);
    if (!nums || nums.length < 3) return null;
    return { r: Number(nums[0]), g: Number(nums[1]), b: Number(nums[2]), a: nums[3] != null ? Number(nums[3]) : 1 };
  };
  const lum = (c) => {
    const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  };
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)); const lo = Math.min(lum(a), lum(b));
    return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
  };
  const composite = (fg, bg) => {
    const a = fg.a == null ? 1 : fg.a;
    if (a >= 0.99) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
    return { r: Math.round(fg.r * a + bg.r * (1 - a)), g: Math.round(fg.g * a + bg.g * (1 - a)), b: Math.round(fg.b * a + bg.b * (1 - a)), a: 1 };
  };
  const effectiveBg = (el) => {
    let node = el;
    let resolved = { r: 15, g: 28, b: 46, a: 1 };
    const layers = [];
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const color = parse(style.backgroundColor);
      if (color && style.backgroundColor !== "rgba(0, 0, 0, 0)" && (color.a == null || color.a > 0.02)) layers.unshift(color);
      node = node.parentElement;
    }
    for (const layer of layers) resolved = composite(layer, resolved);
    return { css: "rgb(" + resolved.r + ", " + resolved.g + ", " + resolved.b + ")", rgb: resolved };
  };
  const sample = (el, role) => {
    if (!el) return { role: role, result: "MISSING" };
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = effectiveBg(el);
    const opacity = Number(style.opacity || "1");
    const compositedFg = fg ? composite({ r: fg.r, g: fg.g, b: fg.b, a: (fg.a == null ? 1 : fg.a) * opacity }, bg.rgb) : null;
    return {
      role: role,
      selector: el.tagName.toLowerCase() + (el.className ? "." + String(el.className).trim().replace(/\\s+/g, ".") : ""),
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 140),
      foreground: style.color,
      effectiveBackground: bg.css,
      contrastRatio: compositedFg ? ratio(compositedFg, bg.rgb) : null,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      opacity: opacity,
      surfaceRole: el.closest("[data-surface]") ? el.closest("[data-surface]").getAttribute("data-surface") : (el.closest(".pv-product-frame") ? "DARK_MODULE" : "DEFAULT")
    };
  };
  const frame = document.querySelector(".pv-product-frame");
  const captions = frame ? Array.from(frame.querySelectorAll(".pv-caption, figcaption, caption")) : [];
  const cta = document.querySelector("[data-surface='EMPHASIS'] .pv-lede, .pv-cta-band .pv-lede, [data-section-type='CTA'] p");
  const nav = document.querySelector(".sn-block");
  const prose = document.querySelector(".pv-prose");
  const cards = nav ? Array.from(nav.querySelectorAll(".sn-card")) : [];
  return {
    workflow: captions.map(function(el, i) {
      return sample(el, i === 0 ? "workflow_kicker" : (i === captions.length - 1 ? "bottom_caption" : "sample_caption"));
    }),
    ctaLede: sample(cta, "cta_muted"),
    learnNext: nav ? {
      navWidth: Number(nav.getBoundingClientRect().width.toFixed(1)),
      proseWidth: prose ? Number(prose.getBoundingClientRect().width.toFixed(1)) : null,
      cardWidths: cards.map(function(el) { return Number(el.getBoundingClientRect().width.toFixed(1)); }),
      cardCount: cards.length
    } : null
  };
})()`;

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 1600 });
await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
const evidence = await page.evaluate(SCRIPT);
await browser.close();
await writeFile(".infinity/how-it-works-dark-muted-before.json", `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
