import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Occupancy cost per square foot",
  description: "Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option.",
  alternates: { canonical: "/occupancy-costs/occupancy-cost-per-square-foot/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Occupancy cost per square foot", description: "Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/occupancy-costs/occupancy-cost-per-square-foot" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="occupancy-costs">
        <JsonLdBlock data={SITE_SCHEMA["/occupancy-costs/occupancy-cost-per-square-foot"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/occupancy-costs","label":"Occupancy costs"},{"href":"/occupancy-costs/occupancy-cost-per-square-foot","label":"What is occupancy cost per square foot?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">occupancy costs</p>
            <h1 className="pv-display">What is occupancy cost per square foot?</h1>
            <div data-question-id="q_7120161bdffabb16" data-answer-chunk-id="q_7120161bdffabb16_chunk">
              <AnswerFirst question="What is occupancy cost per square foot?" answer="Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/effective-rent/effective-rent-per-square-foot/">See effective rent per foot</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_1eea1928a55aa468" data-answer-chunk-id="q_1eea1928a55aa468_0" data-supporting-section="define">
              <AnswerFirst question="What feet should you use?" answer="One basis for every option. Say usable or rentable." />
            </div>
            <div data-question-id="q_20e8f326918d8ab4" data-answer-chunk-id="q_20e8f326918d8ab4_1" data-supporting-section="define">
              <AnswerFirst question="Is this effective rent?" answer="Not always. Effective rent may skip extras this stack includes." />
            </div>
            <div data-question-id="q_8c44d985b1400147" data-answer-chunk-id="q_8c44d985b1400147_2" data-supporting-section="define">
              <AnswerFirst question="Why yearly?" answer="Rooms already budget in dollars per foot per year." />
            </div>
            <div data-question-id="q_9b4ae6bb8216ea22" data-answer-chunk-id="q_9b4ae6bb8216ea22_3" data-supporting-section="define">
              <AnswerFirst question="Can you compare cities this way?" answer="Yes, after each stack uses the same extras and the same foot basis." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>This is occupancy cost in the unit rooms already speak.</p>
            <p>It is not face rent per foot unless extras are zero.</p>
            <p>Usable and rentable feet change the result.</p>
            <p>This page sits under <a href="/occupancy-costs/">Occupancy costs</a>.</p>
            <p>Build the <a href="/occupancy-costs/what-is-total-occupancy-cost/">stack</a> before you divide.</p>
            <p>Keep <a href="/effective-rent/effective-rent-per-square-foot/">effective per foot</a> on a second line if credits are the story.</p>
            <p><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">Normalize</a> lease type first.</p>
            <p>Then <a href="/commercial-lease-npv/">NPV</a> can price the same stack over time.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Location picks happen in dollars per foot.</p>
            <p>A cheap rent on inefficient feet can lose.</p>
            <p>Finance can compare two cities on one scale.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Location picks happen in dollars per foot.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Build the yearly occupancy stack.</li><li>Pick usable or rentable feet.</li><li>Divide.</li><li>Keep that basis on every option.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Occupancy cost per foot = yearly occupancy stack / chosen square feet.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Yearly stack</th><td>Rent plus extras minus credits</td></tr><tr><th scope="row">Feet</th><td>Usable or rentable</td></tr><tr><th scope="row">Load factor</th><td>If you pay for shared hall</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$32,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$29,760</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$327,573</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Occupancy-per-foot sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$32,000</td><td>$29,760</td></tr><tr><th scope="row">Year-1 extras</th><td>$12,000</td><td>$12,840</td></tr><tr><th scope="row">Year-1 credit</th><td>$5,000</td><td>$2,750</td></tr><tr><th scope="row">Sample NPV</th><td>$327,573</td><td>$319,086</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Occupancy-per-foot sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$32,000</td><td>$12,000</td><td>$5,000</td><td>$39,000</td><td>$36,111</td></tr><tr><th scope="row">Year 2</th><td>$32,960</td><td>$12,360</td><td>$0</td><td>$45,320</td><td>$38,855</td></tr><tr><th scope="row">Year 3</th><td>$33,949</td><td>$12,731</td><td>$0</td><td>$46,680</td><td>$37,056</td></tr><tr><th scope="row">Year 4</th><td>$34,967</td><td>$13,113</td><td>$0</td><td>$48,080</td><td>$35,340</td></tr><tr><th scope="row">Year 5</th><td>$36,016</td><td>$13,506</td><td>$0</td><td>$49,522</td><td>$33,704</td></tr><tr><th scope="row">Year 6</th><td>$37,096</td><td>$13,911</td><td>$0</td><td>$51,007</td><td>$32,143</td></tr><tr><th scope="row">Year 7</th><td>$38,209</td><td>$14,328</td><td>$0</td><td>$52,537</td><td>$30,655</td></tr><tr><th scope="row">Year 8</th><td>$39,355</td><td>$14,758</td><td>$0</td><td>$54,113</td><td>$29,236</td></tr><tr><th scope="row">Year 9</th><td>$40,536</td><td>$15,201</td><td>$0</td><td>$55,737</td><td>$27,882</td></tr><tr><th scope="row">Year 10</th><td>$41,752</td><td>$15,657</td><td>$0</td><td>$57,409</td><td>$26,591</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$327,573</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Occupancy-per-foot sample is about $327,573. A second path lands near $319,086. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Occupancy-per-foot sample</h3>
              <ul><li>Year 1 of Occupancy-per-foot sample has rent of $32,000.</li><li>Shared building cost is $12,000.</li><li>A credit of $5,000 lowers the cash you pay that year.</li><li>Cash out this year is about $39,000. Year-one credits pull the foot number down.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $36,111 today.</li></ul>
              <ul><li>Next, year 2 rent is $32,960.</li><li>CAM, which is a shared building cost, is $12,360.</li><li>There is no credit in this year.</li><li>You pay about $45,320 this year after extras and credits. The stack rises as credits fade.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $38,855 today.</li></ul>
              <ul><li>Then year 3 rent is $33,949.</li><li>Extras for the building come to $12,731.</li><li>Credits skip this year.</li><li>The net cash this year is about $46,680. Extras keep the foot number above face rent.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $37,056 today.</li></ul>
              <ul><li>After that, year 4 rent is $34,967.</li><li>The shared building cost this time is $13,113.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $48,080. Later years set the long-term unit cost.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $35,340 today.</li></ul>
              <ul><li>In year 5 of Occupancy-per-foot sample, rent is $36,016.</li><li>Shared building cost is $13,506.</li><li>There is no credit in this year.</li><li>You pay about $49,522 this year after extras and credits. The last year is a full stack year.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $33,704 today.</li></ul>
              <ul><li>Year 6 of Occupancy-per-foot sample has rent of $37,096.</li><li>CAM, which is a shared building cost, is $13,911.</li><li>Credits skip this year.</li><li>The net cash this year is about $51,007. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $32,143 today.</li></ul>
              <ul><li>Next, year 7 rent is $38,209.</li><li>Extras for the building come to $14,328.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $52,537. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $30,655 today.</li></ul>
              <ul><li>Then year 8 rent is $39,355.</li><li>The shared building cost this time is $14,758.</li><li>There is no credit in this year.</li><li>You pay about $54,113 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $29,236 today.</li></ul>
              <ul><li>After that, year 9 rent is $40,536.</li><li>Shared building cost is $15,201.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,737. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $27,882 today.</li></ul>
              <ul><li>In year 10 of Occupancy-per-foot sample, rent is $41,752.</li><li>CAM, which is a shared building cost, is $15,657.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,409. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $26,591 today.</li></ul><p>Add those year values. The sample NPV for Occupancy-per-foot sample is about $327,573. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Occupancy-per-foot sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/occupancy-costs/what-is-total-occupancy-cost/">Read total occupancy cost</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample uses rentable feet.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Cost per employee can sit beside this when headcount is the constraint.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Dividing rent only.</li><li>Mixing foot bases.</li><li>Using one year as the life of the deal.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If two foot numbers tie, look at risk and options, not paint.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/effective-rent/effective-rent-per-square-foot/">effective rent per square foot</a> when the question is the deal average, not the full extra stack.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A foot number cannot score the labor market.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use it alone when one site needs a long empty build.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Compare two locations" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">Compare two locations</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/occupancy-costs/what-is-total-occupancy-cost">What is total occupancy cost in a commercial lease?</a> · <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease">What is CAM in a commercial lease?</a> · <a href="/occupancy-costs/hidden-occupancy-costs">What hidden occupancy costs do tenants miss?</a></p>
            
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
            <div className="pv-related-family"><h3>Use this in a comparison</h3>
            <RelatedContent items={[{"href":"/lease-comparison/","label":"Lease comparison","description":"Two locations, one unit."}]} /></div>
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/occupancy-costs/hidden-occupancy-costs/","label":"Hidden costs","description":"What the foot number still misses."}]} /></div>
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
            <a className="sn-card" data-card-role="TOPIC" href="/occupancy-costs/" data-relationship="parent-hub" aria-label="Occupancy costs. Face rent is not the full bill.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Occupancy costs</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-total-occupancy-cost/" data-relationship="related" aria-label="What is total occupancy cost in a commercial lease. Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is total occupancy cost in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-cam-in-a-commercial-lease/" data-relationship="related" aria-label="What is CAM in a commercial lease. CAM means common area maintenance.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is CAM in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/hidden-occupancy-costs/" data-relationship="related" aria-label="What hidden occupancy costs do tenants miss. Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What hidden occupancy costs do tenants miss</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
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
