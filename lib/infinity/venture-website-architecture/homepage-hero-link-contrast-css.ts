export const HOMEPAGE_HERO_LINK_CONTRAST_MARKER = "--pv-hero-secondary-surface: var(--pv-text)" as const;

export const HOMEPAGE_HERO_LINK_CONTRAST_CSS = `
/* ${HOMEPAGE_HERO_LINK_CONTRAST_MARKER} — opaque hero chip so pale ink does not composite through the photo wash. */
.pv-hero-photo .pv-hero-secondary,
.pv-hero-actions-row .pv-hero-secondary {
  --pv-hero-secondary-surface: var(--pv-text);
  --pv-hero-secondary-ink: #f4f7fb;
  color: var(--pv-hero-secondary-ink);
  background: var(--pv-hero-secondary-surface);
  border-color: rgba(244, 247, 251, 0.42);
}
.pv-hero-photo .pv-hero-secondary:hover,
.pv-hero-photo .pv-hero-secondary:focus-visible,
.pv-hero-photo .pv-hero-secondary:visited,
.pv-hero-actions-row .pv-hero-secondary:hover,
.pv-hero-actions-row .pv-hero-secondary:focus-visible,
.pv-hero-actions-row .pv-hero-secondary:visited {
  color: var(--pv-hero-secondary-ink);
  background: var(--pv-hero-secondary-surface);
}
`;

export function applyHomepageHeroLinkContrastCss(existing: string): string {
  if (existing.includes(HOMEPAGE_HERO_LINK_CONTRAST_MARKER)) return existing;
  return `${existing}\n${HOMEPAGE_HERO_LINK_CONTRAST_CSS}\n`;
}
