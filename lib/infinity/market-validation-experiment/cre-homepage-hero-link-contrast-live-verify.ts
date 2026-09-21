import {
  siteChromeLinkContrastLiveVerificationPassed,
  verifySiteChromeLinkContrastLivePublic,
} from "./cre-site-chrome-link-contrast-live-verify";

export const HOMEPAGE_HERO_LIVE_PROOF_LINKS = [
  { text: "Compare two leases", href: "/lease-comparison" },
  { text: "See the workflow", href: "/how-it-works" },
] as const;

const HERO_LIVE_SCRIPT = `(() => {
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
    };
  };
  const wanted = ["Compare two leases", "See the workflow"];
  return [...document.querySelectorAll("a.pv-hero-secondary")].filter((el) => wanted.includes((el.innerText || "").trim())).map(sample);
})()`;

export async function verifyHomepageHeroLinkContrastLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const base = await verifySiteChromeLinkContrastLivePublic(input);
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const hero: Array<Record<string, unknown>> = [];
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${input.url.replace(/\/$/, "")}/`, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForSelector("a.pv-hero-secondary", { timeout: 15_000 });
    for (const want of HOMEPAGE_HERO_LIVE_PROOF_LINKS) {
      const locator = page.locator(`a.pv-hero-secondary[href="${want.href}"]`).filter({ hasText: want.text }).first();
      if ((await locator.count()) === 0) {
        hero.push({ text: want.text, href: want.href, state: "default", result: "MISSING" });
        continue;
      }
      await locator.scrollIntoViewIfNeeded();
      const def = ((await page.evaluate(HERO_LIVE_SCRIPT)) as Array<Record<string, unknown>>).find((item) => item.text === want.text);
      await locator.hover({ timeout: 10_000 });
      await page.waitForTimeout(120);
      const hover = ((await page.evaluate(HERO_LIVE_SCRIPT)) as Array<Record<string, unknown>>).find((item) => item.text === want.text);
      await locator.focus({ timeout: 10_000 });
      await page.waitForTimeout(120);
      const focus = ((await page.evaluate(HERO_LIVE_SCRIPT)) as Array<Record<string, unknown>>).find((item) => item.text === want.text);
      for (const row of [
        { state: "default", sample: def },
        { state: "hover", sample: hover },
        { state: "focus", sample: focus },
      ]) {
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
    await page.close();
  } finally {
    await browser.close();
  }
  const defaultFailures = hero.filter((item) => item.state === "default" && item.result !== "PASS").length;
  const hoverFailures = hero.filter((item) => item.state === "hover" && item.result !== "PASS").length;
  const focusFailures = hero.filter((item) => item.state === "focus" && item.result !== "PASS").length;
  return {
    ...base,
    storedQcUsedAsLiveProof: false as const,
    homepageSpecificLiveVerifier: "verifyHomepageHeroLinkContrastLivePublic" as const,
    hero,
    heroPassing: hero.filter((item) => item.result === "PASS").length,
    heroRequired: HOMEPAGE_HERO_LIVE_PROOF_LINKS.length * 3,
    heroDefaultFailures: defaultFailures,
    heroHoverFailures: hoverFailures,
    heroFocusFailures: focusFailures,
    heroOverall: hero.length === HOMEPAGE_HERO_LIVE_PROOF_LINKS.length * 3 && hero.every((item) => item.result === "PASS") ? ("PASS" as const) : ("FAIL" as const),
  };
}

export function homepageHeroLinkContrastLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyHomepageHeroLinkContrastLivePublic>>,
): boolean {
  return (
    siteChromeLinkContrastLiveVerificationPassed(live) &&
    live.heroOverall === "PASS" &&
    live.heroPassing === live.heroRequired &&
    live.heroDefaultFailures === 0 &&
    live.heroHoverFailures === 0 &&
    live.heroFocusFailures === 0
  );
}
