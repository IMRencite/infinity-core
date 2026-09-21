import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How to present a lease model to a client",
  description: "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.",
  alternates: { canonical: "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How to present a lease model to a client", description: "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-financial-modeling/how-to-present-a-lease-model-to-a-client" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-financial-modeling">
        <JsonLdBlock data={SITE_SCHEMA["/lease-financial-modeling/how-to-present-a-lease-model-to-a-client"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-financial-modeling","label":"Lease financial modeling"},{"href":"/lease-financial-modeling/how-to-present-a-lease-model-to-a-client","label":"How should a lease model be presented to a client?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">lease financial modeling</p>
            <h1 className="pv-display">How should a lease model be presented to a client?</h1>
            <div data-question-id="q_3f8c801f1027083d" data-answer-chunk-id="q_3f8c801f1027083d_chunk">
              <AnswerFirst question="How should a lease model be presented to a client?" answer="Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/tenant-rep-analysis/how-to-communicate-lease-economics-to-a-cfo/">See the CFO conversation</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_a065582d76b1c78a" data-answer-chunk-id="q_a065582d76b1c78a_0"><AnswerFirst question="What is the short answer?" answer="Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide." /></div>
            <div data-question-id="q_2a153412f47edea9" data-answer-chunk-id="q_2a153412f47edea9_1"><AnswerFirst question="What should you change first?" answer="Change this page's input and hold the rate still." /></div>
            <div data-question-id="q_846e23f016915764" data-answer-chunk-id="q_846e23f016915764_2"><AnswerFirst question="What must stay visible?" answer="The rate, the extras, and the year the credit lands." /></div>
            <div data-question-id="q_0d087adb2825474b" data-answer-chunk-id="q_0d087adb2825474b_3"><AnswerFirst question="What should you open next?" answer="Open how to communicate lease economics to a cfo and keep the same stack." /></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Plain-language definition</h2>
            <p>Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.</p>
            <p>Start with cash you can date. Leave slogans off the sheet.</p>
            <p>Add extras the tenant still pays.</p>
            <p>Keep one visible rate so a later reader can check the work.</p>
            <p>Name the method in plain words.</p>
            <p>This page sits under <a href="/lease-financial-modeling/">Lease financial modeling</a>.</p>
            <p>Need the next step? Open <a href="/tenant-rep-analysis/how-to-communicate-lease-economics-to-a-cfo/">how to communicate lease economics to a cfo</a>.</p>
            <p>See <a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">What are common lease-analysis mistakes</a> when you want the nearby walk.</p>
            <p>Open <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/">How should you present lease scenarios to a CFO</a> if this page is not the last step.</p>
            <aside className="pv-callout" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading">
            <h2>Why it matters</h2>
            <p>This question still needs a dated cash walk: How should a lease model be presented to a client?</p>
            <p>A short recap cannot carry a year-by-year example.</p>
            <p>The rank can flip when this input moves.</p>
            <p>A finance lead will ask which line changed the number.</p>
            <aside className="pv-callout" data-callout="DECISION_NOTE"><h3>What this changes</h3><p>This question still needs a dated cash walk: How should a lease model be presented to a client?</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>How it works</h2>
            <ul><li>Put the numbers on one year list with rent.</li><li>Hold the other assumptions still.</li><li>Use one named method to shrink or spread the cash.</li><li>Show a second path so the gap is visible.</li><li>Keep the rate on the same page as the pick.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. Teaching picture only.</figcaption>
            </figure>
            <p>Formula in words. Model-presentation uses one shared rate and one dated list.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>First-year rent before extras</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, or insurance the tenant still pays</td></tr><tr><th scope="row">Credits</th><td>Free rent or build-out money</td></tr><tr><th scope="row">Term</th><td>How many years the cash list runs</td></tr><tr><th scope="row">Discount rate</th><td>How hard later cash is shrunk</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Model-presentation sample — two paths</caption><thead><tr><th scope="col">Metric</th><th scope="col">Path A</th><th scope="col">Path B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$45,000</td><td>$41,850</td></tr><tr><th scope="row">Year-1 extras</th><td>$10,200</td><td>$10,914</td></tr><tr><th scope="row">Year-1 credit</th><td>$8,500</td><td>$4,675</td></tr><tr><th scope="row">Sample NPV</th><td>$408,894</td><td>$394,044</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Model-presentation sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$45,000</td><td>$10,200</td><td>$8,500</td><td>$46,700</td><td>$43,241</td></tr><tr><th scope="row">Year 2</th><td>$46,350</td><td>$10,506</td><td>$0</td><td>$56,856</td><td>$48,745</td></tr><tr><th scope="row">Year 3</th><td>$47,741</td><td>$10,821</td><td>$0</td><td>$58,562</td><td>$46,488</td></tr><tr><th scope="row">Year 4</th><td>$49,173</td><td>$11,146</td><td>$0</td><td>$60,319</td><td>$44,336</td></tr><tr><th scope="row">Year 5</th><td>$50,648</td><td>$11,480</td><td>$0</td><td>$62,128</td><td>$42,283</td></tr><tr><th scope="row">Year 6</th><td>$52,167</td><td>$11,824</td><td>$0</td><td>$63,991</td><td>$40,325</td></tr><tr><th scope="row">Year 7</th><td>$53,732</td><td>$12,179</td><td>$0</td><td>$65,911</td><td>$38,458</td></tr><tr><th scope="row">Year 8</th><td>$55,344</td><td>$12,544</td><td>$0</td><td>$67,888</td><td>$36,678</td></tr><tr><th scope="row">Year 9</th><td>$57,004</td><td>$12,920</td><td>$0</td><td>$69,924</td><td>$34,979</td></tr><tr><th scope="row">Year 10</th><td>$58,714</td><td>$13,308</td><td>$0</td><td>$72,022</td><td>$33,360</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$408,894</td></tr></tbody></table></div>
              <p>Sample NPV for Model-presentation sample is about $408,894. A second path lands near $394,044.</p>
              <p>Year 1 of Model-presentation sample has rent of $45,000.</p>
            <p>Shared building cost is $10,200.</p>
            <p>A credit of $8,500 lowers the cash you pay that year.</p>
            <p>Cash out this year is about $46,700. Year one carries the Model-presentation sample credit.</p>
            <p>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $43,241 today.</p>
            <p>Next, year 2 rent is $46,350.</p>
              <p><PrimaryCTA href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">Read common model mistakes</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Assumptions</h2>
            <ul><li>The Model-presentation sample uses one visible 8 percent rate.</li><li>Credits hit in year one unless the page says otherwise.</li><li>Both options share the same extra basis.</li><li>No percentage rent sits in this teaching walk.</li></ul>
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
            <ul><li>Copying a nearby page and only changing the title.</li><li>Hiding the rate.</li><li>Dropping extras on a net path.</li><li>Calling the teaching sample a live client result.</li></ul>
            <aside className="pv-callout" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>Copying a nearby page and only changing the title.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading">
            <h2>Decision implications</h2>
            <p>Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.</p>
            <p>If the gap is thin, show a second rate before anyone picks.</p>
            <p>If one path wins only from a mistimed credit, rebuild the list.</p>
            <p>This page answers one question. Nearby pages cover the next step.</p>
            <p>See <a href="/tenant-rep-analysis/how-to-communicate-lease-economics-to-a-cfo/">how to communicate lease economics to a cfo</a> when you need that next step. Open <a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">What are common lease-analysis mistakes</a> for the nearby walk. Use <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/">How should you present lease scenarios to a CFO</a> if you want a second path.</p>
            
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
            <a className="sn-card" href="/lease-financial-modeling/" data-relationship="parent-hub" aria-label="Lease financial modeling. See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v3H4zm0 5h10v3H4zm0 5h16v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>Lease financial modeling</strong><span className="sn-desc">See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary.</span></span>
            </a>
            <a className="sn-card" href="/lease-financial-modeling/what-is-a-commercial-lease-financial-model/" data-relationship="related" aria-label="What is a commercial lease financial model. A lease model is a dated cash list with one rate and visible inputs.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>What is a commercial lease financial model</strong><span className="sn-desc">A lease model is a dated cash list with one rate and visible inputs.</span></span>
            </a>
            <a className="sn-card" href="/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/" data-relationship="related" aria-label="How free rent sits in a lease model. Put free rent in the months it actually pays.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>How free rent sits in a lease model</strong><span className="sn-desc">Put free rent in the months it actually pays.</span></span>
            </a>
            <a className="sn-card" href="/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/" data-relationship="related" aria-label="How a TI allowance sits in a lease model. A TI credit belongs in the year it funds work.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>How a TI allowance sits in a lease model</strong><span className="sn-desc">A TI credit belongs in the year it funds work.</span></span>
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
        </div><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-search-intent="COMMERCIAL_INVESTIGATION" data-surface="EMPHASIS">
          <div className="vg-container pv-reading">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/for/tenant-rep-brokers">See the tenant-rep workflow</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">What are common lease-analysis mistakes?</a> · <a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">What inputs belong in a commercial lease model?</a> · <a href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/">How do you build a lease cash-flow model?</a> · <a href="/lease-financial-modeling/what-is-a-commercial-lease-financial-model/">What is a commercial lease financial model?</a> · <a href="/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/">How should free rent sit in a lease model?</a> · <a href="/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/">How should a TI allowance sit in a lease model?</a> · <a href="/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/">How should rent escalations sit in a lease model?</a> · <a href="/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/">How do you run scenario analysis in a lease model?</a></p>
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
