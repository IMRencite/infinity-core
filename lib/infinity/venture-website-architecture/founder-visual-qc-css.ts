export const FOUNDER_VISUAL_QC_CSS = `
header.pv-hero.pv-article-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-block: 0;
  color: #122033;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-media {
  position: relative;
  inset: auto;
  z-index: 0;
  width: 100%;
  height: min(22rem, 46vh);
  margin: 0;
  flex: 0 0 auto;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  inset: auto;
  z-index: 0;
  width: 100%;
  height: min(22rem, 46vh);
  pointer-events: none;
  background: linear-gradient(180deg, rgba(8, 16, 28, 0.12), rgba(8, 16, 28, 0.2));
}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article .vg-container,
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-copy {
  position: relative;
  z-index: 1;
  padding-block: 2rem 2.25rem;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article + .pv-section {
  margin-top: 0;
  padding-top: 2rem;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-display,
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-lede,
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-copy > p:not(.pv-eyebrow):not(.pv-answer-label) {
  color: #122033;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-eyebrow,
header.pv-hero.pv-article-hero.pv-hero-photo--article .vg-kicker,
header.pv-hero.pv-article-hero.pv-hero-photo--article .vg-badge {
  color: #f7f4ee;
  background: #10232c;
}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-answer {
  color: #1c2838;
  background: #f4f7fb;
  border: 1px solid rgba(20, 40, 70, 0.1);
}
header.pv-hero.pv-article-hero a.vg-cta,
header.pv-hero.pv-article-hero.pv-hero-photo--article a.vg-cta,
header.pv-hero.pv-article-hero .pv-cta-panel a.vg-cta {
  background: #f4f7fb;
  color: #102033;
  border: 1px solid #f4f7fb;
}
header.pv-hero.pv-article-hero a.vg-cta:hover,
header.pv-hero.pv-article-hero.pv-hero-photo--article a.vg-cta:hover {
  background: #ffffff;
  color: #102033;
}
.sn-grid {
  align-items: stretch;
}
.sn-grid--count-5 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.sn-grid--count-5 .sn-card:nth-child(-n+3) { grid-column: span 2; }
.sn-grid--count-5 .sn-card:nth-child(n+4) { grid-column: span 3; }
.sn-card {
  height: 100%;
  align-items: flex-start;
}
.sn-icon {
  flex: 0 0 2.6rem;
  width: 2.6rem;
  height: 2.6rem;
  color: #1d4e89;
}
.sn-icon svg {
  width: 1.35rem;
  height: 1.35rem;
  fill: currentColor;
  display: block;
}
.sn-copy strong,
.sn-desc {
  text-wrap: balance;
}
.sn-card:focus-visible {
  outline: 2px solid #1d4e89;
  outline-offset: 3px;
}
@media (max-width: 960px) {
  .sn-grid--count-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sn-grid--count-5 .sn-card { grid-column: auto; }
}
@media (max-width: 640px) {
  header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-media,
  header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-overlay {
    height: min(16rem, 42vh);
  }
  .sn-grid--count-5 { grid-template-columns: 1fr; }
}
`;

export function applyFounderVisualQcCss(existing: string): string {
  if (existing.includes("pv-hero-photo--article") && existing.includes("sn-grid--count-5")) return existing;
  return `${existing}\n${FOUNDER_VISUAL_QC_CSS}\n`;
}
