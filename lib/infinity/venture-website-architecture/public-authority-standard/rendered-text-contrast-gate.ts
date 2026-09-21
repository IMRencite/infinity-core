import type { Gate } from "../types";
import { RENDERED_HEADING_INK_GATE, RENDERED_TEXT_CONTRAST_GATE } from "../constants";
import { pageContent } from "../answer-authority/page-inspect";

export type Rgb = { r: number; g: number; b: number; a?: number };

export type ComputedTextSample = {
  role: string;
  surfaceRole: string;
  componentRole: string;
  color: string;
  background: string;
  contrast: number | null;
  luminance?: number | null;
};

export type RenderedTextContrastGateResult = {
  gate: typeof RENDERED_TEXT_CONTRAST_GATE;
  headingGate: typeof RENDERED_HEADING_INK_GATE;
  overall: Gate;
  headings: Gate;
  samples: ComputedTextSample[];
  paleTitlesOnLight: number;
  unscopedEmphasisLeaks: number;
  nestedLightWithoutInkReset: number;
  goDeeperTitle: Gate;
  cardTitles: Gate;
  trustedSources: Gate;
  trustedSourcesLinks: Gate;
  trustedSourcesBody: Gate;
  missingMandatorySamples: number;
  disclosure: Gate;
  cta: Gate;
  emphasisSpokeLinks: Gate;
  darkOnDarkEmphasis: number;
  whyItMattersBody: Gate;
};

const HEADING_ROLES = new Set([
  "section_h2",
  "section_h3",
  "card_title",
  "semantic_nav_title",
  "trusted_sources_title",
  "disclosure_heading",
  "go_deeper_title",
  "related_questions_title",
]);

export function parseCssColor(value: string): Rgb | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((item) => `${item}${item}`)
            .join("")
        : raw;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const srgb = value.trim().match(/^color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\)$/i);
  if (srgb) {
    return {
      r: Math.round(Number(srgb[1]) * 255),
      g: Math.round(Number(srgb[2]) * 255),
      b: Math.round(Number(srgb[3]) * 255),
      a: srgb[4] != null ? Number(srgb[4]) : 1,
    };
  }
  const nums = value.match(/[0-9.]+/g);
  if (!nums || nums.length < 3) return null;
  return { r: Number(nums[0]), g: Number(nums[1]), b: Number(nums[2]), a: nums[3] != null ? Number(nums[3]) : 1 };
}

export function compositeRgb(fg: Rgb, bg: Rgb): Rgb {
  const alpha = fg.a == null || Number.isNaN(fg.a) ? 1 : Math.min(1, Math.max(0, fg.a));
  if (alpha >= 0.99) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  };
}

export function relativeLuminance(color: Rgb): number {
  const lin = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(color.r) + 0.7152 * lin(color.g) + 0.0722 * lin(color.b);
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const left = relativeLuminance(foreground);
  const right = relativeLuminance(background);
  const [hi, lo] = left >= right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

function isLightSurface(role: string, background: Rgb): boolean {
  if (/EMPHASIS|DARK_ACCENT|cta/i.test(role)) return false;
  return relativeLuminance(background) >= 0.45;
}

function unscopedEmphasisLinkLeak(css: string): boolean {
  const unscoped =
    /\[data-surface=["']EMPHASIS["']\]\s+a\s*\{[^}]*color:\s*#(d7e8ff|f7fbff|ffffff|fff)/i.test(css) ||
    /\.emphasis\s+a\s*\{[^}]*color:\s*#(d7e8ff|f7fbff|ffffff|fff|e8f0ff)/i.test(css);
  const moduleLinkReset =
    /--pv-source-board-link/.test(css) ||
    /\[data-surface=["']EMPHASIS["']\][^{]*\.(pv-source-board|sn-block|sn-card|pv-related-editorial) a/i.test(css);
  return unscoped && !moduleLinkReset;
}

function nestedLightWithoutReset(html: string, css: string): boolean {
  const nested = /data-surface=["']EMPHASIS["'][\s\S]{0,8000}(?:data-surface=["'](?:SUBTLE|TINTED|DEFAULT|EDITORIAL)["']|class(?:Name)?=["'][^"']*(?:sn-block|pv-source-board|pv-related-editorial))/i.test(
    html,
  );
  const reset =
    /--pv-surface-ink-reset/.test(css) ||
    /--pv-source-board-ink/.test(css) ||
    /\[data-surface=["']EMPHASIS["']\][^{]*\.sn-title/.test(css);
  return nested && !reset;
}

function resolveCssColorValue(css: string, raw: string, depth = 0): string {
  const value = raw.trim();
  if (depth > 6) return value;
  const hex = value.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (hex) return hex[0];
  const rgb = value.match(/rgba?\([^)]+\)/i);
  if (rgb) return rgb[0];
  const variable = value.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/i);
  if (!variable) return value;
  const defined = css.match(
    new RegExp(`${variable[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])\\s*:\\s*([^;}]+)`, "i"),
  );
  if (defined) return resolveCssColorValue(css, defined[1], depth + 1);
  if (variable[2]) return resolveCssColorValue(css, variable[2], depth + 1);
  return value;
}

function cssColorFor(css: string, selectors: string[], fallback: string): string {
  for (const selector of selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const match = css.match(new RegExp(`${escaped}\\s*\\{[^}]*(?:^|[;{]|\\s)color:\\s*([^;}]+)`, "i"));
    if (match) return resolveCssColorValue(css, match[1]);
  }
  return resolveCssColorValue(css, fallback);
}

function cssBackgroundFor(css: string, selectors: string[], fallback: string): string {
  for (const selector of selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const match = css.match(new RegExp(`${escaped}\\s*\\{[^}]*background(?:-color)?:\\s*([^;}]+)`, "i"));
    if (match) return resolveCssColorValue(css, match[1]);
  }
  return resolveCssColorValue(css, fallback);
}

function sampleFromCascade(input: {
  role: string;
  surfaceRole: string;
  componentRole: string;
  color: string;
  background: string;
}): ComputedTextSample {
  const fg = parseCssColor(input.color);
  const bg = parseCssColor(input.background);
  return {
    ...input,
    contrast: fg && bg ? Number(contrastRatio(fg, bg).toFixed(2)) : null,
    luminance: fg ? Number(relativeLuminance(fg).toFixed(3)) : null,
  };
}

function rolePass(sample: ComputedTextSample | undefined, opts: { allowLightInk?: boolean; allowMissing?: boolean } = {}): Gate {
  if (!sample) return opts.allowMissing ? "PASS" : "FAIL";
  const fg = parseCssColor(sample.color);
  const bg = parseCssColor(sample.background);
  if (!fg || !bg) return "FAIL";
  const light = isLightSurface(sample.surfaceRole, bg);
  const lum = relativeLuminance(fg);
  const ratio = contrastRatio(fg, bg);
  if (opts.allowLightInk && !light) return ratio >= 3 ? "PASS" : "FAIL";
  if (light && lum > 0.62) return "FAIL";
  if (light && ratio < 4.5) return "FAIL";
  return "PASS";
}

function paleCount(samples: ComputedTextSample[]): number {
  return samples.filter((sample) => {
    const fg = parseCssColor(sample.color);
    const bg = parseCssColor(sample.background);
    if (!fg || !bg) return false;
    return isLightSurface(sample.surfaceRole, bg) && relativeLuminance(fg) > 0.62;
  }).length;
}

function htmlHasTrustedSources(html: string): boolean {
  return /pv-source-board/i.test(html) || /Trusted sources/i.test(html);
}

function htmlHasEmphasisSpokes(html: string): boolean {
  return /pv-spoke-index/i.test(html) && /data-surface=["']EMPHASIS["']/i.test(html);
}

function darkOnDarkCount(samples: ComputedTextSample[]): number {
  return samples.filter((sample) => {
    const fg = parseCssColor(sample.color);
    const bg = parseCssColor(sample.background);
    if (!fg || !bg) return false;
    return relativeLuminance(bg) < 0.25 && relativeLuminance(fg) < 0.35 && contrastRatio(fg, bg) < 4.5;
  }).length;
}

function sourceBoardTitleInkIsExplicitlyDark(css: string): boolean {
  const raw =
    css.match(/\.pv-source-board(?:\s+h2)?\s*\{[^}]*(?:^|[;{]|\s)color:\s*([^;}]+)/i)?.[1] ??
    css.match(/\.pv-source-board\s+h2\s*,[^{]*\{[^}]*(?:^|[;{]|\s)color:\s*([^;}]+)/i)?.[1];
  if (!raw) return false;
  if (/inherit|currentColor/i.test(raw)) return false;
  const resolved = resolveCssColorValue(css, raw);
  const rgb = parseCssColor(resolved);
  if (!rgb) return /--pv-source-board-ink|#152033|#0f2740|#123a5c/i.test(raw + resolved);
  return relativeLuminance(rgb) <= 0.35;
}

function paleTrustedSourcesBoard(html: string, css: string): boolean {
  if (!htmlHasTrustedSources(html)) return false;
  if (sourceBoardTitleInkIsExplicitlyDark(css)) return false;
  const nestedInEmphasis = /data-surface=["']EMPHASIS["'][\s\S]{0,12000}pv-source-board/i.test(html);
  const inheritTitle = /\.pv-source-board(?:\s+h2)?\s*\{[^}]*color:\s*inherit/i.test(css);
  const noTitleColor = !/\.pv-source-board(?:\s+h2)?[^{]*\{[^}]*\bcolor:/i.test(css);
  return nestedInEmphasis && (inheritTitle || noTitleColor || unscopedEmphasisLinkLeak(css));
}

export const FOUNDER_EMPHASIS_LEAK_FIXTURE = {
  html: `<section class="emphasis" data-surface="EMPHASIS">
    <div class="sn-block" data-surface="TINTED">
      <p class="sn-kicker">GO DEEPER</p>
      <a class="sn-card" href="/next"><strong class="sn-title">A closer look</strong><span>Card description</span></a>
    </div>
    <div class="pv-source-board"><h2>Trusted Sources</h2><a href="https://example.com">Source link</a></div>
    <div class="disclosure"><h2>Disclosure</h2><p>Legal note <a href="/privacy">Privacy</a></p></div>
  </section>`,
  css: `:root { --pv-surface-emphasis-ink: #f7fbff; }
[data-surface="EMPHASIS"] { color: #f7fbff; background-color: #123a5c; }
.emphasis a { color: #d7e8ff; }
[data-surface="EMPHASIS"] a { color: #d7e8ff; }
[data-surface="TINTED"] .sn-card { background: #ffffff; }
.sn-card { color: inherit; }
.sn-title { color: inherit; }
.pv-source-board h2 { color: inherit; }`,
};

export const FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE = {
  html: `<section class="pv-cta-band" data-surface="EMPHASIS">
    <div class="pv-cta-panel"><h2>Next step</h2><a href="/compare-commercial-leases">Try the comparison workflow</a></div>
    <p class="pv-spoke-index"><a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease">What is NPV in a commercial lease?</a></p>
    <section class="pv-source-board">
      <h2>Trusted sources</h2>
      <p>These are public references. They are not endorsements and not client results.</p>
      <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia — net present value</a>
    </section>
  </section>`,
  css: `:root { --pv-surface-emphasis-ink: #f7fbff; }
[data-surface="EMPHASIS"] { color: #f7fbff; background-color: #123a5c; }
[data-surface="EMPHASIS"] a { color: #d7e8ff; }
.pv-source-board { margin: 2rem 0 0; padding: 1.35rem 1.4rem; border-radius: 16px; background: #ffffff; }
.pv-source-board h2 { margin: 0; }
[data-surface="TINTED"] .sn-card { background: #ffffff; }`,
};

export const FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE = {
  html: FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE.html,
  css: `:root { --pv-surface-emphasis-ink: #f7fbff; --pv-source-board-ink: #152033; --pv-source-board-link: #1d4e89; --pv-surface-ink-reset: #152033; --pv-emphasis-band-link: #d7e8ff; }
[data-surface="EMPHASIS"] { color: #f7fbff; background-color: #123a5c; }
[data-surface="EMPHASIS"] .pv-cta-panel a { color: #d7e8ff; }
[data-surface="EMPHASIS"] a,
[data-surface="EMPHASIS"] .pv-spoke-index a { color: var(--pv-emphasis-band-link, #d7e8ff); }
[data-surface="EMPHASIS"] .pv-source-board a { color: var(--pv-source-board-link); }
.pv-source-board { margin: 2rem 0 0; padding: 1.35rem 1.4rem; border-radius: 16px; background: #ffffff; color: var(--pv-source-board-ink); }
.pv-source-board h2, .pv-source-board p, .pv-source-board li { color: var(--pv-source-board-ink); }
.pv-source-board a { color: var(--pv-source-board-link); }
[data-surface="TINTED"] .sn-card { background: #ffffff; }`,
};

export const FOUNDER_EMPHASIS_SPOKE_DARK_ON_DARK_FIXTURE = {
  html: FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE.html,
  css: `:root { --pv-surface-emphasis-ink: #f7fbff; --pv-source-board-ink: #152033; --pv-source-board-link: #1d4e89; --pv-surface-ink-reset: #152033; --pv-accent: #1d4e89; }
[data-surface="EMPHASIS"] { color: #f7fbff; background-color: #123a5c; }
[data-surface="EMPHASIS"] .pv-cta-panel a { color: #d7e8ff; }
a { color: #1d4e89; }
.pv-source-board { background: #ffffff; color: var(--pv-source-board-ink); }
.pv-source-board h2, .pv-source-board p { color: var(--pv-source-board-ink); }
.pv-source-board a { color: var(--pv-source-board-link); }`,
};

export const FOUNDER_TRUSTED_SOURCES_COMPUTED_SAMPLE: ComputedTextSample = {
  role: "trusted_sources_title",
  surfaceRole: "SUBTLE",
  componentRole: "trusted_sources_title",
  color: "rgb(247, 251, 255)",
  background: "rgb(255, 255, 255)",
  contrast: 1.05,
  luminance: 0.97,
};

export function evaluateRenderedTextContrastGate(input: {
  html: string;
  css: string;
  samples?: ComputedTextSample[];
}): RenderedTextContrastGateResult {
  const leaks = unscopedEmphasisLinkLeak(input.css) ? 1 : 0;
  const nested = nestedLightWithoutReset(input.html, input.css) ? 1 : 0;
  const paleSourceBoard = paleTrustedSourcesBoard(input.html, input.css);
  const inheritedPale =
    (leaks > 0 || paleSourceBoard) &&
    /sn-title|pv-source-board h2|Trusted [Ss]ources|GO DEEPER|A closer look/i.test(input.html) &&
    (/color:\s*inherit/.test(input.css) || paleSourceBoard);
  const cardBg = cssBackgroundFor(input.css, ['[data-surface="TINTED"] .sn-card', ".sn-card"], "#ffffff");
  const lightInk = cssColorFor(input.css, [".sn-title", "[data-surface=\"DEFAULT\"]"], inheritedPale ? "#d7e8ff" : "#152033");
  const emphasisInk = cssColorFor(input.css, ['[data-surface="EMPHASIS"]', ".pv-cta-panel"], "#f7fbff");
  const emphasisBg = cssBackgroundFor(input.css, ['[data-surface="EMPHASIS"]'], "#123a5c");
  const sourceTitle = cssColorFor(input.css, [".pv-source-board h2", ".sn-title"], inheritedPale ? "#d7e8ff" : "#152033");
  const sourceLink = cssColorFor(input.css, [".pv-source-board a"], inheritedPale ? "#d7e8ff" : "#1d4e89");
  const sourceBody = cssColorFor(input.css, [".pv-source-board p", ".pv-source-board"], inheritedPale ? "#d7e8ff" : "#152033");
  const spokeLink = cssColorFor(
    input.css,
    [".pv-spoke-index a", "[data-surface=\"EMPHASIS\"] .pv-spoke-index a", "[data-surface=\"EMPHASIS\"] a"],
    /--pv-emphasis-band-link/.test(input.css) ? "#d7e8ff" : "#1d4e89",
  );
  const disclosureInk = cssColorFor(input.css, [".disclosure", "[data-surface=\"DEFAULT\"]"], inheritedPale ? "#d7e8ff" : "#152033");
  const whyInk = cssColorFor(input.css, [".pv-section-visual p", ".pv-section-visual h2"], "#152033");
  const whyBg = cssBackgroundFor(input.css, [".pv-section-visual"], "#f3f6f9");
  const cascade: ComputedTextSample[] = [
    sampleFromCascade({
      role: "go_deeper_title",
      surfaceRole: "TINTED",
      componentRole: "semantic_nav_title",
      color: lightInk,
      background: cardBg,
    }),
    sampleFromCascade({
      role: "card_title",
      surfaceRole: "TINTED",
      componentRole: "card_title",
      color: lightInk,
      background: cardBg,
    }),
    sampleFromCascade({
      role: "trusted_sources_title",
      surfaceRole: "SUBTLE",
      componentRole: "trusted_sources_title",
      color: sourceTitle,
      background: "#ffffff",
    }),
    sampleFromCascade({
      role: "trusted_sources_link",
      surfaceRole: "SUBTLE",
      componentRole: "trusted_sources_link",
      color: sourceLink,
      background: "#ffffff",
    }),
    sampleFromCascade({
      role: "trusted_sources_body",
      surfaceRole: "SUBTLE",
      componentRole: "trusted_sources_body",
      color: sourceBody,
      background: "#ffffff",
    }),
    sampleFromCascade({
      role: "disclosure_heading",
      surfaceRole: "DEFAULT",
      componentRole: "disclosure_heading",
      color: disclosureInk,
      background: "#ffffff",
    }),
    sampleFromCascade({
      role: "cta_title",
      surfaceRole: "EMPHASIS",
      componentRole: "cta_title",
      color: emphasisInk,
      background: emphasisBg,
    }),
    sampleFromCascade({
      role: "emphasis_spoke_link",
      surfaceRole: "EMPHASIS",
      componentRole: "emphasis_spoke_link",
      color: spokeLink,
      background: emphasisBg,
    }),
    sampleFromCascade({
      role: "why_it_matters_body",
      surfaceRole: "SUBTLE",
      componentRole: "photo_overlay_body",
      color: whyInk,
      background: whyBg,
    }),
  ];
  const samples = input.samples?.length ? input.samples : cascade;
  const paleTitlesOnLight =
    paleCount(samples.filter((sample) => HEADING_ROLES.has(sample.role) || /title/i.test(sample.role))) +
    (paleSourceBoard ? 1 : 0);
  const byRole = (role: string) => samples.find((sample) => sample.role === role);
  const sourceRequired = htmlHasTrustedSources(input.html);
  const spokeRequired = htmlHasEmphasisSpokes(input.html);
  const darkOnDarkEmphasis = darkOnDarkCount(samples);
  const allowMissing = Boolean(input.samples?.length) && paleTitlesOnLight === 0 && !paleSourceBoard && darkOnDarkEmphasis === 0;
  const goDeeperTitle = rolePass(byRole("go_deeper_title") ?? byRole("semantic_nav_title") ?? byRole("card_title"), { allowMissing });
  const cardTitles = rolePass(byRole("card_title"), { allowMissing });
  const trustedSources = rolePass(byRole("trusted_sources_title"), {
    allowMissing: allowMissing && !sourceRequired,
  });
  const trustedSourcesLinks = rolePass(byRole("trusted_sources_link"), {
    allowMissing: allowMissing && !sourceRequired,
  });
  const trustedSourcesBody = rolePass(byRole("trusted_sources_body"), {
    allowMissing: allowMissing && !sourceRequired,
  });
  const missingMandatorySamples = [
    sourceRequired && !byRole("trusted_sources_title"),
    sourceRequired && !byRole("trusted_sources_link"),
    sourceRequired && !byRole("trusted_sources_body"),
    spokeRequired && !byRole("emphasis_spoke_link"),
  ].filter(Boolean).length;
  const disclosure = rolePass(byRole("disclosure_heading") ?? byRole("disclosure_text"), { allowMissing });
  const cta = rolePass(byRole("cta_title") ?? byRole("cta_body") ?? byRole("cta_link"), { allowLightInk: true, allowMissing });
  const emphasisSpokeLinks = rolePass(byRole("emphasis_spoke_link"), {
    allowLightInk: true,
    allowMissing: allowMissing && !spokeRequired,
  });
  const whyItMattersBody = rolePass(byRole("why_it_matters_body"), { allowMissing });
  const headingSamples = samples.filter((sample) => HEADING_ROLES.has(sample.role) || /title|heading/i.test(sample.role));
  const headings =
    headingSamples.length === 0
      ? allowMissing && !sourceRequired
        ? "PASS"
        : "FAIL"
      : headingSamples.every((sample) => rolePass(sample) === "PASS") && trustedSources === "PASS"
        ? "PASS"
        : "FAIL";
  const failures = [
    paleTitlesOnLight > 0,
    leaks > 0,
    nested > 0,
    paleSourceBoard,
    goDeeperTitle === "FAIL",
    cardTitles === "FAIL",
    trustedSources === "FAIL",
    trustedSourcesLinks === "FAIL",
    trustedSourcesBody === "FAIL",
    missingMandatorySamples > 0,
    disclosure === "FAIL",
    cta === "FAIL",
    emphasisSpokeLinks === "FAIL",
    darkOnDarkEmphasis > 0,
    headings === "FAIL",
  ].filter(Boolean).length;
  return {
    gate: RENDERED_TEXT_CONTRAST_GATE,
    headingGate: RENDERED_HEADING_INK_GATE,
    overall: failures === 0 ? "PASS" : "FAIL",
    headings,
    samples,
    paleTitlesOnLight,
    unscopedEmphasisLeaks: leaks,
    nestedLightWithoutInkReset: nested,
    goDeeperTitle,
    cardTitles,
    trustedSources,
    trustedSourcesLinks,
    trustedSourcesBody,
    missingMandatorySamples,
    disclosure,
    cta,
    emphasisSpokeLinks,
    darkOnDarkEmphasis,
    whyItMattersBody,
  };
}

export function evaluateRenderedHeadingInkGate(input: {
  html: string;
  css: string;
  samples?: ComputedTextSample[];
}): { gate: typeof RENDERED_HEADING_INK_GATE; overall: Gate } {
  const result = evaluateRenderedTextContrastGate(input);
  return { gate: RENDERED_HEADING_INK_GATE, overall: result.headings };
}

export function evaluateRenderedTextContrastFromFiles(
  files: Array<{ path: string; content: string; encoding?: string }>,
): RenderedTextContrastGateResult {
  const css =
    files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const html = files
    .filter((file) => file.encoding !== "base64" && file.path.replace(/\\/g, "/").endsWith("/page.tsx"))
    .map((file) => file.content)
    .join("\n");
  return evaluateRenderedTextContrastGate({ html, css });
}

export const RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT = `(() => {
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
    const l1 = lum(a); const l2 = lum(b);
    const hi = Math.max(l1, l2); const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  };
  const effectiveBg = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const color = parse(style.backgroundColor);
      if (color && (color.a == null || color.a > 0.08)) return { css: style.backgroundColor, rgb: color, surface: node.getAttribute("data-surface") || "" };
      node = node.parentElement;
    }
    return { css: "rgb(255, 255, 255)", rgb: { r: 255, g: 255, b: 255, a: 1 }, surface: "DEFAULT" };
  };
  const take = (el, role, componentRole) => {
    if (!el) return null;
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = effectiveBg(el);
    const surface = el.closest("[data-surface]")?.getAttribute("data-surface") || bg.surface || "DEFAULT";
    return {
      role,
      surfaceRole: surface,
      componentRole,
      color: style.color,
      background: bg.css,
      contrast: fg && bg.rgb ? Number(ratio(fg, bg.rgb).toFixed(2)) : null,
      luminance: fg ? Number(lum(fg).toFixed(3)) : null,
    };
  };
  const first = (sel) => document.querySelector(sel);
  const samples = [
    take(first(".sn-kicker, .vg-kicker, .pv-eyebrow"), "section_kicker", "kicker"),
    take(first(".sn-block h2, [data-section-type=\\"SEMANTIC_NAVIGATION\\"] h2"), "go_deeper_title", "semantic_nav_title"),
    take(first(".sn-title, .sn-copy strong"), "card_title", "card_title"),
    take(first(".sn-card p, .sn-copy"), "card_description", "card_description"),
    take(first(".sn-card a, .sn-block a"), "card_link", "card_link"),
    take(first(".pv-source-board h2"), "trusted_sources_title", "trusted_sources_title"),
    take(first(".pv-source-board a"), "trusted_sources_link", "trusted_sources_link"),
    take(first(".pv-source-board p"), "trusted_sources_body", "trusted_sources_body"),
    take(first(".disclosure h2, [data-section-type=\\"LEGAL\\"] h2"), "disclosure_heading", "disclosure_heading"),
    take(first(".disclosure p, [data-section-type=\\"LEGAL\\"] p"), "disclosure_text", "disclosure_text"),
    take(first(".disclosure a, [data-section-type=\\"LEGAL\\"] a"), "disclosure_link", "disclosure_link"),
    take(first(".pv-cta-panel h2, .pv-cta-band h2"), "cta_title", "cta_title"),
    take(first(".pv-cta-panel p, .pv-cta-band p"), "cta_body", "cta_body"),
    take(first(".pv-cta-panel a"), "cta_link", "cta_link"),
    take(first(".pv-spoke-index a, [data-surface=\\"EMPHASIS\\"] .pv-spoke-index a"), "emphasis_spoke_link", "emphasis_spoke_link"),
    take(first(".pv-section-visual p, .pv-section-visual .vg-container p"), "why_it_matters_body", "photo_overlay_body"),
    take(first("table, .pv-table-shell, .pv-analysis-board"), "table_text", "table_text"),
    take(first(".pv-callout, .pv-highlight, blockquote"), "editorial_highlight", "editorial_highlight"),
  ].filter(Boolean);
  const emphasis = first("[data-surface=\\"EMPHASIS\\"]");
  const nestedLight = emphasis ? Boolean(emphasis.querySelector(".sn-block, .pv-source-board, .pv-related-editorial, [data-surface=\\"TINTED\\"], [data-surface=\\"SUBTLE\\"]")) : false;
  const photo = first(".pv-section-visual-media");
  return {
    samples,
    nestedLightInEmphasis: nestedLight,
    photoWashOpacity: photo ? Number(getComputedStyle(photo).opacity) : null,
    emphasisContainsSources: emphasis ? /Trusted Sources/i.test(emphasis.innerText) : false,
  };
})()`;
