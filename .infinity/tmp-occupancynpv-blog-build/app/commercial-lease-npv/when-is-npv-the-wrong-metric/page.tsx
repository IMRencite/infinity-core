import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "When is NPV the wrong metric?",
  description: "NPV is a consistency tool, not a complete decision. Learn when it should not drive the choice and what else to show beside it.",
  alternates: { canonical: "/commercial-lease-npv/when-is-npv-the-wrong-metric/" },
  robots: { index: true, follow: true },
  openGraph: { title: "When is NPV the wrong metric?", description: "NPV is a consistency tool, not a complete decision. Learn when it should not drive the choice and what else to show beside it." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/commercial-lease-npv/when-is-npv-the-wrong-metric" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="commercial-lease-npv">
        <JsonLdBlock data={SITE_SCHEMA["/commercial-lease-npv/when-is-npv-the-wrong-metric"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/commercial-lease-npv","label":"Commercial lease NPV"},{"href":"/commercial-lease-npv/when-is-npv-the-wrong-metric","label":"When is NPV the wrong metric?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">commercial lease npv</p>
            <h1 className="pv-display">When is NPV the wrong metric?</h1>
            <div data-question-id="q_cdaf0b0f602e9c09" data-answer-chunk-id="q_cdaf0b0f602e9c09_chunk">
              <AnswerFirst question="When is NPV the wrong metric?" answer="NPV is the wrong lead number when the cash list is incomplete, the site cannot do the work, or the choice is really about flexibility, people, or risk you have not written down." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/lease-comparison/">See lease comparison methods</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_0" data-answer-chunk-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_0_chunk">
              <AnswerFirst question="When should you not use NPV?" answer="NPV should not pick a lease the team cannot use, or a pair of stacks that still miss extras." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_1" data-answer-chunk-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_1_chunk">
              <AnswerFirst question="Is lower always better?" answer="A lower NPV does not always mean a better stay. A missing extra can hide inside the cheaper path." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_2" data-answer-chunk-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_2_chunk">
              <AnswerFirst question="What should sit beside it?" answer="Year-one cash, extras, and the things the lease number cannot score should sit beside NPV. A tenant should keep this lease answer visible on the same page." />
            </div>
            <div data-question-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_3" data-answer-chunk-id="exp_/commercial-lease-npv/when-is-npv-the-wrong-metric_3_chunk">
              <AnswerFirst question="Does NPV replace a legal read?" answer="NPV is a consistency tool. It does not replace a legal read of the lease. A tenant should keep this lease answer visible on the same page." />
            </div>
            <p>This question sits on the <a href="/commercial-lease-npv/">commercial-lease-npv</a> hub.</p>
            <p>See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.</p>
            <p>The <a href="/how-it-works">how it works</a> page shows the four-step path.</p>
            <p>Go deeper on <a href="/commercial-lease-npv/how-is-lease-npv-calculated/">How is lease NPV calculated?</a>.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>NPV means net present value. It only ranks the cash you entered.</p>
            <p>If a key cost is missing, the rank is a story about your spreadsheet, not the lease.</p>
            <p>If the team cannot work in the space, a beautiful NPV does not matter.</p>
            <p>Wrong metric here means 'do not let this number drive the meeting.'</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>NPV is the wrong lead number when the cash list is incomplete, the site cannot do the work, or the choice is really about flexibility, people, or risk you have not written down.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>People like one score. One score can hide a bad fit.</p>
            <p>A tenant-rep broker who leads with NPV on a broken site loses trust.</p>
            <p>Finance teams still need NPV. They also need the list of what it ignores.</p>
            <p>Saying when not to use a tool is part of using it well.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>People like one score. One score can hide a bad fit.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>First ask if the space works. Then list the cash. Then discount.</li><li>If two options differ by a door, a dock, or a labor pool, write that beside the NPV.</li><li>If the term is full of options, show cases. Do not force one NPV to hold every path.</li><li>If data is missing, say 'incomplete' instead of inventing a precise rank.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Use NPV only after cash is complete enough that a missing line would not flip the rank by itself.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Fit</th><td>Can the team work here</td></tr><tr><th scope="row">Cash completeness</th><td>Are extras and credits on the page</td></tr><tr><th scope="row">Options</th><td>Renewal, exit, and expansion paths</td></tr><tr><th scope="row">NPV</th><td>Only after the three rows above</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$45,000</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$41,850</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$383,389</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the clean-but-wrong site</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$45,000</td><td>$41,850</td></tr><tr><th scope="row">Year-1 extras</th><td>$7,000</td><td>$7,490</td></tr><tr><th scope="row">Year-1 credit</th><td>$0</td><td>$0</td></tr><tr><th scope="row">Sample NPV</th><td>$383,389</td><td>$363,950</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the clean-but-wrong site</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$45,000</td><td>$7,000</td><td>$0</td><td>$52,000</td><td>$48,148</td></tr><tr><th scope="row">Year 2</th><td>$45,900</td><td>$7,210</td><td>$0</td><td>$53,110</td><td>$45,533</td></tr><tr><th scope="row">Year 3</th><td>$46,818</td><td>$7,426</td><td>$0</td><td>$54,244</td><td>$43,061</td></tr><tr><th scope="row">Year 4</th><td>$47,754</td><td>$7,649</td><td>$0</td><td>$55,403</td><td>$40,723</td></tr><tr><th scope="row">Year 5</th><td>$48,709</td><td>$7,879</td><td>$0</td><td>$56,588</td><td>$38,513</td></tr><tr><th scope="row">Year 6</th><td>$50,170</td><td>$8,115</td><td>$0</td><td>$58,285</td><td>$36,729</td></tr><tr><th scope="row">Year 7</th><td>$51,675</td><td>$8,358</td><td>$0</td><td>$60,033</td><td>$35,029</td></tr><tr><th scope="row">Year 8</th><td>$53,225</td><td>$8,609</td><td>$0</td><td>$61,834</td><td>$33,407</td></tr><tr><th scope="row">Year 9</th><td>$54,822</td><td>$8,867</td><td>$0</td><td>$63,689</td><td>$31,860</td></tr><tr><th scope="row">Year 10</th><td>$56,467</td><td>$9,133</td><td>$0</td><td>$65,600</td><td>$30,385</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$383,389</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the clean-but-wrong site is about $383,389. A second path lands near $363,950. That gap is a talking point, not a promise.</p>
                <p>No credit. The site still may lose on fit. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the clean-but-wrong site</h3>
              <ul><li>Year 1 of the clean-but-wrong site has rent of $45,000.</li><li>Shared building cost is $7,000.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $52,000. No credit. The site still may lose on fit.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $48,148 today.</li></ul>
              <ul><li>Next, year 2 rent is $45,900.</li><li>CAM, which is a shared building cost, is $7,210.</li><li>There is no credit in this year.</li><li>You pay about $53,110 this year after extras and credits. A smooth step-up does not fix a bad location.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $45,533 today.</li></ul>
              <ul><li>Then year 3 rent is $46,818.</li><li>Extras for the building come to $7,426.</li><li>Credits skip this year.</li><li>The net cash this year is about $54,244. Cheap later years cannot buy missing labor.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $43,061 today.</li></ul>
              <ul><li>After that, year 4 rent is $47,754.</li><li>The shared building cost this time is $7,649.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $55,403. The model looks clean. The operations question remains.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,723 today.</li></ul>
              <ul><li>In year 5 of the clean-but-wrong site, rent is $48,709.</li><li>Shared building cost is $7,879.</li><li>There is no credit in this year.</li><li>You pay about $56,588 this year after extras and credits. This is the year people forget to talk about risk.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $38,513 today.</li></ul>
              <ul><li>Year 6 of the clean-but-wrong site has rent of $50,170.</li><li>CAM, which is a shared building cost, is $8,115.</li><li>Credits skip this year.</li><li>The net cash this year is about $58,285. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $36,729 today.</li></ul>
              <ul><li>Next, year 7 rent is $51,675.</li><li>Extras for the building come to $8,358.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $60,033. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,029 today.</li></ul>
              <ul><li>Then year 8 rent is $53,225.</li><li>The shared building cost this time is $8,609.</li><li>There is no credit in this year.</li><li>You pay about $61,834 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $33,407 today.</li></ul>
              <ul><li>After that, year 9 rent is $54,822.</li><li>Shared building cost is $8,867.</li><li>Credits skip this year.</li><li>The net cash this year is about $63,689. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $31,860 today.</li></ul>
              <ul><li>In year 10 of the clean-but-wrong site, rent is $56,467.</li><li>CAM, which is a shared building cost, is $9,133.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $65,600. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,385 today.</li></ul><p>Add those year values. The sample NPV for the clean-but-wrong site is about $383,389. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the clean-but-wrong site is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">Review what NPV is</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample cash is complete on purpose.</li><li>The 'wrong metric' lesson is about use, not a math error.</li><li>No customer result is claimed.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A short pop-up term may not need a heavy NPV show.</p>
            <p>A related-party deal may have goals other than occupancy cost.</p>
            <p>A sale-leaseback is a different problem.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Using NPV to end a debate about people and access.</li><li>Calling a missing CAM line 'immaterial' with no check.</li><li>Hiding an exit option because it is hard to price.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>Lead with fit. Support with cash. Test with sensitivity.</p>
            <p>If NPV and fit disagree, say both out loud.</p>
            <h2>Compare this to related metrics</h2>
            <p>Effective rent can be wrong in the same way if extras are missing.</p>
            <p>A scorecard of operations can sit beside NPV. It should not pretend to be NPV.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>This page does not rank culture or brand.</li><li>It does not replace site tours.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>When the question is 'can we operate here,' NPV is support, not the judge.</li></ul>
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
              <AuthorityRefs items={[{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"},{"href":"https://www.naiop.org/","label":"NAIOP"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/commercial-lease-npv/what-is-npv-in-a-commercial-lease/","label":"What NPV is","description":"A nearby page that helps finish this comparison."},{"href":"/tenant-rep-analysis/","label":"Tenant-rep analysis","description":"A nearby page that helps finish this comparison."},{"href":"/lease-financial-modeling/what-are-common-lease-analysis-mistakes/","label":"Common mistakes","description":"A nearby page that helps finish this comparison."}]} />
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
            <a className="sn-card" data-card-role="TOPIC" href="/commercial-lease-npv/" data-relationship="parent-hub" aria-label="Commercial lease NPV. Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how ">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/" data-relationship="related" aria-label="What is NPV in a commercial lease. NPV turns later lease costs into today's dollars so you can compare options fairly.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is NPV in a commercial lease</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-discount-rate-should-you-use/" data-relationship="related" aria-label="What discount rate should be used for commercial lease NPV. The discount rate is the price of waiting.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What discount rate should be used for commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/how-is-lease-npv-calculated/" data-relationship="related" aria-label="How is lease NPV calculated. Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year value">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How is lease NPV calculated</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
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
