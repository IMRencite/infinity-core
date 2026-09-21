import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What belongs in a lease recommendation memo?",
  description: "State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those.",
  alternates: { canonical: "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What belongs in a lease recommendation memo?", description: "State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="tenant-rep-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/tenant-rep-analysis","label":"Tenant-rep analysis"},{"href":"/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo","label":"What belongs in a lease recommendation memo?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">tenant rep analysis</p>
            <h1 className="pv-display">What belongs in a lease recommendation memo?</h1>
            <div data-question-id="q_dd6ef6005a62c0ed" data-answer-chunk-id="q_dd6ef6005a62c0ed_chunk">
              <AnswerFirst question="What belongs in a lease recommendation memo?" answer="State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/">Read the explainer</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_738355b102eb3983" data-answer-chunk-id="q_738355b102eb3983_0" data-supporting-section="define">
              <AnswerFirst question="How long should it be?" answer="Short enough to forward. Long enough to defend the pick." />
            </div>
            <div data-question-id="q_54c20e702d841888" data-answer-chunk-id="q_54c20e702d841888_1" data-supporting-section="define">
              <AnswerFirst question="What is the first sentence?" answer="The pick and the one reason it wins on cash." />
            </div>
            <div data-question-id="q_268494592e104168" data-answer-chunk-id="q_268494592e104168_2" data-supporting-section="define">
              <AnswerFirst question="Where do options go?" answer="In a short risk line if they could change the stay." />
            </div>
            <div data-question-id="q_4441cb59369fbffa" data-answer-chunk-id="q_4441cb59369fbffa_3" data-supporting-section="define">
              <AnswerFirst question="What is the next ask?" answer="The missing extra, the cap, the date, or the credit timing." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A memo is the client page that survives the meeting.</p>
            <p>It is not a dump of every cell.</p>
            <p>It is also not a slogan.</p>
            <p>If a line changed the pick, it belongs.</p>
            <p>This page sits under <a href="/tenant-rep-analysis/">Tenant-rep analysis</a>.</p>
            <p>The memo should match the <a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients/">NPV talk</a>.</p>
            <p>Attach the <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/">CFO packet</a> when finance is the next reader.</p>
            <p>If you are still on sketches, go back to the <a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/">LOI rebuild</a>.</p>
            <p>The <a href="/how-it-works">workflow</a> ends in a summary like this.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Clients forward the memo to finance and counsel.</p>
            <p>A missing assumption becomes your problem later.</p>
            <p>A clear next ask keeps negotiation moving.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Clients forward the memo to finance and counsel.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Open with the pick in one sentence.</li><li>Show the gap in today's dollars and in year-one cash.</li><li>List the rate and the extras you used.</li><li>Name the flip risk.</li><li>Close with the next landlord question.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Memo = pick + gap + assumptions + flip + next ask.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Pick</th><td>Which option and why</td></tr><tr><th scope="row">Gap</th><td>NPV and year-one cash</td></tr><tr><th scope="row">Assumptions</th><td>Rate and extras</td></tr><tr><th scope="row">Flip</th><td>What would change the pick</td></tr><tr><th scope="row">Ask</th><td>The next request</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$42,500</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$39,525</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$371,753</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Memo sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$42,500</td><td>$39,525</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,700</td><td>$9,309</td></tr><tr><th scope="row">Year-1 credit</th><td>$16,000</td><td>$8,800</td></tr><tr><th scope="row">Sample NPV</th><td>$371,753</td><td>$360,556</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Memo sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$42,500</td><td>$8,700</td><td>$16,000</td><td>$35,200</td><td>$32,593</td></tr><tr><th scope="row">Year 2</th><td>$43,775</td><td>$8,961</td><td>$0</td><td>$52,736</td><td>$45,213</td></tr><tr><th scope="row">Year 3</th><td>$45,088</td><td>$9,230</td><td>$0</td><td>$54,318</td><td>$43,119</td></tr><tr><th scope="row">Year 4</th><td>$46,441</td><td>$9,507</td><td>$0</td><td>$55,948</td><td>$41,123</td></tr><tr><th scope="row">Year 5</th><td>$47,834</td><td>$9,792</td><td>$0</td><td>$57,626</td><td>$39,219</td></tr><tr><th scope="row">Year 6</th><td>$49,269</td><td>$10,086</td><td>$0</td><td>$59,355</td><td>$37,404</td></tr><tr><th scope="row">Year 7</th><td>$50,747</td><td>$10,389</td><td>$0</td><td>$61,136</td><td>$35,672</td></tr><tr><th scope="row">Year 8</th><td>$52,269</td><td>$10,701</td><td>$0</td><td>$62,970</td><td>$34,021</td></tr><tr><th scope="row">Year 9</th><td>$53,837</td><td>$11,022</td><td>$0</td><td>$64,859</td><td>$32,446</td></tr><tr><th scope="row">Year 10</th><td>$55,452</td><td>$11,353</td><td>$0</td><td>$66,805</td><td>$30,944</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$371,753</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Memo sample is about $371,753. A second path lands near $360,556. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Memo sample</h3>
              <ul><li>Year 1 of Memo sample has rent of $42,500.</li><li>Shared building cost is $8,700.</li><li>A credit of $16,000 lowers the cash you pay that year.</li><li>Cash out this year is about $35,200. Year one is the cash the memo must not hide.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $32,593 today.</li></ul>
              <ul><li>Next, year 2 rent is $43,775.</li><li>CAM, which is a shared building cost, is $8,961.</li><li>There is no credit in this year.</li><li>You pay about $52,736 this year after extras and credits. Year two is the first clean bill.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $45,213 today.</li></ul>
              <ul><li>Then year 3 rent is $45,088.</li><li>Extras for the building come to $9,230.</li><li>Credits skip this year.</li><li>The net cash this year is about $54,318. The bump is an assumption to name.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $43,119 today.</li></ul>
              <ul><li>After that, year 4 rent is $46,441.</li><li>The shared building cost this time is $9,507.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $55,948. Later years feed the NPV gap.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $41,123 today.</li></ul>
              <ul><li>In year 5 of Memo sample, rent is $47,834.</li><li>Shared building cost is $9,792.</li><li>There is no credit in this year.</li><li>You pay about $57,626 this year after extras and credits. The last year proves the term you used.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $39,219 today.</li></ul>
              <ul><li>Year 6 of Memo sample has rent of $49,269.</li><li>CAM, which is a shared building cost, is $10,086.</li><li>Credits skip this year.</li><li>The net cash this year is about $59,355. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $37,404 today.</li></ul>
              <ul><li>Next, year 7 rent is $50,747.</li><li>Extras for the building come to $10,389.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $61,136. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,672 today.</li></ul>
              <ul><li>Then year 8 rent is $52,269.</li><li>The shared building cost this time is $10,701.</li><li>There is no credit in this year.</li><li>You pay about $62,970 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $34,021 today.</li></ul>
              <ul><li>After that, year 9 rent is $53,837.</li><li>Shared building cost is $11,022.</li><li>Credits skip this year.</li><li>The net cash this year is about $64,859. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,446 today.</li></ul>
              <ul><li>In year 10 of Memo sample, rent is $55,452.</li><li>CAM, which is a shared building cost, is $11,353.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $66,805. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,944 today.</li></ul><p>Add those year values. The sample NPV for Memo sample is about $371,753. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Memo sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample memo is teaching-sized.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If legal still has open points, the memo says so.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>A pick with no gap. A gap with no rate. A rate with no extras.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If you cannot name the next ask, you are not ready to send the memo.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison/">what belongs in the comparison</a> for the sheet behind the memo.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A memo is not legal advice.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not send a memo that claims a finished product or collected payment. This site does neither.</li></ul>
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
            <p className="pv-spoke-index"><a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois">How do you compare commercial LOIs?</a> · <a href="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation">How do you compare a renewal versus a relocation?</a></p>
            
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
            <div className="pv-related-family"><h3>Next step</h3>
            <RelatedContent items={[{"href":"/early-access","label":"Request Pilot Access","description":"Validation / pilot only. Live checkout is available for Professional and Per-Deal."}]} /></div>
            <div className="pv-related-family"><h3>For tenant-rep brokers</h3>
            <RelatedContent items={[{"href":"/for/tenant-rep-brokers","label":"Persona page","description":"Commercial path."}]} /></div>
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
            <div className="sn-grid sn-grid--count-5">
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
            <a className="sn-card" data-card-role="QUESTION" href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/" data-relationship="related" aria-label="How should a tenant-rep broker explain lease economics to a client. Clients need a short story they can trust.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How should a tenant-rep broker explain lease economics to a client</strong><span className="sn-desc">Show a client a path they can review.</span></span>
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
