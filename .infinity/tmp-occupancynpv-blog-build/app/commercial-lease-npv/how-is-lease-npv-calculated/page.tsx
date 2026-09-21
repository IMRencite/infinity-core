import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How is lease NPV calculated?",
  description: "Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year values.",
  alternates: { canonical: "/commercial-lease-npv/how-is-lease-npv-calculated/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How is lease NPV calculated?", description: "Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year values." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/commercial-lease-npv/how-is-lease-npv-calculated" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="commercial-lease-npv">
        <JsonLdBlock data={SITE_SCHEMA["/commercial-lease-npv/how-is-lease-npv-calculated"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/commercial-lease-npv","label":"Commercial lease NPV"},{"href":"/commercial-lease-npv/how-is-lease-npv-calculated","label":"How is lease NPV calculated?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">commercial lease npv</p>
            <h1 className="pv-display">How is lease NPV calculated?</h1>
            <div data-question-id="q_2571ee62b3a6a232" data-answer-chunk-id="q_2571ee62b3a6a232_chunk">
              <AnswerFirst question="How is lease NPV calculated?" answer="List cash by year, subtract credits in the year they land, pick one visible rate, then add the shrunk year values." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/compare-commercial-leases">See a worked comparison</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_e86dcc4e4a4daaf5" data-answer-chunk-id="q_e86dcc4e4a4daaf5_0" data-supporting-section="define">
              <AnswerFirst question="What does NPV mean?" answer="NPV means net present value. It turns later lease cash into today's dollars." />
            </div>
            <div data-question-id="q_9b8f3ac5c5e26cb3" data-answer-chunk-id="q_9b8f3ac5c5e26cb3_1" data-supporting-section="define">
              <AnswerFirst question="Why does the year list come first?" answer="You cannot shrink cash you have not written down. The list is the model." />
            </div>
            <div data-question-id="q_900ab08a5c311a76" data-answer-chunk-id="q_900ab08a5c311a76_2" data-supporting-section="define">
              <AnswerFirst question="What discount rate should you use?" answer="Pick one visible rate and keep it the same on every option. Then test nearby rates." />
            </div>
            <div data-question-id="q_68f2a3aab1fe9059" data-answer-chunk-id="q_68f2a3aab1fe9059_3" data-supporting-section="define">
              <AnswerFirst question="Does lower NPV always win?" answer="No. A lower NPV can hide a worse location or a missing extra." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>NPV means net present value. It is a sum of later cash after you shrink each year.</p>
            <p>You do not start with a slogan. You start with a cash list.</p>
            <p>Write rent, extras, and credits in the year they move.</p>
            <p>Then pick one discount rate. The discount rate is the price of waiting.</p>
            <p>Shrink each later year. Add those year values. That sum is NPV.</p>
            <p>Keep the rate on the page so a client can challenge it.</p>
            <p>This page sits under <a href="/commercial-lease-npv/">Commercial lease NPV</a>.</p>
            <p>The <a href="/commercial-lease-npv/what-discount-rate-should-you-use/">discount rate</a> is the price of waiting. Show it.</p>
            <p>Put <a href="/occupancy-costs/">occupancy costs</a> on the same list as rent.</p>
            <p>Time <a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">free rent and TI</a> in the year they actually move.</p>
            <p>After the sum, run <a href="/lease-sensitivity-analysis/">sensitivity analysis</a> on the rate.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>List cash by year, subtract credits in the year they land, pick one visible rate, then add the shrunk year values.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Two offers can look close on first-year rent and still sit far apart after time.</p>
            <p>A credit in year one is worth more than the same credit in year four.</p>
            <p>If you skip the year list, you guess.</p>
            <p>Brokers need a walk a CFO can audit.</p>
            <p>The walk also shows which year actually drives the gap.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Two offers can look close on first-year rent and still sit far apart after time.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Capture start rent, term, extras, and credits.</li><li>Place each item on one timeline.</li><li>Subtract a credit in the year it actually pays.</li><li>Choose one rate and hold it still for both options.</li><li>Divide later cash by one plus the rate, raised to the year number.</li><li>Add the year values and read the gap with care.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. NPV = year 1 cash / (1 + rate) + year 2 cash / (1 + rate)^2 + later years in the same way.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>First-year rent before extras</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, and insurance the tenant pays</td></tr><tr><th scope="row">Credits</th><td>Free rent and build-out money</td></tr><tr><th scope="row">Term</th><td>How many years the cash list runs</td></tr><tr><th scope="row">Discount rate</th><td>How hard you shrink later cash</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$41,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$38,130</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$356,652</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Calculation sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$41,000</td><td>$38,130</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,200</td><td>$8,774</td></tr><tr><th scope="row">Year-1 credit</th><td>$16,000</td><td>$8,800</td></tr><tr><th scope="row">Sample NPV</th><td>$356,652</td><td>$345,983</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Calculation sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$41,000</td><td>$8,200</td><td>$16,000</td><td>$33,200</td><td>$30,741</td></tr><tr><th scope="row">Year 2</th><td>$42,230</td><td>$8,446</td><td>$0</td><td>$50,676</td><td>$43,447</td></tr><tr><th scope="row">Year 3</th><td>$43,497</td><td>$8,699</td><td>$0</td><td>$52,196</td><td>$41,435</td></tr><tr><th scope="row">Year 4</th><td>$44,802</td><td>$8,960</td><td>$0</td><td>$53,762</td><td>$39,517</td></tr><tr><th scope="row">Year 5</th><td>$46,146</td><td>$9,229</td><td>$0</td><td>$55,375</td><td>$37,687</td></tr><tr><th scope="row">Year 6</th><td>$47,530</td><td>$9,506</td><td>$0</td><td>$57,036</td><td>$35,942</td></tr><tr><th scope="row">Year 7</th><td>$48,956</td><td>$9,791</td><td>$0</td><td>$58,747</td><td>$34,278</td></tr><tr><th scope="row">Year 8</th><td>$50,425</td><td>$10,085</td><td>$0</td><td>$60,510</td><td>$32,692</td></tr><tr><th scope="row">Year 9</th><td>$51,938</td><td>$10,388</td><td>$0</td><td>$62,326</td><td>$31,179</td></tr><tr><th scope="row">Year 10</th><td>$53,496</td><td>$10,700</td><td>$0</td><td>$64,196</td><td>$29,735</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$356,652</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Calculation sample is about $356,652. A second path lands near $345,983. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Calculation sample</h3>
              <ul><li>Year 1 of Calculation sample has rent of $41,000.</li><li>Shared building cost is $8,200.</li><li>A credit of $16,000 lowers the cash you pay that year.</li><li>Cash out this year is about $33,200. A free-rent credit lands here.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $30,741 today.</li></ul>
              <ul><li>Next, year 2 rent is $42,230.</li><li>CAM, which is a shared building cost, is $8,446.</li><li>There is no credit in this year.</li><li>You pay about $50,676 this year after extras and credits. Rent steps up and the credit is gone.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,447 today.</li></ul>
              <ul><li>Then year 3 rent is $43,497.</li><li>Extras for the building come to $8,699.</li><li>Credits skip this year.</li><li>The net cash this year is about $52,196. The step still compounds.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $41,435 today.</li></ul>
              <ul><li>After that, year 4 rent is $44,802.</li><li>The shared building cost this time is $8,960.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $53,762. Later cash is smaller in today's dollars.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $39,517 today.</li></ul>
              <ul><li>In year 5 of Calculation sample, rent is $46,146.</li><li>Shared building cost is $9,229.</li><li>There is no credit in this year.</li><li>You pay about $55,375 this year after extras and credits. The last year still belongs in the sum.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $37,687 today.</li></ul>
              <ul><li>Year 6 of Calculation sample has rent of $47,530.</li><li>CAM, which is a shared building cost, is $9,506.</li><li>Credits skip this year.</li><li>The net cash this year is about $57,036. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $35,942 today.</li></ul>
              <ul><li>Next, year 7 rent is $48,956.</li><li>Extras for the building come to $9,791.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $58,747. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $34,278 today.</li></ul>
              <ul><li>Then year 8 rent is $50,425.</li><li>The shared building cost this time is $10,085.</li><li>There is no credit in this year.</li><li>You pay about $60,510 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $32,692 today.</li></ul>
              <ul><li>After that, year 9 rent is $51,938.</li><li>Shared building cost is $10,388.</li><li>Credits skip this year.</li><li>The net cash this year is about $62,326. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $31,179 today.</li></ul>
              <ul><li>In year 10 of Calculation sample, rent is $53,496.</li><li>CAM, which is a shared building cost, is $10,700.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $64,196. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $29,735 today.</li></ul><p>Add those year values. The sample NPV for Calculation sample is about $356,652. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Calculation sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/commercial-lease-npv/what-discount-rate-should-you-use/">Read how to pick a rate</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample uses a five-year office term.</li><li>The rate is 8 percent so the shrink is easy to see.</li><li>Credits hit in year one.</li><li>No percentage rent sits in this walk.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A mid-year start needs a stub period, not a fake full year.</p>
            <p>A holdover month is not the same as a clean term.</p>
            <p>A credit that pays in year two must move to year two.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Adding all years at face value and calling that NPV.</li><li>Leaving CAM off a net lease.</li><li>Using a different rate on each option.</li><li>Dropping the last year because it looks small.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>Use the walk to talk about the gap, not to hide a location problem.</p>
            <p>If the gap is small, show a second rate.</p>
            <p>If one path wins only from a mistimed credit, start over.</p>
            <h2>Compare this to related metrics</h2>
            <p>Effective rent averages. NPV keeps the timing visible.</p>
            <p>Total cash ignores waiting. NPV prices waiting.</p>
            <p>See how <a href="/effective-rent/effective-rent-vs-npv/">effective rent and NPV differ</a> when the same cash list is used both ways.</p>
            <aside className="pv-callout ed-highlight" data-callout="FOR_TENANT_REP"><h3>For tenant-rep brokers</h3><p>Walk the years out loud. Do not jump to the total.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>The number does not score daylight, transit, or floor plate.</li><li>The number does not replace a legal read.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not let NPV pick a space the team cannot use.</li><li>Do not use it as the only slide when options are not yet on one timeline.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/commercial-lease-npv/what-costs-belong-in-lease-npv">What costs belong in commercial lease NPV?</a> · <a href="/commercial-lease-npv/npv-vs-present-value">What is the difference between NPV and present value in a lease?</a> · <a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients">How should you explain lease NPV to a client?</a></p>
            
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
            <RelatedContent items={[{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease/","label":"What is NPV in a commercial lease?","description":"Start with the plain definition."}]} /></div>
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/commercial-lease-npv/what-costs-belong-in-lease-npv/","label":"What costs belong in lease NPV?","description":"See which extras belong on the list."}]} /></div>
            <div className="pv-related-family"><h3>Use this in a comparison</h3>
            <RelatedContent items={[{"href":"/lease-comparison/how-do-you-compare-two-commercial-lease-options/","label":"Compare two commercial lease options","description":"Put two walks on one page."}]} /></div>
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
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-discount-rate-should-you-use/" data-relationship="related" aria-label="What discount rate should be used for commercial lease NPV. The discount rate is the price of waiting.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What discount rate should be used for commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/when-is-npv-the-wrong-metric/" data-relationship="related" aria-label="When is NPV the wrong metric. NPV is a consistency tool, not a complete decision.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>When is NPV the wrong metric</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
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
