import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Hidden occupancy costs",
  description: "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.",
  alternates: { canonical: "/occupancy-costs/hidden-occupancy-costs/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Hidden occupancy costs", description: "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/occupancy-costs/hidden-occupancy-costs" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="occupancy-costs">
        <JsonLdBlock data={SITE_SCHEMA["/occupancy-costs/hidden-occupancy-costs"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/occupancy-costs","label":"Occupancy costs"},{"href":"/occupancy-costs/hidden-occupancy-costs","label":"What hidden occupancy costs do tenants miss?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room and city view used as editorial context. Not a photographed customer." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">occupancy costs</p>
            <h1 className="pv-display">What hidden occupancy costs do tenants miss?</h1>
            <div data-question-id="q_ed10c7572b5857d3" data-answer-chunk-id="q_ed10c7572b5857d3_chunk">
              <AnswerFirst question="What hidden occupancy costs do tenants miss?" answer="Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">Read what CAM means</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_e1bc02e9d61c4e1e" data-answer-chunk-id="q_e1bc02e9d61c4e1e_0" data-supporting-section="define">
              <AnswerFirst question="How large can the hide be?" answer="Public guides often cite 20 to 40 percent beyond base rent. Your deal can sit outside that." />
            </div>
            <div data-question-id="q_1d8cb96fe7598a3a" data-answer-chunk-id="q_1d8cb96fe7598a3a_1" data-supporting-section="define">
              <AnswerFirst question="What is the first place to look?" answer="CAM, tax, and insurance history." />
            </div>
            <div data-question-id="q_c78586ec73d37cc8" data-answer-chunk-id="q_c78586ec73d37cc8_2" data-supporting-section="define">
              <AnswerFirst question="Do moving costs belong?" answer="Yes in a stay-versus-move pick. Maybe not in a two-building rent compare." />
            </div>
            <div data-question-id="q_2d3986150ca90ddc" data-answer-chunk-id="q_2d3986150ca90ddc_3" data-supporting-section="define">
              <AnswerFirst question="What about management fees?" answer="They can sit inside CAM. Ask for the percent." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A hidden cost is a cash item the sticker never showed.</p>
            <p>Some hide in the extra stack. Some hide in year-one spend.</p>
            <p>None of them are magic. They are unread lines.</p>
            <p>This page sits under <a href="/occupancy-costs/">Occupancy costs</a>.</p>
            <p>Most hides start as unread <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">CAM</a> lines.</p>
            <p>Extras can flip a rank the same way <a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/">rate flips</a> do.</p>
            <p>Move-in spend belongs in <a href="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/">stay versus move</a>.</p>
            <p>The <a href="/compare-commercial-leases">workflow</a> is built to keep extras on the page.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Public writeups put the surprise in the 20 to 40 percent range beyond base rent.</p>
            <p>A sale can reassess tax.</p>
            <p>Insurance can jump after a bad year in the region.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Public writeups put the surprise in the 20 to 40 percent range beyond base rent.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Ask for extra history, not a single CAM quote.</li><li>Ask what happens after a sale.</li><li>Ask who pays parking and after-hours HVAC.</li><li>Put move costs on a side list if they change the stay-versus-move pick.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Hidden add = tax delta + insurance delta + CAM true-up + parking + leftover build-out.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Tax history</th><td>And reassessment risk</td></tr><tr><th scope="row">Insurance</th><td>Trend, not one year</td></tr><tr><th scope="row">CAM true-up</th><td>Estimate versus actual</td></tr><tr><th scope="row">Move-in</th><td>Furniture, move, leftover TI</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$27,500</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$25,575</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$324,745</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Hidden-cost sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$27,500</td><td>$25,575</td></tr><tr><th scope="row">Year-1 extras</th><td>$15,500</td><td>$16,585</td></tr><tr><th scope="row">Year-1 credit</th><td>$3,000</td><td>$1,650</td></tr><tr><th scope="row">Sample NPV</th><td>$324,745</td><td>$319,452</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Hidden-cost sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$27,500</td><td>$15,500</td><td>$3,000</td><td>$40,000</td><td>$37,037</td></tr><tr><th scope="row">Year 2</th><td>$28,462</td><td>$15,965</td><td>$0</td><td>$44,427</td><td>$38,089</td></tr><tr><th scope="row">Year 3</th><td>$29,459</td><td>$16,444</td><td>$0</td><td>$45,903</td><td>$36,439</td></tr><tr><th scope="row">Year 4</th><td>$30,490</td><td>$16,937</td><td>$0</td><td>$47,427</td><td>$34,860</td></tr><tr><th scope="row">Year 5</th><td>$31,557</td><td>$17,445</td><td>$0</td><td>$49,002</td><td>$33,350</td></tr><tr><th scope="row">Year 6</th><td>$32,504</td><td>$17,968</td><td>$0</td><td>$50,472</td><td>$31,806</td></tr><tr><th scope="row">Year 7</th><td>$33,479</td><td>$18,507</td><td>$0</td><td>$51,986</td><td>$30,333</td></tr><tr><th scope="row">Year 8</th><td>$34,483</td><td>$19,062</td><td>$0</td><td>$53,545</td><td>$28,929</td></tr><tr><th scope="row">Year 9</th><td>$35,517</td><td>$19,634</td><td>$0</td><td>$55,151</td><td>$27,589</td></tr><tr><th scope="row">Year 10</th><td>$36,583</td><td>$20,223</td><td>$0</td><td>$56,806</td><td>$26,312</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$324,745</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Hidden-cost sample is about $324,745. A second path lands near $319,452. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Hidden-cost sample</h3>
              <ul><li>Year 1 of Hidden-cost sample has rent of $27,500.</li><li>Shared building cost is $15,500.</li><li>A credit of $3,000 lowers the cash you pay that year.</li><li>Cash out this year is about $40,000. Year one looks calm until extras land.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $37,037 today.</li></ul>
              <ul><li>Next, year 2 rent is $28,462.</li><li>CAM, which is a shared building cost, is $15,965.</li><li>There is no credit in this year.</li><li>You pay about $44,427 this year after extras and credits. A tax step can sit in year two.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $38,089 today.</li></ul>
              <ul><li>Then year 3 rent is $29,459.</li><li>Extras for the building come to $16,444.</li><li>Credits skip this year.</li><li>The net cash this year is about $45,903. Insurance can jump without a rent bump.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $36,439 today.</li></ul>
              <ul><li>After that, year 4 rent is $30,490.</li><li>The shared building cost this time is $16,937.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $47,427. Later years keep the extra stack.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $34,860 today.</li></ul>
              <ul><li>In year 5 of Hidden-cost sample, rent is $31,557.</li><li>Shared building cost is $17,445.</li><li>There is no credit in this year.</li><li>You pay about $49,002 this year after extras and credits. The last year is not a sticker year.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $33,350 today.</li></ul>
              <ul><li>Year 6 of Hidden-cost sample has rent of $32,504.</li><li>CAM, which is a shared building cost, is $17,968.</li><li>Credits skip this year.</li><li>The net cash this year is about $50,472. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $31,806 today.</li></ul>
              <ul><li>Next, year 7 rent is $33,479.</li><li>Extras for the building come to $18,507.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $51,986. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $30,333 today.</li></ul>
              <ul><li>Then year 8 rent is $34,483.</li><li>The shared building cost this time is $19,062.</li><li>There is no credit in this year.</li><li>You pay about $53,545 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $28,929 today.</li></ul>
              <ul><li>After that, year 9 rent is $35,517.</li><li>Shared building cost is $19,634.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,151. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $27,589 today.</li></ul>
              <ul><li>In year 10 of Hidden-cost sample, rent is $36,583.</li><li>CAM, which is a shared building cost, is $20,223.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $56,806. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $26,312 today.</li></ul><p>Add those year values. The sample NPV for Hidden-cost sample is about $324,745. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Hidden-cost sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-sensitivity-analysis/">Test the cost assumptions</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample inflates extras on purpose so the hide is visible.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>Early termination fees are hidden only if no one read the exit clause.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Using year-one extras for a ten-year stay.</li><li>Ignoring parking because it sits on another invoice.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If two buildings tie on rent, pick on extras and risk, not on paint.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/">renewal versus relocation</a> when move-in spend is the swing.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>Not every extra belongs in NPV. Some belong in a one-time cash view.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not pad extras to sink a building you dislike.</li></ul>
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
            <p className="pv-spoke-index"><a href="/occupancy-costs/what-is-total-occupancy-cost">What is total occupancy cost in a commercial lease?</a> · <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease">What is CAM in a commercial lease?</a> · <a href="/occupancy-costs/occupancy-cost-per-square-foot">What is occupancy cost per square foot?</a></p>
            
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
            <RelatedContent items={[{"href":"/occupancy-costs/occupancy-cost-per-square-foot/","label":"Occupancy cost per foot","description":"The unit form of the stack."}]} /></div>
            <div className="pv-related-family"><h3>For tenant-rep brokers</h3>
            <RelatedContent items={[{"href":"/tenant-rep-analysis/","label":"Tenant-rep analysis","description":"How to show the hide without theater."}]} /></div>
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
          <nav className="sn-block" data-semantic-navigation="GO_DEEPER" aria-label="Go deeper">
            <div className="sn-block-head">
              <span className="sn-kicker">GO DEEPER</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" data-card-role="TOPIC" href="/occupancy-costs/" data-relationship="parent-hub" aria-label="Occupancy costs. Face rent is not the full bill.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Occupancy costs</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-total-occupancy-cost/" data-relationship="related" aria-label="What is total occupancy cost in a commercial lease. Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is total occupancy cost in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-cam-in-a-commercial-lease/" data-relationship="related" aria-label="What is CAM in a commercial lease. CAM means common area maintenance.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is CAM in a commercial lease</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/occupancy-cost-per-square-foot/" data-relationship="related" aria-label="What is occupancy cost per square foot. Divide the full yearly stack by the feet you pay for.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is occupancy cost per square foot</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
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
