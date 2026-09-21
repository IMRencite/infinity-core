export const DARK_SURFACE_MUTED_TEXT_MARKER = "--pv-dark-muted-ink:" as const;

export const DARK_SURFACE_MUTED_TEXT_CSS = `
/* ${DARK_SURFACE_MUTED_TEXT_MARKER} surface-local dark ink. Do not reuse light-surface muted gray on navy. */
:root {
  --pv-dark-ink: #f4f7fb;
  --pv-dark-muted-ink: #d5e0ec;
  --pv-dark-caption-ink: #c9d6e6;
}
.pv-product-frame,
.pv-data-panel:not(.pv-table-designed),
[data-surface="EMPHASIS"],
[data-surface="DARK_ACCENT"] {
  --pv-on-dark-ink: var(--pv-dark-ink);
  --pv-on-dark-muted: var(--pv-dark-muted-ink);
  --pv-on-dark-caption: var(--pv-dark-caption-ink);
}
.pv-product-frame > figcaption,
.pv-product-frame > .pv-caption,
[data-surface="EMPHASIS"] .pv-caption,
[data-surface="EMPHASIS"] .pv-lede,
[data-surface="EMPHASIS"] .vg-lede,
[data-surface="EMPHASIS"] .vg-muted,
[data-surface="EMPHASIS"] .pv-eyebrow,
[data-surface="EMPHASIS"] .vg-kicker,
[data-surface="DARK_ACCENT"] .pv-caption,
[data-surface="DARK_ACCENT"] .pv-lede,
[data-surface="DARK_ACCENT"] .vg-lede,
[data-surface="DARK_ACCENT"] .vg-muted {
  color: var(--pv-dark-caption-ink);
  opacity: 1;
}
[data-surface="EMPHASIS"] .pv-lede,
[data-surface="EMPHASIS"] .vg-lede,
[data-surface="DARK_ACCENT"] .pv-lede,
[data-surface="DARK_ACCENT"] .vg-lede {
  color: var(--pv-dark-muted-ink);
}
.pv-product-frame {
  color: var(--pv-dark-ink);
}
`;

export function applyDarkSurfaceMutedTextCss(existing: string): string {
  if (existing.includes(DARK_SURFACE_MUTED_TEXT_MARKER)) return existing;
  return `${existing}\n${DARK_SURFACE_MUTED_TEXT_CSS}\n`;
}
