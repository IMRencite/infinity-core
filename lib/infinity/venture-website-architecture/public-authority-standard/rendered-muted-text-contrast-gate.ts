import type { Gate } from "../types";
import { RENDERED_MUTED_TEXT_CONTRAST_GATE } from "../constants";
import {
  compositeRgb,
  contrastRatio,
  parseCssColor,
  relativeLuminance,
  type ComputedTextSample,
} from "./rendered-text-contrast-gate";

export type MutedTextSample = ComputedTextSample & {
  fontSizePx?: number;
  fontWeight?: number;
  opacity?: number;
  text?: string;
};

const MUTED_ROLES = new Set([
  "eyebrow",
  "caption",
  "kicker",
  "helper",
  "footnote",
  "disclaimer",
  "table_caption",
  "secondary_label",
  "workflow_kicker",
  "sample_caption",
  "bottom_caption",
  "cta_muted",
]);

function isDarkSurface(role: string, background: { r: number; g: number; b: number }): boolean {
  if (/EMPHASIS|DARK|DARK_MODULE|DARK_ACCENT|cta/i.test(role)) return true;
  return relativeLuminance(background) < 0.25;
}

function isLargeText(sample: MutedTextSample): boolean {
  const size = sample.fontSizePx ?? 0;
  const weight = sample.fontWeight ?? 400;
  return size >= 18 || (size >= 14 && weight >= 700);
}

function mutedFloor(sample: MutedTextSample): number {
  return isLargeText(sample) ? 3 : 4.5;
}

export function evaluateMutedTextSample(sample: MutedTextSample): Gate {
  const fg = parseCssColor(sample.color);
  const bg = parseCssColor(sample.background);
  if (!fg || !bg) return "FAIL";
  const opacity = sample.opacity ?? fg.a ?? 1;
  const composited = compositeRgb({ ...fg, a: (fg.a == null ? 1 : fg.a) * opacity }, bg);
  const ratio = contrastRatio(composited, bg);
  if (ratio < mutedFloor(sample)) return "FAIL";
  if (isDarkSurface(sample.surfaceRole, bg) && opacity < 0.85) return "FAIL";
  return "PASS";
}

export function evaluateRenderedMutedTextContrastGate(input: {
  html: string;
  css: string;
  samples?: MutedTextSample[];
}): {
  gate: typeof RENDERED_MUTED_TEXT_CONTRAST_GATE;
  overall: Gate;
  samples: MutedTextSample[];
  darkSurfaceFailures: number;
  lightSurfaceFailures: number;
  missingMutedSamples: number;
  applicableDarkModules: number;
  validated: number;
  failed: number;
} {
  const html = input.html;
  const css = input.css;
  const hasDarkModule =
    /pv-product-frame|ProductUiFrame|data-surface=["']EMPHASIS["']|data-surface=["']DARK_ACCENT["']/.test(html);
  const hasMutedCopy = /pv-caption|figcaption|<caption|pv-lede|vg-kicker|pv-eyebrow|sn-kicker/.test(html);
  const samples = input.samples?.length ? input.samples : synthesizeMutedSamples(html, css);
  const applicable = samples.filter((sample) => MUTED_ROLES.has(sample.role) || /caption|kicker|eyebrow|helper|muted|disclaimer|footnote/i.test(sample.role));
  const missingMutedSamples = hasDarkModule && hasMutedCopy && applicable.length === 0 ? 1 : 0;
  const darkSurfaceFailures = applicable.filter((sample) => {
    const bg = parseCssColor(sample.background);
    return bg && isDarkSurface(sample.surfaceRole, bg) && evaluateMutedTextSample(sample) === "FAIL";
  }).length;
  const lightSurfaceFailures = applicable.filter((sample) => {
    const bg = parseCssColor(sample.background);
    return bg && !isDarkSurface(sample.surfaceRole, bg) && evaluateMutedTextSample(sample) === "FAIL";
  }).length;
  const failed = darkSurfaceFailures + lightSurfaceFailures + missingMutedSamples;
  const usesDarkTokens = /--pv-dark-muted-ink|--pv-dark-caption-ink/.test(css);
  const leak =
    hasDarkModule &&
    /\.pv-caption\s*\{[^}]*color:\s*#5a6573/i.test(css) &&
    !usesDarkTokens;
  return {
    gate: RENDERED_MUTED_TEXT_CONTRAST_GATE,
    overall: failed === 0 && !leak ? "PASS" : "FAIL",
    samples: applicable,
    darkSurfaceFailures: darkSurfaceFailures + (leak ? 1 : 0),
    lightSurfaceFailures,
    missingMutedSamples,
    applicableDarkModules: hasDarkModule ? 1 : 0,
    validated: applicable.length,
    failed: failed + (leak ? 1 : 0),
  };
}

function synthesizeMutedSamples(html: string, css: string): MutedTextSample[] {
  const usesDarkTokens = /--pv-dark-caption-ink/.test(css);
  const darkCaption = usesDarkTokens ? "#c9d6e6" : "#5a6573";
  const darkMuted = usesDarkTokens ? "#d5e0ec" : "#4b5568";
  const darkBg = "#0f1c2e";
  const samples: MutedTextSample[] = [];
  if (/pv-product-frame|ProductUiFrame/i.test(html)) {
    samples.push(
      {
        role: "workflow_kicker",
        surfaceRole: "DARK_MODULE",
        componentRole: "kicker",
        color: darkCaption,
        background: darkBg,
        contrast: null,
        opacity: 1,
        fontSizePx: 11.5,
        fontWeight: 500,
      },
      {
        role: "sample_caption",
        surfaceRole: "DEFAULT",
        componentRole: "table_caption",
        color: "#5a6573",
        background: "#f7f9fc",
        contrast: null,
        opacity: 1,
        fontSizePx: 11.5,
        fontWeight: 500,
      },
      {
        role: "bottom_caption",
        surfaceRole: "DARK_MODULE",
        componentRole: "caption",
        color: darkCaption,
        background: darkBg,
        contrast: null,
        opacity: 1,
        fontSizePx: 11.5,
        fontWeight: 500,
      },
    );
  }
  if (/data-surface=["']EMPHASIS["']/.test(html) && /pv-lede|vg-lede/.test(html)) {
    samples.push({
      role: "cta_muted",
      surfaceRole: "EMPHASIS",
      componentRole: "helper",
      color: darkMuted,
      background: "#123a5c",
      contrast: null,
      opacity: 1,
      fontSizePx: 16.8,
      fontWeight: 400,
    });
  }
  if (/sn-kicker|pv-eyebrow/.test(html)) {
    samples.push({
      role: "kicker",
      surfaceRole: "DEFAULT",
      componentRole: "kicker",
      color: "#1d4e89",
      background: "#ffffff",
      contrast: null,
      opacity: 1,
      fontSizePx: 12,
      fontWeight: 600,
    });
  }
  return samples.map((sample) => {
    const fg = parseCssColor(sample.color);
    const bg = parseCssColor(sample.background);
    return {
      ...sample,
      contrast: fg && bg ? Number(contrastRatio(fg, bg).toFixed(2)) : null,
    };
  });
}

export const FOUNDER_DARK_NAVY_LOW_OPACITY_CAPTION_FIXTURE = {
  html: `<figure class="pv-product-frame"><figcaption class="pv-caption">PROPOSED WORKFLOW SEQUENCE</figcaption><p class="pv-caption">ILLUSTRATIVE SAMPLE — NOT A PRODUCTION SCREENSHOT.</p></figure>`,
  css: `.pv-product-frame { background: #0f1c2e; }
.pv-caption { color: #5a6573; opacity: 0.55; }`,
  samples: [
    {
      role: "workflow_kicker",
      surfaceRole: "DARK_MODULE",
      componentRole: "kicker",
      color: "rgb(90, 101, 115)",
      background: "rgb(15, 28, 46)",
      contrast: 2.77,
      opacity: 0.55,
      fontSizePx: 11.5,
      fontWeight: 500,
      text: "PROPOSED WORKFLOW SEQUENCE",
    },
    {
      role: "bottom_caption",
      surfaceRole: "DARK_MODULE",
      componentRole: "caption",
      color: "rgb(90, 101, 115)",
      background: "rgb(15, 28, 46)",
      contrast: 2.77,
      opacity: 0.55,
      fontSizePx: 11.5,
      fontWeight: 500,
      text: "ILLUSTRATIVE SAMPLE — NOT A PRODUCTION SCREENSHOT.",
    },
  ] satisfies MutedTextSample[],
};

export const FOUNDER_DARK_NAVY_READABLE_MUTED_CAPTION_FIXTURE = {
  html: `<figure class="pv-product-frame"><figcaption class="pv-caption">PROPOSED WORKFLOW SEQUENCE</figcaption><p class="pv-caption">ILLUSTRATIVE SAMPLE — NOT A PRODUCTION SCREENSHOT.</p></figure>`,
  css: `:root { --pv-dark-caption-ink: #c9d6e6; --pv-dark-muted-ink: #d5e0ec; }
.pv-product-frame { background: #0f1c2e; }
.pv-product-frame .pv-caption { color: var(--pv-dark-caption-ink); opacity: 1; }`,
  samples: [
    {
      role: "workflow_kicker",
      surfaceRole: "DARK_MODULE",
      componentRole: "kicker",
      color: "rgb(201, 214, 230)",
      background: "rgb(15, 28, 46)",
      contrast: 11.2,
      opacity: 1,
      fontSizePx: 11.5,
      fontWeight: 500,
      text: "PROPOSED WORKFLOW SEQUENCE",
    },
    {
      role: "bottom_caption",
      surfaceRole: "DARK_MODULE",
      componentRole: "caption",
      color: "rgb(201, 214, 230)",
      background: "rgb(15, 28, 46)",
      contrast: 11.2,
      opacity: 1,
      fontSizePx: 11.5,
      fontWeight: 500,
      text: "ILLUSTRATIVE SAMPLE — NOT A PRODUCTION SCREENSHOT.",
    },
  ] satisfies MutedTextSample[],
};
