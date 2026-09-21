import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Questions to ask before signing a lease",
  description: "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill.",
  alternates: { canonical: "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Questions to ask before signing a lease", description: "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-comparison/questions-to-ask-before-signing-a-commercial-lease" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-comparison">
        <JsonLdBlock data={SITE_SCHEMA["/lease-comparison/questions-to-ask-before-signing-a-commercial-lease"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-comparison","label":"Lease comparison"},{"href":"/lease-comparison/questions-to-ask-before-signing-a-commercial-lease","label":"What questions should a business ask before signing a commercial lease?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">lease comparison</p>
            <h1 className="pv-display">What questions should a business ask before signing a commercial lease?</h1>
            <div data-question-id="q_6a75ab06dd0aa281" data-answer-chunk-id="q_6a75ab06dd0aa281_chunk">
              <AnswerFirst question="What questions should a business ask before signing a commercial lease?" answer="Ask who pays extras, when credits land, what dates start, and which options survive. Then ask for one rate on the walk." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison/">See the comparison checklist</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_e01243c55054f938" data-answer-chunk-id="q_e01243c55054f938_0"><AnswerFirst question="What does this page answer?" answer="Ask who pays extras, when credits land, what dates start, and which options survive. Then ask for one rate on the walk." /></div>
            <div data-question-id="q_a6cc69361eff18d8" data-answer-chunk-id="q_a6cc69361eff18d8_1"><AnswerFirst question="What should sit beside it?" answer="The nearby owner page and one worked walk." /></div>
            <div data-question-id="q_ccb429d192386deb" data-answer-chunk-id="q_ccb429d192386deb_2"><AnswerFirst question="What is not answered here?" answer="A legal read and a location vote." /></div>
            <div data-question-id="q_8505a7c1dd8269f4" data-answer-chunk-id="q_8505a7c1dd8269f4_3"><AnswerFirst question="What is the next step?" answer="Open the related compare or model page and keep the same rate." /></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Plain-language definition</h2>
            <p>A signing question is a cash-and-risk question.</p>
            <p>The sticker is one line, not the lease.</p>
            <p>Options and penalties belong on the same list.</p>
            <p>A missing date is a hidden month of rent.</p>
            <p>Legal review still follows the math.</p>
            <p>This page sits under <a href="/lease-comparison/">Lease comparison</a>.</p>
            <p>Need the next step? Open <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison/">What belongs in a comparison</a>.</p>
            <p>See <a href="/occupancy-costs/hidden-occupancy-costs/">Hidden occupancy costs</a> when you want the nearby walk.</p>
            <p>Open <a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/">How brokers compare LOIs</a> if this page is not the last step.</p>
            <aside className="pv-callout" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Ask who pays extras, when credits land, what dates start, and which options survive. Then ask for one rate on the walk.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading">
            <h2>Why it matters</h2>
            <p>Businesses sign the rent they can say out loud and miss the extras.</p>
            <p>A later tax jump can exceed the rent win.</p>
            <p>Renewal language changes the real term.</p>
            <p>A short question list prevents a long regret.</p>
            <aside className="pv-callout" data-callout="DECISION_NOTE"><h3>What this changes</h3><p>Businesses sign the rent they can say out loud and miss the extras.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>How it works</h2>
            <ul><li>Ask for the occupancy stack.</li><li>Ask when free rent and TI pay.</li><li>Ask commencement and expiration.</li><li>Ask about caps and options.</li><li>Ask to see one discounted walk.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. Teaching picture only.</figcaption>
            </figure>
            <p>Formula in words. Sign only after stack + dates + options + rate are visible.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>First-year rent before extras</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, or insurance the tenant still pays</td></tr><tr><th scope="row">Credits</th><td>Free rent or build-out money</td></tr><tr><th scope="row">Term</th><td>How many years the cash list runs</td></tr><tr><th scope="row">Discount rate</th><td>How hard later cash is shrunk</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Signing-question sample — two paths</caption><thead><tr><th scope="col">Metric</th><th scope="col">Path A</th><th scope="col">Path B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$40,000</td><td>$37,200</td></tr><tr><th scope="row">Year-1 extras</th><td>$11,000</td><td>$11,770</td></tr><tr><th scope="row">Year-1 credit</th><td>$15,000</td><td>$8,250</td></tr><tr><th scope="row">Sample NPV</th><td>$371,169</td><td>$362,092</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Signing-question sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$40,000</td><td>$11,000</td><td>$15,000</td><td>$36,000</td><td>$33,333</td></tr><tr><th scope="row">Year 2</th><td>$41,200</td><td>$11,330</td><td>$0</td><td>$52,530</td><td>$45,036</td></tr><tr><th scope="row">Year 3</th><td>$42,436</td><td>$11,670</td><td>$0</td><td>$54,106</td><td>$42,951</td></tr><tr><th scope="row">Year 4</th><td>$43,709</td><td>$12,020</td><td>$0</td><td>$55,729</td><td>$40,962</td></tr><tr><th scope="row">Year 5</th><td>$45,020</td><td>$12,381</td><td>$0</td><td>$57,401</td><td>$39,066</td></tr><tr><th scope="row">Year 6</th><td>$46,371</td><td>$12,752</td><td>$0</td><td>$59,123</td><td>$37,258</td></tr><tr><th scope="row">Year 7</th><td>$47,762</td><td>$13,135</td><td>$0</td><td>$60,897</td><td>$35,533</td></tr><tr><th scope="row">Year 8</th><td>$49,195</td><td>$13,529</td><td>$0</td><td>$62,724</td><td>$33,888</td></tr><tr><th scope="row">Year 9</th><td>$50,671</td><td>$13,935</td><td>$0</td><td>$64,606</td><td>$32,319</td></tr><tr><th scope="row">Year 10</th><td>$52,191</td><td>$14,353</td><td>$0</td><td>$66,544</td><td>$30,823</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$371,169</td></tr></tbody></table></div>
              <p>Sample NPV for Signing-question sample is about $371,169. A second path lands near $362,092.</p>
              <p>Year 1 of Signing-question sample has rent of $40,000.</p>
            <p>Shared building cost is $11,000.</p>
            <p>A credit of $15,000 lowers the cash you pay that year.</p>
            <p>Cash out this year is about $36,000. Year one carries the Signing-question sample credit.</p>
            <p>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $33,333 today.</p>
            <p>Next, year 2 rent is $41,200.</p>
              <p><PrimaryCTA href="/occupancy-costs/hidden-occupancy-costs/">Read hidden occupancy costs</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Assumptions</h2>
            <ul><li>The Signing-question sample uses one visible 8 percent rate.</li><li>Credits hit in year one unless the page says otherwise.</li><li>Both options share the same extra basis.</li><li>No percentage rent sits in this teaching walk.</li></ul>
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
            <ul><li>Asking only about face rent.</li><li>Skipping CAM caps.</li><li>Ignoring start dates.</li><li>Treating an LOI as a lease.</li></ul>
            <aside className="pv-callout" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>Asking only about face rent.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading">
            <h2>Decision implications</h2>
            <p>Ask who pays extras, when credits land, what dates start, and which options survive. Then ask for one rate on the walk.</p>
            <p>If the gap is thin, show a second rate before anyone picks.</p>
            <p>If one path wins only from a mistimed credit, rebuild the list.</p>
            <p>This page answers one question. Nearby pages cover the next step.</p>
            <p>See <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison/">What belongs in a comparison</a> when you need that next step. Open <a href="/occupancy-costs/hidden-occupancy-costs/">Hidden occupancy costs</a> for the nearby walk. Use <a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/">How brokers compare LOIs</a> if you want a second path.</p>
            
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
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" href="/lease-comparison/" data-relationship="parent-hub" aria-label="Lease comparison. Compare two or more commercial leases on the same timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v3H4zm0 5h10v3H4zm0 5h16v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Lease comparison</strong><span className="sn-desc">Compare two or more commercial leases on the same timeline.</span></span>
            </a>
            <a className="sn-card" href="/lease-comparison/how-do-cfos-review-lease-comparisons/" data-relationship="related" aria-label="How CFOs review lease comparisons. Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>How CFOs review lease comparisons</strong><span className="sn-desc">Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner.</span></span>
            </a>
            <a className="sn-card" href="/lease-comparison/how-do-cam-charges-change-a-comparison/" data-relationship="related" aria-label="How CAM charges change a comparison. A net rent sticker is not the bill.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>How CAM charges change a comparison</strong><span className="sn-desc">A net rent sticker is not the bill.</span></span>
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
            <p className="pv-spoke-index"><a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">How do you compare two commercial lease proposals?</a> · <a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">How do free rent periods and tenant improvement allowances affect NPV?</a> · <a href="/lease-comparison/how-do-you-compare-different-lease-terms/">How do you compare leases with different term lengths?</a> · <a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">How do you normalize commercial lease proposals?</a> · <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">How do you compare a gross lease and a net lease?</a> · <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison/">What belongs in a commercial lease comparison?</a> · <a href="/lease-comparison/how-do-brokers-compare-lease-offers/">How do tenant-rep brokers compare lease offers?</a> · <a href="/lease-comparison/how-do-cfos-review-lease-comparisons/">How do CFOs review commercial lease comparisons?</a></p>
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
