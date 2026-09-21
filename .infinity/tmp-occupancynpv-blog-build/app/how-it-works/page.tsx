/* data-composition-repaired="true" */
import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { ProductUiFrame } from "../../components/premium-venture";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "How the proposed lease comparison workflow works",
  description: "The proposed steps for moving a commercial lease comparison from a rebuilt spreadsheet to a shareable NPV and client summary.",
  alternates: { canonical: "/how-it-works" },
  robots: { index: true, follow: true },
  openGraph: { title: "How the proposed lease comparison workflow works", description: "The proposed steps for moving a commercial lease comparison from a rebuilt spreadsheet to a shareable NPV and client summary." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/how-it-works" role="HOW_IT_WORKS" pattern="COMMERCIAL_PRODUCT_PAGE" cluster="Product">
        <JsonLdBlock data={SITE_SCHEMA["/how-it-works"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/how-it-works","label":"How the proposed lease comparison workflow works"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hiw_hero" data-pattern-id="FOCUSED_HERO" data-surface="DEFAULT">
          <figure className="pv-hero-media" data-above-fold-visual="true"><img src="/media/hero-interior.webp" alt="Editorial commercial setting. Not a customer photo." width={1600} height={900} fetchPriority="high" decoding="async" /></figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container">
            <p className="pv-eyebrow">How it works</p>
            <h1 className="pv-display">From scattered terms to a client-facing comparison without rebuilding the spreadsheet</h1>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            <div data-question-id="q_6b8ef893e957541f" data-answer-chunk-id="q_6b8ef893e957541f_chunk"><AnswerFirst question="How does OccupancyNPV capture lease terms?" answer="OccupancyNPV captures each option’s rent schedule, CAM, tenant improvement allowance, free rent, and escalations, then places them on one cash-flow timeline so tenant-rep brokers can discount that stream to NPV at an explicit rate." /></div>
          </div>
        </header>
        <section className="pv-section" data-section-type="WORKFLOW" data-section-id="hiw_steps" data-pattern-id="PRODUCT_FIRST_VISUALIZATION" data-visualization="WORKFLOW_DIAGRAM" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <div className="pv-question-cluster" data-composition="question-cluster">
            <article className="pv-surface">
            <h2>How OccupancyNPV works today</h2>
        <section className="pv-section onpv-page-depth" data-depth="workflow">
          <div className="vg-container">
            <h2>Current OccupancyNPV workflow</h2>
            <ol>
              <li>Start a 3-day free trial or create an account and sign in.</li>
              <li>Create or open a DealWorkspace.</li>
              <li>Enter competing lease scenarios.</li>
              <li>Add occupancy-cost and cash-flow assumptions such as rent steps, free rent, operating expenses, and allowances.</li>
              <li>Compare the scenarios in the workspace.</li>
              <li>Review NPV and discount-rate sensitivity.</li>
              <li>Inspect the in-workspace comparison summary.</li>
              <li>Save the workspace. Rename or archive it from your account history.</li>
              <li>Choose the next action: keep comparing, start Professional at $290/year, or buy Per-Deal at $149.</li>
            </ol>
            <p>OccupancyNPV is a lease-comparison workspace. It is not a CRM and does not administer occupied buildings. Results depend on the inputs you enter and are not legal or investment advice.</p>
          </div>
        </section>
            <ol>
              <li>Create an account and sign in.</li>
              <li>Choose Professional or Per-Deal through OccupancyNPV checkout, or use an existing paid entitlement.</li>
              <li>Create a DealWorkspace.</li>
              <li>Enter competing lease scenarios.</li>
              <li>Configure economic terms such as rent steps, free rent, and occupancy-cost inputs.</li>
              <li>Run the comparison and NPV.</li>
              <li>Review results and discount-rate sensitivity in the workspace.</li>
            </ol>

            <h2>The problem the current method creates</h2><p>Deal by deal, a hidden cell changes the ranking. Brokers rebuild a workbook. Discount-rate cases live in a separate tab. Face rent becomes the headline because the rest of the file is too fragile to share.</p></article>
            <article className="pv-surface"><h2>Broker inputs and lease inputs</h2><p>Broker inputs are the measurement period, the discount rate the client can explain, and the labels that will appear on the client summary. Lease inputs are start rent, term, escalations, tenant improvement allowance, free rent, and CAM. Missing fields stay visible instead of disappearing into a hidden cell.</p></article>
          </div>
            <div className="pv-editorial-split" data-composition="editorial-split">
            <div>
              <h2>Term normalization and cash-flow generation</h2>
              <p>A thirty-six-month option and a sixty-month option cannot be ranked by adding the printed years. The workflow normalizes the shared occupancy window, then generates a cash-flow stream for each option so when cash moves is explicit.</p>
              <h2>TI, free rent, CAM, and escalations</h2>
              <p>Tenant improvement allowance is a timed cash event, not a brochure number. Free rent changes year-one occupancy cost and the later step-up base. CAM belongs in occupancy cost when the tenant pays it. Escalations change later periods and can flip a ranking when discounted.</p>
            </div>
            <div className="pv-key-takeaway"><p>Tenant improvement allowance is a timed cash event, not a brochure number. Free rent changes year-one occupancy cost and the later step-up base.</p></div>
          </div>
            <h2>NPV, sensitivity, comparison, and client summary</h2>
            <p>NPV converts the cash-flow stream into today’s dollars. Sensitivity analysis keeps the rate visible so a ranking flip is not an artifact of one assumption. The comparison and the in-workspace client summary stay next to those cases.</p>
            <div className="pv-workflow">
              <article className="pv-surface"><h3>Before</h3><p>Each deal rebuilds a workbook. Discount-rate cases live in a separate tab, if they exist at all.</p></article>
              <p aria-hidden="true">→</p>
              <article className="pv-surface"><h3>After</h3><p>One comparison workspace. Cash-flow compare, NPV + sensitivity, and the client summary stay together.</p></article>
            </div>
            <ProductUiFrame title="OccupancyNPV workflow sequence" caption="Illustrative sample — not a production screenshot.">
              
            <div className="pv-table-wrap"><div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON" data-visualization-id="hiw_ui">
              <table className="pv-compare pv-fin-table">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — Lease A versus Lease B, not customer data</caption>
                <thead><tr><th scope="col">Input</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,000</td></tr>
                  <tr><th scope="row">CAM</th><td>$8,400</td><td>$9,100</td></tr>
                  <tr><th scope="row">TI credit, year 1</th><td>$18,000</td><td>$12,000</td></tr>
                  <tr><th scope="row">Free rent</th><td>2 months</td><td>1 month</td></tr>
                  <tr><th scope="row">Escalation</th><td>3% / year</td><td>5% / year</td></tr>
                  <tr><th scope="row">NPV @ 8%</th><td>$186,400</td><td>$191,220</td></tr>
                </tbody>
              </table></div></div>
            </ProductUiFrame>
            <div className="pv-worked-example" data-composition="worked-example"><h2>Worked example</h2>
            <p>ILLUSTRATIVE EXAMPLE. Lease A starts at $42,000 with two months of free rent and $18,000 of TI. Lease B starts cheaper, escalates faster, and offers less TI. After discounting the cash-flow stream at 8%, Lease A’s illustrative NPV is lower.</p>
            
            <div className="pv-table-wrap"><div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="CASH_FLOW_TIMELINE" data-visualization-id="hiw_cf">
              <table className="pv-compare pv-fin-table">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — cash-flow periods, not customer data</caption>
                <thead><tr><th scope="col">Period</th><th scope="col">Lease A net occupancy</th><th scope="col">Discounted @ 8%</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Year 1</th><td>$32,400<span className="pv-cell-note">after free rent and TI</span></td><td>$30,000</td></tr>
                  <tr><th scope="row">Year 2</th><td>$51,912</td><td>$44,500</td></tr>
                  <tr><th scope="row">Year 3</th><td>$53,469</td><td>$42,430</td></tr>
                  <tr><th scope="row">Year 4</th><td>$55,073</td><td>$40,470</td></tr>
                  <tr><th scope="row">Year 5</th><td>$56,726</td><td>$38,600</td></tr>
                </tbody>
              </table></div></div></div>
            <div className="pv-comparison-band" data-composition="comparison-matrix">
            <h2>What OccupancyNPV does</h2>
            <p>It keeps cash-flow, NPV, and sensitivity in one workspace and produces a in-workspace client summary for tenant-rep conversations. Pricing are $290 per year or $149 per deal. Live checkout is available for Professional and Per-Deal.</p>
            <h2>What it does not do</h2>
            <p>It does not administer leases, run a CRM, produce ASC 842 entries, or give legal advice. It is a working OccupancyNPV product, not a CRM or lease-administration suite.</p>
          </div>
            <div className="pv-callout-band" data-composition="callout-band"><h2>Limitations and objections</h2><p>NPV does not capture every qualitative consideration. A lower NPV is not automatically the better occupancy choice. Separate emails still exist for legal review; this workflow does not replace counsel.</p></div>
            <p>Positioning: this is a focused workflow, not a brokerage suite. Product visualization stays next to the steps. Benefits include a in-workspace client summary. Use cases are tenant-rep comparisons. Trust or disclosure: working OccupancyNPV product, live checkout on the pricing page, not legal advice.</p>
            
        <section className="pv-section pv-question-cluster" data-section-type="EXPLANATION" data-section-id="scaffold_why" data-composition="question-cluster" data-pattern-id="PROGRESSIVE_DISCLOSURE" data-surface="SUBTLE">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Deeper explanation of the proposed comparison workflow belongs in the comparison because face rent alone hides timing. How it works in practice: put the cash event on the occupancy-cost timeline, then discount. This is the next logical step after reading a definition.</p>
            <h2>Related concepts</h2>
            <p>Related concepts include occupancy cost, NPV, tenant improvement allowance, free rent, CAM, and rent escalations. Contextual CTA: open OccupancyNPV or review pricing after the numbers are explicit.</p>
            <p>Common mistakes are listed on this page. Authority sources sit below. Internal links connect the hub, the comparison method, and early access.</p>
          </div>
        </section>
        <section className="pv-section pv-worked-example" data-section-type="EXAMPLE" data-section-id="scaffold_example" data-composition="worked-example" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="SUBTLE">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>Example</h2>
            <p>ILLUSTRATIVE EXAMPLE. The Lease A versus Lease B figures used across this site are educational samples, not customer results. They exist so the proposed comparison workflow can be seen beside rent, CAM, TI, free rent, and escalations instead of as an isolated slogan.</p>
            <h2>How it works</h2>
            <p>Capture the term. Place it on the cash-flow stream. Discount. Compare. Keep the assumption visible. That sequence is the product visualization of the OccupancyNPV workflow, not a production screenshot.</p>
          </div>
        </section>
            
        <section className="pv-section pv-callout-band" data-section-type="DEPTH" data-section-id="scaffold_depth" data-composition="callout-band" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>A fuller reading of the proposed comparison workflow</h2>
            <p>Broker inputs and lease inputs are different jobs. The broker sets the window and the rate. The leases supply rent, CAM, TI, free rent, and escalations. Term normalization is the unglamorous step that prevents a short cheap deal from winning by omitting later years. Cash-flow generation is where incentives stop being slogans. NPV is the sum. Sensitivity is the honesty check. The client summary is the artifact the meeting can survive.</p>
            <p>Tenant-rep brokers still have to verify the lease. This page does not replace counsel. It does not claim FASB, NAIOP, or BOMA endorsement. It uses those organizations as independent professional context so a citation-ready answer can name the entity, state the fact, and show the limitation.</p>
            <p>If two options differ only by a brochure number, the comparison is unfinished. If they differ by when cash moves, the comparison is an NPV problem. If they differ by who pays operating expenses, the comparison is a structure problem. the proposed comparison workflow is one of those differences. The proposed focused workflow keeps those differences on one in-workspace client summary.</p>
            <p>Current prices are $290 per year for Professional and $149 per deal for Per-Deal. Live checkout is available on the pricing page. A serious owner can publish this page because the example is labeled, the sources are named, and the conversion path is honest.</p>
            <p>See <a href="/">the offer</a>, <a href="/resources">the resources hub</a>, <a href="/compare-commercial-leases">the comparison method</a>, <a href="/how-it-works">how it works</a>, <a href="/commercial-lease-npv">commercial lease NPV</a>, and <a href="/early-access">Request Pilot Access</a>. The parent hub and the commercial homepage stay one click away.</p>
          </div>
        </section>
            
            <div className="vg-container pv-close-well"><h2>Who is this not for</h2>
            <p>who is this not for: this workflow is not for landlords running a portfolio, not for property managers administering occupied buildings, and not for teams that need a full brokerage suite. It is also not for anyone who wants a CRM or lease-administration suite.</p>
            <h2>Objections worth answering now</h2>
            <p>OccupancyNPV is a working product. Live checkout is available on the pricing page. A lower NPV is not automatically the better occupancy choice. Sample figures are illustrative and are not customer results.</p>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            <section data-section-type="FAQ" data-section-id="dr_faq" data-pattern-id="TRUST_NEAR_DECISION" data-surface="DEFAULT">
              <h2>Does OccupancyNPV exist as a working product?</h2>
              <p>Yes. OccupancyNPV is a live lease comparison and NPV workspace. Public rollout remains controlled.</p>
              <h2>Can I purchase OccupancyNPV?</h2>
              <p>Yes. Professional is $290 per year and Per-Deal is $149 per deal. Checkout is available on this page.</p>
            </section>
            <RelatedContent items={[{ href: "/", label: "Return to the offer" }, { href: "/resources", label: "Lease economics resources" }, { href: "/pricing", label: "Pricing" }, { href: "/compare-commercial-leases", label: "Compare two commercial leases" }, { href: "/commercial-lease-npv", label: "What NPV means in a commercial lease" }]} />
            <div className="pv-source-block" data-composition="source-block"><AuthorityRefs items={[{"href":"https://www.naiop.org/","label":"NAIOP — commercial real estate organization"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers and sales agents"}]} /></div>
            <Disclosure>Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed.</Disclosure>
            
        
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="dr_final" data-pattern-id="REPEATED_CONVERSION_ANCHORS" data-cta="Request Pilot Access" data-surface="EMPHASIS">
              <h2>Request controlled / pilot access</h2>
              <p>Pilot / early access. The product is live. Public rollout remains controlled. Checkout is available on the pricing page.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </section></div>
          </div>
        </section>
        
        <section className="pv-section onpv-page-depth" data-depth="support">
          <div className="vg-container">
            <h2>Support</h2>
            <p>Email <a href="mailto:infinitemediaresources@gmail.com">infinitemediaresources@gmail.com</a>. You can also use <a href="/suggest-improvement">Suggest an Improvement</a> without creating an account.</p>
          </div>
        </section>
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container pv-authority-shell">
          <nav className="sn-block" data-semantic-navigation="LEARN_NEXT" aria-label="Learn the ideas behind the steps">
            <div className="sn-block-head">
              <span className="sn-kicker">LEARN NEXT</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. Use one method on both offers.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/" data-relationship="related" aria-label="What is NPV in a commercial lease. NPV turns later lease costs into today's dollars so you can compare options fairly.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is NPV in a commercial lease</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-discount-rate-should-you-use/" data-relationship="related" aria-label="What discount rate should be used for commercial lease NPV. The discount rate is the price of waiting.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What discount rate should be used for commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/when-is-npv-the-wrong-metric/" data-relationship="related" aria-label="When is NPV the wrong metric. NPV is a consistency tool, not a complete decision.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>When is NPV the wrong metric</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/" data-relationship="related" aria-label="How do you compare two commercial lease proposals. Put both leases on one timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you compare two commercial lease proposals</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
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
