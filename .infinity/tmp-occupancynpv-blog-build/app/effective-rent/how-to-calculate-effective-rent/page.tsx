import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How to calculate effective rent",
  description: "Add the rent you pay. Subtract credits. Spread the result across the term. A better method also prices waiting.",
  alternates: { canonical: "/effective-rent/how-to-calculate-effective-rent/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How to calculate effective rent", description: "Add the rent you pay. Subtract credits. Spread the result across the term. A better method also prices waiting." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/effective-rent/how-to-calculate-effective-rent" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="effective-rent">
        <JsonLdBlock data={SITE_SCHEMA["/effective-rent/how-to-calculate-effective-rent"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/effective-rent","label":"Effective rent"},{"href":"/effective-rent/how-to-calculate-effective-rent","label":"How do you calculate effective rent?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">effective rent</p>
            <h1 className="pv-display">How do you calculate effective rent?</h1>
            <div data-question-id="q_8447e23a49ea5fde" data-answer-chunk-id="q_8447e23a49ea5fde_chunk">
              <AnswerFirst question="How do you calculate effective rent?" answer="Add rent you pay, subtract credits, then spread the result across the term. A tighter method also prices waiting." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/effective-rent/effective-rent-vs-npv/">Compare effective rent and NPV</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_a1fe0c971fceb024" data-answer-chunk-id="q_a1fe0c971fceb024_0" data-supporting-section="define">
              <AnswerFirst question="What is the simple formula?" answer="Total rent plus extras minus credits, divided by the term." />
            </div>
            <div data-question-id="q_668c03237ecbce11" data-answer-chunk-id="q_668c03237ecbce11_1" data-supporting-section="define">
              <AnswerFirst question="What is the tighter formula?" answer="Discount the stream first. Then turn that sum into a level yearly amount." />
            </div>
            <div data-question-id="q_95149967eb38da5d" data-answer-chunk-id="q_95149967eb38da5d_2" data-supporting-section="define">
              <AnswerFirst question="Do you need a rate?" answer="Only for the tighter method. The simple average does not price waiting." />
            </div>
            <div data-question-id="q_c4289e975abb7285" data-answer-chunk-id="q_c4289e975abb7285_3" data-supporting-section="define">
              <AnswerFirst question="Which should brokers show?" answer="Show both when the rank might flip. Name the method." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Effective rent is one number that stands in for a messy deal.</p>
            <p>Face rent is the sticker. Effective rent folds in free months and build-out money.</p>
            <p>A simple method averages. A tighter method uses today's dollars first.</p>
            <p>Say which method you used. The two are not the same.</p>
            <p>This page sits under <a href="/effective-rent/">Effective rent</a>.</p>
            <p>Start from <a href="/effective-rent/effective-rent-vs-face-rent/">face rent</a> so the room sees the sticker first.</p>
            <p>The tighter method needs a <a href="/commercial-lease-npv/what-discount-rate-should-you-use/">discount rate</a>.</p>
            <p>Time <a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">credits</a> before you divide.</p>
            <p>The <a href="/effective-rent/">effective rent hub</a> keeps the limits next to the formula.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Add rent you pay, subtract credits, then spread the result across the term. A tighter method also prices waiting.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Clients ask for one foot number.</p>
            <p>Two deals with the same sticker can have different effective rent.</p>
            <p>The method choice can flip the rank.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Clients ask for one foot number.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Write every payment and credit.</li><li>For the simple method, subtract credits from total rent and divide by term.</li><li>For the tighter method, discount the stream, then turn that sum into a level yearly number.</li><li>State the rate if you used the tighter method.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Simple effective rent = (total rent + extras − credits) / years. Tighter method = NPV turned into a level yearly amount.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Face rent</th><td>The sticker</td></tr><tr><th scope="row">Credits</th><td>Free rent and TI</td></tr><tr><th scope="row">Term</th><td>Years or months</td></tr><tr><th scope="row">Rate</th><td>Needed for the tighter method</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$37,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$34,410</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$322,019</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Effective-rent sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$37,000</td><td>$34,410</td></tr><tr><th scope="row">Year-1 extras</th><td>$7,000</td><td>$7,490</td></tr><tr><th scope="row">Year-1 credit</th><td>$11,000</td><td>$6,050</td></tr><tr><th scope="row">Sample NPV</th><td>$322,019</td><td>$310,747</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Effective-rent sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$37,000</td><td>$7,000</td><td>$11,000</td><td>$33,000</td><td>$30,556</td></tr><tr><th scope="row">Year 2</th><td>$38,110</td><td>$7,210</td><td>$0</td><td>$45,320</td><td>$38,855</td></tr><tr><th scope="row">Year 3</th><td>$39,253</td><td>$7,426</td><td>$0</td><td>$46,679</td><td>$37,055</td></tr><tr><th scope="row">Year 4</th><td>$40,431</td><td>$7,649</td><td>$0</td><td>$48,080</td><td>$35,340</td></tr><tr><th scope="row">Year 5</th><td>$41,644</td><td>$7,879</td><td>$0</td><td>$49,523</td><td>$33,705</td></tr><tr><th scope="row">Year 6</th><td>$42,893</td><td>$8,115</td><td>$0</td><td>$51,008</td><td>$32,144</td></tr><tr><th scope="row">Year 7</th><td>$44,180</td><td>$8,358</td><td>$0</td><td>$52,538</td><td>$30,655</td></tr><tr><th scope="row">Year 8</th><td>$45,505</td><td>$8,609</td><td>$0</td><td>$54,114</td><td>$29,236</td></tr><tr><th scope="row">Year 9</th><td>$46,870</td><td>$8,867</td><td>$0</td><td>$55,737</td><td>$27,882</td></tr><tr><th scope="row">Year 10</th><td>$48,276</td><td>$9,133</td><td>$0</td><td>$57,409</td><td>$26,591</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$322,019</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Effective-rent sample is about $322,019. A second path lands near $310,747. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Effective-rent sample</h3>
              <ul><li>Year 1 of Effective-rent sample has rent of $37,000.</li><li>Shared building cost is $7,000.</li><li>A credit of $11,000 lowers the cash you pay that year.</li><li>Cash out this year is about $33,000. Free months cut year-one cash.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $30,556 today.</li></ul>
              <ul><li>Next, year 2 rent is $38,110.</li><li>CAM, which is a shared building cost, is $7,210.</li><li>There is no credit in this year.</li><li>You pay about $45,320 this year after extras and credits. The sticker returns in year two.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $38,855 today.</li></ul>
              <ul><li>Then year 3 rent is $39,253.</li><li>Extras for the building come to $7,426.</li><li>Credits skip this year.</li><li>The net cash this year is about $46,679. The bump lifts the later average.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $37,055 today.</li></ul>
              <ul><li>After that, year 4 rent is $40,431.</li><li>The shared building cost this time is $7,649.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $48,080. Later cash still shapes the tighter method.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $35,340 today.</li></ul>
              <ul><li>In year 5 of Effective-rent sample, rent is $41,644.</li><li>Shared building cost is $7,879.</li><li>There is no credit in this year.</li><li>You pay about $49,523 this year after extras and credits. The last year still sits in the divide.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $33,705 today.</li></ul>
              <ul><li>Year 6 of Effective-rent sample has rent of $42,893.</li><li>CAM, which is a shared building cost, is $8,115.</li><li>Credits skip this year.</li><li>The net cash this year is about $51,008. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $32,144 today.</li></ul>
              <ul><li>Next, year 7 rent is $44,180.</li><li>Extras for the building come to $8,358.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $52,538. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $30,655 today.</li></ul>
              <ul><li>Then year 8 rent is $45,505.</li><li>The shared building cost this time is $8,609.</li><li>There is no credit in this year.</li><li>You pay about $54,114 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $29,236 today.</li></ul>
              <ul><li>After that, year 9 rent is $46,870.</li><li>Shared building cost is $8,867.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,737. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $27,882 today.</li></ul>
              <ul><li>In year 10 of Effective-rent sample, rent is $48,276.</li><li>CAM, which is a shared building cost, is $9,133.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,409. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $26,591 today.</li></ul><p>Add those year values. The sample NPV for Effective-rent sample is about $322,019. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Effective-rent sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/effective-rent/effective-rent-vs-face-rent/">See face rent versus effective rent</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample shows both methods on the same cash list.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A credit after year one changes the simple average less than it changes NPV.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Calling a simple average an NPV result.</li><li>Forgetting TI.</li><li>Mixing gross and net.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If timing is the fight, use the tighter method. If the room wants a quick foot number, show both.</p>
            <h2>Compare this to related metrics</h2>
            <p>NPV keeps the lump sum. Effective rent turns it into a yearly foot number.</p>
            <p>See <a href="/effective-rent/effective-rent-vs-npv/">effective rent vs NPV</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>Neither method prices a renewal option well.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use effective rent as the only slide when cash this year is the constraint.</li></ul>
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
            <p className="pv-spoke-index"><a href="/effective-rent/effective-rent-vs-face-rent">What is the difference between effective rent and face rent?</a> · <a href="/effective-rent/effective-rent-per-square-foot">What is effective rent per square foot?</a> · <a href="/effective-rent/common-effective-rent-mistakes">What are common effective rent mistakes?</a></p>
            
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
            <div className="pv-related-family"><h3>Learn this first</h3>
            <RelatedContent items={[{"href":"/effective-rent/","label":"Effective rent","description":"Hub definition and limits."}]} /></div>
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/effective-rent/common-effective-rent-mistakes/","label":"Common mistakes","description":"Where the average lies."}]} /></div>
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
          <nav className="sn-block" data-semantic-navigation="LEARN_NEXT" aria-label="Learn next">
            <div className="sn-block-head">
              <span className="sn-kicker">LEARN NEXT</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" data-card-role="TOPIC" href="/effective-rent/" data-relationship="parent-hub" aria-label="Effective rent. Effective rent averages a lease into one number.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Effective rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-npv/" data-relationship="related" aria-label="Effective rent vs NPV: what is the difference. Effective rent averages.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Effective rent vs NPV: what is the difference</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-face-rent/" data-relationship="related" aria-label="What is the difference between effective rent and face rent. Face rent is the sticker.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is the difference between effective rent and face rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-per-square-foot/" data-relationship="related" aria-label="What is effective rent per square foot. Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is effective rent per square foot</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
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
