export const COMMERCE_LAYOUT_CONTRACT = "BALANCED_AVAILABLE_WIDTH" as const;

export const COMMERCE_LAYOUT_CSS = `
.commerce-shell,.sheet,.about-grid,.pdp,.band-inner{
  width:calc(100% - 8vw);
  max-width:80rem;
  margin-inline:auto;
}
.sheet{padding:2.4rem 0 4rem}
.band{padding:2.4rem 4vw}
.band-inner{padding:0}
.tiles,.grid,.releases{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));
  gap:1.2rem;
  justify-content:stretch;
  width:100%;
}
.release-card,.card .tee,.release-card .tee{max-width:none;width:100%}
.card .tee,.release-card .tee{position:relative;aspect-ratio:4/5;overflow:hidden;background:#efeae2}
@media(max-width:1024px){.tiles,.grid,.releases{grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))}}
@media(max-width:768px){.tiles,.grid,.releases{grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))}}
@media(max-width:390px){.tiles,.grid,.releases{grid-template-columns:1fr}}
`.trim();

export function commerceLayoutCssUsesCenteredContainer(css: string): boolean {
  return /margin-inline:\s*auto/.test(css) && /max-width:\s*80rem/.test(css) && /auto-fit/.test(css);
}
