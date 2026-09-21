import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Blog topics — OccupancyNPV",
  description: "Browse OccupancyNPV blog topics and open the matching filtered archive.",
  alternates: { canonical: "/blog/tag/" },
  robots: { index: false, follow: false },
  openGraph: { title: "Blog topics — OccupancyNPV", description: "Browse OccupancyNPV blog topics and open the matching filtered archive." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/blog/tag" role="EDUCATIONAL_HUB" pattern="FOCUSED_HERO" cluster="editorial">
        <JsonLdBlock data={SITE_SCHEMA["/blog/tag"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/blog","label":"Blog"},{"href":"/blog/tag/","label":"Tag"}]} />
        
        <header className="onpv-blog-hero" data-blog-hero="true" data-blog-hero-treatment="editorial-panel" data-section-type="HERO">
          <div className="vg-container onpv-blog-hero__grid">
            <div className="onpv-blog-hero__copy">
              <p className="pv-eyebrow">Topics</p>
              <h1 className="pv-display">Blog topics</h1>
              <p>Open a topic archive to see only the published notes assigned that tag.</p>
            </div>
            <figure className="onpv-blog-hero__visual" data-blog-hero-visual="true">
              <img src="/media/hero-building.webp" alt="Editorial commercial building used as valuation context. Not a customer property." width={720} height={480} />
            </figure>
          </div>
        </header>
        <section className="pv-section">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial">
            <div className="onpv-blog-main">
              <div className="onpv-blog-cloud"><a href="/blog/tag/cap-rates/" data-blog-tag="Cap Rates" data-blog-taxonomy-link="tag">Cap Rates</a><a href="/blog/tag/commercial-real-estate/" data-blog-tag="Commercial Real Estate" data-blog-taxonomy-link="tag">Commercial Real Estate</a><a href="/blog/tag/interest-rates/" data-blog-tag="Interest Rates" data-blog-taxonomy-link="tag">Interest Rates</a></div>
            </div>
            <aside className="onpv-blog-sidebar" data-blog-sidebar="true" data-blog-sidebar-shared="BlogSidebar">
              <nav className="onpv-blog-sidebar__panel" aria-label="Categories" data-blog-categories="true">
                <h2>Categories</h2>
                <ul><li className="onpv-blog-cat" data-blog-category="Valuation"><a href="/blog/category/valuation/" data-blog-category="Valuation" data-blog-taxonomy-link="category">Valuation</a><span>1</span></li></ul>
              </nav>
              <nav className="onpv-blog-sidebar__panel" aria-label="Topics" data-blog-tag-cloud="true">
                <h2>Topic cloud</h2>
                <div className="onpv-blog-cloud"><span data-count="1"><a href="/blog/tag/cap-rates/" data-blog-tag="Cap Rates" data-blog-taxonomy-link="tag">Cap Rates</a></span><span data-count="1"><a href="/blog/tag/commercial-real-estate/" data-blog-tag="Commercial Real Estate" data-blog-taxonomy-link="tag">Commercial Real Estate</a></span><span data-count="1"><a href="/blog/tag/interest-rates/" data-blog-tag="Interest Rates" data-blog-taxonomy-link="tag">Interest Rates</a></span></div>
              </nav>
              <section className="onpv-blog-sidebar__panel" aria-label="Resources" data-blog-popular-resources="true">
                <h2>Popular resources</h2>
                <p><a href="/commercial-lease-npv/how-is-cap-rate-calculated/">How is cap rate calculated?</a></p>
                <p><a href="/compare-commercial-leases">Compare commercial leases</a></p>
                <p><a href="/resources">Resource library</a></p>
              </section>
            </aside>
          </div>
        </section>
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
