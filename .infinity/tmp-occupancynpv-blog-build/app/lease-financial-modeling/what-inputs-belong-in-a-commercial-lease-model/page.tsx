import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What inputs belong in a commercial lease model?",
  description: "Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula.",
  alternates: { canonical: "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What inputs belong in a commercial lease model?", description: "Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-financial-modeling">
        <JsonLdBlock data={SITE_SCHEMA["/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-financial-modeling","label":"Lease financial modeling"},{"href":"/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model","label":"What inputs belong in a commercial lease model?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease financial modeling</p>
            <h1 className="pv-display">What inputs belong in a commercial lease model?</h1>
            <div data-question-id="q_295f6475d0dc43fd" data-answer-chunk-id="q_295f6475d0dc43fd_chunk">
              <AnswerFirst question="What inputs belong in a commercial lease model?" answer="Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/">See how to build the cash list</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_6de0b625bd00cede" data-answer-chunk-id="q_6de0b625bd00cede_0" data-supporting-section="define">
              <AnswerFirst question="What is the first input?" answer="Start date, end date, and size." />
            </div>
            <div data-question-id="q_dc683b60575cb887" data-answer-chunk-id="q_dc683b60575cb887_1" data-supporting-section="define">
              <AnswerFirst question="Where does CAM sit?" answer="On the input sheet, not inside a hidden formula." />
            </div>
            <div data-question-id="q_8765301686a2c479" data-answer-chunk-id="q_8765301686a2c479_2" data-supporting-section="define">
              <AnswerFirst question="Where does the rate sit?" answer="In one cell that every year reads." />
            </div>
            <div data-question-id="q_41e29ccce854c0be" data-answer-chunk-id="q_41e29ccce854c0be_3" data-supporting-section="define">
              <AnswerFirst question="What is the usual miss?" answer="A free-rent month or a wrong expiry." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A model is only as honest as its inputs.</p>
            <p>Most failures start in the abstract, not in Excel.</p>
            <p>If an input can change cash, it belongs on the input sheet.</p>
            <p>This page sits under <a href="/lease-financial-modeling/">Lease financial modeling</a>.</p>
            <p>Treat <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">CAM</a> as an input, not a vibe.</p>
            <p>Time <a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">credits</a> on the input sheet.</p>
            <p>The <a href="/commercial-lease-npv/what-discount-rate-should-you-use/">rate</a> is an input you show, not a buried constant.</p>
            <p>Most <a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">mistakes</a> start here.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Public modeling notes say many errors are bad inputs, not bad math.</p>
            <p>A wrong end date hides rollover.</p>
            <p>A missing free-rent month inflates the stream.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Public modeling notes say many errors are bad inputs, not bad math.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Put identity and dates first.</li><li>Put rent steps and extras next.</li><li>Put credits in the months they happen.</li><li>Put the rate in one cell.</li><li>Keep calculations off the input sheet.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Honest model = dated inputs + extras + credits + one rate + checks.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Start and end</th><td>The calendar</td></tr><tr><th scope="row">Rent steps</th><td>When the sticker changes</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, insurance</td></tr><tr><th scope="row">Credits</th><td>Free rent and TI</td></tr><tr><th scope="row">Rate</th><td>Price of waiting</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$39,500</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$36,735</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$358,846</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Input-sheet sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$39,500</td><td>$36,735</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,500</td><td>$10,165</td></tr><tr><th scope="row">Year-1 credit</th><td>$12,000</td><td>$6,600</td></tr><tr><th scope="row">Sample NPV</th><td>$358,846</td><td>$347,992</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Input-sheet sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$39,500</td><td>$9,500</td><td>$12,000</td><td>$37,000</td><td>$34,259</td></tr><tr><th scope="row">Year 2</th><td>$40,685</td><td>$9,785</td><td>$0</td><td>$50,470</td><td>$43,270</td></tr><tr><th scope="row">Year 3</th><td>$41,906</td><td>$10,079</td><td>$0</td><td>$51,985</td><td>$41,267</td></tr><tr><th scope="row">Year 4</th><td>$43,163</td><td>$10,381</td><td>$0</td><td>$53,544</td><td>$39,356</td></tr><tr><th scope="row">Year 5</th><td>$44,458</td><td>$10,692</td><td>$0</td><td>$55,150</td><td>$37,534</td></tr><tr><th scope="row">Year 6</th><td>$45,792</td><td>$11,013</td><td>$0</td><td>$56,805</td><td>$35,797</td></tr><tr><th scope="row">Year 7</th><td>$47,166</td><td>$11,343</td><td>$0</td><td>$58,509</td><td>$34,139</td></tr><tr><th scope="row">Year 8</th><td>$48,581</td><td>$11,683</td><td>$0</td><td>$60,264</td><td>$32,559</td></tr><tr><th scope="row">Year 9</th><td>$50,038</td><td>$12,033</td><td>$0</td><td>$62,071</td><td>$31,051</td></tr><tr><th scope="row">Year 10</th><td>$51,539</td><td>$12,394</td><td>$0</td><td>$63,933</td><td>$29,613</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$358,846</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Input-sheet sample is about $358,846. A second path lands near $347,992. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Input-sheet sample</h3>
              <ul><li>Year 1 of Input-sheet sample has rent of $39,500.</li><li>Shared building cost is $9,500.</li><li>A credit of $12,000 lowers the cash you pay that year.</li><li>Cash out this year is about $37,000. The date of this credit is the input that matters.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $34,259 today.</li></ul>
              <ul><li>Next, year 2 rent is $40,685.</li><li>CAM, which is a shared building cost, is $9,785.</li><li>There is no credit in this year.</li><li>You pay about $50,470 this year after extras and credits. Year two has no credit and a clean extra stack.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,270 today.</li></ul>
              <ul><li>Then year 3 rent is $41,906.</li><li>Extras for the building come to $10,079.</li><li>Credits skip this year.</li><li>The net cash this year is about $51,985. The bump is an input, not a hardcoded later cell.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $41,267 today.</li></ul>
              <ul><li>After that, year 4 rent is $43,163.</li><li>The shared building cost this time is $10,381.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $53,544. Later years should change when the bump cell changes.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $39,356 today.</li></ul>
              <ul><li>In year 5 of Input-sheet sample, rent is $44,458.</li><li>Shared building cost is $10,692.</li><li>There is no credit in this year.</li><li>You pay about $55,150 this year after extras and credits. The last year proves the end date you typed.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $37,534 today.</li></ul>
              <ul><li>Year 6 of Input-sheet sample has rent of $45,792.</li><li>CAM, which is a shared building cost, is $11,013.</li><li>Credits skip this year.</li><li>The net cash this year is about $56,805. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $35,797 today.</li></ul>
              <ul><li>Next, year 7 rent is $47,166.</li><li>Extras for the building come to $11,343.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $58,509. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $34,139 today.</li></ul>
              <ul><li>Then year 8 rent is $48,581.</li><li>The shared building cost this time is $11,683.</li><li>There is no credit in this year.</li><li>You pay about $60,264 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $32,559 today.</li></ul>
              <ul><li>After that, year 9 rent is $50,038.</li><li>Shared building cost is $12,033.</li><li>Credits skip this year.</li><li>The net cash this year is about $62,071. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $31,051 today.</li></ul>
              <ul><li>In year 10 of Input-sheet sample, rent is $51,539.</li><li>CAM, which is a shared building cost, is $12,394.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $63,933. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $29,613 today.</li></ul><p>Add those year values. The sample NPV for Input-sheet sample is about $358,846. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Input-sheet sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">Read common mistakes</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Every later year in a live file should be a formula, not a paste.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Renewal probability is an input if you model a hold past expiry.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Hardcoding a year. Leaving free rent off. Using last year's CAM as a law.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If an input is a guess, mark it and test it.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/">how to build the cash-flow model</a> after the inputs exist.</p>
            <p>See <a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">common mistakes</a> for the autopsy.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A complete input sheet still needs a human abstract.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not start fancy cases before dates are right.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="See How the Workflow Works" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model">How do you build a lease cash-flow model?</a></p>
            
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
            <RelatedContent items={[{"href":"/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/","label":"Build the cash-flow model","description":"The next construction step."}]} /></div>
            <div className="pv-related-family"><h3>Learn this first</h3>
            <RelatedContent items={[{"href":"/lease-financial-modeling/","label":"Lease financial modeling","description":"Hub and path."}]} /></div>
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
            <div className="sn-grid sn-grid--count-4">
            <a className="sn-card" data-card-role="TOPIC" href="/lease-financial-modeling/" data-relationship="parent-hub" aria-label="Lease financial modeling. See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease financial modeling</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/" data-relationship="related" aria-label="What are common lease-analysis mistakes. Most bad comparisons hide a missing cost or a hidden assumption.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What are common lease-analysis mistakes</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/" data-relationship="related" aria-label="How do you build a lease cash-flow model. List cash in and out by period.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you build a lease cash-flow model</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
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
