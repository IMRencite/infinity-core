import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What costs belong in lease NPV?",
  description: "Rent is not the whole list. CAM, tax, insurance, free rent, and build-out money belong on the same timeline.",
  alternates: { canonical: "/commercial-lease-npv/what-costs-belong-in-lease-npv/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What costs belong in lease NPV?", description: "Rent is not the whole list. CAM, tax, insurance, free rent, and build-out money belong on the same timeline." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/commercial-lease-npv/what-costs-belong-in-lease-npv" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="commercial-lease-npv">
        <JsonLdBlock data={SITE_SCHEMA["/commercial-lease-npv/what-costs-belong-in-lease-npv"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/commercial-lease-npv","label":"Commercial lease NPV"},{"href":"/commercial-lease-npv/what-costs-belong-in-lease-npv","label":"What costs belong in commercial lease NPV?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">commercial lease npv</p>
            <h1 className="pv-display">What costs belong in commercial lease NPV?</h1>
            <div data-question-id="q_0978a1215283f7a3" data-answer-chunk-id="q_0978a1215283f7a3_chunk">
              <AnswerFirst question="What costs belong in commercial lease NPV?" answer="Put rent, CAM, tax, insurance, and timed credits on one list. Leave a paid extra off and the rank can lie." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/occupancy-costs/">See occupancy costs</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_27cf16d988d12fed" data-answer-chunk-id="q_27cf16d988d12fed_0" data-supporting-section="define">
              <AnswerFirst question="Should CAM be in NPV?" answer="Yes, when the tenant pays it. Leave it off a net lease and the cheap rent can lie." />
            </div>
            <div data-question-id="q_7212ca2b2fe5b17f" data-answer-chunk-id="q_7212ca2b2fe5b17f_1" data-supporting-section="define">
              <AnswerFirst question="Do taxes belong?" answer="Yes, when the tenant pays a share. Place the estimate and the true-up in the right years." />
            </div>
            <div data-question-id="q_f033c21c4af15605" data-answer-chunk-id="q_f033c21c4af15605_2" data-supporting-section="define">
              <AnswerFirst question="Does free rent belong?" answer="Yes. Treat it as a credit in the months it actually happens." />
            </div>
            <div data-question-id="q_33544dc1d006b677" data-answer-chunk-id="q_33544dc1d006b677_3" data-supporting-section="define">
              <AnswerFirst question="Does furniture belong?" answer="Only if the client asked to put move-in spend in the same decision." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A cost belongs in NPV when cash leaves or returns because of the lease.</p>
            <p>Face rent is only the first line.</p>
            <p>CAM is a shared building cost. Tax and insurance often ride beside it.</p>
            <p>Free rent and build-out money are credits. Place them in the year they happen.</p>
            <p>A cost you will pay anyway, lease or not, does not belong here.</p>
            <p>This page sits under <a href="/commercial-lease-npv/">Commercial lease NPV</a>.</p>
            <p><a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">CAM</a> is a shared building cost. Put it on the list when the tenant pays it.</p>
            <p>A <a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">TI allowance</a> is a credit, not a rent cut in every year.</p>
            <p><a href="/effective-rent/">Effective rent</a> can hide the same extras inside one average.</p>
            <p>The same lines belong in <a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">model inputs</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Put rent, CAM, tax, insurance, and timed credits on one list. Leave a paid extra off and the rank can lie.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>A cheap face rent can hide a heavy extra stack.</p>
            <p>Clients feel the extras in year two, not in the brochure.</p>
            <p>Finance will ask what sat in the total.</p>
            <p>A missing CAM line is a common flip.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>A cheap face rent can hide a heavy extra stack.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Start with base rent by year.</li><li>Add extras the tenant actually pays.</li><li>Subtract credits in the right year.</li><li>Leave out one-time move costs unless the client asked to include them.</li><li>Name every line so no one has to guess.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Year cash = rent + extras − credits. Then shrink each year and add.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Base rent</th><td>The rent line before extras</td></tr><tr><th scope="row">CAM</th><td>Shared building cost</td></tr><tr><th scope="row">Tax</th><td>The tenant share of property tax</td></tr><tr><th scope="row">Insurance</th><td>The tenant share of building insurance</td></tr><tr><th scope="row">Credits</th><td>Free rent and TI money</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$39,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$36,270</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$369,437</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Cost-stack sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$39,000</td><td>$36,270</td></tr><tr><th scope="row">Year-1 extras</th><td>$11,000</td><td>$11,770</td></tr><tr><th scope="row">Year-1 credit</th><td>$14,000</td><td>$7,700</td></tr><tr><th scope="row">Sample NPV</th><td>$369,437</td><td>$360,433</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Cost-stack sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$39,000</td><td>$11,000</td><td>$14,000</td><td>$36,000</td><td>$33,488</td></tr><tr><th scope="row">Year 2</th><td>$39,975</td><td>$11,330</td><td>$0</td><td>$51,305</td><td>$44,396</td></tr><tr><th scope="row">Year 3</th><td>$40,974</td><td>$11,670</td><td>$0</td><td>$52,644</td><td>$42,376</td></tr><tr><th scope="row">Year 4</th><td>$41,999</td><td>$12,020</td><td>$0</td><td>$54,019</td><td>$40,449</td></tr><tr><th scope="row">Year 5</th><td>$43,049</td><td>$12,381</td><td>$0</td><td>$55,430</td><td>$38,610</td></tr><tr><th scope="row">Year 6</th><td>$44,340</td><td>$12,752</td><td>$0</td><td>$57,092</td><td>$36,993</td></tr><tr><th scope="row">Year 7</th><td>$45,670</td><td>$13,135</td><td>$0</td><td>$58,805</td><td>$35,445</td></tr><tr><th scope="row">Year 8</th><td>$47,040</td><td>$13,529</td><td>$0</td><td>$60,569</td><td>$33,961</td></tr><tr><th scope="row">Year 9</th><td>$48,451</td><td>$13,935</td><td>$0</td><td>$62,386</td><td>$32,540</td></tr><tr><th scope="row">Year 10</th><td>$49,905</td><td>$14,353</td><td>$0</td><td>$64,258</td><td>$31,178</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$369,437</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Cost-stack sample is about $369,437. A second path lands near $360,433. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Cost-stack sample</h3>
              <ul><li>Year 1 of Cost-stack sample has rent of $39,000.</li><li>Shared building cost is $11,000.</li><li>A credit of $14,000 lowers the cash you pay that year.</li><li>Cash out this year is about $36,000. Extras are large here because this is a net path.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $33,488 today.</li></ul>
              <ul><li>Next, year 2 rent is $39,975.</li><li>CAM, which is a shared building cost, is $11,330.</li><li>There is no credit in this year.</li><li>You pay about $51,305 this year after extras and credits. Rent steps and extras step with it.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $44,396 today.</li></ul>
              <ul><li>Then year 3 rent is $40,974.</li><li>Extras for the building come to $11,670.</li><li>Credits skip this year.</li><li>The net cash this year is about $52,644. No credit remains after year one.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $42,376 today.</li></ul>
              <ul><li>After that, year 4 rent is $41,999.</li><li>The shared building cost this time is $12,020.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $54,019. Later extras still belong in the sum.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,449 today.</li></ul>
              <ul><li>In year 5 of Cost-stack sample, rent is $43,049.</li><li>Shared building cost is $12,381.</li><li>There is no credit in this year.</li><li>You pay about $55,430 this year after extras and credits. Dropping extras here would fake a win.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $38,610 today.</li></ul>
              <ul><li>Year 6 of Cost-stack sample has rent of $44,340.</li><li>CAM, which is a shared building cost, is $12,752.</li><li>Credits skip this year.</li><li>The net cash this year is about $57,092. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $36,993 today.</li></ul>
              <ul><li>Next, year 7 rent is $45,670.</li><li>Extras for the building come to $13,135.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $58,805. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,445 today.</li></ul>
              <ul><li>Then year 8 rent is $47,040.</li><li>The shared building cost this time is $13,529.</li><li>There is no credit in this year.</li><li>You pay about $60,569 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $33,961 today.</li></ul>
              <ul><li>After that, year 9 rent is $48,451.</li><li>Shared building cost is $13,935.</li><li>Credits skip this year.</li><li>The net cash this year is about $62,386. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,540 today.</li></ul>
              <ul><li>In year 10 of Cost-stack sample, rent is $49,905.</li><li>CAM, which is a shared building cost, is $14,353.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $64,258. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $31,178 today.</li></ul><p>Add those year values. The sample NPV for Cost-stack sample is about $369,437. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Cost-stack sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/commercial-lease-npv/how-is-lease-npv-calculated/">See the calculation steps</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample treats extras as tenant-paid.</li><li>A gross path would fold extras into rent instead.</li><li>The rate stays at 7.5 percent for both options.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Percentage rent belongs only when the deal has it.</p>
            <p>Parking can belong if the client will pay it to stay.</p>
            <p>A TI overage the tenant pays is a cost, not a credit.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Comparing a gross rent to a net rent without extras.</li><li>Booking TI as income in every year.</li><li>Hiding a tax true-up off the list.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If extras are unknown, mark them as a range and test both ends.</p>
            <p>Do not let a missing extra pick the building.</p>
            <h2>Compare this to related metrics</h2>
            <p>Occupancy cost is the full stack. NPV is that stack after time.</p>
            <p>Read <a href="/occupancy-costs/what-is-total-occupancy-cost/">total occupancy cost</a> when the question is the bill, not the discount.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>The list is only as good as the lease abstract.</li><li>Legal terms can add costs the model never saw.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not invent extras to force a rank.</li><li>Do not omit extras to win a listing.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Try the comparison workflow" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">Try the comparison workflow</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/commercial-lease-npv/how-is-lease-npv-calculated">How is lease NPV calculated?</a> · <a href="/commercial-lease-npv/npv-vs-present-value">What is the difference between NPV and present value in a lease?</a> · <a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients">How should you explain lease NPV to a client?</a></p>
            
          </div>
        </section>
        <div className="vg-container pv-hoisted-light-modules">
        <section className="pv-source-board pv-wide-module" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
              
        
        <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.investopedia.com/terms/d/discountrate.asp","label":"Investopedia — discount rate"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"},{"href":"https://www.naiop.org/","label":"NAIOP"},{"href":"https://www.boma.org/","label":"BOMA"},{"href":"https://www.fasb.org/","label":"FASB"}]} />
            </section>
        <div className="pv-related-editorial" data-related-architecture="true">
            <h2>Related reading</h2>
            <div className="pv-related-family"><h3>Related lease concepts</h3>
            <RelatedContent items={[{"href":"/occupancy-costs/","label":"Occupancy costs","description":"See the full bill beyond face rent."}]} /></div>
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/occupancy-costs/hidden-occupancy-costs/","label":"Hidden occupancy costs","description":"Find the extras people skip."}]} /></div>
          </div>
        <Disclosure>Calculations on this page are informational. They are not legal advice and not investment advice. Lease terms should be independently verified.</Disclosure></div>
        
        <section className="pv-section onpv-page-depth" data-depth="resource">
          <div className="vg-container">
            <h2>How to use this with OccupancyNPV</h2>
            <p>This page answers the concept. OccupancyNPV applies it inside a DealWorkspace: enter lease scenarios, review cash-flow and occupancy cost, then compare NPV and discount-rate sensitivity. OccupancyNPV NPV is not the same as a face-rent comparison. OccupancyNPV is not a CRM or lease-administration suite, and this page is not legal or investment advice.</p>
            <p>Next: start the 3-day free trial, open <a href="/pricing">pricing</a>, or continue through related product paths.</p>
          </div>
        </section>
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container pv-authority-shell">
          <nav className="sn-block" data-semantic-navigation="GO_DEEPER" aria-label="Go deeper">
            <div className="sn-block-head">
              <span className="sn-kicker">GO DEEPER</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" data-card-role="TOPIC" href="/commercial-lease-npv/" data-relationship="parent-hub" aria-label="Commercial lease NPV. Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how ">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/" data-relationship="related" aria-label="What is NPV in a commercial lease. NPV turns later lease costs into today's dollars so you can compare options fairly.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is NPV in a commercial lease</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-discount-rate-should-you-use/" data-relationship="related" aria-label="What discount rate should be used for commercial lease NPV. The discount rate is the price of waiting.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What discount rate should be used for commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/when-is-npv-the-wrong-metric/" data-relationship="related" aria-label="When is NPV the wrong metric. NPV is a consistency tool, not a complete decision.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>When is NPV the wrong metric</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. Use one method on both offers.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
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
