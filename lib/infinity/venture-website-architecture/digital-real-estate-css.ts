export const SEO_GEO_AUTHORITY_CSS = `
.pv-hero-authority {
  background:
    linear-gradient(180deg, rgba(8, 18, 32, 0.72), rgba(8, 18, 32, 0.88)),
    radial-gradient(1200px 480px at 10% 0%, rgba(120, 164, 214, 0.28), transparent 55%);
  color: #f4f7fb;
}
.pv-section-tint { background: linear-gradient(180deg, rgba(15, 32, 54, 0.04), rgba(15, 32, 54, 0.1)); }
.pv-callout {
  border: 1px solid rgba(20, 40, 70, 0.12);
  border-left: 4px solid #2c5a8c;
  border-radius: 12px;
  padding: 1rem 1.1rem;
  margin: 1.25rem 0;
  background: rgba(255,255,255,0.72);
}
.pv-formula {
  background: #102033;
  color: #e8eef5;
  border-radius: 12px;
  padding: 1rem 1.15rem;
  margin: 1rem 0;
}
.pv-data-panel { overflow-x: auto; }
.vg-legal-footer {
  padding: 2.5rem 24px;
  box-sizing: border-box;
}
.vg-legal-footer-inner, .vg-legal-footer .vg-container {
  width: min(100%, var(--pv-max, 72rem));
  margin-inline: auto;
}
.vg-legal-nav { display: flex; flex-wrap: wrap; gap: 0.4rem 0.65rem; }
@media (max-width: 640px) {
  footer[data-infinity-footer] { padding-left: 16px; padding-right: 16px; }
}
`;

export function applyAuthorityVisualCss(existing: string): string {
  if (existing.includes("pv-hero-authority")) return existing;
  return `${existing}\n${SEO_GEO_AUTHORITY_CSS}\n`;
}
