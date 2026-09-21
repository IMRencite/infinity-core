import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What is total occupancy cost?",
  description: "Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.",
  alternates: { canonical: "/occupancy-costs/what-is-total-occupancy-cost/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What is total occupancy cost?", description: "Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/occupancy-costs/what-is-total-occupancy-cost" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="occupancy-costs">
        <JsonLdBlock data={SITE_SCHEMA["/occupancy-costs/what-is-total-occupancy-cost"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/occupancy-costs","label":"Occupancy costs"},{"href":"/occupancy-costs/what-is-total-occupancy-cost","label":"What is total occupancy cost in a commercial lease?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">occupancy costs</p>
            <h1 className="pv-display">What is total occupancy cost in a commercial lease?</h1>
            <div data-question-id="q_3b4dbdbaeb423ffd" data-answer-chunk-id="q_3b4dbdbaeb423ffd_chunk">
              <AnswerFirst question="What is total occupancy cost in a commercial lease?" answer="Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/occupancy-costs/hidden-occupancy-costs/">See hidden occupancy costs</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_daa1199c8437257b" data-answer-chunk-id="q_daa1199c8437257b_0" data-supporting-section="define">
              <AnswerFirst question="Is occupancy cost just rent?" answer="No. Rent is one line. The extras can rival it." />
            </div>
            <div data-question-id="q_16ef89157d8db992" data-answer-chunk-id="q_16ef89157d8db992_1" data-supporting-section="define">
              <AnswerFirst question="What is usually in the stack?" answer="Rent, CAM, tax, and insurance. Then any other tenant-paid extra you agreed to count." />
            </div>
            <div data-question-id="q_b1fa6a37d14ff1e7" data-answer-chunk-id="q_b1fa6a37d14ff1e7_2" data-supporting-section="define">
              <AnswerFirst question="Why do nets look cheaper?" answer="Because the sticker left extras off. They still arrive." />
            </div>
            <div data-question-id="q_00652d50176932ee" data-answer-chunk-id="q_00652d50176932ee_3" data-supporting-section="define">
              <AnswerFirst question="How do you budget it?" answer="Use separate lines, then one subtotal named occupancy cost." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Face rent is not the full bill.</p>
            <p>Total occupancy cost adds every recurring charge the lease makes you pay.</p>
            <p>CAM is a shared building cost. Tax and insurance often ride beside it.</p>
            <p>Some rooms also add utilities, parking, and build-out the tenant still funds.</p>
            <p>Say what you included. The phrase is not a law.</p>
            <p>This page sits under <a href="/occupancy-costs/">Occupancy costs</a>.</p>
            <p>Start with <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">CAM</a> if the extra stack is new to the client.</p>
            <p>Then scan <a href="/occupancy-costs/hidden-occupancy-costs/">hidden costs</a>.</p>
            <p>The stack is how you compare <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">gross and net</a>.</p>
            <p>Uncapped extras need <a href="/lease-sensitivity-analysis/">sensitivity</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>A low sticker can hide a heavy stack.</p>
            <p>Controllers need one subtotal they can budget.</p>
            <p>Location compares fail when only rent moves.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>A low sticker can hide a heavy stack.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>List base rent.</li><li>Add tenant-paid extras.</li><li>Add credits only in the year they happen.</li><li>Divide by feet if you need a unit.</li><li>Keep the list beside NPV, not instead of it.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Total occupancy cost = rent + CAM + tax + insurance + other tenant-paid extras − credits.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Base rent</th><td>The rent line</td></tr><tr><th scope="row">CAM</th><td>Shared building cost</td></tr><tr><th scope="row">Tax</th><td>Tenant share</td></tr><tr><th scope="row">Insurance</th><td>Tenant share</td></tr><tr><th scope="row">Other</th><td>Utilities, parking, remaining build-out</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$30,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$27,900</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$355,924</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Occupancy-stack sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$30,000</td><td>$27,900</td></tr><tr><th scope="row">Year-1 extras</th><td>$18,000</td><td>$19,260</td></tr><tr><th scope="row">Year-1 credit</th><td>$7,000</td><td>$3,850</td></tr><tr><th scope="row">Sample NPV</th><td>$355,924</td><td>$352,500</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Occupancy-stack sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$30,000</td><td>$18,000</td><td>$7,000</td><td>$41,000</td><td>$37,963</td></tr><tr><th scope="row">Year 2</th><td>$30,900</td><td>$18,540</td><td>$0</td><td>$49,440</td><td>$42,387</td></tr><tr><th scope="row">Year 3</th><td>$31,827</td><td>$19,096</td><td>$0</td><td>$50,923</td><td>$40,424</td></tr><tr><th scope="row">Year 4</th><td>$32,782</td><td>$19,669</td><td>$0</td><td>$52,451</td><td>$38,553</td></tr><tr><th scope="row">Year 5</th><td>$33,765</td><td>$20,259</td><td>$0</td><td>$54,024</td><td>$36,768</td></tr><tr><th scope="row">Year 6</th><td>$34,778</td><td>$20,867</td><td>$0</td><td>$55,645</td><td>$35,066</td></tr><tr><th scope="row">Year 7</th><td>$35,821</td><td>$21,493</td><td>$0</td><td>$57,314</td><td>$33,442</td></tr><tr><th scope="row">Year 8</th><td>$36,896</td><td>$22,138</td><td>$0</td><td>$59,034</td><td>$31,894</td></tr><tr><th scope="row">Year 9</th><td>$38,003</td><td>$22,802</td><td>$0</td><td>$60,805</td><td>$30,418</td></tr><tr><th scope="row">Year 10</th><td>$39,143</td><td>$23,486</td><td>$0</td><td>$62,629</td><td>$29,009</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$355,924</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Occupancy-stack sample is about $355,924. A second path lands near $352,500. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Occupancy-stack sample</h3>
              <ul><li>Year 1 of Occupancy-stack sample has rent of $30,000.</li><li>Shared building cost is $18,000.</li><li>A credit of $7,000 lowers the cash you pay that year.</li><li>Cash out this year is about $41,000. Extras nearly match rent in this net sample.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $37,963 today.</li></ul>
              <ul><li>Next, year 2 rent is $30,900.</li><li>CAM, which is a shared building cost, is $18,540.</li><li>There is no credit in this year.</li><li>You pay about $49,440 this year after extras and credits. The stack grows as the building ages.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $42,387 today.</li></ul>
              <ul><li>Then year 3 rent is $31,827.</li><li>Extras for the building come to $19,096.</li><li>Credits skip this year.</li><li>The net cash this year is about $50,923. No credit remains after year one.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $40,424 today.</li></ul>
              <ul><li>After that, year 4 rent is $32,782.</li><li>The shared building cost this time is $19,669.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $52,451. Later extras still belong in the budget.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $38,553 today.</li></ul>
              <ul><li>In year 5 of Occupancy-stack sample, rent is $33,765.</li><li>Shared building cost is $20,259.</li><li>There is no credit in this year.</li><li>You pay about $54,024 this year after extras and credits. The last year is a full occupancy year.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $36,768 today.</li></ul>
              <ul><li>Year 6 of Occupancy-stack sample has rent of $34,778.</li><li>CAM, which is a shared building cost, is $20,867.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,645. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $35,066 today.</li></ul>
              <ul><li>Next, year 7 rent is $35,821.</li><li>Extras for the building come to $21,493.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,314. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $33,442 today.</li></ul>
              <ul><li>Then year 8 rent is $36,896.</li><li>The shared building cost this time is $22,138.</li><li>There is no credit in this year.</li><li>You pay about $59,034 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $31,894 today.</li></ul>
              <ul><li>After that, year 9 rent is $38,003.</li><li>Shared building cost is $22,802.</li><li>Credits skip this year.</li><li>The net cash this year is about $60,805. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $30,418 today.</li></ul>
              <ul><li>In year 10 of Occupancy-stack sample, rent is $39,143.</li><li>CAM, which is a shared building cost, is $23,486.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $62,629. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $29,009 today.</li></ul><p>Add those year values. The sample NPV for Occupancy-stack sample is about $355,924. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Occupancy-stack sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">Compare gross and net</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample is a net office path. A gross path would fold extras into rent.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Percentage rent belongs only for some retail deals.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Budgeting rent and forgetting the true-up.</li><li>Comparing locations on rent alone.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If extras are unknown, do not pick a city yet.</p>
            <h2>Compare this to related metrics</h2>
            <p>NPV is this stack after time. See <a href="/commercial-lease-npv/what-costs-belong-in-lease-npv/">what costs belong in NPV</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>The stack does not score talent or transit.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use a first-year stack as the ten-year story.</li></ul>
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
            <p className="pv-spoke-index"><a href="/occupancy-costs/what-is-cam-in-a-commercial-lease">What is CAM in a commercial lease?</a> · <a href="/occupancy-costs/hidden-occupancy-costs">What hidden occupancy costs do tenants miss?</a> · <a href="/occupancy-costs/occupancy-cost-per-square-foot">What is occupancy cost per square foot?</a></p>
            
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
            <RelatedContent items={[{"href":"/occupancy-costs/","label":"Occupancy costs hub","description":"The topic home."}]} /></div>
            <div className="pv-related-family"><h3>Use this in a comparison</h3>
            <RelatedContent items={[{"href":"/lease-comparison/","label":"Lease comparison","description":"Put two stacks on one page."}]} /></div>
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
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-cam-in-a-commercial-lease/" data-relationship="related" aria-label="What is CAM in a commercial lease. CAM means common area maintenance.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is CAM in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
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
