import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Commercial lease NPV",
  description: "Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.",
  alternates: { canonical: "/commercial-lease-npv/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Commercial lease NPV", description: "Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/commercial-lease-npv" role="EDUCATIONAL_HUB" pattern="EDUCATIONAL_HUB" cluster="commercial-lease-npv">
        <JsonLdBlock data={SITE_SCHEMA["/commercial-lease-npv"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/commercial-lease-npv","label":"What is commercial lease NPV?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">commercial lease npv</p>
            <h1 className="pv-display">What is commercial lease NPV?</h1>
            <div data-question-id="q_abe7549fcbf9d2eb" data-answer-chunk-id="q_abe7549fcbf9d2eb_chunk">
              <AnswerFirst question="What is commercial lease NPV?" answer="NPV is net present value. For a lease, it turns later rent and other costs into today's dollars so you can compare options on one scale." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">See How the Workflow Works</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/commercial-lease-npv_0" data-answer-chunk-id="exp_/commercial-lease-npv_0_chunk">
              <AnswerFirst question="Why use NPV on a lease?" answer="NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv_1" data-answer-chunk-id="exp_/commercial-lease-npv_1_chunk">
              <AnswerFirst question="Is lower NPV always better?" answer="A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv_2" data-answer-chunk-id="exp_/commercial-lease-npv_2_chunk">
              <AnswerFirst question="What costs belong in the walk?" answer="Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv_3" data-answer-chunk-id="exp_/commercial-lease-npv_3_chunk">
              <AnswerFirst question="How do you explain it?" answer="A broker should say NPV is the price of the lease today, then show the years, the extras, and the rate." />
            </div>
            <p>Read <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">How is lease NPV calculated?</a> when you need the next deep answer.</p>
            <p>Read <a href="/commercial-lease-npv/what-costs-belong-in-lease-npv/">What costs belong in commercial lease NPV?</a> when you need the next deep answer.</p>
            <p>Read <a href="/commercial-lease-npv/npv-vs-present-value/">What is the difference between NPV and present value in a lease?</a> when you need the next deep answer.</p>
            <p>Read <a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients/">How should you explain lease NPV to a client?</a> when you need the next deep answer.</p>
            <p className="pv-spoke-index" data-expansion-spokes="true"><a href="/commercial-lease-npv/how-is-lease-npv-calculated">How is lease NPV calculated?</a> · <a href="/commercial-lease-npv/what-costs-belong-in-lease-npv">What costs belong in commercial lease NPV?</a> · <a href="/commercial-lease-npv/npv-vs-present-value">What is the difference between NPV and present value in a lease?</a> · <a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients">How should you explain lease NPV to a client?</a></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>NPV means net present value. It is a way to add money that does not all arrive at the same time.</p>
            <p>A dollar you pay next year is not the same as a dollar you pay today. You could use today's dollar now.</p>
            <p>So we shrink later cash a little. That shrink is the time value of money.</p>
            <p>In a commercial lease, cash is rent, shared building cost, taxes, and credits like free rent or build-out money.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>NPV is net present value. For a lease, it turns later rent and other costs into today's dollars so you can compare options on one scale.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Brokers often see two offers with different rent, free months, and build-out checks.</p>
            <p>If you only look at first-year rent, you can pick the wrong one.</p>
            <p>NPV puts every cash event on one timeline. Then you can talk about the gap, not the brochure.</p>
            <p>A client can see why a higher face rent can still win after credits.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Brokers often see two offers with different rent, free months, and build-out checks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>List the cash you pay or receive in each year of the term.</li><li>Subtract credits in the year they actually happen.</li><li>Pick one discount rate and keep it visible.</li><li>Shrink each later year. Add the year values. That sum is NPV.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. NPV = year 1 cash / (1 + rate) + year 2 cash / (1 + rate)^2 + later years in the same way.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>The first-year rent before extras</td></tr><tr><th scope="row">Term</th><td>How many years the lease runs</td></tr><tr><th scope="row">CAM and other extras</th><td>Shared building cost, tax, and insurance if the tenant pays them</td></tr><tr><th scope="row">Credits</th><td>Free rent and tenant improvement money</td></tr><tr><th scope="row">Discount rate</th><td>How hard you shrink later cash</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$42,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$39,060</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$363,861</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Lease A sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,060</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,400</td><td>$8,988</td></tr><tr><th scope="row">Year-1 credit</th><td>$18,000</td><td>$9,900</td></tr><tr><th scope="row">Sample NPV</th><td>$363,861</td><td>$353,604</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Lease A sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$42,000</td><td>$8,400</td><td>$18,000</td><td>$32,400</td><td>$30,000</td></tr><tr><th scope="row">Year 2</th><td>$43,260</td><td>$8,652</td><td>$0</td><td>$51,912</td><td>$44,506</td></tr><tr><th scope="row">Year 3</th><td>$44,558</td><td>$8,912</td><td>$0</td><td>$53,470</td><td>$42,446</td></tr><tr><th scope="row">Year 4</th><td>$45,895</td><td>$9,179</td><td>$0</td><td>$55,074</td><td>$40,481</td></tr><tr><th scope="row">Year 5</th><td>$47,271</td><td>$9,454</td><td>$0</td><td>$56,725</td><td>$38,606</td></tr><tr><th scope="row">Year 6</th><td>$48,689</td><td>$9,738</td><td>$0</td><td>$58,427</td><td>$36,819</td></tr><tr><th scope="row">Year 7</th><td>$50,150</td><td>$10,030</td><td>$0</td><td>$60,180</td><td>$35,114</td></tr><tr><th scope="row">Year 8</th><td>$51,655</td><td>$10,331</td><td>$0</td><td>$61,986</td><td>$33,489</td></tr><tr><th scope="row">Year 9</th><td>$53,205</td><td>$10,641</td><td>$0</td><td>$63,846</td><td>$31,939</td></tr><tr><th scope="row">Year 10</th><td>$54,801</td><td>$10,960</td><td>$0</td><td>$65,761</td><td>$30,460</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$363,861</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Lease A sample is about $363,861. A second path lands near $353,604. That gap is a talking point, not a promise.</p>
                <p>Free rent and a build-out check land here. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for Lease A sample</h3>
              <ul><li>Year 1 of Lease A sample has rent of $42,000.</li><li>Shared building cost is $8,400.</li><li>A credit of $18,000 lowers the cash you pay that year.</li><li>Cash out this year is about $32,400. Free rent and a build-out check land here.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $30,000 today.</li></ul>
              <ul><li>Next, year 2 rent is $43,260.</li><li>CAM, which is a shared building cost, is $8,652.</li><li>There is no credit in this year.</li><li>You pay about $51,912 this year after extras and credits. Rent steps up and the credit is gone.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $44,506 today.</li></ul>
              <ul><li>Then year 3 rent is $44,558.</li><li>Extras for the building come to $8,912.</li><li>Credits skip this year.</li><li>The net cash this year is about $53,470. The step-up is still small, but it compounds.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $42,446 today.</li></ul>
              <ul><li>After that, year 4 rent is $45,895.</li><li>The shared building cost this time is $9,179.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $55,074. Later cash is worth less today than year-one cash.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,481 today.</li></ul>
              <ul><li>In year 5 of Lease A sample, rent is $47,271.</li><li>Shared building cost is $9,454.</li><li>There is no credit in this year.</li><li>You pay about $56,725 this year after extras and credits. This last year still counts. Do not drop it.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $38,606 today.</li></ul>
              <ul><li>Year 6 of Lease A sample has rent of $48,689.</li><li>CAM, which is a shared building cost, is $9,738.</li><li>Credits skip this year.</li><li>The net cash this year is about $58,427. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $36,819 today.</li></ul>
              <ul><li>Next, year 7 rent is $50,150.</li><li>Extras for the building come to $10,030.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $60,180. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,114 today.</li></ul>
              <ul><li>Then year 8 rent is $51,655.</li><li>The shared building cost this time is $10,331.</li><li>There is no credit in this year.</li><li>You pay about $61,986 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $33,489 today.</li></ul>
              <ul><li>After that, year 9 rent is $53,205.</li><li>Shared building cost is $10,641.</li><li>Credits skip this year.</li><li>The net cash this year is about $63,846. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $31,939 today.</li></ul>
              <ul><li>In year 10 of Lease A sample, rent is $54,801.</li><li>CAM, which is a shared building cost, is $10,960.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $65,761. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,460 today.</li></ul><p>Add those year values. The sample NPV for Lease A sample is about $363,861. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Lease A sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">Read what NPV means</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample uses a five-year office term.</li><li>The rate is 8 percent because it is easy to see, not because it is your firm's rate.</li><li>Credits hit in year one. If your deal pays later, move them.</li><li>No percentage rent is in this sample.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A month-to-month holdover is not the same as a clean term.</p>
            <p>If commencement dates differ, line the first occupied month up, not the brochure date.</p>
            <p>If one option has a renewal, treat the renewal as a second case, not a hidden extra year.</p>
            <p>Industrial yards and office towers can share this math. The inputs still change.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Adding ten years of rent with no shrink treats year ten like year one.</li><li>Leaving CAM out can make a cheap face rent look like a win.</li><li>Putting TI money in the wrong year changes the NPV a lot.</li><li>Changing the rate after you see the winner is a story problem, not a math problem.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>Use NPV to rank known cash. Do not use it to hide a bad location.</p>
            <p>Write the rate, the credits, and what you left out on the same page.</p>
            <p>If two NPVs are close, talk about operations, not a fake precise winner.</p>
            <h2>Compare this to related metrics</h2>
            <p>Total undiscounted cost is easier, but it ignores time.</p>
            <p>Effective rent makes one average. It can hide when cash moves.</p>
            <p>A cap rate is a different market shorthand. It is not this occupancy tool.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>NPV does not score culture, access, or brand.</li><li>It does not replace a lawyer reading the lease.</li><li>It does not prove a product has customers.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not let NPV pick a site that cannot house the team.</li><li>Do not use it when the term is so short that time barely matters and you have not listed the cash.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid pv-discovery-grid--balanced">
              <div data-discovery-group="START_HERE"><h3>Start here</h3><ul className="pv-question-row"><li><a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">What is NPV in a commercial lease?</a></li><li><a href="/commercial-lease-npv/npv-vs-present-value/">What is the difference between NPV and present value in a lease?</a></li><li><a href="/commercial-lease-npv/why-use-npv-when-comparing-leases/">Why use NPV when comparing commercial leases?</a></li></ul></div><div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3><ul className="pv-question-row"><li><a href="/commercial-lease-npv/how-is-lease-npv-calculated/">How is lease NPV calculated?</a></li><li><a href="/commercial-lease-npv/should-cam-be-in-lease-npv/">Should CAM be included in lease NPV?</a></li></ul></div><div data-discovery-group="COMPARE_OPTIONS"><h3>Compare options</h3><ul className="pv-question-row"><li><a href="/commercial-lease-npv/npv-vs-total-lease-cost/">Why do NPV and total lease cost differ?</a></li></ul></div><div data-discovery-group="COMMON_MISTAKES"><h3>Common mistakes</h3><ul className="pv-question-row"><li><a href="/commercial-lease-npv/when-is-npv-the-wrong-metric/">When is NPV the wrong metric?</a></li></ul></div><div data-discovery-group="GO_DEEPER"><h3>Go deeper</h3><ul className="pv-question-row"><li><a href="/commercial-lease-npv/what-discount-rate-should-you-use/">What discount rate should be used for commercial lease NPV?</a></li><li><a href="/commercial-lease-npv/what-costs-belong-in-lease-npv/">What costs belong in commercial lease NPV?</a></li></ul></div>
            </div>
            <div className="pv-discovery-band" data-hub-role-band="true"><div data-hub-role-band="true" data-discovery-group="FOR_YOUR_ROLE"><h3>For your role</h3><ul className="pv-question-row"><li><a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients/">How should you explain lease NPV to a client?</a></li></ul></div></div>
          </div>
        </section><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </div>
            <p className="pv-spoke-index"><a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease">What is NPV in a commercial lease?</a> · <a href="/commercial-lease-npv/what-discount-rate-should-you-use">What discount rate should be used for commercial lease NPV?</a> · <a href="/commercial-lease-npv/when-is-npv-the-wrong-metric">When is NPV the wrong metric?</a></p>
            
          </div>
        </section>
        <div className="vg-container pv-hoisted-light-modules">
        <section className="pv-source-board pv-wide-module" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
              
        
        <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.naiop.org/","label":"NAIOP"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease/","label":"What is NPV in a commercial lease?","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/what-discount-rate-should-you-use/","label":"What discount rate should you use?","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/","label":"Lease comparison hub","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease","label":"What is NPV in a commercial lease?","description":"A question page in this same topic. Read it when you need the next definition."}]} />
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
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Turn the topic into a repeatable path.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Workflow</span><strong>See the workflow</strong><span className="sn-desc">Follow the steps before you pick a number.</span></span>
            </a>
            </div>
          </nav>
        </div>
        </section>
        <p className="pv-surface"><a href="/commercial-lease-npv/how-is-cap-rate-calculated/">How is cap rate calculated?</a></p>
        <p className="pv-surface"><a href="/blog/">How is cap rate calculated?</a></p>
        <p className="pv-surface"><a href="/blog/valuation/how-interest-rates-affect-commercial-property-values/">How is cap rate calculated?</a></p>
        <p className="pv-surface"><a href="/blog/category/valuation/">How is cap rate calculated?</a></p>
        <p className="pv-surface"><a href="/blog/tag/">How is cap rate calculated?</a></p>
        <p className="pv-surface"><a href="/blog/tag/cap-rates/">How is cap rate calculated?</a></p>
        <p className="pv-surface"><a href="/blog/tag/commercial-real-estate/">How is cap rate calculated?</a></p>
        <p className="pv-surface"><a href="/blog/tag/interest-rates/">How is cap rate calculated?</a></p>
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
