import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "What does lease sensitivity analysis show?",
  description: "Sensitivity analysis asks what happens if a key number changes. Learn which assumptions matter and how to show a flip without hiding it.",
  alternates: { canonical: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/" },
  robots: { index: true, follow: true },
  openGraph: { title: "What does lease sensitivity analysis show?", description: "Sensitivity analysis asks what happens if a key number changes. Learn which assumptions matter and how to show a flip without hiding it." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="lease-sensitivity-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-sensitivity-analysis","label":"Lease sensitivity analysis"},{"href":"/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show","label":"What does lease sensitivity analysis show?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease sensitivity analysis</p>
            <h1 className="pv-display">What does lease sensitivity analysis show?</h1>
            <div data-question-id="q_cd4acf6c339dccef" data-answer-chunk-id="q_cd4acf6c339dccef_chunk">
              <AnswerFirst question="What does lease sensitivity analysis show?" answer="Lease sensitivity analysis shows whether a ranking is sturdy. You change a real assumption, rerun the same leases, and report if the winner holds or flips." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/commercial-lease-npv/what-discount-rate-should-you-use/">Read discount-rate choices</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_0" data-answer-chunk-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_0_chunk">
              <AnswerFirst question="What does a sensitivity test do?" answer="A sensitivity test places one lease input a little higher or lower and shows whether the rank holds." />
            </div>
            <div data-question-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_1" data-answer-chunk-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_1_chunk">
              <AnswerFirst question="How is that different from a scenario?" answer="A scenario moves many lease inputs together on purpose. Sensitivity should move one or two knobs. A tenant should keep this lease answer visible on the same page." />
            </div>
            <div data-question-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_2" data-answer-chunk-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_2_chunk">
              <AnswerFirst question="Which input flips ranks first?" answer="The discount rate or a large extra should be the first lease inputs a tenant tests for a flip." />
            </div>
            <div data-question-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_3" data-answer-chunk-id="exp_/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show_3_chunk">
              <AnswerFirst question="What should you show a client?" answer="The base lease rank and the first flip should sit together so a client can see the risk." />
            </div>
            <p>This question sits on the <a href="/lease-sensitivity-analysis/">lease-sensitivity-analysis</a> hub.</p>
            <p>See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.</p>
            <p>The <a href="/how-it-works">how it works</a> page shows the four-step path.</p>
            <p>Go deeper on <a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/">Why use sensitivity analysis on a commercial lease?</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>The show is the change in rank, not a new decoration.</p>
            <p>NPV means net present value. Each test has a new NPV pair.</p>
            <p>A flip means the other option becomes cheaper in today's dollars.</p>
            <p>A hold means the first winner stays first.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Lease sensitivity analysis shows whether a ranking is sturdy. You change a real assumption, rerun the same leases, and report if the winner holds or flips.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Close deals need this sentence: 'It still wins if the rate moves a little.'</p>
            <p>Or the other sentence: 'It flips if CAM is higher.'</p>
            <p>Those sentences are more honest than a single bold number.</p>
            <p>They also tell you which input you must verify next.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Close deals need this sentence: 'It still wins if the rate moves a little.'</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Write the base winner.</li><li>Change the discount rate and record the new rank.</li><li>Then change CAM and record again.</li><li>Last, change credit timing. Stop when the next test is theater.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. If NPV(A) and NPV(B) change order after one honest input change, report a flip.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Base NPVs</th><td>The first rank</td></tr><tr><th scope="row">Changed input</th><td>One knob</td></tr><tr><th scope="row">New NPVs</th><td>The second rank</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$41,500</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$38,595</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$368,834</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the sensitivity sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$41,500</td><td>$38,595</td></tr><tr><th scope="row">Year-1 extras</th><td>$8,700</td><td>$9,309</td></tr><tr><th scope="row">Year-1 credit</th><td>$11,000</td><td>$6,050</td></tr><tr><th scope="row">Sample NPV</th><td>$368,834</td><td>$356,082</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the sensitivity sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$41,500</td><td>$8,700</td><td>$11,000</td><td>$39,200</td><td>$36,296</td></tr><tr><th scope="row">Year 2</th><td>$42,745</td><td>$8,961</td><td>$0</td><td>$51,706</td><td>$44,330</td></tr><tr><th scope="row">Year 3</th><td>$44,027</td><td>$9,230</td><td>$0</td><td>$53,257</td><td>$42,277</td></tr><tr><th scope="row">Year 4</th><td>$45,348</td><td>$9,507</td><td>$0</td><td>$54,855</td><td>$40,320</td></tr><tr><th scope="row">Year 5</th><td>$46,709</td><td>$9,792</td><td>$0</td><td>$56,501</td><td>$38,454</td></tr><tr><th scope="row">Year 6</th><td>$48,110</td><td>$10,086</td><td>$0</td><td>$58,196</td><td>$36,673</td></tr><tr><th scope="row">Year 7</th><td>$49,553</td><td>$10,389</td><td>$0</td><td>$59,942</td><td>$34,976</td></tr><tr><th scope="row">Year 8</th><td>$51,040</td><td>$10,701</td><td>$0</td><td>$61,741</td><td>$33,357</td></tr><tr><th scope="row">Year 9</th><td>$52,571</td><td>$11,022</td><td>$0</td><td>$63,593</td><td>$31,812</td></tr><tr><th scope="row">Year 10</th><td>$54,148</td><td>$11,353</td><td>$0</td><td>$65,501</td><td>$30,340</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$368,834</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the sensitivity sample is about $368,834. A second path lands near $356,082. That gap is a talking point, not a promise.</p>
                <p>Base-case year one. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the sensitivity sample</h3>
              <ul><li>Year 1 of the sensitivity sample has rent of $41,500.</li><li>Shared building cost is $8,700.</li><li>A credit of $11,000 lowers the cash you pay that year.</li><li>Cash out this year is about $39,200. Base-case year one.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $36,296 today.</li></ul>
              <ul><li>Next, year 2 rent is $42,745.</li><li>CAM, which is a shared building cost, is $8,961.</li><li>There is no credit in this year.</li><li>You pay about $51,706 this year after extras and credits. A CAM test would lift extras here.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $44,330 today.</li></ul>
              <ul><li>Then year 3 rent is $44,027.</li><li>Extras for the building come to $9,230.</li><li>Credits skip this year.</li><li>The net cash this year is about $53,257. A rate test would shrink this year more.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $42,277 today.</li></ul>
              <ul><li>After that, year 4 rent is $45,348.</li><li>The shared building cost this time is $9,507.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $54,855. A start-date test would slide this row.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,320 today.</li></ul>
              <ul><li>In year 5 of the sensitivity sample, rent is $46,709.</li><li>Shared building cost is $9,792.</li><li>There is no credit in this year.</li><li>You pay about $56,501 this year after extras and credits. Flips often hide in the last years.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $38,454 today.</li></ul>
              <ul><li>Year 6 of the sensitivity sample has rent of $48,110.</li><li>CAM, which is a shared building cost, is $10,086.</li><li>Credits skip this year.</li><li>The net cash this year is about $58,196. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $36,673 today.</li></ul>
              <ul><li>Next, year 7 rent is $49,553.</li><li>Extras for the building come to $10,389.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $59,942. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $34,976 today.</li></ul>
              <ul><li>Then year 8 rent is $51,040.</li><li>The shared building cost this time is $10,701.</li><li>There is no credit in this year.</li><li>You pay about $61,741 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $33,357 today.</li></ul>
              <ul><li>After that, year 9 rent is $52,571.</li><li>Shared building cost is $11,022.</li><li>Credits skip this year.</li><li>The net cash this year is about $63,593. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $31,812 today.</li></ul>
              <ul><li>In year 10 of the sensitivity sample, rent is $54,148.</li><li>CAM, which is a shared building cost, is $11,353.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $65,501. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,340 today.</li></ul><p>Add those year values. The sample NPV for the sensitivity sample is about $368,834. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the sensitivity sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/compare-commercial-leases">See the comparison workflow</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Illustrative only.</li><li>No live customer sensitivity is claimed.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If data is a guess, the test is a guess.</p>
            <p>A huge range can make every deal look unstable. Use nearby values.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Showing a grid with no sentence.</li><li>Changing the lease terms and calling it a rate test.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>Verify the knob that flips the rank before you pick a winner.</p>
            <p>If nothing flips, say the rank is sturdy in the tested range.</p>
            <h2>Compare this to related metrics</h2>
            <p>A static average will not show this.</p>
            <p>A CRM stage change will not show this.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This page does not run your file.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not use sensitivity to paper over a missing rent path.</li></ul>
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
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/d/discountrate.asp","label":"Investopedia — discount rate"},{"href":"https://www.fasb.org/","label":"FASB"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/lease-sensitivity-analysis/","label":"Sensitivity hub","description":"A nearby page that helps finish this comparison."},{"href":"/commercial-lease-npv/what-discount-rate-should-you-use/","label":"Discount rate","description":"A nearby page that helps finish this comparison."},{"href":"/lease-financial-modeling/","label":"Modeling hub","description":"A nearby page that helps finish this comparison."}]} />
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
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/" data-relationship="related" aria-label="Why use sensitivity analysis on a commercial lease. A ranking can flip when one assumption moves.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>Why use sensitivity analysis on a commercial lease</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/" data-relationship="related" aria-label="How does discount-rate sensitivity change a lease ranking. A one or two point rate change can swap the winner when credits sit early and rent sits late.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How does discount-rate sensitivity change a lease ranking</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/" data-relationship="related" aria-label="How should you present lease scenarios to a CFO. Show the base case, one worse case, and the assumption that flips the rank.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How should you present lease scenarios to a CFO</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
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
