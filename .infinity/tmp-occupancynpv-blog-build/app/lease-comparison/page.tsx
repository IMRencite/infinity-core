import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Lease comparison",
  description: "Compare two or more commercial leases on the same timeline. See how free rent, TI money, term length, and start dates change the result.",
  alternates: { canonical: "/lease-comparison/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Lease comparison", description: "Compare two or more commercial leases on the same timeline. See how free rent, TI money, term length, and start dates change the result." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-comparison" role="EDUCATIONAL_HUB" pattern="EDUCATIONAL_HUB" cluster="lease-comparison">
        <JsonLdBlock data={SITE_SCHEMA["/lease-comparison"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-comparison","label":"How should you compare commercial leases?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease comparison</p>
            <h1 className="pv-display">How should you compare commercial leases?</h1>
            <div data-question-id="q_e578deb5627e10ff" data-answer-chunk-id="q_e578deb5627e10ff_chunk">
              <AnswerFirst question="How should you compare commercial leases?" answer="A fair compare is one timeline, the same extras, the same start idea, and the same discount rate. Then read the rank with the things the math cannot see." />
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
            <div data-question-id="exp_/lease-comparison_0" data-answer-chunk-id="exp_/lease-comparison_0_chunk">
              <AnswerFirst question="How do you compare two offers?" answer="A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate." />
            </div>
            <div data-question-id="exp_/lease-comparison_1" data-answer-chunk-id="exp_/lease-comparison_1_chunk">
              <AnswerFirst question="How do you normalize proposals?" answer="Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter." />
            </div>
            <div data-question-id="exp_/lease-comparison_2" data-answer-chunk-id="exp_/lease-comparison_2_chunk">
              <AnswerFirst question="How do you compare gross and net?" answer="A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill." />
            </div>
            <div data-question-id="exp_/lease-comparison_3" data-answer-chunk-id="exp_/lease-comparison_3_chunk">
              <AnswerFirst question="What belongs on the sheet?" answer="Dates, rent, extras, credits, options, and the rate should sit on one lease sheet before anyone names a winner." />
            </div>
            <p>Read <a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">How do you normalize commercial lease proposals?</a> when you need the next deep answer.</p>
            <p>Read <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">How do you compare a gross lease and a net lease?</a> when you need the next deep answer.</p>
            <p>Read <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison/">What belongs in a commercial lease comparison?</a> when you need the next deep answer.</p>
            <p>Read <a href="/lease-comparison/how-do-brokers-compare-lease-offers/">How do tenant-rep brokers compare lease offers?</a> when you need the next deep answer.</p>
            <p className="pv-spoke-index" data-expansion-spokes="true"><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals">How do you normalize commercial lease proposals?</a> · <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases">How do you compare a gross lease and a net lease?</a> · <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison">What belongs in a commercial lease comparison?</a> · <a href="/lease-comparison/how-do-brokers-compare-lease-offers">How do tenant-rep brokers compare lease offers?</a></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A lease comparison is a fair side-by-side of occupancy cash.</p>
            <p>Fair means the same costs are in or out for each option.</p>
            <p>NPV means net present value. It is one way to finish the compare after the timeline is honest.</p>
            <p>Face rent is the loud line. It is not the whole compare.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>A fair compare is one timeline, the same extras, the same start idea, and the same discount rate. Then read the rank with the things the math cannot see.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Landlords write offers in different shapes on purpose.</p>
            <p>Free rent, TI money, and steep steps can hide inside a pretty first year.</p>
            <p>A client deserves one picture, not three PDFs with different units.</p>
            <p>Brokers lose time when the compare lives in five tabs.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Landlords write offers in different shapes on purpose.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Collect rent, extras, credits, term, and start.</li><li>Line up commencement so year one means the first occupied year.</li><li>Place free rent and TI money in the year they happen.</li><li>Discount with one visible rate. Share a short summary.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Same cash rules + same rate + same occupancy window = a comparable NPV pair.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Rent path</th><td>Start rent and steps</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, insurance</td></tr><tr><th scope="row">Credits</th><td>Free rent and TI</td></tr><tr><th scope="row">Window</th><td>Term and start</td></tr></tbody></table></div>
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
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$347,504</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Option One</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$36,000</td><td>$33,480</td></tr><tr><th scope="row">Year-1 extras</th><td>$11,000</td><td>$11,770</td></tr><tr><th scope="row">Year-1 credit</th><td>$12,000</td><td>$6,600</td></tr><tr><th scope="row">Sample NPV</th><td>$347,504</td><td>$339,029</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Option One</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$36,000</td><td>$11,000</td><td>$12,000</td><td>$35,000</td><td>$32,407</td></tr><tr><th scope="row">Year 2</th><td>$37,260</td><td>$11,330</td><td>$0</td><td>$48,590</td><td>$41,658</td></tr><tr><th scope="row">Year 3</th><td>$38,564</td><td>$11,670</td><td>$0</td><td>$50,234</td><td>$39,877</td></tr><tr><th scope="row">Year 4</th><td>$39,914</td><td>$12,020</td><td>$0</td><td>$51,934</td><td>$38,173</td></tr><tr><th scope="row">Year 5</th><td>$41,311</td><td>$12,381</td><td>$0</td><td>$53,692</td><td>$36,542</td></tr><tr><th scope="row">Year 6</th><td>$42,550</td><td>$12,752</td><td>$0</td><td>$55,302</td><td>$34,850</td></tr><tr><th scope="row">Year 7</th><td>$43,827</td><td>$13,135</td><td>$0</td><td>$56,962</td><td>$33,237</td></tr><tr><th scope="row">Year 8</th><td>$45,142</td><td>$13,529</td><td>$0</td><td>$58,671</td><td>$31,698</td></tr><tr><th scope="row">Year 9</th><td>$46,496</td><td>$13,935</td><td>$0</td><td>$60,431</td><td>$30,231</td></tr><tr><th scope="row">Year 10</th><td>$47,891</td><td>$14,353</td><td>$0</td><td>$62,244</td><td>$28,831</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$347,504</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Option One is about $347,504. A second path lands near $339,029. That gap is a talking point, not a promise.</p>
                <p>Credits make year one look kind. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for Option One</h3>
              <ul><li>Year 1 of Option One has rent of $36,000.</li><li>Shared building cost is $11,000.</li><li>A credit of $12,000 lowers the cash you pay that year.</li><li>Cash out this year is about $35,000. Credits make year one look kind.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $32,407 today.</li></ul>
              <ul><li>Next, year 2 rent is $37,260.</li><li>CAM, which is a shared building cost, is $11,330.</li><li>There is no credit in this year.</li><li>You pay about $48,590 this year after extras and credits. The real bill shows up when credits end.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $41,658 today.</li></ul>
              <ul><li>Then year 3 rent is $38,564.</li><li>Extras for the building come to $11,670.</li><li>Credits skip this year.</li><li>The net cash this year is about $50,234. Steps keep lifting the later years.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $39,877 today.</li></ul>
              <ul><li>After that, year 4 rent is $39,914.</li><li>The shared building cost this time is $12,020.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $51,934. A second option may look worse now and better later.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $38,173 today.</li></ul>
              <ul><li>In year 5 of Option One, rent is $41,311.</li><li>Shared building cost is $12,381.</li><li>There is no credit in this year.</li><li>You pay about $53,692 this year after extras and credits. The compare is about the whole path.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $36,542 today.</li></ul>
              <ul><li>Year 6 of Option One has rent of $42,550.</li><li>CAM, which is a shared building cost, is $12,752.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,302. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $34,850 today.</li></ul>
              <ul><li>Next, year 7 rent is $43,827.</li><li>Extras for the building come to $13,135.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $56,962. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $33,237 today.</li></ul>
              <ul><li>Then year 8 rent is $45,142.</li><li>The shared building cost this time is $13,529.</li><li>There is no credit in this year.</li><li>You pay about $58,671 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $31,698 today.</li></ul>
              <ul><li>After that, year 9 rent is $46,496.</li><li>Shared building cost is $13,935.</li><li>Credits skip this year.</li><li>The net cash this year is about $60,431. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $30,231 today.</li></ul>
              <ul><li>In year 10 of Option One, rent is $47,891.</li><li>CAM, which is a shared building cost, is $14,353.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $62,244. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $28,831 today.</li></ul><p>Add those year values. The sample NPV for Option One is about $347,504. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Option One is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">See a worked comparison</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Two options would use this same table shape.</li><li>The sample is office-like. Industrial uses the same idea with different extras.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Different start dates need a shared first occupied month.</p>
            <p>Renewal rights are extra cases.</p>
            <p>Expansion rights are extra cases too.</p>
            <p>A second city adds labor and tax, not just rent.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Comparing rent per foot while one deal is gross and one is net.</li><li>Leaving free rent off the cheap-looking offer.</li><li>Using different rates so the favorite wins.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the cheaper NPV also fits, the cash case is clean.</p>
            <p>If it does not fit, keep the cash and say the fit problem.</p>
            <h2>Compare this to related metrics</h2>
            <p>A CRM stores contacts. It does not finish this compare.</p>
            <p>A spreadsheet can do it if the rules stay visible.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This hub does not run your live file.</li><li>It is a validation teaching surface.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not compare a 3-year stay to a 15-year stay without saying the extra years are extra years.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid pv-discovery-grid--balanced">
              <div data-discovery-group="START_HERE"><h3>Start here</h3><ul className="pv-question-row"><li><a href="/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/">What questions should a business ask before signing a commercial lease?</a></li></ul></div><div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3><ul className="pv-question-row"><li><a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">How do you compare two commercial lease proposals?</a></li><li><a href="/lease-comparison/how-do-you-compare-different-lease-terms/">How do you compare leases with different term lengths?</a></li><li><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">How do you normalize commercial lease proposals?</a></li><li><a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">How do you compare a gross lease and a net lease?</a></li><li><a href="/lease-comparison/how-do-cam-charges-change-a-comparison/">How do CAM charges change a lease comparison?</a></li></ul></div><div data-discovery-group="COMPARE_OPTIONS"><h3>Compare options</h3><ul className="pv-question-row"><li><a href="/lease-comparison/how-do-brokers-compare-lease-offers/">How do tenant-rep brokers compare lease offers?</a></li></ul></div><div data-discovery-group="GO_DEEPER"><h3>Go deeper</h3><ul className="pv-question-row"><li><a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">How do free rent periods and tenant improvement allowances affect NPV?</a></li><li><a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison/">What belongs in a commercial lease comparison?</a></li></ul></div>
            </div>
            <div className="pv-discovery-band" data-hub-role-band="true"><div data-hub-role-band="true" data-discovery-group="FOR_YOUR_ROLE"><h3>For your role</h3><ul className="pv-question-row"><li><a href="/lease-comparison/how-do-cfos-review-lease-comparisons/">How do CFOs review commercial lease comparisons?</a></li></ul></div></div>
          </div>
        </section><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options">How do you compare two commercial lease proposals?</a> · <a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv">How do free rent periods and tenant improvement allowances affect NPV?</a> · <a href="/lease-comparison/how-do-you-compare-different-lease-terms">How do you compare leases with different term lengths?</a></p>
            
          </div>
        </section>
        <div className="vg-container pv-hoisted-light-modules">
        <section className="pv-source-board pv-wide-module" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
              
        
        <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={[{"href":"https://www.naiop.org/","label":"NAIOP"},{"href":"https://www.boma.org/","label":"BOMA"},{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/lease-comparison/how-do-you-compare-two-commercial-lease-options/","label":"How to compare two options","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/","label":"Free rent and TI","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/how-do-you-compare-different-lease-terms/","label":"Different term lengths","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/how-do-you-compare-two-commercial-lease-options","label":"How do you compare two commercial lease proposals?","description":"A question page in this same topic. Read it when you need the next definition."}]} />
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
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/" data-relationship="related" aria-label="How do you compare two commercial lease proposals. Put both leases on one timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you compare two commercial lease proposals</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/" data-relationship="related" aria-label="How do free rent periods and tenant improvement allowances affect NPV. Free rent and TI money change when cash moves.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do free rent periods and tenant improvement allowances affect NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-different-lease-terms/" data-relationship="related" aria-label="How do you compare leases with different term lengths. A five-year lease and a ten-year lease are not the same product.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you compare leases with different term lengths</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
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
