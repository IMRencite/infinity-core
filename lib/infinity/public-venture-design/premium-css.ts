import type { VentureDesignTokens } from "./types";

export function premiumValidationGlobalCss(tokens: VentureDesignTokens): string {
  return `:root {
  --pv-bg: ${tokens.color.bg};
  --pv-surface: ${tokens.color.surface};
  --pv-text: ${tokens.color.text};
  --pv-muted: ${tokens.color.muted};
  --pv-border: ${tokens.color.border};
  --pv-accent: ${tokens.color.accent};
  --pv-accent-contrast: ${tokens.color.accentContrast};
  --pv-accent-hover: ${tokens.color.accentHover};
  --pv-focus: ${tokens.color.focus};
  --pv-panel: ${tokens.color.panel};
  --pv-font-display: ${tokens.fontScale.display};
  --pv-font-section: ${tokens.fontScale.section};
  --pv-font-body: ${tokens.fontScale.body};
  --pv-font-caption: ${tokens.fontScale.caption};
  --pv-font-eyebrow: ${tokens.fontScale.eyebrow};
  --pv-space-section: ${tokens.spacing.section};
  --pv-space-stack: ${tokens.spacing.stack};
  --pv-space-gutter: ${tokens.spacing.gutter};
  --pv-radius-sm: ${tokens.radius.sm};
  --pv-radius-md: ${tokens.radius.md};
  --pv-radius-lg: ${tokens.radius.lg};
  --pv-shadow-subtle: ${tokens.shadow.subtle};
  --pv-shadow-elevated: ${tokens.shadow.elevated};
  --pv-max: ${tokens.container.max};
  --pv-content: ${tokens.container.content};
  --pv-motion: ${tokens.motion.duration};
  --pv-ease: ${tokens.motion.easing};
  --vg-bg: var(--pv-bg);
  --vg-surface: var(--pv-surface);
  --vg-text: var(--pv-text);
  --vg-muted: var(--pv-muted);
  --vg-border: var(--pv-border);
  --vg-accent: var(--pv-accent);
  --vg-accent-contrast: var(--pv-accent-contrast);
  --vg-accent-hover: var(--pv-accent-hover);
  --vg-focus: var(--pv-focus);
  --vg-max: var(--pv-max);
  --vg-radius: var(--pv-radius-md);
  --vg-shadow: var(--pv-shadow-subtle);
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--pv-bg);
  color: var(--pv-text);
  font-family: "Iowan Old Style", "Palatino Linotype", "Times New Roman", Georgia, serif;
  font-size: var(--pv-font-body);
  line-height: 1.6;
  overflow-x: hidden;
}
body {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}
a { color: var(--pv-accent); }
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 3px solid var(--pv-focus);
  outline-offset: 2px;
}
.vg-shell, .pv-shell { min-height: 100vh; display: flex; flex-direction: column; }
.vg-container, .pv-container {
  width: min(100% - 2rem, var(--pv-max));
  margin: 0 auto;
}
.vg-hero, .vg-section, .pv-section, .pv-hero {
  padding: var(--pv-space-section) 0;
}
.vg-hero, .pv-hero {
  border-bottom: 1px solid var(--pv-border);
  background:
    linear-gradient(180deg, #edf1f5 0%, var(--pv-surface) 48%, var(--pv-bg) 100%);
}
.pv-hero--split .pv-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: 2.5rem;
  align-items: center;
}
.vg-hero h1, .pv-display {
  margin: 0.5rem 0 1rem;
  font-size: var(--pv-font-display);
  line-height: 1.12;
  letter-spacing: -0.035em;
  max-width: min(40rem, 100%);
}
.pv-article-hero .pv-display,
.pv-hero:not(.pv-hero-photo) .pv-display,
.pv-hero.pv-hero-photo--article .pv-display {
  max-width: min(42rem, 100%);
}
.vg-kicker, .vg-badge, .pv-eyebrow {
  display: inline-block;
  margin: 0 0 0.85rem;
  padding: 0.22rem 0.7rem;
  border: 1px solid #10232c;
  border-radius: 999px;
  background: #10232c;
  color: #f7f4ee;
  font-size: var(--pv-font-eyebrow);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.vg-lede, .vg-muted, .pv-lede {
  color: var(--pv-muted);
  max-width: var(--pv-content);
}
.vg-section h2, .pv-section h2 {
  margin: 0 0 1rem;
  font-size: var(--pv-font-section);
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.vg-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.vg-feature-card, .vg-pricing-card, .vg-form, .vg-disclosure, .pv-surface {
  background: var(--pv-surface);
  border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius-md);
  padding: 1.15rem 1.2rem;
  box-shadow: var(--pv-shadow-subtle);
}
.vg-price { font-size: 1.7rem; margin: 0.35rem 0; letter-spacing: -0.03em; }
.vg-cta, .vg-cta--primary, .pv-cta,
a.vg-cta, a.vg-cta--primary, a.pv-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.7rem 1.2rem;
  border-radius: var(--pv-radius-sm);
  background: var(--pv-accent, #1d4e78);
  color: var(--pv-accent-contrast, #ffffff);
  text-decoration: none;
  font-weight: 600;
  transition: transform var(--pv-motion) var(--pv-ease), background var(--pv-motion) var(--pv-ease);
}
.vg-cta:hover, .pv-cta:hover, a.vg-cta:hover, a.pv-cta:hover {
  background: var(--pv-accent-hover, #163b5c);
  color: var(--pv-accent-contrast, #ffffff);
}
.pv-cta-panel a.vg-cta, .pv-cta-panel a.vg-cta--primary, .pv-cta-panel a.pv-cta {
  background: #f4f7fb;
  color: #102033;
}
.pv-cta-panel a.vg-cta:hover, .pv-cta-panel a.pv-cta:hover {
  background: #ffffff;
  color: #102033;
}
.pv-cta--ghost {
  background: transparent;
  color: var(--pv-accent);
  border: 1px solid var(--pv-border);
}
.vg-form-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.85rem; }
.vg-form-field input, .vg-form-field select, .vg-form-field textarea, .vg-textarea, .vg-input {
  appearance: none;
  -webkit-appearance: none;
  min-height: 2.6rem;
  width: 100%;
  border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius-sm);
  padding: 0.65rem 0.75rem;
  font: inherit;
  color: var(--pv-text, #152033);
  background: var(--pv-surface, #ffffff);
  line-height: 1.45;
}
.vg-form-field textarea, .vg-textarea { min-height: 7.5rem; resize: vertical; }
.vg-form-field input:focus-visible, .vg-form-field select:focus-visible, .vg-form-field textarea:focus-visible, .vg-textarea:focus-visible, .vg-input:focus-visible {
  outline: 3px solid var(--pv-accent, #1d4e78);
  outline-offset: 2px;
  border-color: var(--pv-accent, #1d4e78);
}
.vg-form-error { color: #8b1e2d; font-weight: 600; }
.vg-form-success { color: #1b5e3b; font-weight: 600; }
.pv-product-frame {
  background: var(--pv-panel);
  color: #e8eef5;
  border-radius: var(--pv-radius-lg);
  box-shadow: var(--pv-shadow-elevated);
  padding: 1rem;
  min-height: 22rem;
}
.pv-product-frame caption, .pv-caption { font-size: var(--pv-font-caption); color: #b7c3d1; }
.pv-data-panel { background: var(--pv-panel); color: #e8eef5; border-radius: var(--pv-radius-md); padding: 1.25rem; }
.pv-workflow { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1.25rem; align-items: stretch; }
.pv-metric-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; }
.pv-pricing-split { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.pv-cta-band { background: #e8eef4; }
.pv-compare table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
.pv-compare th, .pv-compare td { padding: 0.55rem 0.4rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); }
.pv-bar { height: 0.55rem; background: #2a425c; border-radius: 99px; overflow: hidden; }
.pv-bar > span { display: block; height: 100%; background: #7eb0d6; }
.pv-icon { width: 1.1rem; height: 1.1rem; }
@media (max-width: 960px) {
  .pv-hero--split .pv-hero-grid, .pv-workflow, .pv-pricing-split, .pv-metric-strip { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .vg-card-grid { grid-template-columns: 1fr; }
  .vg-hero, .vg-section, .pv-section, .pv-hero { padding: 3rem 0; }
  .pv-product-frame { min-height: 16rem; }
  .pv-compare th, .pv-compare td { font-size: 0.86rem; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;
}
