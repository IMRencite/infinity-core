import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Lease financial modeling",
  description: "See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary. Learn common model mistakes.",
  alternates: { canonical: "/lease-financial-modeling/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Lease financial modeling", description: "See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary. Learn common model mistakes." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/lease-financial-modeling" role="EDUCATIONAL_HUB" pattern="EDUCATIONAL_HUB" cluster="lease-financial-modeling">
        <JsonLdBlock data={SITE_SCHEMA["/lease-financial-modeling"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/lease-financial-modeling","label":"How does lease financial modeling move from proposals to a summary?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only. No company signage." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">lease financial modeling</p>
            <h1 className="pv-display">How does lease financial modeling move from proposals to a summary?</h1>
            <div data-question-id="q_ee9a5935b0902646" data-answer-chunk-id="q_ee9a5935b0902646_chunk">
              <AnswerFirst question="How does lease financial modeling move from proposals to a summary?" answer="The path is proposals, shared assumptions, comparison, sensitivity, then a short client summary. A spreadsheet can do this. A CRM cannot replace it. This site is a pilot workflow, a working OccupancyNPV product." />
            </div>
            <div className="pv-cta-panel pv-wide-module">
              <p>The page belongs to a lease comparison product. Public rollout remains controlled.</p>
              <p><PrimaryCTA href="/how-it-works">See How the Workflow Works</PrimaryCTA></p>
            </div>
          </div>
        </header>

        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions people ask next</h2>
            <div data-question-id="exp_/lease-financial-modeling_0" data-answer-chunk-id="exp_/lease-financial-modeling_0_chunk">
              <AnswerFirst question="What inputs belong in the model?" answer="Dates, rent steps, extras, credits, and the rate should sit on one lease input sheet before any formula runs." />
            </div>
            <div data-question-id="exp_/lease-financial-modeling_1" data-answer-chunk-id="exp_/lease-financial-modeling_1_chunk">
              <AnswerFirst question="How do you build the cash list?" answer="A cash-flow model places one lease row per period and links every money cell back to an input." />
            </div>
            <div data-question-id="exp_/lease-financial-modeling_2" data-answer-chunk-id="exp_/lease-financial-modeling_2_chunk">
              <AnswerFirst question="What mistakes show up first?" answer="Wrong dates, missing free rent, and hardcoded later years should be the first lease-model checks a tenant runs." />
            </div>
            <div data-question-id="exp_/lease-financial-modeling_3" data-answer-chunk-id="exp_/lease-financial-modeling_3_chunk">
              <AnswerFirst question="Where do NPV and effective rent come from?" answer="NPV and effective rent should read from the same lease list. Two pastes do not stay in sync." />
            </div>
            <p>Read <a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">What inputs belong in a commercial lease model?</a> when you need the next deep answer.</p>
            <p>Read <a href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/">How do you build a lease cash-flow model?</a> when you need the next deep answer.</p>
            <p className="pv-spoke-index" data-expansion-spokes="true"><a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model">What inputs belong in a commercial lease model?</a> · <a href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model">How do you build a lease cash-flow model?</a></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A model is a written set of rules for occupancy cash.</p>
            <p>Normalization means both options follow those rules.</p>
            <p>NPV means net present value. It is the compare step after the rules are shared.</p>
            <p>A summary is the short retell, not the whole workbook.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>The path is proposals, shared assumptions, comparison, sensitivity, then a short client summary. A spreadsheet can do this. A CRM cannot replace it. This site is a pilot workflow, a working OccupancyNPV product.</p></aside>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Most pain is not math. It is two files with two hidden rules.</p>
            <p>If assumptions are not shared, the rank is a private language.</p>
            <p>A summary that skips leftovers creates a surprise later.</p>
            <p>Spreadsheets fail when the rule lives in one person's head.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Most pain is not math. It is two files with two hidden rules.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            <ul><li>Read the proposals. List missing fields in the open.</li><li>Write the shared rules. Then fill both options.</li><li>Compare. Test one or two knobs. Write four sentences.</li><li>That is the path. Do not add a seventh tool in the middle.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Proposals → shared rules → compare → tests → summary.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Proposal fields</th><td>Rent, extras, credits, dates</td></tr><tr><th scope="row">Shared rules</th><td>What is in or out</td></tr><tr><th scope="row">Compare</th><td>NPV at one rate</td></tr><tr><th scope="row">Summary</th><td>Fit, cash, flip, leftovers</td></tr></tbody></table></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>$38,800</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>$36,084</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>8%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$358,483</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — the model path lease</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$38,800</td><td>$36,084</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,600</td><td>$10,272</td></tr><tr><th scope="row">Year-1 credit</th><td>$7,500</td><td>$4,125</td></tr><tr><th scope="row">Sample NPV</th><td>$358,483</td><td>$346,175</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — the model path lease</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$38,800</td><td>$9,600</td><td>$7,500</td><td>$40,900</td><td>$37,870</td></tr><tr><th scope="row">Year 2</th><td>$39,964</td><td>$9,888</td><td>$0</td><td>$49,852</td><td>$42,740</td></tr><tr><th scope="row">Year 3</th><td>$41,163</td><td>$10,185</td><td>$0</td><td>$51,348</td><td>$40,762</td></tr><tr><th scope="row">Year 4</th><td>$42,398</td><td>$10,490</td><td>$0</td><td>$52,888</td><td>$38,874</td></tr><tr><th scope="row">Year 5</th><td>$43,670</td><td>$10,805</td><td>$0</td><td>$54,475</td><td>$37,075</td></tr><tr><th scope="row">Year 6</th><td>$44,980</td><td>$11,129</td><td>$0</td><td>$56,109</td><td>$35,358</td></tr><tr><th scope="row">Year 7</th><td>$46,329</td><td>$11,463</td><td>$0</td><td>$57,792</td><td>$33,721</td></tr><tr><th scope="row">Year 8</th><td>$47,719</td><td>$11,807</td><td>$0</td><td>$59,526</td><td>$32,160</td></tr><tr><th scope="row">Year 9</th><td>$49,151</td><td>$12,161</td><td>$0</td><td>$61,312</td><td>$30,671</td></tr><tr><th scope="row">Year 10</th><td>$50,626</td><td>$12,526</td><td>$0</td><td>$63,152</td><td>$29,252</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$358,483</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for the model path lease is about $358,483. A second path lands near $346,175. That gap is a talking point, not a promise.</p>
                <p>A model starts when year one is complete. If one path wins only because a credit sat in the wrong year, start over.</p>
              </div>
              <h3>Year notes for the model path lease</h3>
              <ul><li>Year 1 of the model path lease has rent of $38,800.</li><li>Shared building cost is $9,600.</li><li>A credit of $7,500 lowers the cash you pay that year.</li><li>Cash out this year is about $40,900. A model starts when year one is complete.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $37,870 today.</li></ul>
              <ul><li>Next, year 2 rent is $39,964.</li><li>CAM, which is a shared building cost, is $9,888.</li><li>There is no credit in this year.</li><li>You pay about $49,852 this year after extras and credits. Shared rules keep year two honest.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $42,740 today.</li></ul>
              <ul><li>Then year 3 rent is $41,163.</li><li>Extras for the building come to $10,185.</li><li>Credits skip this year.</li><li>The net cash this year is about $51,348. The compare uses these later rows.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $40,762 today.</li></ul>
              <ul><li>After that, year 4 rent is $42,398.</li><li>The shared building cost this time is $10,490.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $52,888. A test might change this year.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $38,874 today.</li></ul>
              <ul><li>In year 5 of the model path lease, rent is $43,670.</li><li>Shared building cost is $10,805.</li><li>There is no credit in this year.</li><li>You pay about $54,475 this year after extras and credits. The summary mentions this last year only if it matters.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $37,075 today.</li></ul>
              <ul><li>Year 6 of the model path lease has rent of $44,980.</li><li>CAM, which is a shared building cost, is $11,129.</li><li>Credits skip this year.</li><li>The net cash this year is about $56,109. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $35,358 today.</li></ul>
              <ul><li>Next, year 7 rent is $46,329.</li><li>Extras for the building come to $11,463.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $57,792. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $33,721 today.</li></ul>
              <ul><li>Then year 8 rent is $47,719.</li><li>The shared building cost this time is $11,807.</li><li>There is no credit in this year.</li><li>You pay about $59,526 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $32,160 today.</li></ul>
              <ul><li>After that, year 9 rent is $49,151.</li><li>Shared building cost is $12,161.</li><li>Credits skip this year.</li><li>The net cash this year is about $61,312. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $30,671 today.</li></ul>
              <ul><li>In year 10 of the model path lease, rent is $50,626.</li><li>CAM, which is a shared building cost, is $12,526.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $63,152. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $29,252 today.</li></ul><p>Add those year values. The sample NPV for the model path lease is about $358,483. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for the model path lease is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">Read common mistakes</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>Live checkout is available on the pricing page.</li><li>Current OccupancyNPV prices are on the pricing page.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>If a field is missing, the model is incomplete. Do not fill it with a silent default.</p>
            <p>A CRM stage named 'analyzing' is not a model.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Hidden defaults.</li><li>A different rate per option.</li><li>A summary that invents traction.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If the path is missing a step, stop and name it.</p>
            <p>If the client wants software, show the workflow, not a launch claim.</p>
            <h2>Compare this to related metrics</h2>
            <p>A spreadsheet is a tool. A purpose-built compare can keep the rules visible.</p>
            <p>Neither is generally available here as a finished product.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>No adoption numbers are claimed.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not build a model to avoid reading the lease.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="LIMITATION" data-callout="LIMITATION"><h3>Limitation</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid pv-discovery-grid--balanced">
              <div data-discovery-group="START_HERE"><h3>Start here</h3><ul className="pv-question-row"><li><a href="/lease-financial-modeling/what-is-a-commercial-lease-financial-model/">What is a commercial lease financial model?</a></li></ul></div><div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3><ul className="pv-question-row"><li><a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/">What inputs belong in a commercial lease model?</a></li><li><a href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/">How do you build a lease cash-flow model?</a></li><li><a href="/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/">How should free rent sit in a lease model?</a></li><li><a href="/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/">How should a TI allowance sit in a lease model?</a></li><li><a href="/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/">How should rent escalations sit in a lease model?</a></li><li><a href="/lease-financial-modeling/how-cam-sits-in-a-lease-model/">How should CAM sit in a lease model?</a></li></ul></div><div data-discovery-group="COMMON_MISTAKES"><h3>Common mistakes</h3><ul className="pv-question-row"><li><a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/">What are common lease-analysis mistakes?</a></li></ul></div><div data-discovery-group="GO_DEEPER"><h3>Go deeper</h3><ul className="pv-question-row"><li><a href="/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/">How do you run scenario analysis in a lease model?</a></li></ul></div>
            </div>
            <div className="pv-discovery-band" data-hub-role-band="true"><div data-hub-role-band="true" data-discovery-group="FOR_YOUR_ROLE"><h3>For your role</h3><ul className="pv-question-row"><li><a href="/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/">How should a lease model be presented to a client?</a></li></ul></div></div>
          </div>
        </section><section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta="View Pilot Pricing" data-surface="EMPHASIS">
          <div className="vg-container pv-reading pv-authority-shell">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a lease comparison product. Public rollout remains controlled. Live checkout is available for Professional and Per-Deal.</p>
              <p><PrimaryCTA href="/pricing">View Pilot Pricing</PrimaryCTA></p>
            </div>
            <p className="pv-spoke-index"><a href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes">What are common lease-analysis mistakes?</a></p>
            
          </div>
        </section>
        <div className="vg-container pv-hoisted-light-modules">
        <section className="pv-source-board pv-wide-module" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
              
        
        <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={[{"href":"https://www.fasb.org/","label":"FASB"},{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers"}]} />
            </section>
        <div className="pv-related-editorial">
            <RelatedContent items={[{"href":"/lease-financial-modeling/what-are-common-lease-analysis-mistakes/","label":"Common mistakes","description":"A nearby page that helps finish this comparison."},{"href":"/how-it-works","label":"Workflow","description":"A nearby page that helps finish this comparison."},{"href":"/pricing","label":"Pilot pricing","description":"A nearby page that helps finish this comparison."},{"href":"/lease-financial-modeling/what-are-common-lease-analysis-mistakes","label":"What are common lease-analysis mistakes?","description":"A question page in this same topic. Read it when you need the next definition."}]} />
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
          <nav className="sn-block" data-semantic-navigation="RELATED_QUESTIONS" aria-label="Questions in this topic">
            <div className="sn-block-head">
              <span className="sn-kicker">RELATED QUESTIONS</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-4">
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/what-are-common-lease-analysis-mistakes/" data-relationship="related" aria-label="What are common lease-analysis mistakes. Most bad comparisons hide a missing cost or a hidden assumption.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What are common lease-analysis mistakes</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/" data-relationship="related" aria-label="What inputs belong in a commercial lease model. Dates, rent steps, extras, credits, and the rate.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What inputs belong in a commercial lease model</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/" data-relationship="related" aria-label="How do you build a lease cash-flow model. List cash in and out by period.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you build a lease cash-flow model</strong><span className="sn-desc">Know which inputs belong on the timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Turn the topic into a repeatable path.">
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
