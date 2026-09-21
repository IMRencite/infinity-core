import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How do free rent and TI allowances affect NPV?",
  description: "Free rent and TI money change when cash moves. Learn how to place both on the timeline so a lower face rent is not the whole story.",
  alternates: { canonical: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How do free rent and TI allowances affect NPV?", description: "Free rent and TI money change when cash moves. Learn how to place both on the timeline so a lower face rent is not the whole story." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-comparison">
        <JsonLdBlock data={SITE_SCHEMA["/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-comparison","label":"Lease comparison"},{"href":"/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv","label":"How do free rent and TI allowances affect NPV?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease comparison</p>
            <h1 className="pv-display">How do free rent and TI allowances affect NPV?</h1>
            <div data-question-id="q_abb1abf5f6fd37dd" data-answer-chunk-id="q_abb1abf5f6fd37dd_chunk">
              <AnswerFirst question="How do free rent and TI allowances affect NPV?" answer="Free rent and tenant improvement money change when cash moves. Each credit is placed in the year it happens. Then NPV can show whether a lower face rent is still cheaper." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">Compare Your Lease Options</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_0" data-answer-chunk-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_0_chunk">
              <AnswerFirst question="How does free rent change NPV?" answer="Free rent discounts later cash by cutting the lease bill in the months it actually happens, not in every year." />
            </div>
            <div data-question-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_1" data-answer-chunk-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_1_chunk">
              <AnswerFirst question="How does TI change NPV?" answer="A TI allowance should sit as a credit in the year it pays. It does not cut rent in every later year." />
            </div>
            <div data-question-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_2" data-answer-chunk-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_2_chunk">
              <AnswerFirst question="Can credits flip a rank?" answer="Early lease credits can flip a rank when the other path pays more later and the rate is high." />
            </div>
            <div data-question-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_3" data-answer-chunk-id="exp_/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv_3_chunk">
              <AnswerFirst question="What is the usual miss?" answer="A credit in the wrong year does not tell the truth. The lease walk should move it to the real month." />
            </div>
            <p>This question sits on the <a href="/lease-comparison/">lease-comparison</a> hub.</p>
            <p>See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.</p>
            <p>The <a href="/how-it-works">how it works</a> page shows the four-step path.</p>
            <p>Go deeper on <a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">How do you normalize commercial lease proposals?</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Free rent is a period when contract rent is zero or reduced.</p>
            <p>A tenant improvement allowance is build-out money from the landlord.</p>
            <p>NPV means net present value. Credits lower cash in the year they land, then we shrink later years.</p>
            <p>A credit in year one is worth more today than the same credit in year four.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Free rent and tenant improvement money change when cash moves. Each credit is placed in the year it happens. Then NPV can show whether a lower face rent is still cheaper.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Landlords often trade a pretty first year for a steeper later path.</p>
            <p>If you only hear 'two months free,' you miss the later step.</p>
            <p>TI money can make a higher rent win after the build-out.</p>
            <p>Clients feel a check. They do not always feel a later escalation.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Landlords often trade a pretty first year for a steeper later path.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Put free-rent months in the year you do not pay.</li><li>Put TI money in the year the cash actually moves.</li><li>Do not smear a year-one check across ten years unless you say you are averaging.</li><li>Keep the later rent path. The credit does not erase it.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Year cash = rent + extras − free-rent relief − TI cash in that year. Then discount.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Free-rent months</th><td>When rent is reduced</td></tr><tr><th scope="row">TI amount</th><td>Build-out money</td></tr><tr><th scope="row">TI timing</th><td>The year the money moves</td></tr><tr><th scope="row">Later rent</th><td>The path after the gift</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$43,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$39,990</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$373,716</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the incentive lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$43,000</td><td>$39,990</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,000</td><td>$8,560</td></tr><tr><th scope="row">Year-1 credit</th><td>$22,000</td><td>$12,100</td></tr><tr><th scope="row">Sample NPV</th><td>$373,716</td><td>$363,753</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the incentive lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$43,000</td><td>$8,000</td><td>$22,000</td><td>$29,000</td><td>$26,852</td></tr><tr><th scope="row">Year 2</th><td>$44,720</td><td>$8,240</td><td>$0</td><td>$52,960</td><td>$45,405</td></tr><tr><th scope="row">Year 3</th><td>$46,509</td><td>$8,487</td><td>$0</td><td>$54,996</td><td>$43,658</td></tr><tr><th scope="row">Year 4</th><td>$48,369</td><td>$8,742</td><td>$0</td><td>$57,111</td><td>$41,978</td></tr><tr><th scope="row">Year 5</th><td>$50,304</td><td>$9,004</td><td>$0</td><td>$59,308</td><td>$40,364</td></tr><tr><th scope="row">Year 6</th><td>$51,813</td><td>$9,274</td><td>$0</td><td>$61,087</td><td>$38,495</td></tr><tr><th scope="row">Year 7</th><td>$53,367</td><td>$9,552</td><td>$0</td><td>$62,919</td><td>$36,713</td></tr><tr><th scope="row">Year 8</th><td>$54,968</td><td>$9,839</td><td>$0</td><td>$64,807</td><td>$35,013</td></tr><tr><th scope="row">Year 9</th><td>$56,617</td><td>$10,134</td><td>$0</td><td>$66,751</td><td>$33,392</td></tr><tr><th scope="row">Year 10</th><td>$58,316</td><td>$10,438</td><td>$0</td><td>$68,754</td><td>$31,846</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$373,716</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the incentive lease is about $373,716. A second path lands near $363,753. That gap is a talking point, not a promise.</p>
                <p>The TI check and free rent both sit here. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the incentive lease</h3>
              <ul><li>Year 1 of the incentive lease has rent of $43,000.</li><li>Shared building cost is $8,000.</li><li>A credit of $22,000 lowers the cash you pay that year.</li><li>Cash out this year is about $29,000. The TI check and free rent both sit here.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $26,852 today.</li></ul>
              <ul><li>Next, year 2 rent is $44,720.</li><li>CAM, which is a shared building cost, is $8,240.</li><li>There is no credit in this year.</li><li>You pay about $52,960 this year after extras and credits. The gift is gone. The step starts.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $45,405 today.</li></ul>
              <ul><li>Then year 3 rent is $46,509.</li><li>Extras for the building come to $8,487.</li><li>Credits skip this year.</li><li>The net cash this year is about $54,996. This is the year a cheap first look fades.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $43,658 today.</li></ul>
              <ul><li>After that, year 4 rent is $48,369.</li><li>The shared building cost this time is $8,742.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,111. Later rent now carries the deal.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $41,978 today.</li></ul>
              <ul><li>In year 5 of the incentive lease, rent is $50,304.</li><li>Shared building cost is $9,004.</li><li>There is no credit in this year.</li><li>You pay about $59,308 this year after extras and credits. NPV still counts this year.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $40,364 today.</li></ul>
              <ul><li>Year 6 of the incentive lease has rent of $51,813.</li><li>CAM, which is a shared building cost, is $9,274.</li><li>Credits skip this year.</li><li>The net cash this year is about $61,087. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $38,495 today.</li></ul>
              <ul><li>Next, year 7 rent is $53,367.</li><li>Extras for the building come to $9,552.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $62,919. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $36,713 today.</li></ul>
              <ul><li>Then year 8 rent is $54,968.</li><li>The shared building cost this time is $9,839.</li><li>There is no credit in this year.</li><li>You pay about $64,807 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $35,013 today.</li></ul>
              <ul><li>After that, year 9 rent is $56,617.</li><li>Shared building cost is $10,134.</li><li>Credits skip this year.</li><li>The net cash this year is about $66,751. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $33,392 today.</li></ul>
              <ul><li>In year 10 of the incentive lease, rent is $58,316.</li><li>CAM, which is a shared building cost, is $10,438.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $68,754. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $31,846 today.</li></ul><p>Add those year values. The sample NPV for the incentive lease is about $373,716. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the incentive lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/occupancy-costs/">Read about occupancy costs</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>TI is treated as cash in during year one.</li><li>If your deal funds TI later, move the row.</li><li>Free rent is modeled as lower year-one rent in this sample.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A TI cap that never gets spent is not a credit.</p>
            <p>A free-rent month after a late delivery is not year one if you cannot occupy.</p>
            <p>A moving allowance is another credit. Name it.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Calling TI a reduction to every year's rent.</li><li>Ignoring free rent on the 'expensive' looking deal.</li><li>Double counting a credit in the summary and the cash flow.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the credit is large and early, say so. Then show the later path.</p>
            <p>If the credit is late, do not sell it like cash today.</p>
            <h2>Compare this to related metrics</h2>
            <p>Effective rent often blends incentives into one average.</p>
            <p>NPV keeps the year the gift happens.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This is not a construction budget.</li><li>It does not price contractor overruns.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>If there are no incentives, skip the theater and compare the paths.</li></ul>
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
              <AuthorityRefs items={[{"href":"https://www.boma.org/","label":"BOMA"},{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.naiop.org/","label":"NAIOP"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/lease-comparison/","label":"Lease comparison hub","description":"A nearby page that helps finish this comparison."},{"href":"/occupancy-costs/","label":"Occupancy costs","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease/","label":"What NPV is","description":"A nearby page that helps finish this comparison."}]} />
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
            <a className="sn-card" data-card-role="TOPIC" href="/lease-comparison/" data-relationship="parent-hub" aria-label="Lease comparison. Compare two or more commercial leases on the same timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease comparison</strong><span className="sn-desc">Compare two or more commercial leases on the same timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/" data-relationship="related" aria-label="How do you compare two commercial lease proposals. Put both leases on one timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you compare two commercial lease proposals</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-different-lease-terms/" data-relationship="related" aria-label="How do you compare leases with different term lengths. A five-year lease and a ten-year lease are not the same product.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you compare leases with different term lengths</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/" data-relationship="related" aria-label="How do you normalize commercial lease proposals. Put every offer on the same unit: all-in cost, same dates, same extras.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you normalize commercial lease proposals</strong><span className="sn-desc">Put every offer on the same unit: all-in cost, same dates, same extras.</span></span>
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
