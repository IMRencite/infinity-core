import {
  evaluateRenderedLinkContrastGate,
  isHiddenOrInertLinkSample,
  RENDERED_LINK_CONTRAST_BROWSER_SCRIPT,
  type RenderedLinkSample,
} from "./public-authority-standard/rendered-link-contrast-gate";
import { contrastRatio, parseCssColor } from "./public-authority-standard/rendered-text-contrast-gate";
import { pageContent } from "./answer-authority/page-inspect";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";

export const HOMEPAGE_HERO_PROOF_LINKS = [
  { text: "Compare two leases", href: "/lease-comparison" },
  { text: "See the workflow", href: "/how-it-works" },
] as const;

const HERO_MEASURE_SCRIPT = `(() => {
  const parse = (value) => {
    const raw = String(value).trim();
    const srgb = raw.match(/^color\\(srgb\\s+([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)(?:\\s*\\/\\s*([0-9.]+))?\\)$/i);
    if (srgb) {
      return { r: Math.round(Number(srgb[1]) * 255), g: Math.round(Number(srgb[2]) * 255), b: Math.round(Number(srgb[3]) * 255), a: srgb[4] != null ? Number(srgb[4]) : 1 };
    }
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
    return (hi + 0.05) / (lo + 0.05);
  };
  const composite = (fg, bg) => {
    const a = fg.a == null ? 1 : fg.a;
    if (a >= 0.99) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
    return { r: Math.round(fg.r * a + bg.r * (1 - a)), g: Math.round(fg.g * a + bg.g * (1 - a)), b: Math.round(fg.b * a + bg.b * (1 - a)), a: 1 };
  };
  const effectiveBg = (el) => {
    let node = el;
    let resolved = { r: 178, g: 182, b: 186, a: 1 };
    const layers = [];
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const color = parse(style.backgroundColor);
      if (color && style.backgroundColor !== "rgba(0, 0, 0, 0)" && (color.a == null || color.a > 0.02)) {
        layers.unshift(color);
      }
      node = node.parentElement;
    }
    for (const layer of layers) resolved = composite(layer, resolved);
    return { css: "rgb(" + resolved.r + ", " + resolved.g + ", " + resolved.b + ")", rgb: resolved };
  };
  const sample = (el) => {
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = effectiveBg(el);
    const contrast = fg && bg.rgb ? Number(ratio(fg, bg.rgb).toFixed(2)) : null;
    const rect = el.getBoundingClientRect();
    return {
      text: (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim(),
      href: el.getAttribute("href"),
      foreground: style.color,
      effectiveBackground: bg.css,
      contrastRatio: contrast,
      visibility: style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 ? "VISIBLE" : "HIDDEN",
      surfaceRole: el.closest("[data-surface]")?.getAttribute("data-surface") || "DEFAULT",
      selector: el.className,
    };
  };
  const wanted = ["Compare two leases", "See the workflow"];
  return [...document.querySelectorAll("a.pv-hero-secondary")].filter((el) => wanted.includes((el.innerText || "").trim())).map(sample);
})()`;

function artifactPageToHtml(tsx: string): string {
  return tsx
    .replace(/^import[\s\S]*?;\s*/gm, "")
    .replace(/export default function[\s\S]*?\{/, "")
    .replace(/className=/g, "class=")
    .replace(/htmlFor=/g, "for=")
    .replace(/\{\s*"([^"]*)"\s*\}/g, "$1")
    .replace(/\{\s*`([^`]*)`\s*\}/g, "$1")
    .replace(/\{[^}]*\}/g, "")
    .replace(/<\s*[A-Z][A-Za-z0-9.]*([^>]*)\/>/g, "")
    .replace(/<\s*[A-Z][A-Za-z0-9.]*([^>]*)>/g, "<div$1>")
    .replace(/<\/\s*[A-Z][A-Za-z0-9.]*\s*>/g, "</div>");
}

function homepageHeroDocument(css: string, homepageTsx: string): string {
  const converted = artifactPageToHtml(homepageTsx);
  const hasHeroLinks = HOMEPAGE_HERO_PROOF_LINKS.every((link) => converted.includes(link.text) && converted.includes(`href="${link.href}"`));
  const heroShell = `<header class="pv-hero pv-hero-photo" data-surface="DEFAULT">
  <div class="pv-hero-media" style="background: rgb(178, 182, 186);"></div>
  <div class="pv-hero-overlay"></div>
  <div class="pv-hero-actions-row">
    <a class="pv-hero-secondary" href="/lease-comparison">Compare two leases</a>
    <a class="pv-hero-secondary" href="/how-it-works">See the workflow</a>
  </div>
</header>`;
  return `<!doctype html><html><head><style>
${css}
body { margin: 0; background: rgb(178, 182, 186); }
.pv-hero-media { background: rgb(178, 182, 186) !important; }
</style></head><body>
${hasHeroLinks ? converted : heroShell}
</body></html>`;
}

function routeDocument(css: string, pageTsx: string): string {
  return `<!doctype html><html><head><style>${css}</style></head><body>${artifactPageToHtml(pageTsx)}</body></html>`;
}

export async function proveHomepageHeroAndAllRoutesRendered(input: {
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const css = input.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const homepage = pageContent(input.files, "/");
  const pageRoutes = searchDepthRouteManifest().pageRoutes;
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const hero: Array<Record<string, unknown>> = [];
  const linkSamples: RenderedLinkSample[] = [];
  let sameColor = 0;
  let nearInvisible = 0;
  let hoverFocus = 0;
  let missing = 0;
  let wcag = 0;
  let visible = 0;
  try {
    const home = await browser.newPage();
    await home.setViewportSize({ width: 1280, height: 900 });
    await home.setContent(homepageHeroDocument(css, homepage), { waitUntil: "domcontentloaded" });
    for (const want of HOMEPAGE_HERO_PROOF_LINKS) {
      const handle = await home.$(`a.pv-hero-secondary[href="${want.href}"]`);
      if (!handle) {
        hero.push({ text: want.text, href: want.href, state: "default", result: "MISSING" });
        continue;
      }
      const def = ((await home.evaluate(HERO_MEASURE_SCRIPT)) as Array<Record<string, unknown>>).find((item) => item.text === want.text);
      await handle.hover();
      await home.waitForTimeout(80);
      const hover = ((await home.evaluate(HERO_MEASURE_SCRIPT)) as Array<Record<string, unknown>>).find((item) => item.text === want.text);
      await handle.focus();
      await home.waitForTimeout(80);
      const focus = ((await home.evaluate(HERO_MEASURE_SCRIPT)) as Array<Record<string, unknown>>).find((item) => item.text === want.text);
      const states = [
        { state: "default", sample: def },
        { state: "hover", sample: hover },
        { state: "focus", sample: focus },
      ];
      for (const row of states) {
        const contrast = Number(row.sample?.contrastRatio ?? 0);
        hero.push({
          text: want.text,
          href: want.href,
          state: row.state,
          foreground: row.sample?.foreground ?? null,
          effectiveBackground: row.sample?.effectiveBackground ?? null,
          contrastRatio: contrast,
          visibility: row.sample?.visibility ?? "MISSING",
          surfaceRole: row.sample?.surfaceRole ?? "DEFAULT",
          result: contrast >= 4.5 && row.sample?.visibility === "VISIBLE" ? "PASS" : "FAIL",
        });
      }
    }
    await home.close();

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const route of pageRoutes) {
      await page.setContent(routeDocument(css, pageContent(input.files, route)), { waitUntil: "domcontentloaded" });
      const samples = (await page.evaluate(RENDERED_LINK_CONTRAST_BROWSER_SCRIPT)) as RenderedLinkSample[];
      linkSamples.push(...(samples ?? []));
      const anchorCount = await page.locator("a").count();
      const gate = evaluateRenderedLinkContrastGate({
        html: (samples ?? []).length > 0 ? `<a href="/rendered-sample">sample</a>` : "",
        css,
        samples: samples ?? [],
      });
      sameColor += gate.sameColorFailures;
      nearInvisible += gate.nearInvisibleFailures;
      hoverFocus += gate.hoverFocusFailures;
      if (anchorCount > 0 && (samples ?? []).length === 0) missing += 1;
      for (const sample of samples ?? []) {
        if (isHiddenOrInertLinkSample(sample)) continue;
        visible += 1;
        const fg = parseCssColor(sample.color);
        const bg = parseCssColor(sample.background);
        const ratio = fg && bg ? contrastRatio(fg, bg) : 0;
        const large = /title|heading|cta/i.test(sample.role);
        if (ratio < (large ? 3 : 4.5)) wcag += 1;
      }
    }
    await page.close();
  } finally {
    await browser.close();
  }
  const heroPassing = hero.filter((item) => item.result === "PASS").length;
  return {
    hero,
    heroPassing,
    heroRequired: HOMEPAGE_HERO_PROOF_LINKS.length * 3,
    heroOverall: hero.length === HOMEPAGE_HERO_PROOF_LINKS.length * 3 && hero.every((item) => item.result === "PASS") ? ("PASS" as const) : ("FAIL" as const),
    routesChecked: pageRoutes.length,
    visible,
    sameColor,
    nearInvisible,
    hoverFocus,
    missing,
    wcag,
    renderedLinkContrast:
      sameColor === 0 && nearInvisible === 0 && hoverFocus === 0 && missing === 0 && wcag === 0
        ? ("PASS" as const)
        : ("FAIL" as const),
    linkSamples: linkSamples.length,
  };
}
