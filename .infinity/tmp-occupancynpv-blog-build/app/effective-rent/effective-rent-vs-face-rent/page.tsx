import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Effective rent vs face rent",
  description: "Face rent is the sticker. Effective rent folds in free months, build-out money, and the rest of the deal.",
  alternates: { canonical: "/effective-rent/effective-rent-vs-face-rent/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Effective rent vs face rent", description: "Face rent is the sticker. Effective rent folds in free months, build-out money, and the rest of the deal." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/effective-rent/effective-rent-vs-face-rent" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="effective-rent">
        <JsonLdBlock data={SITE_SCHEMA["/effective-rent/effective-rent-vs-face-rent"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/effective-rent","label":"Effective rent"},{"href":"/effective-rent/effective-rent-vs-face-rent","label":"What is the difference between effective rent and face rent?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">effective rent</p>
            <h1 className="pv-display">What is the difference between effective rent and face rent?</h1>
            <div data-question-id="q_6312c476e43a3c75" data-answer-chunk-id="q_6312c476e43a3c75_chunk">
              <AnswerFirst question="What is the difference between effective rent and face rent?" answer="Face rent is the sticker on the lease. Effective rent folds in free months, build-out money, and other credits." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/effective-rent/how-to-calculate-effective-rent/">See the formula</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_8132a0f042d2f751" data-answer-chunk-id="q_8132a0f042d2f751_0" data-supporting-section="define">
              <AnswerFirst question="What is face rent?" answer="Face rent is the sticker on a normal invoice month." />
            </div>
            <div data-question-id="q_58541b722a49db73" data-answer-chunk-id="q_58541b722a49db73_1" data-supporting-section="define">
              <AnswerFirst question="What is asking rent?" answer="Asking rent is the marketed sticker. Rooms often use the same idea as face rent." />
            </div>
            <div data-question-id="q_a28d36b9ae98b38e" data-answer-chunk-id="q_a28d36b9ae98b38e_2" data-supporting-section="define">
              <AnswerFirst question="Why is effective rent lower?" answer="Free months and TI pull the average down below the sticker." />
            </div>
            <div data-question-id="q_e31badb254bfe104" data-answer-chunk-id="q_e31badb254bfe104_3" data-supporting-section="define">
              <AnswerFirst question="Which should you negotiate?" answer="Negotiate both. Stickers and credits change different years." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Face rent is also called contract rent or asking rent in some rooms.</p>
            <p>Invoices in a normal month still show that sticker.</p>
            <p>Effective rent is the deal after you spread the gifts and extras.</p>
            <p>Soft markets can open a wide gap between those two numbers.</p>
            <p>This page sits under <a href="/effective-rent/">Effective rent</a>.</p>
            <p>Use the <a href="/effective-rent/how-to-calculate-effective-rent/">formula</a> once both numbers are on the page.</p>
            <p><a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">NPV</a> keeps timing when an average would hide it.</p>
            <p>A <a href="/lease-comparison/">comparison</a> should show both stickers and both effective numbers.</p>
            <p>Face rent is still only part of <a href="/occupancy-costs/what-is-total-occupancy-cost/">occupancy cost</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Face rent is the sticker on the lease. Effective rent folds in free months, build-out money, and other credits.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Listings lead with face rent.</p>
            <p>Concessions hide in the term sheet.</p>
            <p>A client who compares stickers can pick the worse stay.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Listings lead with face rent.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Write the face rent.</li><li>Write every free month and TI dollar.</li><li>Spread those credits across the term, or discount them first.</li><li>Show both numbers in the same unit.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Effective rent sits below face rent when credits exist. The gap is the concession story.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Face rent</th><td>Sticker</td></tr><tr><th scope="row">Free rent</th><td>Months at zero</td></tr><tr><th scope="row">TI</th><td>Build-out money</td></tr><tr><th scope="row">Term</th><td>How long you spread the gift</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$48,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$44,640</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$390,354</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Face versus effective sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$48,000</td><td>$44,640</td></tr><tr><th scope="row">Year-1 extras</th><td>$6,400</td><td>$6,848</td></tr><tr><th scope="row">Year-1 credit</th><td>$22,000</td><td>$12,100</td></tr><tr><th scope="row">Sample NPV</th><td>$390,354</td><td>$377,533</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Face versus effective sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$48,000</td><td>$6,400</td><td>$22,000</td><td>$32,400</td><td>$30,000</td></tr><tr><th scope="row">Year 2</th><td>$49,440</td><td>$6,592</td><td>$0</td><td>$56,032</td><td>$48,038</td></tr><tr><th scope="row">Year 3</th><td>$50,923</td><td>$6,790</td><td>$0</td><td>$57,713</td><td>$45,814</td></tr><tr><th scope="row">Year 4</th><td>$52,451</td><td>$6,993</td><td>$0</td><td>$59,444</td><td>$43,693</td></tr><tr><th scope="row">Year 5</th><td>$54,024</td><td>$7,203</td><td>$0</td><td>$61,227</td><td>$41,670</td></tr><tr><th scope="row">Year 6</th><td>$55,645</td><td>$7,419</td><td>$0</td><td>$63,064</td><td>$39,741</td></tr><tr><th scope="row">Year 7</th><td>$57,314</td><td>$7,642</td><td>$0</td><td>$64,956</td><td>$37,901</td></tr><tr><th scope="row">Year 8</th><td>$59,033</td><td>$7,871</td><td>$0</td><td>$66,904</td><td>$36,146</td></tr><tr><th scope="row">Year 9</th><td>$60,804</td><td>$8,107</td><td>$0</td><td>$68,911</td><td>$34,473</td></tr><tr><th scope="row">Year 10</th><td>$62,628</td><td>$8,350</td><td>$0</td><td>$70,978</td><td>$32,877</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$390,354</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Face versus effective sample is about $390,354. A second path lands near $377,533. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Face versus effective sample</h3>
              <ul><li>Year 1 of Face versus effective sample has rent of $48,000.</li><li>Shared building cost is $6,400.</li><li>A credit of $22,000 lowers the cash you pay that year.</li><li>Cash out this year is about $32,400. The credit makes year one look kind.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $30,000 today.</li></ul>
              <ul><li>Next, year 2 rent is $49,440.</li><li>CAM, which is a shared building cost, is $6,592.</li><li>There is no credit in this year.</li><li>You pay about $56,032 this year after extras and credits. Face rent returns in year two.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $48,038 today.</li></ul>
              <ul><li>Then year 3 rent is $50,923.</li><li>Extras for the building come to $6,790.</li><li>Credits skip this year.</li><li>The net cash this year is about $57,713. The sticker now runs the invoice.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $45,814 today.</li></ul>
              <ul><li>After that, year 4 rent is $52,451.</li><li>The shared building cost this time is $6,993.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $59,444. Later years still follow the face path.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $43,693 today.</li></ul>
              <ul><li>In year 5 of Face versus effective sample, rent is $54,024.</li><li>Shared building cost is $7,203.</li><li>There is no credit in this year.</li><li>You pay about $61,227 this year after extras and credits. The last year is almost all sticker.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $41,670 today.</li></ul>
              <ul><li>Year 6 of Face versus effective sample has rent of $55,645.</li><li>CAM, which is a shared building cost, is $7,419.</li><li>Credits skip this year.</li><li>The net cash this year is about $63,064. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $39,741 today.</li></ul>
              <ul><li>Next, year 7 rent is $57,314.</li><li>Extras for the building come to $7,642.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $64,956. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $37,901 today.</li></ul>
              <ul><li>Then year 8 rent is $59,033.</li><li>The shared building cost this time is $7,871.</li><li>There is no credit in this year.</li><li>You pay about $66,904 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $36,146 today.</li></ul>
              <ul><li>After that, year 9 rent is $60,804.</li><li>Shared building cost is $8,107.</li><li>Credits skip this year.</li><li>The net cash this year is about $68,911. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $34,473 today.</li></ul>
              <ul><li>In year 10 of Face versus effective sample, rent is $62,628.</li><li>CAM, which is a shared building cost, is $8,350.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $70,978. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $32,877 today.</li></ul><p>Add those year values. The sample NPV for Face versus effective sample is about $390,354. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Face versus effective sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/commercial-lease-npv/">Learn commercial lease NPV</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample has a large year-one credit so the gap is easy to see.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If there are no credits, the two numbers can match.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Treating asking rent as the cost.</li><li>Spreading TI over a renewal you may not take.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>Use face rent to talk about the invoice. Use effective rent to talk about the deal.</p>
            <h2>Compare this to related metrics</h2>
            <p>Asking rent is a market signal. Effective rent is a deal signal.</p>
            <p>See <a href="/effective-rent/effective-rent-per-square-foot/">effective rent per square foot</a> for the unit.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>Face rent still matters for budgeting the later years.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not hide face rent. The invoice will still arrive.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Compare two leases" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">Compare two leases</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/effective-rent/how-to-calculate-effective-rent">How do you calculate effective rent?</a> · <a href="/effective-rent/effective-rent-per-square-foot">What is effective rent per square foot?</a> · <a href="/effective-rent/common-effective-rent-mistakes">What are common effective rent mistakes?</a></p>
            
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
            <RelatedContent items={[{"href":"/effective-rent/effective-rent-vs-npv/","label":"Effective rent vs NPV","description":"Average versus today's dollars."}]} /></div>
            <div className="pv-related-family"><h3>Use this in a comparison</h3>
            <RelatedContent items={[{"href":"/lease-comparison/how-do-you-compare-two-commercial-lease-options/","label":"Two-option compare","description":"Put both metrics on one table."}]} /></div>
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
          <nav className="sn-block" data-semantic-navigation="COMPARE_NEXT" aria-label="Compare the next decision">
            <div className="sn-block-head">
              <span className="sn-kicker">COMPARE NEXT</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/" data-relationship="comparison" aria-label="Compare two commercial leases. Put both leases on one timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Compare two commercial leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-gross-and-net-leases/" data-relationship="comparison" aria-label="Gross and net leases. Convert both offers to one occupancy-cost stack.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Gross and net leases</strong><span className="sn-desc">Convert both offers to one occupancy-cost stack.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-npv/" data-relationship="comparison" aria-label="Effective rent vs NPV. One number can hide later cash.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Effective rent vs NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-total-occupancy-cost/" data-relationship="related" aria-label="What is total occupancy cost. Add the extras that sit beside rent.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is total occupancy cost</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Use the comparison workflow. Try the same method on a sample pair.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Use the comparison workflow</strong><span className="sn-desc">Try the same method on a sample pair.</span></span>
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
