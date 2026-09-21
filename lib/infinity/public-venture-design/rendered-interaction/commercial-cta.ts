export const RENDERED_COMMERCIAL_CTA_QUALITY_GATE = "RenderedCommercialCTAQualityGate" as const;
export const COMMERCIAL_CTA_CSS_MARK = "--vg-commercial-cta-applied" as const;

export const COMMERCIAL_CTA_COMPONENT_SOURCE = `export function CommercialCTA({
  variant = "primary",
  type = "submit",
  disabled = false,
  children,
}: {
  variant?: "primary" | "secondary";
  type?: "submit" | "button";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={variant === "secondary" ? "vg-cta vg-cta--secondary" : "vg-cta vg-cta--primary"}
    >
      {children}
    </button>
  );
}
`;

export const COMMERCIAL_CTA_CSS = `
/* ${RENDERED_COMMERCIAL_CTA_QUALITY_GATE} */
:root { ${COMMERCIAL_CTA_CSS_MARK}: 1; }
a.vg-cta,
a.vg-cta--primary,
button.vg-cta,
.vg-cta[type="submit"] {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  min-width: 2.75rem;
  padding: 0.75rem 1.2rem;
  border-radius: var(--pv-radius-sm, 0.5rem);
  border: 1px solid transparent;
  background: var(--pv-accent, #1d4e78);
  color: var(--pv-accent-contrast, #ffffff);
  text-decoration: none;
  font: inherit;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0;
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
}
a.vg-cta:hover,
a.vg-cta--primary:hover,
button.vg-cta:hover,
.vg-cta--primary:hover {
  background: var(--pv-accent-hover, #163b5c);
}
button.vg-cta:focus-visible,
.vg-cta:focus-visible {
  outline: 3px solid var(--pv-accent, #1d4e78);
  outline-offset: 3px;
}
button.vg-cta:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.vg-cta--secondary {
  background: transparent;
  color: var(--pv-accent, #1d4e78);
  border-color: var(--pv-border, #c5d0da);
}
.vg-cta--secondary:hover {
  background: color-mix(in srgb, var(--pv-accent, #1d4e78) 8%, transparent);
}
[data-payment-surface="occupancynpv-canonical"] {
  display: grid;
  gap: 0.75rem;
  margin: 1.25rem 0 1.5rem;
}
[data-payment-surface="occupancynpv-canonical"] form {
  margin: 0;
}
[data-payment-surface="occupancynpv-canonical"] .vg-cta {
  width: 100%;
}
@media (min-width: 640px) {
  [data-payment-surface="occupancynpv-canonical"] {
    grid-template-columns: 1fr 1fr;
  }
}
`;

export type CommercialCtaControlEvidence = {
  route: string;
  label: string;
  tag: string;
  classes: string;
  defaultBrowserStyling: boolean;
  branded: boolean;
  minTouchTarget: boolean;
  focusVisibleRule: boolean;
  hoverRule: boolean;
};

export type RenderedCommercialCTAQualityGateResult = {
  gate: typeof RENDERED_COMMERCIAL_CTA_QUALITY_GATE;
  result: "PASS" | "FAIL";
  rawDefaultBrandedCommercialCta: "FAILS" | "DOES_NOT_FAIL";
  reasons: string[];
  controls: CommercialCtaControlEvidence[];
};

const COMMERCIAL_SURFACE = /data-payment-surface|checkout\/start|offer" value="PROFESSIONAL|offer" value="PER_DEAL|Get Professional|Start Professional|Start One Deal|Purchase One Deal|Continue to Professional|Continue to Per-Deal/i;
const BRANDED = /vg-cta|onpv-btn-primary|onpv-btn-secondary|pv-cta/;
const BUTTON = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;

function decodeLabel(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function applyCommercialCtaCss(css: string): string {
  if (css.includes(`${COMMERCIAL_CTA_CSS_MARK}:`)) return css;
  return `${css}\n${COMMERCIAL_CTA_CSS}`;
}

export function applyCommercialCtaComponent<T extends { path: string; content: string }>(files: T[]): T[] {
  return files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (!path.endsWith("validation-grade.tsx") && !path.endsWith("components/validation-grade.tsx")) return file;
    if (file.content.includes("export function CommercialCTA")) return file;
    return { ...file, content: `${file.content}\n${COMMERCIAL_CTA_COMPONENT_SOURCE}` };
  });
}

export function evaluateRenderedCommercialCTAQualityGate(input: {
  html: string;
  css: string;
  route?: string;
}): RenderedCommercialCTAQualityGateResult {
  const route = input.route ?? "/pricing";
  const css = input.css;
  const brandedCss = /button\.vg-cta|vg-cta--primary/.test(css) && css.includes("min-height");
  const focusVisibleRule = /vg-cta:focus-visible|button\.vg-cta:focus-visible/.test(css);
  const hoverRule = /vg-cta--primary:hover|button\.vg-cta:hover/.test(css);
  const controls: CommercialCtaControlEvidence[] = [];
  const reasons: string[] = [];
  if (!COMMERCIAL_SURFACE.test(input.html)) {
    return {
      gate: RENDERED_COMMERCIAL_CTA_QUALITY_GATE,
      result: "FAIL",
      rawDefaultBrandedCommercialCta: "FAILS",
      reasons: ["MISSING_COMMERCIAL_CTA"],
      controls,
    };
  }
  for (const match of input.html.matchAll(BUTTON)) {
    const attrs = match[1] ?? "";
    const label = decodeLabel(match[2] ?? "");
    if (!/submit|Professional|Per-Deal|Get Professional|Start Professional|Start One Deal|Purchase One Deal|checkout|signup|upgrade|Purchase/i.test(`${attrs} ${label}`)) {
      continue;
    }
    const classMatch = attrs.match(/class(Name)?=["']([^"']+)["']/);
    const classes = classMatch?.[2] ?? "";
    const branded = BRANDED.test(classes);
    const defaultBrowserStyling = !branded;
    const minTouchTarget = branded && brandedCss;
    controls.push({
      route,
      label,
      tag: "button",
      classes,
      defaultBrowserStyling,
      branded,
      minTouchTarget,
      focusVisibleRule,
      hoverRule,
    });
    if (defaultBrowserStyling) reasons.push("DEFAULT_BROWSER_STYLING");
    if (!minTouchTarget) reasons.push("TOUCH_TARGET_OR_PADDING_MISSING");
    if (!focusVisibleRule) reasons.push("FOCUS_VISIBLE_MISSING");
    if (!hoverRule) reasons.push("HOVER_STATE_MISSING");
  }
  if (controls.length === 0) reasons.push("MISSING_COMMERCIAL_CTA");
  const unique = [...new Set(reasons)];
  return {
    gate: RENDERED_COMMERCIAL_CTA_QUALITY_GATE,
    result: unique.length === 0 ? "PASS" : "FAIL",
    rawDefaultBrandedCommercialCta: "FAILS",
    reasons: unique,
    controls,
  };
}
