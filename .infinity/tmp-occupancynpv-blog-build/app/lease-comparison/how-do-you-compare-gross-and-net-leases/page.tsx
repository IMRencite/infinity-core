import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How do you compare gross and net leases?",
  description: "A lower net face rent can cost more after CAM, tax, and insurance. Convert both offers to one occupancy-cost stack.",
  alternates: { canonical: "/lease-comparison/how-do-you-compare-gross-and-net-leases/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How do you compare gross and net leases?", description: "A lower net face rent can cost more after CAM, tax, and insurance. Convert both offers to one occupancy-cost stack." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-comparison/how-do-you-compare-gross-and-net-leases" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-comparison">
        <JsonLdBlock data={SITE_SCHEMA["/lease-comparison/how-do-you-compare-gross-and-net-leases"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-comparison","label":"Lease comparison"},{"href":"/lease-comparison/how-do-you-compare-gross-and-net-leases","label":"How do you compare a gross lease and a net lease?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease comparison</p>
            <h1 className="pv-display">How do you compare a gross lease and a net lease?</h1>
            <div data-question-id="q_467875c425f7c96a" data-answer-chunk-id="q_467875c425f7c96a_chunk">
              <AnswerFirst question="How do you compare a gross lease and a net lease?" answer="Add tenant-paid extras to the net path until both offers show the same occupancy stack. Then compare." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/occupancy-costs/">Read occupancy costs</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_2300bb0c58100715" data-answer-chunk-id="q_2300bb0c58100715_0" data-supporting-section="define">
              <AnswerFirst question="Why is the net rent lower?" answer="Because extras were left off the sticker. They still arrive as bills." />
            </div>
            <div data-question-id="q_a0a979004cfba1c5" data-answer-chunk-id="q_a0a979004cfba1c5_1" data-supporting-section="define">
              <AnswerFirst question="What do you add to a net lease?" answer="CAM, tax, and insurance, plus any other tenant-paid extra." />
            </div>
            <div data-question-id="q_b55df2e1460c17da" data-answer-chunk-id="q_b55df2e1460c17da_2" data-supporting-section="define">
              <AnswerFirst question="Can a gross lease still lose?" answer="Yes, if its rent is high and the net extras are truly small." />
            </div>
            <div data-question-id="q_2d06d7187ad37c29" data-answer-chunk-id="q_2d06d7187ad37c29_3" data-supporting-section="define">
              <AnswerFirst question="Does NPV change the rule?" answer="NPV still needs the same extras on the timeline first." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A gross lease folds many extras into the rent number.</p>
            <p>A net lease quotes a lower rent and then bills extras.</p>
            <p>CAM means common area maintenance. Tax and insurance often join it.</p>
            <p>Until you add those extras, the low net sticker is not a fact.</p>
            <p>This page sits under <a href="/lease-comparison/">Lease comparison</a>.</p>
            <p>The extra stack is <a href="/occupancy-costs/">occupancy cost</a> by another name.</p>
            <p><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">Normalize</a> before you negotiate.</p>
            <p>The same extras belong in <a href="/commercial-lease-npv/what-costs-belong-in-lease-npv/">NPV costs</a>.</p>
            <p>The <a href="/compare-commercial-leases">workflow</a> exists to stop sticker math.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Add tenant-paid extras to the net path until both offers show the same occupancy stack. Then compare.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>This is the most common false save.</p>
            <p>Teams celebrate an $18 net and ignore $12 of extras.</p>
            <p>A $30 gross can be the cheaper stay.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>This is the most common false save.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Label each offer as gross, modified, or net.</li><li>Ask for the extra stack in writing.</li><li>Add extras to the net path.</li><li>Only then rank with NPV or effective rent.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Net occupancy = net rent + CAM + tax + insurance. Compare that to the gross rent.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Quoted rent</th><td>The sticker</td></tr><tr><th scope="row">Lease type</th><td>Gross or net</td></tr><tr><th scope="row">Extra stack</th><td>CAM, tax, insurance</td></tr><tr><th scope="row">Credits</th><td>Free rent and TI</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$28,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$26,040</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$324,794</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Gross versus net sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$28,000</td><td>$26,040</td></tr><tr><th scope="row">Year-1 extras</th><td>$16,000</td><td>$17,120</td></tr><tr><th scope="row">Year-1 credit</th><td>$8,000</td><td>$4,400</td></tr><tr><th scope="row">Sample NPV</th><td>$324,794</td><td>$321,785</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Gross versus net sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$28,000</td><td>$16,000</td><td>$8,000</td><td>$36,000</td><td>$33,333</td></tr><tr><th scope="row">Year 2</th><td>$28,840</td><td>$16,480</td><td>$0</td><td>$45,320</td><td>$38,855</td></tr><tr><th scope="row">Year 3</th><td>$29,705</td><td>$16,974</td><td>$0</td><td>$46,679</td><td>$37,055</td></tr><tr><th scope="row">Year 4</th><td>$30,596</td><td>$17,484</td><td>$0</td><td>$48,080</td><td>$35,340</td></tr><tr><th scope="row">Year 5</th><td>$31,514</td><td>$18,008</td><td>$0</td><td>$49,522</td><td>$33,704</td></tr><tr><th scope="row">Year 6</th><td>$32,459</td><td>$18,548</td><td>$0</td><td>$51,007</td><td>$32,143</td></tr><tr><th scope="row">Year 7</th><td>$33,433</td><td>$19,104</td><td>$0</td><td>$52,537</td><td>$30,655</td></tr><tr><th scope="row">Year 8</th><td>$34,436</td><td>$19,677</td><td>$0</td><td>$54,113</td><td>$29,236</td></tr><tr><th scope="row">Year 9</th><td>$35,469</td><td>$20,267</td><td>$0</td><td>$55,736</td><td>$27,882</td></tr><tr><th scope="row">Year 10</th><td>$36,533</td><td>$20,875</td><td>$0</td><td>$57,408</td><td>$26,591</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$324,794</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Gross versus net sample is about $324,794. A second path lands near $321,785. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Gross versus net sample</h3>
              <ul><li>Year 1 of Gross versus net sample has rent of $28,000.</li><li>Shared building cost is $16,000.</li><li>A credit of $8,000 lowers the cash you pay that year.</li><li>Cash out this year is about $36,000. The extra stack is the story on this net path.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $33,333 today.</li></ul>
              <ul><li>Next, year 2 rent is $28,840.</li><li>CAM, which is a shared building cost, is $16,480.</li><li>There is no credit in this year.</li><li>You pay about $45,320 this year after extras and credits. Rent is low. Extras are not.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $38,855 today.</li></ul>
              <ul><li>Then year 3 rent is $29,705.</li><li>Extras for the building come to $16,974.</li><li>Credits skip this year.</li><li>The net cash this year is about $46,679. The gap stays after year one.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $37,055 today.</li></ul>
              <ul><li>After that, year 4 rent is $30,596.</li><li>The shared building cost this time is $17,484.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $48,080. A gross rival would show a higher rent and a thinner extra line.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $35,340 today.</li></ul>
              <ul><li>In year 5 of Gross versus net sample, rent is $31,514.</li><li>Shared building cost is $18,008.</li><li>There is no credit in this year.</li><li>You pay about $49,522 this year after extras and credits. The last year still carries extras.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $33,704 today.</li></ul>
              <ul><li>Year 6 of Gross versus net sample has rent of $32,459.</li><li>CAM, which is a shared building cost, is $18,548.</li><li>Credits skip this year.</li><li>The net cash this year is about $51,007. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $32,143 today.</li></ul>
              <ul><li>Next, year 7 rent is $33,433.</li><li>Extras for the building come to $19,104.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $52,537. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $30,655 today.</li></ul>
              <ul><li>Then year 8 rent is $34,436.</li><li>The shared building cost this time is $19,677.</li><li>There is no credit in this year.</li><li>You pay about $54,113 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $29,236 today.</li></ul>
              <ul><li>After that, year 9 rent is $35,469.</li><li>Shared building cost is $20,267.</li><li>Credits skip this year.</li><li>The net cash this year is about $55,736. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $27,882 today.</li></ul>
              <ul><li>In year 10 of Gross versus net sample, rent is $36,533.</li><li>CAM, which is a shared building cost, is $20,875.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,408. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $26,591 today.</li></ul><p>Add those year values. The sample NPV for Gross versus net sample is about $324,794. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Gross versus net sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals/">See how to normalize offers</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The net extras are estimates. Live deals need landlord history.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A modified gross lease needs an expense stop, not a guess.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Ranking on face rent across types.</li><li>Using last year's CAM as if it cannot rise.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If extras are missing, pause the rank.</p>
            <h2>Compare this to related metrics</h2>
            <p>Read <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">what CAM means</a> before you add a round number.</p>
            <p>Read <a href="/occupancy-costs/hidden-occupancy-costs/">hidden occupancy costs</a> for the rest of the stack.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>Labels vary by market. Read the clause, not the nickname.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not treat NNN as automatically cheaper.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="Try the comparison workflow" data-search-intent="INFORMATIONAL" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/compare-commercial-leases">Try the comparison workflow</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals">How do you normalize commercial lease proposals?</a> · <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison">What belongs in a commercial lease comparison?</a> · <a href="/lease-comparison/how-do-brokers-compare-lease-offers">How do tenant-rep brokers compare lease offers?</a></p>
            
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
            <div className="pv-related-family"><h3>Related lease concepts</h3>
            <RelatedContent items={[{"href":"/occupancy-costs/what-is-cam-in-a-commercial-lease/","label":"What is CAM?","description":"The extra people skip first."}]} /></div>
            <div className="pv-related-family"><h3>Learn this first</h3>
            <RelatedContent items={[{"href":"/lease-comparison/","label":"Lease comparison","description":"Hub for the whole compare path."}]} /></div>
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
          <nav className="sn-block" data-semantic-navigation="COMPARE_NEXT" aria-label="Compare the next decision">
            <div className="sn-block-head">
              <span className="sn-kicker">COMPARE NEXT</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-4">
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/" data-relationship="comparison" aria-label="Compare two commercial leases. Put both leases on one timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Compare two commercial leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-npv/" data-relationship="comparison" aria-label="Effective rent vs NPV. One number can hide later cash.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Effective rent vs NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/occupancy-costs/what-is-total-occupancy-cost/" data-relationship="related" aria-label="What is total occupancy cost. Add the extras that sit beside rent.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is total occupancy cost</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Use the comparison workflow. Try the same method on a sample pair.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Use the comparison workflow</strong><span className="sn-desc">Try the same method on a sample pair.</span></span>
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
