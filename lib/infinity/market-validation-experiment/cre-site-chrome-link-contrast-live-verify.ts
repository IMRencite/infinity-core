import {
  hubLayoutRepairLiveVerificationPassed,
  verifyHubLayoutRepairLivePublic,
} from "./cre-hub-layout-repair-live-verify";

export const SITE_CHROME_CANONICAL_NAV_LINKS = [
  { text: "Lease NPV comparison", href: "/" },
  { text: "How it works", href: "/how-it-works" },
  { text: "Resources", href: "/resources" },
  { text: "Compare", href: "/lease-comparison" },
  { text: "Pricing", href: "/pricing" },
  { text: "FAQ", href: "/faq" },
  { text: "Request Pilot Access", href: "/early-access" },
] as const;

const NAV_AND_PARSER_SCRIPT = `(() => {
  const parse = (value) => {
    const raw = String(value).trim();
    const srgb = raw.match(/^color\\(srgb\\s+([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)(?:\\s*\\/\\s*([0-9.]+))?\\)$/i);
    if (srgb) {
      return { r: Math.round(Number(srgb[1]) * 255), g: Math.round(Number(srgb[2]) * 255), b: Math.round(Number(srgb[3]) * 255), a: srgb[4] != null ? Number(srgb[4]) : 1, space: "srgb" };
    }
    const nums = raw.match(/[0-9.]+/g);
    if (!nums || nums.length < 3) return null;
    return { r: Number(nums[0]), g: Number(nums[1]), b: Number(nums[2]), a: nums[3] != null ? Number(nums[3]) : 1, space: "rgb" };
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
    let resolved = { r: 255, g: 255, b: 255, a: 1 };
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
  const expected = [
    { text: "Lease NPV comparison", href: "/" },
    { text: "How it works", href: "/how-it-works" },
    { text: "Resources", href: "/resources" },
    { text: "Compare", href: "/lease-comparison" },
    { text: "Pricing", href: "/pricing" },
    { text: "FAQ", href: "/faq" },
    { text: "Request Pilot Access", href: "/early-access" },
  ];
  const nav = document.querySelector(".pv-nav");
  const anchors = [...document.querySelectorAll(".pv-nav a")];
  const samples = expected.map((want) => {
    const el = anchors.find((anchor) => {
      const text = (anchor.innerText || anchor.textContent || "").replace(/\\s+/g, " ").trim();
      const href = (anchor.getAttribute("href") || "").replace(/\\/$/, "") || "/";
      const wantHref = want.href.replace(/\\/$/, "") || "/";
      return text === want.text && href === wantHref;
    });
    if (!el) {
      return { text: want.text, href: want.href, foreground: null, effectiveBackground: null, contrastRatio: null, luminanceDelta: null, visibility: "MISSING", result: "FAIL" };
    }
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = effectiveBg(el);
    const contrast = fg && bg.rgb ? Number(ratio(fg, bg.rgb).toFixed(2)) : null;
    const luminanceDelta = fg && bg.rgb ? Number(Math.abs(lum(fg) - lum(bg.rgb)).toFixed(3)) : null;
    const visible = style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || "1") > 0.05 && el.getBoundingClientRect().width > 0;
    const pass = Boolean(visible && contrast != null && contrast >= 4.5 && luminanceDelta != null && luminanceDelta >= 0.1);
    return {
      text: want.text,
      href: want.href,
      foreground: style.color,
      effectiveBackground: bg.css,
      contrastRatio: contrast,
      luminanceDelta,
      visibility: visible ? "VISIBLE" : "HIDDEN",
      result: pass ? "PASS" : "FAIL",
    };
  });
  const parsedSrgb = parse("color(srgb 1 1 1 / 0.92)");
  const wrongEightBit = parsedSrgb && parsedSrgb.r === 1 && parsedSrgb.g === 1 && parsedSrgb.b === 1;
  const navy = { r: 21, g: 32, b: 51, a: 1 };
  const composited = parsedSrgb ? composite(parsedSrgb, { r: 255, g: 255, b: 255, a: 1 }) : null;
  const srgbContrast = composited ? Number(ratio(navy, composited).toFixed(2)) : null;
  const navBg = nav ? getComputedStyle(nav).backgroundColor : null;
  const navParsed = navBg ? parse(navBg) : null;
  return {
    samples,
    parser: {
      rawProof: "color(srgb 1 1 1 / 0.92)",
      parsed: parsedSrgb,
      treatedAsEightBitRgb: Boolean(wrongEightBit),
      normalized: Boolean(parsedSrgb && parsedSrgb.r === 255 && parsedSrgb.g === 255 && parsedSrgb.b === 255 && parsedSrgb.a === 0.92),
      composited,
      srgbContrast,
      physicallyPlausible: Boolean(srgbContrast != null && srgbContrast >= 4.5),
      liveNavBackground: navBg,
      liveNavParsed: navParsed,
    },
  };
})()`;

export async function verifySiteChromeLinkContrastLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const base = await verifyHubLayoutRepairLivePublic(input);
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  type NavProof = {
    samples: Array<{
      text: string;
      href: string;
      foreground: string | null;
      effectiveBackground: string | null;
      contrastRatio: number | null;
      luminanceDelta: number | null;
      visibility: string;
      result: "PASS" | "FAIL";
    }>;
    parser: {
      rawProof: string;
      parsed: { r: number; g: number; b: number; a: number; space: string } | null;
      treatedAsEightBitRgb: boolean;
      normalized: boolean;
      composited: { r: number; g: number; b: number; a: number } | null;
      srgbContrast: number | null;
      physicallyPlausible: boolean;
      liveNavBackground: string | null;
      liveNavParsed: { r: number; g: number; b: number; a: number; space: string } | null;
    };
  };
  let nav: NavProof | null = null;
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${input.url.replace(/\/$/, "")}/commercial-lease-npv`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    nav = (await page.evaluate(NAV_AND_PARSER_SCRIPT)) as NavProof;
    await page.close();
  } finally {
    await browser.close();
  }
  const sevenChecked = nav?.samples.length ?? 0;
  const sevenPassing = nav?.samples.filter((sample) => sample.result === "PASS").length ?? 0;
  const sameColor = nav?.samples.filter((sample) => {
    const fg = sample.foreground?.replace(/\s+/g, "");
    const bg = sample.effectiveBackground?.replace(/\s+/g, "");
    return sample.visibility === "VISIBLE" && fg && bg && fg === bg;
  }).length ?? 0;
  const nearInvisible = nav?.samples.filter((sample) => sample.visibility === "VISIBLE" && (sample.luminanceDelta ?? 1) < 0.1).length ?? 0;
  const wcagFailures = nav?.samples.filter((sample) => sample.visibility === "VISIBLE" && (sample.contrastRatio ?? 0) < 4.5).length ?? 0;
  return {
    ...base,
    navSamples: nav?.samples ?? [],
    navSevenChecked: sevenChecked,
    navSevenPassing: sevenPassing,
    navSameColor: sameColor,
    navNearInvisible: nearInvisible,
    navWcagFailures: wcagFailures,
    colorParser: {
      parsing: nav?.parser.normalized && !nav.parser.treatedAsEightBitRgb ? ("PASS" as const) : ("FAIL" as const),
      normalizedChannelConversion: nav?.parser.normalized ? ("PASS" as const) : ("FAIL" as const),
      alphaCompositing: nav?.parser.composited ? ("PASS" as const) : ("FAIL" as const),
      effectiveBackground: nav?.parser.physicallyPlausible ? ("PASS" as const) : ("FAIL" as const),
      proof: nav?.parser ?? null,
    },
  };
}

export function siteChromeLinkContrastLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifySiteChromeLinkContrastLivePublic>>,
): boolean {
  return (
    hubLayoutRepairLiveVerificationPassed(live) &&
    live.navSevenChecked === SITE_CHROME_CANONICAL_NAV_LINKS.length &&
    live.navSevenPassing === SITE_CHROME_CANONICAL_NAV_LINKS.length &&
    live.navSameColor === 0 &&
    live.navNearInvisible === 0 &&
    live.navWcagFailures === 0 &&
    live.colorParser.parsing === "PASS" &&
    live.colorParser.normalizedChannelConversion === "PASS" &&
    live.colorParser.alphaCompositing === "PASS" &&
    live.colorParser.effectiveBackground === "PASS"
  );
}
