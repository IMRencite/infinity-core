import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How to build a lease cash-flow model",
  description: "List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases.",
  alternates: { canonical: "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How to build a lease cash-flow model", description: "List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-financial-modeling">
        <JsonLdBlock data={SITE_SCHEMA["/lease-financial-modeling/how-to-build-a-lease-cash-flow-model"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-financial-modeling","label":"Lease financial modeling"},{"href":"/lease-financial-modeling/how-to-build-a-lease-cash-flow-model","label":"How do you build a lease cash-flow model?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease financial modeling</p>
            <h1 className="pv-display">How do you build a lease cash-flow model?</h1>
            <div data-question-id="q_f9ffc2af1df195d2" data-answer-chunk-id="q_f9ffc2af1df195d2_chunk">
              <AnswerFirst question="How do you build a lease cash-flow model?" answer="List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/compare-commercial-leases">See the comparison workflow</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_1f653f8c8b063ec1" data-answer-chunk-id="q_1f653f8c8b063ec1_0" data-supporting-section="define">
              <AnswerFirst question="What is the first sheet?" answer="Inputs. Dates, rent steps, extras, credits, and the rate." />
            </div>
            <div data-question-id="q_4e3f0abe04492326" data-answer-chunk-id="q_4e3f0abe04492326_1" data-supporting-section="define">
              <AnswerFirst question="What is a period row?" answer="Rent plus extras minus credits for that year or month." />
            </div>
            <div data-question-id="q_6f0302c1784a7ab9" data-answer-chunk-id="q_6f0302c1784a7ab9_2" data-supporting-section="define">
              <AnswerFirst question="Where do NPV and effective rent come from?" answer="The same list. Never from two separate pastes." />
            </div>
            <div data-question-id="q_9fb0d8dcd3e5676b" data-answer-chunk-id="q_9fb0d8dcd3e5676b_3" data-supporting-section="define">
              <AnswerFirst question="What is a check?" answer="A tie that proves the file still adds up after an edit." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A cash-flow model is the year list in a file.</p>
            <p>Each period has rent, extras, and credits.</p>
            <p>NPV and effective rent should read from that same list.</p>
            <p>This page sits under <a href="/lease-financial-modeling/">Lease financial modeling</a>.</p>
            <p>Do not skip <a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">inputs</a>.</p>
            <p>The shrink step is the same <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">NPV walk</a>.</p>
            <p>Pull <a href="/effective-rent/how-to-calculate-effective-rent/">effective rent</a> from the same rows.</p>
            <p>After the file ties, run the <a href="/lease-sensitivity-analysis/">tests</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Two metrics from two lists will fight.</p>
            <p>A hardcoded later year will not move when the bump changes.</p>
            <p>Checks catch the quiet errors.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Two metrics from two lists will fight.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Build the input sheet first.</li><li>Write one row per period.</li><li>Link every money cell to an input.</li><li>Add a check that beginning plus activity equals the next beginning.</li><li>Discount the stream. Then test a nearby rate and a nearby extra.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Period cash = rent + extras − credits. NPV = sum of shrunk period cash.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Input sheet</th><td>Dates, steps, extras, rate</td></tr><tr><th scope="row">Period rows</th><td>One row per year or month</td></tr><tr><th scope="row">Checks</th><td>Ties and sign checks</td></tr><tr><th scope="row">Outputs</th><td>NPV, effective rent, occupancy cost</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$36,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$33,480</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$325,281</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Cash-flow-build sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$36,000</td><td>$33,480</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,800</td><td>$9,416</td></tr><tr><th scope="row">Year-1 credit</th><td>$14,000</td><td>$7,700</td></tr><tr><th scope="row">Sample NPV</th><td>$325,281</td><td>$316,739</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Cash-flow-build sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$36,000</td><td>$8,800</td><td>$14,000</td><td>$30,800</td><td>$28,519</td></tr><tr><th scope="row">Year 2</th><td>$37,080</td><td>$9,064</td><td>$0</td><td>$46,144</td><td>$39,561</td></tr><tr><th scope="row">Year 3</th><td>$38,192</td><td>$9,336</td><td>$0</td><td>$47,528</td><td>$37,729</td></tr><tr><th scope="row">Year 4</th><td>$39,338</td><td>$9,616</td><td>$0</td><td>$48,954</td><td>$35,983</td></tr><tr><th scope="row">Year 5</th><td>$40,518</td><td>$9,904</td><td>$0</td><td>$50,422</td><td>$34,316</td></tr><tr><th scope="row">Year 6</th><td>$41,734</td><td>$10,201</td><td>$0</td><td>$51,935</td><td>$32,728</td></tr><tr><th scope="row">Year 7</th><td>$42,986</td><td>$10,507</td><td>$0</td><td>$53,493</td><td>$31,213</td></tr><tr><th scope="row">Year 8</th><td>$44,276</td><td>$10,822</td><td>$0</td><td>$55,098</td><td>$29,768</td></tr><tr><th scope="row">Year 9</th><td>$45,604</td><td>$11,147</td><td>$0</td><td>$56,751</td><td>$28,390</td></tr><tr><th scope="row">Year 10</th><td>$46,972</td><td>$11,481</td><td>$0</td><td>$58,453</td><td>$27,075</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$325,281</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Cash-flow-build sample is about $325,281. A second path lands near $316,739. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Cash-flow-build sample</h3>
              <ul><li>Year 1 of Cash-flow-build sample has rent of $36,000.</li><li>Shared building cost is $8,800.</li><li>A credit of $14,000 lowers the cash you pay that year.</li><li>Cash out this year is about $30,800. Period one holds the credit.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $28,519 today.</li></ul>
              <ul><li>Next, year 2 rent is $37,080.</li><li>CAM, which is a shared building cost, is $9,064.</li><li>There is no credit in this year.</li><li>You pay about $46,144 this year after extras and credits. Period two is a clean formula row.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $39,561 today.</li></ul>
              <ul><li>Then year 3 rent is $38,192.</li><li>Extras for the building come to $9,336.</li><li>Credits skip this year.</li><li>The net cash this year is about $47,528. The bump should flow from an input.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $37,729 today.</li></ul>
              <ul><li>After that, year 4 rent is $39,338.</li><li>The shared building cost this time is $9,616.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $48,954. Later rows must not be pasted values.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $35,983 today.</li></ul>
              <ul><li>In year 5 of Cash-flow-build sample, rent is $40,518.</li><li>Shared building cost is $9,904.</li><li>There is no credit in this year.</li><li>You pay about $50,422 this year after extras and credits. The last row proves the term length.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $34,316 today.</li></ul>
              <ul><li>Year 6 of Cash-flow-build sample has rent of $41,734.</li><li>CAM, which is a shared building cost, is $10,201.</li><li>Credits skip this year.</li><li>The net cash this year is about $51,935. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $32,728 today.</li></ul>
              <ul><li>Next, year 7 rent is $42,986.</li><li>Extras for the building come to $10,507.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $53,493. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $31,213 today.</li></ul>
              <ul><li>Then year 8 rent is $44,276.</li><li>The shared building cost this time is $10,822.</li><li>There is no credit in this year.</li><li>You pay about $55,098 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $29,768 today.</li></ul>
              <ul><li>After that, year 9 rent is $45,604.</li><li>Shared building cost is $11,147.</li><li>Credits skip this year.</li><li>The net cash this year is about $56,751. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $28,390 today.</li></ul>
              <ul><li>In year 10 of Cash-flow-build sample, rent is $46,972.</li><li>CAM, which is a shared building cost, is $11,481.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $58,453. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $27,075 today.</li></ul><p>Add those year values. The sample NPV for Cash-flow-build sample is about $325,281. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Cash-flow-build sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">See required inputs</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample is annual for teaching. Live files often use months.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Excel NPV starts one period out. Date-true work needs care.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Hardcodes in the row. Sign errors. Two lists for two metrics.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If a check fails, stop ranking.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">required inputs</a> before you build rows.</p>
            <p>See <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">how NPV is calculated</a> for the shrink step.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A clean file still needs a human to read the lease.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not build cases on a file that already fails a check.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="View Pilot Pricing" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/pricing">View Pilot Pricing</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model">What inputs belong in a commercial lease model?</a></p>
            
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
            <div className="pv-related-family"><h3>Next step</h3>
            <RelatedContent items={[{"href":"/how-it-works","label":"How it works","description":"The product path from terms to summary."}]} /></div>
            <div className="pv-related-family"><h3>Questions people ask next</h3>
            <RelatedContent items={[{"href":"/lease-financial-modeling/what-are-common-lease-analysis-mistakes/","label":"Common mistakes","description":"What breaks the file."}]} /></div>
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
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/" data-relationship="related" aria-label="What inputs belong in a commercial lease model. Dates, rent steps, extras, credits, and the rate.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What inputs belong in a commercial lease model</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
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
