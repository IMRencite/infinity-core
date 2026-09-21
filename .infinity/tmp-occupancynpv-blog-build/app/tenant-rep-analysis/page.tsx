import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Tenant-rep analysis",
  description: "A tenant-rep broker needs a clear story for a client. Learn how to move from proposals to a simple comparison a CFO can review.",
  alternates: { canonical: "/tenant-rep-analysis/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Tenant-rep analysis", description: "A tenant-rep broker needs a clear story for a client. Learn how to move from proposals to a simple comparison a CFO can review." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/tenant-rep-analysis" role="EDUCATIONAL_HUB" pattern="EDUCATIONAL_HUB" cluster="tenant-rep-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/tenant-rep-analysis"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/tenant-rep-analysis","label":"How should tenant-rep analysis be framed?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">tenant rep analysis</p>
            <h1 className="pv-display">How should tenant-rep analysis be framed?</h1>
            <div data-question-id="q_d60acc07db7f3440" data-answer-chunk-id="q_d60acc07db7f3440_chunk">
              <AnswerFirst question="How should tenant-rep analysis be framed?" answer="Tenant-rep analysis is a client story: what the space must do, what the cash is, what can flip, and what you still do not know. It is not a CRM record and not a finished software product." />
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
            <div data-question-id="exp_/tenant-rep-analysis_0" data-answer-chunk-id="exp_/tenant-rep-analysis_0_chunk">
              <AnswerFirst question="How should a broker explain economics?" answer="A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward." />
            </div>
            <div data-question-id="exp_/tenant-rep-analysis_1" data-answer-chunk-id="exp_/tenant-rep-analysis_1_chunk">
              <AnswerFirst question="How do you compare LOIs?" answer="An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner." />
            </div>
            <div data-question-id="exp_/tenant-rep-analysis_2" data-answer-chunk-id="exp_/tenant-rep-analysis_2_chunk">
              <AnswerFirst question="What belongs in the memo?" answer="The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask." />
            </div>
            <div data-question-id="exp_/tenant-rep-analysis_3" data-answer-chunk-id="exp_/tenant-rep-analysis_3_chunk">
              <AnswerFirst question="How do you compare stay versus move?" answer="A stay-versus-move compare should add move cost and downtime to the relocation lease path before ranking. A tenant should keep this lease answer visible on the same page." />
            </div>
            <p>Read <a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/">How do you compare commercial LOIs?</a> when you need the next deep answer.</p>
            <p>Read <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">What belongs in a lease recommendation memo?</a> when you need the next deep answer.</p>
            <p>Read <a href="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/">How do you compare a renewal versus a relocation?</a> when you need the next deep answer.</p>
            <p className="pv-spoke-index" data-expansion-spokes="true"><a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois">How do you compare commercial LOIs?</a> · <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo">What belongs in a lease recommendation memo?</a> · <a href="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation">How do you compare a renewal versus a relocation?</a></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Tenant-rep work is representing the occupier, not the landlord.</p>
            <p>The analysis is the compare plus the fit plus the open risks.</p>
            <p>NPV means net present value. It is one exhibit in that story.</p>
            <p>A brokerage CRM stores people and stages. It does not finish this exhibit.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Tenant-rep analysis is a client story: what the space must do, what the cash is, what can flip, and what you still do not know. It is not a CRM record and not a finished software product.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Clients pay for judgment, not a thicker spreadsheet.</p>
            <p>A clear packet saves a second meeting.</p>
            <p>A muddy packet creates a third meeting.</p>
            <p>This hub exists so the packet can stay short and honest.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Clients pay for judgment, not a thicker spreadsheet.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Open with the use, then the cash, then the flip tests, and end with leftovers.</li><li>Keep sample math labeled as samples.</li><li>Do not claim customers or results this site does not have.</li><li>Point to the pilot if they want to try the workflow.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Story = fit + occupancy cash + sensitivity + leftovers.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Use</th><td>What the team must do in the space</td></tr><tr><th scope="row">Cash</th><td>Rent, extras, credits</td></tr><tr><th scope="row">Tests</th><td>What can flip</td></tr><tr><th scope="row">Unknowns</th><td>What is still missing</td></tr></tbody></table></div>
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
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$368,002</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the client-packet lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$40,500</td><td>$37,665</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,100</td><td>$9,737</td></tr><tr><th scope="row">Year-1 credit</th><td>$7,000</td><td>$3,850</td></tr><tr><th scope="row">Sample NPV</th><td>$368,002</td><td>$354,323</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the client-packet lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$40,500</td><td>$9,100</td><td>$7,000</td><td>$42,600</td><td>$39,444</td></tr><tr><th scope="row">Year 2</th><td>$41,715</td><td>$9,373</td><td>$0</td><td>$51,088</td><td>$43,800</td></tr><tr><th scope="row">Year 3</th><td>$42,966</td><td>$9,654</td><td>$0</td><td>$52,620</td><td>$41,771</td></tr><tr><th scope="row">Year 4</th><td>$44,255</td><td>$9,944</td><td>$0</td><td>$54,199</td><td>$39,838</td></tr><tr><th scope="row">Year 5</th><td>$45,583</td><td>$10,242</td><td>$0</td><td>$55,825</td><td>$37,994</td></tr><tr><th scope="row">Year 6</th><td>$46,950</td><td>$10,549</td><td>$0</td><td>$57,499</td><td>$36,234</td></tr><tr><th scope="row">Year 7</th><td>$48,359</td><td>$10,865</td><td>$0</td><td>$59,224</td><td>$34,557</td></tr><tr><th scope="row">Year 8</th><td>$49,810</td><td>$11,191</td><td>$0</td><td>$61,001</td><td>$32,957</td></tr><tr><th scope="row">Year 9</th><td>$51,304</td><td>$11,527</td><td>$0</td><td>$62,831</td><td>$31,431</td></tr><tr><th scope="row">Year 10</th><td>$52,843</td><td>$11,873</td><td>$0</td><td>$64,716</td><td>$29,976</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$368,002</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the client-packet lease is about $368,002. A second path lands near $354,323. That gap is a talking point, not a promise.</p>
                <p>A client can follow year one if you speak in cash, not slogans. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the client-packet lease</h3>
              <ul><li>Year 1 of the client-packet lease has rent of $40,500.</li><li>Shared building cost is $9,100.</li><li>A credit of $7,000 lowers the cash you pay that year.</li><li>Cash out this year is about $42,600. A client can follow year one if you speak in cash, not slogans.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $39,444 today.</li></ul>
              <ul><li>Next, year 2 rent is $41,715.</li><li>CAM, which is a shared building cost, is $9,373.</li><li>There is no credit in this year.</li><li>You pay about $51,088 this year after extras and credits. Extras show up in the story here.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,800 today.</li></ul>
              <ul><li>Then year 3 rent is $42,966.</li><li>Extras for the building come to $9,654.</li><li>Credits skip this year.</li><li>The net cash this year is about $52,620. Steps need a sentence in this year.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $41,771 today.</li></ul>
              <ul><li>After that, year 4 rent is $44,255.</li><li>The shared building cost this time is $9,944.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $54,199. Mention the rate in the same breath here.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $39,838 today.</li></ul>
              <ul><li>In year 5 of the client-packet lease, rent is $45,583.</li><li>Shared building cost is $10,242.</li><li>There is no credit in this year.</li><li>You pay about $55,825 this year after extras and credits. The sample path closes on this last taught year.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $37,994 today.</li></ul>
              <ul><li>Year 6 of the client-packet lease has rent of $46,950.</li><li>CAM, which is a shared building cost, is $10,549.</li><li>Credits skip this year.</li><li>The net cash this year is about $57,499. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $36,234 today.</li></ul>
              <ul><li>Next, year 7 rent is $48,359.</li><li>Extras for the building come to $10,865.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $59,224. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $34,557 today.</li></ul>
              <ul><li>Then year 8 rent is $49,810.</li><li>The shared building cost this time is $11,191.</li><li>There is no credit in this year.</li><li>You pay about $61,001 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $32,957 today.</li></ul>
              <ul><li>After that, year 9 rent is $51,304.</li><li>Shared building cost is $11,527.</li><li>Credits skip this year.</li><li>The net cash this year is about $62,831. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $31,431 today.</li></ul>
              <ul><li>In year 10 of the client-packet lease, rent is $52,843.</li><li>CAM, which is a shared building cost, is $11,873.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $64,716. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $29,976 today.</li></ul><p>Add those year values. The sample NPV for the client-packet lease is about $368,002. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the client-packet lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/">Read the broker explainer</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>No general availability is claimed.</li><li>Pricing on this site is a hypothesis.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A CFO packet is shorter than an analyst workbook.</p>
            <p>A first tour packet can omit NPV if cash is not ready.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Leading with software features.</li><li>Hiding unknowns.</li><li>Treating a CRM note as analysis.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the client can repeat the story, the packet worked.</p>
            <p>If they only remember 'lower rent,' the packet failed.</p>
            <h2>Compare this to related metrics</h2>
            <p>A CRM is a pipeline tool.</p>
            <p>A spreadsheet can be the engine if the story stays clear.</p>
            <aside className="pv-callout ed-highlight" data-callout="FOR_TENANT_REP"><h3>For brokers</h3><p>Your job is the story the client can retell. The math is there to keep the story honest.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This is a validation surface, not a launch claim.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not force a finance packet on a tour that has no offers yet.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid pv-discovery-grid--balanced">
              <div data-discovery-group="START_HERE"><h3>Start here</h3><ul className="pv-question-row"><li><a href="/tenant-rep-analysis/lease-abstract-vs-financial-analysis/">What is the difference between a lease abstract and a financial analysis?</a></li></ul></div><div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3><ul className="pv-question-row"><li><a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/">How do you compare commercial LOIs?</a></li><li><a href="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/">How do you compare a renewal versus a relocation?</a></li></ul></div><div data-discovery-group="COMPARE_OPTIONS"><h3>Compare options</h3><ul className="pv-question-row"><li><a href="/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/">How do you compare multiple spaces for one client?</a></li></ul></div><div data-discovery-group="COMMON_MISTAKES"><h3>Common mistakes</h3><ul className="pv-question-row"><li><a href="/tenant-rep-analysis/common-broker-lease-analysis-mistakes/">What are common broker lease-analysis mistakes?</a></li></ul></div>
            </div>
            <div className="pv-discovery-band" data-hub-role-band="true"><div data-hub-role-band="true" data-discovery-group="FOR_YOUR_ROLE"><h3>For your role</h3><ul className="pv-question-row"><li><a href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/">How should a tenant-rep broker explain lease economics to a client?</a></li><li><a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">What belongs in a lease recommendation memo?</a></li><li><a href="/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/">How does analysis change negotiation strategy?</a></li><li><a href="/tenant-rep-analysis/how-analysis-supports-lease-negotiation/">How does analysis support lease negotiation?</a></li><li><a href="/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/">What belongs in a client-facing lease summary?</a></li></ul></div></div>
          </div>
        </section><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </div>
            <p className="pv-spoke-index"><a href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics">How should a tenant-rep broker explain lease economics to a client?</a></p>
            
          </div>
        </section>
        <div className="vg-container pv-hoisted-light-modules">
        <section className="pv-source-board pv-wide-module" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
              
        
        <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={[{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"},{"href":"https://www.naiop.org/","label":"NAIOP"},{"href":"https://www.census.gov/programs-surveys/cbp.html","label":"U.S. Census Bureau — County Business Patterns"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/","label":"How to explain economics","description":"A nearby page that helps finish this comparison."},{"href":"/for/tenant-rep-brokers","label":"Tenant-rep workflow page","description":"A nearby page that helps finish this comparison."},{"href":"/how-it-works","label":"How the workflow works","description":"A nearby page that helps finish this comparison."},{"href":"/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics","label":"How should a tenant-rep broker explain lease economics to a client?","description":"A question page in this same topic. Read it when you need the next definition."}]} />
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
            <a className="sn-card" data-card-role="QUESTION" href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/" data-relationship="related" aria-label="How should a tenant-rep broker explain lease economics to a client. Clients need a short story they can trust.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-4.2 0-8 2-8 4.5V21h16v-3.5C20 15 16.2 13 12 13z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How should a tenant-rep broker explain lease economics to a client</strong><span className="sn-desc">Show a client a path they can review.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/" data-relationship="related" aria-label="How do you compare commercial LOIs. An LOI is a sketch.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you compare commercial LOIs</strong><span className="sn-desc">Show a client a path they can review.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/" data-relationship="related" aria-label="What belongs in a lease recommendation memo. State the pick, the gap, the assumptions, the risks, and the next ask.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-4.2 0-8 2-8 4.5V21h16v-3.5C20 15 16.2 13 12 13z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What belongs in a lease recommendation memo</strong><span className="sn-desc">Show a client a path they can review.</span></span>
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
