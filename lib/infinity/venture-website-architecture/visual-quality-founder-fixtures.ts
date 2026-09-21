export function founderDefectCss(): string {
  return `
.vg-legal-footer {
  padding: 2.5rem 24px;
  box-sizing: border-box;
}
.vg-legal-footer-inner, .vg-legal-footer .vg-container {
  width: min(100%, var(--pv-max, 72rem));
  margin-inline: auto;
}
@media (max-width: 640px) {
  footer[data-infinity-footer] { padding-left: 16px; padding-right: 16px; }
}
.pv-data-panel { width: 100%; min-height: 420px; background: #102033; }
.pv-related { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pv-hero-authority {
  background: linear-gradient(180deg, rgba(8, 18, 32, 0.72), rgba(8, 18, 32, 0.88));
}
`;
}

export function founderDefectHtml(): string {
  return `
<section>
  <header className="pv-hero pv-hero-authority" data-section-type="HERO">
    <h1>What is NPV in a commercial lease?</h1>
    <p>NPV turns later cash into today's dollars.</p>
  </header>
</section>
<section>
  <p>Year 1 rent is forty two thousand dollars.</p>
  <p>Shared building cost is eight thousand four hundred dollars.</p>
  <p>A credit lowers the cash you pay that year.</p>
  <p>Cash out this year is about thirty two thousand dollars.</p>
  <p>Later cash gets a shrink for time.</p>
  <p>Year 2 rent is forty three thousand dollars.</p>
  <p>Shared building cost rises a little.</p>
  <p>There is no credit in this year.</p>
  <p>Cash out this year is higher.</p>
</section>
<section>
  <div className="pv-data-panel" data-visualization="CASH_FLOW_TIMELINE" style="width:100%;min-height:420px">
    <table className="pv-compare"><caption>Sample</caption><thead><tr><th>Year</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>
  </div>
</section>
<section>
  <div className="pv-related" data-section-type="RELATED_CONTENT">
    <p className="pv-surface"><Link href="/a">Related one</Link></p>
    <p className="pv-surface"><Link href="/b">Related two</Link></p>
  </div>
</section>
<footer className="vg-legal-footer" data-infinity-footer="public">
  <div className="vg-container vg-legal-footer-inner">
    <nav className="vg-legal-nav">Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR</nav>
  </div>
</footer>
`;
}
