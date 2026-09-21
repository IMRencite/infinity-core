import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "NPV vs total lease cost",
  description: "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently.",
  alternates: { canonical: "/commercial-lease-npv/npv-vs-total-lease-cost/" },
  robots: { index: true, follow: true },
  openGraph: { title: "NPV vs total lease cost", description: "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/commercial-lease-npv/npv-vs-total-lease-cost" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="commercial-lease-npv">
        <JsonLdBlock data={SITE_SCHEMA["/commercial-lease-npv/npv-vs-total-lease-cost"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/commercial-lease-npv","label":"Commercial lease NPV"},{"href":"/commercial-lease-npv/npv-vs-total-lease-cost","label":"Why do NPV and total lease cost differ?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">commercial lease npv</p>
            <h1 className="pv-display">Why do NPV and total lease cost differ?</h1>
            <div data-question-id="q_882cb9455b98b3d1" data-answer-chunk-id="q_882cb9455b98b3d1_chunk">
              <AnswerFirst question="Why do NPV and total lease cost differ?" answer="Total lease cost adds every year at face value. NPV shrinks later years, so two equal sums can still name different winners." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">Read what NPV means</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_216a9fece46a6e0a" data-answer-chunk-id="q_216a9fece46a6e0a_0"><AnswerFirst question="Can two totals match while NPV differs?" answer="Yes. Earlier cash is worth more." /></div>
            <div data-question-id="q_15f9f64483a59c75" data-answer-chunk-id="q_15f9f64483a59c75_1"><AnswerFirst question="Which number is the budget?" answer="Total cash is what you write. NPV is what you compare." /></div>
            <div data-question-id="q_6da9fbf4790efaea" data-answer-chunk-id="q_6da9fbf4790efaea_2"><AnswerFirst question="Should both sit on the memo?" answer="Yes. Finance will ask for both." /></div>
            <div data-question-id="q_8ba94a08f8ae3e1c" data-answer-chunk-id="q_8ba94a08f8ae3e1c_3"><AnswerFirst question="Does effective rent replace this?" answer="No. Effective rent is a yearly level, not a lump sum." /></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Plain-language definition</h2>
            <p>Total lease cost is the raw sum of rent, extras, and credits.</p>
            <p>NPV is that same list after waiting is priced.</p>
            <p>The two numbers answer different questions.</p>
            <p>A treasurer cares about both the cash they write and when they write it.</p>
            <p>Use both on the page. Do not pick one in secret.</p>
            <p>This page sits under <a href="/commercial-lease-npv/">Commercial lease NPV</a>.</p>
            <p>Need the next step? Open <a href="/commercial-lease-npv/why-use-npv-when-comparing-leases/">Why use NPV?</a>.</p>
            <p>See <a href="/effective-rent/effective-rent-vs-npv/">Effective rent vs NPV</a> when you want the nearby walk.</p>
            <p>Open <a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">What is NPV?</a> if this page is not the last step.</p>
            <aside className="pv-callout" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Total lease cost adds every year at face value. NPV shrinks later years, so two equal sums can still name different winners.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading">
            <h2>Why it matters</h2>
            <p>A 15-year deal can look equal in aggregate and worse up front.</p>
            <p>Whoever holds cash earlier can invest it.</p>
            <p>Clients mix the two words and then fight the rank.</p>
            <p>Showing both stops that fight.</p>
            <aside className="pv-callout" data-callout="DECISION_NOTE"><h3>What this changes</h3><p>A 15-year deal can look equal in aggregate and worse up front.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>How it works</h2>
            <ul><li>Build one cash list.</li><li>Add the face-value total.</li><li>Discount the same list at one rate.</li><li>Place both numbers on one slide.</li><li>Explain the gap in a short sentence.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. Teaching picture only.</figcaption>
            </figure>
            <p>Formula in words. Total cost = sum of cash. NPV = sum of cash / (1 + rate)^year.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>First-year rent before extras</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, or insurance the tenant still pays</td></tr><tr><th scope="row">Credits</th><td>Free rent or build-out money</td></tr><tr><th scope="row">Term</th><td>How many years the cash list runs</td></tr><tr><th scope="row">Discount rate</th><td>How hard later cash is shrunk</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Total-versus-NPV sample — two paths</caption><thead><tr><th scope="col">Metric</th><th scope="col">Path A</th><th scope="col">Path B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$39,000</td><td>$36,270</td></tr><tr><th scope="row">Year-1 extras</th><td>$7,800</td><td>$8,346</td></tr><tr><th scope="row">Year-1 credit</th><td>$9,000</td><td>$4,950</td></tr><tr><th scope="row">Sample NPV</th><td>$345,010</td><td>$332,270</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Total-versus-NPV sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$39,000</td><td>$7,800</td><td>$9,000</td><td>$37,800</td><td>$35,000</td></tr><tr><th scope="row">Year 2</th><td>$40,170</td><td>$8,034</td><td>$0</td><td>$48,204</td><td>$41,327</td></tr><tr><th scope="row">Year 3</th><td>$41,375</td><td>$8,275</td><td>$0</td><td>$49,650</td><td>$39,414</td></tr><tr><th scope="row">Year 4</th><td>$42,616</td><td>$8,523</td><td>$0</td><td>$51,139</td><td>$37,589</td></tr><tr><th scope="row">Year 5</th><td>$43,895</td><td>$8,779</td><td>$0</td><td>$52,674</td><td>$35,849</td></tr><tr><th scope="row">Year 6</th><td>$45,212</td><td>$9,042</td><td>$0</td><td>$54,254</td><td>$34,189</td></tr><tr><th scope="row">Year 7</th><td>$46,568</td><td>$9,313</td><td>$0</td><td>$55,881</td><td>$32,606</td></tr><tr><th scope="row">Year 8</th><td>$47,965</td><td>$9,592</td><td>$0</td><td>$57,557</td><td>$31,096</td></tr><tr><th scope="row">Year 9</th><td>$49,404</td><td>$9,880</td><td>$0</td><td>$59,284</td><td>$29,657</td></tr><tr><th scope="row">Year 10</th><td>$50,886</td><td>$10,176</td><td>$0</td><td>$61,062</td><td>$28,284</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$345,010</td></tr></tbody></table></div>
              <p>Sample NPV for Total-versus-NPV sample is about $345,010. A second path lands near $332,270.</p>
              <p>Year 1 of Total-versus-NPV sample has rent of $39,000.</p>
            <p>Shared building cost is $7,800.</p>
            <p>A credit of $9,000 lowers the cash you pay that year.</p>
            <p>Cash out this year is about $37,800. Year one carries the Total-versus-NPV sample credit.</p>
            <p>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $35,000 today.</p>
            <p>Next, year 2 rent is $40,170.</p>
              <p><PrimaryCTA href="/effective-rent/effective-rent-vs-npv/">Compare NPV and effective rent</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Assumptions</h2>
            <ul><li>The Total-versus-NPV sample uses one visible 8 percent rate.</li><li>Credits hit in year one unless the page says otherwise.</li><li>Both options share the same extra basis.</li><li>No percentage rent sits in this teaching walk.</li></ul>
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
            <ul><li>Calling the raw sum NPV.</li><li>Hiding the rate so the two numbers look like twins.</li><li>Dropping later years from the raw sum.</li><li>Using total cost to pick between different terms without a note.</li></ul>
            <aside className="pv-callout" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>Calling the raw sum NPV.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading">
            <h2>Decision implications</h2>
            <p>Total lease cost adds every year at face value. NPV shrinks later years, so two equal sums can still name different winners.</p>
            <p>If the gap is thin, show a second rate before anyone picks.</p>
            <p>If one path wins only from a mistimed credit, rebuild the list.</p>
            <p>This page answers one question. Nearby pages cover the next step.</p>
            <p>See <a href="/commercial-lease-npv/why-use-npv-when-comparing-leases/">Why use NPV?</a> when you need that next step. Open <a href="/effective-rent/effective-rent-vs-npv/">Effective rent vs NPV</a> for the nearby walk. Use <a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">What is NPV?</a> if you want a second path.</p>
            
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
          <nav className="sn-block pv-wide-module" data-semantic-navigation="COMPARE_NEXT" aria-label="Compare the next decision" data-surface="TINTED">
            <div className="sn-block-head">
              <span className="sn-kicker">COMPARE NEXT</span>
              <strong className="sn-title">Compare the next decision</strong>
              <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" href="/commercial-lease-npv/" data-relationship="parent-hub" aria-label="Commercial lease NPV. Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v3H4zm0 5h10v3H4zm0 5h16v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Commercial lease NPV</strong><span className="sn-desc">Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.</span></span>
            </a>
            <a className="sn-card" href="/commercial-lease-npv/why-use-npv-when-comparing-leases/" data-relationship="related" aria-label="Why use NPV when comparing leases. NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Why use NPV when comparing leases</strong><span className="sn-desc">NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year.</span></span>
            </a>
            <a className="sn-card" href="/commercial-lease-npv/should-cam-be-in-lease-npv/" data-relationship="related" aria-label="Should CAM be in lease NPV. If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Should CAM be in lease NPV</strong><span className="sn-desc">If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits.</span></span>
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
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">What is NPV in a commercial lease?</a> · <a href="/commercial-lease-npv/what-discount-rate-should-you-use/">What discount rate should be used for commercial lease NPV?</a> · <a href="/commercial-lease-npv/when-is-npv-the-wrong-metric/">When is NPV the wrong metric?</a> · <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">How is lease NPV calculated?</a> · <a href="/commercial-lease-npv/what-costs-belong-in-lease-npv/">What costs belong in commercial lease NPV?</a> · <a href="/commercial-lease-npv/npv-vs-present-value/">What is the difference between NPV and present value in a lease?</a> · <a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients/">How should you explain lease NPV to a client?</a> · <a href="/commercial-lease-npv/why-use-npv-when-comparing-leases/">Why use NPV when comparing commercial leases?</a></p>
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
