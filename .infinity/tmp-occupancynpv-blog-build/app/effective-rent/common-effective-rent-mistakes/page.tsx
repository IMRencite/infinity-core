import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Common effective rent mistakes",
  description: "People forget credits, mix gross and net, or treat a simple average as if it priced time.",
  alternates: { canonical: "/effective-rent/common-effective-rent-mistakes/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Common effective rent mistakes", description: "People forget credits, mix gross and net, or treat a simple average as if it priced time." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/effective-rent/common-effective-rent-mistakes" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="effective-rent">
        <JsonLdBlock data={SITE_SCHEMA["/effective-rent/common-effective-rent-mistakes"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/effective-rent","label":"Effective rent"},{"href":"/effective-rent/common-effective-rent-mistakes","label":"What are common effective rent mistakes?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">effective rent</p>
            <h1 className="pv-display">What are common effective rent mistakes?</h1>
            <div data-question-id="q_e1e1d21b2d861961" data-answer-chunk-id="q_e1e1d21b2d861961_chunk">
              <AnswerFirst question="What are common effective rent mistakes?" answer="People forget credits, mix gross and net, mix foot bases, or treat a simple average as if it priced time." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">See model mistakes</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_88de4c9921182668" data-answer-chunk-id="q_88de4c9921182668_0" data-supporting-section="define">
              <AnswerFirst question="What is the most common error?" answer="Comparing stickers and calling the result effective rent." />
            </div>
            <div data-question-id="q_1c5ff53174a9beb8" data-answer-chunk-id="q_1c5ff53174a9beb8_1" data-supporting-section="define">
              <AnswerFirst question="Does the rate matter?" answer="Yes, if you claim a discounted effective rent. A 1 to 2 point shift can flip the rank." />
            </div>
            <div data-question-id="q_634a9ad7f7cafe9a" data-answer-chunk-id="q_634a9ad7f7cafe9a_2" data-supporting-section="define">
              <AnswerFirst question="Do options belong?" answer="Name them. Do not subtract a renewal you have not taken." />
            </div>
            <div data-question-id="q_504cec6c711f781e" data-answer-chunk-id="q_504cec6c711f781e_3" data-supporting-section="define">
              <AnswerFirst question="How do you catch the error?" answer="Rebuild the year list. If a credit has no year, the average is a guess." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A mistake here is usually a missing line, not a hard formula.</p>
            <p>The average looks official, so it travels farther than it should.</p>
            <p>Name the method or the number becomes a rumor.</p>
            <p>This page sits under <a href="/effective-rent/">Effective rent</a>.</p>
            <p>If the slide only has <a href="/effective-rent/effective-rent-vs-face-rent/">face rent</a>, you have not started.</p>
            <p>Mixed <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">gross vs net</a> is an effective-rent error too.</p>
            <p>Read <a href="/commercial-lease-npv/when-is-npv-the-wrong-metric/">when NPV is the wrong metric</a> for the sister limit.</p>
            <p>A shared <a href="/how-it-works">workflow</a> reduces one-off averages.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>People forget credits, mix gross and net, mix foot bases, or treat a simple average as if it priced time.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>A wrong average can pick a building.</p>
            <p>A wrong average can also kill a fair deal.</p>
            <p>Fixing the method later feels like moving the goal.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>A wrong average can pick a building.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Write the method on the slide.</li><li>List credits in the year they happen.</li><li>Keep one foot basis.</li><li>Keep one lease-type stack.</li><li>If you discount, show the rate.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Wrong effective rent = sticker math with missing credits or mixed units.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Method label</th><td>Simple average or discounted</td></tr><tr><th scope="row">Credits</th><td>All of them</td></tr><tr><th scope="row">Foot basis</th><td>One basis</td></tr><tr><th scope="row">Lease type</th><td>Gross or net extras</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$33,500</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$31,155</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$321,367</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Mistake sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$33,500</td><td>$31,155</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,800</td><td>$10,486</td></tr><tr><th scope="row">Year-1 credit</th><td>$6,000</td><td>$3,300</td></tr><tr><th scope="row">Sample NPV</th><td>$321,367</td><td>$311,342</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Mistake sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$33,500</td><td>$9,800</td><td>$6,000</td><td>$37,300</td><td>$34,537</td></tr><tr><th scope="row">Year 2</th><td>$34,505</td><td>$10,094</td><td>$0</td><td>$44,599</td><td>$38,236</td></tr><tr><th scope="row">Year 3</th><td>$35,540</td><td>$10,397</td><td>$0</td><td>$45,937</td><td>$36,466</td></tr><tr><th scope="row">Year 4</th><td>$36,606</td><td>$10,709</td><td>$0</td><td>$47,315</td><td>$34,778</td></tr><tr><th scope="row">Year 5</th><td>$37,705</td><td>$11,030</td><td>$0</td><td>$48,735</td><td>$33,168</td></tr><tr><th scope="row">Year 6</th><td>$38,836</td><td>$11,361</td><td>$0</td><td>$50,197</td><td>$31,633</td></tr><tr><th scope="row">Year 7</th><td>$40,001</td><td>$11,702</td><td>$0</td><td>$51,703</td><td>$30,168</td></tr><tr><th scope="row">Year 8</th><td>$41,201</td><td>$12,053</td><td>$0</td><td>$53,254</td><td>$28,771</td></tr><tr><th scope="row">Year 9</th><td>$42,437</td><td>$12,415</td><td>$0</td><td>$54,852</td><td>$27,440</td></tr><tr><th scope="row">Year 10</th><td>$43,710</td><td>$12,787</td><td>$0</td><td>$56,497</td><td>$26,169</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$321,367</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Mistake sample is about $321,367. A second path lands near $311,342. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Mistake sample</h3>
              <ul><li>Year 1 of Mistake sample has rent of $33,500.</li><li>Shared building cost is $9,800.</li><li>A credit of $6,000 lowers the cash you pay that year.</li><li>Cash out this year is about $37,300. A small credit still belongs in year one.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $34,537 today.</li></ul>
              <ul><li>Next, year 2 rent is $34,505.</li><li>CAM, which is a shared building cost, is $10,094.</li><li>There is no credit in this year.</li><li>You pay about $44,599 this year after extras and credits. Missing extras would fake a low average.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $38,236 today.</li></ul>
              <ul><li>Then year 3 rent is $35,540.</li><li>Extras for the building come to $10,397.</li><li>Credits skip this year.</li><li>The net cash this year is about $45,937. The bump is easy to ignore and wrong to ignore.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $36,466 today.</li></ul>
              <ul><li>After that, year 4 rent is $36,606.</li><li>The shared building cost this time is $10,709.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $47,315. Later years expose a short-term gift.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $34,778 today.</li></ul>
              <ul><li>In year 5 of Mistake sample, rent is $37,705.</li><li>Shared building cost is $11,030.</li><li>There is no credit in this year.</li><li>You pay about $48,735 this year after extras and credits. The last year is where sticker math hides.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $33,168 today.</li></ul>
              <ul><li>Year 6 of Mistake sample has rent of $38,836.</li><li>CAM, which is a shared building cost, is $11,361.</li><li>Credits skip this year.</li><li>The net cash this year is about $50,197. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $31,633 today.</li></ul>
              <ul><li>Next, year 7 rent is $40,001.</li><li>Extras for the building come to $11,702.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $51,703. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $30,168 today.</li></ul>
              <ul><li>Then year 8 rent is $41,201.</li><li>The shared building cost this time is $12,053.</li><li>There is no credit in this year.</li><li>You pay about $53,254 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $28,771 today.</li></ul>
              <ul><li>After that, year 9 rent is $42,437.</li><li>Shared building cost is $12,415.</li><li>Credits skip this year.</li><li>The net cash this year is about $54,852. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $27,440 today.</li></ul>
              <ul><li>In year 10 of Mistake sample, rent is $43,710.</li><li>CAM, which is a shared building cost, is $12,787.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $56,497. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $26,169 today.</li></ul><p>Add those year values. The sample NPV for Mistake sample is about $321,367. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Mistake sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/effective-rent/effective-rent-vs-npv/">See effective rent versus NPV</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample shows a path that looks cheap until extras stay in.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A renewal option is not a credit. Do not subtract it.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Comparing face rents and calling that effective rent.</li><li>Spreading TI over a term the tenant will not keep.</li><li>Using a property cap rate as the discount rate.</li><li>Mixing usable and rentable feet.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If two methods disagree, show both and talk about timing.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">lease-analysis mistakes</a> for model errors beyond this metric.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A perfect average still cannot score the commute.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use a broken average to force a close.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="See How the Workflow Works" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/effective-rent/how-to-calculate-effective-rent">How do you calculate effective rent?</a> · <a href="/effective-rent/effective-rent-vs-face-rent">What is the difference between effective rent and face rent?</a> · <a href="/effective-rent/effective-rent-per-square-foot">What is effective rent per square foot?</a></p>
            
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
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/lease-financial-modeling/what-are-common-lease-analysis-mistakes/","label":"Common lease-analysis mistakes","description":"The wider error list."}]} /></div>
            <div className="pv-related-family"><h3>Learn this first</h3>
            <RelatedContent items={[{"href":"/effective-rent/how-to-calculate-effective-rent/","label":"How to calculate effective rent","description":"The method before the autopsy."}]} /></div>
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
            <a className="sn-card" data-card-role="TOPIC" href="/effective-rent/" data-relationship="parent-hub" aria-label="Effective rent. Effective rent averages a lease into one number.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Effective rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-npv/" data-relationship="related" aria-label="Effective rent vs NPV: what is the difference. Effective rent averages.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Effective rent vs NPV: what is the difference</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/how-to-calculate-effective-rent/" data-relationship="related" aria-label="How do you calculate effective rent. Add the rent you pay.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you calculate effective rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-face-rent/" data-relationship="related" aria-label="What is the difference between effective rent and face rent. Face rent is the sticker.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is the difference between effective rent and face rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
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
