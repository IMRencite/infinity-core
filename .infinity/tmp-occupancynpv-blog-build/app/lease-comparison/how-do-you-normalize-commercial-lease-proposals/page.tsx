import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How do you normalize commercial lease proposals?",
  description: "Put every offer on the same unit: all-in cost, same dates, same extras. Then the face rent can stop running the meeting.",
  alternates: { canonical: "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How do you normalize commercial lease proposals?", description: "Put every offer on the same unit: all-in cost, same dates, same extras. Then the face rent can stop running the meeting." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-comparison/how-do-you-normalize-commercial-lease-proposals" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-comparison">
        <JsonLdBlock data={SITE_SCHEMA["/lease-comparison/how-do-you-normalize-commercial-lease-proposals"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-comparison","label":"Lease comparison"},{"href":"/lease-comparison/how-do-you-normalize-commercial-lease-proposals","label":"How do you normalize commercial lease proposals?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease comparison</p>
            <h1 className="pv-display">How do you normalize commercial lease proposals?</h1>
            <div data-question-id="q_6990bdc590d2eb95" data-answer-chunk-id="q_6990bdc590d2eb95_chunk">
              <AnswerFirst question="How do you normalize commercial lease proposals?" answer="Convert every offer to one unit: all-in cash, same dates, same extras. Then compare. Face rent can wait." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/compare-commercial-leases">Compare Your Lease Options</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_855f1854cbd3f518" data-answer-chunk-id="q_855f1854cbd3f518_0" data-supporting-section="define">
              <AnswerFirst question="What unit should you use?" answer="All-in cash on one calendar, then today's dollars. Not face rent alone." />
            </div>
            <div data-question-id="q_dd69b38ec1283193" data-answer-chunk-id="q_dd69b38ec1283193_1" data-supporting-section="define">
              <AnswerFirst question="Do start dates matter?" answer="Yes. Empty months are not free unless the deal says they are." />
            </div>
            <div data-question-id="q_2894852bbb8de999" data-answer-chunk-id="q_2894852bbb8de999_2" data-supporting-section="define">
              <AnswerFirst question="Do you need NPV to normalize?" answer="You need the stack first. NPV comes after the stacks match." />
            </div>
            <div data-question-id="q_ed01030253281a63" data-answer-chunk-id="q_ed01030253281a63_3" data-supporting-section="define">
              <AnswerFirst question="What if extras are estimates?" answer="Mark them as estimates and test a high and a low." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Normalize means make two unlike offers talk in the same unit.</p>
            <p>A gross rent and a net rent are not yet the same unit.</p>
            <p>A five-year term and a ten-year term are not the same product.</p>
            <p>Free months and build-out checks change when cash moves.</p>
            <p>Until those sit on one timeline, you are comparing stickers.</p>
            <p>This page sits under <a href="/lease-comparison/">Lease comparison</a>.</p>
            <p>Most failed compares mix <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">gross and net</a> stickers.</p>
            <p>Time the <a href="/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/">credits</a> before you average anything.</p>
            <p><a href="/lease-comparison/how-do-you-compare-different-lease-terms/">Different terms</a> are different products.</p>
            <p>After the stacks match, run the <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">NPV walk</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Convert every offer to one unit: all-in cash, same dates, same extras. Then compare. Face rent can wait.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Landlords quote rent in different wrappers.</p>
            <p>Teams pick the low sticker and learn the extras later.</p>
            <p>Finance wants one stack they can audit.</p>
            <p>A clean stack also shows the next ask in a negotiation.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Landlords quote rent in different wrappers.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Write the lease type: gross, modified, or net.</li><li>Add extras the tenant still pays.</li><li>Place free rent and TI in the real months.</li><li>Align start dates or name the gap.</li><li>Then discount both stacks at one rate.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Normalized year cash = rent + tenant extras − credits, on one shared calendar.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Lease type</th><td>Gross, modified, or net</td></tr><tr><th scope="row">Extras</th><td>CAM, tax, insurance if tenant-paid</td></tr><tr><th scope="row">Credits</th><td>Free rent and TI</td></tr><tr><th scope="row">Dates</th><td>Start, end, and free months</td></tr><tr><th scope="row">Rate</th><td>One visible discount rate</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$40,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$37,200</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$382,494</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Normalize sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$40,000</td><td>$37,200</td></tr><tr><th scope="row">Year-1 extras</th><td>$12,500</td><td>$13,375</td></tr><tr><th scope="row">Year-1 credit</th><td>$15,000</td><td>$8,250</td></tr><tr><th scope="row">Sample NPV</th><td>$382,494</td><td>$374,209</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Normalize sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$40,000</td><td>$12,500</td><td>$15,000</td><td>$37,500</td><td>$34,722</td></tr><tr><th scope="row">Year 2</th><td>$41,200</td><td>$12,875</td><td>$0</td><td>$54,075</td><td>$46,361</td></tr><tr><th scope="row">Year 3</th><td>$42,436</td><td>$13,261</td><td>$0</td><td>$55,697</td><td>$44,214</td></tr><tr><th scope="row">Year 4</th><td>$43,709</td><td>$13,659</td><td>$0</td><td>$57,368</td><td>$42,167</td></tr><tr><th scope="row">Year 5</th><td>$45,020</td><td>$14,069</td><td>$0</td><td>$59,089</td><td>$40,215</td></tr><tr><th scope="row">Year 6</th><td>$46,371</td><td>$14,491</td><td>$0</td><td>$60,862</td><td>$38,353</td></tr><tr><th scope="row">Year 7</th><td>$47,762</td><td>$14,926</td><td>$0</td><td>$62,688</td><td>$36,578</td></tr><tr><th scope="row">Year 8</th><td>$49,195</td><td>$15,374</td><td>$0</td><td>$64,569</td><td>$34,885</td></tr><tr><th scope="row">Year 9</th><td>$50,671</td><td>$15,835</td><td>$0</td><td>$66,506</td><td>$33,270</td></tr><tr><th scope="row">Year 10</th><td>$52,191</td><td>$16,310</td><td>$0</td><td>$68,501</td><td>$31,729</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$382,494</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Normalize sample is about $382,494. A second path lands near $374,209. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Normalize sample</h3>
              <ul><li>Year 1 of Normalize sample has rent of $40,000.</li><li>Shared building cost is $12,500.</li><li>A credit of $15,000 lowers the cash you pay that year.</li><li>Cash out this year is about $37,500. This net path carries heavy extras in year one.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $34,722 today.</li></ul>
              <ul><li>Next, year 2 rent is $41,200.</li><li>CAM, which is a shared building cost, is $12,875.</li><li>There is no credit in this year.</li><li>You pay about $54,075 this year after extras and credits. The step hits after the credit is gone.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $46,361 today.</li></ul>
              <ul><li>Then year 3 rent is $42,436.</li><li>Extras for the building come to $13,261.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,697. Extras keep pace with the building.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $44,214 today.</li></ul>
              <ul><li>After that, year 4 rent is $43,709.</li><li>The shared building cost this time is $13,659.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,368. Later years still sit on the shared calendar.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $42,167 today.</li></ul>
              <ul><li>In year 5 of Normalize sample, rent is $45,020.</li><li>Shared building cost is $14,069.</li><li>There is no credit in this year.</li><li>You pay about $59,089 this year after extras and credits. A missed extra here would fake a win.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $40,215 today.</li></ul>
              <ul><li>Year 6 of Normalize sample has rent of $46,371.</li><li>CAM, which is a shared building cost, is $14,491.</li><li>Credits skip this year.</li><li>The net cash this year is about $60,862. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $38,353 today.</li></ul>
              <ul><li>Next, year 7 rent is $47,762.</li><li>Extras for the building come to $14,926.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $62,688. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $36,578 today.</li></ul>
              <ul><li>Then year 8 rent is $49,195.</li><li>The shared building cost this time is $15,374.</li><li>There is no credit in this year.</li><li>You pay about $64,569 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $34,885 today.</li></ul>
              <ul><li>After that, year 9 rent is $50,671.</li><li>Shared building cost is $15,835.</li><li>Credits skip this year.</li><li>The net cash this year is about $66,506. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $33,270 today.</li></ul>
              <ul><li>In year 10 of Normalize sample, rent is $52,191.</li><li>CAM, which is a shared building cost, is $16,310.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $68,501. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $31,729 today.</li></ul><p>Add those year values. The sample NPV for Normalize sample is about $382,494. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Normalize sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">See gross versus net</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Both options use the same start month in this teaching sample.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If starts differ, do not pretend the empty months are free.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Comparing stickers across lease types.</li><li>Ignoring load factor.</li><li>Forgetting a commencement gap.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If you cannot normalize, do not rank. Ask for the missing extra first.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases/">gross versus net</a> for the most common unit error.</p>
            <p>See <a href="/occupancy-costs/what-is-total-occupancy-cost/">total occupancy cost</a> for the stack itself.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>Normalization does not score the block or the landlord.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not force a rank on incomplete LOIs.</li></ul>
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
            <p className="pv-spoke-index"><a href="/lease-comparison/how-do-you-compare-gross-and-net-leases">How do you compare a gross lease and a net lease?</a> · <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison">What belongs in a commercial lease comparison?</a> · <a href="/lease-comparison/how-do-brokers-compare-lease-offers">How do tenant-rep brokers compare lease offers?</a></p>
            
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
            <div className="pv-related-family"><h3>Use this in a comparison</h3>
            <RelatedContent items={[{"href":"/compare-commercial-leases","label":"Compare commercial leases","description":"See the product workflow."}]} /></div>
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/lease-comparison/what-belongs-in-a-commercial-lease-comparison/","label":"What belongs in a comparison","description":"The checklist behind the stack."}]} /></div>
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
