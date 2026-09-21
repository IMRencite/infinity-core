import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "Effective rent vs NPV",
  description: "Effective rent averages. NPV discounts time. Learn when each helps, when each hides risk, and how to use both without mixing them up.",
  alternates: { canonical: "/effective-rent/effective-rent-vs-npv/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Effective rent vs NPV", description: "Effective rent averages. NPV discounts time. Learn when each helps, when each hides risk, and how to use both without mixing them up." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/effective-rent/effective-rent-vs-npv" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="effective-rent">
        <JsonLdBlock data={SITE_SCHEMA["/effective-rent/effective-rent-vs-npv"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/effective-rent","label":"Effective rent"},{"href":"/effective-rent/effective-rent-vs-npv","label":"Effective rent vs NPV: what is the difference?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">effective rent</p>
            <h1 className="pv-display">Effective rent vs NPV: what is the difference?</h1>
            <div data-question-id="q_515d0fea9b718802" data-answer-chunk-id="q_515d0fea9b718802_chunk">
              <AnswerFirst question="Effective rent vs NPV: what is the difference?" answer="Effective rent is an average rent number. NPV is later cash brought into today's dollars and added. Use the average to talk. Use NPV when timing matters." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">Learn NPV first</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/effective-rent/effective-rent-vs-npv_0" data-answer-chunk-id="exp_/effective-rent/effective-rent-vs-npv_0_chunk">
              <AnswerFirst question="What does effective rent do?" answer="Effective rent converts a messy lease stream into one yearly number a tenant can quote per foot. A tenant should keep this lease answer visible on the same page." />
            </div>
            <div data-question-id="exp_/effective-rent/effective-rent-vs-npv_1" data-answer-chunk-id="exp_/effective-rent/effective-rent-vs-npv_1_chunk">
              <AnswerFirst question="What does NPV do?" answer="NPV keeps the whole lease stream in today's dollars so timing stays visible beside the average. A tenant should keep this lease answer visible on the same page." />
            </div>
            <div data-question-id="exp_/effective-rent/effective-rent-vs-npv_2" data-answer-chunk-id="exp_/effective-rent/effective-rent-vs-npv_2_chunk">
              <AnswerFirst question="Which should you use?" answer="A tenant should use both when timing might flip the rank. One number does not tell the whole story." />
            </div>
            <div data-question-id="exp_/effective-rent/effective-rent-vs-npv_3" data-answer-chunk-id="exp_/effective-rent/effective-rent-vs-npv_3_chunk">
              <AnswerFirst question="Can they disagree?" answer="Effective rent and NPV can disagree. That gap should stay on the page instead of being hidden. A tenant should keep this lease answer visible on the same page." />
            </div>
            <p>This question sits on the <a href="/effective-rent/">effective-rent</a> hub.</p>
            <p>See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.</p>
            <p>The <a href="/how-it-works">how it works</a> page shows the four-step path.</p>
            <p>Go deeper on <a href="/effective-rent/how-to-calculate-effective-rent/">How do you calculate effective rent?</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>Effective rent is an average rent after incentives.</p>
            <p>NPV means net present value. It shrinks later cash instead of spreading it flat.</p>
            <p>If a credit happens now, NPV gives it more weight than a credit that happens later.</p>
            <p>An average can give the later credit the same voice as the early one.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Effective rent is an average rent number. NPV is later cash brought into today's dollars and added. Use the average to talk. Use NPV when timing matters.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Teams mix the words and then argue about a number that is not the same object.</p>
            <p>A client can think they heard a discounted answer when they heard an average.</p>
            <p>That mix creates fake certainty.</p>
            <p>Naming the tool prevents that.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Teams mix the words and then argue about a number that is not the same object.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Build one cash list.</li><li>Make the average from that list if you need a headline.</li><li>Make the NPV from the same list with a visible rate.</li><li>If the rank differs, say why. It is usually timing.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Average = flatten. NPV = shrink later years, then add.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Same cash list</th><td>Do not switch inputs between tools</td></tr><tr><th scope="row">Average rule</th><td>What you spread</td></tr><tr><th scope="row">NPV rate</th><td>How you shrink</td></tr></tbody></table></div>
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
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$366,312</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the contrast lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$40,000</td><td>$37,200</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,800</td><td>$9,416</td></tr><tr><th scope="row">Year-1 credit</th><td>$16,000</td><td>$8,800</td></tr><tr><th scope="row">Sample NPV</th><td>$366,312</td><td>$355,601</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the contrast lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$40,000</td><td>$8,800</td><td>$16,000</td><td>$32,800</td><td>$30,370</td></tr><tr><th scope="row">Year 2</th><td>$41,800</td><td>$9,064</td><td>$0</td><td>$50,864</td><td>$43,608</td></tr><tr><th scope="row">Year 3</th><td>$43,681</td><td>$9,336</td><td>$0</td><td>$53,017</td><td>$42,087</td></tr><tr><th scope="row">Year 4</th><td>$45,647</td><td>$9,616</td><td>$0</td><td>$55,263</td><td>$40,620</td></tr><tr><th scope="row">Year 5</th><td>$47,701</td><td>$9,904</td><td>$0</td><td>$57,605</td><td>$39,205</td></tr><tr><th scope="row">Year 6</th><td>$49,132</td><td>$10,201</td><td>$0</td><td>$59,333</td><td>$37,390</td></tr><tr><th scope="row">Year 7</th><td>$50,606</td><td>$10,507</td><td>$0</td><td>$61,113</td><td>$35,659</td></tr><tr><th scope="row">Year 8</th><td>$52,124</td><td>$10,822</td><td>$0</td><td>$62,946</td><td>$34,008</td></tr><tr><th scope="row">Year 9</th><td>$53,688</td><td>$11,147</td><td>$0</td><td>$64,835</td><td>$32,434</td></tr><tr><th scope="row">Year 10</th><td>$55,299</td><td>$11,481</td><td>$0</td><td>$66,780</td><td>$30,932</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$366,312</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the contrast lease is about $366,312. A second path lands near $355,601. That gap is a talking point, not a promise.</p>
                <p>An early credit boosts both tools, but NPV more. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the contrast lease</h3>
              <ul><li>Year 1 of the contrast lease has rent of $40,000.</li><li>Shared building cost is $8,800.</li><li>A credit of $16,000 lowers the cash you pay that year.</li><li>Cash out this year is about $32,800. An early credit boosts both tools, but NPV more.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $30,370 today.</li></ul>
              <ul><li>Next, year 2 rent is $41,800.</li><li>CAM, which is a shared building cost, is $9,064.</li><li>There is no credit in this year.</li><li>You pay about $50,864 this year after extras and credits. The average already smeared the gift.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $43,608 today.</li></ul>
              <ul><li>Then year 3 rent is $43,681.</li><li>Extras for the building come to $9,336.</li><li>Credits skip this year.</li><li>The net cash this year is about $53,017. Steps hurt the average less than they hurt undiscounted totals.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $42,087 today.</li></ul>
              <ul><li>After that, year 4 rent is $45,647.</li><li>The shared building cost this time is $9,616.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $55,263. NPV still sees later weight if the rate is modest.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,620 today.</li></ul>
              <ul><li>In year 5 of the contrast lease, rent is $47,701.</li><li>Shared building cost is $9,904.</li><li>There is no credit in this year.</li><li>You pay about $57,605 this year after extras and credits. This last year is where the two tools can disagree.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $39,205 today.</li></ul>
              <ul><li>Year 6 of the contrast lease has rent of $49,132.</li><li>CAM, which is a shared building cost, is $10,201.</li><li>Credits skip this year.</li><li>The net cash this year is about $59,333. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $37,390 today.</li></ul>
              <ul><li>Next, year 7 rent is $50,606.</li><li>Extras for the building come to $10,507.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $61,113. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,659 today.</li></ul>
              <ul><li>Then year 8 rent is $52,124.</li><li>The shared building cost this time is $10,822.</li><li>There is no credit in this year.</li><li>You pay about $62,946 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $34,008 today.</li></ul>
              <ul><li>After that, year 9 rent is $53,688.</li><li>Shared building cost is $11,147.</li><li>Credits skip this year.</li><li>The net cash this year is about $64,835. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,434 today.</li></ul>
              <ul><li>In year 10 of the contrast lease, rent is $55,299.</li><li>CAM, which is a shared building cost, is $11,481.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $66,780. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,932 today.</li></ul><p>Add those year values. The sample NPV for the contrast lease is about $366,312. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the contrast lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/compare-commercial-leases">Try the Lease Comparison Tool</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Same five-year list for both tools.</li><li>8 percent NPV rate for teaching.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If you change the divisor, the average moves and NPV does not.</p>
            <p>If you change the rate, NPV moves and the average does not.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Reporting both numbers without saying which ranked the deal.</li><li>Using effective rent in a sentence that claims 'present value.'</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>Lead with the tool that matches the question.</p>
            <p>If the question is timing, lead with NPV.</p>
            <h2>Compare this to related metrics</h2>
            <p>Face rent is weaker than both.</p>
            <p>Total cash is closer to a raw add than to NPV.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>Neither tool scores a bad floor plan.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not pick a winner with an average if the client asked about time.</li></ul>
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
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.investopedia.com/terms/d/discountrate.asp","label":"Investopedia — discount rate"},{"href":"https://www.naiop.org/","label":"NAIOP"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/effective-rent/","label":"Effective rent hub","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease/","label":"What NPV is","description":"A nearby page that helps finish this comparison."},{"href":"/lease-comparison/","label":"Lease comparison","description":"A nearby page that helps finish this comparison."}]} />
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
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/how-to-calculate-effective-rent/" data-relationship="related" aria-label="How do you calculate effective rent. Add the rent you pay.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you calculate effective rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-vs-face-rent/" data-relationship="related" aria-label="What is the difference between effective rent and face rent. Face rent is the sticker.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is the difference between effective rent and face rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/effective-rent/effective-rent-per-square-foot/" data-relationship="related" aria-label="What is effective rent per square foot. Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is effective rent per square foot</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
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
