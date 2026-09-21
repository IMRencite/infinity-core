import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What belongs in a commercial lease comparison?",
  description: "Term, dates, rent, extras, credits, options, and the rate you used. Leave one out and the rank can flip.",
  alternates: { canonical: "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What belongs in a commercial lease comparison?", description: "Term, dates, rent, extras, credits, options, and the rate you used. Leave one out and the rank can flip." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-comparison/what-belongs-in-a-commercial-lease-comparison" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-comparison">
        <JsonLdBlock data={SITE_SCHEMA["/lease-comparison/what-belongs-in-a-commercial-lease-comparison"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-comparison","label":"Lease comparison"},{"href":"/lease-comparison/what-belongs-in-a-commercial-lease-comparison","label":"What belongs in a commercial lease comparison?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease comparison</p>
            <h1 className="pv-display">What belongs in a commercial lease comparison?</h1>
            <div data-question-id="q_fbd993442848bfa6" data-answer-chunk-id="q_fbd993442848bfa6_chunk">
              <AnswerFirst question="What belongs in a commercial lease comparison?" answer="Put term, dates, rent, extras, credits, options, and the rate on one sheet. Leave one out and the rank can flip." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">See a worked comparison</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_579d43b371acc057" data-answer-chunk-id="q_579d43b371acc057_0" data-supporting-section="define">
              <AnswerFirst question="What is the minimum sheet?" answer="Dates, rent, extras, credits, term, and the rate." />
            </div>
            <div data-question-id="q_514748b467959787" data-answer-chunk-id="q_514748b467959787_1" data-supporting-section="define">
              <AnswerFirst question="Do options belong in the number?" answer="Name them always. Price them only when the client will use them." />
            </div>
            <div data-question-id="q_dc683b60575cb887" data-answer-chunk-id="q_dc683b60575cb887_2" data-supporting-section="define">
              <AnswerFirst question="Where does CAM sit?" answer="In the money block, not in a footnote." />
            </div>
            <div data-question-id="q_e502f201abc89d59" data-answer-chunk-id="q_e502f201abc89d59_3" data-supporting-section="define">
              <AnswerFirst question="What goes to the memo?" answer="The pick, the gap, the missing lines, and the next ask." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A comparison is a checklist, not a vibe.</p>
            <p>If a line can change cash, it belongs.</p>
            <p>If a line only changes comfort, keep it beside the number, not inside it.</p>
            <p>Options are not cash until someone exercises them. Still name them.</p>
            <p>This page sits under <a href="/lease-comparison/">Lease comparison</a>.</p>
            <p>Use the <a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">worked compare</a> once the sheet is full.</p>
            <p>Scan <a href="/occupancy-costs/hidden-occupancy-costs/">hidden costs</a> before you lock extras.</p>
            <p>After the sheet, run <a href="/lease-sensitivity-analysis/">sensitivity</a> on the two biggest unknowns.</p>
            <p>The <a href="/how-it-works">workflow</a> is this checklist in product form.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Put term, dates, rent, extras, credits, options, and the rate on one sheet. Leave one out and the rank can flip.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Missing lines create fake winners.</p>
            <p>Clients ask what you left out more than they ask for the formula.</p>
            <p>A complete sheet also becomes the memo.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Missing lines create fake winners.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Start with identity: building, size, dates, term.</li><li>Add the money lines: rent, extras, credits.</li><li>Add the risk lines: caps, audits, bumps.</li><li>Add the option lines: renew, terminate, expand.</li><li>Add the rate you will use.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Complete compare = identity + money + risk + options + visible rate.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Identity</th><td>Size, dates, term</td></tr><tr><th scope="row">Money</th><td>Rent, extras, credits</td></tr><tr><th scope="row">Risk</th><td>Caps, bumps, true-ups</td></tr><tr><th scope="row">Options</th><td>Renew, exit, expand</td></tr><tr><th scope="row">Rate</th><td>Discount rate</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$43,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$39,990</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$376,867</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Checklist sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$43,000</td><td>$39,990</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,000</td><td>$9,630</td></tr><tr><th scope="row">Year-1 credit</th><td>$17,000</td><td>$9,350</td></tr><tr><th scope="row">Sample NPV</th><td>$376,867</td><td>$365,981</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Checklist sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$43,000</td><td>$9,000</td><td>$17,000</td><td>$35,000</td><td>$32,407</td></tr><tr><th scope="row">Year 2</th><td>$44,290</td><td>$9,270</td><td>$0</td><td>$53,560</td><td>$45,919</td></tr><tr><th scope="row">Year 3</th><td>$45,619</td><td>$9,548</td><td>$0</td><td>$55,167</td><td>$43,793</td></tr><tr><th scope="row">Year 4</th><td>$46,987</td><td>$9,835</td><td>$0</td><td>$56,822</td><td>$41,766</td></tr><tr><th scope="row">Year 5</th><td>$48,397</td><td>$10,130</td><td>$0</td><td>$58,527</td><td>$39,832</td></tr><tr><th scope="row">Year 6</th><td>$49,849</td><td>$10,434</td><td>$0</td><td>$60,283</td><td>$37,989</td></tr><tr><th scope="row">Year 7</th><td>$51,344</td><td>$10,747</td><td>$0</td><td>$62,091</td><td>$36,230</td></tr><tr><th scope="row">Year 8</th><td>$52,884</td><td>$11,069</td><td>$0</td><td>$63,953</td><td>$34,552</td></tr><tr><th scope="row">Year 9</th><td>$54,471</td><td>$11,401</td><td>$0</td><td>$65,872</td><td>$32,952</td></tr><tr><th scope="row">Year 10</th><td>$56,105</td><td>$11,743</td><td>$0</td><td>$67,848</td><td>$31,427</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$376,867</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Checklist sample is about $376,867. A second path lands near $365,981. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Checklist sample</h3>
              <ul><li>Year 1 of Checklist sample has rent of $43,000.</li><li>Shared building cost is $9,000.</li><li>A credit of $17,000 lowers the cash you pay that year.</li><li>Cash out this year is about $35,000. Identity is fixed. Money still moves.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $32,407 today.</li></ul>
              <ul><li>Next, year 2 rent is $44,290.</li><li>CAM, which is a shared building cost, is $9,270.</li><li>There is no credit in this year.</li><li>You pay about $53,560 this year after extras and credits. The credit is gone and the bump shows.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $45,919 today.</li></ul>
              <ul><li>Then year 3 rent is $45,619.</li><li>Extras for the building come to $9,548.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,167. Risk lines start to matter.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $43,793 today.</li></ul>
              <ul><li>After that, year 4 rent is $46,987.</li><li>The shared building cost this time is $9,835.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $56,822. Later cash still sits on the sheet.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $41,766 today.</li></ul>
              <ul><li>In year 5 of Checklist sample, rent is $48,397.</li><li>Shared building cost is $10,130.</li><li>There is no credit in this year.</li><li>You pay about $58,527 this year after extras and credits. The last year is part of the term you sold.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $39,832 today.</li></ul>
              <ul><li>Year 6 of Checklist sample has rent of $49,849.</li><li>CAM, which is a shared building cost, is $10,434.</li><li>Credits skip this year.</li><li>The net cash this year is about $60,283. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $37,989 today.</li></ul>
              <ul><li>Next, year 7 rent is $51,344.</li><li>Extras for the building come to $10,747.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $62,091. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $36,230 today.</li></ul>
              <ul><li>Then year 8 rent is $52,884.</li><li>The shared building cost this time is $11,069.</li><li>There is no credit in this year.</li><li>You pay about $63,953 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $34,552 today.</li></ul>
              <ul><li>After that, year 9 rent is $54,471.</li><li>Shared building cost is $11,401.</li><li>Credits skip this year.</li><li>The net cash this year is about $65,872. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,952 today.</li></ul>
              <ul><li>In year 10 of Checklist sample, rent is $56,105.</li><li>CAM, which is a shared building cost, is $11,743.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $67,848. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $31,427 today.</li></ul><p>Add those year values. The sample NPV for Checklist sample is about $376,867. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Checklist sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">See what goes in the memo</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample sheet is teaching-sized, not a full legal abstract.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Assignment and sublease rights are options. Name them even if you do not price them.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>A pretty table with no extras.</li><li>A rate that never appears.</li><li>Options mentioned only in email.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If a line is unknown, write unknown. Do not invent a winner.</p>
            <h2>Compare this to related metrics</h2>
            <p>The memo is the prose form of this sheet. See <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">what belongs in the memo</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A sheet cannot replace counsel or a site walk.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not publish a rank from a half sheet.</li></ul>
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
            <p className="pv-spoke-index"><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals">How do you normalize commercial lease proposals?</a> · <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases">How do you compare a gross lease and a net lease?</a> · <a href="/lease-comparison/how-do-brokers-compare-lease-offers">How do tenant-rep brokers compare lease offers?</a></p>
            
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
            <div className="pv-related-family"><h3>Questions people ask next</h3>
            <RelatedContent items={[{"href":"/lease-comparison/how-do-brokers-compare-lease-offers/","label":"How brokers compare offers","description":"The professional version of the sheet."}]} /></div>
            <div className="pv-related-family"><h3>Next step</h3>
            <RelatedContent items={[{"href":"/early-access","label":"Request Pilot Access","description":"Pilot only. Live checkout is available for Professional and Per-Deal."}]} /></div>
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
            <a className="sn-card" data-card-role="TOPIC" href="/lease-comparison/" data-relationship="parent-hub" aria-label="Lease comparison. Compare two or more commercial leases on the same timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease comparison</strong><span className="sn-desc">Compare two or more commercial leases on the same timeline.</span></span>
            </a>
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
