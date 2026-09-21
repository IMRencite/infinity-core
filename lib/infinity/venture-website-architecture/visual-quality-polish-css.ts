export const VISUAL_QUALITY_POLISH_CSS = `
.pv-hero.pv-hero-photo {
  min-height: 16rem;
  padding-block: 2rem;
}
.pv-hero-copy { padding: 2rem 0 1.6rem; }
.pv-hero-photo.pv-hero--split,
.pv-hero-photo--compact {
  min-height: 18rem;
  padding-block: 2.15rem;
}
.pv-hero-photo.pv-hero--split .pv-product-frame,
.pv-hero-photo--compact .pv-product-frame {
  min-height: 12rem;
}
.pv-hero-photo.pv-hero--split:not(.pv-article-hero) .pv-display,
.pv-hero-photo--compact:not(.pv-article-hero):not(.pv-hero-photo--article) .pv-display {
  font-size: clamp(1.85rem, 3.4vw, 2.55rem);
  max-width: min(28rem, 100%);
}
.pv-related-editorial {
  margin: 2rem 32px 1.5rem;
}
.pv-related-card {
  min-height: 0;
  padding: 0.95rem 1.05rem;
}
.pv-source-board,
.pv-authority,
ol.pv-authority,
ul.pv-authority {
  margin: 2rem 32px 1.75rem;
  padding: 1.45rem 1.5rem 1.7rem;
  border-radius: 16px;
  background: #f6f8fb;
  box-sizing: border-box;
}
.pv-source-board ol,
.pv-authority {
  margin-top: 0.7rem;
}
.vg-legal-footer, footer[data-infinity-footer] {
  margin: 2rem 32px 2.75rem;
  padding: 1.85rem 2rem 2rem;
}
.vg-shell, .pv-shell {
  padding-bottom: 2.75rem;
}
@media (max-width: 640px) {
  .pv-related-editorial,
  .pv-source-board,
  .pv-authority,
  ol.pv-authority,
  ul.pv-authority {
    margin-left: 20px;
    margin-right: 20px;
  }
  .vg-legal-footer, footer[data-infinity-footer] {
    margin: 1rem 20px 1.75rem;
    padding: 1.25rem 1.2rem 1.4rem;
  }
  .pv-hero.pv-hero-photo,
  .pv-hero-photo--compact {
    min-height: 14rem;
    padding-block: 1.5rem;
  }
  .vg-shell, .pv-shell { padding-bottom: 1.75rem; }
}
`;

export function applyVisualQualityPolishCss(existing: string): string {
  if (existing.includes("pv-hero-photo--compact")) return existing;
  return `${existing}\n${VISUAL_QUALITY_POLISH_CSS}\n`;
}
