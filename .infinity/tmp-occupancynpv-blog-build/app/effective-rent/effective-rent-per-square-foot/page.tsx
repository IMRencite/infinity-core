import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Effective rent per square foot",
  description: "Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale.",
  alternates: { canonical: "/effective-rent/effective-rent-per-square-foot/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Effective rent per square foot", description: "Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/effective-rent/effective-rent-per-square-foot" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="effective-rent">
        <JsonLdBlock data={SITE_SCHEMA["/effective-rent/effective-rent-per-square-foot"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/effective-rent","label":"Effective rent"},{"href":"/effective-rent/effective-rent-per-square-foot","label":"What is effective rent per square foot?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">effective rent</p>
            <h1 className="pv-display">What is effective rent per square foot?</h1>
            <div data-question-id="q_81d00205427f9a1d" data-answer-chunk-id="q_81d00205427f9a1d_chunk">
              <AnswerFirst question="What is effective rent per square foot?" answer="Turn the whole deal into one yearly dollar per foot so two buildings can share a scale." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/occupancy-costs/occupancy-cost-per-square-foot/">See occupancy cost per foot</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_c94b670883939815" data-answer-chunk-id="q_c94b670883939815_0" data-supporting-section="define">
              <AnswerFirst question="Usable or rentable?" answer="Pick one and keep it. Mixing them creates a fake win." />
            </div>
            <div data-question-id="q_908d55b163abfae6" data-answer-chunk-id="q_908d55b163abfae6_1" data-supporting-section="define">
              <AnswerFirst question="Does load factor matter?" answer="Yes. You may pay for hall you cannot sit in." />
            </div>
            <div data-question-id="q_df38e97c5ced2b46" data-answer-chunk-id="q_df38e97c5ced2b46_2" data-supporting-section="define">
              <AnswerFirst question="Is this the same as occupancy cost per foot?" answer="Only if extras sit in the effective rent you used." />
            </div>
            <div data-question-id="q_8c44d985b1400147" data-answer-chunk-id="q_8c44d985b1400147_3" data-supporting-section="define">
              <AnswerFirst question="Why yearly?" answer="Rooms already talk in dollars per foot per year." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Per square foot is the unit most rooms already speak.</p>
            <p>Effective rent per foot is the deal, not the sticker, in that unit.</p>
            <p>You must say usable or rentable. Those feet are not the same.</p>
            <p>A load factor can move the number without moving the rent.</p>
            <p>This page sits under <a href="/effective-rent/">Effective rent</a>.</p>
            <p>If extras matter, show <a href="/occupancy-costs/occupancy-cost-per-square-foot/">occupancy per foot</a> too.</p>
            <p>The usual <a href="/effective-rent/common-effective-rent-mistakes/">mistakes</a> start with mixed feet.</p>
            <p><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">Normalize</a> the foot basis before the beauty contest.</p>
            <p>Brokers should say the basis out loud. See <a href="/tenant-rep-analysis/">tenant-rep analysis</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Turn the whole deal into one yearly dollar per foot so two buildings can share a scale.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Clients compare buildings in dollars per foot.</p>
            <p>A cheap sticker on inefficient feet can lose.</p>
            <p>Finance wants one unit across locations.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Clients compare buildings in dollars per foot.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Build the yearly effective rent.</li><li>Divide by the feet you chose.</li><li>Use the same foot basis on every option.</li><li>Name usable versus rentable on the slide.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Effective rent per foot = yearly effective rent / chosen square feet.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Yearly effective rent</th><td>After credits</td></tr><tr><th scope="row">Foot basis</th><td>Usable or rentable</td></tr><tr><th scope="row">Load factor</th><td>If you pay for shared hall</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$52,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$48,360</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$444,758</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Per-foot sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$52,000</td><td>$48,360</td></tr><tr><th scope="row">Year-1 extras</th><td>$7,800</td><td>$8,346</td></tr><tr><th scope="row">Year-1 credit</th><td>$13,000</td><td>$7,150</td></tr><tr><th scope="row">Sample NPV</th><td>$444,758</td><td>$426,664</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Per-foot sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$52,000</td><td>$7,800</td><td>$13,000</td><td>$46,800</td><td>$43,535</td></tr><tr><th scope="row">Year 2</th><td>$53,300</td><td>$8,034</td><td>$0</td><td>$61,334</td><td>$53,074</td></tr><tr><th scope="row">Year 3</th><td>$54,632</td><td>$8,275</td><td>$0</td><td>$62,907</td><td>$50,638</td></tr><tr><th scope="row">Year 4</th><td>$55,998</td><td>$8,523</td><td>$0</td><td>$64,521</td><td>$48,313</td></tr><tr><th scope="row">Year 5</th><td>$57,398</td><td>$8,779</td><td>$0</td><td>$66,177</td><td>$46,096</td></tr><tr><th scope="row">Year 6</th><td>$59,120</td><td>$9,042</td><td>$0</td><td>$68,162</td><td>$44,166</td></tr><tr><th scope="row">Year 7</th><td>$60,894</td><td>$9,313</td><td>$0</td><td>$70,207</td><td>$42,318</td></tr><tr><th scope="row">Year 8</th><td>$62,721</td><td>$9,592</td><td>$0</td><td>$72,313</td><td>$40,546</td></tr><tr><th scope="row">Year 9</th><td>$64,603</td><td>$9,880</td><td>$0</td><td>$74,483</td><td>$38,849</td></tr><tr><th scope="row">Year 10</th><td>$66,541</td><td>$10,176</td><td>$0</td><td>$76,717</td><td>$37,223</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$444,758</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Per-foot sample is about $444,758. A second path lands near $426,664. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Per-foot sample</h3>
              <ul><li>Year 1 of Per-foot sample has rent of $52,000.</li><li>Shared building cost is $7,800.</li><li>A credit of $13,000 lowers the cash you pay that year.</li><li>Cash out this year is about $46,800. The first year is lighter after credits.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $43,535 today.</li></ul>
              <ul><li>Next, year 2 rent is $53,300.</li><li>CAM, which is a shared building cost, is $8,034.</li><li>There is no credit in this year.</li><li>You pay about $61,334 this year after extras and credits. The foot number rises as credits fade.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $53,074 today.</li></ul>
              <ul><li>Then year 3 rent is $54,632.</li><li>Extras for the building come to $8,275.</li><li>Credits skip this year.</li><li>The net cash this year is about $62,907. The bump lifts the later average.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $50,638 today.</li></ul>
              <ul><li>After that, year 4 rent is $55,998.</li><li>The shared building cost this time is $8,523.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $64,521. Later years set the long-term foot cost.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $48,313 today.</li></ul>
              <ul><li>In year 5 of Per-foot sample, rent is $57,398.</li><li>Shared building cost is $8,779.</li><li>There is no credit in this year.</li><li>You pay about $66,177 this year after extras and credits. The last year still belongs in the yearly figure.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $46,096 today.</li></ul>
              <ul><li>Year 6 of Per-foot sample has rent of $59,120.</li><li>CAM, which is a shared building cost, is $9,042.</li><li>Credits skip this year.</li><li>The net cash this year is about $68,162. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $44,166 today.</li></ul>
              <ul><li>Next, year 7 rent is $60,894.</li><li>Extras for the building come to $9,313.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $70,207. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $42,318 today.</li></ul>
              <ul><li>Then year 8 rent is $62,721.</li><li>The shared building cost this time is $9,592.</li><li>There is no credit in this year.</li><li>You pay about $72,313 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $40,546 today.</li></ul>
              <ul><li>After that, year 9 rent is $64,603.</li><li>Shared building cost is $9,880.</li><li>Credits skip this year.</li><li>The net cash this year is about $74,483. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $38,849 today.</li></ul>
              <ul><li>In year 10 of Per-foot sample, rent is $66,541.</li><li>CAM, which is a shared building cost, is $10,176.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $76,717. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $37,223 today.</li></ul><p>Add those year values. The sample NPV for Per-foot sample is about $444,758. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Per-foot sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/effective-rent/how-to-calculate-effective-rent/">See how to calculate it</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample uses rentable feet. A usable-foot version would look higher.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Two buildings with different load factors need the same basis.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Mixing usable and rentable.</li><li>Dividing a five-year total by one year of feet.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the client thinks in seats, also show cost per person beside the foot number.</p>
            <h2>Compare this to related metrics</h2>
            <p>Occupancy cost per foot includes extras. Effective rent per foot may or may not.</p>
            <p>See <a href="/occupancy-costs/occupancy-cost-per-square-foot/">occupancy cost per square foot</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A foot number cannot score the floor plate.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use it alone when one space wastes 20 percent of the floor.</li></ul>
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
            <p className="pv-spoke-index"><a href="/effective-rent/how-to-calculate-effective-rent">How do you calculate effective rent?</a> · <a href="/effective-rent/effective-rent-vs-face-rent">What is the difference between effective rent and face rent?</a> · <a href="/effective-rent/common-effective-rent-mistakes">What are common effective rent mistakes?</a></p>
            
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
            <RelatedContent items={[{"href":"/occupancy-costs/","label":"Occupancy costs","description":"The extras behind the foot number."}]} /></div>
            <div className="pv-related-family"><h3>Questions people ask next</h3>
            <RelatedContent items={[{"href":"/effective-rent/common-effective-rent-mistakes/","label":"Common mistakes","description":"Where the unit lies."}]} /></div>
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
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/how-to-calculate-effective-rent/" data-relationship="related" aria-label="How do you calculate effective rent. Add the rent you pay.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you calculate effective rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-face-rent/" data-relationship="related" aria-label="What is the difference between effective rent and face rent. Face rent is the sticker.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is the difference between effective rent and face rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
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
