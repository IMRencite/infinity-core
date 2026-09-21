import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Lease sensitivity analysis",
  description: "A ranking can flip when one assumption changes. Learn which inputs move the result and how to show that to a client.",
  alternates: { canonical: "/lease-sensitivity-analysis/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Lease sensitivity analysis", description: "A ranking can flip when one assumption changes. Learn which inputs move the result and how to show that to a client." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-sensitivity-analysis" role="EDUCATIONAL_HUB" pattern="EDUCATIONAL_HUB" cluster="lease-sensitivity-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/lease-sensitivity-analysis"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-sensitivity-analysis","label":"What is lease sensitivity analysis?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease sensitivity analysis</p>
            <h1 className="pv-display">What is lease sensitivity analysis?</h1>
            <div data-question-id="q_bc73bb4c5e1e5bd6" data-answer-chunk-id="q_bc73bb4c5e1e5bd6_chunk">
              <AnswerFirst question="What is lease sensitivity analysis?" answer="Lease sensitivity analysis asks what happens if one key number changes. If the winner flips, the deal was close. If it holds, the rank is more sturdy." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/">See what sensitivity shows</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/lease-sensitivity-analysis_0" data-answer-chunk-id="exp_/lease-sensitivity-analysis_0_chunk">
              <AnswerFirst question="What does sensitivity show?" answer="Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted." />
            </div>
            <div data-question-id="exp_/lease-sensitivity-analysis_1" data-answer-chunk-id="exp_/lease-sensitivity-analysis_1_chunk">
              <AnswerFirst question="Why use it?" answer="A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little." />
            </div>
            <div data-question-id="exp_/lease-sensitivity-analysis_2" data-answer-chunk-id="exp_/lease-sensitivity-analysis_2_chunk">
              <AnswerFirst question="How does the rate change a rank?" answer="A one or two point rate move should be able to swap the winner when credits sit early and rent sits late." />
            </div>
            <div data-question-id="exp_/lease-sensitivity-analysis_3" data-answer-chunk-id="exp_/lease-sensitivity-analysis_3_chunk">
              <AnswerFirst question="How do you show this to a CFO?" answer="A finance packet should place the base lease case, one worse case, and the flip input on the same page." />
            </div>
            <p>Read <a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/">Why use sensitivity analysis on a commercial lease?</a> when you need the next deep answer.</p>
            <p>Read <a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/">How does discount-rate sensitivity change a lease ranking?</a> when you need the next deep answer.</p>
            <p>Read <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/">How should you present lease scenarios to a CFO?</a> when you need the next deep answer.</p>
            <p className="pv-spoke-index" data-expansion-spokes="true"><a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis">Why use sensitivity analysis on a commercial lease?</a> · <a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking">How does discount-rate sensitivity change a lease ranking?</a> · <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo">How should you present lease scenarios to a CFO?</a></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Sensitivity analysis is a set of what-if tests on the same leases.</p>
            <p>You change one assumption at a time when you can.</p>
            <p>NPV means net present value. The discount rate is a common test.</p>
            <p>CAM growth and start dates are other common tests.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Lease sensitivity analysis asks what happens if one key number changes. If the winner flips, the deal was close. If it holds, the rank is more sturdy.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>A single ranking can look more sure than the inputs.</p>
            <p>Clients remember the winner. They should also hear the flip risk.</p>
            <p>A broker who hides a flip will redo the deck later under stress.</p>
            <p>Finance teams expect a range on a close call.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>A single ranking can look more sure than the inputs.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Freeze the cash rules. Move one knob. Record the rank.</li><li>Typical knobs: rate, CAM, commencement, and credit timing.</li><li>Show a small grid. Do not bury it.</li><li>If every test keeps the same winner, say that in one sentence.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Same leases, one changed input, new NPV pair, same story format.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Base case</th><td>The main ranking</td></tr><tr><th scope="row">Test knobs</th><td>Rate, extras, timing</td></tr><tr><th scope="row">Flip note</th><td>Whether the winner changed</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$40,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$37,200</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$371,535</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the base-case lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$40,000</td><td>$37,200</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,200</td><td>$9,844</td></tr><tr><th scope="row">Year-1 credit</th><td>$9,000</td><td>$4,950</td></tr><tr><th scope="row">Sample NPV</th><td>$371,535</td><td>$358,419</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the base-case lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$40,000</td><td>$9,200</td><td>$9,000</td><td>$40,200</td><td>$37,222</td></tr><tr><th scope="row">Year 2</th><td>$41,600</td><td>$9,476</td><td>$0</td><td>$51,076</td><td>$43,789</td></tr><tr><th scope="row">Year 3</th><td>$43,264</td><td>$9,760</td><td>$0</td><td>$53,024</td><td>$42,092</td></tr><tr><th scope="row">Year 4</th><td>$44,995</td><td>$10,053</td><td>$0</td><td>$55,048</td><td>$40,462</td></tr><tr><th scope="row">Year 5</th><td>$46,794</td><td>$10,355</td><td>$0</td><td>$57,149</td><td>$38,895</td></tr><tr><th scope="row">Year 6</th><td>$48,198</td><td>$10,666</td><td>$0</td><td>$58,864</td><td>$37,094</td></tr><tr><th scope="row">Year 7</th><td>$49,644</td><td>$10,986</td><td>$0</td><td>$60,630</td><td>$35,377</td></tr><tr><th scope="row">Year 8</th><td>$51,133</td><td>$11,316</td><td>$0</td><td>$62,449</td><td>$33,739</td></tr><tr><th scope="row">Year 9</th><td>$52,667</td><td>$11,655</td><td>$0</td><td>$64,322</td><td>$32,177</td></tr><tr><th scope="row">Year 10</th><td>$54,247</td><td>$12,005</td><td>$0</td><td>$66,252</td><td>$30,687</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$371,535</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the base-case lease is about $371,535. A second path lands near $358,419. That gap is a talking point, not a promise.</p>
                <p>The base case starts here. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the base-case lease</h3>
              <ul><li>Year 1 of the base-case lease has rent of $40,000.</li><li>Shared building cost is $9,200.</li><li>A credit of $9,000 lowers the cash you pay that year.</li><li>Cash out this year is about $40,200. The base case starts here.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $37,222 today.</li></ul>
              <ul><li>Next, year 2 rent is $41,600.</li><li>CAM, which is a shared building cost, is $9,476.</li><li>There is no credit in this year.</li><li>You pay about $51,076 this year after extras and credits. A higher rate would shrink these later years more.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,789 today.</li></ul>
              <ul><li>Then year 3 rent is $43,264.</li><li>Extras for the building come to $9,760.</li><li>Credits skip this year.</li><li>The net cash this year is about $53,024. A CAM surprise would lift this row.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $42,092 today.</li></ul>
              <ul><li>After that, year 4 rent is $44,995.</li><li>The shared building cost this time is $10,053.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $55,048. A late commencement would slide the whole path.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,462 today.</li></ul>
              <ul><li>In year 5 of the base-case lease, rent is $46,794.</li><li>Shared building cost is $10,355.</li><li>There is no credit in this year.</li><li>You pay about $57,149 this year after extras and credits. The last year is a common flip zone.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $38,895 today.</li></ul>
              <ul><li>Year 6 of the base-case lease has rent of $48,198.</li><li>CAM, which is a shared building cost, is $10,666.</li><li>Credits skip this year.</li><li>The net cash this year is about $58,864. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $37,094 today.</li></ul>
              <ul><li>Next, year 7 rent is $49,644.</li><li>Extras for the building come to $10,986.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $60,630. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,377 today.</li></ul>
              <ul><li>Then year 8 rent is $51,133.</li><li>The shared building cost this time is $11,316.</li><li>There is no credit in this year.</li><li>You pay about $62,449 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $33,739 today.</li></ul>
              <ul><li>After that, year 9 rent is $52,667.</li><li>Shared building cost is $11,655.</li><li>Credits skip this year.</li><li>The net cash this year is about $64,322. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,177 today.</li></ul>
              <ul><li>In year 10 of the base-case lease, rent is $54,247.</li><li>CAM, which is a shared building cost, is $12,005.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $66,252. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,687 today.</li></ul><p>Add those year values. The sample NPV for the base-case lease is about $371,535. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the base-case lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/commercial-lease-npv/what-discount-rate-should-you-use/">Read about discount rates</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Tests should change one thing when they can.</li><li>This hub does not claim a live sensitivity engine is generally available.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If two knobs move at once, say you ran a scenario, not a clean test.</p>
            <p>A renewal case is a scenario.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Testing only the knobs that keep your favorite on top.</li><li>Showing six decimals on a flip that is smaller than a missing CAM line.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If it flips, slow the meeting down.</p>
            <p>If it holds, you can speak with more calm.</p>
            <h2>Compare this to related metrics</h2>
            <p>A single NPV is a point. Sensitivity is the neighborhood.</p>
            <p>Effective rent rarely shows this neighborhood.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This is not a Monte Carlo claim.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>If the cash list is empty, do not decorate it with a grid.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid pv-discovery-grid--balanced">
              <div data-discovery-group="START_HERE"><h3>Start here</h3><ul className="pv-question-row"><li><a href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/">What does lease sensitivity analysis show?</a></li><li><a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/">Why use sensitivity analysis on a commercial lease?</a></li><li><a href="/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/">What is the difference between sensitivity analysis and scenario analysis?</a></li></ul></div><div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3><ul className="pv-question-row"><li><a href="/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/">How does rent-escalation sensitivity change a lease ranking?</a></li><li><a href="/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/">How does CAM sensitivity change a lease ranking?</a></li></ul></div><div data-discovery-group="COMPARE_OPTIONS"><h3>Compare options</h3><ul className="pv-question-row"><li><a href="/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/">How does occupancy-cost sensitivity change a location choice?</a></li></ul></div><div data-discovery-group="GO_DEEPER"><h3>Go deeper</h3><ul className="pv-question-row"><li><a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/">How does discount-rate sensitivity change a lease ranking?</a></li><li><a href="/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/">What decision risks does lease sensitivity reveal?</a></li><li><a href="/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/">Which lease assumptions flip a ranking first?</a></li></ul></div>
            </div>
            <div className="pv-discovery-band" data-hub-role-band="true"><div data-hub-role-band="true" data-discovery-group="FOR_YOUR_ROLE"><h3>For your role</h3><ul className="pv-question-row"><li><a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/">How should you present lease scenarios to a CFO?</a></li></ul></div></div>
          </div>
        </section><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show">What does lease sensitivity analysis show?</a></p>
            
          </div>
        </section>
        <div className="vg-container pv-hoisted-light-modules">
        <section className="pv-source-board pv-wide-module" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
              
        
        <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/d/discountrate.asp","label":"Investopedia — discount rate"},{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.fasb.org/","label":"FASB"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/","label":"What sensitivity shows","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/what-discount-rate-should-you-use/","label":"Discount rate","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/","label":"Lease comparison","description":"A nearby page that helps finish this comparison."},{"href":"/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show","label":"What does lease sensitivity analysis show?","description":"A question page in this same topic. Read it when you need the next definition."}]} />
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
          <nav className="sn-block" data-semantic-navigation="RELATED_QUESTIONS" aria-label="Questions in this topic">
            <div className="sn-block-head">
              <span className="sn-kicker">RELATED QUESTIONS</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-4">
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/" data-relationship="related" aria-label="What does lease sensitivity analysis show. Sensitivity analysis asks what happens if a key number changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What does lease sensitivity analysis show</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/" data-relationship="related" aria-label="Why use sensitivity analysis on a commercial lease. A ranking can flip when one assumption moves.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Why use sensitivity analysis on a commercial lease</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/" data-relationship="related" aria-label="How does discount-rate sensitivity change a lease ranking. A one or two point rate change can swap the winner when credits sit early and rent sits late.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How does discount-rate sensitivity change a lease ranking</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Turn the topic into a repeatable path.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Workflow</span><strong>See the workflow</strong><span className="sn-desc">Follow the steps before you pick a number.</span></span>
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
