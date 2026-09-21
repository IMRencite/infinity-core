export const HUB_DISCOVERY_LAYOUT_CSS = `
/* --pv-discovery-layout — hub question groups stay a 3-column board; role is a full-width band. */
[data-hub-question-discovery] .pv-question-row {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-hub-question-discovery] .pv-question-row a {
  display: flex;
  align-items: center;
  min-height: 4.25rem;
  padding: 0.55rem 0.75rem;
  background: var(--pv-surface-card, #ffffff);
  color: var(--pv-ink, #152033);
  border-radius: 10px;
  text-decoration: none;
}
[data-hub-question-discovery] .pv-discovery-grid {
  --pv-discovery-layout: balanced-3;
  display: grid;
  gap: 1.5rem;
  align-items: stretch;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
[data-hub-question-discovery] .pv-discovery-grid--balanced {
  align-items: stretch;
}
[data-hub-question-discovery] .pv-discovery-band,
[data-hub-role-band] {
  display: block;
  width: 100%;
  margin-top: 1.75rem;
  padding: 1.15rem 0 0;
  border-top: 1px solid color-mix(in srgb, var(--pv-ink, #152033) 14%, transparent);
}
[data-hub-question-discovery] .pv-discovery-band h3,
[data-hub-role-band] h3 {
  color: var(--pv-ink, #152033);
  margin-bottom: 0.75rem;
}
[data-hub-question-discovery] .pv-discovery-band .pv-question-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}
@media (max-width: 1100px) {
  [data-hub-question-discovery] .pv-discovery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 700px) {
  [data-hub-question-discovery] .pv-discovery-grid {
    grid-template-columns: 1fr;
  }
  [data-hub-question-discovery] .pv-discovery-band .pv-question-row {
    grid-template-columns: 1fr;
  }
}
`;

export const AUTHORITY_SECTION_SURFACE_CSS = `
/* AuthoritySectionSurfaceSystem — token names are global; CRE values come from venture profile tokens. */
:root {
  --pv-surface-default: var(--pv-bg, #ffffff);
  --pv-surface-subtle: var(--cre-surface-subtle, #f3f6f9);
  --pv-surface-tinted: var(--cre-surface-tinted, #e8eef5);
  --pv-surface-editorial: var(--cre-surface-editorial, #f4f1ea);
  --pv-surface-emphasis: var(--cre-surface-emphasis, #123a5c);
  --pv-surface-dark: var(--cre-surface-dark, #0f2740);
  --pv-surface-emphasis-ink: #f7fbff;
  --pv-surface-card: #ffffff;
}

[data-surface] {
  background-color: var(--pv-surface-default);
  padding-block: 3.25rem;
}

[data-surface="DEFAULT"] { background-color: var(--pv-surface-default); }
[data-surface="SUBTLE"] { background-color: var(--pv-surface-subtle); }
[data-surface="TINTED"] { background-color: var(--pv-surface-tinted); }
[data-surface="EDITORIAL"] { background-color: var(--pv-surface-editorial); }
[data-surface="EMPHASIS"],
[data-surface="DARK_ACCENT"] {
  background-color: var(--pv-surface-emphasis);
  color: var(--pv-surface-emphasis-ink);
}
[data-surface="DARK_ACCENT"] { background-color: var(--pv-surface-dark); }

[data-surface="EMPHASIS"] .pv-cta-panel a,
[data-surface="DARK_ACCENT"] .pv-cta-panel a {
  color: #d7e8ff;
}
[data-surface="EMPHASIS"] .pv-cta-panel a.vg-cta,
[data-surface="DARK_ACCENT"] .pv-cta-panel a.vg-cta,
[data-surface="EMPHASIS"] .pv-cta-panel a.pv-cta,
[data-surface="DARK_ACCENT"] .pv-cta-panel a.pv-cta {
  color: #102033;
  background: #f4f7fb;
}

[data-surface="TINTED"] .sn-card,
[data-surface="SUBTLE"] .sn-card,
[data-surface="EDITORIAL"] .sn-card,
[data-surface="TINTED"] .pv-related-family,
[data-surface="SUBTLE"] .pv-source-board {
  background: var(--pv-surface-card);
  box-shadow: 0 1px 0 rgba(15, 39, 64, 0.08);
}

[data-hub-question-discovery] {
  background-color: var(--pv-surface-tinted);
}
`;

export const AUTHORITY_SECTION_SURFACE_INK_RESET_CSS = `
/* --pv-surface-ink-reset — light modules keep dark ink even inside EMPHASIS. */
:root { --pv-surface-ink-reset: #152033; }
[data-surface="DEFAULT"],
[data-surface="SUBTLE"],
[data-surface="TINTED"],
[data-surface="EDITORIAL"] {
  color: var(--pv-text, var(--pv-surface-ink-reset));
}
[data-surface="EMPHASIS"] .sn-block,
[data-surface="EMPHASIS"] .sn-card,
[data-surface="EMPHASIS"] .sn-title,
[data-surface="EMPHASIS"] .sn-copy strong,
[data-surface="EMPHASIS"] .pv-source-board,
[data-surface="EMPHASIS"] .pv-source-board h2,
[data-surface="EMPHASIS"] .pv-source-board a,
[data-surface="EMPHASIS"] .pv-related-editorial,
[data-surface="EMPHASIS"] .pv-related-editorial h2,
[data-surface="EMPHASIS"] .pv-related-card a,
[data-surface="EMPHASIS"] .pv-eyebrow,
[data-surface="DARK_ACCENT"] .sn-block,
[data-surface="DARK_ACCENT"] .sn-title,
[data-surface="DARK_ACCENT"] .pv-source-board {
  color: var(--pv-text, var(--pv-surface-ink-reset));
}
.sn-title,
.sn-copy strong,
.pv-source-board h2 {
  color: var(--pv-text, var(--pv-surface-ink-reset));
}
.pv-eyebrow,
.vg-kicker,
.sn-kicker {
  color: #1d4e89;
}
.pv-section-visual {
  background-color: var(--pv-surface-subtle, #f3f6f9);
}
.pv-section-visual-media { opacity: 0.12; }
.pv-section-visual .vg-container,
.pv-section-visual h2,
.pv-section-visual p {
  position: relative;
  z-index: 1;
  color: var(--pv-text, var(--pv-surface-ink-reset));
}
`;

export const AUTHORITY_SOURCE_BOARD_INK_CSS = `
/* --pv-source-board-ink — Trusted Sources is a light card. Never inherit EMPHASIS pale ink. */
:root { --pv-source-board-ink: #152033; --pv-source-board-link: #1d4e89; }
.pv-source-board,
.pv-source-board h2,
.pv-source-board p,
.pv-source-board li {
  color: var(--pv-source-board-ink);
}
.pv-source-board a {
  color: var(--pv-source-board-link);
}
`;

export const AUTHORITY_EMPHASIS_BAND_LINK_CSS = `
/* --pv-emphasis-band-link — links sitting on navy EMPHASIS stay light. Nested light modules keep their own ink. */
:root { --pv-emphasis-band-link: #d7e8ff; }
[data-surface="EMPHASIS"] a,
[data-surface="DARK_ACCENT"] a,
[data-surface="EMPHASIS"] .pv-spoke-index a,
[data-surface="DARK_ACCENT"] .pv-spoke-index a,
[data-surface="EMPHASIS"] .pv-cta-panel a,
[data-surface="DARK_ACCENT"] .pv-cta-panel a {
  color: var(--pv-emphasis-band-link);
}
[data-surface="EMPHASIS"] a:hover,
[data-surface="DARK_ACCENT"] a:hover,
[data-surface="EMPHASIS"] .pv-spoke-index a:hover,
[data-surface="EMPHASIS"] .pv-cta-panel a:hover {
  color: #f7fbff;
}
[data-surface="EMPHASIS"] .pv-cta-panel a.vg-cta,
[data-surface="DARK_ACCENT"] .pv-cta-panel a.vg-cta,
[data-surface="EMPHASIS"] .pv-cta-panel a.pv-cta,
[data-surface="DARK_ACCENT"] .pv-cta-panel a.pv-cta {
  color: #102033;
  background: #f4f7fb;
}
[data-surface="EMPHASIS"] .pv-cta-panel a.vg-cta:hover,
[data-surface="DARK_ACCENT"] .pv-cta-panel a.vg-cta:hover {
  color: #102033;
  background: #ffffff;
}
[data-surface="EMPHASIS"] a:focus-visible,
[data-surface="DARK_ACCENT"] a:focus-visible {
  outline: 2px solid #d7e8ff;
  outline-offset: 2px;
}
[data-surface="EMPHASIS"] .pv-source-board a,
[data-surface="EMPHASIS"] .sn-block a,
[data-surface="EMPHASIS"] .sn-card a,
[data-surface="EMPHASIS"] .pv-related-editorial a,
[data-surface="DARK_ACCENT"] .pv-source-board a,
[data-surface="DARK_ACCENT"] .sn-block a {
  color: var(--pv-source-board-link, #1d4e89);
}
`;

export function applyAuthoritySectionSurfaceCss(existing: string): string {
  let next = existing;
  if (!next.includes("--pv-surface-subtle") || !next.includes("[data-surface=\"EMPHASIS\"]")) {
    next = `${next}\n${AUTHORITY_SECTION_SURFACE_CSS}\n`;
  }
  if (!next.includes("--pv-surface-ink-reset")) {
    next = `${next}\n${AUTHORITY_SECTION_SURFACE_INK_RESET_CSS}\n`;
  }
  if (!next.includes("--pv-source-board-ink")) {
    next = `${next}\n${AUTHORITY_SOURCE_BOARD_INK_CSS}\n`;
  }
  if (!next.includes("--pv-emphasis-band-link")) {
    next = `${next}\n${AUTHORITY_EMPHASIS_BAND_LINK_CSS}\n`;
  }
  return next;
}

export function applyHubDiscoveryLayoutCss(existing: string): string {
  let next = applyAuthoritySectionSurfaceCss(existing);
  if (!next.includes("--pv-discovery-layout")) {
    next = next.replace(
      /\[data-hub-question-discovery\] \.pv-discovery-grid \{[\s\S]*?repeat\(auto-fit, minmax\(220px, 1fr\)\);[\s\S]*?\}/,
      "",
    );
    next = `${next}\n${HUB_DISCOVERY_LAYOUT_CSS}\n`;
  }
  return next;
}

export function applySectionSurfaces(source: string, archetype = "QUESTION_AUTHORITY"): string {
  const map: Record<string, string> = {
    HERO: archetype === "LEGAL" ? "DEFAULT" : "DEFAULT",
    ANSWER_SURFACES: "DEFAULT",
    DEFINITION: "DEFAULT",
    EXPLANATION: "SUBTLE",
    HOW_IT_WORKS: "TINTED",
    EXAMPLE: "SUBTLE",
    ASSUMPTIONS: "DEFAULT",
    EDGE_CASES: "TINTED",
    MISTAKES: "SUBTLE",
    DECISION: "EDITORIAL",
    LIMITS: "DEFAULT",
    CTA: archetype === "LEGAL" ? "DEFAULT" : "EMPHASIS",
    AUTHORITY_REFERENCES: "SUBTLE",
    RELATED: "TINTED",
    EDUCATION: archetype === "TOPIC_HUB" ? "TINTED" : "DEFAULT",
    PRICING: "EDITORIAL",
    FAQ: "DEFAULT",
  };
  return source.replace(/<((?:header|section|div)[^>]*data-section-type="([^"]+)"[^>]*)>/g, (full, open: string, type: string) => {
    if (/data-surface=/.test(full)) return full;
    const surface = map[type] ?? "DEFAULT";
    return `<${open} data-surface=${JSON.stringify(surface)}>`;
  });
}
