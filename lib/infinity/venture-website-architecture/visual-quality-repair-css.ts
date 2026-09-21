export const VISUAL_QUALITY_REPAIR_CSS = `
.pv-reading { max-width: 46rem; margin-inline: auto; }
.pv-breakout { max-width: min(68rem, 100%); margin-inline: auto; }
.pv-hero-photo {
  position: relative;
  min-height: 28rem;
  color: #f4f7fb;
  overflow: hidden;
  isolation: isolate;
}
.pv-hero-media {
  margin: 0;
  position: absolute;
  inset: 0;
}
.pv-hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  aspect-ratio: 16 / 9;
}
.pv-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 16, 28, 0.42), rgba(8, 16, 28, 0.78));
}
.pv-hero-copy { position: relative; z-index: 1; padding: 4.2rem 0 3.4rem; }
.pv-hero-photo .pv-answer { background: rgba(8, 16, 28, 0.28); border: 1px solid rgba(255,255,255,0.14); border-radius: 14px; padding: 1rem 1.15rem; }
.pv-section-visual {
  position: relative;
  overflow: hidden;
}
.pv-section-visual-media {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0.22;
}
.pv-section-visual-media img { width: 100%; height: 100%; object-fit: cover; display: block; aspect-ratio: 16 / 9; }
.pv-section-visual .vg-container { position: relative; z-index: 1; }
.pv-callout { border-radius: 14px; padding: 1.05rem 1.2rem; margin: 1.4rem 0; border: 1px solid rgba(20, 40, 70, 0.12); background: #fff; }
.pv-callout h3 { margin: 0 0 0.4rem; font-size: 0.95rem; letter-spacing: 0.04em; text-transform: uppercase; }
.pv-callout[data-callout="KEY_TAKEAWAY"] { border-left: 4px solid #1d4e89; }
.pv-callout[data-callout="WORKED_EXAMPLE"] { border-left: 4px solid #2a6f4e; }
.pv-callout[data-callout="COMMON_MISTAKE"] { border-left: 4px solid #8a3b2f; }
.pv-callout[data-callout="WHY_THIS_MATTERS"] { border-left: 4px solid #5a4a8a; }
.pv-callout[data-callout="FOR_TENANT_REP"] { border-left: 4px solid #215e6e; }
.pv-callout[data-callout="FOR_FINANCE"] { border-left: 4px solid #3d5a80; }
.pv-callout[data-callout="WHAT_CHANGES"] { border-left: 4px solid #7a5a1e; }
.pv-callout[data-callout="LIMITATION"] { border-left: 4px solid #4a5564; }
.pv-analysis-board {
  margin: 1.75rem 0;
  padding: 1.2rem 1.25rem;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 16px;
  background: #f6f8fb;
}
.pv-metric-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0 0 1.1rem;
}
.pv-metric-card {
  background: #fff;
  border: 1px solid rgba(16, 32, 51, 0.1);
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
}
.pv-metric-card strong { display: block; font-size: 1.15rem; }
.pv-metric-card span { color: #4a5564; font-size: 0.85rem; }
.pv-table-shell {
  width: fit-content;
  max-width: 100%;
  margin: 1.15rem 0;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: #102033;
  color: #e8eef5;
  overflow-x: auto;
}
.pv-fin-table {
  width: max-content;
  max-width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.pv-fin-table caption { caption-side: top; text-align: left; margin: 0 0 0.55rem; color: #c5d4e4; }
.pv-fin-table th, .pv-fin-table td { padding: 0.55rem 0.7rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
.pv-fin-table thead th { background: rgba(255,255,255,0.06); letter-spacing: 0.03em; }
.pv-fin-table tbody tr:nth-child(even) { background: rgba(255,255,255,0.04); }
.pv-fin-table tbody tr:last-child { background: rgba(90, 160, 120, 0.18); font-weight: 600; }
.pv-decision-takeaway {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(16, 32, 51, 0.1);
}
.pv-edu-figure { margin: 1.4rem 0; }
.pv-edu-figure img { width: min(100%, 720px); height: auto; display: block; aspect-ratio: 720 / 220; }
.pv-edu-figure figcaption { margin-top: 0.45rem; color: #4a5564; font-size: 0.92rem; }
.pv-related-editorial { margin: 1.6rem 0 0; }
.pv-related-lead { max-width: 40rem; }
.pv-related-grid {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.pv-related-card {
  min-height: 8.5rem;
  margin: 0;
  padding: 1.1rem 1.15rem;
  border-radius: 14px;
  border: 1px solid rgba(16, 32, 51, 0.12);
  background: #fff;
  box-shadow: 0 8px 24px rgba(16, 32, 51, 0.05);
}
.pv-related-card a { font-weight: 650; }
.pv-related-card p { margin: 0.45rem 0 0; color: #4a5564; }
.pv-source-board { margin: 2rem 0 0; padding: 1.2rem 1.25rem; border-radius: 16px; background: #f6f8fb; }
.pv-source-board ol { margin: 0.7rem 0 0; padding-left: 1.15rem; }
.pv-source-board a { font-weight: 600; }
.pv-cta-panel {
  margin: 1.6rem 0;
  padding: 1.5rem 1.4rem;
  border-radius: 16px;
  background-color: #102033;
  background-image: linear-gradient(180deg, #14253a, #102033);
  color: #f4f7fb;
}
.pv-cta-panel .vg-cta, .pv-cta-panel .pv-cta { display: inline-block; margin-top: 0.7rem; }
a.vg-cta, a.vg-cta--primary, a.pv-cta {
  background: #1d4e78;
  color: #ffffff;
  border: 1px solid #1d4e78;
  text-decoration: none;
}
a.vg-cta:hover, a.vg-cta--primary:hover, a.pv-cta:hover {
  background: #163b5c;
  color: #ffffff;
}
.pv-cta-panel a.vg-cta, .pv-cta-panel a.vg-cta--primary, .pv-cta-panel a.pv-cta,
header.pv-hero a.vg-cta, .pv-hero-photo a.vg-cta {
  background: #f4f7fb;
  color: #102033;
  border-color: #f4f7fb;
}
.pv-cta-panel a.vg-cta:hover, header.pv-hero a.vg-cta:hover {
  background: #ffffff;
  color: #102033;
}
.vg-legal-footer, footer[data-infinity-footer] {
  display: block;
  width: auto;
  max-width: none;
  margin: 1.5rem 32px 2rem;
  padding: 1.75rem 2rem;
  border-radius: 16px;
  background: #102033;
  color: #e8eef5;
  box-sizing: border-box;
}
.vg-legal-footer-inner, .vg-legal-footer .vg-container {
  width: 100%;
  max-width: none;
  margin: 0;
}
.vg-legal-nav { display: flex; flex-wrap: wrap; gap: 0.55rem 0.85rem; }
.vg-legal-nav a { color: #e8eef5; }
@media (max-width: 900px) {
  .pv-metric-row, .pv-related-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .vg-legal-footer, footer[data-infinity-footer] {
    margin: 1rem 20px 1.25rem;
    padding: 1.15rem 1.15rem;
  }
  .pv-hero-photo { min-height: 22rem; }
}
`;

export function applyVisualQualityRepairCss(existing: string): string {
  if (existing.includes("pv-analysis-board")) return existing;
  return `${existing}\n${VISUAL_QUALITY_REPAIR_CSS}\n`;
}
