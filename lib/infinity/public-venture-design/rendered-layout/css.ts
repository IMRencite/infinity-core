import type { VentureDesignTokens } from "../types";
import { withRenderedLayoutTokens } from "./tokens";

export function renderedLayoutCssOverlay(tokens: VentureDesignTokens): string {
  const resolved = withRenderedLayoutTokens(tokens);
  return `
:root {
  --pv-gutter-page: ${resolved.spacing.gutter};
  --pv-gutter-tablet: ${resolved.spacing.gutterTablet ?? "1.25rem"};
  --pv-gutter-mobile: ${resolved.spacing.gutterMobile ?? "1.25rem"};
  --pv-max-wide: ${resolved.container.wide ?? "80rem"};
  --pv-measure: ${resolved.container.article ?? resolved.container.content};
  --pv-space-footer-y: ${resolved.spacing.footerY ?? "2.5rem"};
  --pv-space-header-y: ${resolved.spacing.headerY ?? "0.75rem"};
  --pv-space-card-gap: ${resolved.spacing.cardGap ?? "1rem"};
  --pv-space-visual-gap: ${resolved.spacing.visualGap ?? "1.5rem"};
}
.vg-container, .pv-container {
  width: min(100% - (2 * var(--pv-gutter-page)), var(--pv-max));
  margin: 0 auto;
}
.vg-hero, .vg-section, .pv-section, .pv-hero {
  padding: var(--pv-space-section) var(--pv-gutter-page);
}
.pv-nav-inner, .pv-breadcrumb {
  width: min(100% - (2 * var(--pv-gutter-page)), var(--pv-max));
  margin-left: auto;
  margin-right: auto;
}
.pv-nav-inner {
  padding-block: var(--pv-space-header-y);
}
.pv-prose, .pv-answer {
  max-width: var(--pv-measure);
}
.pv-cta-band {
  padding-inline: var(--pv-gutter-page);
}
.vg-legal-footer {
  margin-top: auto;
  padding: var(--pv-space-footer-y) var(--pv-gutter-page);
  border-top: 1px solid var(--pv-border);
  color: var(--pv-muted);
  font-size: 0.92rem;
}
.vg-legal-footer-inner {
  width: min(100%, var(--pv-max));
  margin: 0 auto;
}
.vg-legal-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: center;
}
.vg-legal-nav a { color: var(--pv-text); text-decoration: none; }
.vg-legal-nav a:hover { text-decoration: underline; }
.vg-legal-sep { color: var(--pv-border); }
.pv-table-wrap, .pv-data-panel {
  overflow-x: auto;
  max-width: 100%;
}
.pv-editorial-split {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: var(--pv-space-visual-gap);
  align-items: start;
}
.pv-question-cluster {
  display: grid;
  gap: var(--pv-space-stack);
}
.pv-question-cluster > article,
.pv-question-cluster > .pv-surface {
  background: var(--pv-surface);
  border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius-md);
  padding: 1.15rem 1.2rem;
}
.pv-worked-example,
.pv-comparison-band,
.pv-callout-band,
.pv-source-block {
  display: grid;
  gap: var(--pv-space-stack);
}
.pv-worked-example,
.pv-comparison-band,
.pv-callout-band {
  background: var(--pv-surface);
  border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius-md);
  padding: 1.25rem 1.35rem;
  box-shadow: var(--pv-shadow-subtle);
}
.pv-source-block {
  padding: 1rem 0 0;
}
.pv-key-takeaway {
  border-left: 3px solid var(--pv-accent);
  padding: 0.85rem 1.1rem;
  background: color-mix(in srgb, var(--pv-accent) 6%, var(--pv-surface));
}
@media (max-width: 960px) {
  :root { --pv-gutter-page: var(--pv-gutter-tablet); }
  .pv-editorial-split { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  :root { --pv-gutter-page: var(--pv-gutter-mobile); }
  .vg-legal-nav { row-gap: 0.65rem; }
  .pv-nav-inner { flex-direction: column; align-items: flex-start; }
}
`;
}

export function applyRenderedLayoutCss(existingCss: string, tokens: VentureDesignTokens): string {
  if (existingCss.includes("--pv-gutter-page") && existingCss.includes("vg-legal-footer {")) {
    return existingCss;
  }
  return `${existingCss}\n${renderedLayoutCssOverlay(tokens)}`;
}
