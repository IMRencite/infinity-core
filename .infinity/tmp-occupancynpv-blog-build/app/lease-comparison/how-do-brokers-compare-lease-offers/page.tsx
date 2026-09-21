import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How do brokers compare lease offers?",
  description: "Brokers put both stacks on one timeline, discount the cash, and keep the assumptions visible for the client.",
  alternates: { canonical: "/lease-comparison/how-do-brokers-compare-lease-offers/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How do brokers compare lease offers?", description: "Brokers put both stacks on one timeline, discount the cash, and keep the assumptions visible for the client." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-comparison/how-do-brokers-compare-lease-offers" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-comparison">
        <JsonLdBlock data={SITE_SCHEMA["/lease-comparison/how-do-brokers-compare-lease-offers"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-comparison","label":"Lease comparison"},{"href":"/lease-comparison/how-do-brokers-compare-lease-offers","label":"How do tenant-rep brokers compare lease offers?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease comparison</p>
            <h1 className="pv-display">How do tenant-rep brokers compare lease offers?</h1>
            <div data-question-id="q_8a12223920b83ead" data-answer-chunk-id="q_8a12223920b83ead_chunk">
              <AnswerFirst question="How do tenant-rep brokers compare lease offers?" answer="Brokers rebuild each offer as cash, extras, and credits, then discount both at one rate and keep the assumptions visible." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/for/tenant-rep-brokers">See the Tenant-Rep Workflow</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_13cb36d4d121949a" data-answer-chunk-id="q_13cb36d4d121949a_0" data-supporting-section="define">
              <AnswerFirst question="What do brokers actually compare?" answer="Cash over time, not stickers. Extras and credits sit on the same page." />
            </div>
            <div data-question-id="q_1f1d71e9a86c0e89" data-answer-chunk-id="q_1f1d71e9a86c0e89_1" data-supporting-section="define">
              <AnswerFirst question="How do they show savings?" answer="As a gap between two complete stacks, with the rate in view." />
            </div>
            <div data-question-id="q_5622a0fa08a49df1" data-answer-chunk-id="q_5622a0fa08a49df1_2" data-supporting-section="define">
              <AnswerFirst question="When does finance join?" answer="When the stack is complete and the rate is no longer a guess." />
            </div>
            <div data-question-id="q_8505a7c1dd8269f4" data-answer-chunk-id="q_8505a7c1dd8269f4_3" data-supporting-section="define">
              <AnswerFirst question="What is the next step?" answer="A memo, a counter, or a request for missing extras." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Brokers use a compare as a client tool, not a listing tool.</p>
            <p>Your job is to stop a sticker from winning the meeting.</p>
            <p>Keep the method as the same stack you would show a CFO.</p>
            <p>Plain tone helps. Shared math helps more.</p>
            <p>This page sits under <a href="/lease-comparison/">Lease comparison</a>.</p>
            <p>The compare becomes a <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">memo</a> when a pick is due.</p>
            <p>Show <a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/">why sensitivity</a> belongs beside the win.</p>
            <p>Pilot <a href="/pricing">pricing</a> is a hypothesis. Live checkout is available on the pricing page.</p>
            <p>Keep the <a href="/commercial-lease-npv/">NPV hub</a> linked from the talk.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Brokers rebuild each offer as cash, extras, and credits, then discount both at one rate and keep the assumptions visible.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Clients hire a tenant-rep broker to see the whole bill.</p>
            <p>A hidden extra becomes the broker's problem later.</p>
            <p>A clean compare also sets the next ask.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Clients hire a tenant-rep broker to see the whole bill.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Abstract each offer into money lines.</li><li>Normalize lease type and dates.</li><li>Discount both streams at one rate.</li><li>Show a flip case.</li><li>Write the recommendation in one page.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Broker compare = normalized stacks + one rate + one flip case + a written pick.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">LOI or proposal</th><td>The raw offer</td></tr><tr><th scope="row">Extra history</th><td>CAM, tax, insurance</td></tr><tr><th scope="row">Credits</th><td>Free rent and TI</td></tr><tr><th scope="row">Client rate</th><td>Cost of capital or agreed rate</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$45,500</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$42,315</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$390,494</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Broker-compare sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$45,500</td><td>$42,315</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,800</td><td>$9,416</td></tr><tr><th scope="row">Year-1 credit</th><td>$19,000</td><td>$10,450</td></tr><tr><th scope="row">Sample NPV</th><td>$390,494</td><td>$379,145</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Broker-compare sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$45,500</td><td>$8,800</td><td>$19,000</td><td>$35,300</td><td>$32,685</td></tr><tr><th scope="row">Year 2</th><td>$46,774</td><td>$9,064</td><td>$0</td><td>$55,838</td><td>$47,872</td></tr><tr><th scope="row">Year 3</th><td>$48,084</td><td>$9,336</td><td>$0</td><td>$57,420</td><td>$45,582</td></tr><tr><th scope="row">Year 4</th><td>$49,430</td><td>$9,616</td><td>$0</td><td>$59,046</td><td>$43,401</td></tr><tr><th scope="row">Year 5</th><td>$50,814</td><td>$9,904</td><td>$0</td><td>$60,718</td><td>$41,324</td></tr><tr><th scope="row">Year 6</th><td>$52,338</td><td>$10,201</td><td>$0</td><td>$62,539</td><td>$39,410</td></tr><tr><th scope="row">Year 7</th><td>$53,908</td><td>$10,507</td><td>$0</td><td>$64,415</td><td>$37,586</td></tr><tr><th scope="row">Year 8</th><td>$55,525</td><td>$10,822</td><td>$0</td><td>$66,347</td><td>$35,845</td></tr><tr><th scope="row">Year 9</th><td>$57,191</td><td>$11,147</td><td>$0</td><td>$68,338</td><td>$34,186</td></tr><tr><th scope="row">Year 10</th><td>$58,907</td><td>$11,481</td><td>$0</td><td>$70,388</td><td>$32,603</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$390,494</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Broker-compare sample is about $390,494. A second path lands near $379,145. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Broker-compare sample</h3>
              <ul><li>Year 1 of Broker-compare sample has rent of $45,500.</li><li>Shared building cost is $8,800.</li><li>A credit of $19,000 lowers the cash you pay that year.</li><li>Cash out this year is about $35,300. The credit is the talking point in year one.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $32,685 today.</li></ul>
              <ul><li>Next, year 2 rent is $46,774.</li><li>CAM, which is a shared building cost, is $9,064.</li><li>There is no credit in this year.</li><li>You pay about $55,838 this year after extras and credits. Year two is the first clean bill.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $47,872 today.</li></ul>
              <ul><li>Then year 3 rent is $48,084.</li><li>Extras for the building come to $9,336.</li><li>Credits skip this year.</li><li>The net cash this year is about $57,420. The bump starts to show the true rent.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $45,582 today.</li></ul>
              <ul><li>After that, year 4 rent is $49,430.</li><li>The shared building cost this time is $9,616.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $59,046. Later years are where sticker math fails.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $43,401 today.</li></ul>
              <ul><li>In year 5 of Broker-compare sample, rent is $50,814.</li><li>Shared building cost is $9,904.</li><li>There is no credit in this year.</li><li>You pay about $60,718 this year after extras and credits. The last year is still in the client total.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $41,324 today.</li></ul>
              <ul><li>Year 6 of Broker-compare sample has rent of $52,338.</li><li>CAM, which is a shared building cost, is $10,201.</li><li>Credits skip this year.</li><li>The net cash this year is about $62,539. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $39,410 today.</li></ul>
              <ul><li>Next, year 7 rent is $53,908.</li><li>Extras for the building come to $10,507.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $64,415. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $37,586 today.</li></ul>
              <ul><li>Then year 8 rent is $55,525.</li><li>The shared building cost this time is $10,822.</li><li>There is no credit in this year.</li><li>You pay about $66,347 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $35,845 today.</li></ul>
              <ul><li>After that, year 9 rent is $57,191.</li><li>Shared building cost is $11,147.</li><li>Credits skip this year.</li><li>The net cash this year is about $68,338. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $34,186 today.</li></ul>
              <ul><li>In year 10 of Broker-compare sample, rent is $58,907.</li><li>CAM, which is a shared building cost, is $11,481.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $70,388. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $32,603 today.</li></ul><p>Add those year values. The sample NPV for Broker-compare sample is about $390,494. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Broker-compare sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample is a teaching method, not a live listing.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If two spaces serve different teams, do not force one number to pick.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Saving claims without a stack.</li><li>Different rates per landlord.</li><li>No flip case.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the gap is thin, negotiate the extra, not the story.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/">how brokers compare LOIs</a> when the paper is still a sketch.</p>
            <p>See <a href="/for/tenant-rep-brokers">the tenant-rep workflow</a> for the product path.</p>
            <aside className="pv-callout ed-highlight" data-callout="FOR_TENANT_REP"><h3>For tenant-rep brokers</h3><p>Your value is the shared stack, not a secret spreadsheet.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>The method does not replace local market knowledge.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use it to attack another broker. Use it to show cash.</li></ul>
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
            <p className="pv-spoke-index"><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals">How do you normalize commercial lease proposals?</a> · <a href="/lease-comparison/how-do-you-compare-gross-and-net-leases">How do you compare a gross lease and a net lease?</a> · <a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison">What belongs in a commercial lease comparison?</a></p>
            
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
            <RelatedContent items={[{"href":"/for/tenant-rep-brokers","label":"Persona page","description":"The commercial next step."}]} /></div>
            <div className="pv-related-family"><h3>Go deeper</h3>
            <RelatedContent items={[{"href":"/lease-comparison/how-do-you-compare-two-commercial-lease-options/","label":"Worked two-option compare","description":"A full walk."}]} /></div>
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
            <div className="sn-grid sn-grid--count-4">
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
            </div>
          </nav>
        </div>
        </section>
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
