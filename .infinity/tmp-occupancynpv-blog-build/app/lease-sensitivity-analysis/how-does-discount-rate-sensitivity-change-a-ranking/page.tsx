import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How discount-rate sensitivity changes a ranking",
  description: "A one or two point rate change can swap the winner when credits sit early and rent sits late.",
  alternates: { canonical: "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How discount-rate sensitivity changes a ranking", description: "A one or two point rate change can swap the winner when credits sit early and rent sits late." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-sensitivity-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-sensitivity-analysis","label":"Lease sensitivity analysis"},{"href":"/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking","label":"How does discount-rate sensitivity change a lease ranking?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease sensitivity analysis</p>
            <h1 className="pv-display">How does discount-rate sensitivity change a lease ranking?</h1>
            <div data-question-id="q_48c49f5c16892da7" data-answer-chunk-id="q_48c49f5c16892da7_chunk">
              <AnswerFirst question="How does discount-rate sensitivity change a lease ranking?" answer="A one or two point rate change can swap the winner when credits sit early and rent sits late." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/commercial-lease-npv/what-discount-rate-should-you-use/">Read discount-rate choices</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_38910a0d8f8dfc95" data-answer-chunk-id="q_38910a0d8f8dfc95_0" data-supporting-section="define">
              <AnswerFirst question="How big a move matters?" answer="One or two points is enough on many concession-heavy deals." />
            </div>
            <div data-question-id="q_106f08189fa52fc9" data-answer-chunk-id="q_106f08189fa52fc9_1" data-supporting-section="define">
              <AnswerFirst question="Which deal likes a high rate?" answer="The one that pays more later and takes credits now." />
            </div>
            <div data-question-id="q_6c725c0245340431" data-answer-chunk-id="q_6c725c0245340431_2" data-supporting-section="define">
              <AnswerFirst question="Should the rate differ by landlord?" answer="No. One rate, then a shared test." />
            </div>
            <div data-question-id="q_ef0042001063d111" data-answer-chunk-id="q_ef0042001063d111_3" data-supporting-section="define">
              <AnswerFirst question="What do you show the CFO?" answer="The base rank and the first flip." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>The discount rate is the price of waiting.</p>
            <p>A higher rate shrinks later cash more.</p>
            <p>A deal that dumps cash later looks better at a low rate and worse at a high rate.</p>
            <p>This page sits under <a href="/lease-sensitivity-analysis/">Lease sensitivity analysis</a>.</p>
            <p>First <a href="/commercial-lease-npv/what-discount-rate-should-you-use/">pick a rate</a>. Then move it.</p>
            <p><a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">Early credits</a> are why the flip exists.</p>
            <p>Carry the flip to the <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/">CFO page</a>.</p>
            <p>If the flip is huge, also read <a href="/commercial-lease-npv/when-is-npv-the-wrong-metric/">NPV limits</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>A one or two point rate change can swap the winner when credits sit early and rent sits late.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Public lease writeups note that a 1 to 2 point move can reverse a rank.</p>
            <p>Credits up front and rent later are the usual setup for a flip.</p>
            <p>If you hide the rate, you hide the fragility.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Public lease writeups note that a 1 to 2 point move can reverse a rank.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Compute NPV at the agreed rate.</li><li>Recompute one or two points above and below.</li><li>See whether the winner holds.</li><li>Show the table, not just the favorite.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. If NPV A is lower than NPV B at 7 percent and higher at 9 percent, the rank is rate-fragile.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Base rate</th><td>The agreed price of waiting</td></tr><tr><th scope="row">Nearby rates</th><td>Plus and minus one or two points</td></tr><tr><th scope="row">Cash timing</th><td>Where credits and rent sit</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$35,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$32,550</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$294,884</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Rate-flip sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$35,000</td><td>$32,550</td></tr><tr><th scope="row">Year-1 extras</th><td>$7,000</td><td>$7,490</td></tr><tr><th scope="row">Year-1 credit</th><td>$24,000</td><td>$13,200</td></tr><tr><th scope="row">Sample NPV</th><td>$294,884</td><td>$290,086</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Rate-flip sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$35,000</td><td>$7,000</td><td>$24,000</td><td>$18,000</td><td>$16,667</td></tr><tr><th scope="row">Year 2</th><td>$36,050</td><td>$7,210</td><td>$0</td><td>$43,260</td><td>$37,088</td></tr><tr><th scope="row">Year 3</th><td>$37,132</td><td>$7,426</td><td>$0</td><td>$44,558</td><td>$35,372</td></tr><tr><th scope="row">Year 4</th><td>$38,245</td><td>$7,649</td><td>$0</td><td>$45,894</td><td>$33,733</td></tr><tr><th scope="row">Year 5</th><td>$39,393</td><td>$7,879</td><td>$0</td><td>$47,272</td><td>$32,173</td></tr><tr><th scope="row">Year 6</th><td>$40,575</td><td>$8,115</td><td>$0</td><td>$48,690</td><td>$30,683</td></tr><tr><th scope="row">Year 7</th><td>$41,792</td><td>$8,358</td><td>$0</td><td>$50,150</td><td>$29,262</td></tr><tr><th scope="row">Year 8</th><td>$43,046</td><td>$8,609</td><td>$0</td><td>$51,655</td><td>$27,908</td></tr><tr><th scope="row">Year 9</th><td>$44,337</td><td>$8,867</td><td>$0</td><td>$53,204</td><td>$26,615</td></tr><tr><th scope="row">Year 10</th><td>$45,667</td><td>$9,133</td><td>$0</td><td>$54,800</td><td>$25,383</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$294,884</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Rate-flip sample is about $294,884. A second path lands near $290,086. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Rate-flip sample</h3>
              <ul><li>Year 1 of Rate-flip sample has rent of $35,000.</li><li>Shared building cost is $7,000.</li><li>A credit of $24,000 lowers the cash you pay that year.</li><li>Cash out this year is about $18,000. A large credit sits early, so a high rate helps this path.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $16,667 today.</li></ul>
              <ul><li>Next, year 2 rent is $36,050.</li><li>CAM, which is a shared building cost, is $7,210.</li><li>There is no credit in this year.</li><li>You pay about $43,260 this year after extras and credits. Year two returns to a plain bill.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $37,088 today.</li></ul>
              <ul><li>Then year 3 rent is $37,132.</li><li>Extras for the building come to $7,426.</li><li>Credits skip this year.</li><li>The net cash this year is about $44,558. Later rent is where a low rate helps the other path.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $35,372 today.</li></ul>
              <ul><li>After that, year 4 rent is $38,245.</li><li>The shared building cost this time is $7,649.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $45,894. The later years grow.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $33,733 today.</li></ul>
              <ul><li>In year 5 of Rate-flip sample, rent is $39,393.</li><li>Shared building cost is $7,879.</li><li>There is no credit in this year.</li><li>You pay about $47,272 this year after extras and credits. The last year is the most sensitive to the rate.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $32,173 today.</li></ul>
              <ul><li>Year 6 of Rate-flip sample has rent of $40,575.</li><li>CAM, which is a shared building cost, is $8,115.</li><li>Credits skip this year.</li><li>The net cash this year is about $48,690. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $30,683 today.</li></ul>
              <ul><li>Next, year 7 rent is $41,792.</li><li>Extras for the building come to $8,358.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $50,150. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $29,262 today.</li></ul>
              <ul><li>Then year 8 rent is $43,046.</li><li>The shared building cost this time is $8,609.</li><li>There is no credit in this year.</li><li>You pay about $51,655 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $27,908 today.</li></ul>
              <ul><li>After that, year 9 rent is $44,337.</li><li>Shared building cost is $8,867.</li><li>Credits skip this year.</li><li>The net cash this year is about $53,204. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $26,615 today.</li></ul>
              <ul><li>In year 10 of Rate-flip sample, rent is $45,667.</li><li>CAM, which is a shared building cost, is $9,133.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $54,800. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $25,383 today.</li></ul><p>Add those year values. The sample NPV for Rate-flip sample is about $294,884. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Rate-flip sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-sensitivity-analysis/">Open the sensitivity hub</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample uses 8 percent as the middle rate.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If both streams have the same shape, the rate may not flip them.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Using a property cap rate as the lease rate.</li><li>Testing only the favorite rate.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the rank flips, do not sell certainty. Sell the range.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/commercial-lease-npv/what-discount-rate-should-you-use/">what rate to use</a> before you test nearby rates.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A rate test does not fix missing extras.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use a rate grid to bury a bad location.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="See the comparison workflow" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">See the comparison workflow</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis">Why use sensitivity analysis on a commercial lease?</a> · <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo">How should you present lease scenarios to a CFO?</a></p>
            
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
            <RelatedContent items={[{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease/","label":"What is NPV?","description":"The number being tested."}]} /></div>
            <div className="pv-related-family"><h3>Questions people ask next</h3>
            <RelatedContent items={[{"href":"/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/","label":"CFO scenarios","description":"How to show the grid."}]} /></div>
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
            <a className="sn-card" data-card-role="TOPIC" href="/lease-sensitivity-analysis/" data-relationship="parent-hub" aria-label="Lease sensitivity analysis. A ranking can flip when one assumption changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease sensitivity analysis</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/" data-relationship="related" aria-label="What does lease sensitivity analysis show. Sensitivity analysis asks what happens if a key number changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What does lease sensitivity analysis show</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/" data-relationship="related" aria-label="Why use sensitivity analysis on a commercial lease. A ranking can flip when one assumption moves.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Why use sensitivity analysis on a commercial lease</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
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
