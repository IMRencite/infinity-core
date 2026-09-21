import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What is effective rent?",
  description: "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story.",
  alternates: { canonical: "/effective-rent/what-is-effective-rent/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What is effective rent?", description: "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/effective-rent/what-is-effective-rent" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="effective-rent">
        <JsonLdBlock data={SITE_SCHEMA["/effective-rent/what-is-effective-rent"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/effective-rent","label":"Effective rent"},{"href":"/effective-rent/what-is-effective-rent","label":"What is effective rent in a commercial lease?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">effective rent</p>
            <h1 className="pv-display">What is effective rent in a commercial lease?</h1>
            <div data-question-id="q_a01624d95fa7ce93" data-answer-chunk-id="q_a01624d95fa7ce93_chunk">
              <AnswerFirst question="What is effective rent in a commercial lease?" answer="Effective rent is one yearly lease number after credits and extras. It is not the sticker on the first page of the offer." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/effective-rent/how-to-calculate-effective-rent/">See how to calculate it</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_e01243c55054f938" data-answer-chunk-id="q_e01243c55054f938_0"><AnswerFirst question="What does this page answer?" answer="Effective rent is one yearly lease number after credits and extras. It is not the sticker on the first page of the offer." /></div>
            <div data-question-id="q_a6cc69361eff18d8" data-answer-chunk-id="q_a6cc69361eff18d8_1"><AnswerFirst question="What should sit beside it?" answer="The nearby owner page and one worked walk." /></div>
            <div data-question-id="q_ccb429d192386deb" data-answer-chunk-id="q_ccb429d192386deb_2"><AnswerFirst question="What is not answered here?" answer="A legal read and a location vote." /></div>
            <div data-question-id="q_8505a7c1dd8269f4" data-answer-chunk-id="q_8505a7c1dd8269f4_3"><AnswerFirst question="What is the next step?" answer="Open the related compare or model page and keep the same rate." /></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Plain-language definition</h2>
            <p>Face rent is the posted rate.</p>
            <p>Effective rent folds free months and build-out money into one yearly figure.</p>
            <p>Some teams also discount the cash first. Say which method you used.</p>
            <p>Landlords read it as net income. Tenants read it as yearly cost.</p>
            <p>The word is shared. The recipe must be written.</p>
            <p>This page sits under <a href="/effective-rent/">Effective rent</a>.</p>
            <p>Need the next step? Open <a href="/effective-rent/how-to-calculate-effective-rent/">How to calculate effective rent</a>.</p>
            <p>See <a href="/effective-rent/effective-rent-vs-face-rent/">Effective rent vs face rent</a> when you want the nearby walk.</p>
            <p>Open <a href="/effective-rent/effective-rent-vs-npv/">Effective rent vs NPV</a> if this page is not the last step.</p>
            <aside className="pv-callout" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Effective rent is one yearly lease number after credits and extras. It is not the sticker on the first page of the offer.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading">
            <h2>Why it matters</h2>
            <p>Clients compare stickers and miss concessions.</p>
            <p>A single yearly number is easy to quote.</p>
            <p>It is not a replacement for NPV when cash is lumpy.</p>
            <p>Definition pages are searched separately from formula pages.</p>
            <aside className="pv-callout" data-callout="DECISION_NOTE"><h3>What this changes</h3><p>Clients compare stickers and miss concessions.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>How it works</h2>
            <ul><li>Write the cash list.</li><li>Subtract credits in the right year.</li><li>Add extras if the tenant pays them.</li><li>Spread or discount by the method you named.</li><li>Quote one yearly figure and the method.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. Teaching picture only.</figcaption>
            </figure>
            <p>Formula in words. Simple effective rent = (rent + extras − credits) ÷ years.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>First-year rent before extras</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, or insurance the tenant still pays</td></tr><tr><th scope="row">Credits</th><td>Free rent or build-out money</td></tr><tr><th scope="row">Term</th><td>How many years the cash list runs</td></tr><tr><th scope="row">Discount rate</th><td>How hard later cash is shrunk</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Effective-rent definition sample — two paths</caption><thead><tr><th scope="col">Metric</th><th scope="col">Path A</th><th scope="col">Path B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$38,000</td><td>$35,340</td></tr><tr><th scope="row">Year-1 extras</th><td>$7,000</td><td>$7,490</td></tr><tr><th scope="row">Year-1 credit</th><td>$19,000</td><td>$10,450</td></tr><tr><th scope="row">Sample NPV</th><td>$322,162</td><td>$313,695</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Effective-rent definition sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$38,000</td><td>$7,000</td><td>$19,000</td><td>$26,000</td><td>$24,074</td></tr><tr><th scope="row">Year 2</th><td>$39,140</td><td>$7,210</td><td>$0</td><td>$46,350</td><td>$39,738</td></tr><tr><th scope="row">Year 3</th><td>$40,314</td><td>$7,426</td><td>$0</td><td>$47,740</td><td>$37,898</td></tr><tr><th scope="row">Year 4</th><td>$41,524</td><td>$7,649</td><td>$0</td><td>$49,173</td><td>$36,144</td></tr><tr><th scope="row">Year 5</th><td>$42,769</td><td>$7,879</td><td>$0</td><td>$50,648</td><td>$34,470</td></tr><tr><th scope="row">Year 6</th><td>$44,052</td><td>$8,115</td><td>$0</td><td>$52,167</td><td>$32,874</td></tr><tr><th scope="row">Year 7</th><td>$45,374</td><td>$8,358</td><td>$0</td><td>$53,732</td><td>$31,352</td></tr><tr><th scope="row">Year 8</th><td>$46,735</td><td>$8,609</td><td>$0</td><td>$55,344</td><td>$29,901</td></tr><tr><th scope="row">Year 9</th><td>$48,137</td><td>$8,867</td><td>$0</td><td>$57,004</td><td>$28,516</td></tr><tr><th scope="row">Year 10</th><td>$49,581</td><td>$9,133</td><td>$0</td><td>$58,714</td><td>$27,196</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$322,162</td></tr></tbody></table></div>
              <p>Sample NPV for Effective-rent definition sample is about $322,162. A second path lands near $313,695.</p>
              <p>Year 1 of Effective-rent definition sample has rent of $38,000.</p>
            <p>Shared building cost is $7,000.</p>
            <p>A credit of $19,000 lowers the cash you pay that year.</p>
            <p>Cash out this year is about $26,000. Year one carries the Effective-rent definition sample credit.</p>
            <p>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $24,074 today.</p>
            <p>Next, year 2 rent is $39,140.</p>
              <p><PrimaryCTA href="/effective-rent/effective-rent-vs-face-rent/">Compare it with face rent</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Assumptions</h2>
            <ul><li>The Effective-rent definition sample uses one visible 8 percent rate.</li><li>Credits hit in year one unless the page says otherwise.</li><li>Both options share the same extra basis.</li><li>No percentage rent sits in this teaching walk.</li></ul>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>Edge cases</h2>
            <p>A mid-year start needs a stub period, not a fake full year.</p>
            <p>A credit that pays later must move to that later year.</p>
            <p>A cap on extras changes the later risk, not the first sticker.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2>Common mistakes</h2>
            <ul><li>Calling face rent effective rent.</li><li>Leaving extras off a net deal.</li><li>Mixing simple average and NPV-adjusted methods.</li><li>Hiding the term length.</li></ul>
            <aside className="pv-callout" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>Calling face rent effective rent.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading">
            <h2>Decision implications</h2>
            <p>Effective rent is one yearly lease number after credits and extras. It is not the sticker on the first page of the offer.</p>
            <p>If the gap is thin, show a second rate before anyone picks.</p>
            <p>If one path wins only from a mistimed credit, rebuild the list.</p>
            <p>This page answers one question. Nearby pages cover the next step.</p>
            <p>See <a href="/effective-rent/how-to-calculate-effective-rent/">How to calculate effective rent</a> when you need that next step. Open <a href="/effective-rent/effective-rent-vs-face-rent/">Effective rent vs face rent</a> for the nearby walk. Use <a href="/effective-rent/effective-rent-vs-npv/">Effective rent vs NPV</a> if you want a second path.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Limits</h2>
            <ul><li>The number does not score daylight, transit, or floor plate.</li><li>The number does not replace a legal read.</li></ul>
            <ul><li>Do not let one metric pick a space the team cannot use.</li><li>Do not use this page as a clone of a nearby question.</li></ul>
            <p>U.S. BLS describes how brokers advise clients on property deals. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a> for professional context.</p>
          </div>
        </section>
        
        <div className="vg-container">
          <nav className="sn-block pv-wide-module" data-semantic-navigation="LEARN_NEXT" aria-label="Learn next" data-surface="TINTED">
            <div className="sn-block-head">
              <span className="sn-kicker">LEARN NEXT</span>
              <strong className="sn-title">Learn next</strong>
              <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-6">
            <a className="sn-card" href="/effective-rent/" data-relationship="parent-hub" aria-label="Effective rent. Effective rent averages a lease into one number.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v3H4zm0 5h10v3H4zm0 5h16v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Effective rent</strong><span className="sn-desc">Effective rent averages a lease into one number.</span></span>
            </a>
            <a className="sn-card" href="/effective-rent/blended-rent-vs-effective-rent/" data-relationship="related" aria-label="Blended rent vs effective rent. Blended rent is a simple average.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Blended rent vs effective rent</strong><span className="sn-desc">Blended rent is a simple average.</span></span>
            </a>
            <a className="sn-card" href="/effective-rent/effective-rent-vs-asking-rent/" data-relationship="related" aria-label="Effective rent vs asking rent. Asking rent is the listing sticker.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Effective rent vs asking rent</strong><span className="sn-desc">Asking rent is the listing sticker.</span></span>
            </a>
            <a className="sn-card" href="/effective-rent/effective-rent-on-gross-and-net-leases/" data-relationship="related" aria-label="Effective rent on gross and net leases. Only if both stacks sit on the same expense basis.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Effective rent on gross and net leases</strong><span className="sn-desc">Only if both stacks sit on the same expense basis.</span></span>
            </a>
            <a className="sn-card" href="/compare-commercial-leases" data-relationship="commercial-path" aria-label="Compare two leases. Use one method on both offers.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h3v16H7zm7 4h3v12h-3z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Compare two leases</strong><span className="sn-desc">Use one method on both offers.</span></span>
            </a>
            <a className="sn-card" href="/how-it-works" data-relationship="workflow" aria-label="See the workflow. Turn the topic into a repeatable path.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h7v5H4zm9 0h7v12h-7zM4 13h7v5H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>See the workflow</strong><span className="sn-desc">Turn the topic into a repeatable path.</span></span>
            </a>
            </div>
          </nav>
        </div><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">See the comparison workflow</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/effective-rent/effective-rent-vs-npv/">Effective rent vs NPV: what is the difference?</a> · <a href="/effective-rent/how-to-calculate-effective-rent/">How do you calculate effective rent?</a> · <a href="/effective-rent/effective-rent-vs-face-rent/">What is the difference between effective rent and face rent?</a> · <a href="/effective-rent/effective-rent-per-square-foot/">What is effective rent per square foot?</a> · <a href="/effective-rent/common-effective-rent-mistakes/">What are common effective rent mistakes?</a> · <a href="/effective-rent/blended-rent-vs-effective-rent/">What is blended rent versus effective rent?</a> · <a href="/effective-rent/effective-rent-vs-asking-rent/">What is the difference between effective rent and asking rent?</a> · <a href="/effective-rent/effective-rent-on-gross-and-net-leases/">Does effective rent work the same on gross and net leases?</a></p>
          </div>
        </section>
        <section className="pv-source-board" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
          <h2>Trusted sources</h2>
          <p>These are public references. They are not endorsements and not client results.</p>
          <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.investopedia.com/terms/d/discountrate.asp","label":"Investopedia — discount rate"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"},{"href":"https://www.naiop.org/","label":"NAIOP"},{"href":"https://www.boma.org/","label":"BOMA"},{"href":"https://www.fasb.org/","label":"FASB"}]} />
        </section>
        <Disclosure>Calculations on this page are informational. They are not legal advice and not investment advice. Lease terms should be independently verified.</Disclosure>
        
        <section className="pv-section onpv-page-depth" data-depth="resource">
          <div className="vg-container">
            <h2>How to use this with OccupancyNPV</h2>
            <p>This page answers the concept. OccupancyNPV applies it inside a DealWorkspace: enter lease scenarios, review cash-flow and occupancy cost, then compare NPV and discount-rate sensitivity. OccupancyNPV NPV is not the same as a face-rent comparison. OccupancyNPV is not a CRM or lease-administration suite, and this page is not legal or investment advice.</p>
            <p>Next: start the 3-day free trial, open <a href="/pricing">pricing</a>, or continue through related product paths.</p>
          </div>
        </section>
        
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION">
          <div className="vg-container pv-authority-shell">
            <nav className="sn-block" aria-label="Related product paths">
              <strong className="sn-title">Related product paths</strong>
              <div className="sn-grid">
                <a className="sn-card" href="/compare-commercial-leases">
                  <span className="sn-card-title">Compare commercial leases</span>
                </a>
                <a className="sn-card" href="/how-it-works">
                  <span className="sn-card-title">How OccupancyNPV works</span>
                </a>
                <a className="sn-card" href="/occupancy-costs">
                  <span className="sn-card-title">Occupancy costs</span>
                </a>
                <a className="sn-card" href="/commercial-lease-npv">
                  <span className="sn-card-title">Commercial lease NPV</span>
                </a>
                <a className="sn-card" href="/pricing">
                  <span className="sn-card-title">Pricing and 3-day trial</span>
                </a>
                <a className="sn-card" href="/resources">
                  <span className="sn-card-title">Resource hub</span>
                </a>
                <a className="sn-card" href="/faq">
                  <span className="sn-card-title">FAQ</span>
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
