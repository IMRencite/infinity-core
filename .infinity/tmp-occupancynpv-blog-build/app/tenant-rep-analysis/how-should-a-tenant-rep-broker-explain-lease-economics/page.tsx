import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How should a tenant-rep broker explain lease economics?",
  description: "Clients need a short story they can trust. Learn how to explain rent, extras, time, and risk without hiding the hard parts.",
  alternates: { canonical: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How should a tenant-rep broker explain lease economics?", description: "Clients need a short story they can trust. Learn how to explain rent, extras, time, and risk without hiding the hard parts." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="tenant-rep-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/tenant-rep-analysis","label":"Tenant-rep analysis"},{"href":"/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics","label":"How should a tenant-rep broker explain lease economics?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">tenant rep analysis</p>
            <h1 className="pv-display">How should a tenant-rep broker explain lease economics?</h1>
            <div data-question-id="q_36050c5f07b20d52" data-answer-chunk-id="q_36050c5f07b20d52_chunk">
              <AnswerFirst question="How should a tenant-rep broker explain lease economics?" answer="The right order is fit, then cash in simple years, then what can flip, then what you still do not know. Keep NPV in today's dollars, not in jargon." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/for/tenant-rep-brokers">See the Tenant-Rep Workflow</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_0" data-answer-chunk-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_0_chunk">
              <AnswerFirst question="What should you say first?" answer="A broker should say the lease number is the price of the deal in today's dollars, not a grade for the building." />
            </div>
            <div data-question-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_1" data-answer-chunk-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_1_chunk">
              <AnswerFirst question="What must stay visible?" answer="The years, the extras, the credits, and the rate should stay visible on the same lease page. A tenant should keep this lease answer visible on the same page." />
            </div>
            <div data-question-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_2" data-answer-chunk-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_2_chunk">
              <AnswerFirst question="How do you talk to a CFO?" answer="A lease talk with finance should place the gap and the flip beside the pick. A slogan does not help." />
            </div>
            <div data-question-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_3" data-answer-chunk-id="exp_/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics_3_chunk">
              <AnswerFirst question="What do you not claim?" answer="The workflow is a lease comparison product. Live checkout is available on the pricing page and public rollout remains controlled." />
            </div>
            <p>This question sits on the <a href="/tenant-rep-analysis/">tenant-rep-analysis</a> hub.</p>
            <p>See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.</p>
            <p>The <a href="/how-it-works">how it works</a> page shows the four-step path.</p>
            <p>Go deeper on <a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/">How do you compare commercial LOIs?</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Explain means a client can retell the idea after one pass.</p>
            <p>NPV means net present value. Say 'today's dollars' first.</p>
            <p>The discount rate is the price of waiting. Say that once.</p>
            <p>CAM is a shared building cost. Define it the first time you say it.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>The right order is fit, then cash in simple years, then what can flip, then what you still do not know. Keep NPV in today's dollars, not in jargon.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>A client who cannot retell the deal will not defend it inside their firm.</p>
            <p>A CFO wants leftovers named, not hidden.</p>
            <p>A long deck with no sentence fails.</p>
            <p>A short deck that lies also fails.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>A client who cannot retell the deal will not defend it inside their firm.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Keep one table, one rate, and one leftover list.</li><li>Avoid three slides that repeat the same adjective.</li><li>If you show a sample, label it as a sample.</li><li>If you want them to try the workflow, ask after the story, not before.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Retell test: can they say fit, cash, flip risk, and leftovers in four short lines?</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Audience</th><td>Owner, CFO, or operator</td></tr><tr><th scope="row">One table</th><td>The cash</td></tr><tr><th scope="row">One test</th><td>The flip</td></tr><tr><th scope="row">Leftovers</th><td>The unknowns</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$39,800</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$37,014</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$363,504</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the spoken sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$39,800</td><td>$37,014</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,300</td><td>$9,951</td></tr><tr><th scope="row">Year-1 credit</th><td>$6,000</td><td>$3,300</td></tr><tr><th scope="row">Sample NPV</th><td>$363,504</td><td>$350,000</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the spoken sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$39,800</td><td>$9,300</td><td>$6,000</td><td>$43,100</td><td>$39,907</td></tr><tr><th scope="row">Year 2</th><td>$40,914</td><td>$9,579</td><td>$0</td><td>$50,493</td><td>$43,290</td></tr><tr><th scope="row">Year 3</th><td>$42,060</td><td>$9,866</td><td>$0</td><td>$51,926</td><td>$41,221</td></tr><tr><th scope="row">Year 4</th><td>$43,238</td><td>$10,162</td><td>$0</td><td>$53,400</td><td>$39,251</td></tr><tr><th scope="row">Year 5</th><td>$44,448</td><td>$10,467</td><td>$0</td><td>$54,915</td><td>$37,374</td></tr><tr><th scope="row">Year 6</th><td>$45,781</td><td>$10,781</td><td>$0</td><td>$56,562</td><td>$35,644</td></tr><tr><th scope="row">Year 7</th><td>$47,154</td><td>$11,104</td><td>$0</td><td>$58,258</td><td>$33,993</td></tr><tr><th scope="row">Year 8</th><td>$48,569</td><td>$11,437</td><td>$0</td><td>$60,006</td><td>$32,419</td></tr><tr><th scope="row">Year 9</th><td>$50,026</td><td>$11,780</td><td>$0</td><td>$61,806</td><td>$30,918</td></tr><tr><th scope="row">Year 10</th><td>$51,527</td><td>$12,133</td><td>$0</td><td>$63,660</td><td>$29,487</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$363,504</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the spoken sample is about $363,504. A second path lands near $350,000. That gap is a talking point, not a promise.</p>
                <p>Speak year one as cash, not as a slogan. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the spoken sample</h3>
              <ul><li>Year 1 of the spoken sample has rent of $39,800.</li><li>Shared building cost is $9,300.</li><li>A credit of $6,000 lowers the cash you pay that year.</li><li>Cash out this year is about $43,100. Speak year one as cash, not as a slogan.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $39,907 today.</li></ul>
              <ul><li>Next, year 2 rent is $40,914.</li><li>CAM, which is a shared building cost, is $9,579.</li><li>There is no credit in this year.</li><li>You pay about $50,493 this year after extras and credits. Call out extras when they stay in year two.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,290 today.</li></ul>
              <ul><li>Then year 3 rent is $42,060.</li><li>Extras for the building come to $9,866.</li><li>Credits skip this year.</li><li>The net cash this year is about $51,926. Name the step when it appears in year three.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $41,221 today.</li></ul>
              <ul><li>After that, year 4 rent is $43,238.</li><li>The shared building cost this time is $10,162.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $53,400. Keep the rate in the same breath in year four.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $39,251 today.</li></ul>
              <ul><li>In year 5 of the spoken sample, rent is $44,448.</li><li>Shared building cost is $10,467.</li><li>There is no credit in this year.</li><li>You pay about $54,915 this year after extras and credits. Close the leftover list on year five.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $37,374 today.</li></ul>
              <ul><li>Year 6 of the spoken sample has rent of $45,781.</li><li>CAM, which is a shared building cost, is $10,781.</li><li>Credits skip this year.</li><li>The net cash this year is about $56,562. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $35,644 today.</li></ul>
              <ul><li>Next, year 7 rent is $47,154.</li><li>Extras for the building come to $11,104.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $58,258. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $33,993 today.</li></ul>
              <ul><li>Then year 8 rent is $48,569.</li><li>The shared building cost this time is $11,437.</li><li>There is no credit in this year.</li><li>You pay about $60,006 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $32,419 today.</li></ul>
              <ul><li>After that, year 9 rent is $50,026.</li><li>Shared building cost is $11,780.</li><li>Credits skip this year.</li><li>The net cash this year is about $61,806. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $30,918 today.</li></ul>
              <ul><li>In year 10 of the spoken sample, rent is $51,527.</li><li>CAM, which is a shared building cost, is $12,133.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $63,660. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $29,487 today.</li></ul><p>Add those year values. The sample NPV for the spoken sample is about $363,504. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the spoken sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>This is teaching voice, not a script you must read.</li><li>No attorney review is claimed.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A board packet may drop the year walk and keep the gap plus leftovers.</p>
            <p>An operator packet may lead with docks and hours, then cash.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Starting with product features.</li><li>Using 'NPV' six times before defining it.</li><li>Forgetting to say the site is a pilot if you mention the tool.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If they ask for price, answer with the hypothesis and the limit.</p>
            <p>If they ask for a meeting, route to the real scheduling path later. This page does not book one.</p>
            <h2>Compare this to related metrics</h2>
            <p>A CRM email is not an explanation.</p>
            <p>A raw workbook dump is not an explanation.</p>
            <aside className="pv-callout ed-highlight" data-callout="FOR_FINANCE"><h3>For finance teams</h3><p>Ask for the rate, the extras, and the leftovers. If those three are missing, the packet is not done.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>No customer results are shown because none are claimed.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not give a full NPV lecture on a first tour with no offers.</li></ul>
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
              <AuthorityRefs items={[{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"},{"href":"https://www.naiop.org/","label":"NAIOP"},{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/tenant-rep-analysis/","label":"Tenant-rep hub","description":"A nearby page that helps finish this comparison."},{"href":"/for/tenant-rep-brokers","label":"Persona workflow","description":"A nearby page that helps finish this comparison."},{"href":"/lease-financial-modeling/","label":"Modeling hub","description":"A nearby page that helps finish this comparison."}]} />
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
          <nav className="sn-block" data-semantic-navigation="FOR_YOUR_ROLE" aria-label="For your role">
            <div className="sn-block-head">
              <span className="sn-kicker">FOR YOUR ROLE</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-4">
            <a className="sn-card" data-card-role="ROLE" href="/for/tenant-rep-brokers/" data-relationship="persona" aria-label="Tenant-rep workflow. A simple path a client can review.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-4.2 0-8 2-8 4.5V21h16v-3.5C20 15 16.2 13 12 13z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">For your role</span><strong>Tenant-rep workflow</strong><span className="sn-desc">Show a client a path they can review.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/tenant-rep-analysis/" data-relationship="related" aria-label="Tenant-rep analysis. Move from proposals to a clear story.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-4.2 0-8 2-8 4.5V21h16v-3.5C20 15 16.2 13 12 13z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Tenant-rep analysis</strong><span className="sn-desc">Show a client a path they can review.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. Use one stack for both offers.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Show the steps before the number.">
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
