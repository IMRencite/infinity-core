export const SITE_CHROME_LINK_CONTRAST_MARKER = "--pv-nav-surface: var(--pv-surface)" as const;

export const SITE_CHROME_LINK_CONTRAST_CSS = `
/* ${SITE_CHROME_LINK_CONTRAST_MARKER} — opaque nav surface so chrome links resolve against a real token, not color-mix. */
.pv-nav {
  --pv-nav-surface: var(--pv-surface);
  background: var(--pv-nav-surface);
}
.pv-nav-brand,
.pv-nav-links a {
  color: var(--pv-text);
}
.pv-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.pv-nav-logo {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 1.75rem;
}
.pv-nav-logo svg { display: block; width: 100%; height: 100%; }
.pv-nav-wordmark { white-space: nowrap; line-height: 1; }
.pv-nav-brand:hover,
.pv-nav-links a:hover,
.pv-nav-brand:focus-visible,
.pv-nav-links a:focus-visible,
.pv-nav-brand:visited,
.pv-nav-links a:visited {
  color: var(--pv-text);
}
`;

export function applySiteChromeLinkContrastCss(existing: string): string {
  if (existing.includes(SITE_CHROME_LINK_CONTRAST_MARKER)) return existing;
  return `${existing}\n${SITE_CHROME_LINK_CONTRAST_CSS}\n`;
}
