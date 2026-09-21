import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What are common lease-analysis mistakes?",
  description: "Most bad comparisons hide a missing cost or a hidden assumption. Learn the mistakes that flip a ranking and how to catch them.",
  alternates: { canonical: "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What are common lease-analysis mistakes?", description: "Most bad comparisons hide a missing cost or a hidden assumption. Learn the mistakes that flip a ranking and how to catch them." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-financial-modeling/what-are-common-lease-analysis-mistakes" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-financial-modeling">
        <JsonLdBlock data={SITE_SCHEMA["/lease-financial-modeling/what-are-common-lease-analysis-mistakes"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-financial-modeling","label":"Lease financial modeling"},{"href":"/lease-financial-modeling/what-are-common-lease-analysis-mistakes","label":"What are common lease-analysis mistakes?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease financial modeling</p>
            <h1 className="pv-display">What are common lease-analysis mistakes?</h1>
            <div data-question-id="q_d8af5c231e434a8a" data-answer-chunk-id="q_d8af5c231e434a8a_chunk">
              <AnswerFirst question="What are common lease-analysis mistakes?" answer="The common lease-analysis mistake is a missing extra, a credit in the wrong year, a private rate, a mixed term, or a summary that hides leftovers. Any one of these can flip a rank." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_0" data-answer-chunk-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_0_chunk">
              <AnswerFirst question="What mistake shows up first?" answer="A wrong end date or a missing free-rent month should be the first lease-model miss a tenant hunts." />
            </div>
            <div data-question-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_1" data-answer-chunk-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_1_chunk">
              <AnswerFirst question="What about hardcoded years?" answer="A hardcoded later year does not move when the bump changes, so the lease file starts to lie." />
            </div>
            <div data-question-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_2" data-answer-chunk-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_2_chunk">
              <AnswerFirst question="What about two lists?" answer="NPV and effective rent should read from one lease list. Two pastes do not stay honest. A tenant should keep this lease answer visible on the same page." />
            </div>
            <div data-question-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_3" data-answer-chunk-id="exp_/lease-financial-modeling/what-are-common-lease-analysis-mistakes_3_chunk">
              <AnswerFirst question="When do you stop ranking?" answer="A tenant should stop ranking a lease when a check fails or an extra is still unknown. A tenant should keep this lease answer visible on the same page." />
            </div>
            <p>This question sits on the <a href="/lease-financial-modeling/">lease-financial-modeling</a> hub.</p>
            <p>See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.</p>
            <p>The <a href="/how-it-works">how it works</a> page shows the four-step path.</p>
            <p>Go deeper on <a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">What inputs belong in a commercial lease model?</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A mistake here is a broken rule, not a rounding slip.</p>
            <p>NPV means net present value. It will faithfully rank a bad list.</p>
            <p>That is why the list matters more than the button.</p>
            <p>A pretty chart cannot save a missing CAM line.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>The common lease-analysis mistake is a missing extra, a credit in the wrong year, a private rate, a mixed term, or a summary that hides leftovers. Any one of these can flip a rank.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>These mistakes show up in real packets.</p>
            <p>They waste a second cycle with the client.</p>
            <p>They can also pick the wrong site.</p>
            <p>Naming them is cheaper than repeating them.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>These mistakes show up in real packets.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Review extras, credit timing, the rate, the term window, and the leftovers.</li><li>If any check fails, do not publish the rank.</li><li>Write the fail in the open.</li><li>Then fix the row and rerun.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. No rank until extras, credits, rate, window, and leftovers are visible.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Extras present</th><td>Yes or no</td></tr><tr><th scope="row">Credit year</th><td>Matches the deal</td></tr><tr><th scope="row">Shared rate</th><td>Yes or no</td></tr><tr><th scope="row">Shared window</th><td>Yes or no</td></tr></tbody></table></div>
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
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$387,344</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the mistake-check lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,060</td></tr><tr><th scope="row">Year-1 extras</th><td>$10,200</td><td>$10,914</td></tr><tr><th scope="row">Year-1 credit</th><td>$13,000</td><td>$7,150</td></tr><tr><th scope="row">Sample NPV</th><td>$387,344</td><td>$375,585</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the mistake-check lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$42,000</td><td>$10,200</td><td>$13,000</td><td>$39,200</td><td>$36,296</td></tr><tr><th scope="row">Year 2</th><td>$43,512</td><td>$10,506</td><td>$0</td><td>$54,018</td><td>$46,312</td></tr><tr><th scope="row">Year 3</th><td>$45,078</td><td>$10,821</td><td>$0</td><td>$55,899</td><td>$44,374</td></tr><tr><th scope="row">Year 4</th><td>$46,701</td><td>$11,146</td><td>$0</td><td>$57,847</td><td>$42,519</td></tr><tr><th scope="row">Year 5</th><td>$48,383</td><td>$11,480</td><td>$0</td><td>$59,863</td><td>$40,742</td></tr><tr><th scope="row">Year 6</th><td>$49,834</td><td>$11,824</td><td>$0</td><td>$61,658</td><td>$38,855</td></tr><tr><th scope="row">Year 7</th><td>$51,329</td><td>$12,179</td><td>$0</td><td>$63,508</td><td>$37,056</td></tr><tr><th scope="row">Year 8</th><td>$52,869</td><td>$12,544</td><td>$0</td><td>$65,413</td><td>$35,341</td></tr><tr><th scope="row">Year 9</th><td>$54,455</td><td>$12,920</td><td>$0</td><td>$67,375</td><td>$33,704</td></tr><tr><th scope="row">Year 10</th><td>$56,089</td><td>$13,308</td><td>$0</td><td>$69,397</td><td>$32,144</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$387,344</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the mistake-check lease is about $387,344. A second path lands near $375,585. That gap is a talking point, not a promise.</p>
                <p>A wrong credit year would distort this row. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the mistake-check lease</h3>
              <ul><li>Year 1 of the mistake-check lease has rent of $42,000.</li><li>Shared building cost is $10,200.</li><li>A credit of $13,000 lowers the cash you pay that year.</li><li>Cash out this year is about $39,200. A wrong credit year would distort this row.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $36,296 today.</li></ul>
              <ul><li>Next, year 2 rent is $43,512.</li><li>CAM, which is a shared building cost, is $10,506.</li><li>There is no credit in this year.</li><li>You pay about $54,018 this year after extras and credits. A missing extra would understate this row.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $46,312 today.</li></ul>
              <ul><li>Then year 3 rent is $45,078.</li><li>Extras for the building come to $10,821.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,899. A private rate change would shrink this row only.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $44,374 today.</li></ul>
              <ul><li>After that, year 4 rent is $46,701.</li><li>The shared building cost this time is $11,146.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,847. A mixed term would add ghost years after this.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $42,519 today.</li></ul>
              <ul><li>In year 5 of the mistake-check lease, rent is $48,383.</li><li>Shared building cost is $11,480.</li><li>There is no credit in this year.</li><li>You pay about $59,863 this year after extras and credits. A leftover left unsaid would sit here in silence.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $40,742 today.</li></ul>
              <ul><li>Year 6 of the mistake-check lease has rent of $49,834.</li><li>CAM, which is a shared building cost, is $11,824.</li><li>Credits skip this year.</li><li>The net cash this year is about $61,658. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $38,855 today.</li></ul>
              <ul><li>Next, year 7 rent is $51,329.</li><li>Extras for the building come to $12,179.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $63,508. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $37,056 today.</li></ul>
              <ul><li>Then year 8 rent is $52,869.</li><li>The shared building cost this time is $12,544.</li><li>There is no credit in this year.</li><li>You pay about $65,413 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $35,341 today.</li></ul>
              <ul><li>After that, year 9 rent is $54,455.</li><li>Shared building cost is $12,920.</li><li>Credits skip this year.</li><li>The net cash this year is about $67,375. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $33,704 today.</li></ul>
              <ul><li>In year 10 of the mistake-check lease, rent is $56,089.</li><li>CAM, which is a shared building cost, is $13,308.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $69,397. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $32,144 today.</li></ul><p>Add those year values. The sample NPV for the mistake-check lease is about $387,344. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the mistake-check lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">See a clean comparison</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Samples only.</li><li>No claim that every firm makes every mistake.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A known missing field is not a mistake if you label the compare incomplete.</p>
            <p>A rounded dollar is fine. A hidden default is not.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>This whole page is the list. The extra mistake is pretending the list is complete.</li><li>Another mistake is using this page as sales pressure.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If two mistakes appear, fix both before you pick a tone of certainty.</p>
            <p>If none appear, you can speak more calmly.</p>
            <h2>Compare this to related metrics</h2>
            <p>A CRM reminder is not a check.</p>
            <p>A second pair of eyes on the five checks is worth more than a new color.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This is not legal review.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use a mistakes lecture to delay a tour that has no numbers yet.</li></ul>
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
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.boma.org/","label":"BOMA"},{"href":"https://www.fasb.org/","label":"FASB"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/lease-financial-modeling/","label":"Modeling hub","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/how-do-you-compare-two-commercial-lease-options/","label":"Clean compare","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/when-is-npv-the-wrong-metric/","label":"When NPV is wrong","description":"A nearby page that helps finish this comparison."}]} />
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
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/" data-relationship="related" aria-label="What inputs belong in a commercial lease model. Dates, rent steps, extras, credits, and the rate.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What inputs belong in a commercial lease model</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/" data-relationship="related" aria-label="How do you build a lease cash-flow model. List cash in and out by period.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you build a lease cash-flow model</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
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
