import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How to present lease scenarios to a CFO",
  description: "Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open.",
  alternates: { canonical: "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How to present lease scenarios to a CFO", description: "Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-sensitivity-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-sensitivity-analysis","label":"Lease sensitivity analysis"},{"href":"/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo","label":"How should you present lease scenarios to a CFO?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease sensitivity analysis</p>
            <h1 className="pv-display">How should you present lease scenarios to a CFO?</h1>
            <div data-question-id="q_5ac4db02ac6fe200" data-answer-chunk-id="q_5ac4db02ac6fe200_chunk">
              <AnswerFirst question="How should you present lease scenarios to a CFO?" answer="Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/">See the client story</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_88545193072873d8" data-answer-chunk-id="q_88545193072873d8_0" data-supporting-section="define">
              <AnswerFirst question="How many cases?" answer="A base and one worse case. Add a third only if it is real." />
            </div>
            <div data-question-id="q_846e23f016915764" data-answer-chunk-id="q_846e23f016915764_1" data-supporting-section="define">
              <AnswerFirst question="What must stay visible?" answer="The rate, the extras, and the year the credit lands." />
            </div>
            <div data-question-id="q_6a2e60acb472dfc7" data-answer-chunk-id="q_6a2e60acb472dfc7_2" data-supporting-section="define">
              <AnswerFirst question="What is a bad packet?" answer="A winner with no flip and no open items." />
            </div>
            <div data-question-id="q_a79ff80fba22eace" data-answer-chunk-id="q_a79ff80fba22eace_3" data-supporting-section="define">
              <AnswerFirst question="When is this transactional?" answer="When the client is ready to request a pilot or a counter. Not before." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A CFO wants a decision packet, not a tour of every cell.</p>
            <p>Scenarios are stories with coherent inputs.</p>
            <p>Sensitivity is the one-knob test beside those stories.</p>
            <p>This page sits under <a href="/lease-sensitivity-analysis/">Lease sensitivity analysis</a>.</p>
            <p>The packet and the <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">memo</a> should match.</p>
            <p>Open with <a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/">why you tested</a>.</p>
            <p>Current OccupancyNPV <a href="/pricing">pricing</a> is available for checkout.</p>
            <p><a href="/early-access">Request Pilot Access</a> only after the packet is honest.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Finance will ask what breaks the pick.</p>
            <p>A single trophy NPV looks like theater.</p>
            <p>A short packet speeds the yes or the next ask.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Finance will ask what breaks the pick.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Open with the pick and the gap.</li><li>Show the year table once.</li><li>Show one worse case that still uses real inputs.</li><li>Name the flip input.</li><li>Close with what you still need from legal or the landlord.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. CFO packet = pick + gap + base table + one worse case + flip input + open items.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Base case</th><td>Shared stacks</td></tr><tr><th scope="row">Worse case</th><td>Coherent, not cartoon</td></tr><tr><th scope="row">Flip input</th><td>Rate, extra, or credit</td></tr><tr><th scope="row">Open items</th><td>Missing clauses</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$47,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$43,710</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$399,350</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — CFO-packet sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$47,000</td><td>$43,710</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,100</td><td>$8,667</td></tr><tr><th scope="row">Year-1 credit</th><td>$18,000</td><td>$9,900</td></tr><tr><th scope="row">Sample NPV</th><td>$399,350</td><td>$386,291</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — CFO-packet sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$47,000</td><td>$8,100</td><td>$18,000</td><td>$37,100</td><td>$34,352</td></tr><tr><th scope="row">Year 2</th><td>$48,410</td><td>$8,343</td><td>$0</td><td>$56,753</td><td>$48,657</td></tr><tr><th scope="row">Year 3</th><td>$49,862</td><td>$8,593</td><td>$0</td><td>$58,455</td><td>$46,403</td></tr><tr><th scope="row">Year 4</th><td>$51,358</td><td>$8,851</td><td>$0</td><td>$60,209</td><td>$44,255</td></tr><tr><th scope="row">Year 5</th><td>$52,899</td><td>$9,117</td><td>$0</td><td>$62,016</td><td>$42,207</td></tr><tr><th scope="row">Year 6</th><td>$54,486</td><td>$9,391</td><td>$0</td><td>$63,877</td><td>$40,253</td></tr><tr><th scope="row">Year 7</th><td>$56,121</td><td>$9,673</td><td>$0</td><td>$65,794</td><td>$38,390</td></tr><tr><th scope="row">Year 8</th><td>$57,805</td><td>$9,963</td><td>$0</td><td>$67,768</td><td>$36,613</td></tr><tr><th scope="row">Year 9</th><td>$59,539</td><td>$10,262</td><td>$0</td><td>$69,801</td><td>$34,918</td></tr><tr><th scope="row">Year 10</th><td>$61,325</td><td>$10,570</td><td>$0</td><td>$71,895</td><td>$33,301</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$399,350</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for CFO-packet sample is about $399,350. A second path lands near $386,291. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for CFO-packet sample</h3>
              <ul><li>Year 1 of CFO-packet sample has rent of $47,000.</li><li>Shared building cost is $8,100.</li><li>A credit of $18,000 lowers the cash you pay that year.</li><li>Cash out this year is about $37,100. Year one is the credit slide.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $34,352 today.</li></ul>
              <ul><li>Next, year 2 rent is $48,410.</li><li>CAM, which is a shared building cost, is $8,343.</li><li>There is no credit in this year.</li><li>You pay about $56,753 this year after extras and credits. Year two is the first clean bill finance will feel.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $48,657 today.</li></ul>
              <ul><li>Then year 3 rent is $49,862.</li><li>Extras for the building come to $8,593.</li><li>Credits skip this year.</li><li>The net cash this year is about $58,455. The bump is the later-year risk.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $46,403 today.</li></ul>
              <ul><li>After that, year 4 rent is $51,358.</li><li>The shared building cost this time is $8,851.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $60,209. Later cash is the rate-test zone.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $44,255 today.</li></ul>
              <ul><li>In year 5 of CFO-packet sample, rent is $52,899.</li><li>Shared building cost is $9,117.</li><li>There is no credit in this year.</li><li>You pay about $62,016 this year after extras and credits. The last year still belongs in the packet.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $42,207 today.</li></ul>
              <ul><li>Year 6 of CFO-packet sample has rent of $54,486.</li><li>CAM, which is a shared building cost, is $9,391.</li><li>Credits skip this year.</li><li>The net cash this year is about $63,877. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $40,253 today.</li></ul>
              <ul><li>Next, year 7 rent is $56,121.</li><li>Extras for the building come to $9,673.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $65,794. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $38,390 today.</li></ul>
              <ul><li>Then year 8 rent is $57,805.</li><li>The shared building cost this time is $9,963.</li><li>There is no credit in this year.</li><li>You pay about $67,768 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $36,613 today.</li></ul>
              <ul><li>After that, year 9 rent is $59,539.</li><li>Shared building cost is $10,262.</li><li>Credits skip this year.</li><li>The net cash this year is about $69,801. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $34,918 today.</li></ul>
              <ul><li>In year 10 of CFO-packet sample, rent is $61,325.</li><li>CAM, which is a shared building cost, is $10,570.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $71,895. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $33,301 today.</li></ul><p>Add those year values. The sample NPV for CFO-packet sample is about $399,350. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for CFO-packet sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/pricing">View Pilot Pricing</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample packet is teaching-sized.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>After-tax views belong only when the client asked for them.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Twenty scenarios. No flip. A hidden rate.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If finance rejects discounting, show total cash beside NPV. Do not hide either.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">the memo</a> for the prose twin of this packet.</p>
            <p>See <a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients/">how to explain NPV</a> for the talk track.</p>
            <aside className="pv-callout ed-highlight" data-callout="FOR_FINANCE"><h3>For finance</h3><p>Ask for the flip input and the extras history before you bless a pick.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A packet cannot replace counsel.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not send a packet built on incomplete LOIs.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Request Pilot Access" data-search-intent="COMMERCIAL_INVESTIGATION" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis">Why use sensitivity analysis on a commercial lease?</a> · <a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking">How does discount-rate sensitivity change a lease ranking?</a></p>
            
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
            <div className="pv-related-family"><h3>For tenant-rep brokers</h3>
            <RelatedContent items={[{"href":"/for/tenant-rep-brokers","label":"Tenant-rep workflow","description":"The commercial path."}]} /></div>
            <div className="pv-related-family"><h3>Next step</h3>
            <RelatedContent items={[{"href":"/how-it-works","label":"How it works","description":"Four steps from terms to summary."}]} /></div>
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
            <a className="sn-card" data-card-role="TOPIC" href="/lease-sensitivity-analysis/" data-relationship="parent-hub" aria-label="Lease sensitivity analysis. A ranking can flip when one assumption changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease sensitivity analysis</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/" data-relationship="related" aria-label="What does lease sensitivity analysis show. Sensitivity analysis asks what happens if a key number changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What does lease sensitivity analysis show</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/" data-relationship="related" aria-label="Why use sensitivity analysis on a commercial lease. A ranking can flip when one assumption moves.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Why use sensitivity analysis on a commercial lease</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/" data-relationship="related" aria-label="How does discount-rate sensitivity change a lease ranking. A one or two point rate change can swap the winner when credits sit early and rent sits late.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How does discount-rate sensitivity change a lease ranking</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
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
