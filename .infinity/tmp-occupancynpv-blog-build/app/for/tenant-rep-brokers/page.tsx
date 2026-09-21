/* data-composition-repaired="true" */
import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { ProductUiFrame } from "../../../components/premium-venture";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "For tenant-rep brokers comparing commercial leases",
  description: "A tenant-representation workflow for comparing commercial leases with NPV, sensitivity, and a in-workspace client summary. Pilot only.",
  alternates: { canonical: "/for/tenant-rep-brokers" },
  robots: { index: true, follow: true },
  openGraph: { title: "For tenant-rep brokers comparing commercial leases", description: "A tenant-representation workflow for comparing commercial leases with NPV, sensitivity, and a in-workspace client summary. Pilot only." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/for/tenant-rep-brokers" role="PERSONA" pattern="COMMERCIAL_PRODUCT_PAGE" cluster="Product">
        <JsonLdBlock data={SITE_SCHEMA["/for/tenant-rep-brokers"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/for/tenant-rep-brokers","label":"For tenant-rep brokers comparing commercial leases"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="tr_hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container">
            <p className="pv-eyebrow">For tenant-rep brokers</p>
            <h1 className="pv-display">Compare commercial leases without rebuilding the spreadsheet</h1>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            <div data-question-id="q_1e6ef9cd5634412b" data-answer-chunk-id="q_1e6ef9cd5634412b_chunk"><AnswerFirst question="How should tenant-rep brokers compare leases?" answer="Tenant-rep brokers should compare leases on a shared occupancy-cost timeline, discount that cash-flow stream to NPV at an explicit rate, and keep a in-workspace client summary next to the sensitivity cases. Face rent alone hides timing." /></div>
            <div data-question-id="q_dabb29cf0cd630ad" data-answer-chunk-id="q_dabb29cf0cd630ad_chunk"><AnswerFirst question="How do tenant-rep brokers use NPV?" answer="Tenant-rep brokers use NPV to show clients when cash moves. Inputs are required: rent, CAM, TI, free rent, escalations, term, and a stated discount rate. What decisions follow is which option is cheaper on a present-value basis and whether that ranking survives nearby rates." /></div>
            <div data-question-id="q_3515272a751d7120" data-answer-chunk-id="q_3515272a751d7120_chunk"><AnswerFirst question="How does tenant representation use a client summary?" answer="Tenant representation uses a client summary to keep the comparison shareable. The summary should sit next to the cash-flow and NPV figures, labeled illustrative until live terms are loaded, so the client sees the same ranking the broker used." /></div>
          </div>
        </header>
        <section className="pv-section" data-section-type="WORKFLOW" data-section-id="tr_body" data-pattern-id="PRODUCT_FIRST_VISUALIZATION" data-visualization="WORKFLOW_DIAGRAM" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <div className="pv-question-cluster" data-composition="question-cluster"><h2>Who this is for</h2>
            <p>This page is for tenant-rep brokers, independent CRE brokers, and boutique advisory teams who currently rebuild lease workbooks deal by deal.</p>
            <h2>Broker workflow and lease-comparison friction</h2>
            <p>The current method fails when face rent is the headline, CAM lives in a separate tab, and incentives live in separate emails. A hidden cell changes the ranking. The client gets a story instead of a cash-flow argument.</p>
            <h2>Spreadsheet workflow problems</h2>
            <p>Spreadsheets are fine calculators. They are poor shared methods. Each deal rebuilds a workbook. Discount-rate cases disappear. The OccupancyNPV workflow keeps cash-flow compare, NPV + sensitivity, and a in-workspace client summary together.</p></div>
            <ProductUiFrame title="Proposed tenant-rep workspace" caption="Illustrative sample — not customer data.">
              
            <div className="pv-table-wrap"><div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON" data-visualization-id="tr_ui">
              <table className="pv-compare pv-fin-table">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — Lease A versus Lease B, not customer data</caption>
                <thead><tr><th scope="col">Input</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,000</td></tr>
                  <tr><th scope="row">CAM</th><td>$8,400</td><td>$9,100</td></tr>
                  <tr><th scope="row">TI credit, year 1</th><td>$18,000</td><td>$12,000</td></tr>
                  <tr><th scope="row">Free rent</th><td>2 months</td><td>1 month</td></tr>
                  <tr><th scope="row">Escalation</th><td>3% / year</td><td>5% / year</td></tr>
                  <tr><th scope="row">NPV @ 8%</th><td>$186,400</td><td>$191,220</td></tr>
                </tbody>
              </table></div></div>
            </ProductUiFrame>
            
            <div className="pv-table-wrap"><div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="CASH_FLOW_TIMELINE" data-visualization-id="tr_cf">
              <table className="pv-compare pv-fin-table">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — cash-flow periods, not customer data</caption>
                <thead><tr><th scope="col">Period</th><th scope="col">Lease A net occupancy</th><th scope="col">Discounted @ 8%</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Year 1</th><td>$32,400<span className="pv-cell-note">after free rent and TI</span></td><td>$30,000</td></tr>
                  <tr><th scope="row">Year 2</th><td>$51,912</td><td>$44,500</td></tr>
                  <tr><th scope="row">Year 3</th><td>$53,469</td><td>$42,430</td></tr>
                  <tr><th scope="row">Year 4</th><td>$55,073</td><td>$40,470</td></tr>
                  <tr><th scope="row">Year 5</th><td>$56,726</td><td>$38,600</td></tr>
                </tbody>
              </table></div></div>
            <h2>Scenario modeling and client presentations</h2>
            <p>Change the discount rate, keep the lease terms in view, and share an illustrative summary. Sample figures are not customer results. The value is that sensitivity stays visible.</p>
            <h2>Common questions</h2>
            <p>See <a href="/commercial-lease-npv">NPV</a>, <a href="/compare-commercial-leases">comparison</a>, and <a href="/resources">the resources hub</a> for educational depth. This page stays on the professional workflow.</p>
            <h2>Pricing</h2>
            <p>Professional is $290 per year. Per-Deal is $149 per deal. Live checkout is available on the pricing page.</p>
            <p>Positioning, problem, product visualization, benefits, use cases, and trust or disclosure sit on this persona page because the conversion path is for tenant-rep brokers, not a generic audience.</p>
            
        <section className="pv-section pv-question-cluster" data-section-type="EXPLANATION" data-section-id="scaffold_why" data-composition="question-cluster" data-pattern-id="PROGRESSIVE_DISCLOSURE" data-surface="SUBTLE">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Deeper explanation of the tenant-rep broker workflow belongs in the comparison because face rent alone hides timing. How it works in practice: put the cash event on the occupancy-cost timeline, then discount. This is the next logical step after reading a definition.</p>
            <h2>Related concepts</h2>
            <p>Related concepts include occupancy cost, NPV, tenant improvement allowance, free rent, CAM, and rent escalations. Contextual CTA: open OccupancyNPV or review pricing after the numbers are explicit.</p>
            <p>Common mistakes are listed on this page. Authority sources sit below. Internal links connect the hub, the comparison method, and early access.</p>
          </div>
        </section>
        <section className="pv-section pv-worked-example" data-section-type="EXAMPLE" data-section-id="scaffold_example" data-composition="worked-example" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="SUBTLE">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>Example</h2>
            <p>ILLUSTRATIVE EXAMPLE. The Lease A versus Lease B figures used across this site are educational samples, not customer results. They exist so the tenant-rep broker workflow can be seen beside rent, CAM, TI, free rent, and escalations instead of as an isolated slogan.</p>
            <h2>How it works</h2>
            <p>Capture the term. Place it on the cash-flow stream. Discount. Compare. Keep the assumption visible. That sequence is the product visualization of the OccupancyNPV workflow, not a production screenshot.</p>
          </div>
        </section>
            
        <section className="pv-section pv-callout-band" data-section-type="DEPTH" data-section-id="scaffold_depth" data-composition="callout-band" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>A fuller reading of the tenant-rep broker workflow</h2>
            <p>Lease-comparison friction is the rebuilt workbook. Spreadsheet workflow problems are hidden cells and separate tabs. Scenario modeling and client presentations need a in-workspace client summary. Common questions belong on the authority spokes. Objections include finished-product expectations and treating lower NPV as automatic advice. Who it is not for remains landlords and property managers. The pilot CTA is Request Pilot Access.</p>
            <p>Tenant-rep brokers still have to verify the lease. This page does not replace counsel. It does not claim FASB, NAIOP, or BOMA endorsement. It uses those organizations as independent professional context so a citation-ready answer can name the entity, state the fact, and show the limitation.</p>
            <p>If two options differ only by a brochure number, the comparison is unfinished. If they differ by when cash moves, the comparison is an NPV problem. If they differ by who pays operating expenses, the comparison is a structure problem. the tenant-rep broker workflow is one of those differences. The proposed focused workflow keeps those differences on one in-workspace client summary.</p>
            <p>Current prices are $290 per year for Professional and $149 per deal for Per-Deal. Live checkout is available on the pricing page. A serious owner can publish this page because the example is labeled, the sources are named, and the conversion path is honest.</p>
            <p>See <a href="/">the offer</a>, <a href="/resources">the resources hub</a>, <a href="/compare-commercial-leases">the comparison method</a>, <a href="/how-it-works">how it works</a>, <a href="/commercial-lease-npv">commercial lease NPV</a>, and <a href="/early-access">Request Pilot Access</a>. The parent hub and the commercial homepage stay one click away.</p>
          </div>
        </section>
            
            <div className="vg-container pv-close-well"><h2>Who is this not for</h2>
            <p>who is this not for: this workflow is not for landlords running a portfolio, not for property managers administering occupied buildings, and not for teams that need a full brokerage suite. It is also not for anyone who wants a CRM or lease-administration suite.</p>
            <h2>Objections worth answering now</h2>
            <p>OccupancyNPV is a working product. Live checkout is available on the pricing page. A lower NPV is not automatically the better occupancy choice. Sample figures are illustrative and are not customer results.</p>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            <section data-section-type="FAQ" data-section-id="dr_faq" data-pattern-id="TRUST_NEAR_DECISION" data-surface="DEFAULT">
              <h2>Does OccupancyNPV exist as a working product?</h2>
              <p>Yes. OccupancyNPV is a live lease comparison and NPV workspace. Public rollout remains controlled.</p>
              <h2>Can I purchase OccupancyNPV?</h2>
              <p>Yes. Professional is $290 per year and Per-Deal is $149 per deal. Checkout is available on this page.</p>
            </section>
            <RelatedContent items={[{ href: "/", label: "Return to the offer" }, { href: "/resources", label: "Lease economics resources" }, { href: "/pricing", label: "Pricing" }, { href: "/how-it-works", label: "How it works" }, { href: "/resources", label: "Authority resources" }]} />
            <div className="pv-source-block" data-composition="source-block"><AuthorityRefs items={[{"href":"https://www.naiop.org/","label":"NAIOP — commercial real estate organization"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers and sales agents"}]} /></div>
            <Disclosure>Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed.</Disclosure>
            
        
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="dr_final" data-pattern-id="REPEATED_CONVERSION_ANCHORS" data-cta="Request Pilot Access" data-surface="EMPHASIS">
              <h2>Request controlled / pilot access</h2>
              <p>Pilot / early access. The product is live. Public rollout remains controlled. Checkout is available on the pricing page.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </section></div>
          </div>
        </section>
        
        <section className="pv-section onpv-page-depth" data-depth="resource">
          <div className="vg-container">
            <h2>How to use this with OccupancyNPV</h2>
            <p>This page answers the concept. OccupancyNPV applies it inside a DealWorkspace: enter lease scenarios, review cash-flow and occupancy cost, then compare NPV and discount-rate sensitivity. OccupancyNPV NPV is not the same as a face-rent comparison. OccupancyNPV is not a CRM or lease-administration suite, and this page is not legal or investment advice.</p>
            <p>Next: start the 3-day free trial, open <a href="/pricing">pricing</a>, or continue through related product paths.</p>
          </div>
        </section>
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container pv-authority-shell">
          <nav className="sn-block" data-semantic-navigation="FOR_YOUR_ROLE" aria-label="For your role">
            <div className="sn-block-head">
              <span className="sn-kicker">FOR YOUR ROLE</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-3">
            <a className="sn-card" data-card-role="TOPIC" href="/tenant-rep-analysis/" data-relationship="related" aria-label="Tenant-rep analysis. Move from proposals to a clear story.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-4.2 0-8 2-8 4.5V21h16v-3.5C20 15 16.2 13 12 13z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Tenant-rep analysis</strong><span className="sn-desc">Show a client a path they can review.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. Use one stack for both offers.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Show the steps before the number.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Workflow</span><strong>See the workflow</strong><span className="sn-desc">Follow the steps before you pick a number.</span></span>
            </a>
            </div>
          </nav>
        </div>
        </section>
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
