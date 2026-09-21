import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What discount rate should you use?",
  description: "The discount rate is the price of waiting. Learn how to pick a rate, show it, and test nearby rates without hiding the assumption.",
  alternates: { canonical: "/commercial-lease-npv/what-discount-rate-should-you-use/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What discount rate should you use?", description: "The discount rate is the price of waiting. Learn how to pick a rate, show it, and test nearby rates without hiding the assumption." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/commercial-lease-npv/what-discount-rate-should-you-use" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="commercial-lease-npv">
        <JsonLdBlock data={SITE_SCHEMA["/commercial-lease-npv/what-discount-rate-should-you-use"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/commercial-lease-npv","label":"Commercial lease NPV"},{"href":"/commercial-lease-npv/what-discount-rate-should-you-use","label":"What discount rate should you use?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">commercial lease npv</p>
            <h1 className="pv-display">What discount rate should you use?</h1>
            <div data-question-id="q_900ab08a5c311a76" data-answer-chunk-id="q_900ab08a5c311a76_chunk">
              <AnswerFirst question="What discount rate should you use?" answer="The discount rate is the price of waiting. Pick one rate the client can defend, write it down, and test nearby rates. Do not hide a rate that was chosen only to crown a winner." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/lease-sensitivity-analysis/">See sensitivity analysis</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_0" data-answer-chunk-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_0_chunk">
              <AnswerFirst question="What is a discount rate?" answer="A discount rate is the price of waiting. It shrinks later lease cash so a tenant can compare timing." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_1" data-answer-chunk-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_1_chunk">
              <AnswerFirst question="Should each landlord get a different rate?" answer="A tenant should use one rate on every lease option, then test nearby rates instead of changing the rule." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_2" data-answer-chunk-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_2_chunk">
              <AnswerFirst question="Can the rate flip a rank?" answer="A one or two point rate move can swap a lease winner when credits sit early and rent sits late. A tenant should keep this lease answer visible on the same page." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_3" data-answer-chunk-id="exp_/commercial-lease-npv/what-discount-rate-should-you-use_3_chunk">
              <AnswerFirst question="Where do you show it?" answer="The rate should sit on the same page as the lease total. A hidden cell does not help a client." />
            </div>
            <p>This question sits on the <a href="/commercial-lease-npv/">commercial-lease-npv</a> hub.</p>
            <p>See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.</p>
            <p>The <a href="/how-it-works">how it works</a> page shows the four-step path.</p>
            <p>Go deeper on <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">How is lease NPV calculated?</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A discount rate is a percent you use to shrink later cash.</p>
            <p>NPV means net present value. The rate is the knob on that shrink.</p>
            <p>A higher rate makes later rent look smaller today. A lower rate keeps later rent heavy.</p>
            <p>The rate is not magic. It is an assumption you must show.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>The discount rate is the price of waiting. Pick one rate the client can defend, write it down, and test nearby rates. Do not hide a rate that was chosen only to crown a winner.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Two honest teams can pick different rates and get different winners.</p>
            <p>If you do not show the rate, the ranking looks more sure than it is.</p>
            <p>A CFO will ask where the rate came from. A brochure cannot answer that.</p>
            <p>Sensitivity exists because this one number can flip a close race.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Two honest teams can pick different rates and get different winners.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Ask what else the firm could do with the cash. That is one way people pick a rate.</li><li>Some teams use a cost of capital. Some use a simple hurdle they already use for projects.</li><li>Do not invent a precise rate from thin air and then treat it as fact.</li><li>Run the same leases at two or three nearby rates and show if the rank holds.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Later cash today = later cash / (1 + discount rate) to the power of the year.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Candidate rate</th><td>The main rate you will show</td></tr><tr><th scope="row">Low test</th><td>A nearby lower rate</td></tr><tr><th scope="row">High test</th><td>A nearby higher rate</td></tr><tr><th scope="row">Lease cash</th><td>The same occupancy cash in every test</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$38,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$35,340</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$371,164</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the rate-test lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$38,000</td><td>$35,340</td></tr><tr><th scope="row">Year-1 extras</th><td>$10,000</td><td>$10,700</td></tr><tr><th scope="row">Year-1 credit</th><td>$8,000</td><td>$4,400</td></tr><tr><th scope="row">Sample NPV</th><td>$371,164</td><td>$358,569</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the rate-test lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$38,000</td><td>$10,000</td><td>$8,000</td><td>$40,000</td><td>$37,037</td></tr><tr><th scope="row">Year 2</th><td>$39,900</td><td>$10,300</td><td>$0</td><td>$50,200</td><td>$43,038</td></tr><tr><th scope="row">Year 3</th><td>$41,895</td><td>$10,609</td><td>$0</td><td>$52,504</td><td>$41,679</td></tr><tr><th scope="row">Year 4</th><td>$43,990</td><td>$10,927</td><td>$0</td><td>$54,917</td><td>$40,366</td></tr><tr><th scope="row">Year 5</th><td>$46,189</td><td>$11,255</td><td>$0</td><td>$57,444</td><td>$39,095</td></tr><tr><th scope="row">Year 6</th><td>$47,575</td><td>$11,593</td><td>$0</td><td>$59,168</td><td>$37,286</td></tr><tr><th scope="row">Year 7</th><td>$49,002</td><td>$11,941</td><td>$0</td><td>$60,943</td><td>$35,560</td></tr><tr><th scope="row">Year 8</th><td>$50,472</td><td>$12,299</td><td>$0</td><td>$62,771</td><td>$33,913</td></tr><tr><th scope="row">Year 9</th><td>$51,986</td><td>$12,668</td><td>$0</td><td>$64,654</td><td>$32,343</td></tr><tr><th scope="row">Year 10</th><td>$53,546</td><td>$13,048</td><td>$0</td><td>$66,594</td><td>$30,846</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$371,164</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the rate-test lease is about $371,164. A second path lands near $358,569. That gap is a talking point, not a promise.</p>
                <p>A small credit lands early. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the rate-test lease</h3>
              <ul><li>Year 1 of the rate-test lease has rent of $38,000.</li><li>Shared building cost is $10,000.</li><li>A credit of $8,000 lowers the cash you pay that year.</li><li>Cash out this year is about $40,000. A small credit lands early.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $37,037 today.</li></ul>
              <ul><li>Next, year 2 rent is $39,900.</li><li>CAM, which is a shared building cost, is $10,300.</li><li>There is no credit in this year.</li><li>You pay about $50,200 this year after extras and credits. The step-up is the point of this sample.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,038 today.</li></ul>
              <ul><li>Then year 3 rent is $41,895.</li><li>Extras for the building come to $10,609.</li><li>Credits skip this year.</li><li>The net cash this year is about $52,504. Later years get heavier if the rate is low.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $41,679 today.</li></ul>
              <ul><li>After that, year 4 rent is $43,990.</li><li>The shared building cost this time is $10,927.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $54,917. A high rate shrinks these years hard.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,366 today.</li></ul>
              <ul><li>In year 5 of the rate-test lease, rent is $46,189.</li><li>Shared building cost is $11,255.</li><li>There is no credit in this year.</li><li>You pay about $57,444 this year after extras and credits. The last year is where rate fights show up.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $39,095 today.</li></ul>
              <ul><li>Year 6 of the rate-test lease has rent of $47,575.</li><li>CAM, which is a shared building cost, is $11,593.</li><li>Credits skip this year.</li><li>The net cash this year is about $59,168. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $37,286 today.</li></ul>
              <ul><li>Next, year 7 rent is $49,002.</li><li>Extras for the building come to $11,941.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $60,943. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,560 today.</li></ul>
              <ul><li>Then year 8 rent is $50,472.</li><li>The shared building cost this time is $12,299.</li><li>There is no credit in this year.</li><li>You pay about $62,771 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $33,913 today.</li></ul>
              <ul><li>After that, year 9 rent is $51,986.</li><li>Shared building cost is $12,668.</li><li>Credits skip this year.</li><li>The net cash this year is about $64,654. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,343 today.</li></ul>
              <ul><li>In year 10 of the rate-test lease, rent is $53,546.</li><li>CAM, which is a shared building cost, is $13,048.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $66,594. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,846 today.</li></ul><p>Add those year values. The sample NPV for the rate-test lease is about $371,164. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the rate-test lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/compare-commercial-leases">See the comparison workflow</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>We show 8 percent as the main teaching rate.</li><li>A real firm may use another rate. Write theirs, not ours.</li><li>The cash list stays fixed while the rate moves.</li><li>No inflation plug is hiding in the rate.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If cash is monthly, say whether the rate is annual.</p>
            <p>Do not mix a real-estate cap rate into this occupancy tool without saying so.</p>
            <p>A tax-exempt group may use a different hurdle than a retailer.</p>
            <p>If the client has no rate, show a range instead of a fake exact number.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Picking a rate after you know which lease you like.</li><li>Using 0 percent and calling it conservative.</li><li>Using 20 percent to make later escalations disappear.</li><li>Changing only one option's rate.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the winner holds at nearby rates, say that. It builds trust.</p>
            <p>If the winner flips, say that too. That is the point of the test.</p>
            <p>Do not bury the rate in a footnote no one reads.</p>
            <h2>Compare this to related metrics</h2>
            <p>A cap rate is not this discount rate.</p>
            <p>An interest rate on a loan is related but not the same input.</p>
            <p>Inflation and discounting are easy to mix. Keep them labeled.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This page does not pick your firm's official rate.</li><li>It does not replace a finance policy.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not spend an hour debating the third decimal when the CAM line is blank.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </div>
            
            
          </div>
        </section>
        <div className="vg-container pv-hoisted-light-modules">
        <section className="pv-source-board pv-wide-module" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
              
        
        <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/d/discountrate.asp","label":"Investopedia — discount rate"},{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.fasb.org/","label":"FASB"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/commercial-lease-npv/","label":"Commercial lease NPV hub","description":"A nearby page that helps finish this comparison."},{"href":"/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/","label":"What sensitivity analysis shows","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease/","label":"What NPV means","description":"A nearby page that helps finish this comparison."}]} />
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
            <a className="sn-card" data-card-role="TOPIC" href="/commercial-lease-npv/" data-relationship="parent-hub" aria-label="Commercial lease NPV. Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how ">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/" data-relationship="related" aria-label="What is NPV in a commercial lease. NPV turns later lease costs into today's dollars so you can compare options fairly.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is NPV in a commercial lease</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/when-is-npv-the-wrong-metric/" data-relationship="related" aria-label="When is NPV the wrong metric. NPV is a consistency tool, not a complete decision.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>When is NPV the wrong metric</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/how-is-lease-npv-calculated/" data-relationship="related" aria-label="How is lease NPV calculated. Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year value">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How is lease NPV calculated</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
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
