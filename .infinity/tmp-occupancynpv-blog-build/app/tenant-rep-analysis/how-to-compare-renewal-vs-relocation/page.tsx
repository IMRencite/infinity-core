import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../components/validation-grade";
import { VentureFooter } from "../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../lib/site-schema";
export const metadata = {
  title: "How to compare renewal vs relocation",
  description: "Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put.",
  alternates: { canonical: "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How to compare renewal vs relocation", description: "Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation" role="QUESTION_PAGE" pattern="DEEP_AUTHORITY_QUESTION_PAGE" cluster="tenant-rep-analysis">
        <JsonLdBlock data={SITE_SCHEMA["/tenant-rep-analysis/how-to-compare-renewal-vs-relocation"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/tenant-rep-analysis","label":"Tenant-rep analysis"},{"href":"/tenant-rep-analysis/how-to-compare-renewal-vs-relocation","label":"How do you compare a renewal versus a relocation?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-workstation.webp" alt="A lease-analysis desk with papers and a laptop. Teaching context only. No people shown." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy pv-authority-shell">
            <p className="pv-eyebrow">tenant rep analysis</p>
            <h1 className="pv-display">How do you compare a renewal versus a relocation?</h1>
            <div data-question-id="q_c5817a16f70392a8" data-answer-chunk-id="q_c5817a16f70392a8_chunk">
              <AnswerFirst question="How do you compare a renewal versus a relocation?" answer="Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put." />
            </div>
            <p>This page belongs to a lease comparison product. Public rollout remains controlled.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/lease-comparison/">Open lease comparison</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Questions this page also answers</h2>
            <div data-question-id="q_0506df94d191b831" data-answer-chunk-id="q_0506df94d191b831_0" data-supporting-section="define">
              <AnswerFirst question="Is stay cheaper?" answer="Only after you add move cost and downtime to the other path." />
            </div>
            <div data-question-id="q_1de3935bbcf3d0ca" data-answer-chunk-id="q_1de3935bbcf3d0ca_1" data-supporting-section="define">
              <AnswerFirst question="What one-time costs belong?" answer="Move, furniture, leftover build-out, and dual rent if it happens." />
            </div>
            <div data-question-id="q_035c21a656a54239" data-answer-chunk-id="q_035c21a656a54239_2" data-supporting-section="define">
              <AnswerFirst question="Do options matter?" answer="Yes. A stay path may keep expansion or avoid a second build." />
            </div>
            <div data-question-id="q_50019aac137b772d" data-answer-chunk-id="q_50019aac137b772d_3" data-supporting-section="define">
              <AnswerFirst question="What flips the pick?" answer="A large move bill, a long downtime, or a sharp extra stack at the new building." />
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Plain-language definition</h2>
            <p>A renewal is a new deal with a known building.</p>
            <p>A relocation is a new deal with move cost and downtime.</p>
            <p>The stacks must share a calendar or the rank is theater.</p>
            <p>This page sits under <a href="/tenant-rep-analysis/">Tenant-rep analysis</a>.</p>
            <p>Use the same <a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">two-option compare</a> method.</p>
            <p>Put <a href="/occupancy-costs/hidden-occupancy-costs/">move-in extras</a> on the move path.</p>
            <p>If terms differ, read <a href="/lease-comparison/how-do-you-compare-different-lease-terms/">how to compare terms</a>.</p>
            <p>The pick belongs in the <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/">memo</a>.</p>
            <aside className="pv-callout ed-highlight" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put.</p></aside>
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Stay can look expensive on rent and still win after move cost.</p>
            <p>Move can look cheap on rent and lose after downtime.</p>
            <p>Clients feel disruption even when the model is quiet.</p>
            <aside className="pv-callout ed-highlight" data-callout="WHY_THIS_MATTERS"><h3>Why this matters</h3><p>Stay can look expensive on rent and still win after move cost.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            <ul><li>Build both occupancy stacks.</li><li>Add move, furniture, and leftover build-out to the move path.</li><li>Add downtime if the team cannot work.</li><li>Name the option value of staying.</li><li>Then discount both.</li></ul>
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. Relocation cash = new stack + move + downtime. Renewal cash = stay stack. Compare today's dollars.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE"><table className="pv-fin-table"><caption className="pv-caption">Required inputs for this page</caption><thead><tr><th scope="col">Input</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">Stay stack</th><td>Renewal rent and extras</td></tr><tr><th scope="row">Move stack</th><td>New rent and extras</td></tr><tr><th scope="row">Move cost</th><td>One-time</td></tr><tr><th scope="row">Downtime</th><td>Lost work or dual rent</td></tr></tbody></table></div>
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
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>$375,387</strong></div>
              </div>
              <div className="pv-table-shell pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON"><table className="pv-fin-table"><caption className="pv-caption">Lease A vs Lease B — Stay-versus-move sample</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead><tbody><tr><th scope="row">Start rent</th><td>$41,500</td><td>$38,595</td></tr><tr><th scope="row">Year-1 extras</th><td>$9,200</td><td>$9,844</td></tr><tr><th scope="row">Year-1 credit</th><td>$8,000</td><td>$4,400</td></tr><tr><th scope="row">Sample NPV</th><td>$375,387</td><td>$361,649</td></tr></tbody></table></div>
              <div className="pv-table-shell pv-wide-module" data-visualization="CASH_FLOW_TIMELINE"><table className="pv-fin-table"><caption className="pv-caption">Cash-flow walk — Stay-versus-move sample</caption><thead><tr><th scope="col">Year</th><th scope="col">Rent</th><th scope="col">Extras</th><th scope="col">Credit</th><th scope="col">Cash out</th><th scope="col">Value today</th></tr></thead><tbody><tr><th scope="row">Year 1</th><td>$41,500</td><td>$9,200</td><td>$8,000</td><td>$42,700</td><td>$39,537</td></tr><tr><th scope="row">Year 2</th><td>$42,745</td><td>$9,476</td><td>$0</td><td>$52,221</td><td>$44,771</td></tr><tr><th scope="row">Year 3</th><td>$44,027</td><td>$9,760</td><td>$0</td><td>$53,787</td><td>$42,698</td></tr><tr><th scope="row">Year 4</th><td>$45,348</td><td>$10,053</td><td>$0</td><td>$55,401</td><td>$40,721</td></tr><tr><th scope="row">Year 5</th><td>$46,709</td><td>$10,355</td><td>$0</td><td>$57,064</td><td>$38,837</td></tr><tr><th scope="row">Year 6</th><td>$48,110</td><td>$10,666</td><td>$0</td><td>$58,776</td><td>$37,039</td></tr><tr><th scope="row">Year 7</th><td>$49,553</td><td>$10,986</td><td>$0</td><td>$60,539</td><td>$35,324</td></tr><tr><th scope="row">Year 8</th><td>$51,040</td><td>$11,316</td><td>$0</td><td>$62,356</td><td>$33,689</td></tr><tr><th scope="row">Year 9</th><td>$52,571</td><td>$11,655</td><td>$0</td><td>$64,226</td><td>$32,129</td></tr><tr><th scope="row">Year 10</th><td>$54,148</td><td>$12,005</td><td>$0</td><td>$66,153</td><td>$30,642</td></tr><tr><th scope="row">Sample NPV</th><td>—</td><td>—</td><td>—</td><td>—</td><td>$375,387</td></tr></tbody></table></div>
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for Stay-versus-move sample is about $375,387. A second path lands near $361,649. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for Stay-versus-move sample</h3>
              <ul><li>Year 1 of Stay-versus-move sample has rent of $41,500.</li><li>Shared building cost is $9,200.</li><li>A credit of $8,000 lowers the cash you pay that year.</li><li>Cash out this year is about $42,700. The stay path has a smaller credit and no move bill.</li><li>Later cash gets a shrink for time. At 8 percent, year 1 is worth about $39,537 today.</li></ul>
              <ul><li>Next, year 2 rent is $42,745.</li><li>CAM, which is a shared building cost, is $9,476.</li><li>There is no credit in this year.</li><li>You pay about $52,221 this year after extras and credits. A move path would spend more in year one.</li><li>Time shrinks later cash. At 8 percent, year 2 is worth about $44,771 today.</li></ul>
              <ul><li>Then year 3 rent is $44,027.</li><li>Extras for the building come to $9,760.</li><li>Credits skip this year.</li><li>The net cash this year is about $53,787. Year two is the first fair rent fight.</li><li>Waiting has a price. At 8 percent, year 3 is worth about $42,698 today.</li></ul>
              <ul><li>After that, year 4 rent is $45,348.</li><li>The shared building cost this time is $10,053.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $55,401. Later years decide if the new sticker was worth the move.</li><li>Later cash gets a shrink for time. At 8 percent, year 4 is worth about $40,721 today.</li></ul>
              <ul><li>In year 5 of Stay-versus-move sample, rent is $46,709.</li><li>Shared building cost is $10,355.</li><li>There is no credit in this year.</li><li>You pay about $57,064 this year after extras and credits. The last year still sits in both terms.</li><li>Time shrinks later cash. At 8 percent, year 5 is worth about $38,837 today.</li></ul>
              <ul><li>Year 6 of Stay-versus-move sample has rent of $48,110.</li><li>CAM, which is a shared building cost, is $10,666.</li><li>Credits skip this year.</li><li>The net cash this year is about $58,776. Keep this later year in the sum for the sample.</li><li>Waiting has a price. At 8 percent, year 6 is worth about $37,039 today.</li></ul>
              <ul><li>Next, year 7 rent is $49,553.</li><li>Extras for the building come to $10,986.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $60,539. The row still belongs in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 7 is worth about $35,324 today.</li></ul>
              <ul><li>Then year 8 rent is $51,040.</li><li>The shared building cost this time is $11,316.</li><li>There is no credit in this year.</li><li>You pay about $62,356 this year after extras and credits. Keep this later year in the sum for the long path.</li><li>Time shrinks later cash. At 8 percent, year 8 is worth about $33,689 today.</li></ul>
              <ul><li>After that, year 9 rent is $52,571.</li><li>Shared building cost is $11,655.</li><li>Credits skip this year.</li><li>The net cash this year is about $64,226. The row still belongs in the sum for the long path.</li><li>Waiting has a price. At 8 percent, year 9 is worth about $32,129 today.</li></ul>
              <ul><li>In year 10 of Stay-versus-move sample, rent is $54,148.</li><li>CAM, which is a shared building cost, is $12,005.</li><li>No extra credit shows up this year.</li><li>Cash out this year is about $66,153. Keep this later year in the sum for the long path.</li><li>Later cash gets a shrink for time. At 8 percent, year 10 is worth about $30,642 today.</li></ul><p>Add those year values. The sample NPV for Stay-versus-move sample is about $375,387. This is a teaching sample, not a client result.</p>
              <aside data-editorial-highlight="WORKED_EXAMPLE" className="pv-callout ed-highlight" data-callout="WORKED_EXAMPLE"><h3>Worked example</h3><p>The sample walk for Stay-versus-move sample is here so you can see the cash move. It is not a promise.</p></aside>
              <p><PrimaryCTA href="/occupancy-costs/">Read occupancy costs</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Assumptions</h2>
            <ul><li>The sample puts move cost in year one of the move path only.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="WHAT_CHANGES" data-callout="WHAT_CHANGES"><h3>What changes the result</h3><p>If one option is full-service gross and the other is net, put those extras on one path before you compare them.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Edge cases</h2>
            <p>A short remaining term can make stay look cheap and still be wrong if the building fails.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Common mistakes</h2>
            <ul><li>Ignoring dual rent. Ignoring furniture. Treating stay as free of risk.</li></ul>
            <aside className="pv-callout ed-highlight" data-editorial-highlight="COMMON_MISTAKE" data-callout="COMMON_MISTAKE"><h3>Common mistake</h3><p>That hides how two buildings share cost. Split the bills, then compare the stacks.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Decision implications</h2>
            <p>If disruption is the real constraint, say so beside the number.</p>
            <h2>Compare this to related metrics</h2>
            <p>See <a href="/occupancy-costs/hidden-occupancy-costs/">hidden occupancy costs</a> for the move-in list.</p>
            <p>See <a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">two-option compare</a> for the shared method.</p>
            
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading pv-authority-shell">
            <h2>Limits</h2>
            <ul><li>The model cannot score culture or commute.</li></ul>
            <h2>When this should not drive the choice</h2>
            <ul><li>Do not force a move to justify a search you already ran.</li></ul>
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
            <p className="pv-spoke-index"><a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois">How do you compare commercial LOIs?</a> · <a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo">What belongs in a lease recommendation memo?</a></p>
            
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
            <RelatedContent items={[{"href":"/lease-comparison/","label":"Lease comparison hub","description":"The parent method."}]} /></div>
            <div className="pv-related-family"><h3>Questions people ask next</h3>
            <RelatedContent items={[{"href":"/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/","label":"Why test the pick","description":"Stay-versus-move is fragile."}]} /></div>
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
