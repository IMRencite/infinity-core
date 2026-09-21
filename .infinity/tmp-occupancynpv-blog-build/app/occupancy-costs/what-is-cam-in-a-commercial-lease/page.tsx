import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What is CAM in a commercial lease?",
  description: "CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later.",
  alternates: { canonical: "/occupancy-costs/what-is-cam-in-a-commercial-lease/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What is CAM in a commercial lease?", description: "CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/occupancy-costs/what-is-cam-in-a-commercial-lease" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="occupancy-costs">
        <JsonLdBlock data={SITE_SCHEMA["/occupancy-costs/what-is-cam-in-a-commercial-lease"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/occupancy-costs","label":"Occupancy costs"},{"href":"/occupancy-costs/what-is-cam-in-a-commercial-lease","label":"What is CAM in a commercial lease?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">occupancy costs</p>
            <h1 className="pv-display">What is CAM in a commercial lease?</h1>
            <div data-question-id="q_b2d8a208fd507651" data-answer-chunk-id="q_b2d8a208fd507651_chunk">
              <AnswerFirst question="What is CAM in a commercial lease?" answer="CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/occupancy-costs/">Read the occupancy-cost hub</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_813fc3d1568c8200" data-answer-chunk-id="q_813fc3d1568c8200_0" data-supporting-section="define">
              <AnswerFirst question="What does CAM stand for?" answer="Common area maintenance. It is shared building cost." />
            </div>
            <div data-question-id="q_c6c4247ada83662b" data-answer-chunk-id="q_c6c4247ada83662b_1" data-supporting-section="define">
              <AnswerFirst question="Is CAM rent?" answer="No. It is an extra, often estimated and later trued up." />
            </div>
            <div data-question-id="q_b06d7a54101aa6f5" data-answer-chunk-id="q_b06d7a54101aa6f5_2" data-supporting-section="define">
              <AnswerFirst question="Can CAM be capped?" answer="Sometimes, and usually only the part the landlord can control." />
            </div>
            <div data-question-id="q_6afd2094cbdf613c" data-answer-chunk-id="q_6afd2094cbdf613c_3" data-supporting-section="define">
              <AnswerFirst question="Should CAM sit in NPV?" answer="Yes, when the tenant pays it." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>CAM is not rent. It is a pass-through for shared space.</p>
            <p>Halls, lots, shared plant, and some management costs often sit here.</p>
            <p>The landlord estimates it, then reconciles it.</p>
            <p>A cap may limit some of it. Tax and insurance often sit outside that cap.</p>
            <p>This page sits under <a href="/occupancy-costs/">Occupancy costs</a>.</p>
            <p>CAM is one piece of <a href="/occupancy-costs/what-is-total-occupancy-cost/">total occupancy cost</a>.</p>
            <p>A <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">net lease</a> makes CAM visible. A gross lease hides it in rent.</p>
            <p>Uncapped CAM is a <a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/">sensitivity</a> topic.</p>
            <p>Put the CAM estimate in <a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">model inputs</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>CAM can be a large share of the bill.</p>
            <p>A 15 percent overbill compounds for years.</p>
            <p>Clients feel the true-up as a surprise.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>CAM can be a large share of the bill.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Ask for the extra list, not a single CAM number.</li><li>Ask what is excluded.</li><li>Ask whether a controllable cap exists.</li><li>Place the estimate and the true-up on the timeline.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. CAM share = building CAM pool × tenant percent. Then true up to actuals.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">CAM estimate</th><td>Monthly extra</td></tr><tr><th scope="row">Tenant share</th><td>Percent of the building</td></tr><tr><th scope="row">Exclusions</th><td>What the tenant should not pay</td></tr><tr><th scope="row">Cap</th><td>Limit on controllable extras</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$26,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$24,180</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$298,301</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — CAM sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$26,000</td><td>$24,180</td></tr><tr><th scope="row">Year-1 extras</th><td>$14,000</td><td>$14,980</td></tr><tr><th scope="row">Year-1 credit</th><td>$4,000</td><td>$2,200</td></tr><tr><th scope="row">Sample NPV</th><td>$298,301</td><td>$293,626</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — CAM sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$26,000</td><td>$14,000</td><td>$4,000</td><td>$36,000</td><td>$33,333</td></tr><tr><th scope="row">Year 2</th><td>$26,780</td><td>$14,420</td><td>$0</td><td>$41,200</td><td>$35,322</td></tr><tr><th scope="row">Year 3</th><td>$27,583</td><td>$14,853</td><td>$0</td><td>$42,436</td><td>$33,687</td></tr><tr><th scope="row">Year 4</th><td>$28,411</td><td>$15,298</td><td>$0</td><td>$43,709</td><td>$32,127</td></tr><tr><th scope="row">Year 5</th><td>$29,263</td><td>$15,757</td><td>$0</td><td>$45,020</td><td>$30,640</td></tr><tr><th scope="row">Year 6</th><td>$30,141</td><td>$16,230</td><td>$0</td><td>$46,371</td><td>$29,222</td></tr><tr><th scope="row">Year 7</th><td>$31,045</td><td>$16,717</td><td>$0</td><td>$47,762</td><td>$27,869</td></tr><tr><th scope="row">Year 8</th><td>$31,976</td><td>$17,219</td><td>$0</td><td>$49,195</td><td>$26,579</td></tr><tr><th scope="row">Year 9</th><td>$32,935</td><td>$17,736</td><td>$0</td><td>$50,671</td><td>$25,348</td></tr><tr><th scope="row">Year 10</th><td>$33,923</td><td>$18,268</td><td>$0</td><td>$52,191</td><td>$24,175</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$298,301</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for CAM sample is about $298,301. A second path lands near $293,626. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for CAM sample</h3>
              <ul><li>Year 1 of CAM sample has rent of $26,000.</li><li>Shared building cost is $14,000.</li><li>A credit of $4,000 lowers the cash you pay that year.</li><li>Cash out this year is about $36,000. CAM is the large extra in year one.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $33,333 today.</li></ul>
              <ul><li>Next, year 2 rent is $26,780.</li><li>CAM, which is a shared building cost, is $14,420.</li><li>There is no credit in this year.</li><li>You pay about $41,200 this year after extras and credits. The estimate steps with the building.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $35,322 today.</li></ul>
              <ul><li>Then year 3 rent is $27,583.</li><li>Extras for the building come to $14,853.</li><li>Credits skip this year.</li><li>The net cash this year is about $42,436. A true-up would land as a short extra credit or bill.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $33,687 today.</li></ul>
              <ul><li>After that, year 4 rent is $28,411.</li><li>The shared building cost this time is $15,298.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $43,709. Later years still carry the pool.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $32,127 today.</li></ul>
              <ul><li>In year 5 of CAM sample, rent is $29,263.</li><li>Shared building cost is $15,757.</li><li>There is no credit in this year.</li><li>You pay about $45,020 this year after extras and credits. The last year still needs a CAM line.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $30,640 today.</li></ul>
              <ul><li>Year 6 of CAM sample has rent of $30,141.</li><li>CAM, which is a shared building cost, is $16,230.</li><li>Credits skip this year.</li><li>The net cash this year is about $46,371. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $29,222 today.</li></ul>
              <ul><li>Next, year 7 rent is $31,045.</li><li>Extras for the building come to $16,717.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $47,762. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $27,869 today.</li></ul>
              <ul><li>Then year 8 rent is $31,976.</li><li>The shared building cost this time is $17,219.</li><li>There is no credit in this year.</li><li>You pay about $49,195 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $26,579 today.</li></ul>
              <ul><li>After that, year 9 rent is $32,935.</li><li>Shared building cost is $17,736.</li><li>Credits skip this year.</li><li>The net cash this year is about $50,671. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $25,348 today.</li></ul>
              <ul><li>In year 10 of CAM sample, rent is $33,923.</li><li>CAM, which is a shared building cost, is $18,268.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $52,191. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $24,175 today.</li></ul><p>Add those year values. The sample NPV for CAM sample is about $298,301. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for CAM sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/occupancy-costs/what-is-total-occupancy-cost/">See total occupancy cost</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample treats CAM as tenant-paid on a net path.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Capital projects should not hide inside CAM without a clause.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Using one CAM number for two buildings.</li><li>Ignoring the reconciliation.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If CAM history is missing, treat the extra as a range.</p>
            <h2>Compare this to related metrics</h2>
            <p>Read <a href="/occupancy-costs/hidden-occupancy-costs/">hidden occupancy costs</a> for tax, insurance, and move-in spend.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>CAM language varies by market and form.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not invent a CAM cap the lease does not grant.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Compare occupancy stacks" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">Compare occupancy stacks</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/occupancy-costs/what-is-total-occupancy-cost">What is total occupancy cost in a commercial lease?</a> · <a href="/occupancy-costs/hidden-occupancy-costs">What hidden occupancy costs do tenants miss?</a> · <a href="/occupancy-costs/occupancy-cost-per-square-foot">What is occupancy cost per square foot?</a></p>
            
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
            <RelatedContent items={[{"href":"/occupancy-costs/hidden-occupancy-costs/","label":"Hidden occupancy costs","description":"The extras beside CAM."}]} /></div>
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/occupancy-costs/occupancy-cost-per-square-foot/","label":"Cost per foot","description":"The unit version of the stack."}]} /></div>
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
            <a className="sn-card" data-card-role="TOPIC" href="/occupancy-costs/" data-relationship="parent-hub" aria-label="Occupancy costs. Face rent is not the full bill.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Occupancy costs</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-total-occupancy-cost/" data-relationship="related" aria-label="What is total occupancy cost in a commercial lease. Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is total occupancy cost in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/hidden-occupancy-costs/" data-relationship="related" aria-label="What hidden occupancy costs do tenants miss. Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What hidden occupancy costs do tenants miss</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/occupancy-cost-per-square-foot/" data-relationship="related" aria-label="What is occupancy cost per square foot. Divide the full yearly stack by the feet you pay for.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is occupancy cost per square foot</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
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
