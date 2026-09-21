import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How to explain lease NPV to clients",
  description: "Tell the client this is the price of the deal in today's dollars, then show the cash years and the rate you used.",
  alternates: { canonical: "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How to explain lease NPV to clients", description: "Tell the client this is the price of the deal in today's dollars, then show the cash years and the rate you used." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/commercial-lease-npv/how-to-explain-lease-npv-to-clients" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="commercial-lease-npv">
        <JsonLdBlock data={SITE_SCHEMA["/commercial-lease-npv/how-to-explain-lease-npv-to-clients"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/commercial-lease-npv","label":"Commercial lease NPV"},{"href":"/commercial-lease-npv/how-to-explain-lease-npv-to-clients","label":"How should you explain lease NPV to a client?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">commercial lease npv</p>
            <h1 className="pv-display">How should you explain lease NPV to a client?</h1>
            <div data-question-id="q_b6399c9dc669ee20" data-answer-chunk-id="q_b6399c9dc669ee20_chunk">
              <AnswerFirst question="How should you explain lease NPV to a client?" answer="Say this is the price of the deal in today's dollars. Then show the years, the credits, and the rate." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/for/tenant-rep-brokers">See the tenant-rep workflow</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_7c0542ad331b8430" data-answer-chunk-id="q_7c0542ad331b8430_0" data-supporting-section="define">
              <AnswerFirst question="What should you say first?" answer="This number is the deal in today's dollars. It is not a grade for the building." />
            </div>
            <div data-question-id="q_846e23f016915764" data-answer-chunk-id="q_846e23f016915764_1" data-supporting-section="define">
              <AnswerFirst question="What must stay visible?" answer="The years, the extras, the credits, and the rate." />
            </div>
            <div data-question-id="q_6018b6b47071cc10" data-answer-chunk-id="q_6018b6b47071cc10_2" data-supporting-section="define">
              <AnswerFirst question="What if they only want rent per foot?" answer="Show that too. Then show why timing still matters." />
            </div>
            <div data-question-id="q_c88e53f86fc5a4bb" data-answer-chunk-id="q_c88e53f86fc5a4bb_3" data-supporting-section="define">
              <AnswerFirst question="When do you stop?" answer="Stop when the gap is clear and the limits are named." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Clients do not need the formula first. They need the story.</p>
            <p>NPV is a consistency tool. It puts two messy offers on one scale.</p>
            <p>The scale is today's dollars. That is the whole trick.</p>
            <p>If you skip the years, the total feels like a trick.</p>
            <p>This page sits under <a href="/commercial-lease-npv/">Commercial lease NPV</a>.</p>
            <p>Keep the <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">calculation</a> one click away from the talk track.</p>
            <p>A <a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/">CFO deck</a> needs the flip case, not just the win case.</p>
            <p>Have <a href="/effective-rent/how-to-calculate-effective-rent/">effective rent</a> ready if they want a yearly foot number.</p>
            <p>This site is a lease comparison product. <a href="/early-access">Request Pilot Access</a> if the workflow fits.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Say this is the price of the deal in today's dollars. Then show the years, the credits, and the rate.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>A CFO will ask what sat in the number.</p>
            <p>A founder will ask why the cheaper rent lost.</p>
            <p>A legal team will ask what you left out.</p>
            <p>A clear story prevents a false save claim.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>A CFO will ask what sat in the number.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Open with one sentence: this is today's cost of the stream.</li><li>Show year-one cash next to a later year.</li><li>Name the rate and why you picked it.</li><li>Show one nearby rate so no one thinks the rank is magic.</li><li>Close with what NPV cannot score.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Tell it in words: later cash shrinks. Add the shrunk years. Compare those totals.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Plain opener</th><td>Today's dollars, not a slogan</td></tr><tr><th scope="row">Year table</th><td>Cash the client can audit</td></tr><tr><th scope="row">Visible rate</th><td>The price of waiting</td></tr><tr><th scope="row">Limit line</th><td>What the number does not decide</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$44,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$40,920</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$371,068</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Client-story sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$44,000</td><td>$40,920</td></tr><tr><th scope="row">Year-1 extras</th><td>$7,600</td><td>$8,132</td></tr><tr><th scope="row">Year-1 credit</th><td>$20,000</td><td>$11,000</td></tr><tr><th scope="row">Sample NPV</th><td>$371,068</td><td>$360,161</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Client-story sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$44,000</td><td>$7,600</td><td>$20,000</td><td>$31,600</td><td>$29,259</td></tr><tr><th scope="row">Year 2</th><td>$45,320</td><td>$7,828</td><td>$0</td><td>$53,148</td><td>$45,566</td></tr><tr><th scope="row">Year 3</th><td>$46,680</td><td>$8,063</td><td>$0</td><td>$54,743</td><td>$43,457</td></tr><tr><th scope="row">Year 4</th><td>$48,080</td><td>$8,305</td><td>$0</td><td>$56,385</td><td>$41,445</td></tr><tr><th scope="row">Year 5</th><td>$49,522</td><td>$8,554</td><td>$0</td><td>$58,076</td><td>$39,526</td></tr><tr><th scope="row">Year 6</th><td>$51,008</td><td>$8,811</td><td>$0</td><td>$59,819</td><td>$37,696</td></tr><tr><th scope="row">Year 7</th><td>$52,538</td><td>$9,075</td><td>$0</td><td>$61,613</td><td>$35,951</td></tr><tr><th scope="row">Year 8</th><td>$54,114</td><td>$9,347</td><td>$0</td><td>$63,461</td><td>$34,286</td></tr><tr><th scope="row">Year 9</th><td>$55,737</td><td>$9,627</td><td>$0</td><td>$65,364</td><td>$32,698</td></tr><tr><th scope="row">Year 10</th><td>$57,409</td><td>$9,916</td><td>$0</td><td>$67,325</td><td>$31,185</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$371,068</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Client-story sample is about $371,068. A second path lands near $360,161. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Client-story sample</h3>
              <ul><li>Year 1 of Client-story sample has rent of $44,000.</li><li>Shared building cost is $7,600.</li><li>A credit of $20,000 lowers the cash you pay that year.</li><li>Cash out this year is about $31,600. The big credit is the talking point.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $29,259 today.</li></ul>
              <ul><li>Next, year 2 rent is $45,320.</li><li>CAM, which is a shared building cost, is $7,828.</li><li>There is no credit in this year.</li><li>You pay about $53,148 this year after extras and credits. Year two looks plain after the credit.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $45,566 today.</li></ul>
              <ul><li>Then year 3 rent is $46,680.</li><li>Extras for the building come to $8,063.</li><li>Credits skip this year.</li><li>The net cash this year is about $54,743. The step starts to show.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $43,457 today.</li></ul>
              <ul><li>After that, year 4 rent is $48,080.</li><li>The shared building cost this time is $8,305.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $56,385. Later cash is the part people forget.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $41,445 today.</li></ul>
              <ul><li>In year 5 of Client-story sample, rent is $49,522.</li><li>Shared building cost is $8,554.</li><li>There is no credit in this year.</li><li>You pay about $58,076 this year after extras and credits. The last year still belongs in the client story.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $39,526 today.</li></ul>
              <ul><li>Year 6 of Client-story sample has rent of $51,008.</li><li>CAM, which is a shared building cost, is $8,811.</li><li>Credits skip this year.</li><li>The net cash this year is about $59,819. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $37,696 today.</li></ul>
              <ul><li>Next, year 7 rent is $52,538.</li><li>Extras for the building come to $9,075.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $61,613. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,951 today.</li></ul>
              <ul><li>Then year 8 rent is $54,114.</li><li>The shared building cost this time is $9,347.</li><li>There is no credit in this year.</li><li>You pay about $63,461 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $34,286 today.</li></ul>
              <ul><li>After that, year 9 rent is $55,737.</li><li>Shared building cost is $9,627.</li><li>Credits skip this year.</li><li>The net cash this year is about $65,364. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,698 today.</li></ul>
              <ul><li>In year 10 of Client-story sample, rent is $57,409.</li><li>CAM, which is a shared building cost, is $9,916.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $67,325. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $31,185 today.</li></ul><p>Add those year values. The sample NPV for Client-story sample is about $371,068. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Client-story sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/">Read the broker explainer</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample is a teaching talk track, not a live pitch.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If the client rejects discounting, show total cash beside NPV. Do not hide either.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Leading with savings they cannot cash.</li><li>Hiding the rate.</li><li>Skipping extras.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the client cares about cash this quarter, show year-one cash first, then NPV.</p>
            <h2>Compare this to related metrics</h2>
            <p>Effective rent can be the short number. NPV is the honest timing number.</p>
            <p>See <a href="/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/">how a broker explains lease economics</a> for the wider story.</p>
            <aside className="pv-callout ed-highlight" data-callout="FOR_FINANCE"><h3>For finance</h3><p>Ask for the rate, the extras, and the year the credit lands.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>A story cannot replace a lease abstract.</li><li>A story cannot replace counsel.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use NPV theater when the offers are not complete.</li></ul>
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
            <p className="pv-spoke-index"><a href="/commercial-lease-npv/how-is-lease-npv-calculated">How is lease NPV calculated?</a> · <a href="/commercial-lease-npv/what-costs-belong-in-lease-npv">What costs belong in commercial lease NPV?</a> · <a href="/commercial-lease-npv/npv-vs-present-value">What is the difference between NPV and present value in a lease?</a></p>
            
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
            <RelatedContent items={[{"href":"/for/tenant-rep-brokers","label":"Persona page","description":"See the proposed broker workflow."}]} /></div>
            <div className="pv-related-family"><h3>Next step</h3>
            <RelatedContent items={[{"href":"/how-it-works","label":"How it works","description":"See the four-step path."}]} /></div>
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
