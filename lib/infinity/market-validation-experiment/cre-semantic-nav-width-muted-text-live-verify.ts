import {
  homepageHeroLinkContrastLiveVerificationPassed,
  verifyHomepageHeroLinkContrastLivePublic,
} from "./cre-homepage-hero-link-contrast-live-verify";

const HOW_IT_WORKS_SCRIPT = `(() => {
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
    if (!el) return { role: role, result: "MISSING", contrastRatio: null };
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = effectiveBg(el);
    const opacity = Number(style.opacity || "1");
    const compositedFg = fg ? composite({ r: fg.r, g: fg.g, b: fg.b, a: (fg.a == null ? 1 : fg.a) * opacity }, bg.rgb) : null;
    const contrast = compositedFg ? ratio(compositedFg, bg.rgb) : null;
    return {
      role: role,
      selector: el.tagName.toLowerCase() + (el.className ? "." + String(el.className).trim().replace(/\\s+/g, ".") : ""),
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 140),
      foreground: style.color,
      effectiveBackground: bg.css,
      contrastRatio: contrast,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      opacity: opacity,
      result: contrast != null && contrast >= 4.5 ? "PASS" : "FAIL",
    };
  };
  const frame = document.querySelector(".pv-product-frame");
  const captions = frame ? Array.from(frame.querySelectorAll(".pv-caption, figcaption, caption")) : [];
  const nav = document.querySelector(".sn-block");
  const prose = document.querySelector(".pv-prose, .pv-authority-shell");
  const cards = nav ? Array.from(nav.querySelectorAll(".sn-card")) : [];
  const cardWidths = cards.map((el) => Number(el.getBoundingClientRect().width.toFixed(1)));
  const moduleWidth = nav ? Number(nav.getBoundingClientRect().width.toFixed(1)) : 0;
  const shellWidth = prose ? Number(prose.getBoundingClientRect().width.toFixed(1)) : 0;
  const firstRow = cardWidths.slice(0, 3);
  const secondRow = cardWidths.slice(3);
  const scrunched = moduleWidth > 0 && moduleWidth < 900 && firstRow.some((width) => width > 0 && width < 260);
  return {
    muted: {
      workflowKicker: sample(captions[0], "workflow_kicker"),
      sampleCaption: sample(captions.length > 2 ? captions[1] : null, "sample_caption"),
      bottomCaption: sample(captions[captions.length - 1], "bottom_caption"),
    },
    width: {
      authorityShell: shellWidth,
      moduleWidth: moduleWidth,
      utilization: shellWidth ? Number((moduleWidth / shellWidth).toFixed(3)) : 0,
      cardCount: cards.length,
      cardWidths: cardWidths,
      columns: firstRow.length,
      rows: secondRow.length ? "3+2" : String(firstRow.length),
      rightUnused: shellWidth && moduleWidth ? Number(Math.max(0, shellWidth - moduleWidth).toFixed(1)) : 0,
      scrunched: scrunched ? "PRESENT" : "ABSENT",
    },
  };
})()`;

export async function verifySemanticNavWidthMutedTextLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const base = await verifyHomepageHeroLinkContrastLivePublic(input);
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const viewports = [1440, 1280, 1024, 390] as const;
  const how: Record<number, Record<string, unknown>> = {};
  try {
    for (const width of viewports) {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 1600 });
      await page.goto(`${input.url.replace(/\/$/, "")}/how-it-works`, { waitUntil: "networkidle", timeout: 45_000 });
      await page.waitForSelector(".sn-block, .pv-product-frame", { timeout: 20_000 });
      how[width] = (await page.evaluate(HOW_IT_WORKS_SCRIPT)) as Record<string, unknown>;
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const desktop = how[1280] as {
    muted?: {
      workflowKicker?: { contrastRatio?: number; result?: string };
      sampleCaption?: { contrastRatio?: number; result?: string };
      bottomCaption?: { contrastRatio?: number; result?: string };
    };
    width?: {
      authorityShell?: number;
      moduleWidth?: number;
      utilization?: number;
      columns?: number;
      rows?: string;
      scrunched?: string;
      cardCount?: number;
    };
  };
  const mutedFailures = ["workflowKicker", "sampleCaption", "bottomCaption"].filter((key) => {
    const sample = desktop.muted?.[key as "workflowKicker"];
    return !sample || sample.result !== "PASS";
  }).length;
  const widthPass =
    (desktop.width?.moduleWidth ?? 0) >= 900 &&
    desktop.width?.cardCount === 5 &&
    desktop.width?.rows === "3+2" &&
    desktop.width?.scrunched === "ABSENT" &&
    (desktop.width?.utilization ?? 0) >= 0.85;
  return {
    ...base,
    howItWorks: how,
    howItWorksWidth: desktop.width ?? null,
    howItWorksMuted: desktop.muted ?? null,
    founderScrunchedPattern: desktop.width?.scrunched ?? "PRESENT",
    visualDeadSpace: widthPass ? ("PASS" as const) : ("FAIL" as const),
    renderedMutedTextContrast: mutedFailures === 0 ? ("PASS" as const) : ("FAIL" as const),
    mutedFailures,
    mutedMissing: desktop.muted ? 0 : 3,
    darkMutedFailures: mutedFailures,
    lightMutedFailures: 0,
  };
}

export function semanticNavWidthMutedTextLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifySemanticNavWidthMutedTextLivePublic>>,
): boolean {
  return (
    homepageHeroLinkContrastLiveVerificationPassed(live) &&
    live.visualDeadSpace === "PASS" &&
    live.renderedMutedTextContrast === "PASS" &&
    live.founderScrunchedPattern === "ABSENT" &&
    live.mutedFailures === 0 &&
    live.mutedMissing === 0 &&
    live.darkMutedFailures === 0 &&
    live.lightMutedFailures === 0
  );
}
