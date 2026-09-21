export const SEMANTIC_NAV_WIDTH_UTILIZATION_MARKER = "--pv-sn-width-utilization: breakout" as const;

export const SEMANTIC_NAV_WIDTH_UTILIZATION_CSS = `
/* ${SEMANTIC_NAV_WIDTH_UTILIZATION_MARKER} — Learn Next / semantic nav escapes the article measure. */
[data-section-type="SEMANTIC_NAVIGATION"] > .vg-container,
.vg-container:has(> .sn-block),
.vg-container:has(> .sn-block.pv-wide-module) {
  width: min(var(--pv-authority-shell, 70rem), calc(100vw - 4rem));
  max-width: min(var(--pv-authority-shell, 70rem), calc(100vw - 4rem));
}
.sn-block,
.sn-block.pv-wide-module {
  --pv-sn-width-utilization: breakout;
  width: 100%;
  max-width: none;
}
.pv-prose > .sn-block,
.vg-container.pv-prose > .sn-block,
.pv-prose .sn-block.pv-wide-module {
  width: min(var(--pv-authority-shell, 70rem), calc(100vw - 4rem));
  max-width: min(var(--pv-authority-shell, 70rem), calc(100vw - 4rem));
  margin-inline: calc(50% - min(var(--pv-authority-shell, 70rem), calc(100vw - 4rem)) / 2);
}
.sn-grid--count-5 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.sn-grid--count-5 .sn-card:nth-child(-n+3) { grid-column: span 2; }
.sn-grid--count-5 .sn-card:nth-child(n+4) { grid-column: span 3; }
`;

export function applySemanticNavWidthUtilizationCss(existing: string): string {
  if (existing.includes(SEMANTIC_NAV_WIDTH_UTILIZATION_MARKER)) return existing;
  return `${existing}\n${SEMANTIC_NAV_WIDTH_UTILIZATION_CSS}\n`;
}
