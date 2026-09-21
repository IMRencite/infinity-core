export const VISUAL_HOMEPAGE_FOLD_CSS = `
header.pv-hero.pv-hero-photo,
.pv-hero-photo.pv-hero--split,
.pv-hero-photo--compact {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 0;
  padding-block: 1.7rem;
  color: #f4f7fb;
}
.pv-hero-photo .pv-hero-media,
.pv-hero-photo .pv-hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.pv-hero-photo .pv-hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pv-hero-photo .vg-container,
.pv-hero-photo .pv-hero-grid,
.pv-hero-photo .pv-hero-copy {
  position: relative;
  z-index: 1;
}
.pv-hero-photo.pv-hero--split .pv-hero-grid {
  grid-template-columns: minmax(0, 1fr);
  max-width: 40rem;
  gap: 1rem;
}
.pv-hero-photo.pv-hero--split .pv-product-frame {
  display: none;
}
.pv-hero-photo:not(.pv-article-hero):not(.pv-hero-photo--article) .pv-display {
  font-size: clamp(1.7rem, 3.1vw, 2.35rem);
  max-width: min(28rem, 100%);
  color: #f4f7fb;
}
.pv-article-hero .pv-display,
.pv-hero-photo--article .pv-display {
  max-width: min(42rem, 100%);
}
.pv-hero-photo .pv-lede,
.pv-hero-photo .pv-answer {
  max-width: 38rem;
  color: #e8eef5;
}
.pv-hero-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem 0.85rem;
  align-items: center;
  margin: 0.85rem 0 1rem;
}
.pv-hero-secondary {
  display: inline-flex;
  align-items: center;
  min-height: 2.55rem;
  padding: 0.5rem 0.95rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.38);
  color: #f4f7fb;
  text-decoration: none;
  font-weight: 650;
  background: rgba(8, 16, 28, 0.28);
}
.pv-close-well {
  width: min(100% - 4rem, 68rem);
  margin: 2rem auto 2.5rem;
  box-sizing: border-box;
}
.pv-close-well > h2,
.pv-close-well > p,
.pv-close-well > section:not(.pv-cta-band) {
  max-width: 46rem;
}
.pv-close-well .pv-related-editorial,
.pv-close-well .pv-authority,
.pv-close-well .pv-source-board {
  margin-left: 0;
  margin-right: 0;
}
@media (max-width: 640px) {
  header.pv-hero.pv-hero-photo,
  .pv-hero-photo--compact {
    padding-block: 1.25rem;
  }
  .pv-close-well { width: min(100% - 2.5rem, 68rem); }
}
`;

export function applyVisualHomepageFoldCss(existing: string): string {
  if (existing.includes("pv-hero-actions-row")) return existing;
  return `${existing}\n${VISUAL_HOMEPAGE_FOLD_CSS}\n`;
}
