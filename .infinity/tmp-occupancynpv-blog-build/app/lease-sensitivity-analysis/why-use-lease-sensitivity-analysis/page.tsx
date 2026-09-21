import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Why use lease sensitivity analysis?",
  description: "A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice.",
  alternates: { canonical: "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Why use lease sensitivity analysis?", description: "A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-sensitivity-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-sensitivity-analysis","label":"Lease sensitivity analysis"},{"href":"/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis","label":"Why use sensitivity analysis on a commercial lease?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease sensitivity analysis</p>
            <h1 className="pv-display">Why use sensitivity analysis on a commercial lease?</h1>
            <div data-question-id="q_e316660f6793c306" data-answer-chunk-id="q_e316660f6793c306_chunk">
              <AnswerFirst question="Why use sensitivity analysis on a commercial lease?" answer="A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/">See what sensitivity shows</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_12c6d3bfa5d68451" data-answer-chunk-id="q_12c6d3bfa5d68451_0" data-supporting-section="define">
              <AnswerFirst question="Why bother?" answer="A tidy rank can die when one assumption moves." />
            </div>
            <div data-question-id="q_ce8834188ed6caa1" data-answer-chunk-id="q_ce8834188ed6caa1_1" data-supporting-section="define">
              <AnswerFirst question="How many inputs?" answer="Two or three inputs matter. Extra knobs become fog." />
            </div>
            <div data-question-id="q_93909794c3db2e77" data-answer-chunk-id="q_93909794c3db2e77_2" data-supporting-section="define">
              <AnswerFirst question="Is this a scenario?" answer="Sensitivity is not a scenario. A scenario moves many things together on purpose." />
            </div>
            <div data-question-id="q_5426284236c0a692" data-answer-chunk-id="q_5426284236c0a692_3" data-supporting-section="define">
              <AnswerFirst question="What do you do with a flip?" answer="Name the flip. Then negotiate that input." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Sensitivity changes one or two inputs and watches the result.</p>
            <p>Treat it as a test, not a new deal.</p>
            <p>Scenario analysis moves many inputs together. Keep those words apart.</p>
            <p>This page sits under <a href="/lease-sensitivity-analysis/">Lease sensitivity analysis</a>.</p>
            <p>Read <a href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/">what it shows</a> before you build a grid.</p>
            <p>Start with the <a href="/commercial-lease-npv/what-discount-rate-should-you-use/">rate</a> as the first test.</p>
            <p>Then test <a href="/occupancy-costs/hidden-occupancy-costs/">extras</a> that can lift every year.</p>
            <p>Keep the test beside the compare in the <a href="/how-it-works">workflow</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Lease ranks look solid until the rate or the extra stack moves.</p>
            <p>A CFO wants the flip point, not a single trophy number.</p>
            <p>A broker who hides the flip later loses the room.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Lease ranks look solid until the rate or the extra stack moves.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Lock a base case.</li><li>Move one input.</li><li>Record whether the rank holds.</li><li>Repeat for the two or three inputs that actually matter.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. If a small move flips the winner, the base case was fragile.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Base case</th><td>The shared stack</td></tr><tr><th scope="row">Test input</th><td>Rate, extra, term, or credit</td></tr><tr><th scope="row">Range</th><td>A nearby high and low</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$40,500</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$37,665</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$356,818</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Why-sensitivity sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$40,500</td><td>$37,665</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,600</td><td>$9,202</td></tr><tr><th scope="row">Year-1 credit</th><td>$15,000</td><td>$8,250</td></tr><tr><th scope="row">Sample NPV</th><td>$356,818</td><td>$346,209</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Why-sensitivity sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$40,500</td><td>$8,600</td><td>$15,000</td><td>$34,100</td><td>$31,574</td></tr><tr><th scope="row">Year 2</th><td>$41,715</td><td>$8,858</td><td>$0</td><td>$50,573</td><td>$43,358</td></tr><tr><th scope="row">Year 3</th><td>$42,966</td><td>$9,124</td><td>$0</td><td>$52,090</td><td>$41,351</td></tr><tr><th scope="row">Year 4</th><td>$44,255</td><td>$9,397</td><td>$0</td><td>$53,652</td><td>$39,436</td></tr><tr><th scope="row">Year 5</th><td>$45,583</td><td>$9,679</td><td>$0</td><td>$55,262</td><td>$37,610</td></tr><tr><th scope="row">Year 6</th><td>$46,950</td><td>$9,969</td><td>$0</td><td>$56,919</td><td>$35,869</td></tr><tr><th scope="row">Year 7</th><td>$48,359</td><td>$10,268</td><td>$0</td><td>$58,627</td><td>$34,208</td></tr><tr><th scope="row">Year 8</th><td>$49,810</td><td>$10,576</td><td>$0</td><td>$60,386</td><td>$32,625</td></tr><tr><th scope="row">Year 9</th><td>$51,304</td><td>$10,893</td><td>$0</td><td>$62,197</td><td>$31,114</td></tr><tr><th scope="row">Year 10</th><td>$52,843</td><td>$11,220</td><td>$0</td><td>$64,063</td><td>$29,674</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$356,818</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Why-sensitivity sample is about $356,818. A second path lands near $346,209. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Why-sensitivity sample</h3>
              <ul><li>Year 1 of Why-sensitivity sample has rent of $40,500.</li><li>Shared building cost is $8,600.</li><li>A credit of $15,000 lowers the cash you pay that year.</li><li>Cash out this year is about $34,100. The base case looks calm in year one.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $31,574 today.</li></ul>
              <ul><li>Next, year 2 rent is $41,715.</li><li>CAM, which is a shared building cost, is $8,858.</li><li>There is no credit in this year.</li><li>You pay about $50,573 this year after extras and credits. A rate move would shrink later years more.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,358 today.</li></ul>
              <ul><li>Then year 3 rent is $42,966.</li><li>Extras for the building come to $9,124.</li><li>Credits skip this year.</li><li>The net cash this year is about $52,090. A CAM move would lift every year.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $41,351 today.</li></ul>
              <ul><li>After that, year 4 rent is $44,255.</li><li>The shared building cost this time is $9,397.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $53,652. Later cash is where rate tests bite.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $39,436 today.</li></ul>
              <ul><li>In year 5 of Why-sensitivity sample, rent is $45,583.</li><li>Shared building cost is $9,679.</li><li>There is no credit in this year.</li><li>You pay about $55,262 this year after extras and credits. The last year is the most shrunk.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $37,610 today.</li></ul>
              <ul><li>Year 6 of Why-sensitivity sample has rent of $46,950.</li><li>CAM, which is a shared building cost, is $9,969.</li><li>Credits skip this year.</li><li>The net cash this year is about $56,919. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $35,869 today.</li></ul>
              <ul><li>Next, year 7 rent is $48,359.</li><li>Extras for the building come to $10,268.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $58,627. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $34,208 today.</li></ul>
              <ul><li>Then year 8 rent is $49,810.</li><li>The shared building cost this time is $10,576.</li><li>There is no credit in this year.</li><li>You pay about $60,386 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $32,625 today.</li></ul>
              <ul><li>After that, year 9 rent is $51,304.</li><li>Shared building cost is $10,893.</li><li>Credits skip this year.</li><li>The net cash this year is about $62,197. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $31,114 today.</li></ul>
              <ul><li>In year 10 of Why-sensitivity sample, rent is $52,843.</li><li>CAM, which is a shared building cost, is $11,220.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $64,063. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $29,674 today.</li></ul><p>Add those year values. The sample NPV for Why-sensitivity sample is about $356,818. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Why-sensitivity sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/">See discount-rate flips</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample uses one rate move of two points in the talk track.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If every input flips the rank, the offers are too close to call.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Testing twenty inputs. Testing none. Hiding the flip.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the rank is fragile, negotiate the fragile input.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/">what sensitivity shows</a> for the mechanic.</p>
            <p>See <a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/">discount-rate flips</a> for the most common test.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>Sensitivity does not invent missing extras.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not run it before the stacks match.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking">How does discount-rate sensitivity change a lease ranking?</a> · <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo">How should you present lease scenarios to a CFO?</a></p>
            
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
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/","label":"Present scenarios to a CFO","description":"How to show the flip without theater."}]} /></div>
            <div className="pv-related-family"><h3>Learn this first</h3>
            <RelatedContent items={[{"href":"/commercial-lease-npv/","label":"Commercial lease NPV","description":"The number you are testing."}]} /></div>
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
            <a className="sn-card" data-card-role="TOPIC" href="/lease-sensitivity-analysis/" data-relationship="parent-hub" aria-label="Lease sensitivity analysis. A ranking can flip when one assumption changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease sensitivity analysis</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/" data-relationship="related" aria-label="What does lease sensitivity analysis show. Sensitivity analysis asks what happens if a key number changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What does lease sensitivity analysis show</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/" data-relationship="related" aria-label="How does discount-rate sensitivity change a lease ranking. A one or two point rate change can swap the winner when credits sit early and rent sits late.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How does discount-rate sensitivity change a lease ranking</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/" data-relationship="related" aria-label="How should you present lease scenarios to a CFO. Show the base case, one worse case, and the assumption that flips the rank.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How should you present lease scenarios to a CFO</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
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
