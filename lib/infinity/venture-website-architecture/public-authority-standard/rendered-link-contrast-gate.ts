import type { Gate } from "../types";
import { RENDERED_LINK_CONTRAST_GATE } from "../constants";
import {
  contrastRatio,
  parseCssColor,
  relativeLuminance,
  type ComputedTextSample,
} from "./rendered-text-contrast-gate";

export type RenderedLinkSample = ComputedTextSample & {
  href?: string;
  hoverColor?: string | null;
  focusColor?: string | null;
  visitedColor?: string | null;
  display?: string;
  visibility?: string;
  opacity?: number | string;
  width?: number;
  height?: number;
  intersecting?: boolean;
  ariaHidden?: boolean | string | null;
  inert?: boolean;
  text?: string;
  component?: string;
};

export type RenderedLinkContrastGateResult = {
  gate: typeof RENDERED_LINK_CONTRAST_GATE;
  overall: Gate;
  samples: RenderedLinkSample[];
  sameColorFailures: number;
  nearInvisibleFailures: number;
  hoverFocusFailures: number;
  trustedSourcesFailures: number;
  missingSamples: number;
};

function colorsMatch(left: string, right: string): boolean {
  const a = parseCssColor(left);
  const b = parseCssColor(right);
  if (!a || !b) return left.trim().toLowerCase() === right.trim().toLowerCase();
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

export function isHiddenOrInertLinkSample(sample: RenderedLinkSample): boolean {
  if (sample.display === "none") return true;
  if (sample.visibility === "hidden") return true;
  if (sample.opacity != null && Number(sample.opacity) === 0) return true;
  if ((sample.width != null && sample.width < 1) || (sample.height != null && sample.height < 1)) return true;
  if (sample.ariaHidden === true || sample.ariaHidden === "true") return true;
  if (sample.inert === true) return true;
  return false;
}

export function hasVisibilityEvidence(sample: RenderedLinkSample): boolean {
  return (
    sample.display != null ||
    sample.visibility != null ||
    sample.opacity != null ||
    sample.width != null ||
    sample.height != null ||
    sample.intersecting != null ||
    sample.ariaHidden != null ||
    sample.inert != null
  );
}

function nearInvisible(fg: string, bg: string): boolean {
  const a = parseCssColor(fg);
  const b = parseCssColor(bg);
  if (!a || !b) return false;
  const ratio = contrastRatio(a, b);
  const delta = Math.abs(relativeLuminance(a) - relativeLuminance(b));
  return ratio < 1.4 || delta < 0.04;
}

function linkPass(sample: RenderedLinkSample, opts: { allowLightInk?: boolean } = {}): Gate {
  const fg = parseCssColor(sample.color);
  const bg = parseCssColor(sample.background);
  if (!fg || !bg) return "FAIL";
  if (colorsMatch(sample.color, sample.background) || nearInvisible(sample.color, sample.background)) return "FAIL";
  const ratio = contrastRatio(fg, bg);
  const bgLight = relativeLuminance(bg) >= 0.45;
  const large = /title|heading|cta/i.test(sample.role);
  const floor = large ? 3 : 4.5;
  if (!bgLight && opts.allowLightInk) return ratio >= 3 ? "PASS" : "FAIL";
  if (ratio < floor) return "FAIL";
  for (const state of [sample.hoverColor, sample.focusColor, sample.visitedColor]) {
    if (!state) continue;
    if (colorsMatch(state, sample.background) || nearInvisible(state, sample.background)) return "FAIL";
    const stateFg = parseCssColor(state);
    if (stateFg && contrastRatio(stateFg, bg) < 3) return "FAIL";
  }
  return "PASS";
}

export const FOUNDER_LINK_SAME_COLOR_FIXTURE = {
  html: `<a href="/next">Next</a>`,
  css: `a { color: #123a5c; background: #123a5c; }`,
  samples: [
    {
      role: "inline_link",
      surfaceRole: "EMPHASIS",
      componentRole: "inline_link",
      color: "rgb(18, 58, 92)",
      background: "rgb(18, 58, 92)",
      contrast: 1,
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_LINK_NEAR_INVISIBLE_FIXTURE = {
  html: `<a href="/next">Next</a>`,
  css: `a { color: #1d4e89; } [data-surface="EMPHASIS"] { background: #123a5c; }`,
  samples: [
    {
      role: "emphasis_spoke_link",
      surfaceRole: "EMPHASIS",
      componentRole: "emphasis_spoke_link",
      color: "rgb(29, 78, 137)",
      background: "rgb(18, 58, 92)",
      contrast: 1.4,
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_LINK_HOVER_SAME_AS_BACKGROUND_FIXTURE = {
  html: `<a href="/next">Next</a>`,
  css: `a { color: #d7e8ff; } a:hover { color: #123a5c; }`,
  samples: [
    {
      role: "cta_link",
      surfaceRole: "EMPHASIS",
      componentRole: "cta_link",
      color: "rgb(215, 232, 255)",
      background: "rgb(18, 58, 92)",
      contrast: 10,
      hoverColor: "rgb(18, 58, 92)",
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_NESTED_PALE_LINK_FIXTURE = {
  html: `<section data-surface="EMPHASIS"><div class="pv-source-board"><a href="https://example.com">Source</a></div></section>`,
  css: `[data-surface="EMPHASIS"] a { color: #f7fbff; } .pv-source-board { background: #ffffff; }`,
  samples: [
    {
      role: "trusted_sources_link",
      surfaceRole: "SUBTLE",
      componentRole: "trusted_sources_link",
      color: "rgb(247, 251, 255)",
      background: "rgb(255, 255, 255)",
      contrast: 1.05,
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_TRUSTED_SOURCES_MISSING_LINK_SAMPLE_FIXTURE = {
  html: `<section class="pv-source-board"><h2>Trusted sources</h2><a href="https://example.com">Source</a></section>`,
  css: `.pv-source-board a { color: #1d4e89; }`,
  samples: [] as RenderedLinkSample[],
};

export const FOUNDER_LINK_GOOD_FIXTURE = {
  html: `<section class="pv-source-board"><h2>Trusted sources</h2><a href="https://example.com">Source</a></section>`,
  css: `.pv-source-board { background: #ffffff; } .pv-source-board h2 { color: #152033; } .pv-source-board a { color: #1d4e89; }`,
  samples: [
    {
      role: "trusted_sources_title",
      surfaceRole: "SUBTLE",
      componentRole: "trusted_sources_title",
      color: "rgb(21, 32, 51)",
      background: "rgb(255, 255, 255)",
      contrast: 14.5,
    },
    {
      role: "trusted_sources_link",
      surfaceRole: "SUBTLE",
      componentRole: "trusted_sources_link",
      color: "rgb(29, 78, 137)",
      background: "rgb(255, 255, 255)",
      contrast: 7.2,
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE = {
  html: `<nav class="pv-nav"><a class="pv-nav-brand" href="/">Lease NPV comparison</a></nav>`,
  css: `.pv-nav { background: #010101; } .pv-nav-brand { color: #152033; }`,
  samples: [
    {
      role: "nav_brand",
      surfaceRole: "DEFAULT",
      componentRole: "nav_brand",
      color: "rgb(21, 32, 51)",
      background: "rgb(1, 1, 1)",
      contrast: 1.28,
      display: "block",
      visibility: "visible",
      opacity: 1,
      width: 178,
      height: 28,
      intersecting: true,
      href: "/",
      text: "Lease NPV comparison",
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE = {
  html: `<nav class="pv-nav"><a class="pv-nav-brand" href="/">Lease NPV comparison</a></nav>`,
  css: `.pv-nav { background: var(--pv-surface); } .pv-nav-brand { color: var(--pv-text); }`,
  samples: [
    {
      role: "nav_brand",
      surfaceRole: "DEFAULT",
      componentRole: "nav_brand",
      color: "rgb(21, 32, 51)",
      background: "rgb(255, 255, 255)",
      contrast: 15.05,
      display: "block",
      visibility: "visible",
      opacity: 1,
      width: 178,
      height: 28,
      intersecting: true,
      href: "/",
      text: "Lease NPV comparison",
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_SITE_CHROME_HIDDEN_DUPLICATE_FIXTURE = {
  html: `<nav class="pv-nav"><a class="pv-nav-brand" href="/">Lease NPV comparison</a><a href="/how-it-works" aria-hidden="true">How it works</a></nav>`,
  css: `.pv-nav { background: #ffffff; } .pv-nav a { color: #152033; }`,
  samples: [
    {
      role: "nav_brand",
      surfaceRole: "DEFAULT",
      componentRole: "nav_brand",
      color: "rgb(21, 32, 51)",
      background: "rgb(255, 255, 255)",
      contrast: 15.05,
      display: "block",
      visibility: "visible",
      opacity: 1,
      width: 178,
      height: 28,
      intersecting: true,
    },
    {
      role: "nav_link",
      surfaceRole: "DEFAULT",
      componentRole: "nav_link",
      color: "rgb(21, 32, 51)",
      background: "rgb(1, 1, 1)",
      contrast: 1.28,
      display: "none",
      visibility: "hidden",
      opacity: 0,
      width: 0,
      height: 0,
      intersecting: false,
      ariaHidden: "true",
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_SITE_CHROME_SRGB_SURFACE_FIXTURE = {
  html: `<nav class="pv-nav"><a class="pv-nav-brand" href="/">Lease NPV comparison</a></nav>`,
  css: `.pv-nav { background: color-mix(in srgb, #ffffff 92%, transparent); }`,
  samples: [
    {
      role: "nav_brand",
      surfaceRole: "DEFAULT",
      componentRole: "nav_brand",
      color: "rgb(21, 32, 51)",
      background: "color(srgb 1 1 1 / 0.92)",
      contrast: 15.05,
      display: "block",
      visibility: "visible",
      opacity: 1,
      width: 178,
      height: 28,
      intersecting: true,
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE = {
  html: `<header class="pv-hero pv-hero-photo"><div class="pv-hero-actions-row"><a class="pv-hero-secondary" href="/lease-comparison">Compare two leases</a><a class="pv-hero-secondary" href="/how-it-works">See the workflow</a></div></header>`,
  css: `.pv-hero-secondary { color: #f4f7fb; background: rgba(8, 16, 28, 0.28); }`,
  samples: [
    {
      role: "inline_link",
      surfaceRole: "DEFAULT",
      componentRole: "hero_link",
      color: "rgb(244, 247, 251)",
      background: "rgb(178, 182, 186)",
      contrast: 1.9,
      href: "/lease-comparison",
      text: "Compare two leases",
      display: "inline-flex",
      visibility: "visible",
      opacity: 1,
      width: 168,
      height: 41,
      intersecting: true,
    },
    {
      role: "inline_link",
      surfaceRole: "DEFAULT",
      componentRole: "hero_link",
      color: "rgb(244, 247, 251)",
      background: "rgb(178, 182, 186)",
      contrast: 1.9,
      href: "/how-it-works",
      text: "See the workflow",
      display: "inline-flex",
      visibility: "visible",
      opacity: 1,
      width: 156,
      height: 41,
      intersecting: true,
    },
    {
      role: "inline_link",
      surfaceRole: "DEFAULT",
      componentRole: "hero_link",
      color: "rgb(244, 247, 251)",
      background: "rgb(178, 182, 186)",
      contrast: 1.9,
      href: "/lease-comparison",
      text: "Compare two leases",
      hoverColor: "rgb(244, 247, 251)",
      display: "inline-flex",
      visibility: "visible",
      opacity: 1,
      width: 168,
      height: 41,
      intersecting: true,
    },
    {
      role: "inline_link",
      surfaceRole: "DEFAULT",
      componentRole: "hero_link",
      color: "rgb(244, 247, 251)",
      background: "rgb(178, 182, 186)",
      contrast: 1.9,
      href: "/how-it-works",
      text: "See the workflow",
      focusColor: "rgb(244, 247, 251)",
      display: "inline-flex",
      visibility: "visible",
      opacity: 1,
      width: 156,
      height: 41,
      intersecting: true,
    },
  ] satisfies RenderedLinkSample[],
};

export const FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE = {
  html: `<header class="pv-hero pv-hero-photo"><div class="pv-hero-actions-row"><a class="pv-hero-secondary" href="/lease-comparison">Compare two leases</a><a class="pv-hero-secondary" href="/how-it-works">See the workflow</a></div></header>`,
  css: `.pv-hero-secondary { --pv-hero-secondary-surface: var(--pv-text); color: #f4f7fb; background: #152033; }`,
  samples: [
    {
      role: "hero_link",
      surfaceRole: "DEFAULT",
      componentRole: "hero_link",
      color: "rgb(244, 247, 251)",
      background: "rgb(21, 32, 51)",
      contrast: 16.33,
      href: "/lease-comparison",
      text: "Compare two leases",
      hoverColor: "rgb(244, 247, 251)",
      focusColor: "rgb(244, 247, 251)",
      visitedColor: "rgb(244, 247, 251)",
      display: "inline-flex",
      visibility: "visible",
      opacity: 1,
      width: 168,
      height: 41,
      intersecting: true,
    },
    {
      role: "hero_link",
      surfaceRole: "DEFAULT",
      componentRole: "hero_link",
      color: "rgb(244, 247, 251)",
      background: "rgb(21, 32, 51)",
      contrast: 16.33,
      href: "/how-it-works",
      text: "See the workflow",
      hoverColor: "rgb(244, 247, 251)",
      focusColor: "rgb(244, 247, 251)",
      visitedColor: "rgb(244, 247, 251)",
      display: "inline-flex",
      visibility: "visible",
      opacity: 1,
      width: 156,
      height: 41,
      intersecting: true,
    },
  ] satisfies RenderedLinkSample[],
};

export function evaluateRenderedLinkContrastGate(input: {
  html: string;
  css: string;
  samples?: RenderedLinkSample[];
  requireVisibilityEvidence?: boolean;
}): RenderedLinkContrastGateResult {
  const samples = input.samples ?? [];
  const visible = samples.filter((sample) => !isHiddenOrInertLinkSample(sample));
  const sourceRequired = /pv-source-board|Trusted sources/i.test(input.html);
  const linkRequired = /<a\b/i.test(input.html);
  const missingVisibility =
    input.requireVisibilityEvidence === true &&
    samples.some((sample) => !hasVisibilityEvidence(sample) && !isHiddenOrInertLinkSample(sample));
  const missingSamples = [
    linkRequired && samples.length === 0,
    sourceRequired && !samples.some((sample) => sample.role === "trusted_sources_link"),
    sourceRequired && !samples.some((sample) => sample.role === "trusted_sources_title" || sample.role === "trusted_sources_link"),
    missingVisibility,
  ].filter(Boolean).length;
  const sameColorFailures = visible.filter((sample) => colorsMatch(sample.color, sample.background)).length;
  const nearInvisibleFailures = visible.filter((sample) => !colorsMatch(sample.color, sample.background) && nearInvisible(sample.color, sample.background)).length;
  const hoverFocusFailures = visible.filter((sample) => {
    const states = [sample.hoverColor, sample.focusColor, sample.visitedColor].filter(Boolean) as string[];
    return states.some((state) => colorsMatch(state, sample.background) || nearInvisible(state, sample.background));
  }).length;
  const trustedSourcesFailures = visible.filter((sample) => /trusted_sources/.test(sample.role) && linkPass(sample) === "FAIL").length;
  const failingLinks = visible.filter((sample) => linkPass(sample, { allowLightInk: /cta|spoke|emphasis/i.test(sample.role) }) === "FAIL").length;
  const overall =
    missingSamples === 0 &&
    sameColorFailures === 0 &&
    nearInvisibleFailures === 0 &&
    hoverFocusFailures === 0 &&
    trustedSourcesFailures === 0 &&
    failingLinks === 0
      ? "PASS"
      : "FAIL";
  return {
    gate: RENDERED_LINK_CONTRAST_GATE,
    overall,
    samples,
    sameColorFailures,
    nearInvisibleFailures,
    hoverFocusFailures,
    trustedSourcesFailures,
    missingSamples,
  };
}

export const RENDERED_LINK_CONTRAST_BROWSER_SCRIPT = `(() => {
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
    return "rgb(" + resolved.r + ", " + resolved.g + ", " + resolved.b + ")";
  };
  const roleFor = (el) => {
    if (el.closest(".pv-source-board")) return "trusted_sources_link";
    if (el.closest(".pv-nav")) return el.classList.contains("pv-nav-brand") ? "nav_brand" : "nav_link";
    if (el.closest(".pv-breadcrumb")) return "breadcrumb_link";
    if (el.closest(".pv-spoke-index")) return "emphasis_spoke_link";
    if (el.classList.contains("pv-hero-secondary") || el.closest(".pv-hero-actions-row")) return "hero_link";
    if (el.closest(".pv-cta-panel")) return "cta_link";
    if (el.closest(".sn-card, .sn-block")) return "card_link";
    if (el.closest("footer")) return "footer_link";
    if (el.closest(".disclosure")) return "disclosure_link";
    return "inline_link";
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return [...document.querySelectorAll("a")].slice(0, 80).map((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const fg = parse(style.color);
    const bgValue = effectiveBg(el);
    const bg = parse(bgValue);
    return {
      role: roleFor(el),
      surfaceRole: el.closest("[data-surface]")?.getAttribute("data-surface") || "DEFAULT",
      componentRole: roleFor(el),
      color: style.color,
      background: bgValue,
      contrast: fg && bg ? Number(ratio(fg, bg).toFixed(2)) : null,
      href: el.getAttribute("href"),
      text: (el.innerText || el.textContent || "").trim().slice(0, 80),
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: rect.width,
      height: rect.height,
      intersecting: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw,
      ariaHidden: el.getAttribute("aria-hidden") || el.closest("[aria-hidden]")?.getAttribute("aria-hidden") || null,
      inert: Boolean(el.inert || el.closest("[inert]")),
    };
  });
})()`;
