import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Occupancy costs",
  description: "Face rent is not the full bill. Learn how CAM, taxes, insurance, and other costs change which lease is cheaper.",
  alternates: { canonical: "/occupancy-costs/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Occupancy costs", description: "Face rent is not the full bill. Learn how CAM, taxes, insurance, and other costs change which lease is cheaper." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/occupancy-costs" role="EDUCATIONAL_HUB" pattern="EDUCATIONAL_HUB" cluster="occupancy-costs">
        <JsonLdBlock data={SITE_SCHEMA["/occupancy-costs"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/occupancy-costs","label":"What belongs in occupancy cost?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">occupancy costs</p>
            <h1 className="pv-display">What belongs in occupancy cost?</h1>
            <div data-question-id="q_60f6a86229cf56b0" data-answer-chunk-id="q_60f6a86229cf56b0_chunk">
              <AnswerFirst question="What belongs in occupancy cost?" answer="Occupancy cost is the full bill to sit in the space. Rent is one line. CAM, tax, insurance, and other tenant-paid extras can make a cheap face rent lose." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/lease-comparison/">Compare occupancy costs</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/occupancy-costs_0" data-answer-chunk-id="exp_/occupancy-costs_0_chunk">
              <AnswerFirst question="What is total occupancy cost?" answer="Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance." />
            </div>
            <div data-question-id="exp_/occupancy-costs_1" data-answer-chunk-id="exp_/occupancy-costs_1_chunk">
              <AnswerFirst question="What is CAM?" answer="CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow." />
            </div>
            <div data-question-id="exp_/occupancy-costs_2" data-answer-chunk-id="exp_/occupancy-costs_2_chunk">
              <AnswerFirst question="What hidden costs do tenants miss?" answer="Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list." />
            </div>
            <div data-question-id="exp_/occupancy-costs_3" data-answer-chunk-id="exp_/occupancy-costs_3_chunk">
              <AnswerFirst question="What is occupancy cost per foot?" answer="Occupancy cost per foot is the yearly lease stack divided by the feet the tenant pays for on one shared basis." />
            </div>
            <p>Read <a href="/occupancy-costs/what-is-total-occupancy-cost/">What is total occupancy cost in a commercial lease?</a> when you need the next deep answer.</p>
            <p>Read <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">What is CAM in a commercial lease?</a> when you need the next deep answer.</p>
            <p>Read <a href="/occupancy-costs/hidden-occupancy-costs/">What hidden occupancy costs do tenants miss?</a> when you need the next deep answer.</p>
            <p>Read <a href="/occupancy-costs/occupancy-cost-per-square-foot/">What is occupancy cost per square foot?</a> when you need the next deep answer.</p>
            <p className="pv-spoke-index" data-expansion-spokes="true"><a href="/occupancy-costs/what-is-total-occupancy-cost">What is total occupancy cost in a commercial lease?</a> · <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease">What is CAM in a commercial lease?</a> · <a href="/occupancy-costs/hidden-occupancy-costs">What hidden occupancy costs do tenants miss?</a> · <a href="/occupancy-costs/occupancy-cost-per-square-foot">What is occupancy cost per square foot?</a></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Occupancy cost is what it costs to occupy, not just the rent on the flyer.</p>
            <p>CAM means common area maintenance. It is a shared building cost. Many net leases pass it through.</p>
            <p>Tax and insurance can sit beside CAM on a net deal.</p>
            <p>NPV means net present value. You can discount occupancy cost, not just face rent.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Occupancy cost is the full bill to sit in the space. Rent is one line. CAM, tax, insurance, and other tenant-paid extras can make a cheap face rent lose.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>The lowest rent option can have the higher total occupancy cost.</p>
            <p>That happens when extras are large or when credits are small.</p>
            <p>A client who buys the rent headline can feel tricked in year two.</p>
            <p>Brokers who show extras early keep trust.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>The lowest rent option can have the higher total occupancy cost.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Write rent, extras the tenant pays, and credits on one list.</li><li>Do not mix a full-service deal with a net deal until you restate extras.</li><li>If two cities differ, extras can differ more than rent.</li><li>Then discount if timing matters.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Occupancy cash = rent + tenant-paid extras − credits. Then, if needed, NPV that path.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Face rent</th><td>The contract rent</td></tr><tr><th scope="row">CAM</th><td>Shared building cost</td></tr><tr><th scope="row">Tax</th><td>If the tenant pays it</td></tr><tr><th scope="row">Insurance</th><td>If the tenant pays it</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$33,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$30,690</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$351,156</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the extras-heavy lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$33,000</td><td>$30,690</td></tr><tr><th scope="row">Year-1 extras</th><td>$14,000</td><td>$14,980</td></tr><tr><th scope="row">Year-1 credit</th><td>$4,000</td><td>$2,200</td></tr><tr><th scope="row">Sample NPV</th><td>$351,156</td><td>$342,781</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the extras-heavy lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$33,000</td><td>$14,000</td><td>$4,000</td><td>$43,000</td><td>$39,815</td></tr><tr><th scope="row">Year 2</th><td>$33,990</td><td>$14,420</td><td>$0</td><td>$48,410</td><td>$41,504</td></tr><tr><th scope="row">Year 3</th><td>$35,010</td><td>$14,853</td><td>$0</td><td>$49,863</td><td>$39,583</td></tr><tr><th scope="row">Year 4</th><td>$36,060</td><td>$15,298</td><td>$0</td><td>$51,358</td><td>$37,750</td></tr><tr><th scope="row">Year 5</th><td>$37,142</td><td>$15,757</td><td>$0</td><td>$52,899</td><td>$36,002</td></tr><tr><th scope="row">Year 6</th><td>$38,256</td><td>$16,230</td><td>$0</td><td>$54,486</td><td>$34,335</td></tr><tr><th scope="row">Year 7</th><td>$39,404</td><td>$16,717</td><td>$0</td><td>$56,121</td><td>$32,746</td></tr><tr><th scope="row">Year 8</th><td>$40,586</td><td>$17,219</td><td>$0</td><td>$57,805</td><td>$31,230</td></tr><tr><th scope="row">Year 9</th><td>$41,804</td><td>$17,736</td><td>$0</td><td>$59,540</td><td>$29,785</td></tr><tr><th scope="row">Year 10</th><td>$43,058</td><td>$18,268</td><td>$0</td><td>$61,326</td><td>$28,406</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$351,156</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the extras-heavy lease is about $351,156. A second path lands near $342,781. That gap is a talking point, not a promise.</p>
                <p>Extras are already a big share here. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the extras-heavy lease</h3>
              <ul><li>Year 1 of the extras-heavy lease has rent of $33,000.</li><li>Shared building cost is $14,000.</li><li>A credit of $4,000 lowers the cash you pay that year.</li><li>Cash out this year is about $43,000. Extras are already a big share here.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $39,815 today.</li></ul>
              <ul><li>Next, year 2 rent is $33,990.</li><li>CAM, which is a shared building cost, is $14,420.</li><li>There is no credit in this year.</li><li>You pay about $48,410 this year after extras and credits. A cheap rent story would ignore this CAM line.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $41,504 today.</li></ul>
              <ul><li>Then year 3 rent is $35,010.</li><li>Extras for the building come to $14,853.</li><li>Credits skip this year.</li><li>The net cash this year is about $49,863. Escalation on extras matters too.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $39,583 today.</li></ul>
              <ul><li>After that, year 4 rent is $36,060.</li><li>The shared building cost this time is $15,298.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $51,358. A second city could change this more than rent.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $37,750 today.</li></ul>
              <ul><li>In year 5 of the extras-heavy lease, rent is $37,142.</li><li>Shared building cost is $15,757.</li><li>There is no credit in this year.</li><li>You pay about $52,899 this year after extras and credits. The last year still carries extras.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $36,002 today.</li></ul>
              <ul><li>Year 6 of the extras-heavy lease has rent of $38,256.</li><li>CAM, which is a shared building cost, is $16,230.</li><li>Credits skip this year.</li><li>The net cash this year is about $54,486. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $34,335 today.</li></ul>
              <ul><li>Next, year 7 rent is $39,404.</li><li>Extras for the building come to $16,717.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $56,121. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $32,746 today.</li></ul>
              <ul><li>Then year 8 rent is $40,586.</li><li>The shared building cost this time is $17,219.</li><li>There is no credit in this year.</li><li>You pay about $57,805 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $31,230 today.</li></ul>
              <ul><li>After that, year 9 rent is $41,804.</li><li>Shared building cost is $17,736.</li><li>Credits skip this year.</li><li>The net cash this year is about $59,540. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $29,785 today.</li></ul>
              <ul><li>In year 10 of the extras-heavy lease, rent is $43,058.</li><li>CAM, which is a shared building cost, is $18,268.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $61,326. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $28,406 today.</li></ul><p>Add those year values. The sample NPV for the extras-heavy lease is about $351,156. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the extras-heavy lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/compare-commercial-leases">See the comparison workflow</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample is a net-like stack for teaching.</li><li>A gross lease would move extras into rent. Restate before you compare.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Gross versus net is a structure choice. Restate before ranking.</p>
            <p>A cap on CAM is an extra term. Model it.</p>
            <p>Two locations add more than rent. Think labor and tax.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Comparing rent per foot across a gross deal and a net deal.</li><li>Using last year's CAM as if it cannot rise.</li><li>Forgetting insurance because it was on another page of the offer.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If extras flip the rank, lead with extras, not with rent.</p>
            <p>If extras are unknown, say the compare is incomplete.</p>
            <h2>Compare this to related metrics</h2>
            <p>Face rent is a subset.</p>
            <p>NPV of occupancy cost is the time-aware version of this hub.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This hub does not price utilities you have not listed.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>If both deals are truly full-service and extras are inside rent, say that and compare the rent path.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid pv-discovery-grid--balanced">
              <div data-discovery-group="START_HERE"><h3>Start here</h3><ul className="pv-question-row"><li><a href="/occupancy-costs/what-is-total-occupancy-cost/">What is total occupancy cost in a commercial lease?</a></li><li><a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">What is CAM in a commercial lease?</a></li><li><a href="/occupancy-costs/occupancy-cost-per-square-foot/">What is occupancy cost per square foot?</a></li><li><a href="/occupancy-costs/base-rent-vs-occupancy-cost/">What is the difference between base rent and occupancy cost?</a></li></ul></div><div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3><ul className="pv-question-row"><li><a href="/occupancy-costs/how-property-taxes-change-occupancy-cost/">How do property taxes change occupancy cost?</a></li><li><a href="/occupancy-costs/how-insurance-changes-occupancy-cost/">How does insurance change occupancy cost?</a></li></ul></div><div data-discovery-group="COMPARE_OPTIONS"><h3>Compare options</h3><ul className="pv-question-row"><li><a href="/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/">How do you compare occupancy cost on a gross lease and a net lease?</a></li></ul></div><div data-discovery-group="COMMON_MISTAKES"><h3>Common mistakes</h3><ul className="pv-question-row"><li><a href="/occupancy-costs/why-lowest-rent-can-cost-more/">Why can the lowest rent option have a higher occupancy cost?</a></li></ul></div><div data-discovery-group="GO_DEEPER"><h3>Go deeper</h3><ul className="pv-question-row"><li><a href="/occupancy-costs/hidden-occupancy-costs/">What hidden occupancy costs do tenants miss?</a></li><li><a href="/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/">How do CAM caps change occupancy-cost risk?</a></li></ul></div>
            </div>
            
          </div>
        </section><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-surface="EMPHASIS">
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
              <AuthorityRefs items={[{"href":"https://www.boma.org/","label":"BOMA"},{"href":"https://www.naiop.org/","label":"NAIOP"},{"href":"https://www.census.gov/programs-surveys/cbp.html","label":"U.S. Census Bureau — County Business Patterns"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/lease-comparison/","label":"Lease comparison","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/","label":"Credits and NPV","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/","label":"NPV hub","description":"A nearby page that helps finish this comparison."}]} />
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
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-total-occupancy-cost/" data-relationship="related" aria-label="What is total occupancy cost in a commercial lease. Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is total occupancy cost in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-cam-in-a-commercial-lease/" data-relationship="related" aria-label="What is CAM in a commercial lease. CAM means common area maintenance.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is CAM in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/hidden-occupancy-costs/" data-relationship="related" aria-label="What hidden occupancy costs do tenants miss. Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What hidden occupancy costs do tenants miss</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
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
