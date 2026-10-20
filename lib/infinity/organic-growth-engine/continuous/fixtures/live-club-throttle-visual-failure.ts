/** Regression: founder-observed live failure — hero 404 + flex gap on every prose child. */
export const LIVE_LEGACY_CT_SPACING_CSS_SNIPPET = `
.onpv-blog-main{display:flex;flex-direction:column;gap:var(--blog-section-block-gap)}
.onpv-blog-main.pv-reading{display:flex;flex-direction:column;gap:var(--blog-section-block-gap)}
.onpv-blog-main,.onpv-blog-main.pv-reading{max-width:var(--blog-article-reading-max);width:100%;margin-inline:0}
`;

export const LIVE_LEGACY_CT_HERO_SHELL = `
<header data-blog-article-hero="true">
  <figure data-visual-role="FEATURED_EDITORIAL_IMAGE">
    <img src="/visual/journal-shirt.svg" alt="Shirt logic" width="1600" height="900" />
  </figure>
</header>`;

export const LIVE_LEGACY_CT_MAIN = `<h2>Two kinds of motorcycle shirts</h2><p>First paragraph.</p><h2>Next section</h2><p>Second paragraph.</p>`;

export const GOOD_CT_SPACING_MEASUREMENTS = {
  heading_body_gaps_px: [18, 22],
  paragraph_gaps_px: [16, 14],
  section_gaps_px: [48, 52],
};

export const BAD_CT_SPACING_MEASUREMENTS = {
  heading_body_gaps_px: [120],
  paragraph_gaps_px: [96],
  section_gaps_px: [180],
};
